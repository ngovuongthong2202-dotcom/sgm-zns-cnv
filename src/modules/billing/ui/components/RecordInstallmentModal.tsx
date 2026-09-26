import React, { useState } from 'react';
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
  Building2,
  FileCheck
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { Payment, PaymentInstallment } from '@/src/domain/schema/payment.schema';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { sanitizeText } from '@/src/shared/utils/inputSanitizer';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';

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
      soTien: remainingDebt > 0 ? remainingDebt : 0,
      ngayThu: new Date().toISOString().split('T')[0],
      phuongThucThanhToan: 'Chuyển khoản',
      soChungTuThamChieu: '',
      nguoiNop: defaultPayerName || payment.tenNguoiNop || '',
      ghiChu: `Thu tiền đợt ${nextInstallmentNumber} - HĐ ${payment.soHopDong || payment.soDonHang || ''}`,
    }
  });

  const watchedAmount = watch('soTien') || 0;
  const projectedPaid = currentPaid + Number(watchedAmount);
  const projectedRemaining = Math.max(0, totalAmount - projectedPaid);
  const willBeFullyPaid = projectedRemaining === 0 && projectedPaid >= totalAmount;

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
                <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 text-white shrink-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                      <CreditCard size={20} className="text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-base font-black tracking-tight text-white flex items-center gap-2">
                        Ghi nhận đợt thu mới (Đợt {nextInstallmentNumber})
                      </Dialog.Title>
                      <Dialog.Description className="text-2xs text-emerald-100 mt-0.5">
                        Phiếu thu: <strong className="font-mono text-white">{payment.paymentId}</strong> | HĐ: <strong className="font-mono text-white">{payment.soHopDong || '---'}</strong>
                      </Dialog.Description>
                    </div>
                  </div>
                  <span className="text-3xs uppercase font-extrabold px-2.5 py-1 rounded-full bg-white/20 text-white border border-white/30">
                    Sổ cái đa đợt
                  </span>
                </div>

                {/* Financial Balance Summary Card */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-3 gap-2.5 text-center text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                    <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Tổng giá trị</span>
                    <span className="font-currency font-black text-slate-800 text-xs">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 bg-emerald-50/40">
                    <span className="text-3xs uppercase font-bold text-emerald-700 block mb-0.5">Đã thu lũy kế</span>
                    <span className="font-currency font-black text-emerald-800 text-xs">
                      {formatCurrency(currentPaid)}
                    </span>
                  </div>
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 bg-amber-50/40">
                    <span className="text-3xs uppercase font-bold text-amber-700 block mb-0.5">Công nợ còn lại</span>
                    <span className="font-currency font-black text-amber-800 text-xs">
                      {formatCurrency(remainingDebt)}
                    </span>
                  </div>
                </div>

                {/* Form */}
                <form id="recordInstallmentForm" onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 text-xs overflow-y-auto">
                  
                  {/* Số tiền thu đợt này */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <DollarSign size={13} className="text-emerald-600" />
                        Số tiền thực thu đợt này <span className="text-red-500">*</span>
                      </label>
                      {remainingDebt > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setValue('soTien', remainingDebt, { shouldValidate: true });
                          }}
                          className="text-3xs text-emerald-700 hover:underline font-semibold"
                        >
                          Tất toán hết nợ: {formatCurrency(remainingDebt)}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input 
                        type="number"
                        step="any"
                        {...register('soTien', { valueAsNumber: true })}
                        className="h-10 px-3.5 pr-12 border-2 border-emerald-300 focus:border-emerald-600 rounded-xl text-base font-currency font-black text-emerald-900 w-full outline-none bg-emerald-50/20"
                        placeholder="Nhập số tiền thu..."
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-slate-400 select-none">
                        VND
                      </span>
                    </div>
                    {errors.soTien && (
                      <p className="text-red-500 text-3xs font-medium flex items-center gap-1 mt-1">
                        <AlertCircle size={11} /> {errors.soTien.message}
                      </p>
                    )}
                  </div>

                  {/* Thông báo dự phóng sau khi ghi nhận */}
                  <div className={`p-2.5 rounded-xl border text-3xs flex items-center justify-between ${
                    willBeFullyPaid 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <span>
                      {willBeFullyPaid ? (
                        <strong>✓ Sau đợt này: Hợp đồng sẽ TẤT TOÁN 100%</strong>
                      ) : (
                        <span>Dự phóng còn lại: <strong>{formatCurrency(projectedRemaining)}</strong> (Trạng thái: Công nợ)</span>
                      )}
                    </span>
                    <span className="font-mono font-bold">
                      {totalAmount > 0 ? Math.round((projectedPaid / totalAmount) * 100) : 0}% giá trị
                    </span>
                  </div>

                  {/* Grid 2 cột: Ngày thu & Phương thức */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar size={12} className="text-blue-600" />
                        Ngày thực thu <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="date"
                        {...register('ngayThu')}
                        className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 w-full focus:border-emerald-500 outline-none bg-white"
                      />
                      {errors.ngayThu && <p className="text-red-500 text-3xs">{errors.ngayThu.message}</p>}
                    </div>

                    <div className="space-y-1">
                      <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard size={12} className="text-indigo-600" />
                        Phương thức thanh toán <span className="text-red-500">*</span>
                      </label>
                      <select 
                        {...register('phuongThucThanhToan')}
                        className="h-9 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-emerald-500 outline-none bg-white"
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
                      <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <User size={12} className="text-slate-500" />
                        Người đại diện nộp tiền
                      </label>
                      <input 
                        {...register('nguoiNop')}
                        className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-emerald-500 outline-none bg-white"
                        placeholder="Họ tên người nộp tiền..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck size={12} className="text-slate-500" />
                        Số chứng từ / Mã giao dịch UNC
                      </label>
                      <input 
                        {...register('soChungTuThamChieu')}
                        className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 w-full focus:border-emerald-500 outline-none bg-white"
                        placeholder="VD: UNC-9821, FT26081..."
                      />
                    </div>
                  </div>

                  {/* Ghi chú */}
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText size={12} className="text-slate-500" />
                      Ghi chú đợt thu
                    </label>
                    <textarea 
                      {...register('ghiChu')}
                      rows={2}
                      className="p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 w-full focus:border-emerald-500 outline-none bg-white resize-none"
                      placeholder="Ghi chú đợt thanh toán, ngân hàng chuyển, tài khoản thụ hưởng..."
                    />
                  </div>
                </form>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                  <span className="text-3xs text-slate-500">
                    Đợt thu sẽ được lưu vào sổ cái và cộng dồn vào lũy kế thực thu.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      onClick={onClose} 
                      variant="secondary" 
                      size="sm" 
                      className="h-9 font-semibold px-4"
                    >
                      Hủy
                    </Button>
                    <Button 
                      type="submit" 
                      form="recordInstallmentForm" 
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-5 font-bold shadow-sm shadow-emerald-600/20"
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
