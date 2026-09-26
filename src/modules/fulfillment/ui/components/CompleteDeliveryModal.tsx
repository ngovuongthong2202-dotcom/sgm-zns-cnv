import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  User, 
  Calendar, 
  FileText, 
  Package, 
  Check, 
  Truck, 
  Building2, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Boxes, 
  FileCheck,
  Hash,
  Warehouse
} from 'lucide-react';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { sanitizeText } from '@/src/shared/utils/inputSanitizer';
import { formatDate } from '@/src/shared/utils/formatDate';
import { MachineCodeChipInput } from '@/src/modules/contracts/ui/components/MachineCodeChipInput';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/src/design-system/Button';

const CompleteSchema = z.object({
  ngayGiaoThucTe: z.string().min(1, 'Vui lòng chọn ngày giao'),
  kyNhan: z.string().min(1, 'Vui lòng nhập tên/sđt người nhận'),
  soPhieuXuat: z.string().optional(),
  keToanKho: z.string().optional(),
  khoXuat: z.string().optional(),
  donViVanChuyen: z.string().optional(),
  ghiChu: z.string().optional(),
});

type CompleteFormValues = z.infer<typeof CompleteSchema>;

interface CompleteDeliveryModalProps {
  delivery: Delivery;
  onClose: () => void;
  onSave: (data: Partial<Delivery>) => Promise<void>;
}

const DEFAULT_ATTACHED_DOCS = [
  'Biên bản bàn giao & nghiệm thu kỹ thuật',
  'Hóa đơn điện tử GTGT',
  'Phiếu xuất kho kiêm vận chuyển nội bộ ERP',
  'Phiếu / Tem bảo hành chính hãng',
  'Tài liệu hướng dẫn vận hành & an toàn'
];

export function CompleteDeliveryModal({ delivery, onClose, onSave }: CompleteDeliveryModalProps) {
  const [mounted, setMounted] = useState(false);
  const [serials, setSerials] = useState<string[]>(delivery.danhSachMaMay || []);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([
    'Biên bản bàn giao & nghiệm thu kỹ thuật',
    'Phiếu xuất kho kiêm vận chuyển nội bộ ERP',
    'Phiếu / Tem bảo hành chính hãng'
  ]);
  
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const totalQuantity = (delivery.products || []).reduce((acc, p) => acc + (Number(p.quantity) || 1), 0);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompleteFormValues>({
    resolver: zodResolver(CompleteSchema),
    defaultValues: {
      ngayGiaoThucTe: new Date().toISOString().split('T')[0],
      kyNhan: delivery.kyNhan || delivery.nguoiLienHe || '',
      soPhieuXuat: delivery.soPhieuXuat || '',
      keToanKho: delivery.keToanKho || 'Ban Kho vận SGM',
      khoXuat: delivery.khoXuat || 'Kho tổng SGM',
      donViVanChuyen: delivery.donViVanChuyen || 'Nội bộ / Xe tải công ty',
      ghiChu: delivery.ghiChu || '',
    }
  });

  const toggleDoc = (doc: string) => {
    setSelectedDocs(prev => 
      prev.includes(doc) ? prev.filter(d => d !== doc) : [...prev, doc]
    );
  };

  const onSubmit = async (data: CompleteFormValues) => {
    let finalNote = sanitizeText(data.ghiChu || '');
    const cleanKyNhan = sanitizeText(cleanProperVietnameseText(data.kyNhan));
    
    const docsNote = selectedDocs.length > 0 
      ? `Hồ sơ kèm theo: ${selectedDocs.join(', ')}` 
      : '';

    if (docsNote) {
      finalNote = finalNote ? `${finalNote}\n--- ${docsNote} ---` : docsNote;
    }

    if (delivery.ghiChu && finalNote && !finalNote.includes(delivery.ghiChu)) {
      finalNote = `${delivery.ghiChu}\n--- Cập nhật lúc bàn giao ---\n${finalNote}`;
    }

    await onSave({
      ngayGiaoThucTe: data.ngayGiaoThucTe,
      kyNhan: cleanKyNhan,
      soPhieuXuat: data.soPhieuXuat || delivery.soPhieuXuat,
      keToanKho: data.keToanKho || delivery.keToanKho,
      khoXuat: data.khoXuat || delivery.khoXuat,
      donViVanChuyen: data.donViVanChuyen || delivery.donViVanChuyen,
      danhSachMaMay: serials.length > 0 ? serials : (delivery.danhSachMaMay || []),
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 outline-none" style={{ pointerEvents: 'auto' }}>
            <div 
              className="relative z-10 w-full max-w-3xl outline-none flex flex-col max-h-[94vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[94vh] border border-slate-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white shrink-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                      <Truck size={22} className="text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        Xác nhận hoàn tất giao hàng & Bàn giao thiết bị
                      </Dialog.Title>
                      <Dialog.Description className="text-2xs text-blue-100/90 mt-0.5 font-medium">
                        Phiếu giao: <strong className="font-mono text-white underline">{delivery.deliveryId}</strong> | Căn cứ HĐ: <strong className="font-mono text-white">{delivery.soHopDong || 'Theo đơn hàng'}</strong>
                      </Dialog.Description>
                    </div>
                  </div>
                  <span className="text-3xs uppercase font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Handover Console
                  </span>
                </div>

                {/* Form Body */}
                <form id="completeDeliveryForm" onSubmit={handleSubmit(onSubmit)} className="p-0 flex-1 overflow-y-auto space-y-4 text-xs">
                  
                  {/* ZONE 1: THÔNG TIN KHÁCH HÀNG & ĐIỂM GIAO */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                      <Building2 size={13} className="text-blue-600" />
                      Thông tin khách hàng & Địa điểm bàn giao
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Khách hàng</span>
                        <span className="font-bold text-slate-800 text-xs line-clamp-1" title={delivery.tenKhachHang}>
                          {delivery.tenKhachHang || 'Khách hàng'}
                        </span>
                        {delivery.maKh && (
                          <span className="font-mono text-3xs font-semibold text-blue-700 block mt-0.5">
                            Mã KH: {delivery.maKh}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Người liên hệ & SĐT</span>
                        <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                          <User size={12} className="text-slate-400 shrink-0" />
                          {delivery.nguoiLienHe || delivery.nguoiDaiDien || 'Theo hợp đồng'}
                        </span>
                        <span className="font-mono text-3xs font-bold text-emerald-700 flex items-center gap-1 mt-0.5">
                          <Phone size={10} className="shrink-0" />
                          {delivery.sdtLienHe || delivery.sdt || '---'}
                        </span>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Địa chỉ giao nhận</span>
                        <span className="font-medium text-slate-800 text-xs line-clamp-2 flex items-start gap-1" title={delivery.diaChiGiaoHang}>
                          <MapPin size={12} className="text-amber-600 shrink-0 mt-0.5" />
                          {delivery.diaChiGiaoHang || 'Tại cơ sở của khách hàng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ZONE 2: CĂN CỨ XUẤT KHO ERP & VẬN CHUYỂN */}
                  <div className="px-5 space-y-3">
                    <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Warehouse size={13} className="text-indigo-600" />
                      Căn cứ phiếu xuất kho ERP & Điều phối vận chuyển
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Số phiếu xuất ERP
                        </label>
                        <input 
                          {...register('soPhieuXuat')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="PXK-2026-..." 
                        />
                      </div>
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Kho xuất hàng
                        </label>
                        <input 
                          {...register('khoXuat')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="Kho tổng SGM" 
                        />
                      </div>
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Điều phối / Kế toán kho
                        </label>
                        <input 
                          {...register('keToanKho')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="Kế toán kho phụ trách" 
                        />
                      </div>
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Đơn vị vận chuyển
                        </label>
                        <input 
                          {...register('donViVanChuyen')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="Xe tải công ty / GHTK..." 
                        />
                      </div>
                    </div>
                  </div>

                  {/* ZONE 3: DANH SÁCH THIẾT BỊ, BẢO HÀNH & SERIAL */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Boxes size={13} className="text-emerald-600" />
                        Danh sách sản phẩm bàn giao ({delivery.products?.length || 0} mục)
                      </h4>
                      <span className="font-mono text-2xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        Tổng số lượng: {totalQuantity} cái/máy
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      {(delivery.products || []).length > 0 ? (
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-slate-50 border-b border-slate-200 text-3xs font-black uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="p-2.5 px-3 w-10 text-center">STT</th>
                              <th className="p-2.5 px-3">Tên Hàng / Model Cấu Hình</th>
                              <th className="p-2.5 px-3 w-28 text-center border-l border-slate-200">Số Lượng</th>
                              <th className="p-2.5 px-3 w-44 border-l border-slate-200">Thời Gian Bảo Hành</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 bg-white">
                            {delivery.products!.map((prod, idx) => {
                              const warrantyDisplay = (prod as any).ngayHetHanBaoHanh 
                                ? formatDate((prod as any).ngayHetHanBaoHanh)
                                : ((prod as any).thoiGianBaoHanh ? `${(prod as any).thoiGianBaoHanh} tháng` : '12 tháng (Tiêu chuẩn)');
                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-2.5 px-3 text-center text-slate-400 font-mono text-3xs">{idx + 1}</td>
                                  <td className="p-2.5 px-3 text-slate-800 font-medium">
                                    <span className="font-bold text-slate-900 block">{prod.productName}</span>
                                    {prod.productId && (
                                      <span className="font-mono text-3xs text-slate-500">Mã: {prod.productId}</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-100 bg-slate-50/40">
                                    {prod.quantity} <span className="text-3xs text-slate-500 font-normal">{prod.unit || 'Máy'}</span>
                                  </td>
                                  <td className="p-2.5 px-3 text-xs border-l border-slate-100">
                                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-3xs">
                                      <ShieldCheck size={11} className="shrink-0" />
                                      {warrantyDisplay}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-slate-400 text-xs">Không có sản phẩm trong phiếu</div>
                      )}
                    </div>

                    {/* Quản lý Mã Serial từng máy */}
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Hash size={12} className="text-blue-600" />
                          Mã Serial từng máy bàn giao ({serials.length} serial đã gán)
                        </label>
                        <span className="text-3xs text-slate-400">
                          Nhập mã serial máy rồi gõ Enter hoặc dấu phẩy
                        </span>
                      </div>
                      <MachineCodeChipInput 
                        value={serials}
                        onChange={setSerials}
                      />
                    </div>
                  </div>

                  {/* ZONE 4: HỒ SƠ ĐỐI CHIẾU & KÝ NHẬN BÀN GIAO THỰC TẾ */}
                  <div className="px-5 space-y-3">
                    <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <FileCheck size={13} className="text-emerald-600" />
                      Hồ sơ đối chiếu kèm theo bàn giao
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {DEFAULT_ATTACHED_DOCS.map((doc) => {
                        const isChecked = selectedDocs.includes(doc);
                        return (
                          <div 
                            key={doc}
                            onClick={() => toggleDoc(doc)}
                            className={`p-2 rounded-lg border text-2xs font-semibold cursor-pointer select-none transition-all flex items-center gap-2 ${
                              isChecked 
                                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked} 
                              onChange={() => {}} 
                              className="rounded text-blue-600 focus:ring-0 cursor-pointer" 
                            />
                            <span>{doc}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ZONE 5: NGÀY KÝ NHẬN & GHI CHÚ */}
                  <div className="px-5 pb-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={12} className="text-blue-600" /> 
                          Ngày bàn giao thực tế <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="date" 
                          {...register('ngayGiaoThucTe')}
                          className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-white" 
                        />
                        {errors.ngayGiaoThucTe && <p className="text-red-500 text-3xs font-medium">{errors.ngayGiaoThucTe.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <User size={12} className="text-blue-600" /> 
                          Người ký nhận bàn giao <span className="text-red-500">*</span>
                        </label>
                        <input 
                          {...register('kyNhan')}
                          className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-white" 
                          placeholder="Họ tên người nhận - SĐT / Chức vụ..."
                        />
                        {errors.kyNhan && <p className="text-red-500 text-3xs font-medium">{errors.kyNhan.message}</p>}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={12} className="text-slate-500" /> 
                        Ghi chú nghiệm thu bàn giao (Tùy chọn)
                      </label>
                      <textarea 
                        {...register('ghiChu')}
                        rows={2}
                        className="p-2.5 border border-slate-200 rounded-lg text-xs text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-white resize-none" 
                        placeholder="Tình trạng máy móc lúc chạy thử, phụ kiện đi kèm, hướng dẫn kỹ thuật..."
                      />
                    </div>
                  </div>

                </form>

                {/* Footer */}
                <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                  <span className="text-3xs text-slate-500">
                    Cập nhật sẽ đánh dấu phiếu thành <strong>ĐÃ GIAO / HOÀN TẤT</strong> và ghi nhận vào lịch sử kiểm toán.
                  </span>
                  <div className="flex items-center gap-2">
                    <Button 
                      type="button" 
                      onClick={onClose} 
                      variant="secondary" 
                      size="sm" 
                      className="h-9 font-semibold px-4"
                    >
                      Hủy bỏ
                    </Button>
                    <Button 
                      type="submit" 
                      form="completeDeliveryForm" 
                      disabled={isSubmitting}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-5 font-bold shadow-sm shadow-emerald-600/20"
                    >
                      {isSubmitting ? 'Đang lưu...' : (
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 size={16} />
                          Xác nhận hoàn tất
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
