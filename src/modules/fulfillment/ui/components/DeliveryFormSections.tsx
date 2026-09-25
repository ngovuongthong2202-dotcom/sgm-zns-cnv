import React from 'react';
import { UseFormRegister, FieldErrors, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Truck, Package } from 'lucide-react';

interface DeliverySourceCardProps {
  soHopDong?: string;
  soDonHang?: string;
  soPhieuBaoGia?: string;
  soTien?: number;
  tenKhachHang?: string;
  tinhTrangThanhToan?: string;
  paymentId?: string;
  maThanhToan?: string;
  ngayThanhToan?: string;
  sdt?: string;
}

const isUuid = (s?: string) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.trim());

export function DeliverySourceCard({
  soHopDong,
  soDonHang,
  soPhieuBaoGia,
  tenKhachHang,
  tinhTrangThanhToan,
  paymentId,
  maThanhToan,
  sdt
}: DeliverySourceCardProps) {
  const displayPaymentCode = maThanhToan || (!isUuid(paymentId) ? paymentId : undefined);
  const isTatToan = tinhTrangThanhToan?.toLowerCase().includes('tất toán') || tinhTrangThanhToan?.toLowerCase().includes('tat toan');

  return (
    <div className="space-y-3">
      <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/60 border border-blue-200/70 rounded-xl p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-100/80 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span className="text-2xs font-black uppercase text-blue-900 tracking-wider">CĂN CỨ THANH TOÁN THAM CHIẾU</span>
            {displayPaymentCode && (
              <span className="text-xs font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                {displayPaymentCode}
              </span>
            )}
          </div>
          <div className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
            isTatToan ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
          }`}>
            {tinhTrangThanhToan || 'CHƯA THANH TOÁN'}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Khách hàng nhận</span>
            <strong className="text-slate-900 text-xs font-bold block truncate" title={tenKhachHang}>{tenKhachHang || '---'}</strong>
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">SĐT khách hàng</span>
            <span className="text-slate-900 font-mono font-bold block truncate">{sdt || '---'}</span>
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Chứng từ liên quan</span>
            <span className="text-slate-800 font-mono font-bold block truncate">
              {soHopDong ? `HĐ: ${soHopDong}` : (soPhieuBaoGia ? `BG: ${soPhieuBaoGia}` : 'Không')}
            </span>
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Số Đơn Hàng PO/ĐH</span>
            <span className="text-blue-700 font-mono font-bold block truncate">{soDonHang ? `#${soDonHang}` : 'Chưa gắn'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DeliveryInfoSectionProps {
  register: UseFormRegister<Delivery>;
  errors: FieldErrors<Delivery>;
  nguoiPhuTrachList: string[];
  onLookupExportSale?: () => void;
  isLookingUpExportSale?: boolean;
  currentCustomer?: any;
  watch?: UseFormWatch<Delivery>;
  setValue?: UseFormSetValue<Delivery>;
}

export function DeliveryInfoSection({
  register,
  errors,
  nguoiPhuTrachList,
  onLookupExportSale,
  isLookingUpExportSale,
  currentCustomer,
  watch,
  setValue
}: DeliveryInfoSectionProps) {
  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
          <Package size={14} /> THÔNG TIN LỆNH GIAO HÀNG
        </h3>
        {onLookupExportSale && (
          <button
            type="button"
            onClick={onLookupExportSale}
            disabled={isLookingUpExportSale}
            className="text-2xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded px-2.5 py-1 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isLookingUpExportSale ? 'Đang tra cứu ERP...' : '🔍 Lấy dữ liệu từ Số Phiếu Xuất (ERP)'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="deliveryId">Số hiệu Giao hàng <span className="text-red-700">*</span></label>
          <input
            id="deliveryId"
            {...register('deliveryId')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
            placeholder="Mã tự động..."
          />
          {errors.deliveryId && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.deliveryId.message as string}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="soPhieuXuat">Số Phiếu Xuất (ERP) <span className="text-red-700">*</span></label>
            <span className="text-3xs text-slate-400">VD: PXBH-230926-0002</span>
          </div>
          <div className="relative flex items-center">
            <input
              id="soPhieuXuat"
              {...register('soPhieuXuat')}
              onBlur={() => onLookupExportSale?.()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onLookupExportSale?.();
                }
              }}
              className="h-8 rounded-lg border border-slate-200 px-3 pr-8 text-sm w-full font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
              placeholder="Nhập mã phiếu xuất..."
            />
            {onLookupExportSale && (
              <button
                type="button"
                onClick={onLookupExportSale}
                disabled={isLookingUpExportSale}
                className="absolute right-1 text-slate-400 hover:text-blue-600 p-1 rounded"
                title="Tra cứu ERP"
              >
                {isLookingUpExportSale ? (
                  <span className="animate-spin inline-block text-xs">⏳</span>
                ) : (
                  <span className="text-xs">🔍</span>
                )}
              </button>
            )}
          </div>
          {errors.soPhieuXuat && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.soPhieuXuat.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="nguoiPhuTrach">Người phụ trách</label>
          <input
            id="nguoiPhuTrach"
            type="text"
            disabled
            readOnly
            {...register('nguoiPhuTrach')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-semibold w-full text-slate-700 bg-slate-100 cursor-not-allowed select-none outline-none"
            placeholder="Người phụ trách theo tài khoản"
          />
        </div>

        {/* Gợi ý chọn nhanh đầu mối nhận hàng từ danh bạ khách hàng */}
        {currentCustomer && Array.isArray(currentCustomer.contacts) && currentCustomer.contacts.length > 1 && (
          <div className="col-span-full bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <span>⚡ Chọn nhanh đầu mối nhận hàng ({currentCustomer.contacts.length} đầu mối)</span>
              </span>
              <span className="text-3xs text-blue-700 italic">Click để tự điền Tên người nhận & SĐT</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {currentCustomer.contacts.map((ct: any, idx: number) => {
                const currentName = watch?.('nguoiLienHe');
                const currentPhone = watch?.('sdtLienHe');
                const isSelected = (currentName === ct.nguoiDaiDien || currentPhone === ct.sdt);
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (setValue) {
                        if (ct.nguoiDaiDien) setValue('nguoiLienHe', ct.nguoiDaiDien, { shouldDirty: true, shouldValidate: true });
                        if (ct.sdt) setValue('sdtLienHe', ct.sdt, { shouldDirty: true, shouldValidate: true });
                      }
                    }}
                    className={`text-2xs px-2.5 py-1 rounded-md border transition-all text-left flex items-center gap-1.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <span>{ct.nguoiDaiDien || `Đầu mối ${idx + 1}`}</span>
                    {ct.chucVu && <span className={isSelected ? 'text-blue-100 text-3xs' : 'text-slate-400 text-3xs'}>({ct.chucVu})</span>}
                    <span className={`font-mono text-3xs ${isSelected ? 'text-white' : 'text-slate-500'}`}>- {ct.sdt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Thông tin Người nhận & Địa chỉ giao hàng tự động lấy từ khách hàng */}
        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="nguoiLienHe">Tên người liên hệ nhận hàng</label>
          <input
            id="nguoiLienHe"
            {...register('nguoiLienHe')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-semibold w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Tên người nhận hàng..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="sdtLienHe">SĐT người nhận</label>
          <input
            id="sdtLienHe"
            {...register('sdtLienHe')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-mono font-semibold w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            placeholder="SĐT người nhận..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="diaChiGiaoHang">Địa chỉ giao hàng</label>
          <input
            id="diaChiGiaoHang"
            {...register('diaChiGiaoHang')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-medium w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Địa chỉ giao hàng chi tiết..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="keToanKho">Kế toán kho</label>
          <input
            id="keToanKho"
            {...register('keToanKho')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-medium w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Tên kế toán kho xuất..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="khoXuat">Kho xuất</label>
          <input
            id="khoXuat"
            {...register('khoXuat')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm font-medium w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            placeholder="Kho xuất hàng..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="ngayTaoPhieuXuat">Ngày tạo phiếu xuất</label>
          <input
            id="ngayTaoPhieuXuat"
            type="date"
            {...register('ngayTaoPhieuXuat' as any)}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="ngayLapPgh">Ngày lập PGH <span className="text-red-700">*</span></label>
          <input
            id="ngayLapPgh"
            type="date"
            {...register('ngayLapPgh' as any)}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.ngayLapPgh && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.ngayLapPgh.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="ngayGiaoMay">Ngày dự kiến <span className="text-red-700">*</span></label>
          <input
            id="ngayGiaoMay"
            type="date"
            {...register('ngayGiaoMay' as any)}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
          {errors.ngayGiaoMay && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.ngayGiaoMay.message as string}</p>}
        </div>
      </div>
    </section>
  );
}

interface DeliveryTransportSectionProps {
  register: UseFormRegister<Delivery>;
  errors: FieldErrors<Delivery>;
}

export function DeliveryTransportSection({
  register,
  errors
}: DeliveryTransportSectionProps) {
  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
        <Truck size={14} className="text-orange-600" /> THÔNG TIN VẬN TẢI & HOẠT ĐỘNG
      </h3>
      
      <div className="flex flex-col gap-4">
        <div className="space-y-4">
          <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="donViVanChuyen">Đơn vị Vận chuyển / Biển số <span className="text-red-700">*</span></label>
            <input
              id="donViVanChuyen"
              {...register('donViVanChuyen')}
              className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
              placeholder="Nhập bên giao hàng..."
            />
            {errors.donViVanChuyen && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.donViVanChuyen.message as string}</p>}
          </div>

          <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="soDienThoaiDonViVanChuyen">Hotline / SĐT Tài xế</label>
            <input
              id="soDienThoaiDonViVanChuyen"
              {...register('soDienThoaiDonViVanChuyen')}
              className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
              placeholder="09xx..."
            />
          </div>
        </div>

        <div className="space-y-1.5 focus-within:text-blue-600 transition-colors h-full flex flex-col">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="ghiChu">Bộ phận Giao hàng ghi chú <span className="text-3xs font-normal normal-case text-slate-400">(Nội bộ)</span></label>
          <textarea
            id="ghiChu"
            {...register('ghiChu')}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 resize-none min-h-[90px]"
            placeholder="Ví dụ: Gọi khách trước 30 phút, Kiểm tra hàng kỹ trước khi bốc..."
          />
        </div>
      </div>
    </section>
  );
}

export function DeliveryHiddenInputs({ register }: { register: UseFormRegister<Delivery> }) {
  return (
    <div className="hidden">
      <input type="hidden" {...register('giaTriHopDong', { valueAsNumber: true })} />
      <input type="hidden" {...register('soHopDong')} />
      <input type="hidden" {...register('ngayKy')} />
      <input type="hidden" {...register('tinhTrangThanhToan')} />
      <input type="hidden" {...register('dvt')} />
      <input type="hidden" {...register('slMay')} />
      <input type="hidden" {...register('maKh')} />
      <input type="hidden" {...register('sdt')} />
      <input type="hidden" {...register('nguoiDaiDien')} />
      <input type="hidden" {...register('customerId')} />
      <input type="hidden" {...register('contractId')} />
      <input type="hidden" {...register('quotationId')} />
      <input type="hidden" {...register('tenKhachHang')} />
      <input type="hidden" {...register('ngayGiaoThucTe' as any)} />
      <input type="hidden" {...register('kyNhan')} />
      <input type="hidden" {...register('loai')} />
      <input type="hidden" {...register('soDonHang')} />
      <input type="hidden" {...register('ghiChuNoiBo')} />
    </div>
  );
}
