import React from 'react';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Truck, Package } from 'lucide-react';

interface DeliverySourceCardProps {
  soHopDong?: string;
  soDonHang?: string;
  tenKhachHang?: string;
  tinhTrangThanhToan?: string;
  paymentId?: string;
  sdt?: string;
}

export function DeliverySourceCard({
  soHopDong,
  soDonHang,
  tenKhachHang,
  tinhTrangThanhToan,
  paymentId,
  sdt
}: DeliverySourceCardProps) {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
        <span className="text-2xs font-black uppercase text-blue-800 tracking-wider">Căn cứ thanh toán</span>
        <h4 className="text-xs font-bold text-slate-900">
          Thông tin được đồng bộ thông minh từ Thanh toán: #{paymentId || 'Chưa xác định'}
        </h4>
        <p className="text-2xs text-slate-500 leading-normal font-semibold font-semibold">
          Khách hàng nhận hóa đơn, giá trị tài chính, danh mục sản phẩm và trạng thái thanh toán được kế thừa trực tiếp để khởi tạo lệnh giao hàng. Bạn có thể cập nhật số lượng thực tế giao nhận tương ứng.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 border border-slate-150 text-xs font-semibold text-slate-700 bg-slate-50/50 p-4 rounded-xl shadow-xs">
        <div>
          <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Khách hàng nhận HĐ</span>
          <strong className="text-slate-950 text-sm font-bold block">{tenKhachHang || '---'}</strong>
        </div>
        <div>
          <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Liên hệ & giao nhận</span>
          <strong className="text-slate-950 font-mono text-xs font-bold block">{sdt || '---'}</strong>
        </div>
      </div>

      <div className="bg-slate-50/50 border border-slate-150 rounded-xl p-4 grid grid-cols-3 gap-4 shadow-xs">
        <div>
          <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider mb-0.5 font-bold">TT Tài chính</span>
          <div className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mt-1 uppercase w-max">
            {tinhTrangThanhToan || '---'}
          </div>
        </div>
        {soHopDong && (
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider mb-0.5 font-bold">Số Hợp Đồng</span>
            <div className="text-xs font-extrabold font-mono text-emerald-950 mt-1">{soHopDong}</div>
          </div>
        )}
        {soDonHang && (
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider mb-0.5 font-bold">Số Đơn Hàng</span>
            <div className="text-xs font-bold font-mono text-slate-800 mt-1">{soDonHang}</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DeliveryInfoSectionProps {
  register: UseFormRegister<Delivery>;
  errors: FieldErrors<Delivery>;
  nguoiPhuTrachList: string[];
}

export function DeliveryInfoSection({
  register,
  errors,
  nguoiPhuTrachList
}: DeliveryInfoSectionProps) {
  return (
    <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 pb-2">
        <Package size={14} /> THÔNG TIN LỆNH GIAO HÀNG
      </h3>

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
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="soPhieuXuat">Số Phiếu Xuất <span className="text-red-700">*</span></label>
          <input
            id="soPhieuXuat"
            {...register('soPhieuXuat')}
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:font-normal placeholder:text-slate-400"
            placeholder="Nhập mã phiếu xuất..."
          />
          {errors.soPhieuXuat && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.soPhieuXuat.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block" htmlFor="nguoiPhuTrach">Người phụ trách</label>
          <input
            id="nguoiPhuTrach"
            {...register('nguoiPhuTrach')}
            list="deliveryOwnerList"
            className="h-8 rounded-lg border border-slate-200 px-3 text-sm w-full text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 bg-white"
            placeholder="Chọn người phụ trách..."
          />
          <datalist id="deliveryOwnerList">
            {nguoiPhuTrachList.map((n: string) => <option key={n} value={n} />)}
          </datalist>
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
    </div>
  );
}
