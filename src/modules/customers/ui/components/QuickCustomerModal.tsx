import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Sparkles, 
  Wand2, 
  ClipboardCheck, 
  AlertTriangle,
  Plus,
  Trash2,
  Users,
  ArrowRightCircle,
  MessageSquare
} from 'lucide-react';
import { SmartPhoneInput } from '@/src/platform/ui/design-system/form/SmartPhoneInput';
import { parseVietQRBusinessData, generateEnterpriseNameSuggestions } from './CustomerFormHelpers';
import { VIETNAM_PROVINCES_63 } from '@/src/hooks/useSharedFields';
import { computeMaxCustomerSequence } from '../hooks/useCustomerForm';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { notify } from '@/src/shared/utils/notify';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';

export interface QuickContactItem {
  id: string;
  danhXung: string;
  nguoiDaiDien: string;
  sdt: string;
  chucVu: 'Đại diện' | 'Kế toán' | 'Kỹ thuật' | 'Thu mua' | string;
  email?: string;
  isPrimary?: boolean;
}

export interface QuickCustomerInitialData {
  tenKhachHang?: string;
  maSoThue?: string;
  diaChi?: string;
  tinhThanh?: string;
  sdt?: string;
  nguoiDaiDien?: string;
}

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: any) => void;
  defaultOfficer?: string;
  onSendZnsImmediately?: (customer: any, contact?: QuickContactItem) => void;
  initialData?: QuickCustomerInitialData;
}

export function QuickCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  defaultOfficer = '',
  onSendZnsImmediately,
  initialData
}: QuickCustomerModalProps) {
  const [tenKhachHang, setTenKhachHang] = useState(initialData?.tenKhachHang || '');
  const [maSoThue, setMaSoThue] = useState(initialData?.maSoThue || '');
  const [diaChi, setDiaChi] = useState(initialData?.diaChi || '');
  const [tinhThanh, setTinhThanh] = useState(initialData?.tinhThanh || 'TP. Hồ Chí Minh');
  const [loaiKh, setLoaiKh] = useState<'Doanh nghiệp' | 'Cá nhân'>('Doanh nghiệp');
  const [isLookingUpTax, setIsLookingUpTax] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taxLookupSuccess, setTaxLookupSuccess] = useState(false);
  const [showMagicPaste, setShowMagicPaste] = useState(false);
  const [magicPasteText, setMagicPasteText] = useState('');

  // Multi-contact matrix state
  const [contacts, setContacts] = useState<QuickContactItem[]>([
    {
      id: `ct_${Date.now()}_1`,
      danhXung: 'Anh/Chị',
      nguoiDaiDien: initialData?.nguoiDaiDien || '',
      sdt: initialData?.sdt || '',
      chucVu: 'Đại diện',
      isPrimary: true
    }
  ]);

  React.useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.tenKhachHang) setTenKhachHang(initialData.tenKhachHang);
      if (initialData.maSoThue) setMaSoThue(initialData.maSoThue);
      if (initialData.diaChi) setDiaChi(initialData.diaChi);
      if (initialData.tinhThanh) setTinhThanh(initialData.tinhThanh);
      if (initialData.sdt || initialData.nguoiDaiDien) {
        setContacts([
          {
            id: `ct_${Date.now()}_1`,
            danhXung: 'Anh/Chị',
            nguoiDaiDien: initialData.nguoiDaiDien || '',
            sdt: initialData.sdt || '',
            chucVu: 'Đại diện',
            isPrimary: true
          }
        ]);
      }
    }
  }, [isOpen, initialData]);

  // Lấy danh sách khách hàng để cảnh báo trùng lặp realtime
  const existingCustomers = useMemo(() => {
    try {
      return entityCachePool.getAll<any>('customers') || [];
    } catch {
      return [];
    }
  }, [isOpen]);

  // Kiểm tra trùng lặp MST hoặc SĐT trên tất cả các đầu mối
  const duplicateWarning = useMemo(() => {
    const cleanTax = maSoThue.trim().replace(/[\s.-]/g, '');
    const currentPhones = contacts
      .map(c => (c.sdt || '').trim().replace(/[\s.-]/g, ''))
      .filter(p => p.length >= 9);

    if (!cleanTax && currentPhones.length === 0) return null;

    for (const c of existingCustomers) {
      if (c.deletedAt || c.deleted_at || c.isDeleted) continue;
      
      // 1. Kiểm tra MST
      const cTax = (c.maSoThue || '').trim().replace(/[\s.-]/g, '');
      if (cleanTax && cTax && cleanTax === cTax) {
        return {
          type: 'Mã số thuế (MST)',
          value: cleanTax,
          matchedCustomer: c
        };
      }

      // 2. Kiểm tra Phone (cả sdt gốc và trong contacts[])
      const existingCustomerPhones = new Set<string>();
      if (c.sdt) existingCustomerPhones.add(c.sdt.trim().replace(/[\s.-]/g, ''));
      if (Array.isArray(c.contacts)) {
        c.contacts.forEach((item: any) => {
          if (item?.sdt) existingCustomerPhones.add(item.sdt.trim().replace(/[\s.-]/g, ''));
        });
      }

      for (const phone of currentPhones) {
        if (existingCustomerPhones.has(phone)) {
          return {
            type: 'Số điện thoại',
            value: phone,
            matchedCustomer: c
          };
        }
      }
    }
    return null;
  }, [maSoThue, contacts, existingCustomers]);

  if (!isOpen) return null;

  const handleMagicPaste = (text: string) => {
    if (!text || !text.trim()) return;

    let parsedTax = '';
    let parsedPhone = '';
    let parsedName = '';
    let parsedAddress = '';
    let parsedRepresentative = '';

    // 1. Trích xuất MST
    const taxMatch = text.match(/(?:MST|mã số thuế|tax(?:\s*code)?)\s*[-:：]?\s*([0-9]{10}(?:-[0-9]{3})?|[0-9]{13})/i)
      || text.match(/\b([0-9]{10}(?:-[0-9]{3})?|[0-9]{13})\b/);
    if (taxMatch) parsedTax = taxMatch[1].trim();

    // 2. Trích xuất SĐT
    const phoneMatch = text.match(/(?:SĐT|ĐT|Điện thoại|Tel|Phone|Hotline|Zalo)\s*[-:：]?\s*((?:\+84|84|0)[3|5|7|8|9][0-9]{8})/i)
      || text.match(/\b((?:\+84|84|0)[3|5|7|8|9][0-9]{8})\b/);
    if (phoneMatch) parsedPhone = phoneMatch[1].trim();

    // 3. Trích xuất Người đại diện
    const repMatch = text.match(/(?:Người đại diện|Người liên hệ|Đại diện|Liên hệ|Anh|Chị|Ông|Bà|GĐ|Giám đốc)\s*[-:：]?\s*([A-ZÀ-Ỹa-zà-ỹ\s]{2,30})/i);
    if (repMatch) parsedRepresentative = repMatch[1].trim();

    // 4. Trích xuất Địa chỉ
    const addrMatch = text.match(/(?:Địa chỉ|Đ\/c|ĐC|Address)\s*[-:：]?\s*([^,\n]+(?:,[^,\n]+){1,4})/i);
    if (addrMatch) {
      parsedAddress = addrMatch[1].trim();
    }

    // 5. Trích xuất Tên công ty / Tên KH
    const lines = text.split(/[\n;]/).map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^(công ty|cty|doanh nghiệp|tnhh|cổ phần|cp|xí nghiệp|nhà máy|hộ kinh doanh)/i.test(line)) {
        parsedName = line;
        break;
      }
    }
    if (!parsedName && lines.length > 0 && !lines[0].includes(':')) {
      parsedName = lines[0];
    }

    if (parsedName) setTenKhachHang(parsedName);
    if (parsedTax) {
      setMaSoThue(parsedTax);
      setLoaiKh('Doanh nghiệp');
    }
    if (parsedAddress) {
      setDiaChi(parsedAddress);
      const detected = detectProvinceFromAddress(parsedAddress, VIETNAM_PROVINCES_63);
      if (detected) setTinhThanh(detected);
    }

    // Update primary contact
    setContacts(prev => {
      const next = [...prev];
      if (next.length > 0) {
        if (parsedPhone) next[0].sdt = parsedPhone;
        if (parsedRepresentative) next[0].nguoiDaiDien = cleanProperVietnameseText(parsedRepresentative);
      }
      return next;
    });

    setShowMagicPaste(false);
    setMagicPasteText('');
    notify.success('✨ Đã tự động bóc tách và điền thông tin khách hàng!');
  };

  const handleLookupTax = async () => {
    const cleanTax = maSoThue.trim().replace(/[\s.-]/g, '');
    if (!cleanTax) {
      notify.warning('Vui lòng nhập Mã số thuế để tra cứu.');
      return;
    }

    setIsLookingUpTax(true);
    setTaxLookupSuccess(false);

    try {
      const response = await fetch(`https://api.vietqr.io/v2/business/${cleanTax}`);
      if (response.status === 429) {
        notify.error('Máy chủ VietQR đang bận (429). Vui lòng thử lại sau.');
        return;
      }
      const result = await response.json();
      if (result.code === '00' && result.data) {
        const parsed = parseVietQRBusinessData(result.data, VIETNAM_PROVINCES_63);
        if (parsed.tenKhachHang) setTenKhachHang(parsed.tenKhachHang);
        if (parsed.diaChi) setDiaChi(parsed.diaChi);
        if (parsed.tinhThanh) setTinhThanh(parsed.tinhThanh);
        setLoaiKh('Doanh nghiệp');
        setTaxLookupSuccess(true);
        notify.success(`Đã tìm thấy: ${parsed.tenKhachHang}`);
      } else {
        notify.warning(result.desc || 'Không tìm thấy dữ liệu MST trên cổng thông tin.');
      }
    } catch {
      notify.error('Lỗi kết nối khi tra cứu mã số thuế.');
    } finally {
      setIsLookingUpTax(false);
    }
  };

  const updateContact = (index: number, patch: Partial<QuickContactItem>) => {
    setContacts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addContact = () => {
    setContacts(prev => [
      ...prev,
      {
        id: `ct_${Date.now()}_${prev.length + 1}`,
        danhXung: 'Anh/Chị',
        nguoiDaiDien: '',
        sdt: '',
        chucVu: 'Kỹ thuật',
        isPrimary: false
      }
    ]);
  };

  const removeContact = (index: number) => {
    if (contacts.length <= 1) {
      notify.warning('Khách hàng cần tối thiểu 1 đầu mối liên hệ chính.');
      return;
    }
    setContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleUseExistingCustomer = (matchedCust: any) => {
    notify.success(`Đã nạp hồ sơ khách hàng [${matchedCust.tenKhachHang}] vào Báo Giá!`);
    onCustomerCreated(matchedCust);
    onClose();
  };

  const handleSaveAndAttach = async (e?: React.MouseEvent, sendZnsAfter = false) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    const cleanName = tenKhachHang.trim();
    if (!cleanName) {
      notify.error('Vui lòng nhập Tên khách hàng hoặc tên công ty.');
      return;
    }

    // Khống chế nghiêm ngặt: Tuyệt đối không cho phép tạo mới nếu trùng Mã Số Thuế
    if (duplicateWarning?.type === 'Mã số thuế (MST)') {
      notify.error(`Mã số thuế "${duplicateWarning.value}" đã tồn tại trong CRM (${duplicateWarning.matchedCustomer.maKh} - ${duplicateWarning.matchedCustomer.tenKhachHang}). Vui lòng bấm "Nạp ngay vào Báo Giá" để tránh tạo trùng lặp.`);
      return;
    }

    const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];
    const primaryPhone = primaryContact?.sdt?.trim() || '';

    if (!primaryPhone && loaiKh === 'Cá nhân') {
      notify.error('Vui lòng nhập Số điện thoại liên hệ cho khách hàng cá nhân.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Sinh mã khách hàng tuần tự
      const highestSeq = computeMaxCustomerSequence(existingCustomers);
      const nextMaKh = `KH${String(highestSeq + 1).padStart(4, '0')}`;

      const formattedContacts = contacts
        .filter(c => c.nguoiDaiDien.trim() || c.sdt.trim())
        .map((c, idx) => ({
          danhXung: c.danhXung || 'Anh/Chị',
          nguoiDaiDien: cleanProperVietnameseText(c.nguoiDaiDien.trim()) || (idx === 0 ? cleanName : 'Đầu mối'),
          sdt: c.sdt.trim(),
          chucVu: c.chucVu || (idx === 0 ? 'Đại diện' : 'Liên hệ'),
          email: c.email?.trim() || '',
          chiNhanh: 'Trụ sở chính'
        }));

      // 2. Chuẩn bị payload khách hàng với bản thể 3 tầng
      const identity = generateEnterpriseNameSuggestions(cleanName);
      const payload: any = {
        maKh: nextMaKh,
        tenKhachHang: cleanName,
        tenPhapLy: identity.tenPhapLy || cleanName,
        tenThuongMai: identity.tenThuongMai || cleanName,
        tenZns: identity.tenZns || cleanName,
        maSoThue: maSoThue.trim(),
        sdt: primaryPhone,
        nguoiDaiDien: cleanProperVietnameseText(primaryContact?.nguoiDaiDien?.trim() || '') || cleanName,
        diaChi: diaChi.trim(),
        tinhThanh: tinhThanh || 'TP. Hồ Chí Minh',
        loaiKh,
        nguoiPhuTrach: defaultOfficer,
        contacts: formattedContacts,
        ngayTao: new Date().toISOString(),
        ngayCapNhat: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await apiCreateEntity('customer', payload);
      const createdCustomer = {
        ...payload,
        id: res?.id || payload.id || `CUST_${Date.now()}`
      };

      // Đẩy vào cache tức thời
      try {
        entityCachePool.set('customers', createdCustomer);
      } catch {
        // Ignore cache pool set failure in offline mode
      }

      notify.success(`Đã tạo nhanh khách hàng [${nextMaKh}] thành công!`);
      onCustomerCreated(createdCustomer);
      
      if (sendZnsAfter && onSendZnsImmediately) {
        onSendZnsImmediately(createdCustomer, primaryContact);
      }

      onClose();
    } catch (err: any) {
      notify.error(`Lỗi khi tạo khách hàng: ${err?.message || 'Không thể lưu'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        // Prevent closing when clicking outside accidentally
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Navy Premium */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20 backdrop-blur-md shadow-xs">
              <UserPlus size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Tạo Nhanh Khách Hàng & Gắn Vào Báo Giá
              </h3>
              <p className="text-3xs text-blue-100 font-medium">Khởi tạo hồ sơ khách hàng ngay trong phiên báo giá & hợp đồng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMagicPaste(!showMagicPaste)}
              className="px-2.5 py-1 text-3xs font-bold text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              title="Dán văn bản tự do từ Zalo/Email để tự động điền"
            >
              <Wand2 size={11} />
              <span>Magic Paste</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Magic Paste Multi-Field Unpacker Popover */}
        {showMagicPaste && (
          <div className="bg-amber-50/95 border-b border-amber-200 p-4 animate-in slide-in-from-top-2 duration-150 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-600" />
                ✨ Dán nhanh thông tin từ Zalo / Email
              </span>
              <button
                type="button"
                onClick={() => setShowMagicPaste(false)}
                className="text-amber-700 hover:text-amber-900 text-2xs font-bold cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>
            <textarea
              rows={3}
              value={magicPasteText}
              onChange={(e) => setMagicPasteText(e.target.value)}
              placeholder="Ví dụ: Công ty TNHH Thiết Bị Sài Gòn Máy - MST: 0317891234 - ĐT: 0938384265 - Anh Nam (GĐ) - 45 Lê Duẩn, Q1, TP.HCM"
              className="w-full p-2.5 text-xs bg-white border border-amber-300 rounded-lg outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400 text-slate-900 font-medium"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleMagicPaste(magicPasteText)}
                disabled={!magicPasteText.trim()}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-2xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <ClipboardCheck size={12} />
                <span>Bóc Tách & Tự Động Điền</span>
              </button>
            </div>
          </div>
        )}

        {/* Realtime Duplicate Warning & 1-Click Attach Banner */}
        {duplicateWarning && (
          <div className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-medium animate-fadeIn shrink-0 ${
            duplicateWarning.type === 'Mã số thuế (MST)' 
              ? 'bg-rose-50 border-b border-rose-200 text-rose-950' 
              : 'bg-amber-50 border-b border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className={`${duplicateWarning.type === 'Mã số thuế (MST)' ? 'text-rose-600' : 'text-amber-600'} shrink-0 mt-0.5`} />
              <div>
                <p className={`font-bold ${duplicateWarning.type === 'Mã số thuế (MST)' ? 'text-rose-900' : 'text-amber-900'}`}>
                  {duplicateWarning.type === 'Mã số thuế (MST)' 
                    ? 'Khống chế trùng lặp MST: Hồ sơ khách hàng đã tồn tại trong CRM!' 
                    : 'Phát hiện khách hàng có thể đã tồn tại trên hệ thống!'}
                </p>
                <p className={`text-2xs mt-0.5 ${duplicateWarning.type === 'Mã số thuế (MST)' ? 'text-rose-800' : 'text-amber-800'}`}>
                  {duplicateWarning.type} <code className="bg-white/90 px-1 py-0.5 rounded font-mono font-bold text-slate-900 shadow-2xs">{duplicateWarning.value}</code> đã được cấp cho: <strong>{duplicateWarning.matchedCustomer.tenKhachHang}</strong> ({duplicateWarning.matchedCustomer.maKh})
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleUseExistingCustomer(duplicateWarning.matchedCustomer)}
              className={`px-3.5 py-1.5 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                duplicateWarning.type === 'Mã số thuế (MST)' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 ring-2 ring-emerald-500/30' 
                  : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
              }`}
            >
              <ArrowRightCircle size={14} />
              <span>Nạp ngay hồ sơ [{duplicateWarning.matchedCustomer.maKh}] vào Báo Giá</span>
            </button>
          </div>
        )}

        {/* Modal Body Container (NO NESTED FORM TAG TO AVOID BUBBLING) */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 custom-scrollbar">
          {/* Loại khách hàng */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setLoaiKh('Doanh nghiệp')}
              className={`flex-1 py-1.5 text-2xs font-bold rounded-md transition-all cursor-pointer ${
                loaiKh === 'Doanh nghiệp' ? 'bg-white text-blue-800 shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🏢 Doanh Nghiệp (Pháp nhân)
            </button>
            <button
              type="button"
              onClick={() => setLoaiKh('Cá nhân')}
              className={`flex-1 py-1.5 text-2xs font-bold rounded-md transition-all cursor-pointer ${
                loaiKh === 'Cá nhân' ? 'bg-white text-blue-800 shadow-2xs border border-slate-200/80' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              👤 Khách Hàng Cá Nhân
            </button>
          </div>

          {/* Tra cứu MST (Doanh nghiệp) */}
          {loaiKh === 'Doanh nghiệp' && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-3xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quick-mst">
                  Mã số thuế (MST) & Tra cứu tự động
                </label>
                {maSoThue && (
                  <button
                    type="button"
                    onClick={() => {
                      setMaSoThue('');
                      setTaxLookupSuccess(false);
                    }}
                    className="text-3xs text-slate-400 hover:text-slate-700 font-bold cursor-pointer"
                  >
                    ✕ Xóa MST
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  id="quick-mst"
                  type="text"
                  value={maSoThue}
                  onChange={(e) => setMaSoThue(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleLookupTax();
                    }
                  }}
                  placeholder="Nhập MST (VD: 0317891234)..."
                  className="flex-1 px-3 py-1.5 text-xs font-mono font-bold text-slate-900 border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleLookupTax}
                  disabled={isLookingUpTax || !maSoThue.trim()}
                  className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  <Search size={12} className={isLookingUpTax ? 'animate-spin text-blue-600' : 'text-blue-600'} />
                  <span>{isLookingUpTax ? 'Đang tra...' : 'Tra cứu MST'}</span>
                </button>
              </div>
              {taxLookupSuccess && (
                <p className="text-3xs text-emerald-700 flex items-center gap-1 font-bold mt-1 animate-fadeIn">
                  <Check size={12} /> Đã nạp thông tin pháp nhân từ VietQR
                </p>
              )}
            </div>
          )}

          {/* Tên khách hàng */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5" htmlFor="quick-name">
                {loaiKh === 'Doanh nghiệp' ? 'Tên Doanh Nghiệp (Pháp Nhân ĐKKD)' : 'Họ và Tên Khách Hàng'} <span className="text-red-500">*</span>
                {loaiKh === 'Doanh nghiệp' && (
                  <span className="text-3xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Pháp lý ĐKKD / Hóa Đơn B2B
                  </span>
                )}
              </label>
            </div>
            <input
              id="quick-name"
              type="text"
              required
              value={tenKhachHang}
              onChange={(e) => setTenKhachHang(e.target.value)}
              onBlur={(e) => {
                const cleaned = cleanProperVietnameseText(e.target.value);
                if (cleaned) setTenKhachHang(cleaned);
              }}
              placeholder={loaiKh === 'Doanh nghiệp' ? 'VD: CÔNG TY TNHH TẬP ĐOÀN TÔN THIÊN TÂN' : 'VD: Nguyễn Văn An'}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-900"
            />
            {/* Suggestion Chips */}
            {loaiKh === 'Doanh nghiệp' && tenKhachHang.trim().length >= 3 && (() => {
              const res = generateEnterpriseNameSuggestions(tenKhachHang);
              if (!res?.suggestions || res.suggestions.length === 0) return null;
              return (
                <div className="pt-1 flex flex-wrap items-center gap-1 animate-in fade-in duration-150">
                  <span className="text-3xs text-slate-400 font-semibold flex items-center gap-0.5">
                    <Sparkles size={10} className="text-amber-500" /> Gợi ý:
                  </span>
                  {res.suggestions.map((sug) => {
                    const isSelected = sug.value.toLowerCase() === tenKhachHang.trim().toLowerCase();
                    return (
                      <button
                        key={sug.id}
                        type="button"
                        onClick={() => setTenKhachHang(sug.value)}
                        className={`px-1.5 py-0.5 rounded text-3xs font-bold border transition-all cursor-pointer shadow-2xs flex items-center gap-1 ${
                          isSelected 
                            ? 'ring-2 ring-blue-500 bg-blue-50 text-blue-900 border-blue-300 font-black' 
                            : `${sug.badgeClass} hover:scale-105 active:scale-95`
                        }`}
                        title={`Bấm để chọn: ${sug.label} (${sug.charCount} ký tự)`}
                      >
                        <span className="opacity-80 text-3xs font-normal">[{sug.badgeText}]</span>
                        <span>{sug.value}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Danh sách Đầu Mối Liên Hệ (Multi-Contact Matrix) */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users size={12} className="text-blue-600" />
                Danh Sách Đầu Mối Liên Hệ ({contacts.length}) <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addContact}
                className="text-3xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Plus size={12} /> Thêm đầu mối
              </button>
            </div>

            <div className="space-y-2">
              {contacts.map((contact, idx) => (
                <div 
                  key={contact.id || idx}
                  className={`p-3 rounded-xl border ${contact.isPrimary ? 'bg-blue-50/40 border-blue-200' : 'bg-slate-50/60 border-slate-200'} space-y-2.5 transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-3xs font-bold uppercase px-2 py-0.5 rounded ${contact.isPrimary ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {contact.isPrimary ? 'Đầu mối chính' : `Đầu mối #${idx + 1}`}
                      </span>
                    </div>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                        title="Xóa đầu mối này"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Tên người liên hệ */}
                    <div className="space-y-0.5 sm:col-span-1">
                      <span className="text-3xs text-slate-500 font-medium">Họ & Tên</span>
                      <input
                        type="text"
                        value={contact.nguoiDaiDien}
                        onChange={(e) => updateContact(idx, { nguoiDaiDien: e.target.value })}
                        onBlur={(e) => updateContact(idx, { nguoiDaiDien: cleanProperVietnameseText(e.target.value) })}
                        placeholder="VD: Anh Nam"
                        className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white font-medium text-slate-900"
                      />
                    </div>

                    {/* Số điện thoại */}
                    <div className="space-y-0.5 sm:col-span-1">
                      <span className="text-3xs text-slate-500 font-medium">Số điện thoại {contact.isPrimary && <span className="text-red-500">*</span>}</span>
                      <SmartPhoneInput
                        value={contact.sdt}
                        onChange={(val) => updateContact(idx, { sdt: val })}
                        placeholder="09xx xxx xxx"
                        compact
                      />
                    </div>

                    {/* Vai trò / Chức vụ */}
                    <div className="space-y-0.5 sm:col-span-1">
                      <span className="text-3xs text-slate-500 font-medium">Vai trò / Bộ phận</span>
                      <select
                        value={contact.chucVu}
                        onChange={(e) => updateContact(idx, { chucVu: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white cursor-pointer font-medium text-slate-800"
                      >
                        <option value="Đại diện">Đại diện (Giám đốc/Chủ)</option>
                        <option value="Kế toán">Kế toán / Tài chính</option>
                        <option value="Kỹ thuật">Kỹ thuật / Vận hành</option>
                        <option value="Thu mua">Thu mua / Mua sắm</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Địa chỉ & Tỉnh thành */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quick-address">
                Địa Chỉ Chi Tiết
              </label>
              <input
                id="quick-address"
                type="text"
                value={diaChi}
                onChange={(e) => {
                  setDiaChi(e.target.value);
                  const detected = detectProvinceFromAddress(e.target.value, VIETNAM_PROVINCES_63);
                  if (detected) setTinhThanh(detected);
                }}
                placeholder="Số nhà, đường, phường/xã..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quick-province">
                Tỉnh / Thành Phố
              </label>
              <select
                id="quick-province"
                value={tinhThanh}
                onChange={(e) => setTinhThanh(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white cursor-pointer font-medium text-slate-900"
              >
                {VIETNAM_PROVINCES_63.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            Hủy Bỏ
          </button>
          
          <div className="w-full sm:w-auto flex items-center gap-2">
            {duplicateWarning?.type === 'Mã số thuế (MST)' && (
              <span className="text-3xs font-semibold text-rose-600 hidden sm:inline-block">
                (Đã khóa tạo mới vì trùng MST)
              </span>
            )}
            {onSendZnsImmediately && (
              <button
                type="button"
                disabled={isSaving || !tenKhachHang.trim() || duplicateWarning?.type === 'Mã số thuế (MST)'}
                onClick={(e) => handleSaveAndAttach(e, true)}
                className="flex-1 sm:flex-initial px-4 py-2 text-xs font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-xl border border-blue-300 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <MessageSquare size={13} />
                <span>Tạo & Gửi ZNS Ngay</span>
              </button>
            )}

            <button
              type="button"
              disabled={isSaving || !tenKhachHang.trim() || duplicateWarning?.type === 'Mã số thuế (MST)'}
              onClick={(e) => handleSaveAndAttach(e, false)}
              className="flex-1 sm:flex-initial px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className={isSaving ? 'animate-spin' : ''} />
              <span>{isSaving ? 'Đang Lưu...' : 'Tạo & Gắn Vào Báo Giá'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
