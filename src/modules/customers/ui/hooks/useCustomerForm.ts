import { useState, useEffect, useRef } from 'react';
import { logger } from '@/src/shared/lib/logger';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Customer, CustomerSchema } from '@/src/domain/schema/customer.schema';
import { useDraft } from '@/src/hooks/useDraft';
import { notify } from '@/src/shared/utils/notify';
import { autoDetectBusinessName, parseVietQRBusinessData } from '../components/CustomerFormHelpers';
import { supabase } from '@/src/shared/config/supabase.client';

export function useCustomerForm(
  customer: Customer | null,
  onDirtyChange: ((isDirty: boolean) => void) | undefined,
  PROVINCES: string[],
  loaiKhachHangList: string[] = [],
  currentUserName: string = 'Mạnh Hùng (Admin)'
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
      const fallbackCode = `KH${Math.floor(1000 + Math.random() * 9000)}`;
      setValue('maKh', fallbackCode, { shouldValidate: true });

      const session = (await supabase.auth.getSession()).data.session;
      const token = session?.access_token || 'sgm_admin_dev_token';
      const res = await fetch('/api/customers/generate-makh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.maKh) {
        setValue('maKh', data.maKh, { shouldValidate: true });
        return data.maKh;
      }
      return fallbackCode;
    } catch (err) {
      logger.error('Failed to generate maKh:', err);
      const fallbackCode = `KH${Math.floor(1000 + Math.random() * 9000)}`;
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
      setValue('nguoiPhuTrach', currentUserName, { shouldDirty: false });
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
  }, [customer, currentUserName, setValue, reset, loaiKhachHangList]);

  useEffect(() => {
    if (draft && isRestored) {
      Object.keys(draft).forEach((key) => {
        setValue(key as any, draft[key], { shouldDirty: true });
      });
      // When creating a new customer, nguoiPhuTrach is strictly bound to the creating user
      if (!customer?.id || !draft.nguoiPhuTrach) {
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
        const { loaiHinhDoanhNghiep, tenKhachHang, diaChi, tinhThanh } = parseVietQRBusinessData(result.data, PROVINCES);
        
        setValue('loaiHinhDoanhNghiep', loaiHinhDoanhNghiep || 'CÔNG TY TNHH', { shouldDirty: true });
        setValue('tenKhachHang', tenKhachHang, { shouldDirty: true });
        setValue('diaChi', diaChi, { shouldDirty: true });
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
    
    smartFormatNameAI,
    checkDuplicates,
    handleTaxLookup,
    generateNextMaKh,
  };
}
