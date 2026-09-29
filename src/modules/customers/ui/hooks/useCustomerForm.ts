import { useState, useEffect, useRef } from 'react';
import { logger } from '@/src/shared/lib/logger';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Customer, CustomerSchema } from '@/src/domain/schema/customer.schema';
import { useDraft } from '@/src/hooks/useDraft';
import { notify } from '@/src/shared/utils/notify';
import { autoDetectBusinessName, parseVietQRBusinessData } from '../components/CustomerFormHelpers';
import { supabase } from '@/src/shared/config/supabase.client';
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';

export function extractSequentialCustomerNumber(code?: string | null): number {
  if (!code) return 0;
  const match = code.trim().match(/^KH(\d+)$/i);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? 0 : num;
}

export function computeMaxCustomerSequence(customers: Array<{ maKh?: string | null }>): number {
  let max = 0;
  for (const c of customers) {
    const seq = extractSequentialCustomerNumber(c?.maKh);
    if (seq > max) max = seq;
  }
  return max;
}

export function useCustomerForm(
  customer: Customer | null,
  onDirtyChange: ((isDirty: boolean) => void) | undefined,
  PROVINCES: string[],
  loaiKhachHangList: string[] = [],
  currentUserName: string = 'Ngô Vương Thông',
  existingCustomers: Customer[] = []
) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isAiFormatting, setIsAiFormatting] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [draftStatus, setDraftStatus] = useState<string>('');
  
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [showDedupeModal, setShowDedupeModal] = useState(false);
  const [pendingData, setPendingData] = useState<Customer | null>(null);

  const [tagInput, setTagInput] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);

  const { draft, saveDraft, clearDraft, isRestored } = useDraft<any>('customer_v3', customer?.id || 'new');

  const normalizedLoaiKh = customer?.loaiKh
    ? ((loaiKhachHangList || []).find((l) => l.toLowerCase() === customer.loaiKh?.toLowerCase()) || customer.loaiKh)
    : '';

  const initialContacts = (customer?.contacts && customer.contacts.length > 0)
    ? customer.contacts
        .filter(Boolean)
        .map((c) => ({
          danhXung: c.danhXung || '',
          nguoiDaiDien: c.nguoiDaiDien || '',
          sdt: c.sdt || '',
          chucVu: c.chucVu || '',
          chiNhanh: c.chiNhanh || ''
        }))
    : [{
        danhXung: '',
        nguoiDaiDien: customer?.nguoiDaiDien || '',
        sdt: customer?.sdt || '',
        chucVu: '',
        chiNhanh: customer?.chiNhanh || ''
      }];

  const validContacts = initialContacts.length > 0
    ? initialContacts
    : [{ danhXung: '', nguoiDaiDien: customer?.nguoiDaiDien || '', sdt: customer?.sdt || '', chucVu: '', chiNhanh: '' }];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    getValues,
    reset,
    formState: { errors, isSubmitting, isDirty }
  } = useForm<Customer>({
    resolver: zodResolver(CustomerSchema) as any,
    defaultValues: customer
      ? {
          ...customer,
          maKh: customer.maKh || '',
          tenKhachHang: customer.tenKhachHang || '',
          loaiKh: normalizedLoaiKh || '',
          loaiHinhDoanhNghiep: customer.loaiHinhDoanhNghiep || '',
          maSoThue: customer.maSoThue || '',
          tinhThanh: customer.tinhThanh || '',
          diaChi: customer.diaChi || '',
          xaPhuong: customer.xaPhuong || '',
          sdt: validContacts[0]?.sdt || customer.sdt || '',
          nguoiDaiDien: validContacts[0]?.nguoiDaiDien || customer.nguoiDaiDien || '',
          chiNhanh: customer.chiNhanh || '',
          nhuCauKhachHang: customer.nhuCauKhachHang || '',
          gioiTinh: customer.gioiTinh || '',
          ngaySinh: customer.ngaySinh || '',
          nguoiPhuTrach: customer.nguoiPhuTrach || currentUserName,
          tags: customer.tags || [],
          contacts: validContacts
        }
      : {
          loaiHinhDoanhNghiep: '',
          loaiKh: '',
          tinhThanh: '',
          nguoiPhuTrach: currentUserName,
          tags: [],
          maKh: '',
          tenKhachHang: '',
          maSoThue: '',
          diaChi: '',
          xaPhuong: '',
          sdt: '',
          nguoiDaiDien: '',
          chiNhanh: '',
          nhuCauKhachHang: '',
          gioiTinh: '',
          ngaySinh: '',
          contacts: [{ danhXung: '', nguoiDaiDien: '', sdt: '', chiNhanh: '', chucVu: '' }]
        }
  });

  const generateNextMaKh = async () => {
    try {
      // 1. Tính toán sequence cao nhất từ danh sách khách hàng cục bộ hiện có
      let highestSeq = computeMaxCustomerSequence(existingCustomers);

      // 2. Thử gọi API backend chính thức
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const token = session?.access_token || 'sgm_admin_dev_token';
        const res = await fetch('/api/customers/generate-makh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.maKh) {
            setValue('maKh', data.maKh, { shouldValidate: true });
            return data.maKh;
          }
        }
      } catch (err) {
        logger.warn('Backend generate-makh API offline, synchronizing directly with Supabase/local state:', err);
      }

      // 3. Fallback Supabase: Lấy sequence cao nhất từ database trực tiếp
      try {
        const { data: dbCustomers } = await supabase
          .from('customers')
          .select('maKh')
          .order('createdAt', { ascending: false })
          .limit(100);

        if (dbCustomers && Array.isArray(dbCustomers)) {
          const dbMax = computeMaxCustomerSequence(dbCustomers);
          if (dbMax > highestSeq) highestSeq = dbMax;
        }
      } catch (dbErr) {
        logger.warn('Direct Supabase fetch for customer max sequence failed:', dbErr);
      }

      // Tự tăng tuần tự tuyệt đối (Zero Math.random())
      const nextCode = `KH${String(highestSeq + 1).padStart(4, '0')}`;
      setValue('maKh', nextCode, { shouldValidate: true });
      return nextCode;
    } catch (err) {
      logger.error('Failed to generate maKh:', err);
      const fallbackSeq = computeMaxCustomerSequence(existingCustomers);
      const fallbackCode = `KH${String(fallbackSeq + 1).padStart(4, '0')}`;
      setValue('maKh', fallbackCode, { shouldValidate: true });
      return fallbackCode;
    }
  };

  useEffect(() => {
    if (!customer && !getValues('maKh')) {
      generateNextMaKh();
    }
  }, [customer, setValue, getValues]);

  useEffect(() => {
    if (!customer?.id) {
      reset({
        loaiHinhDoanhNghiep: '',
        loaiKh: '',
        tinhThanh: '',
        nguoiPhuTrach: currentUserName,
        tags: [],
        maKh: '',
        tenKhachHang: '',
        maSoThue: '',
        diaChi: '',
        xaPhuong: '',
        sdt: '',
        nguoiDaiDien: '',
        chiNhanh: '',
        nhuCauKhachHang: '',
        gioiTinh: '',
        ngaySinh: '',
        contacts: [{ danhXung: '', nguoiDaiDien: '', sdt: '', chiNhanh: '', chucVu: '' }]
      });
      generateNextMaKh();
    } else {
      const normalizedLoai = customer.loaiKh
        ? ((loaiKhachHangList || []).find((l) => l.toLowerCase() === customer.loaiKh?.toLowerCase()) || customer.loaiKh)
        : '';
      const cContacts = (customer.contacts && customer.contacts.length > 0)
        ? customer.contacts.filter(Boolean).map(c => ({
            danhXung: c.danhXung || '',
            nguoiDaiDien: c.nguoiDaiDien || '',
            sdt: c.sdt || '',
            chucVu: c.chucVu || '',
            chiNhanh: c.chiNhanh || ''
          }))
        : [{
            danhXung: '',
            nguoiDaiDien: customer.nguoiDaiDien || '',
            sdt: customer.sdt || '',
            chucVu: '',
            chiNhanh: customer.chiNhanh || ''
          }];

      reset({
        ...customer,
        maKh: customer.maKh || '',
        tenKhachHang: customer.tenKhachHang || '',
        loaiKh: normalizedLoai || '',
        loaiHinhDoanhNghiep: (customer.loaiHinhDoanhNghiep || '').trim().toUpperCase(),
        maSoThue: customer.maSoThue || '',
        tinhThanh: customer.tinhThanh || '',
        diaChi: customer.diaChi || '',
        xaPhuong: customer.xaPhuong || '',
        sdt: cContacts[0]?.sdt || customer.sdt || '',
        nguoiDaiDien: cContacts[0]?.nguoiDaiDien || customer.nguoiDaiDien || '',
        chiNhanh: cContacts[0]?.chiNhanh || customer.chiNhanh || '',
        nhuCauKhachHang: customer.nhuCauKhachHang || '',
        gioiTinh: customer.gioiTinh || '',
        ngaySinh: customer.ngaySinh || '',
        nguoiPhuTrach: customer.nguoiPhuTrach || currentUserName,
        tags: Array.isArray(customer.tags) ? customer.tags : [],
        contacts: cContacts
      });
    }
  }, [customer, currentUserName, reset, loaiKhachHangList]);

  useEffect(() => {
    // Only restore draft for explicit existing customer editing or when customer is defined
    if (draft && isRestored && customer?.id) {
      Object.keys(draft).forEach((key) => {
        setValue(key as any, draft[key], { shouldDirty: true });
      });
      if (!draft.nguoiPhuTrach) {
        setValue('nguoiPhuTrach', customer?.nguoiPhuTrach || currentUserName, { shouldDirty: true });
      }
      setDraftStatus('Bản nháp đã khôi phục');
    }
  }, [draft, isRestored, setValue, customer, currentUserName]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      setDraftStatus('Đang tự động lưu...');
      setTimeout(() => {
        saveDraft(getValues());
        setDraftStatus('Đã lưu bản nháp');
      }, 600);
    }, 8000);
    return () => clearInterval(interval);
  }, [isDirty, saveDraft, getValues]);

  useEffect(() => {
    if (!customer) {
      setTimeout(() => nameInputRef.current?.focus(), 100);
    }
  }, [customer]);

  // Live Auto-Sync for Personal Customer (10-second frictionless experience)
  const watchedTenKhachHang = watch('tenKhachHang');
  const watchedSdt = watch('sdt');
  const watchedLoaiKh = watch('loaiKh');
  const watchedLoaiHinh = watch('loaiHinhDoanhNghiep');
  const isIndividualMode = watchedLoaiHinh === 'CÁ NHÂN' || watchedLoaiKh === 'Cá nhân';

  useEffect(() => {
    if (!isIndividualMode) return;
    
    // Auto sync tenKhachHang to nguoiDaiDien and contacts[0].nguoiDaiDien
    if (watchedTenKhachHang) {
      const currentDaiDien = getValues('nguoiDaiDien');
      if (!currentDaiDien || currentDaiDien === watchedTenKhachHang || !customer?.id) {
        setValue('nguoiDaiDien', watchedTenKhachHang, { shouldDirty: true });
      }
      const contacts = getValues('contacts') || [];
      if (contacts.length > 0) {
        if (!contacts[0].nguoiDaiDien || contacts[0].nguoiDaiDien === currentDaiDien || !customer?.id) {
          setValue('contacts.0.nguoiDaiDien', watchedTenKhachHang, { shouldDirty: true });
        }
        if (!contacts[0].chucVu) {
          setValue('contacts.0.chucVu', 'Chủ cơ sở', { shouldDirty: true });
        }
      }
    }

    // Auto sync sdt to contacts[0].sdt
    if (watchedSdt) {
      const contacts = getValues('contacts') || [];
      if (contacts.length > 0 && (!contacts[0].sdt || !customer?.id)) {
        setValue('contacts.0.sdt', watchedSdt, { shouldDirty: true });
      }
    }
  }, [watchedTenKhachHang, watchedSdt, isIndividualMode, setValue, getValues, customer]);

  const taxCode = watch('maSoThue');
  const tags = watch('tags') || [];

  const handleAddTag = (val: string) => {
     const trimmed = val.trim();
     if (trimmed && !tags.includes(trimmed)) {
        setValue('tags', [...tags, trimmed], { shouldDirty: true });
     }
     setTagInput('');
  };

  const smartFormatNameAI = async (rawName: string) => {
     if (!rawName.trim()) return;
     try {
         setIsAiFormatting(true);
         const session = (await supabase.auth.getSession()).data.session;
         const token = session?.access_token || 'sgm_admin_dev_token';
         const res = await fetch('/api/customers/format-name', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
             body: JSON.stringify({ rawName })
         });
         const result = await res.json();
         if (result.success && result.tenNgan) {
             const detected = autoDetectBusinessName(result.loaiHinh ? `${result.loaiHinh} ${result.tenNgan}` : rawName);
             const finalLoaiHinh = detected.loaiHinh || result.loaiHinh;
             if (finalLoaiHinh) setValue('loaiHinhDoanhNghiep', finalLoaiHinh, { shouldDirty: true });
             const cleanTen = result.tenNgan.length > 29 ? result.tenNgan.slice(0, 29).trim() : result.tenNgan;
             setValue('tenKhachHang', cleanTen, { shouldDirty: true });
         } else {
             const { loaiHinh, tenNgayNgan } = autoDetectBusinessName(rawName);
             if (loaiHinh) setValue('loaiHinhDoanhNghiep', loaiHinh, { shouldDirty: true });
             setValue('tenKhachHang', tenNgayNgan, { shouldDirty: true });
         }
     } catch (e) {
         logger.error('AI format fail:', e);
         const { loaiHinh, tenNgayNgan } = autoDetectBusinessName(rawName);
         if (loaiHinh) setValue('loaiHinhDoanhNghiep', loaiHinh, { shouldDirty: true });
         setValue('tenKhachHang', tenNgayNgan, { shouldDirty: true });
     } finally {
         setIsAiFormatting(false);
     }
  };

  const handleRemoveTag = (tag: string) => {
     setValue('tags', tags.filter(t => t !== tag), { shouldDirty: true });
  };

  const checkDuplicates = async (data: any) => {
    if (customer?.id) return false;
    
    const phone = data.contacts?.[0]?.sdt || data.sdt;
    const taxId = data.maSoThue;
    
    if (!phone && !taxId) return false;
    
    try {
       const res = await fetch('/api/customers/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, taxId })
       });
       const json = await res.json();
       if (json.success && json.duplicates && json.duplicates.length > 0) {
           setDuplicates(json.duplicates);
           setPendingData(data);
           setShowDedupeModal(true);
           return true; 
       }
    } catch (e) {
       logger.error('Dedupe check error:', e);
    }
    return false;
  };

  const handleTaxLookup = async () => {
    let cleanTax = taxCode?.replace(/[^\d-]/g, '') || '';
    if (cleanTax.length === 13 && !cleanTax.includes('-')) {
      cleanTax = cleanTax.slice(0, 10) + '-' + cleanTax.slice(10);
    }
    
    if (cleanTax.replace(/\D/g, '').length < 10) {
      notify.error('Vui lòng nhập MST hợp lệ (10-13 số)');
      setLookupStatus('error');
      return;
    }

    setIsLookingUp(true);
    setLookupStatus('idle');
    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${cleanTax}`);
      if (response.status === 429) {
        notify.error('Máy chủ VietQR đang bận (429). Vui lòng thử lại sau.');
        setLookupStatus('error');
        return;
      }
      if (!response.headers.get('content-type')?.includes('application/json')) {
        notify.error('Lỗi khi tải dữ liệu từ VietQR API.');
        setLookupStatus('error');
        return;
      }

      const result = await response.json();
      if (result.code === '00' && result.data) {
        const { loaiHinhDoanhNghiep, tenKhachHang, diaChi, tinhThanh, xaPhuong } = parseVietQRBusinessData(result.data, PROVINCES);
        
        setValue('loaiHinhDoanhNghiep', loaiHinhDoanhNghiep || 'CÔNG TY TNHH', { shouldDirty: true });
        setValue('tenKhachHang', tenKhachHang, { shouldDirty: true });
        setValue('diaChi', diaChi, { shouldDirty: true });
        if (xaPhuong) {
          setValue('xaPhuong', xaPhuong, { shouldDirty: true });
        }
        const matchedLoaiKh = (loaiKhachHangList || []).find(
          (t) => t.toLowerCase() === 'doanh nghiệp'
        ) || 'Doanh nghiệp';
        setValue('loaiKh', matchedLoaiKh, { shouldDirty: true });
        if (tinhThanh) {
          setValue('tinhThanh', tinhThanh, { shouldDirty: true });
        }
        setLookupStatus('success');
        
        if (result.data.name) {
           notify.success('Đã tìm thấy dữ liệu. Hệ thống đang chuẩn hoá tên...');
           await smartFormatNameAI(result.data.name);
        } else {
           notify.success(`Đã tìm thấy thông tin: ${tenKhachHang}`);
        }
      } else {
        notify.warning(result.desc || 'VietQR: Không tìm thấy dữ liệu. Bạn có thể tự nhập tay thông tin.');
        setLookupStatus('idle');
      }
    } catch {
      notify.error('Lỗi kết nối mạng khi tra cứu mã số thuế.');
      setLookupStatus('error');
    } finally {
      setIsLookingUp(false);
    }
  };

  const magicPasteUnpack = (rawText: string) => {
    if (!rawText || !rawText.trim()) return;
    const raw = rawText.trim();

    // 1. MST
    const taxMatch = raw.match(/(?:MST|Mã số thuế|Tax Code)?[:\s]*(\d{10}(?:-\d{3})?|\d{13})/i);
    const extractedTax = taxMatch ? taxMatch[1] : '';

    // 2. SĐT
    const phoneMatch = raw.match(/(?:SĐT|SDT|Điện thoại|Tel|Hotline)?[:\s]*(0[35789]\d{8}|\+84[35789]\d{8})/i);
    const extractedPhone = phoneMatch ? phoneMatch[1] : '';

    // 3. Email
    const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const extractedEmail = emailMatch ? emailMatch[0] : '';

    // 4. Tỉnh thành
    const detectedProvince = detectProvinceFromAddress(raw, PROVINCES);

    if (extractedTax) setValue('maSoThue', extractedTax, { shouldDirty: true, shouldValidate: true });
    if (detectedProvince) setValue('tinhThanh', detectedProvince, { shouldDirty: true, shouldValidate: true });

    if (extractedPhone) {
      setValue('sdt', extractedPhone, { shouldDirty: true });
      const currentContacts = getValues('contacts') || [];
      if (currentContacts.length > 0) {
        setValue('contacts.0.sdt', extractedPhone, { shouldDirty: true });
      }
    }

    if (extractedEmail) {
      const currentContacts = getValues('contacts') || [];
      if (currentContacts.length > 0) {
        setValue('contacts.0.email' as any, extractedEmail, { shouldDirty: true });
      }
    }

    notify.success('Đã bóc tách dữ liệu thông minh từ văn bản dán');
  };

  return {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    trigger,
    getValues,
    errors,
    isSubmitting,
    isDirty,
    
    isLookingUp,
    isAiFormatting,
    lookupStatus,
    isLockedByOther,
    setIsLockedByOther,
    draftStatus,
    
    duplicates,
    showDedupeModal,
    setShowDedupeModal,
    pendingData,
    
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    
    nameInputRef,
    clearDraft,
    saveDraft,
    
    smartFormatNameAI,
    checkDuplicates,
    handleTaxLookup,
    generateNextMaKh,
    magicPasteUnpack,
  };
}
