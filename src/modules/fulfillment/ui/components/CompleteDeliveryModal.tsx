import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  User, 
  Calendar, 
  FileText, 
  Truck, 
  Building2, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Boxes, 
  Warehouse, 
  ShoppingBag, 
  Wrench 
} from 'lucide-react';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { sanitizeText } from '@/src/shared/utils/inputSanitizer';
import { formatDate } from '@/src/shared/utils/formatDate';
import { MachineCodeChipInput } from '@/src/modules/contracts/ui/components/MachineCodeChipInput';
import { SmartPhoneInput } from '@/src/design-system';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/src/design-system/Button';
import { resolveDeliveryDisplayCode } from '@/src/shared/utils/voucherResolver';
import { parseVietnamAddressComplete } from '@/src/shared/services/vietnamAddressParser';
import { VIETNAM_PROVINCES_2025 } from '@/src/shared/services/vietnamProvincesApi';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

const CompleteSchema = z.object({
  ngayGiaoThucTe: z.string().min(1, 'Vui lòng chọn ngày giao'),
  kyNhan: z.string().min(1, 'Vui lòng nhập tên/sđt người nhận'),
  soPhieuXuat: z.string().optional(),
  keToanKho: z.string().optional(),
  khoXuat: z.string().optional(),
  donViVanChuyen: z.string().optional(),
  thoGiaoMay: z.string().optional(),
  sdtThoGiaoMay: z.string().optional(),
  ghiChu: z.string().optional(),
});

type CompleteFormValues = z.infer<typeof CompleteSchema>;

interface CompleteDeliveryModalProps {
  delivery: Delivery;
  onClose: () => void;
  onSave: (data: Partial<Delivery>) => Promise<void>;
  targetShipment?: DeliveryShipment | null;
}

export function CompleteDeliveryModal({ delivery, onClose, onSave, targetShipment }: CompleteDeliveryModalProps) {
  const [mounted, setMounted] = useState(false);

  const activeProducts = useMemo(() => {
    if (targetShipment && Array.isArray(targetShipment.products) && targetShipment.products.length > 0) {
      return targetShipment.products;
    }
    return delivery.products || [];
  }, [targetShipment, delivery.products]);

  // Gán Serial theo từng dòng sản phẩm tương ứng
  const [productSerials, setProductSerials] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    activeProducts.forEach((p: any, idx: number) => {
      const key = p.productId || p.productName || `p_${idx}`;
      init[key] = Array.isArray(p.danhSachMaMay) && p.danhSachMaMay.length > 0 
        ? [...p.danhSachMaMay] 
        : [];
    });
    // Nếu có danh sách mã máy tổng của phiếu giao hoặc đợt giao nhưng các dòng chưa có, gán vào sản phẩm đầu tiên nếu chỉ có 1 dòng
    const serialList = targetShipment?.danhSachMaMay?.length ? targetShipment.danhSachMaMay : delivery.danhSachMaMay;
    if (serialList?.length && activeProducts.length === 1) {
      const key = activeProducts[0].productId || activeProducts[0].productName || 'p_0';
      if (!init[key]?.length) {
        init[key] = [...serialList];
      }
    }
    return init;
  });
  
  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const totalQuantity = (delivery.products || []).reduce((acc, p) => acc + (Number(p.quantity) || 1), 0);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<CompleteFormValues>({
    resolver: zodResolver(CompleteSchema),
    defaultValues: {
      ngayGiaoThucTe: targetShipment?.ngayGiaoThucTe || targetShipment?.ngayGiaoMay || delivery.ngayGiaoThucTe || delivery.ngayGiaoMay || new Date().toISOString().split('T')[0],
      kyNhan: targetShipment?.kyNhan || delivery.kyNhan || delivery.nguoiLienHe || '',
      soPhieuXuat: targetShipment?.soPhieuXuat || delivery.soPhieuXuat || '',
      keToanKho: targetShipment?.keToanKho || delivery.keToanKho || '',
      khoXuat: targetShipment?.khoXuat || delivery.khoXuat || '',
      donViVanChuyen: targetShipment?.donViVanChuyen || delivery.donViVanChuyen || '',
      thoGiaoMay: targetShipment?.thoGiaoMay || delivery.thoGiaoMay || '',
      sdtThoGiaoMay: targetShipment?.sdtThoGiaoMay || delivery.sdtThoGiaoMay || '',
      ghiChu: targetShipment?.ghiChu || delivery.ghiChu || '',
    }
  });

  const onSubmit = async (data: CompleteFormValues) => {
    let finalNote = sanitizeText(data.ghiChu || '');
    const cleanKyNhan = sanitizeText(cleanProperVietnameseText(data.kyNhan));

    if (delivery.ghiChu && finalNote && !finalNote.includes(delivery.ghiChu)) {
      finalNote = `${delivery.ghiChu}\n--- Cập nhật lúc bàn giao ---\n${finalNote}`;
    }

    const allAggregatedSerials: string[] = [];
    const updatedProducts = activeProducts.map((prod: any, idx: number) => {
      const key = prod.productId || prod.productName || `p_${idx}`;
      const pSerials = productSerials[key] || [];
      allAggregatedSerials.push(...pSerials);
      return {
        ...prod,
        danhSachMaMay: pSerials
      };
    });

    await onSave({
      ngayGiaoThucTe: data.ngayGiaoThucTe,
      kyNhan: cleanKyNhan,
      soPhieuXuat: data.soPhieuXuat || targetShipment?.soPhieuXuat || delivery.soPhieuXuat,
      keToanKho: data.keToanKho || targetShipment?.keToanKho || delivery.keToanKho,
      khoXuat: data.khoXuat || targetShipment?.khoXuat || delivery.khoXuat,
      donViVanChuyen: data.donViVanChuyen || targetShipment?.donViVanChuyen || delivery.donViVanChuyen,
      thoGiaoMay: data.thoGiaoMay || targetShipment?.thoGiaoMay || delivery.thoGiaoMay,
      sdtThoGiaoMay: data.sdtThoGiaoMay || targetShipment?.sdtThoGiaoMay || delivery.sdtThoGiaoMay,
      products: updatedProducts,
      danhSachMaMay: allAggregatedSerials.length > 0 ? Array.from(new Set(allAggregatedSerials)) : (targetShipment?.danhSachMaMay || delivery.danhSachMaMay || []),
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
              className="relative z-10 w-full max-w-4xl outline-none flex flex-col max-h-[94vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 8 }}
                className="bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[94vh] border border-slate-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-blue-800 to-slate-900 text-white shrink-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
                      <Truck size={22} className="text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                        {targetShipment ? (
                          <>
                            <span>Xác nhận bàn giao Đợt {targetShipment.dotGiaoHang}</span>
                            <span className="px-2 py-0.5 rounded text-xs bg-white/20 font-mono font-bold">
                              {targetShipment.soPhieuXuat}
                            </span>
                          </>
                        ) : (
                          'Xác nhận hoàn tất giao hàng & Bàn giao thiết bị'
                        )}
                      </Dialog.Title>
                      <Dialog.Description className="text-2xs text-blue-100/90 mt-0.5 font-medium">
                        Phiếu giao: <strong className="font-mono text-white underline">{resolveDeliveryDisplayCode(delivery)}</strong>
                        {targetShipment ? (
                          <> | Xác nhận giao hàng riêng cho Đợt {targetShipment.dotGiaoHang} ({targetShipment.soPhieuXuat})</>
                        ) : (
                          <>
                            {delivery.soPhieuXuat && delivery.soPhieuXuat !== resolveDeliveryDisplayCode(delivery) && (
                              <> | ERP: <strong className="font-mono text-amber-200">{delivery.soPhieuXuat}</strong></>
                            )}
                            {delivery.soDonHang && (
                              <> | Đơn hàng: <strong className="font-mono text-white">{delivery.soDonHang}</strong></>
                            )}
                            {delivery.soHopDong && (
                              <> | Căn cứ HĐ: <strong className="font-mono text-white">{delivery.soHopDong}</strong></>
                            )}
                          </>
                        )}
                      </Dialog.Description>
                    </div>
                  </div>
                  <span className="text-3xs uppercase font-extrabold px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    Handover Console
                  </span>
                </div>

                {/* Form Body */}
                <form id="completeDeliveryForm" onSubmit={handleSubmit(onSubmit)} className="p-0 flex-1 overflow-y-auto space-y-4 text-xs">
                  
                  {/* ZONE 1: THÔNG TIN KHÁCH HÀNG, ĐƠN HÀNG & ĐỊA ĐIỂM BÀN GIAO */}
                  <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-3">
                    <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-200/60 pb-2">
                      <Building2 size={13} className="text-blue-600" />
                      Thông tin khách hàng, đơn hàng & Điểm bàn giao
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                        <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Căn cứ đơn hàng / HĐ</span>
                        <span className="font-mono font-bold text-blue-800 text-xs flex items-center gap-1">
                          <ShoppingBag size={11} className="text-blue-600 shrink-0" />
                          {delivery.soDonHang || 'ĐH chưa gắn'}
                        </span>
                        {delivery.soHopDong && (
                          <span className="font-mono text-3xs font-semibold text-slate-600 block mt-0.5">
                            HĐ: {delivery.soHopDong}
                          </span>
                        )}
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Địa chỉ & Vùng Giao Nhận</span>
                        <span className="font-medium text-slate-800 text-xs line-clamp-2 flex items-start gap-1" title={delivery.diaChiGiaoHang}>
                          <MapPin size={12} className="text-amber-600 shrink-0 mt-0.5" />
                          {delivery.diaChiGiaoHang || 'Tại cơ sở của khách hàng'}
                        </span>
                        {(() => {
                          const geoResult = parseVietnamAddressComplete(delivery.diaChiGiaoHang || '', VIETNAM_PROVINCES_2025);
                          if (!geoResult?.province) return null;
                          return (
                            <div className="mt-1.5 flex flex-wrap items-center gap-1">
                              <span className="text-3xs font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                🏙️ Tỉnh/Thành: {geoResult.province}
                              </span>
                              {geoResult.logisticsRegion && (
                                <span className="text-3xs font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  📍 Vùng: {geoResult.logisticsRegion}
                                </span>
                              )}
                              {geoResult.suggestedCarriers?.length ? (
                                <span className="text-3xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200" title={`Đơn vị đề xuất: ${geoResult.suggestedCarriers.map(c => c.carrierName).join(', ')}`}>
                                  🚚 Gợi ý: {geoResult.suggestedCarriers[0].carrierName}
                                </span>
                              ) : null}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* ZONE 2: CĂN CỨ XUẤT KHO ERP & VẬN CHUYỂN */}
                  <div className="px-5 space-y-3">
                    <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Warehouse size={13} className="text-blue-600" />
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
                          placeholder="Nhập số phiếu xuất kho..." 
                        />
                      </div>
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Kho xuất hàng
                        </label>
                        <input 
                          {...register('khoXuat')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="Nhập địa điểm / kho xuất..." 
                        />
                      </div>
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Điều phối / Kế toán kho
                        </label>
                        <input 
                          {...register('keToanKho')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="Nhập thủ kho / kế toán phụ trách..." 
                        />
                      </div>
                      <div>
                        <label className="text-3xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                          Đơn vị vận chuyển
                        </label>
                        <input 
                          {...register('donViVanChuyen')}
                          className="h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none" 
                          placeholder="Nhập đơn vị vận chuyển / xe..." 
                        />
                      </div>
                    </div>
                  </div>

                  {/* ZONE 3: DANH SÁCH THIẾT BỊ, BẢO HÀNH & GÁN SERIAL TƯƠNG ỨNG TỪNG SẢN PHẨM */}
                  <div className="px-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                        <Boxes size={13} className="text-emerald-600" />
                        Danh sách sản phẩm bàn giao & Gán mã Serial máy ({delivery.products?.length || 0} mục)
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
                              <th className="p-2.5 px-3 min-w-[200px]">Tên Hàng / Model Cấu Hình</th>
                              <th className="p-2.5 px-3 w-24 text-center border-l border-slate-200">Số Lượng</th>
                              <th className="p-2.5 px-3 w-36 border-l border-slate-200">Bảo Hành</th>
                              <th className="p-2.5 px-3 min-w-[260px] border-l border-slate-200">Mã Serial Gán Cho Máy</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-150 bg-white">
                            {delivery.products!.map((prod, idx) => {
                              const key = prod.productId || prod.productName || `p_${idx}`;
                              const curSerials = productSerials[key] || [];
                              const targetQty = Number(prod.quantity) || 1;
                              const isFilled = curSerials.length === targetQty;
                              const itemType = prod.itemType || detectItemType(prod.productName, prod.unit || (prod as any).dvt);
                              const isMachine = itemType === 'MACHINE';

                              const warrantyDisplay = (prod as any).ngayHetHanBaoHanh 
                                ? formatDate((prod as any).ngayHetHanBaoHanh)
                                : ((prod as any).thoiGianBaoHanh ? `${(prod as any).thoiGianBaoHanh} tháng` : (isMachine ? '12 tháng (Tiêu chuẩn)' : 'Theo tiêu chuẩn'));

                              return (
                                <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="p-2.5 px-3 text-center text-slate-400 font-mono text-3xs align-top pt-3">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2.5 px-3 text-slate-800 font-medium align-top">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="font-bold text-slate-900">{prod.productName}</span>
                                      {itemType === 'SERVICE' ? (
                                        <span className="text-3xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                          Dịch vụ
                                        </span>
                                      ) : itemType === 'MATERIAL' ? (
                                        <span className="text-3xs font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                          Vật tư
                                        </span>
                                      ) : (
                                        <span className="text-3xs font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                          Máy
                                        </span>
                                      )}
                                    </div>
                                    {prod.productId && (
                                      <span className="font-mono text-3xs text-slate-500">Mã: {prod.productId}</span>
                                    )}
                                  </td>
                                  <td className="p-2.5 px-3 text-center font-mono font-bold text-slate-800 border-l border-slate-100 bg-slate-50/40 align-top pt-3">
                                    {prod.quantity} <span className="text-3xs text-slate-500 font-normal">{prod.unit || (itemType === 'SERVICE' ? 'Gói' : 'Cái')}</span>
                                  </td>
                                  <td className="p-2.5 px-3 text-xs border-l border-slate-100 align-top pt-3">
                                    {isMachine ? (
                                      <span className="inline-flex items-center gap-1 font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-3xs">
                                        <ShieldCheck size={11} className="shrink-0" />
                                        {warrantyDisplay}
                                      </span>
                                    ) : (
                                      <span className="text-3xs text-slate-400 italic">
                                        Không áp dụng serial
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2.5 px-3 border-l border-slate-100 bg-blue-50/20 align-top">
                                    {isMachine ? (
                                      <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                          <span className="text-3xs font-bold text-slate-600 uppercase">
                                            Serial máy ({curSerials.length}/{targetQty})
                                          </span>
                                          {isFilled ? (
                                            <span className="text-3xs font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-300">
                                              ✓ Đủ {targetQty} mã
                                            </span>
                                          ) : (
                                            <span className="text-3xs text-amber-700 font-semibold">
                                              (Nhập {targetQty} serial)
                                            </span>
                                          )}
                                        </div>
                                        <MachineCodeChipInput 
                                          value={curSerials}
                                          onChange={(newSerials) => {
                                            setProductSerials(prev => ({
                                              ...prev,
                                              [key]: newSerials
                                            }));
                                          }}
                                        />
                                      </div>
                                    ) : (
                                      <div className="p-2 bg-slate-50 border border-dashed border-slate-200 rounded text-center text-3xs text-slate-500 italic">
                                        {itemType === 'SERVICE' ? '🛠️ Dịch vụ kỹ thuật - Không cấp mã Serial máy' : '📦 Phụ tùng / Vật tư - Bàn giao theo số lượng'}
                                      </div>
                                    )}
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
                  </div>

                  {/* ZONE 4: KỸ THUẬT VIÊN GIAO MÁY, NGÀY KÝ NHẬN & GHI CHÚ BÀN GIAO */}
                  <div className="px-5 pb-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Wrench size={12} className="text-amber-600" /> 
                          Thợ giao máy / KTV kỹ thuật
                        </label>
                        <input 
                          {...register('thoGiaoMay')}
                          className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-white" 
                          placeholder="Họ tên thợ giao máy / KTV phụ trách..."
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Phone size={12} className="text-emerald-600" /> 
                          SĐT liên lạc thợ giao
                        </label>
                        <SmartPhoneInput 
                          value={watch('sdtThoGiaoMay')}
                          onChange={(val: string) => setValue('sdtThoGiaoMay', val, { shouldDirty: true })}
                          placeholder="09xx xxx xxx"
                          compact
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar size={12} className="text-blue-600" /> 
                            Ngày bàn giao thực tế <span className="text-red-500">*</span>
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setValue('ngayGiaoThucTe', new Date().toISOString().split('T')[0], { shouldDirty: true })}
                              className="text-3xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-1.5 py-0.2 rounded border border-blue-200 cursor-pointer"
                            >
                              Hôm nay
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                setValue('ngayGiaoThucTe', yesterday.toISOString().split('T')[0], { shouldDirty: true });
                              }}
                              className="text-3xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.2 rounded border border-slate-200 cursor-pointer"
                            >
                              Hôm qua
                            </button>
                          </div>
                        </div>
                        <input 
                          type="date" 
                          {...register('ngayGiaoThucTe')}
                          className="h-9 px-3 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 w-full focus:border-blue-600 outline-none bg-white" 
                        />
                        {errors.ngayGiaoThucTe && <p className="text-red-500 text-3xs font-medium">{errors.ngayGiaoThucTe.message}</p>}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-2xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <User size={12} className="text-blue-600" /> 
                            Người ký nhận bàn giao <span className="text-red-500">*</span>
                          </label>
                        </div>
                        <input 
                          {...register('kyNhan')}
                          className="h-9 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 w-full focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none bg-white" 
                          placeholder="Họ tên người nhận - SĐT / Chức vụ..."
                        />
                        {/* Quick Recipient Suggestions */}
                        {(() => {
                          const suggestions = Array.from(new Set([
                            delivery.nguoiLienHe,
                            delivery.nguoiDaiDien,
                            delivery.tenKhachHang
                          ])).filter(Boolean) as string[];
                          if (suggestions.length === 0) return null;
                          return (
                            <div className="flex flex-wrap items-center gap-1 pt-1">
                              <span className="text-3xs font-bold text-slate-400 uppercase tracking-wider">Gợi ý:</span>
                              {suggestions.map((name) => (
                                <button
                                  key={name}
                                  type="button"
                                  onClick={() => setValue('kyNhan', name, { shouldDirty: true, shouldValidate: true })}
                                  className="text-3xs font-medium bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-700 px-2 py-0.5 rounded-full border border-slate-200 hover:border-blue-200 transition-colors cursor-pointer"
                                >
                                  {name}
                                </button>
                              ))}
                            </div>
                          );
                        })()}
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
