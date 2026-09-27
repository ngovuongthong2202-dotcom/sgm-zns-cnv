import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'motion/react';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  FileCheck,
  TrendingUp,
  Percent,
  Plus
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { Payment, PaymentInstallment } from '@/src/domain/schema/payment.schema';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { sanitizeText } from '@/src/shared/utils/inputSanitizer';
import { cleanProperVietnameseText, readVietnameseCurrency } from '@/src/shared/utils/textFormatter';

interface RecordInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  defaultPayerName?: string;
  onSave: (installment: PaymentInstallment, newTotalPaid: number, newRemaining: number, newStatus: string) => Promise<void>;
}

export function RecordInstallmentModal({
  isOpen,
  onClose,
  payment,
  defaultPayerName = '',
  onSave
}: RecordInstallmentModalProps) {
  const existingInstallments = payment.cacDotThu || [];
  const totalAmount = payment.totalAmount || 0;
  const currentPaid = payment.soTien || 0;
  const remainingDebt = Math.max(0, totalAmount - currentPaid);
  const nextInstallmentNumber = existingInstallments.length > 0 
    ? Math.max(...existingInstallments.map(d => d.lanThu || 0)) + 1
    : (currentPaid > 0 ? 2 : 1);

  const initialAmount = remainingDebt > 0 ? remainingDebt : 0;
  const [displayAmount, setDisplayAmount] = useState<string>(
    initialAmount > 0 ? new Intl.NumberFormat('vi-VN').format(initialAmount) : ''
  );

  const FormSchema = z.object({
    soTien: z.number().positive('Số tiền thu phải lớn hơn 0').max(
      remainingDebt > 0 ? remainingDebt : totalAmount || Infinity, 
      `Số tiền không được vượt quá công nợ còn lại (${formatCurrency(remainingDebt)})`
    ),
    ngayThu: z.string().min(1, 'Vui lòng chọn ngày thu'),
    phuongThucThanhToan: z.string().min(1, 'Chọn phương thức thanh toán'),
    soChungTuThamChieu: z.string().optional(),
    nguoiNop: z.string().optional(),
    ghiChu: z.string().optional(),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      soTien: initialAmount,
      ngayThu: new Date().toISOString().split('T')[0],
      phuongThucThanhToan: 'Chuyển khoản',
      soChungTuThamChieu: '',
      nguoiNop: defaultPayerName || payment.tenNguoiNop || '',
      ghiChu: `Thu tiền đợt ${nextInstallmentNumber} - HĐ ${payment.soHopDong || payment.soDonHang || ''}`,
    }
  });

  useEffect(() => {
    if (isOpen) {
      const initVal = remainingDebt > 0 ? remainingDebt : 0;
      setValue('soTien', initVal, { shouldValidate: true });
      setDisplayAmount(initVal > 0 ? new Intl.NumberFormat('vi-VN').format(initVal) : '');
    }
  }, [isOpen, remainingDebt, setValue]);

  const watchedAmount = watch('soTien') || 0;
  const projectedPaid = currentPaid + Number(watchedAmount);
  const projectedRemaining = Math.max(0, totalAmount - projectedPaid);
  const willBeFullyPaid = projectedRemaining === 0 && projectedPaid >= totalAmount;

  // Tri-Segment Progress calculations
  const pctPrev = totalAmount > 0 ? Math.min(100, Math.round((currentPaid / totalAmount) * 100)) : 0;
  const pctThis = totalAmount > 0 ? Math.min(100 - pctPrev, Math.round((Number(watchedAmount) / totalAmount) * 100)) : 0;
  const pctRem = Math.max(0, 100 - pctPrev - pctThis);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    if (!rawVal) {
      setDisplayAmount('');
      setValue('soTien', 0, { shouldValidate: true });
      return;
    }
    const num = Number(rawVal);
    const capped = remainingDebt > 0 ? Math.min(remainingDebt, num) : num;
    setValue('soTien', capped, { shouldValidate: true });
    setDisplayAmount(new Intl.NumberFormat('vi-VN').format(capped));
  };

  const handleApplyPresetRatio = (ratio: number) => {
    const target = Math.round(remainingDebt * ratio);
    setValue('soTien', target, { shouldValidate: true });
    setDisplayAmount(new Intl.NumberFormat('vi-VN').format(target));
  };

  const handleApplyIncrement = (addVal: number) => {
    const current = Number(watchedAmount) || 0;
    const target = Math.min(remainingDebt, current + addVal);
    setValue('soTien', target, { shouldValidate: true });
    setDisplayAmount(new Intl.NumberFormat('vi-VN').format(target));
  };

  const onSubmit = async (data: FormValues) => {
    const amount = Number(data.soTien);
    const newTotal = currentPaid + amount;
    const newRemaining = Math.max(0, totalAmount - newTotal);
    const newStatus = newRemaining === 0 ? 'Tất toán' : 'Công nợ';

    const newInstallment: PaymentInstallment = {
      id: `DOT-${nextInstallmentNumber}-${Date.now().toString(36)}`,
      lanThu: nextInstallmentNumber,
      soTien: amount,
      ngayThu: data.ngayThu,
      phuongThucThanhToan: data.phuongThucThanhToan || 'Chuyển khoản',
      soChungTuThamChieu: sanitizeText(data.soChungTuThamChieu || ''),
      nguoiNop: cleanProperVietnameseText(data.nguoiNop || ''),
      ghiChu: sanitizeText(data.ghiChu || ''),
      createdAt: new Date().toISOString(),
    };

    await onSave(newInstallment, newTotal, newRemaining, newStatus);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990]" />
        <Dialog.Content asChild>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 outline-none" style={{ pointerEvents: 'auto' }}>
            <div 
              className="relative z-10 w-full max-w-xl outline-none flex flex-col max-h-[94vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[94vh] border border-slate-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-800 via-emerald-900 to-teal-950 text-white shrink-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                      <CreditCard size={22} className="text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-black tracking-tight text-white flex items-center gap-2">
                        Ghi nhận đợt thu mới (Đợt {nextInstallmentNumber})
                      </Dialog.Title>
                      <Dialog.Description className="text-2xs text-emerald-200 font-semibold mt-0.5">
                        Phiếu thu: <strong className="font-mono text-white">{payment.paymentId}</strong> | HĐ: <strong className="font-mono text-white">{payment.soHopDong || '---'}</strong>
                      </Dialog.Description>
                    </div>
                  </div>
                  <span className="text-3xs uppercase font-black px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                    Sổ cái đa đợt
                  </span>
                </div>

                {/* Financial Balance Summary Card */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-250 shadow-2xs">
                    <span className="text-3xs uppercase font-extrabold text-slate-700 block mb-0.5">Tổng giá trị HĐ</span>
                    <span className="font-currency font-black text-slate-900 text-xs">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-300 bg-emerald-50/50 shadow-2xs">
                    <span className="text-3xs uppercase font-extrabold text-emerald-800 block mb-0.5">
                      Đã thu ({pctPrev}%)
                    </span>
                    <span className="font-currency font-black text-emerald-900 text-xs">
                      {formatCurrency(currentPaid)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-300 bg-amber-50/50 shadow-2xs">
                    <span className="text-3xs uppercase font-extrabold text-amber-800 block mb-0.5">
                      Công nợ ({100 - pctPrev}%)
                    </span>
                    <span className="font-currency font-black text-amber-900 text-xs">
                      {formatCurrency(remainingDebt)}
                    </span>
                  </div>
                </div>

                {/* Tri-Segment Financial Waterfall Bar */}
                <div className="px-5 pt-3 pb-1 bg-white border-b border-slate-150">
                  <div className="flex justify-between items-center text-3xs font-extrabold uppercase tracking-wider text-slate-700 mb-1.5">
                    <span className="flex items-center gap-1 text-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" /> Đã thu: {pctPrev}%
                    </span>
                    <span className="flex items-center gap-1 text-blue-800">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Đợt này: {pctThis}%
                    </span>
                    <span className="flex items-center gap-1 text-amber-800">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Còn nợ: {pctRem}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                    <div 
                      style={{ width: `${pctPrev}%` }} 
                      className="bg-emerald-600 h-full transition-all duration-300" 
                      title={`Đã thu lũy kế: ${pctPrev}%`}
                    />
                    <div 
                      style={{ width: `${pctThis}%` }} 
                      className="bg-blue-600 h-full transition-all duration-300 animate-pulse" 
                      title={`Đợt này thu: ${pctThis}%`}
                    />
                    <div 
                      style={{ width: `${pctRem}%` }} 
                      className="bg-amber-400 h-full transition-all duration-300" 
                      title={`Công nợ còn lại: ${pctRem}%`}
                    />
                  </div>
                </div>

                {/* Form */}
                <form id="recordInstallmentForm" onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 text-xs overflow-y-auto">
                  
                  {/* Số tiền thu đợt này */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-2xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign size={14} className="text-emerald-700" />
                        Số tiền thực thu đợt này <span className="text-red-600">*</span>
                      </label>
                      {remainingDebt > 0 && (
                        <button
                          type="button"
                          onClick={() => handleApplyPresetRatio(1.0)}
                          className="text-2xs text-emerald-800 hover:text-emerald-950 font-black hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300"
                        >
                          Tất toán hết nợ: {formatCurrency(remainingDebt)}
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <input 
                        type="text"
                        value={displayAmount}
                        onChange={handleAmountChange}
                        className="h-11 px-3.5 pr-14 border-2 border-emerald-400 focus:border-emerald-700 rounded-xl text-lg font-currency font-black text-emerald-950 w-full outline-none bg-emerald-50/20 shadow-2xs transition-colors"
                        placeholder="Nhập số tiền thu (VD: 450.000.000)..."
                      />
                      <span className="absolute right-3.5 top-3 text-xs font-black text-slate-700 select-none">
                        VND
                      </span>
                    </div>

                    {/* Dịch số tiền thành chữ tiếng Việt */}
                    {watchedAmount > 0 && (
                      <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-2xs text-emerald-950 flex items-start gap-1.5">
                        <span className="font-black uppercase tracking-wider shrink-0 text-emerald-800">Bằng chữ:</span>
                        <span className="italic font-bold">
                          {readVietnameseCurrency(watchedAmount)}
                        </span>
                      </div>
                    )}

                    {/* Phím bấm nhanh: Tỷ lệ nợ & Cộng số tiền */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-3xs font-extrabold uppercase text-slate-800 flex items-center gap-1">
                          <Percent size={11} className="text-blue-600" /> Tỷ lệ nợ:
                        </span>
                        {[
                          { label: '25% (Tạm ứng)', ratio: 0.25 },
                          { label: '50% (Trước xuất)', ratio: 0.5 },
                          { label: '70% (Bàn giao)', ratio: 0.7 },
                          { label: '100% (Tất toán)', ratio: 1.0 },
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => handleApplyPresetRatio(preset.ratio)}
                            className="px-2 py-0.5 rounded text-3xs font-black bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 transition-colors cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-3xs font-extrabold uppercase text-slate-800 flex items-center gap-1">
                          <Plus size={11} className="text-emerald-700" /> Cộng nhanh:
                        </span>
                        {[1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000].map(addVal => (
                          <button
                            key={addVal}
                            type="button"
                            onClick={() => handleApplyIncrement(addVal)}
                            className="px-2 py-0.5 rounded text-3xs font-bold bg-slate-100 hover:bg-emerald-100 text-slate-900 hover:text-emerald-950 border border-slate-250 transition-colors cursor-pointer"
                          >
                            +{addVal >= 1_000_000 ? `${addVal / 1_000_000}tr` : formatCurrency(addVal)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {errors.soTien && (
                      <p className="text-red-600 text-3xs font-bold flex items-center gap-1 mt-1">
                        <AlertCircle size={12} /> {errors.soTien.message}
                      </p>
                    )}
                  </div>

                  {/* Thông báo dự phóng sau khi ghi nhận */}
                  <div className={`p-3 rounded-xl border text-2xs flex items-center justify-between font-medium ${
                    willBeFullyPaid 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}>
                    <span>
                      {willBeFullyPaid ? (
                        <strong className="text-emerald-900 font-black">✓ Sau đợt này: Hợp đồng sẽ TẤT TOÁN 100% (Công nợ = 0 ₫)</strong>
                      ) : (
                        <span>Dự phóng nợ còn lại: <strong className="font-currency font-black text-amber-900">{formatCurrency(projectedRemaining)}</strong> (Trạng thái: Công nợ)</span>
                      )}
                    </span>
                    <span className="font-currency font-black bg-white px-2 py-0.5 rounded border border-slate-200">
                      {totalAmount > 0 ? Math.round((projectedPaid / totalAmount) * 100) : 0}% giá trị
                    </span>
                  </div>

                  {/* Grid 2 cột: Ngày thu & Phương thức */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-2xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={13} className="text-blue-700" />
                        Ngày thực thu <span className="text-red-600">*</span>
                      </label>
                      <input 
                        type="date"
                        {...register('ngayThu')}
                        className="h-9 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 w-full focus:border-emerald-600 outline-none bg-white"
                      />
                      {errors.ngayThu && <p className="text-red-600 text-3xs font-bold">{errors.ngayThu.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-2xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={13} className="text-blue-700" />
                        Phương thức thanh toán <span className="text-red-600">*</span>
                      </label>
                      <select 
                        {...register('phuongThucThanhToan')}
                        className="h-9 px-2.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 w-full focus:border-emerald-600 outline-none bg-white"
                      >
                        <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt tại quỹ / Kế toán</option>
                        <option value="Thẻ POS">Thẻ tín dụng / Thẻ ghi nợ</option>
                        <option value="Khác">Khác / Cấn trừ</option>
                      </select>
                    </div>
                  </div>

                  {/* Grid 2 cột: Người nộp & Số chứng từ/UNC */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-2xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={13} className="text-slate-700" />
                        Người đại diện nộp tiền
                      </label>
                      <input 
                        {...register('nguoiNop')}
                        className="h-9 px-3 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 w-full focus:border-emerald-600 outline-none bg-white"
                        placeholder="Họ tên người nộp tiền..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-2xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck size={13} className="text-slate-700" />
                        Số chứng từ / Mã giao dịch UNC
                      </label>
                      <input 
                        {...register('soChungTuThamChieu')}
                        className="h-9 px-3 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 w-full focus:border-emerald-600 outline-none bg-white"
                        placeholder="VD: UNC-9821, FT26081..."
                      />
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="space-y-1">
                    <label className="text-2xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={13} className="text-slate-700" />
                      Ghi chú đợt thu
                    </label>
                    <textarea 
                      {...register('ghiChu')}
                      rows={2}
                      className="p-2.5 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 w-full focus:border-emerald-600 outline-none bg-white resize-none"
                      placeholder="Ghi chú đợt thanh toán, ngân hàng chuyển, số hợp đồng căn cứ..."
                    />
                  </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                  <span className="text-3xs text-slate-700 font-semibold">
                    Đợt thu sẽ được lưu vào sổ cái và cộng dồn vào lũy kế thực thu.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      onClick={onClose} 
                      variant="secondary" 
                      size="sm" 
                      className="h-9 font-bold px-4"
                    >
                      Hủy
                    </Button>
                    <Button 
                      type="submit" 
                      form="recordInstallmentForm" 
                      disabled={isSubmitting}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white h-9 px-5 font-bold shadow-sm shadow-emerald-700/20"
                    >
                      {isSubmitting ? 'Đang lưu...' : (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={16} />
                          Xác nhận ghi thu
                        </span>
                      )}
                    </Button>
                  </div>
                </div>

              </motion.div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
