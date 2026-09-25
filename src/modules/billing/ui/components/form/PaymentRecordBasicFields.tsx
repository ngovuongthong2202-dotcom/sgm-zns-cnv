import React from 'react';
import { Controller } from 'react-hook-form';
import { FileText, Clock, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { AsyncSearchableSelect } from '@/src/design-system/primitives/AsyncSearchableSelect';
import { MoneyInput } from '../PaymentRecordDrawerHelpers';
import { canCreatePayment } from '@/src/domain/policy/gate.policy';
import { ContractHoverCard } from '@/src/modules/contracts/ui/components/ContractHoverCard';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';

interface PaymentRecordBasicFieldsProps {
  register: any;
  watch: any;
  setValue: any;
  control: any;
  otherPaid?: number;
  disabled?: boolean;
  contracts?: any[];
  quotations?: any[];
  nguoiPhuTrachList?: string[];
  phuongThucThanhToanList?: string[];
  tinhTrangThanhToanList?: string[];
}

export function PaymentRecordBasicFields({
  register,
  watch,
  setValue,
  control,
  otherPaid = 0,
  disabled,
  contracts = [],
  quotations = [],
  nguoiPhuTrachList = [],
  phuongThucThanhToanList = ['Chuyển khoản', 'Tiền mặt'],
  tinhTrangThanhToanList = ['Tất toán', 'Công nợ', 'Chưa TT', 'Miễn phí']
}: PaymentRecordBasicFieldsProps) {
  const sourceVal = watch('sourceValue') || '';
  const isContract = sourceVal.startsWith('CONTRACT:');
  const contractId = isContract ? sourceVal.replace('CONTRACT:', '') : '';
  const quotationId = !isContract && sourceVal.startsWith('QUOTATION:') ? sourceVal.replace('QUOTATION:', '') : '';

  const [selectedDoc, setSelectedDoc] = React.useState<any>(null);

  const activeDoc = selectedDoc || 
    (isContract ? contracts.find(c => c.id === contractId) : quotations.find(q => q.id === quotationId));

  const watchAll = watch();
  const totalAmountVal = Number(watch('totalAmount')) || 0;
  const soTienVal = Number(watch('soTien')) || 0;
  const statusVal = watch('tinhTrangThanhToan') || '';
  const isFree = statusVal === 'Miễn phí';

  // Fix: Local state for smooth typing of percentage
  const [localRate, setLocalRate] = React.useState<string>('');

  React.useEffect(() => {
    if (totalAmountVal > 0 && !isNaN(totalAmountVal) && !isNaN(soTienVal)) {
      const rawRate = (soTienVal / totalAmountVal) * 100;
      const clampedRate = Math.min(100, Math.max(0, rawRate));
      const computedRate = clampedRate.toFixed(2);
      if (Math.abs(Number(computedRate) - Number(localRate)) > 0.01) {
        setLocalRate(Number(computedRate) === 0 ? '' : Number(computedRate).toString());
      }
    } else {
      setLocalRate('');
    }
  }, [soTienVal, totalAmountVal, localRate]);

  // Force soTien to 0 when "Miễn phí" is selected
  React.useEffect(() => {
    if (isFree && soTienVal !== 0) {
      setValue('soTien', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [isFree, soTienVal, setValue]);

  const handleQuickDate = (days: number) => {
    const next = new Date();
    next.setDate(next.getDate() + days);
    setValue('ngayDenHan', format(next, 'yyyy-MM-dd'), { shouldValidate: true });
  };

  const handleQuickPaymentDate = (daysOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    setValue('ngayThanhToan', format(targetDate, 'yyyy-MM-dd'), { shouldValidate: true, shouldDirty: true });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Col */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Section 1: Tham chiếu Gốc */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText size={14} /> 1. THAM CHIẾU GỐC
            </h3>
            <div className="space-y-4">
              <div className="z-20 relative">
                <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1 flex justify-between items-center">
                  <span>Căn cứ Hợp đồng/Báo giá</span>
                  {activeDoc && isContract && (
                    <ContractHoverCard contract={activeDoc}>
                      <span className="text-teal-600 hover:text-teal-700 font-bold text-2xs cursor-pointer bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                        Xem chi tiết HĐ 🛈
                      </span>
                    </ContractHoverCard>
                  )}
                  {activeDoc && !isContract && (
                    <QuotationHoverCard quotation={activeDoc}>
                      <span className="text-teal-600 hover:text-teal-700 font-bold text-2xs cursor-pointer bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                        Xem chi tiết BG 🛈
                      </span>
                    </QuotationHoverCard>
                  )}
                </label>
                <AsyncSearchableSelect
                  collection="contracts,quotations"
                  value={watch('sourceValue') || ''}
                  disabled={disabled}
                  onChange={(val, doc: any) => {
                      setValue('sourceValue', val, { shouldValidate: true });
                      if (doc) {
                        setSelectedDoc(doc);
                        const isContract = doc._collectionType === 'contracts';
                        const prefix = isContract ? 'CONTRACT:' : 'QUOTATION:';
                        setValue('sourceValue', `${prefix}${doc.id}`, { shouldValidate: true });
                        
                        setValue('customerId', doc.customerId || '');
                        setValue('maKh', doc.maKh || '');
                        setValue('tenKhachHang', doc.tenKhachHang || '');
                        setValue('sdt', doc.sdt || '');
                        setValue('soHopDong', isContract ? (doc.soHopDong || '') : '');
                        setValue('soDonHang', isContract ? (doc.soDonHang || '') : '');
                        
                        if (isContract) {
                          setValue('contractId', doc.id);
                          setValue('quotationId', '');
                        } else {
                          setValue('quotationId', doc.id);
                          setValue('contractId', '');
                        }

                        setValue('subTotal', doc.subTotal || 0);
                        setValue('vatRate', doc.vatRate || 0);
                        setValue('vatAmount', doc.vatAmount || 0);
                        setValue('discountRate', doc.discountRate || 0);
                        setValue('discountAmount', doc.discountAmount || 0);
                        setValue('totalAmount', doc.totalAmount || 0);
                        setValue('soTien', doc.totalAmount || doc.subTotal || 0);
                        setValue('products', doc.products || []);
                      }
                  }}
                  renderOption={(doc: any) => {
                      const isContract = doc._collectionType === 'contracts';
                      return {
                        label: `${isContract ? 'HĐ' : 'BG'} — ${isContract ? doc.soHopDong : doc.soPhieuBaoGia}`,
                        subLabel: doc.tenKhachHang
                      };
                  }}
                  isOptionDisabled={(doc) => {
                    const gateResult = canCreatePayment(doc as any);
                    if (!gateResult.allowed) return { disabled: true, reason: gateResult.reason };
                    return { disabled: false };
                  }}
                  renderItemWrapper={(doc: any, children) => {
                    const isContract = doc._collectionType === 'contracts';
                    if (isContract) {
                      return (
                        <ContractHoverCard contract={doc}>
                          {children}
                        </ContractHoverCard>
                      );
                    } else {
                      return (
                        <QuotationHoverCard quotation={doc}>
                          {children}
                        </QuotationHoverCard>
                      );
                    }
                  }}
                  placeholder="Chọn chứng từ..."
                />
              </div>
              <p className="text-2xs text-slate-500 font-medium">Hệ thống hỗ trợ tự động điền thông tin sau khi nhận diện chứng từ hợp lệ.</p>

              {watch('sourceValue') && (
                <div className="space-y-3">
                  <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
                    <span className="text-2xs font-black uppercase text-blue-800 tracking-wider">Căn cứ tham chiếu</span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Thông tin được đồng bộ thông minh từ {isContract ? 'Hợp đồng' : 'Báo giá'}: #{isContract ? (watchAll.soHopDong || 'Chưa xác định') : (watchAll.soDonHang || 'Chưa xác định')}
                    </h4>
                    <p className="text-2xs text-slate-500 leading-normal font-semibold">
                      Khách hàng nhận hóa đơn, giá trị tài chính và lịch trình thanh toán được liên thông trực tiếp hệ thống. Bạn có thể ghi nhận số tiền thực tế nhận được theo từng mốc thanh toán cụ thể.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border border-slate-150 text-xs font-semibold text-slate-700 bg-slate-50/50 p-4 rounded-xl shadow-xs">
                    <div>
                      <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Khách hàng nhận HĐ</span>
                      <strong className="text-slate-950 text-sm font-bold block">{watchAll.tenKhachHang || '---'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Liên hệ & giao nhận</span>
                      <strong className="text-slate-950 font-mono text-xs font-bold block">{watchAll.sdt || '---'}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <span className="text-2xs uppercase tracking-wider font-bold text-slate-500">Đối soát công nợ & tiến độ dòng tiền</span>
                    <div className="flex flex-col gap-1 items-stretch">
                      <div className="flex justify-between text-xs font-bold font-mono">
                         <span className="text-slate-600">Tổng Trị Giá (A)</span>
                         <span className="text-slate-900">{new Intl.NumberFormat('vi-VN').format(totalAmountVal)} đ</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold font-mono">
                         <span className="text-blue-600">Đã thu trước đó (B)</span>
                         <span className="text-blue-700">{new Intl.NumberFormat('vi-VN').format(otherPaid)} đ</span>
                      </div>
                      <div className="border-t border-slate-200 my-1"></div>
                      <div className="flex justify-between text-xs font-bold font-mono">
                         <span className="text-amber-600">Còn lại phải thu (A - B)</span>
                         <span className="text-amber-700">{new Intl.NumberFormat('vi-VN').format(Math.max(0, totalAmountVal - otherPaid))} đ</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">Số Hợp Đồng</label>
                        <input aria-label="Nhập thông tin" disabled={disabled} {...register('soHopDong')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" placeholder="HD..."/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">Số Đơn Hàng</label>
                        <input aria-label="Nhập thông tin" disabled={disabled} {...register('soDonHang')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" placeholder="DH..."/>
                    </div>
                  </div>
              </div>
            </div>
        </div>

        {/* Section 2: Quản lý tình trạng */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Clock size={14} /> 2. QUẢN LÝ TÌNH TRẠNG & KỲ HẠN
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">Trạng thái Giao dịch</label>
                  <select aria-label="Tình trạng thanh toán" disabled={disabled} {...register('tinhTrangThanhToan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full bg-white font-semibold cursor-pointer disabled:bg-slate-50/50 disabled:opacity-75">
                    {tinhTrangThanhToanList.map((t: string) => <option key={t} value={t}>{t}</option>)}
                    {watch('tinhTrangThanhToan') && !tinhTrangThanhToanList.includes(watch('tinhTrangThanhToan')) && (
                      <option value={watch('tinhTrangThanhToan')}>{watch('tinhTrangThanhToan')}</option>
                    )}
                  </select>
              </div>
              <div className="space-y-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">P.Thức thanh toán</label>
                  <select aria-label="Phương thức thanh toán" disabled={disabled} {...register('phuongThucThanhToan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full bg-white cursor-pointer disabled:bg-slate-50/50 disabled:opacity-75">
                    {phuongThucThanhToanList.map((m: string) => <option key={m} value={m}>{m}</option>)}
                    {watch('phuongThucThanhToan') && !phuongThucThanhToanList.includes(watch('phuongThucThanhToan')) && (
                      <option value={watch('phuongThucThanhToan')}>{watch('phuongThucThanhToan')}</option>
                    )}
                  </select>
              </div>
              <div className="space-y-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">Người phụ trách</label>
                  <select aria-label="Người phụ trách" disabled={disabled} {...register('nguoiPhuTrach')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full bg-white cursor-pointer disabled:bg-slate-50/50 disabled:opacity-75">
                    <option value="">-- Chưa chỉ định (Hệ thống) --</option>
                    {(nguoiPhuTrachList || []).map((n: string) => <option key={n} value={n}>{n}</option>)}
                    {watch('nguoiPhuTrach') && !nguoiPhuTrachList.includes(watch('nguoiPhuTrach')) && (
                      <option value={watch('nguoiPhuTrach')}>{watch('nguoiPhuTrach')}</option>
                    )}
                  </select>
              </div>

              {/* Date Inputs */}
              <div className="col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-2">Ngày Thu Thực Tế</label>
                  <div className="space-y-2">
                      <input aria-label="Ngày thanh toán" disabled={disabled} type="date" {...register('ngayThanhToan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" />
                      <div className="flex gap-1.5 mt-2">
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickPaymentDate(0)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">Hôm nay</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickPaymentDate(-1)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">Hôm qua</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickPaymentDate(-7)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">7N trước</button>
                      </div>
                  </div>
                  </div>
                  <div className="flex-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-2">Hạn Chót Phải Thu</label>
                  <div className="space-y-2">
                      <input aria-label="Ngày đến hạn" disabled={disabled} type="date" {...register('ngayDenHan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" />
                      <div className="flex gap-1.5 mt-2">
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickDate(3)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">+3D</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickDate(7)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">+7D</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickDate(30)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">+1M</button>
                      </div>
                  </div>
                  </div>
              </div>
            </div>
        </div>

        {/* Section 3: Ghi chú */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText size={14} /> 3. GHI CHÚ
            </h3>
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">Ghi Chú & Mã UNC</label>
            <textarea aria-label="Ghi chú" {...register('ghiChu')} className="premium-input w-full min-h-[80px] rounded-lg border border-slate-200 p-3 text-sm focus:border-slate-950 outline-none bg-white" placeholder="Paste link chứng từ, mã giao dịch NH..." />
        </div>
      </div>

      {/* Right Col */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">

        {/* Section 4: SỐ TIỀN */}
        <div className="p-6 bg-emerald-50 border border-emerald-100 focus-within:border-emerald-400 rounded-2xl shadow-sm transition-colors pt-6">
          <div className="flex flex-col gap-4 mb-4">
            <label className="text-xs font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-2"><DollarSign size={16} className="text-emerald-700" /> SỐ TIỀN GIAO DỊCH <span className="text-red-700">*</span></label>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between font-semibold text-xs border-b border-slate-100 pb-2">
                  <span className="text-slate-500 uppercase tracking-wider">Tổng trị giá tham chiếu:</span>
                  <span className="font-mono text-slate-900">{new Intl.NumberFormat('vi-VN').format(totalAmountVal)} đ</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-2xs text-slate-500 font-bold uppercase tracking-wide">Tỷ lệ thanh toán (%):</span>
                <div className="relative">
                    <input 
                      aria-label="Tỷ lệ %" 
                      type="number" 
                      min="0" max="100" 
                      step="any"
                      placeholder="0" 
                      value={localRate}
                      disabled={isFree || disabled}
                      className="w-20 premium-input h-8 pl-3 pr-6 text-right font-bold text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-lg outline-none disabled:opacity-50"
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setLocalRate(valStr);
                        let val = Number(valStr);
                        if (val > 100) val = 100;
                        if (val < 0) val = 0;
                        const total = totalAmountVal || 0;
                        if (!isNaN(val) && total > 0 && valStr !== '') {
                            let computedNum = Math.round((total * val) / 100);
                            const maxAllowed = Math.max(0, totalAmountVal - otherPaid);
                            if (computedNum > maxAllowed) {
                              computedNum = maxAllowed;
                            }
                            setValue('soTien', computedNum, { shouldValidate: true, shouldDirty: true });
                        } else if (valStr === '') {
                            setValue('soTien', 0, { shouldValidate: true, shouldDirty: true });
                        }
                      }}
                    />
                    <span className="absolute right-2.5 top-1 text-slate-600 font-bold text-2xs leading-6">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-emerald-200">
            <Controller
              name="soTien" control={control}
              render={() => (
                <div className="px-4 py-2 bg-emerald-100/30 border-b border-emerald-100">
                  <span className="text-2xs uppercase font-bold text-emerald-800 tracking-widest">Thực thu / Thực chi</span>
                </div>
              )}
            />
            <Controller
              name="soTien" control={control}
              render={({ field }) => (
                <MoneyInput 
                  value={field.value} 
                  onChange={(val: any) => {
                    let num = val;
                    const maxAllowed = Math.max(0, totalAmountVal - otherPaid);
                    if (num !== undefined && totalAmountVal > 0 && num > maxAllowed) {
                      num = maxAllowed;
                    }
                    field.onChange(num);
                  }} 
                  readOnly={isFree || disabled} 
                  placeholder="0" 
                />
              )}
            />
          </div>
        </div>

          {/* Section 5: Thông tin rà soát chéo */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <h3 className="text-2xs font-bold text-slate-900 uppercase tracking-widest">
                Thông tin rà soát chéo
              </h3>
            </div>
            <div className="flex flex-col gap-3 text-xs font-semibold text-slate-700">
              <div>
                <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Đối tác thanh toán</span>
                <p className="text-slate-950 text-sm font-bold text-balance">{watchAll.tenKhachHang || '---'}</p>
                <p className="mt-0.5">Mã KH: <span className="font-mono text-slate-800 font-bold">{watchAll.maKh || '---'}</span></p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Căn cứ Hợp Đồng</span>
                <p>Số HĐ: <span className="font-mono text-slate-800 font-bold">{watchAll.soHopDong || '---'}</span></p>
                <p className="mt-0.5">Hạn TT: <span className="font-mono text-slate-800 font-bold">{watchAll.ngayDenHan ? format(new Date(watchAll.ngayDenHan), 'dd/MM/yyyy') : '---'}</span></p>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}
