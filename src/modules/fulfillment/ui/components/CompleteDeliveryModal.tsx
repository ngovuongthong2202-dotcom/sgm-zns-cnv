import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { motion } from 'motion/react';
import { CheckCircle2, User, Calendar, FileText, Package, Check } from 'lucide-react';
import { cleanProperVietnameseText, squeezeSpaces } from '@/src/shared/utils/textFormatter';
import { sanitizeText } from '@/src/shared/utils/inputSanitizer';
import * as Dialog from '@radix-ui/react-dialog';

import { Button } from '@/src/design-system/Button';

const CompleteSchema = z.object({
  ngayGiaoThucTe: z.string().min(1, 'Vui lòng chọn ngày giao'),
  kyNhan: z.string().min(1, 'Vui lòng nhập tên/sđt người nhận'),
  ghiChu: z.string().optional(),
});

type CompleteFormValues = z.infer<typeof CompleteSchema>;

interface CompleteDeliveryModalProps {
  delivery: Delivery;
  onClose: () => void;
  onSave: (data: Partial<Delivery>) => Promise<void>;
}

export function CompleteDeliveryModal({ delivery, onClose, onSave }: CompleteDeliveryModalProps) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    // Lock body scroll temporarily but do not touch pointer-events
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompleteFormValues>({
    resolver: zodResolver(CompleteSchema),
    defaultValues: {
      ngayGiaoThucTe: new Date().toISOString().split('T')[0],
      kyNhan: delivery.kyNhan || '',
      ghiChu: delivery.ghiChu || '', // Preserve existing notes
    }
  });

  const onSubmit = async (data: CompleteFormValues) => {
    let finalNote = sanitizeText(data.ghiChu || '');
    const cleanKyNhan = sanitizeText(cleanProperVietnameseText(data.kyNhan));
    
    if (delivery.ghiChu && finalNote && !finalNote.includes(delivery.ghiChu)) {
      finalNote = `${delivery.ghiChu}\n--- Cập nhật lúc giao ---\n${finalNote}`;
    }

    const generatedSerials = (delivery.products || [])
      .map(p => p.productId || p.productName || '')
      .filter(Boolean);

    await onSave({
      ngayGiaoThucTe: data.ngayGiaoThucTe,
      kyNhan: cleanKyNhan,
      danhSachMaMay: (delivery.danhSachMaMay && delivery.danhSachMaMay.length > 0) ? delivery.danhSachMaMay : generatedSerials,
      ghiChu: finalNote || undefined,
    });
    
    onClose();
  };

  if (!mounted) return null;

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990]" />
        <Dialog.Content asChild>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 outline-none" style={{ pointerEvents: 'auto' }}>
            <div 
              className="relative z-10 w-full max-w-lg outline-none flex flex-col max-h-[95vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-xl w-full flex flex-col max-h-[95vh] border border-blue-100 overflow-hidden"
              >
                <div className="px-6 py-5 bg-gradient-to-br from-blue-50 to-blue-50/50 border-b border-blue-100 shrink-0 flex items-start gap-4">
                   <div className="p-3.5 bg-blue-600 text-white rounded-2xl shadow-sm shrink-0 shadow-blue-200">
                        <CheckCircle2 size={24} />
                   </div>
                   <div>
                        <Dialog.Title className="text-xl font-bold text-slate-900 tracking-tight">Xác nhận hoàn tất giao hàng</Dialog.Title>
                        <Dialog.Description className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">
                          Chốt thông tin nhận bàn giao cho phiếu <strong className="font-mono text-slate-800">{delivery.soPhieuXuat || delivery.deliveryId}</strong>.
                        </Dialog.Description>
                   </div>
                </div>

                <form id="completeDeliveryForm" onSubmit={handleSubmit(onSubmit)} className="p-0 flex-1 overflow-y-auto">
                   {/* Section Thông tin chung */}
                   <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 grid grid-cols-2 gap-4">
                      <div className="space-y-1.5 focus-within:text-blue-600">
                         <label className="text-2xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors"><Calendar size={12}/> Ngày bàn giao</label>
                         <input aria-label="Ngày giao thực tế" type="date" {...register('ngayGiaoThucTe')} className="h-9 px-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 w-full font-bold text-slate-800 text-sm shadow-sm transition-shadow outline-none bg-white" />
                         {errors.ngayGiaoThucTe && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.ngayGiaoThucTe.message}</p>}
                      </div>
                      
                      <div className="space-y-1.5 focus-within:text-blue-600">
                         <label className="text-2xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors"><User size={12}/> Người ký nhận <span className="text-red-600">*</span></label>
                         <input aria-label="Người ký nhận" {...register('kyNhan')} className="h-9 px-3 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400 w-full text-sm font-medium shadow-sm transition-shadow outline-none bg-white" placeholder="Nguyễn Văn A - 09xx..." autoFocus />
                         {errors.kyNhan && <p className="text-red-600 text-2xs font-medium mt-0.5">{errors.kyNhan.message}</p>}
                      </div>
                   </div>

                   {/* Section Danh sách cấu hình máy */}
                   <div className="px-6 items-center pt-6 pb-2 flex justify-between">
                      <label className="text-2xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5"><Package size={14} className="text-emerald-500" /> Hệ thống máy móc bàn giao</label>
                      <div className="text-2xs font-mono bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold border border-emerald-100 flex items-center gap-1">
                        <Check size={12} /> {(delivery.products || []).length} mục
                      </div>
                   </div>
                   
                   <div className="px-6 pb-5">
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-[0_1px_3px_0_rgba(0,0,0,0.02)]">
                        {(delivery.products || []).length > 0 ? (
                          <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200 text-2xs font-bold uppercase tracking-wider text-slate-500">
                              <tr>
                                <th className="px-4 py-2 font-medium">Tên Hàng / Mô Tả</th>
                                <th className="px-4 py-2 font-medium w-32 border-l border-slate-200">Mã / Model</th>
                                <th className="px-4 py-2 font-medium w-24 text-right border-l border-slate-200">SL</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                              {delivery.products!.map((prod, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                   <td className="px-4 py-2.5 text-xs text-slate-800 font-medium max-w-[200px]">
                                     <span className="truncate block" title={prod.productName}>{prod.productName}</span>
                                   </td>
                                   <td className="px-4 py-2.5 text-xs text-slate-500 font-mono border-l border-slate-100 max-w-[120px]">
                                     <span className="truncate block" title={prod.productId || '---'}>{prod.productId || '---'}</span>
                                   </td>
                                   <td className="px-4 py-2.5 text-xs text-slate-800 font-bold text-right border-l border-slate-100 bg-slate-50/30">
                                     {prod.quantity} <span className="text-2xs text-slate-500 font-normal ml-0.5">{prod.unit || 'Máy'}</span>
                                   </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="px-4 py-6 text-center text-sm text-slate-500 bg-slate-50">Không có danh sách sản phẩm.</div>
                        )}
                      </div>
                   </div>

                   {/* Section Ghi chú */}
                   <div className="px-6 pb-6 focus-within:text-blue-600">
                      <label className="text-2xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-2 transition-colors"><FileText size={12}/> Ghi chú lúc giao <span className="text-2xs text-slate-500 font-normal normal-case">(Tùy chọn)</span></label>
                      <textarea aria-label="Ghi chú hoàn tất" {...register('ghiChu')} className="px-3 py-2.5 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-300 w-full min-h-[70px] resize-none text-xs shadow-sm transition-shadow outline-none bg-white" placeholder="Ghi chú tình trạng máy móc lúc bàn giao (chạy êm, phụ kiện kèm theo...)" />
                   </div>
                </form>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-end items-center gap-3 rounded-b-2xl">
                  <Button aria-label="Nút hủy" type="button" onClick={onClose} variant="secondary" className="h-[38px] shadow-sm px-5 font-semibold text-slate-600 hover:text-slate-800">
                     Hủy bỏ
                  </Button>
                  <Button aria-label="Nút hoàn tất" 
                     type="submit" form="completeDeliveryForm" disabled={isSubmitting}
                     className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600 h-[38px] shadow-sm px-6 flex items-center gap-2 font-bold transition-all shadow-blue-500/20"
                  >
                     {isSubmitting ? (
                         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : <CheckCircle2 size={16}/>}
                     Lưu xác nhận
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
