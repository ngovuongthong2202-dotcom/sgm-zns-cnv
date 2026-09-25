import React from 'react';
import { Search, FileText, CreditCard, Calendar } from 'lucide-react';
import { QuotationSmartSearch } from '@/src/widgets/QuotationSmartSearch';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { formatDate } from '@/src/shared/utils/formatDate';

export function ContractBasisSection({
  watch,
  setValue,
  setActiveQuotationDoc,
  quotations,
  contracts,
  contract,
  errors,
  businessLock
}: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Search className="text-slate-900 w-4 h-4" />
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
          1. Căn cứ pháp lý & Smart Search báo giá
        </h3>
      </div>

      <div className="space-y-3">
        <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">Tìm kiếm Báo Giá đã chốt <span className="text-red-650 ml-0.5">*</span></label>
        <QuotationSmartSearch
          quotations={quotations}
          value={watch('quotationId') || ''}
          disabled={businessLock.locked}
          onChange={(val, doc: any) => {
            setValue('quotationId', val, { shouldValidate: true, shouldDirty: true });
            if (doc) setActiveQuotationDoc(doc);
          }}
          excludeQuoIds={contract ? [] : contracts.filter((c: any) => normalizeLegacyStatus(c.trangThaiGuiTinHopDong) === EntityZnsStatus.THANH_CONG).map((c: any) => c.quotationId)}
          filterOption={(q) => true}
          isOptionDisabled={(q) => {
            const loai = (q.loai || '').toString().trim().toUpperCase();
            if (loai !== 'BG MÁY') return { disabled: true, reason: 'Không phải báo giá bán máy' };
            return { disabled: false };
          }}
          error={errors.quotationId?.message as string | undefined}
        />
        <p className="text-2xs text-slate-500 font-medium">Hệ thống hỗ trợ tự động điền thông tin sau khi nhận diện Báo Giá Chốt hợp lệ.</p>

        {watch('quotationId') && (
          <div className="space-y-3">
            <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
              <span className="text-2xs font-black uppercase text-blue-800 tracking-wider">Căn cứ báo giá đã chốt</span>
              <h4 className="text-xs font-bold text-slate-900">Thông tin được đồng bộ thông minh từ Báo giá: #{watch('soPhieuBaoGia') || 'Chưa xác định'}</h4>
              <p className="text-2xs text-slate-500 leading-normal font-semibold">Khách hàng nhận hóa đơn, danh mục thiết bị sản phẩm, đơn giá và giá trị tài chính được ánh xạ trực tiếp liên phòng ban. Bạn có thể chỉnh sửa số lượng hoặc đơn giá nếu có thoả thuận đặc thù riêng.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border border-slate-150 text-xs font-semibold text-slate-700 bg-slate-50/50 p-4 rounded-xl shadow-xs">
              <div>
                <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Khách hàng nhận HĐ</span>
                <strong className="text-slate-950 text-sm font-bold block">{watch('tenKhachHang') || '---'}</strong>
              </div>
              <div>
                <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Liên hệ & giao nhận</span>
                <strong className="text-slate-950 font-mono text-xs font-bold block">{watch('sdt') || '---'}</strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContractDefinitionSection({ register, errors, estimatedCompletionDate, nguoiPhuTrachList, businessLock, watch }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <FileText className="text-slate-900 w-4 h-4" />
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
          2. Định nghĩa hợp đồng kinh tế
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Số Hợp Đồng <span className="text-red-650">*</span></label>
          <input aria-label="Số Hợp Đồng" disabled={businessLock.locked} {...register('soHopDong')} className="premium-input w-full font-mono font-bold text-slate-900 h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white disabled:bg-slate-100 disabled:opacity-75" placeholder="HD-XXXX/SGM" />
          {errors.soHopDong && <p className="text-red-600 text-xs font-medium mt-1">{errors.soHopDong.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Số Đơn Hàng PO/ĐH</label>
          <input aria-label="Số Đơn Hàng PO" {...register('soDonHang')} className="premium-input w-full font-semibold h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" placeholder="PO-XXXX" />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Ngày Ký Kết HĐ <span className="text-red-650">*</span></label>
          <input aria-label="Ngày Ký Kết" type="date" {...register('ngayKy')} className="premium-input w-full font-semibold h-8 rounded-lg font-mono border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Số ngày thực hiện</label>
          <div className="relative">
            <input aria-label="Số ngày thực hiện" type="number" {...register('soNgayDuKienHoanThanh', { valueAsNumber: true })} className="premium-input w-full font-bold h-8 rounded-lg pr-12 font-mono border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs text-slate-500 font-extrabold font-mono">DAYS</span>
          </div>
          {estimatedCompletionDate && (
            <span className="text-2xs font-bold text-emerald-700 bg-emerald-55/40 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1.5 mt-1">
              <Calendar className="w-3.5 h-3.5" /> DK Hoàn thành ngày: {formatDate(estimatedCompletionDate)}
            </span>
          )}
          {errors.soNgayDuKienHoanThanh && <p className="text-red-600 text-xs font-medium mt-1">{errors.soNgayDuKienHoanThanh.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Người Đại Diện Ký Hợp Đồng</label>
          <input aria-label="Người Đại Diện Ký" {...register('nguoiDaiDien')} className="premium-input w-full h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" placeholder="Họ tên đại diện ký..." />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Người phụ trách</label>
          <input 
            type="text"
            disabled
            readOnly
            value={watch ? (watch('nguoiPhuTrach') || '') : ''}
            {...register('nguoiPhuTrach')} 
            className="premium-input w-full bg-slate-100 text-slate-700 font-semibold h-8 py-0 leading-normal rounded-lg border border-slate-200 px-3 text-sm cursor-not-allowed select-none outline-none"
            placeholder="Người phụ trách theo tài khoản"
          />
        </div>
      </div>
    </div>
  );
}

export function ContractFinanceSection({ subTotal, discountAmount, vatAmount, totalAmount }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <CreditCard className="text-slate-900 w-4 h-4" />
        <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
          4. Trị giá hợp đồng & Tài chính
        </h3>
      </div>

      <div className="space-y-3.5 text-xs text-slate-600">
        <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-semibold">
          <span className="text-slate-500 uppercase text-2xs tracking-wider">Tạm tính (Gốc):</span>
          <span className="font-mono font-extrabold text-slate-800">{new Intl.NumberFormat('vi-VN').format(subTotal)} đ</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-semibold text-emerald-800">
            <span className="text-emerald-700 uppercase text-2xs tracking-wider">Chiết khấu hàng hóa:</span>
            <span className="font-mono font-bold">-{new Intl.NumberFormat('vi-VN').format(discountAmount)} đ</span>
          </div>
        )}
        {vatAmount > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-semibold">
            <span className="text-slate-500 uppercase text-2xs tracking-wider">Thuế GTGT (VAT):</span>
            <span className="font-mono font-bold text-slate-800">{new Intl.NumberFormat('vi-VN').format(vatAmount)} đ</span>
          </div>
        )}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-lg border border-slate-200">
          <span className="text-2xs font-bold text-blue-900 uppercase tracking-widest block">Tổng trị giá hợp đồng (Sau thuế)</span>
          <strong className="text-lg font-mono text-blue-950 font-black block tracking-wide select-none">
            {new Intl.NumberFormat('vi-VN').format(totalAmount)} đ
          </strong>
        </div>
      </div>
    </div>
  );
}

export function ContractCrossCheckSection({ watchAll, estimatedCompletionDate }: any) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        <h3 className="text-2xs font-bold text-slate-900 uppercase tracking-widest">
          Thông tin rà soát chéo
        </h3>
      </div>
      <div className="flex flex-col gap-3 text-xs font-semibold text-slate-700">
         <div>
           <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Đối tác mua sản phẩm</span>
           <p className="text-slate-950 text-sm font-bold text-balance">{watchAll.tenKhachHang || '---'}</p>
           <p className="mt-0.5">Mã Số CRM: <span className="font-mono text-slate-800 font-bold">{watchAll.maKh || '---'}</span></p>
         </div>
         <div className="pt-2 border-t border-slate-100">
           <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Căn cứ Báo Giá</span>
           <p>Số BG: <span className="font-mono text-slate-800 font-bold">{watchAll.soPhieuBaoGia || '---'}</span></p>
           <p className="mt-0.5">VAT: <span className="font-mono text-slate-800 font-bold">{watchAll.vatRate || 0}%</span></p>
         </div>
         <div className="pt-2 border-t border-slate-100">
           <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Thỏa thuận hoàn thành</span>
           <p>Giao máy: <span className="font-mono text-slate-800 font-bold">{estimatedCompletionDate ? formatDate(estimatedCompletionDate) : '---'}</span></p>
           <p className="mt-0.5">Số HĐ: <span className="font-mono text-slate-850 font-bold">{watchAll.soHopDong || '---'}</span></p>
         </div>
      </div>
    </div>
  );
}
