import React from 'react';
import { Clock, User, DollarSign, Tag } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { AsyncSearchableSelect } from '@/src/design-system/primitives/AsyncSearchableSelect';
import { CustomerHoverCard } from '@/src/modules/customers';
import { formatVietnameseCurrency } from '@/src/domain/pricing/quotation-pricing';
import { formatDate } from '@/src/shared/utils/formatDate';
import { normalizeCode, normalizePersonName } from '@/src/shared/utils/textFormatter';

// -- Các Component Con --

export function QuotationBasicInfoSection({
  register, watch, setValue, getValues, errors, isLookingUp, isCreating, businessLock, lookupErp, loaiBaoGiaList, customers, ngayHetHan, nguoiPhuTrachList
}: any) {
  const watchAll = watch();
  
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
         <User size={14} className="text-slate-700" />
         <h3 className="text-sm font-semibold text-slate-900">
            1. Đối tác Khách hàng & Điều khoản hiệu lực
         </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 mb-1 flex items-center justify-between">
            <span>Số phiếu báo giá <span className="text-red-500">*</span></span>
            {isLookingUp && <span className="text-blue-500 text-2xs animate-pulse">Đang tra cứu ERP...</span>}
          </label>
          <div className="relative">
            <input 
              id="soPhieuBaoGia"
              {...register('soPhieuBaoGia', {
                onChange: (e: any) => {
                  e.target.value = e.target.value.toUpperCase();
                }
              })} 
              disabled={businessLock?.locked}
              onBlur={(e) => {
                const val = normalizeCode(e.target.value);
                setValue('soPhieuBaoGia', val, { shouldValidate: true, shouldDirty: true });
              }}
              onKeyDown={(e) => {
                 if (e.key === 'Enter') {
                   e.preventDefault();
                   const val = normalizeCode(e.currentTarget.value);
                   setValue('soPhieuBaoGia', val, { shouldValidate: true, shouldDirty: true });
                   if (val && !businessLock?.locked) lookupErp(val);
                 }
              }}
              className="h-8 pl-3 pr-20 text-sm border border-slate-200 rounded-lg focus:border-blue-600 focus:ring-1 focus:ring-blue-600 w-full font-mono outline-none disabled:bg-slate-100 disabled:opacity-75" 
              placeholder="E.g., 11-BG2609-025" 
            />
            <Button
               type="button"
               disabled={isLookingUp || businessLock?.locked}
               onMouseDown={(e) => e.preventDefault()}
               onClick={() => {
                  const inputEl = document.getElementById('soPhieuBaoGia') as HTMLInputElement | null;
                  let val = (inputEl?.value || getValues('soPhieuBaoGia') || '').trim();
                  if (val) {
                     val = normalizeCode(val);
                     setValue('soPhieuBaoGia', val, { shouldValidate: true, shouldDirty: true });
                     lookupErp(val);
                  }
               }}
               className="absolute right-1 top-1 bottom-1 px-2.5 flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-2xs font-bold border border-blue-200 transition-colors disabled:opacity-50"
            >
               {isLookingUp ? 'ĐANG TÌM...' : 'TÌM ERP'}
            </Button>
          </div>
          {errors.soPhieuBaoGia && <p className="text-red-650 text-2xs mt-1 font-semibold">{errors.soPhieuBaoGia.message}</p>}
        </div>

        <div>
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 mb-1 block">
            Phân loại / Product Line
          </label>
          <select 
            id="loai"
            {...register('loai')} 
            disabled={businessLock?.locked}
            className="h-8 px-3 text-sm border border-slate-200 rounded-lg focus:border-blue-600 focus:ring-1 focus:ring-blue-600 w-full outline-none bg-white disabled:bg-slate-100 disabled:opacity-75" 
          >
            <option value="">Chọn phân loại...</option>
            {loaiBaoGiaList?.map((l: string) => (
              <option key={l} value={l}>{l}</option>
            ))}
            {watch('loai') && !loaiBaoGiaList?.includes(watch('loai')) && (
              <option value={watch('loai')}>{watch('loai')}</option>
            )}
          </select>
        </div>

        {/* ASYNC CUSTOMER CHOOSER */}
        <div className="md:col-span-2 bg-slate-50/70 p-4 border border-slate-200 rounded-lg space-y-3">
          <div>
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 mb-1 block flex justify-between items-center">
              <span>Khách hàng Pháp nhân Nhận Báo giá <span className="text-red-500">*</span></span>
              {(() => {
                const selectedCustomerId = watch('customerId');
                const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);
                if (!selectedCustomer) return null;
                return (
                  <CustomerHoverCard customer={selectedCustomer}>
                    <span className="text-blue-600 hover:text-blue-700 font-bold text-2xs cursor-pointer bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                      Xem thông tin KH 🛈
                    </span>
                  </CustomerHoverCard>
                );
              })()}
            </label>
            <AsyncSearchableSelect
               collection="customers"
               value={watch('customerId') || ''}
               disabled={businessLock?.locked}
               onChange={(val, doc?: Record<string, unknown>) => {
                  setValue('customerId', val, { shouldValidate: true, shouldDirty: true });
                  if (doc) {
                    setValue('maKh', (doc.maKh as string) || '', { shouldDirty: true });
                    setValue('tenKhachHang', (doc.tenKhachHang as string) || '', { shouldDirty: true });
                    setValue('sdt', (doc.sdt as string) || '', { shouldDirty: true });
                    setValue('nguoiDaiDien', (doc.nguoiDaiDien as string) || '', { shouldDirty: true });
                    setValue('phanLoaiKhach', (doc.loaiKh as string) || '', { shouldDirty: true });
                  }
               }}
               renderOption={(c: any) => ({
                  label: `${c.maKh} — ${c.tenKhachHang}`,
                  subLabel: c.sdt ? `ĐT: ${c.sdt} | MST: ${c.maSoThue || 'N/A'}` : `MST: ${c.maSoThue || 'N/A'}`
               })}
               renderItemWrapper={(c: any, children) => (
                 <CustomerHoverCard customer={c}>
                   {children}
                 </CustomerHoverCard>
               )}
               placeholder="Nhập mã KH, tên hoặc SĐT..."
               error={errors.customerId?.message as string | undefined}
            />
          </div>

          {watch('customerId') && (
            <div className="space-y-3">
              <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
                <span className="text-2xs font-black uppercase text-blue-800 tracking-wider">Căn cứ khách hàng</span>
                <h4 className="text-xs font-bold text-slate-900">
                  Thông tin được đồng bộ thông minh từ Khách hàng: #{(() => {
                    const selectedCustomerId = watch('customerId');
                    const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);
                    return selectedCustomer?.maKh || 'Chưa xác định';
                  })()}
                </h4>
                <p className="text-2xs text-slate-500 leading-normal font-semibold">
                  Pháp nhân khách hàng, thông tin liên hệ và phân loại khách hàng được đồng bộ tự động để tính toán chiết khấu, thời hạn thanh toán và cấu trúc báo giá tối ưu.
                </p>
              </div>

              {(() => {
                const selectedCustomerId = watch('customerId');
                const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);
                const contacts = (selectedCustomer && Array.isArray(selectedCustomer.contacts)) ? selectedCustomer.contacts : [];
                if (contacts.length <= 1) return null;

                const currentPhone = watch('sdt');
                const currentName = watch('nguoiDaiDien');
                const activeIdx = contacts.findIndex((ct: any) => ct.sdt === currentPhone || ct.nguoiDaiDien === currentName);

                return (
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                        <span>👤 Chọn đầu mối nhận Báo giá</span>
                        <span className="text-3xs bg-amber-200/70 text-amber-950 font-bold px-1.5 py-0.5 rounded-full">
                          {contacts.length} đầu mối liên hệ
                        </span>
                      </span>
                      <span className="text-3xs text-amber-800 italic">Chọn đầu mối để tự gán SĐT & Người nhận BG</span>
                    </div>
                    <select
                      className="w-full h-8 text-xs font-medium border border-amber-300 rounded-lg px-2.5 bg-white text-slate-900 focus:border-amber-600 outline-none"
                      value={activeIdx >= 0 ? String(activeIdx) : '0'}
                      onChange={(e) => {
                        const idx = Number(e.target.value);
                        const ct = contacts[idx];
                        if (ct) {
                          if (ct.nguoiDaiDien) setValue('nguoiDaiDien', ct.nguoiDaiDien, { shouldDirty: true, shouldValidate: true });
                          if (ct.sdt) setValue('sdt', ct.sdt, { shouldDirty: true, shouldValidate: true });
                        }
                      }}
                    >
                      {contacts.map((ct: any, idx: number) => (
                        <option key={idx} value={idx}>
                          {idx === 0 ? '★ [Đầu mối chính] ' : ''}{ct.nguoiDaiDien || 'Chưa đặt tên'} {ct.chucVu ? `(${ct.chucVu})` : ''} — SĐT: {ct.sdt || 'Chưa có SĐT'}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-2 gap-4 border border-slate-150 text-xs font-semibold text-slate-700 bg-slate-50/50 p-4 rounded-xl shadow-xs">
                <div>
                  <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Khách hàng Pháp nhân Nhận BG</span>
                  <strong className="text-slate-950 text-sm font-bold block">{watch('tenKhachHang') || '---'}</strong>
                </div>
                <div>
                  <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Người nhận & SĐT</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <strong className="text-slate-950 text-xs font-bold">{watch('nguoiDaiDien') || '---'}</strong>
                    {watch('sdt') && (
                      <span className="font-mono text-2xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 font-bold">
                        {watch('sdt')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">Người đại diện liên hệ</label>
              <input 
                {...register('nguoiDaiDien')} 
                onBlur={(e) => {
                  const val = normalizePersonName(e.target.value);
                  setValue('nguoiDaiDien', val, { shouldValidate: true, shouldDirty: true });
                }}
                className="h-8 px-3 text-sm bg-white border border-slate-200 rounded-lg w-full outline-none focus:border-blue-600" 
                placeholder="Họ tên người liên hệ..." 
              />
            </div>
            <div>
              <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">Số điện thoại liên hệ</label>
              <input 
                {...register('sdt')} 
                className="h-8 px-3 text-sm bg-white border border-slate-200 rounded-lg font-mono w-full outline-none focus:border-blue-600" 
                placeholder="Số điện thoại di động..." 
              />
            </div>
          </div>
        </div>

        {/* EFFECTIVE RANGE VALIDATOR */}
        <div className="grid grid-cols-2 gap-4 md:col-span-2 border border-slate-200 rounded-lg p-4 bg-white/70">
          <div className="col-span-2 flex items-center gap-1.5 border-b border-slate-100 pb-1.5 mb-0.5">
            <Clock size={14} className="text-slate-600" />
            <span className="text-2xs font-medium uppercase tracking-wide text-slate-500">Hạn hiệu lực báo giá</span>
          </div>
          <div>
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 mb-1 block">Ngày lập phiếu</label>
            <input type="date" {...register('ngayBaoGia')} className="h-8 px-3 text-sm border border-slate-200 rounded-lg w-full outline-none" />
          </div>
          <div>
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 mb-1 block">Hiệu lực (Ngày)</label>
            <div className="relative">
              <input type="number" {...register('hieuLuc', { valueAsNumber: true })} className="h-8 pl-3 pr-10 text-sm border border-slate-200 rounded-lg w-full outline-none font-mono" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 uppercase">Ngày</span>
            </div>
          </div>
          <div className="col-span-2 flex justify-between items-center bg-orange-50 p-2 rounded-lg border border-orange-100 mt-1">
            <span className="text-2xs font-medium uppercase tracking-wide text-slate-500">Ngày hết hạn dự kiến</span>
            <span className="font-mono text-sm text-orange-700">{ngayHetHan ? formatDate(ngayHetHan) : 'Chưa xác định'}</span>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 mb-1 block">
            Người phụ trách
          </label>
          <input 
            id="nguoiPhuTrach"
            type="text"
            disabled
            readOnly
            value={watch('nguoiPhuTrach') || ''}
            {...register('nguoiPhuTrach')} 
            className="h-8 px-3 text-sm font-semibold border border-slate-200 rounded-lg w-full outline-none bg-slate-100 text-slate-700 cursor-not-allowed select-none" 
            placeholder="Người phụ trách theo tài khoản"
          />
        </div>
      </div>
    </div>
  );
}

export function QuotationRightSidebar({
  watchAll, ngayHetHan, aggs, register
}: any) {
  return (
    <div className="w-full lg:w-[360px] flex-shrink-0 bg-slate-50/50 border-l border-slate-200 p-5 overflow-y-auto space-y-4">
      {/* THÔNG TIN RÀ SOÁT CHÉO */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          <h3 className="text-2xs font-bold text-slate-900 uppercase tracking-widest">
            Thông tin rà soát chéo
          </h3>
        </div>
        <div className="flex flex-col gap-3 text-xs font-semibold text-slate-705">
           <div>
             <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Đối tác mua sản phẩm</span>
             <p className="text-slate-950 text-sm font-bold text-balance">{watchAll.tenKhachHang || '---'}</p>
             <p className="mt-0.5">Mã KH: <span className="font-mono text-slate-800 font-bold">{watchAll.maKh || '---'}</span></p>
           </div>
           <div className="pt-2 border-t border-slate-100">
             <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Theo dõi thời hạn</span>
             <p>Số ngày HL: <span className="font-mono text-slate-800 font-bold">{watchAll.hieuLuc || 0}</span> ngày</p>
             <p className="mt-0.5">Hết hạn vào: <span className="font-mono text-slate-850 font-bold">{ngayHetHan ? formatDate(ngayHetHan) : '---'}</span></p>
           </div>
        </div>
      </div>

      {/* TỔNG CỘNG TÀI CHÍNH */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <DollarSign size={14} className="text-slate-800" />
          <span className="text-sm font-semibold text-slate-900">Tài chính tổng hợp</span>
        </div>

        <div className="space-y-3">
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2.5 shadow-sm font-semibold select-none">
            <div className="flex justify-between items-center text-2xs text-slate-500 uppercase tracking-widest pb-1 border-b border-white/10">
              <span>Hạng mục</span>
              <span>Giải ngân (VND)</span>
            </div>
            
            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Trước thuế:</span>
              <span className="font-mono tabular-nums">{formatVietnameseCurrency(aggs.totalGross)}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-400 text-sm">
              <span>Chiết khấu:</span>
              <span className="font-mono tabular-nums">-{formatVietnameseCurrency(aggs.totalDiscount)}</span>
            </div>

            <div className="flex justify-between items-center text-sm text-slate-300">
              <span>Thuế VAT:</span>
              <span className="font-mono tabular-nums">+{formatVietnameseCurrency(aggs.totalVat)}</span>
            </div>

            <div className="pt-2 border-t border-white/10 mt-1 flex justify-between items-center">
              <span className="text-2xs text-slate-500 uppercase tracking-widest">TỔNG TOÀN BỘ:</span>
              <span className="font-mono text-base text-sky-400 tabular-nums">{formatVietnameseCurrency(aggs.totalAfterTax)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CHI TIẾT GHI CHÚ ĐIỀU KHOẢN */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5 border-b border-slate-100 pb-2">
          <Tag size={12} className="text-slate-850" />
          <span className="text-sm font-semibold text-slate-900">Điều khoản & Phụ lục</span>
        </div>
        <textarea 
          {...register('noiDungGhiChu')} 
          className="w-full h-24 p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg outline-none placeholder:text-slate-500 focus:bg-white focus:border-blue-600" 
          placeholder="Nội dung điều kiện giao hàng, tiến độ thanh toán, chế độ bảo hành v.v." 
        />
      </div>
    </div>
  );
}
