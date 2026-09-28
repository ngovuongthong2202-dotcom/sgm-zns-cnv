import React, { useState } from 'react';
import { UserPlus, Building, Phone, MapPin, Search, Check, AlertCircle, X, Sparkles } from 'lucide-react';
import { SmartPhoneInput } from '@/src/platform/ui/design-system/form/SmartPhoneInput';
import { parseVietQRBusinessData } from './CustomerFormHelpers';
import { VIETNAM_PROVINCES_63 } from '@/src/hooks/useSharedFields';
import { computeMaxCustomerSequence } from '../hooks/useCustomerForm';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { notify } from '@/src/shared/utils/notify';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';

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

  if (!isOpen) return null;

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
        notify.success(`Đã tìm thấy thông tin: ${parsed.tenKhachHang}`);
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
      // 1. Compute sequential maKh
      const existing = entityCachePool.getAll<any>('customers') || [];
      const highestSeq = computeMaxCustomerSequence(existing);
      const nextMaKh = `KH${String(highestSeq + 1).padStart(4, '0')}`;

      // 2. Prepare payload
      const payload: any = {
        maKh: nextMaKh,
        tenKhachHang: cleanName,
        maSoThue: maSoThue.trim(),
        sdt: sdt.trim(),
        nguoiDaiDien: cleanProperVietnameseText(nguoiDaiDien.trim()),
        diaChi: diaChi.trim(),
        tinhThanh: tinhThanh || 'TP. Hồ Chí Minh',
        loaiKh,
        nguoiPhuTrach: defaultOfficer,
        contacts: sdt.trim() || nguoiDaiDien.trim() ? [{
          danhXung: 'Anh/Chị',
          nguoiDaiDien: cleanProperVietnameseText(nguoiDaiDien.trim()) || cleanName,
          sdt: sdt.trim(),
          chucVu: 'Đại diện',
          chiNhanh: 'Văn phòng chính'
        }] : [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await apiCreateEntity('customer', payload);
      const createdCustomer = {
        ...payload,
        id: res?.id || payload.id || `CUST_${Date.now()}`
      };

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
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserPlus size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Tạo Nhanh Khách Hàng</h3>
              <p className="text-3xs text-blue-100 font-medium">Khởi tạo hồ sơ khách hàng ngay trong phiên báo giá</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Loại khách hàng */}
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setLoaiKh('Doanh nghiệp')}
              className={`flex-1 py-1.5 text-2xs font-bold rounded-md transition-all ${
                loaiKh === 'Doanh nghiệp' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Doanh Nghiệp (Pháp nhân)
            </button>
            <button
              type="button"
              onClick={() => setLoaiKh('Cá nhân')}
              className={`flex-1 py-1.5 text-2xs font-bold rounded-md transition-all ${
                loaiKh === 'Cá nhân' ? 'bg-white text-blue-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Khách Hàng Cá Nhân
            </button>
          </div>

          {/* Tra cứu MST */}
          {loaiKh === 'Doanh nghiệp' && (
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
                Mã số thuế (MST) & Tra cứu tự động
              </label>
              <div className="flex gap-2">
                <input
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
                  className="flex-1 px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleLookupTax}
                  disabled={isLookingUpTax || !maSoThue.trim()}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200 rounded-lg flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Search size={12} className={isLookingUpTax ? 'animate-spin' : ''} />
                  <span>{isLookingUpTax ? 'Đang tra...' : 'Tra cứu MST'}</span>
                </button>
              </div>
              {taxLookupSuccess && (
                <p className="text-3xs text-emerald-700 flex items-center gap-1 font-medium mt-1">
                  <Check size={12} /> Đã tự động điền Tên Công Ty và Địa chỉ từ VietQR
                </p>
              )}
            </div>
          )}

          {/* Tên khách hàng */}
          <div className="space-y-1">
            <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
              {loaiKh === 'Doanh nghiệp' ? 'Tên Công Ty / Doanh Nghiệp' : 'Họ và Tên Khách Hàng'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={tenKhachHang}
              onChange={(e) => setTenKhachHang(e.target.value)}
              placeholder={loaiKh === 'Doanh nghiệp' ? 'VD: CÔNG TY TNHH CÔNG NGHỆ VÀ THIẾT BỊ SÀI GÒN MÁY' : 'VD: Nguyễn Văn A'}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium"
            />
          </div>

          {/* SĐT & Người đại diện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
                Số Điện Thoại Liên Hệ
              </label>
              <SmartPhoneInput
                value={sdt}
                onChange={setSdt}
                placeholder="09xx xxx xxx"
                compact
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
                Người Đại Diện / Liên Hệ
              </label>
              <input
                type="text"
                value={nguoiDaiDien}
                onChange={(e) => setNguoiDaiDien(e.target.value)}
                placeholder="VD: Anh Nam (GĐ)"
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Địa chỉ & Tỉnh thành */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
                Địa Chỉ Chi Tiết
              </label>
              <input
                type="text"
                value={diaChi}
                onChange={(e) => setDiaChi(e.target.value)}
                placeholder="Số nhà, đường, phường/xã..."
                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold uppercase tracking-wider text-slate-600">
                Tỉnh / Thành Phố
              </label>
              <select
                value={tinhThanh}
                onChange={(e) => setTinhThanh(e.target.value)}
                className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 bg-white cursor-pointer"
              >
                {VIETNAM_PROVINCES_63.map((prov) => (
                  <option key={prov} value={prov}>
                    {prov}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
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
              className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
