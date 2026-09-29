import React, { useState, useMemo } from 'react';
import { UserPlus, Building, Phone, MapPin, Search, Check, AlertCircle, X, Sparkles, Wand2, ClipboardCheck, AlertTriangle } from 'lucide-react';
import { SmartPhoneInput } from '@/src/platform/ui/design-system/form/SmartPhoneInput';
import { parseVietQRBusinessData } from './CustomerFormHelpers';
import { VIETNAM_PROVINCES_63 } from '@/src/hooks/useSharedFields';
import { computeMaxCustomerSequence } from '../hooks/useCustomerForm';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { notify } from '@/src/shared/utils/notify';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { detectProvinceFromAddress } from '@/src/shared/services/vietnamAddressParser';

interface QuickCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCustomerCreated: (customer: any) => void;
  defaultOfficer?: string;
}

export function QuickCustomerModal({
  isOpen,
  onClose,
  onCustomerCreated,
  defaultOfficer = ''
}: QuickCustomerModalProps) {
  const [tenKhachHang, setTenKhachHang] = useState('');
  const [maSoThue, setMaSoThue] = useState('');
  const [sdt, setSdt] = useState('');
  const [nguoiDaiDien, setNguoiDaiDien] = useState('');
  const [diaChi, setDiaChi] = useState('');
  const [tinhThanh, setTinhThanh] = useState('TP. Hồ Chí Minh');
  const [loaiKh, setLoaiKh] = useState<'Doanh nghiệp' | 'Cá nhân'>('Doanh nghiệp');
  const [isLookingUpTax, setIsLookingUpTax] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taxLookupSuccess, setTaxLookupSuccess] = useState(false);
  const [showMagicPaste, setShowMagicPaste] = useState(false);
  const [magicPasteText, setMagicPasteText] = useState('');

  // Lấy danh sách khách hàng để cảnh báo trùng lặp realtime
  const existingCustomers = useMemo(() => {
    try {
      return entityCachePool.getAll<any>('customers') || [];
    } catch {
      return [];
    }
  }, [isOpen]);

  // Kiểm tra trùng lặp MST hoặc SĐT
  const duplicateWarning = useMemo(() => {
    const cleanTax = maSoThue.trim().replace(/[\s.-]/g, '');
    const cleanPhone = sdt.trim().replace(/[\s.-]/g, '');

    if (!cleanTax && !cleanPhone) return null;

    for (const c of existingCustomers) {
      if (c.deletedAt || c.deleted_at) continue;
      const cTax = (c.maSoThue || '').trim().replace(/[\s.-]/g, '');
      const cPhone = (c.sdt || '').trim().replace(/[\s.-]/g, '');

      if (cleanTax && cTax && cleanTax === cTax) {
        return {
          type: 'MST',
          value: cleanTax,
          matchedCustomer: c
        };
      }
      if (cleanPhone && cPhone && cleanPhone === cPhone) {
        return {
          type: 'SĐT',
          value: cleanPhone,
          matchedCustomer: c
        };
      }
    }
    return null;
  }, [maSoThue, sdt, existingCustomers]);

  if (!isOpen) return null;

  const handleMagicPaste = (text: string) => {
    if (!text || !text.trim()) return;

    let parsedTax = '';
    let parsedPhone = '';
    let parsedName = '';
    let parsedAddress = '';
    let parsedRepresentative = '';

    // 1. Trích xuất MST
    const taxMatch = text.match(/(?:MST|mã số thuế|tax(?:\s*code)?)\s*[:：\-]?\s*([0-9]{10}(?:-[0-9]{3})?|[0-9]{13})/i)
      || text.match(/\b([0-9]{10}(?:-[0-9]{3})?|[0-9]{13})\b/);
    if (taxMatch) parsedTax = taxMatch[1].trim();

    // 2. Trích xuất SĐT
    const phoneMatch = text.match(/(?:SĐT|ĐT|Điện thoại|Tel|Phone|Hotline|Zalo)\s*[:：\-]?\s*((?:\+84|84|0)[3|5|7|8|9][0-9]{8})/i)
      || text.match(/\b((?:\+84|84|0)[3|5|7|8|9][0-9]{8})\b/);
    if (phoneMatch) parsedPhone = phoneMatch[1].trim();

    // 3. Trích xuất Người đại diện
    const repMatch = text.match(/(?:Người đại diện|Người liên hệ|Đại diện|Liên hệ|Anh|Chị|Ông|Bà|GĐ|Giám đốc)\s*[:：\-]?\s*([A-ZÀ-Ỹa-zà-ỹ\s]{2,30})/i);
    if (repMatch) parsedRepresentative = repMatch[1].trim();

    // 4. Trích xuất Địa chỉ
    const addrMatch = text.match(/(?:Địa chỉ|Đ\/c|ĐC|Address)\s*[:：\-]?\s*([^,\n]+(?:,[^,\n]+){1,4})/i);
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
    if (parsedPhone) setSdt(parsedPhone);
    if (parsedRepresentative) setNguoiDaiDien(cleanProperVietnameseText(parsedRepresentative));
    if (parsedAddress) {
      setDiaChi(parsedAddress);
      const detected = detectProvinceFromAddress(parsedAddress, VIETNAM_PROVINCES_63);
      if (detected) setTinhThanh(detected);
    }

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = tenKhachHang.trim();
    if (!cleanName) {
      notify.error('Vui lòng nhập Tên khách hàng hoặc tên công ty.');
      return;
    }

    setIsSaving(true);
    try {
      // 1. Sinh mã khách hàng tuần tự
      const highestSeq = computeMaxCustomerSequence(existingCustomers);
      const nextMaKh = `KH${String(highestSeq + 1).padStart(4, '0')}`;

      // 2. Chuẩn bị payload
      const payload: any = {
        maKh: nextMaKh,
        tenKhachHang: cleanName,
        maSoThue: maSoThue.trim(),
        sdt: sdt.trim(),
        nguoiDaiDien: cleanProperVietnameseText(nguoiDaiDien.trim()) || cleanName,
        diaChi: diaChi.trim(),
        tinhThanh: tinhThanh || 'TP. Hồ Chí Minh',
        loaiKh,
        nguoiPhuTrach: defaultOfficer,
        contacts: (sdt.trim() || nguoiDaiDien.trim()) ? [{
          danhXung: 'Anh/Chị',
          nguoiDaiDien: cleanProperVietnameseText(nguoiDaiDien.trim()) || cleanName,
          sdt: sdt.trim(),
          chucVu: loaiKh === 'Doanh nghiệp' ? 'Đại diện' : 'Chủ tài khoản',
          chiNhanh: 'Trụ sở chính'
        }] : [],
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
      } catch {}

      notify.success(`Đã tạo nhanh khách hàng [${nextMaKh}] thành công!`);
      onCustomerCreated(createdCustomer);
      onClose();
    } catch (err: any) {
      notify.error(`Lỗi khi tạo khách hàng: ${err?.message || 'Không thể lưu'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header - Glassmorphism Deep Navy với Chữ Trắng Tinh Khiết */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/15 rounded-xl border border-white/20 backdrop-blur-md shadow-xs">
              <UserPlus size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-white !text-white flex items-center gap-2">
                Tạo Nhanh Khách Hàng
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
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Magic Paste Multi-Field Unpacker Popover */}
        {showMagicPaste && (
          <div className="bg-amber-50/95 border-b border-amber-200 p-4 animate-in slide-in-from-top-2 duration-150 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-600" />
                ✨ Dán nhanh thông tin từ Zalo / Email
              </span>
              <button
                type="button"
                onClick={() => setShowMagicPaste(false)}
                className="text-amber-700 hover:text-amber-900 text-2xs font-bold"
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

        {/* Realtime Duplicate Warning Banner */}
        {duplicateWarning && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-2xs text-amber-950 font-medium animate-fadeIn">
            <AlertTriangle size={14} className="text-amber-600 shrink-0" />
            <span>
              <strong>Cảnh báo trùng lặp:</strong> {duplicateWarning.type} <code>{duplicateWarning.value}</code> đã tồn tại cho khách hàng <strong>{duplicateWarning.matchedCustomer.tenKhachHang}</strong> ({duplicateWarning.matchedCustomer.maKh}).
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
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

          {/* Tra cứu MST (Chỉ áp dụng cho Doanh nghiệp) */}
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
                    className="text-3xs text-slate-400 hover:text-slate-700 font-bold"
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
                  <Check size={12} /> Đã tự động điền Tên Công Ty và Địa chỉ từ VietQR
                </p>
              )}
            </div>
          )}

          {/* Tên khách hàng */}
          <div className="space-y-1">
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quick-name">
              {loaiKh === 'Doanh nghiệp' ? 'Tên Công Ty / Doanh Nghiệp' : 'Họ và Tên Khách Hàng'} <span className="text-red-500">*</span>
            </label>
            <input
              id="quick-name"
              type="text"
              required
              value={tenKhachHang}
              onChange={(e) => setTenKhachHang(e.target.value)}
              onBlur={(e) => setTenKhachHang(cleanProperVietnameseText(e.target.value))}
              placeholder={loaiKh === 'Doanh nghiệp' ? 'VD: CÔNG TY TNHH CÔNG NGHỆ VÀ THIẾT BỊ SÀI GÒN MÁY' : 'VD: Nguyễn Văn An'}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-900"
            />
          </div>

          {/* SĐT & Người đại diện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quick-phone">
                Số Điện Thoại Liên Hệ <span className="text-red-500">*</span>
              </label>
              <SmartPhoneInput
                id="quick-phone"
                value={sdt}
                onChange={setSdt}
                placeholder="09xx xxx xxx"
                compact
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600" htmlFor="quick-rep">
                Người Đại Diện / Liên Hệ
              </label>
              <input
                id="quick-rep"
                type="text"
                value={nguoiDaiDien}
                onChange={(e) => setNguoiDaiDien(e.target.value)}
                onBlur={(e) => setNguoiDaiDien(cleanProperVietnameseText(e.target.value))}
                placeholder="VD: Anh Nam (GĐ)"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Địa chỉ & Tỉnh thành */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

          {/* Quick Province Chips */}
          <div className="space-y-1 pt-1">
            <span className="text-3xs font-bold uppercase tracking-wider text-slate-400 block">Gợi ý nhanh Tỉnh/Thành:</span>
            <div className="flex flex-wrap gap-1">
              {['TP. Hồ Chí Minh', 'Hà Nội', 'Bình Dương', 'Đồng Nai', 'Long An', 'Cần Thơ', 'Đà Nẵng'].map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setTinhThanh(prov)}
                  className={`text-3xs px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    tinhThanh === prov 
                      ? 'bg-blue-600 text-white border-blue-600 font-bold' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={isSaving || !tenKhachHang.trim()}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 active:bg-blue-900 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles size={13} className={isSaving ? 'animate-spin' : ''} />
              <span>{isSaving ? 'Đang Lưu...' : 'Tạo & Gắn Vào Báo Giá'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
