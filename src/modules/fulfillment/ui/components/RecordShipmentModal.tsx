import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as Dialog from '@radix-ui/react-dialog';
import { motion } from 'motion/react';
import { 
  Truck, 
  Calendar, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Layers,
  ShieldCheck,
  Send,
  X,
  FileCheck,
  Building2
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatDate } from '@/src/shared/utils/formatDate';
import { 
  reconcileDeliveryShipments, 
  validateShipmentQuantities, 
  evaluateShipmentFinancialGate, 
  RemainingProductItem 
} from '../utils/delivery-reconciler';
import { notify } from '@/src/shared/utils/notify';

interface RecordShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  delivery: Delivery;
  allPayments?: any[];
  onSave: (shipment: DeliveryShipment, shouldSendZns: boolean) => Promise<void>;
}

export function RecordShipmentModal({
  isOpen,
  onClose,
  delivery,
  allPayments = [],
  onSave,
}: RecordShipmentModalProps) {
  const recon = useMemo(() => reconcileDeliveryShipments(delivery), [delivery]);
  const nextDotNum = recon.nextDotGiaoHang;

  // State of quantities being dispatched in this shipment per line item
  const [allocatedQuantities, setAllocatedQuantities] = useState<Record<number, number>>({});
  const [itemSerials, setItemSerials] = useState<Record<number, string>>({});
  const [autoSendZns, setAutoSendZns] = useState<boolean>(true);
  const [dacCachGiaoTruoc, setDacCachGiaoTruoc] = useState<boolean>(false);
  const [lyDoDacCach, setLyDoDacCach] = useState<string>('');
  const [nguoiPheDuyetDacCach, setNguoiPheDuyetDacCach] = useState<string>('');

  // Default form schema
  const FormSchema = z.object({
    soPhieuXuat: z.string().min(1, 'Số phiếu xuất kho là bắt buộc'),
    ngayGiaoMay: z.string().min(1, 'Vui lòng chọn ngày giao hàng'),
    thoGiaoMay: z.string().optional(),
    sdtThoGiaoMay: z.string().optional(),
    donViVanChuyen: z.string().optional(),
    soDienThoaiDonViVanChuyen: z.string().optional(),
    khoXuat: z.string().optional(),
    keToanKho: z.string().optional(),
    ghiChu: z.string().optional(),
  });

  type FormValues = z.infer<typeof FormSchema>;

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, reset, watch } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      soPhieuXuat: '',
      ngayGiaoMay: new Date().toISOString().split('T')[0],
      thoGiaoMay: delivery.thoGiaoMay || '',
      sdtThoGiaoMay: delivery.sdtThoGiaoMay || '',
      donViVanChuyen: delivery.donViVanChuyen || '',
      soDienThoaiDonViVanChuyen: delivery.soDienThoaiDonViVanChuyen || '',
      khoXuat: delivery.khoXuat || 'Kho SGM Tổng',
      keToanKho: delivery.keToanKho || '',
      ghiChu: `Giao hàng đợt ${nextDotNum} - ${delivery.soHopDong ? `HĐ ${delivery.soHopDong}` : `ĐH ${delivery.soDonHang || ''}`}`,
    }
  });

  // Initialize or reset allocation when modal opens
  useEffect(() => {
    if (isOpen) {
      const year = new Date().getFullYear();
      const defaultPx = `PXK-${year}-${String(nextDotNum).padStart(2, '0')}${String(Math.floor(Math.random() * 899 + 100))}`;
      
      reset({
        soPhieuXuat: defaultPx,
        ngayGiaoMay: new Date().toISOString().split('T')[0],
        thoGiaoMay: delivery.thoGiaoMay || '',
        sdtThoGiaoMay: delivery.sdtThoGiaoMay || '',
        donViVanChuyen: delivery.donViVanChuyen || '',
        soDienThoaiDonViVanChuyen: delivery.soDienThoaiDonViVanChuyen || '',
        khoXuat: delivery.khoXuat || 'Kho SGM Tổng',
        keToanKho: delivery.keToanKho || '',
        ghiChu: `Xuất kho đợt ${nextDotNum} - ${delivery.soHopDong ? `HĐ ${delivery.soHopDong}` : (delivery.soDonHang || delivery.soPhieuBaoGia || '')}`,
      });

      // Initialize allocations with remaining quantities by default
      const initialAlloc: Record<number, number> = {};
      const initialSerials: Record<number, string> = {};
      recon.remainingProducts.forEach((p, idx) => {
        initialAlloc[idx] = p.remainingQuantity > 0 ? p.remainingQuantity : 0;
        initialSerials[idx] = '';
      });
      setAllocatedQuantities(initialAlloc);
      setItemSerials(initialSerials);
      setDacCachGiaoTruoc(false);
      setLyDoDacCach('');
      setNguoiPheDuyetDacCach('');
      setAutoSendZns(true);
    }
  }, [isOpen, recon, delivery, nextDotNum, reset]);

  // Handle line item quantity allocation change
  const handleQuantityChange = (idx: number, maxAllowed: number, rawVal: string) => {
    const parsed = parseFloat(rawVal);
    const safeQty = isNaN(parsed) ? 0 : Math.max(0, Math.min(maxAllowed, parsed));
    setAllocatedQuantities(prev => ({ ...prev, [idx]: safeQty }));
  };

  // Quick helper: Ship all remaining
  const handleShipAllRemaining = () => {
    const allAlloc: Record<number, number> = {};
    recon.remainingProducts.forEach((p, idx) => {
      allAlloc[idx] = p.remainingQuantity;
    });
    setAllocatedQuantities(allAlloc);
  };

  // Quick helper: Clear to 0
  const handleClearAll = () => {
    const zeroAlloc: Record<number, number> = {};
    recon.remainingProducts.forEach((_, idx) => {
      zeroAlloc[idx] = 0;
    });
    setAllocatedQuantities(zeroAlloc);
  };

  // Compute live shipment metrics
  const totalShippedThisRound = Object.values(allocatedQuantities).reduce((sum, q) => sum + (Number(q) || 0), 0);
  const totalBaseline = recon.totalBaselineQuantity;
  const previouslyShipped = recon.totalShippedQuantity;
  const cumulativeProjected = previouslyShipped + totalShippedThisRound;
  const remainingAfterProjected = Math.max(0, totalBaseline - cumulativeProjected);

  const pctPrev = totalBaseline > 0 ? Math.min(100, Math.round((previouslyShipped / totalBaseline) * 100)) : 0;
  const pctThis = totalBaseline > 0 ? Math.min(100 - pctPrev, Math.round((totalShippedThisRound / totalBaseline) * 100)) : 0;
  const pctRem = Math.max(0, 100 - pctPrev - pctThis);

  // Compute live value of items being shipped this round
  const currentShipmentValue = useMemo(() => {
    return recon.remainingProducts.reduce((sum, p, idx) => {
      const q = allocatedQuantities[idx] || 0;
      const unitPrice = Number(p.price) || 0;
      return sum + (q * unitPrice);
    }, 0);
  }, [recon.remainingProducts, allocatedQuantities]);

  // Financial Gate Check
  const financialGate = useMemo(() => {
    return evaluateShipmentFinancialGate(delivery, currentShipmentValue, allPayments);
  }, [delivery, currentShipmentValue, allPayments]);

  const onSubmit = async (values: FormValues) => {
    if (totalShippedThisRound <= 0) {
      notify.error('Vui lòng phân bổ số lượng xuất kho lớn hơn 0 cho ít nhất một sản phẩm.');
      return;
    }

    // Build shipment products list
    const shipmentProducts: ProductItem[] = [];
    const collectedMachineCodes: string[] = [];

    recon.remainingProducts.forEach((p, idx) => {
      const qty = allocatedQuantities[idx] || 0;
      if (qty > 0) {
        const serial = itemSerials[idx]?.trim();
        if (serial) {
          collectedMachineCodes.push(serial);
        }
        shipmentProducts.push({
          ...p,
          quantity: qty,
          machineCode: serial || p.machineCode,
        });
      }
    });

    // Validate quantities against remaining allowances
    const validation = validateShipmentQuantities(shipmentProducts, recon.remainingProducts);
    if (!validation.isValid) {
      notify.error(validation.errors[0] || 'Số lượng xuất kho không hợp lệ.');
      return;
    }

    // Validate financial gate if shortfall requires waiver
    if (financialGate.requiresExecutiveWaiver && !dacCachGiaoTruoc) {
      notify.error('Đợt giao hàng chưa đủ điều kiện công nợ. Vui lòng kích hoạt và nhập thông tin Đặc cách Ban Giám Đốc.');
      return;
    }

    const isFinalRound = remainingAfterProjected === 0;

    const newShipment: DeliveryShipment = {
      id: `DOT-${nextDotNum}`,
      dotGiaoHang: nextDotNum,
      soPhieuXuat: values.soPhieuXuat.trim(),
      ngayGiaoMay: values.ngayGiaoMay,
      ngayGiaoThucTe: null,
      tinhTrangGiaoHang: 'CHO_GIAO',
      tinhTrangNghiemThu: 'DONG_Y',
      products: shipmentProducts,
      danhSachMaMay: collectedMachineCodes.length > 0 ? collectedMachineCodes : (delivery.danhSachMaMay || []),
      slMay: totalShippedThisRound,
      dvt: shipmentProducts[0]?.unit || delivery.dvt || 'Máy',
      thoGiaoMay: values.thoGiaoMay?.trim() || '',
      sdtThoGiaoMay: values.sdtThoGiaoMay?.trim() || '',
      donViVanChuyen: values.donViVanChuyen?.trim() || '',
      soDienThoaiDonViVanChuyen: values.soDienThoaiDonViVanChuyen?.trim() || '',
      khoXuat: values.khoXuat?.trim() || '',
      keToanKho: values.keToanKho?.trim() || '',
      ghiChu: values.ghiChu?.trim() || '',
      dacCachGiaoTruoc,
      lyDoDacCach: dacCachGiaoTruoc ? lyDoDacCach.trim() : undefined,
      nguoiPheDuyetDacCach: dacCachGiaoTruoc ? nguoiPheDuyetDacCach.trim() : undefined,
      isDotCuoiCung: isFinalRound,
      giaTriXuatKhoDotNay: currentShipmentValue,
      createdAt: new Date().toISOString(),
    };

    await onSave(newShipment, autoSendZns);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[250] transition-opacity animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl z-[260] overflow-hidden border border-slate-200">
          
          {/* MODAL HEADER */}
          <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Truck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Dialog.Title className="text-base font-bold text-white tracking-tight">
                    Ghi Nhận Đợt Giao Hàng Mới
                  </Dialog.Title>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 font-extrabold text-2xs uppercase tracking-wider">
                    Đợt {nextDotNum}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium mt-0.5">
                  Hồ sơ Master: <span className="font-mono text-white font-semibold">{delivery.deliveryId}</span>
                  {delivery.soHopDong ? ` • HĐ: ${delivery.soHopDong}` : (delivery.soDonHang ? ` • ĐH: ${delivery.soDonHang}` : '')}
                  {delivery.tenKhachHang ? ` • ${delivery.tenKhachHang}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* SCROLLABLE BODY */}
          <form id="recordShipmentForm" onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. TRI-SEGMENT MILESTONE PROGRESS BAR */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <Layers size={14} className="text-blue-600" />
                  <span>Tiến độ thực xuất đơn hàng (Omni-Milestone Nexus)</span>
                </div>
                <div className="font-mono text-2xs font-bold text-slate-600">
                  Tổng đơn hàng: <span className="text-slate-900 font-black">{totalBaseline}</span> SP
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                {pctPrev > 0 && (
                  <div 
                    style={{ width: `${pctPrev}%` }} 
                    className="bg-emerald-500 h-full transition-all duration-300 relative group"
                    title={`Đã xuất trước: ${previouslyShipped} SP (${pctPrev}%)`}
                  />
                )}
                {pctThis > 0 && (
                  <div 
                    style={{ width: `${pctThis}%` }} 
                    className="bg-blue-600 h-full transition-all duration-300 relative group animate-pulse"
                    title={`Xuất đợt ${nextDotNum}: ${totalShippedThisRound} SP (${pctThis}%)`}
                  />
                )}
                {pctRem > 0 && (
                  <div 
                    style={{ width: `${pctRem}%` }} 
                    className="bg-slate-200 h-full transition-all duration-300"
                    title={`Còn lại: ${remainingAfterProjected} SP (${pctRem}%)`}
                  />
                )}
              </div>

              {/* Metric Breakdown Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-2xs pt-1">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg py-1.5 px-2">
                  <span className="text-emerald-700 font-medium block">Đã xuất trước:</span>
                  <span className="text-emerald-900 font-bold font-mono text-xs">{previouslyShipped} SP ({pctPrev}%)</span>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg py-1.5 px-2">
                  <span className="text-blue-700 font-medium block">Đợt này xuất:</span>
                  <span className="text-blue-900 font-bold font-mono text-xs">{totalShippedThisRound} SP ({pctThis}%)</span>
                </div>
                <div className="bg-slate-100 border border-slate-200 rounded-lg py-1.5 px-2">
                  <span className="text-slate-600 font-medium block">Còn lại sau đợt:</span>
                  <span className="text-slate-800 font-bold font-mono text-xs">{remainingAfterProjected} SP ({pctRem}%)</span>
                </div>
              </div>
            </div>

            {/* 2. PRODUCT ALLOCATION TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package size={16} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Phân bổ sản phẩm xuất kho đợt {nextDotNum}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShipAllRemaining}
                    className="text-3xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded border border-blue-200 transition-colors"
                  >
                    Xuất hết còn lại
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-3xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 px-2 py-1 rounded border border-slate-200 transition-colors"
                  >
                    Đặt lại về 0
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-3xs font-bold text-slate-600 uppercase tracking-wider">
                      <th className="p-2.5 text-center w-10">STT</th>
                      <th className="p-2.5 min-w-[200px]">Sản phẩm & Quy cách</th>
                      <th className="p-2.5 text-center w-16">ĐVT</th>
                      <th className="p-2.5 text-right w-20">Tổng HĐ</th>
                      <th className="p-2.5 text-right w-20">Đã giao</th>
                      <th className="p-2.5 text-right w-20">Còn lại</th>
                      <th className="p-2.5 text-right w-28 bg-blue-50/50">Xuất đợt {nextDotNum}</th>
                      <th className="p-2.5 min-w-[140px]">Serial / Mã máy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {recon.remainingProducts.map((p, idx) => {
                      const curAlloc = allocatedQuantities[idx] ?? 0;
                      const isExhausted = p.remainingQuantity <= 0;

                      return (
                        <tr key={idx} className={`hover:bg-slate-50/80 transition-colors ${isExhausted ? 'opacity-50 bg-slate-50/40' : ''}`}>
                          <td className="p-2.5 text-center font-mono text-2xs text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="p-2.5">
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-900 leading-tight">
                                {p.productName || '---'}
                              </span>
                              {p.productId && (
                                <span className="font-mono text-3xs text-blue-600 font-medium">
                                  Mã: {p.productId}
                                </span>
                              )}
                              {p.quyCach && (
                                <span className="text-3xs text-slate-500 italic">
                                  {p.quyCach}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center text-2xs font-medium text-slate-600">
                            {p.unit || 'Cái'}
                          </td>
                          <td className="p-2.5 text-right font-mono text-2xs text-slate-600 font-bold">
                            {p.baselineQuantity}
                          </td>
                          <td className="p-2.5 text-right font-mono text-2xs text-emerald-700 font-semibold">
                            {p.shippedQuantity}
                          </td>
                          <td className="p-2.5 text-right font-mono text-2xs text-amber-700 font-bold">
                            {p.remainingQuantity}
                          </td>
                          <td className="p-2 bg-blue-50/30">
                            <input
                              type="number"
                              step="any"
                              min={0}
                              max={p.remainingQuantity}
                              disabled={isExhausted}
                              value={curAlloc === 0 ? '' : curAlloc}
                              placeholder={isExhausted ? 'Đã đủ' : '0'}
                              onChange={(e) => handleQuantityChange(idx, p.remainingQuantity, e.target.value)}
                              className={`w-full text-right font-mono font-bold text-xs p-1.5 rounded border outline-none transition-colors ${
                                curAlloc > 0 
                                  ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-300' 
                                  : 'bg-white border-slate-200 text-slate-700'
                              } disabled:bg-slate-100 disabled:text-slate-400`}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              disabled={isExhausted || curAlloc === 0}
                              value={itemSerials[idx] || ''}
                              onChange={(e) => setItemSerials(prev => ({ ...prev, [idx]: e.target.value }))}
                              placeholder="Nhập serial nếu có..."
                              className="w-full text-xs font-mono p-1.5 rounded border border-slate-200 outline-none bg-white focus:border-blue-400 placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. LOGISTICS & DISPATCH METADATA */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Thông tin chứng từ & vận chuyển xuất kho
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1">
                    Số phiếu xuất kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    {...register('soPhieuXuat')}
                    placeholder="VD: PXK-2026-001"
                    className="w-full text-xs font-mono font-bold p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none uppercase"
                  />
                  {errors.soPhieuXuat && (
                    <span className="text-3xs text-red-500 font-semibold">{errors.soPhieuXuat.message}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1">
                    Ngày hẹn giao <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    {...register('ngayGiaoMay')}
                    className="w-full text-xs font-mono font-bold p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none cursor-pointer"
                  />
                  {errors.ngayGiaoMay && (
                    <span className="text-3xs text-red-500 font-semibold">{errors.ngayGiaoMay.message}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">
                    Kho xuất hàng
                  </label>
                  <input
                    type="text"
                    {...register('khoXuat')}
                    placeholder="Kho SGM Tổng"
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">
                    Thợ giao máy / Kỹ thuật
                  </label>
                  <input
                    type="text"
                    {...register('thoGiaoMay')}
                    placeholder="Tên thợ giao"
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">
                    SĐT Thợ giao máy
                  </label>
                  <input
                    type="text"
                    {...register('sdtThoGiaoMay')}
                    placeholder="09..."
                    className="w-full text-xs font-mono p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">
                    Đơn vị vận chuyển
                  </label>
                  <input
                    type="text"
                    {...register('donViVanChuyen')}
                    placeholder="Nhà xe / Xe tải riêng"
                    className="w-full text-xs font-medium p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <label className="text-2xs font-bold text-slate-700 uppercase tracking-tight">
                  Ghi chú đợt giao này
                </label>
                <input
                  type="text"
                  {...register('ghiChu')}
                  placeholder="Ghi chú hướng dẫn giao hàng, số điện thoại tài xế..."
                  className="w-full text-xs font-medium p-2 rounded-lg border border-slate-200 focus:border-blue-400 outline-none"
                />
              </div>
            </div>

            {/* 4. FINANCIAL GATE & EXECUTIVE WAIVER */}
            {financialGate.requiresExecutiveWaiver && (
              <div className="bg-amber-50/80 border border-amber-300 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-amber-700 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <span className="font-bold text-amber-900 block text-sm">
                      Cảnh báo Cổng Tài Chính (Shipment-Value Financial Gate)
                    </span>
                    <p className="text-amber-800 mt-0.5 leading-relaxed">
                      {financialGate.warningMessage}
                    </p>
                    <div className="flex items-center gap-4 mt-2 font-mono text-2xs">
                      <span>Đã thanh toán: <strong className="text-emerald-800">{formatCurrency(financialGate.totalPaid)}</strong></span>
                      <span>Lũy kế xuất kho: <strong className="text-amber-900">{formatCurrency(financialGate.cumulativeShippedValue)}</strong></span>
                      <span>Thiếu: <strong className="text-red-700">{formatCurrency(financialGate.shortfallAmount)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-amber-200/80 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dacCachGiaoTruoc}
                      onChange={(e) => setDacCachGiaoTruoc(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold text-amber-900">
                      Kích hoạt Đặc Cách Ban Giám Đốc cho đợt giao hàng này
                    </span>
                  </label>

                  {dacCachGiaoTruoc && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <label className="text-2xs font-bold text-amber-900 uppercase">
                          Người phê duyệt đặc cách <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={nguoiPheDuyetDacCach}
                          onChange={(e) => setNguoiPheDuyetDacCach(e.target.value)}
                          placeholder="VD: Ban Giám Đốc / Anh Long"
                          className="w-full text-xs font-semibold p-2 bg-white rounded-lg border border-amber-300 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-2xs font-bold text-amber-900 uppercase">
                          Lý do đặc cách xuất trước <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={lyDoDacCach}
                          onChange={(e) => setLyDoDacCach(e.target.value)}
                          placeholder="VD: Khách hàng thân thiết, cam kết thanh toán đợt sau..."
                          className="w-full text-xs font-medium p-2 bg-white rounded-lg border border-amber-300 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. ZNS NOTIFICATION DISPATCH TOGGLE */}
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Send size={16} className="text-blue-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-blue-900 block">
                    Gửi tin nhắn ZNS thông báo giao hàng cho đợt {nextDotNum}
                  </span>
                  <span className="text-3xs text-blue-700">
                    Gửi đúng 9 biến Zalo đã đăng ký theo số phiếu xuất {watch('soPhieuXuat') || 'PXK'} và ngày giao đợt này.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSendZns}
                  onChange={(e) => setAutoSendZns(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </form>

          {/* MODAL FOOTER */}
          <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="text-2xs text-slate-500 font-mono">
              Tổng xuất đợt này: <strong className="text-blue-700 text-xs">{totalShippedThisRound}</strong> SP
              {currentShipmentValue > 0 && (
                <> • Giá trị: <strong className="text-slate-800">{formatCurrency(currentShipmentValue)}</strong></>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Hủy bỏ
              </Button>
              <Button
                type="submit"
                form="recordShipmentForm"
                disabled={isSubmitting || totalShippedThisRound <= 0}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm flex items-center gap-2"
              >
                <FileCheck size={16} />
                <span>{isSubmitting ? 'Đang lưu trữ...' : `Lưu & Xuất kho Đợt ${nextDotNum}`}</span>
              </Button>
            </div>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
