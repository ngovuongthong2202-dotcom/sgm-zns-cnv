import React from 'react';
import { Search, FileText, CreditCard, Calendar } from 'lucide-react';
import { QuotationSmartSearch } from '@/src/widgets/QuotationSmartSearch';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { formatDate } from '@/src/shared/utils/formatDate';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { useAuth } from '@/src/modules/iam';
import { isAdministratorRole } from '@/src/shared/utils/userProfile';
import { useSmartFormInput } from '@/src/platform/ui/forms/useSmartFormInput';

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
          excludeQuoIds={[]}
          filterOption={(q) => true}
          isOptionDisabled={(q) => {
            const loai = (q.loai || '').toString().trim().toUpperCase();
            if (loai !== 'BG MÁY') return { disabled: true, reason: 'Không phải báo giá bán máy' };

            // Quota Gate: Không cho phép tạo tiếp HĐ khi Báo giá đã được ký đủ 100% số lượng
            const otherContracts = (contracts || []).filter((c: any) => c.quotationId === q.id && (!contract || c.id !== contract.id));
            const totalQuoQty = q.slMay || (q.products?.reduce((acc: number, p: any) => acc + (Number(p.quantity) || 0), 0) || 0);
            const contractedQty = otherContracts.reduce((acc: number, c: any) => acc + (Number(c.slMay) || (c.products?.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0) || 0)), 0);

            if (totalQuoQty > 0 && contractedQty >= totalQuoQty) {
              return { 
                disabled: true, 
                reason: `Đã lập HĐ đủ số lượng (${contractedQty}/${totalQuoQty} ${q.dvt || 'Máy'})` 
              };
            }

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

export function ContractDefinitionSection({ register, setValue, errors, estimatedCompletionDate, nguoiPhuTrachList, businessLock, watch }: any) {
  const { user, userData } = useAuth();
  const isAdmin = isAdministratorRole(userData, user);
  const { handleBlurUppercase, handleBlurTrim } = useSmartFormInput();
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
          <input 
            aria-label="Số Hợp Đồng" 
            disabled={businessLock.locked} 
            {...register('soHopDong')} 
            onBlur={(e) => handleBlurUppercase(e, (val) => setValue?.('soHopDong', val, { shouldDirty: true }))}
            className="premium-input w-full font-mono font-bold text-slate-900 h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white disabled:bg-slate-100 disabled:opacity-75" 
            placeholder="HD-XXXX/SGM" 
          />
          {errors.soHopDong && <p className="text-red-600 text-xs font-medium mt-1">{errors.soHopDong.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Số Đơn Hàng PO/ĐH <span className="text-red-650">*</span></label>
          <input 
            aria-label="Số Đơn Hàng PO" 
            {...register('soDonHang')} 
            onBlur={(e) => handleBlurUppercase(e, (val) => setValue?.('soDonHang', val, { shouldDirty: true }))}
            className="premium-input w-full font-semibold h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" 
            placeholder="PO-XXXX" 
          />
          {errors.soDonHang && <p className="text-red-600 text-xs font-medium mt-1">{errors.soDonHang.message as string}</p>}
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-2xs font-bold uppercase tracking-wide text-slate-700">Ngày Ký Kết HĐ <span className="text-red-650">*</span></label>
            <button
              type="button"
              onClick={() => setValue?.('ngayKy', new Date().toISOString().split('T')[0], { shouldDirty: true, shouldValidate: true })}
              className="text-3xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded border border-blue-200 transition-colors cursor-pointer"
            >
              Hôm nay
            </button>
          </div>
          <input aria-label="Ngày Ký Kết" type="date" {...register('ngayKy')} className="premium-input w-full font-bold h-8 rounded-lg font-mono border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white text-slate-900" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-2xs font-bold uppercase tracking-wide text-slate-700">Số ngày thực hiện</label>
            <div className="flex gap-1">
              {[15, 30, 45, 60].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setValue?.('soNgayDuKienHoanThanh', days, { shouldDirty: true, shouldValidate: true })}
                  className="text-3xs font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer"
                >
                  {days}N
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <input aria-label="Số ngày thực hiện" type="number" {...register('soNgayDuKienHoanThanh', { valueAsNumber: true })} className="premium-input w-full font-black h-8 rounded-lg pr-12 font-mono border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white text-slate-900" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs text-slate-600 font-extrabold font-mono">DAYS</span>
          </div>
          {estimatedCompletionDate && (
            <span className="text-2xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1.5 mt-1 font-mono">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> DK Hoàn thành: {formatDate(estimatedCompletionDate)} (trừ CN & Lễ Tết VN)
            </span>
          )}
          {errors.soNgayDuKienHoanThanh && <p className="text-red-600 text-xs font-medium mt-1">{errors.soNgayDuKienHoanThanh.message as string}</p>}
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Số ngày gia hạn (Phụ lục HĐ)</label>
          <div className="relative">
            <input aria-label="Số ngày gia hạn" type="number" min="0" {...register('soNgayGiaHan', { valueAsNumber: true })} className="premium-input w-full font-bold h-8 rounded-lg pr-12 font-mono border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" placeholder="0" />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-2xs text-blue-600 font-extrabold font-mono">DAYS</span>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Lý do gia hạn tiến độ</label>
          <input 
            aria-label="Lý do gia hạn" 
            {...register('lyDoGiaHan')} 
            onBlur={(e) => handleBlurTrim(e, (val) => setValue?.('lyDoGiaHan', val, { shouldDirty: true }))}
            className="premium-input w-full h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" 
            placeholder="Khách sửa khuôn máy, trễ móng xưởng..." 
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">Người Đại Diện Ký Hợp Đồng</label>
          <input 
            aria-label="Người Đại Diện Ký" 
            {...register('nguoiDaiDien')} 
            onBlur={(e) => handleBlurTrim(e, (val) => setValue?.('nguoiDaiDien', val, { shouldDirty: true }))}
            className="premium-input w-full h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none bg-white" 
            placeholder="Họ tên đại diện ký..." 
          />
        </div>

        <div className="space-y-1">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500">
            Người phụ trách {isAdmin && <span className="text-blue-600 font-bold ml-1">(Admin có quyền đổi)</span>}
          </label>
          {isAdmin ? (
            <select
              id="nguoiPhuTrach"
              {...register('nguoiPhuTrach')}
              value={watch ? (watch('nguoiPhuTrach') || '') : ''}
              className="premium-input w-full bg-white text-slate-800 font-semibold h-8 py-0 leading-normal rounded-lg border border-slate-200 px-3 text-sm focus:border-blue-600 outline-none cursor-pointer"
            >
              <option value="">-- Chọn người phụ trách --</option>
              {(nguoiPhuTrachList || []).map((pic: string) => (
                <option key={pic} value={pic}>{pic}</option>
              ))}
              {watch && watch('nguoiPhuTrach') && !(nguoiPhuTrachList || []).includes(watch('nguoiPhuTrach')) && (
                <option value={watch('nguoiPhuTrach')}>{watch('nguoiPhuTrach')}</option>
              )}
            </select>
          ) : (
            <input 
              type="text"
              disabled
              readOnly
              value={watch ? (watch('nguoiPhuTrach') || '') : ''}
              {...register('nguoiPhuTrach')} 
              className="premium-input w-full bg-slate-100 text-slate-700 font-semibold h-8 py-0 leading-normal rounded-lg border border-slate-200 px-3 text-sm cursor-not-allowed select-none outline-none"
              placeholder="Người phụ trách theo tài khoản"
            />
          )}
        </div>

        {/* Executive Pre-Delivery Waiver Toggle */}
        <div className="md:col-span-2 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <input
                id="dacCachGiaoTruoc"
                type="checkbox"
                {...register('dacCachGiaoTruoc')}
                className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
              />
              <label htmlFor="dacCachGiaoTruoc" className="text-xs font-bold text-amber-950 cursor-pointer flex items-center gap-1.5 select-none">
                Cho phép giao hàng trước thanh toán sau (Đặc cách phê duyệt lãnh đạo)
              </label>
            </div>
            {watch && watch('dacCachGiaoTruoc') && (
              <span className="px-2 py-0.5 text-3xs font-extrabold uppercase tracking-wider bg-amber-200 text-amber-900 rounded-md">
                ĐÃ BẬT ĐẶC CÁCH
              </span>
            )}
          </div>
          <p className="text-2xs text-amber-800 leading-relaxed pl-6.5 font-medium">
            Khi bật tính năng này, hệ thống sẽ mở khóa cho phép tạo Phiếu Giao Hàng ngay cả khi hợp đồng chưa có thanh toán đặt cọc. Phiếu giao hàng sẽ tự động liên kết với hồ sơ thanh toán công nợ mở (0đ) đảm bảo tính toàn vẹn workflow.
          </p>
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
          <span className="text-slate-500 uppercase text-2xs tracking-wider">Cộng tiền hàng (Tạm tính):</span>
          <span className="font-mono font-extrabold text-slate-800">{new Intl.NumberFormat('vi-VN').format(subTotal)} đ</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-semibold text-emerald-800">
            <span className="text-emerald-700 uppercase text-2xs tracking-wider">Chiết khấu thương mại:</span>
            <span className="font-mono font-bold">-{new Intl.NumberFormat('vi-VN').format(discountAmount)} đ</span>
          </div>
        )}
        {vatAmount > 0 && (
          <div className="flex justify-between items-center py-1.5 border-b border-slate-50 font-semibold">
            <span className="text-slate-500 uppercase text-2xs tracking-wider">Tiền thuế VAT:</span>
            <span className="font-mono font-bold text-slate-800">{new Intl.NumberFormat('vi-VN').format(vatAmount)} đ</span>
          </div>
        )}
        <div className="space-y-1.5 pt-3 border-t border-slate-100 bg-blue-50/60 p-3.5 rounded-lg border border-blue-100">
          <span className="text-2xs font-bold text-blue-900 uppercase tracking-widest block">TỔNG THANH TOÁN (HỢP ĐỒNG)</span>
          <strong className="text-xl font-currency font-black text-slate-900 tabular-nums block tracking-wide select-none">
            {new Intl.NumberFormat('vi-VN').format(totalAmount)} đ
          </strong>
          <div className="text-3xs italic text-slate-700 font-semibold leading-tight pt-1 border-t border-blue-200/50">
            (Bằng chữ: {readVietnameseCurrency(totalAmount)})
          </div>
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
