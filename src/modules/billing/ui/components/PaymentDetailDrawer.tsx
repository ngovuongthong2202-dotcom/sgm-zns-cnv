/* eslint-disable max-lines */
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { Payment, PaymentInstallment } from '@/src/domain/schema/payment.schema';
import { CreditCard, Calendar, Clock, Send, DollarSign, Edit, Package, Plus } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { StatusPill } from '@/src/widgets/StatusPill';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';
import { DocumentOmniFlowRibbon } from '@/src/widgets/DocumentOmniFlowRibbon';
import { UnifiedActivityAuditNexus } from '@/src/widgets/UnifiedActivityAuditNexus';
import { ContractHoverCard } from '@/src/modules/contracts/ui/components/ContractHoverCard';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';
import { DrawerHeaderCockpitHUD } from '@/src/widgets/DrawerHeaderCockpitHUD';
import { RecordInstallmentModal } from './RecordInstallmentModal';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { notify } from '@/src/shared/utils/notify';
import { checkProductionTriggerThreshold, ProductionTriggerResult } from '@/src/shared/utils/vietnamBusinessDays';
import { calculateMachineAllocation } from '@/src/shared/utils/voucherResolver';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { isSameCustomer } from '@/src/shared/utils/customerIdentityResolver';
import { DeliveryFormModal } from '@/src/modules/fulfillment/ui/components/DeliveryFormModal';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { Truck } from 'lucide-react';

import { Button } from '@/src/design-system/Button';
import { useConfirm } from '@/src/design-system/Confirm';
import { resolveDeliverySourceDocument } from '@/src/modules/fulfillment/ui/utils/deliverySourceResolver';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { resolvePaymentLoai } from '@/src/modules/billing/domain/resolvePaymentLoai';
import { QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';

interface PaymentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  onEdit?: (payment: Payment) => void;
  onSendZns?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
  onUpdate?: (id: string, data: Partial<Payment>) => Promise<void>;
  modal?: boolean;
  className?: string;
}

export function PaymentDetailDrawer({
  isOpen,
  onClose,
  payment,
  onEdit,
  onSendZns,
  onDelete,
  onUpdate,
  modal,
  className,
}: PaymentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'nexus'>('overview');
  const [flowFocusTarget, setFlowFocusTarget] = useState<'quotation' | 'contract' | 'delivery' | 'payment'>('payment');
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
  const [activeDeliveryPrefill, setActiveDeliveryPrefill] = useState<any>(null);
  const { nguoiPhuTrachList } = useSharedFields();
  const { confirm } = useConfirm();

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
      setFlowFocusTarget('payment');
    }
  }, [isOpen, payment?.id]);

  const paymentId = payment?.id || '';
  const contractId = payment?.contractId || '';
  const { data: contractDoc } = useSWR<any>(
    isOpen && payment.contractId ? `contracts:${payment.contractId}` : null,
    swrDocFetcher
  );

  const { data: customerDoc } = useSWR<any>(
    isOpen && payment.customerId ? `customers:${payment.customerId}` : null,
    swrDocFetcher
  );

  // Lineage fallback: resolve quotationId directly from payment or indirectly through linked contractDoc
  const quotationId = payment.quotationId || contractDoc?.quotationId;
  const filterKey = contractId ? `contractId:${contractId}` : quotationId ? `quotationId:${quotationId}` : null;

  const { data: _quotationDoc } = useSWR<any>(
    isOpen && quotationId ? `quotations:${quotationId}` : null,
    swrDocFetcher
  );
  const { data: rawDeliveries = [], isLoading: dLoading } = useSWR<any[]>(
    isOpen && filterKey
      ? `deliveries:500:${filterKey}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const deliveries = useMemo(() => {
    const map = new Map<string, any>();
    (rawDeliveries || []).forEach((d) => {
      if (d && d.id && (!payment || isSameCustomer(payment, d))) {
        map.set(d.id, d);
      }
    });

    try {
      const cached = entityCachePool.getAll<any>('deliveries');
      if (cached && Array.isArray(cached)) {
        cached.forEach((d) => {
          if (!d || !d.id) return;
          if (payment && !isSameCustomer(payment, d)) return;

          const matchPaymentId = d.paymentId && d.paymentId === payment?.id;
          const matchContractId = (contractId && d.contractId === contractId) || (contractDoc?.id && d.contractId === contractDoc.id);
          const matchSoHopDong = (payment?.soHopDong && (d.soHopDong === payment.soHopDong || d.contractSoHopDong === payment.soHopDong)) ||
                                 (contractDoc?.soHopDong && d.soHopDong === contractDoc.soHopDong);
          const matchSoDonHang = payment?.soDonHang && (d.soDonHang === payment.soDonHang || d.soChungTuThamChieu === payment.soDonHang);
          const matchQuotationId = quotationId && d.quotationId === quotationId;

          if (matchPaymentId || matchContractId || matchSoHopDong || matchSoDonHang || matchQuotationId) {
            map.set(d.id, { ...map.get(d.id), ...d });
          }
        });
      }
    } catch {
      // ignore
    }

    return Array.from(map.values());
  }, [rawDeliveries, payment, contractId, contractDoc, quotationId]);

  const { data: siblingPayments = [], isLoading: pLoading } = useSWR<any[]>(
    isOpen && filterKey
      ? `payments:500:${filterKey}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const allRelatedPayments = useMemo(() => {
    const map = new Map<string, any>();
    if (payment?.id) map.set(payment.id, payment);
    (siblingPayments || []).forEach((p) => {
      if (p.id && (!payment || isSameCustomer(payment, p))) {
        map.set(p.id, p);
      }
    });
    return Array.from(map.values());
  }, [payment, siblingPayments]);

  const totalPayable = payment ? (payment.totalAmount || (payment as any).tongTienCanThanhToan || payment.soTien || 0) : 0;
  const remainingDebt = payment ? Math.max(0, totalPayable - (payment.soTien || 0)) : 0;

  // Thuật toán Contact Cascading để tìm chính xác họ tên người đại diện nộp tiền
  const payerName = useMemo(() => {
    if (!payment) return '';
    if (payment.tenNguoiNop && payment.tenNguoiNop.trim()) return payment.tenNguoiNop.trim();
    if (contractDoc?.nguoiDaiDien && contractDoc.nguoiDaiDien.trim()) return contractDoc.nguoiDaiDien.trim();
    if (_quotationDoc?.nguoiLienHe && _quotationDoc.nguoiLienHe.trim()) return _quotationDoc.nguoiLienHe.trim();
    if (customerDoc?.contacts?.length) {
      if (payment.sdt) {
        const matched = customerDoc.contacts.find((c: any) => c.sdt === payment.sdt || (c.danhSachSdt && c.danhSachSdt.includes(payment.sdt)));
        if (matched?.nguoiDaiDien && matched.nguoiDaiDien.trim()) return matched.nguoiDaiDien.trim();
      }
      if (customerDoc.contacts[0]?.nguoiDaiDien && customerDoc.contacts[0].nguoiDaiDien.trim()) {
        return customerDoc.contacts[0].nguoiDaiDien.trim();
      }
    }
    if (customerDoc?.nguoiDaiDien && customerDoc.nguoiDaiDien.trim()) return customerDoc.nguoiDaiDien.trim();
    if (payment.tenKhachHang && payment.tenKhachHang.trim()) return payment.tenKhachHang.trim();
    return 'Chưa cập nhật người đại diện';
  }, [payment, contractDoc?.nguoiDaiDien, _quotationDoc?.nguoiLienHe, customerDoc?.contacts, customerDoc?.nguoiDaiDien]);

  // Sổ cái các đợt thu (Multi-installment Ledger)
  const effectiveInstallments: PaymentInstallment[] = useMemo(() => {
    if (!payment) return [];
    if (payment.cacDotThu && payment.cacDotThu.length > 0) {
      return payment.cacDotThu;
    }
    if (payment.soTien && payment.soTien > 0) {
      return [{
        id: 'DOT-1-INIT',
        lanThu: 1,
        soTien: payment.soTien,
        ngayThu: payment.ngayThanhToan || payment.createdAt || new Date().toISOString().split('T')[0],
        phuongThucThanhToan: payment.phuongThucThanhToan || 'Chuyển khoản',
        soChungTuThamChieu: payment.soChungTu || '',
        nguoiNop: payerName,
        ghiChu: payment.ghiChu || 'Đợt thu ban đầu',
      }];
    }
    return [];
  }, [payment, payerName]);

  // Đánh giá ngưỡng kích hoạt sản xuất theo Lịch & Ngân quỹ Apex Sovereign 15.0 & Chronos-Fabric
  const triggerThresholdInfo: ProductionTriggerResult = useMemo(() => {
    if (!payment) {
      return {
        isTriggered: false,
        triggerDate: null,
        triggerType: 'FULL_INSTALLMENT_1' as const,
        totalPaid: 0,
        requiredThresholdAmount: 0,
        thresholdPercent: 30,
        statusLabel: '',
        isPostDeliverySettlement: false,
      };
    }
    const isSpecialWaiver = Boolean(
      payment.dacCachGiaoTruoc || 
      payment.isExempted || 
      contractDoc?.dacCachGiaoTruoc || 
      contractDoc?.isExempted ||
      deliveries.some((d: any) => d.dacCachGiaoTruoc || d.isExempted || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU')
    );
    return checkProductionTriggerThreshold([payment], totalPayable, 30, { 
      deliveries,
      isDacCachGiaoTruoc: isSpecialWaiver,
    });
  }, [payment, totalPayable, deliveries, contractDoc]);

  const paymentLoai = useMemo(() => payment ? resolvePaymentLoai(payment) : QUOTATION_LOAI.MAY, [payment]);

  const depositAchievedText = useMemo(() => {
    const pct = Math.round(totalPayable > 0 ? (triggerThresholdInfo.totalPaid / totalPayable) * 100 : 100);
    if (paymentLoai === QUOTATION_LOAI.DICH_VU) {
      return `🛠️ Đã đạt cọc dịch vụ (${pct}% ≥ ${triggerThresholdInfo.thresholdPercent}%)`;
    }
    if (paymentLoai === QUOTATION_LOAI.VAT_TU) {
      return `📦 Đã đạt cọc xuất kho (${pct}% ≥ ${triggerThresholdInfo.thresholdPercent}%)`;
    }
    return `🎯 Đã đạt cọc sản xuất (${pct}% ≥ ${triggerThresholdInfo.thresholdPercent}%)`;
  }, [paymentLoai, totalPayable, triggerThresholdInfo]);

  const depositPendingText = useMemo(() => {
    const pct = Math.round(totalPayable > 0 ? (triggerThresholdInfo.totalPaid / totalPayable) * 100 : 0);
    const deficit = formatCurrency(Math.max(0, triggerThresholdInfo.requiredThresholdAmount - triggerThresholdInfo.totalPaid));
    if (paymentLoai === QUOTATION_LOAI.DICH_VU) {
      return `⏳ Chưa đủ cọc dịch vụ (đạt ${pct}%/${triggerThresholdInfo.thresholdPercent}% - thiếu ${deficit})`;
    }
    if (paymentLoai === QUOTATION_LOAI.VAT_TU) {
      return `⏳ Chưa đủ cọc xuất kho (đạt ${pct}%/${triggerThresholdInfo.thresholdPercent}% - thiếu ${deficit})`;
    }
    return `⏳ Chưa đủ cọc SX (đạt ${pct}%/${triggerThresholdInfo.thresholdPercent}% - thiếu ${deficit})`;
  }, [paymentLoai, totalPayable, triggerThresholdInfo]);

  const triggerBadgeText = useMemo(() => {
    if (triggerThresholdInfo.isPostDeliverySettlement) {
      return paymentLoai === QUOTATION_LOAI.DICH_VU ? '💳 Tất toán sau dịch vụ' : paymentLoai === QUOTATION_LOAI.VAT_TU ? '💳 Tất toán sau giao hàng' : '💳 Tất toán sau giao máy';
    }
    if (paymentLoai === QUOTATION_LOAI.DICH_VU) return '🛠️ Kích hoạt dịch vụ';
    if (paymentLoai === QUOTATION_LOAI.VAT_TU) return '📦 Kích hoạt xuất kho';
    return '🎯 Kích hoạt SX';
  }, [triggerThresholdInfo.isPostDeliverySettlement, paymentLoai]);

  const triggerInstallmentIdx = useMemo(() => {
    if (!triggerThresholdInfo.isTriggered || !effectiveInstallments || effectiveInstallments.length === 0) return -1;
    let running = 0;
    for (let i = 0; i < effectiveInstallments.length; i++) {
      running += Number(effectiveInstallments[i].soTien || 0);
      if (running >= triggerThresholdInfo.requiredThresholdAmount) {
        return i;
      }
    }
    return 0;
  }, [triggerThresholdInfo, effectiveInstallments]);

  if (!payment) return null;


  const handleSaveInstallment = async (
    newInstallment: PaymentInstallment,
    newTotalPaid: number,
    newRemaining: number,
    newStatus: string,
    shouldSendZns?: boolean
  ) => {
    try {
      const updatedInstallments = [...effectiveInstallments, newInstallment];
      const payload: Partial<Payment> = {
        cacDotThu: updatedInstallments,
        soTien: newTotalPaid,
        congNoConLai: newRemaining,
        tinhTrangThanhToan: newStatus,
        ngayThanhToan: newInstallment.ngayThu,
        phuongThucThanhToan: newInstallment.phuongThucThanhToan,
        soChungTu: newInstallment.soChungTuThamChieu || payment.soChungTu,
        tenNguoiNop: newInstallment.nguoiNop || payment.tenNguoiNop,
      };

      if (onUpdate && payment.id) {
        await onUpdate(payment.id, payload);
      } else if (payment.id) {
        await repositoryFactory.get('payments').update(payment.id, payload);
      }
      notify.success(`Đã ghi nhận Đợt ${newInstallment.lanThu} (${formatCurrency(newInstallment.soTien)}) thành công!`);

      if (shouldSendZns && onSendZns) {
        const mergedPayment: Payment = {
          ...payment,
          ...payload,
          soTien: newTotalPaid,
          congNoConLai: newRemaining,
          tinhTrangThanhToan: newStatus,
          cacDotThu: updatedInstallments,
        };
        onSendZns(mergedPayment);
      }
    } catch (err: any) {
      notify.error('Lỗi khi ghi nhận đợt thu: ' + (err.message || 'Lỗi không xác định'));
    }
  };

  // 1. TỔNG QUAN TAB (OMNI-NEXUS COD 11.0)
  const overviewPanel = (
    <div className="space-y-5 pt-1 pb-6">
      {/* Executive Waiver Debt Reminder Banner */}
      {(() => {
        const waiverDelivery = (deliveries || []).find((d: any) => d.dacCachGiaoTruoc || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU');
        if (!waiverDelivery) return null;
        return (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Đặc cách Ban Giám Đốc: Đã xuất kho trước khi thanh toán
                </span>
                <span className="text-3xs font-mono font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                  Phiếu GH: {waiverDelivery.deliveryId || '---'}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                Đơn hàng này đã được <strong>{waiverDelivery.nguoiPheDuyetDacCach || 'Ban Giám Đốc'}</strong> chỉ định giao hàng trước. Kế toán lưu ý theo dõi sát sao tiến độ thu tiền và nhắc nhở khách hàng tất toán đúng hạn.
              </p>
              {waiverDelivery.lyDoDacCach && (
                <div className="mt-1.5 text-2xs text-amber-900 font-mono bg-white/70 p-2 rounded border border-amber-200/80">
                  <strong>Căn cứ / Lý do:</strong> {waiverDelivery.lyDoDacCach}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Main Workspace: Asymmetric 70% Matrix / 30% Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ===================== CỘT CHÍNH (70%): TREASURY HERO & BẢNG SẢN PHẨM ===================== */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Khối 1: Treasury Hero Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  TÌNH TRẠNG THANH TOÁN
                </h3>
              </div>
              <span className="text-2xs uppercase font-bold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                {payment.tinhTrangThanhToan || 'Đã ghi nhận'}
              </span>
            </div>

            {/* Hero Amount Banner */}
            <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200 rounded-xl mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-3xs uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5 mb-1">
                  <DollarSign size={13} className="text-emerald-600" /> SỐ TIỀN THỰC THU LŨY KẾ
                </span>
                <div className="font-currency font-black text-2xl md:text-3xl text-emerald-800 tabular-nums">
                  {formatCurrency(payment.soTien || 0)}
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-2 text-xs">
                {remainingDebt > 0 && (
                  <Button
                    onClick={() => setIsRecordModalOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-8 px-3 shadow-xs"
                  >
                    <Plus size={13} className="mr-1" /> Ghi nhận đợt thu mới
                  </Button>
                )}
                <div className="flex items-center gap-1 text-slate-500 text-3xs">
                  <span>Phương thức:</span>
                  <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {payment.phuongThucThanhToan || 'Chuyển khoản'}
                  </span>
                </div>
              </div>
            </div>

            {/* Đối soát dòng tiền 3 con số */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-600 block mb-0.5">Ngày thực thu gần nhất</span>
                <span className="font-currency font-bold text-slate-900 text-xs flex items-center gap-1">
                  <Calendar size={12} className="text-slate-500" />
                  {formatDate(payment.ngayThanhToan)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-600 block mb-0.5">Hạn chót thanh toán</span>
                <span className="font-currency font-bold text-amber-900 text-xs flex items-center gap-1">
                  <Clock size={12} className="text-amber-600" />
                  {payment.ngayDenHan ? formatDate(payment.ngayDenHan) : 'Không ghi nhận'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-600 block mb-0.5">Công nợ còn lại</span>
                <span className={`font-currency font-black text-xs ${remainingDebt > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                  {remainingDebt > 0 ? formatCurrency(remainingDebt) : '✓ Tất toán 100%'}
                </span>
              </div>
            </div>

            {/* Sổ cái các đợt thu (Payment Installments Matrix) */}
            <div className="mt-4 pt-4 border-t border-slate-150 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CreditCard size={14} className="text-emerald-700" />
                  <h4 className="text-2xs font-black uppercase tracking-wider text-slate-700">
                    Lịch sử các đợt thu ({effectiveInstallments.length} đợt)
                  </h4>
                  {(triggerThresholdInfo.isPostDeliverySettlement || payment.dacCachGiaoTruoc || payment.isExempted || contractDoc?.dacCachGiaoTruoc || deliveries.some((d: any) => d.dacCachGiaoTruoc || d.isExempted)) ? (
                    <span className="text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <span>⚡</span> Đặc cách BGĐ ({paymentLoai === QUOTATION_LOAI.DICH_VU ? 'Nghiệm thu dịch vụ trước' : paymentLoai === QUOTATION_LOAI.VAT_TU ? 'Xuất kho trước' : 'Tất toán sau khi nhận máy'})
                    </span>
                  ) : triggerThresholdInfo.isTriggered ? (
                    <span className="text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                      <span>{paymentLoai === QUOTATION_LOAI.DICH_VU ? '🛠️' : paymentLoai === QUOTATION_LOAI.VAT_TU ? '📦' : '🎯'}</span> {depositAchievedText}
                    </span>
                  ) : (
                    <span className="text-3xs font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs">
                      <span>⏳</span> {depositPendingText}
                    </span>
                  )}
                </div>
                {remainingDebt > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsRecordModalOpen(true)}
                    className="text-3xs font-bold text-emerald-800 bg-emerald-100/70 hover:bg-emerald-200 border border-emerald-300 px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    + Thu tiếp đợt mới
                  </button>
                )}
              </div>

              {effectiveInstallments.length > 0 ? (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-2xs">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-3xs uppercase tracking-wider">
                      <tr>
                        <th className="p-2 px-3 text-center w-24">Lần thu</th>
                        <th className="p-2 px-3 w-24">Ngày thu</th>
                        <th className="p-2 px-3 text-right w-36">Số tiền thực thu</th>
                        <th className="p-2 px-3">Hình thức & Số UNC</th>
                        <th className="p-2 px-3">Người nộp</th>
                        <th className="p-2 px-3">Ghi chú</th>
                        <th className="p-2 px-3 text-center min-w-[130px]">Trạng thái ZNS</th>
                        {onSendZns && <th className="p-2 px-3 text-center w-20">Thao tác</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {effectiveInstallments.map((inst, idx) => {
                        const isFirstInst = (inst.lanThu === 1 || idx === 0);
                        const isSent = (inst as any).znsStatus === 'ĐÃ GỬI' || 
                                       (inst as any).trangThaiGuiTin === 'ĐÃ GỬI' || 
                                       Boolean((inst as any).znsSentAt) ||
                                       (isFirstInst && (payment.trangThaiGuiTinThanhToan === 'ĐÃ GỬI' || (payment as any).trangThaiGuiTinThanhToan === 'SENT'));
                        const isFailed = (inst as any).znsStatus === 'THẤT BẠI' || 
                                         (isFirstInst && (payment.trangThaiGuiTinThanhToan === 'THẤT BẠI' || (payment as any).trangThaiGuiTinThanhToan === 'FAILED'));

                        return (
                          <tr key={inst.id || idx} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-2 px-3 text-center font-bold text-slate-600">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-mono text-3xs bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                                  Đợt {inst.lanThu || idx + 1}
                                </span>
                                {idx === triggerInstallmentIdx && (
                                  <span className="text-3xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded-full whitespace-nowrap shadow-2xs">
                                    {triggerBadgeText}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2 px-3 font-currency text-slate-600">
                              {formatDate(inst.ngayThu)}
                            </td>
                            <td className="p-2 px-3 text-right font-currency font-black text-emerald-800">
                              {formatCurrency(inst.soTien || 0)}
                            </td>
                            <td className="p-2 px-3 text-slate-700 font-medium">
                              <span>{inst.phuongThucThanhToan || 'Chuyển khoản'}</span>
                              {inst.soChungTuThamChieu && (
                                <span className="font-mono text-3xs text-blue-700 font-semibold block">
                                  UNC: {inst.soChungTuThamChieu}
                                </span>
                              )}
                            </td>
                            <td className="p-2 px-3 text-slate-800">
                              {inst.nguoiNop || payerName}
                            </td>
                            <td className="p-2 px-3 text-slate-500 italic text-3xs">
                              {inst.ghiChu || '---'}
                            </td>
                            <td className="p-2 px-3 text-center">
                              {isSent ? (
                                <span className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  ✓ Đã gửi ZNS
                                </span>
                              ) : isFailed ? (
                                <span className="inline-flex items-center gap-1 text-3xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                                  ⚠️ Thất bại
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-3xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  Chưa gửi
                                </span>
                              )}
                            </td>
                            {onSendZns && (
                              <td className="p-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const installmentPaymentSnapshot: Payment = {
                                      ...payment,
                                      soTien: inst.soTien || payment.soTien,
                                      ngayThanhToan: inst.ngayThu || payment.ngayThanhToan,
                                      phuongThucThanhToan: inst.phuongThucThanhToan || payment.phuongThucThanhToan,
                                      tenNguoiNop: inst.nguoiNop || payerName,
                                    };
                                    onSendZns(installmentPaymentSnapshot);
                                  }}
                                  className={`inline-flex items-center gap-1 text-3xs font-bold px-2 py-1 rounded transition-colors cursor-pointer border ${
                                    isSent 
                                      ? 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200' 
                                      : 'text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border-blue-200'
                                  }`}
                                  title={`Gửi ZNS cho Đợt ${inst.lanThu || idx + 1}`}
                                >
                                  <Send size={10} />
                                  {isSent ? 'Gửi lại' : 'Gửi ZNS'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center text-3xs text-slate-400">
                  Chưa ghi nhận chi tiết đợt thu nào trong sổ cái. Bấm "+ Thu tiếp đợt mới" để ghi nhận.
                </div>
              )}
            </div>
          </section>

          {/* Khối 2: Sản phẩm đối chiếu */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-blue-600" />
                DANH SÁCH SẢN PHẨM
              </h3>
              <span className="font-mono text-3xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {payment.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || payment.slMay || 0} sản phẩm
              </span>
            </div>

            {payment.products?.length ? (
              <DrawerProductList 
                products={payment.products}
                subTotal={payment.subTotal}
                discountRate={payment.discountRate}
                discountAmount={payment.discountAmount}
                vatRate={payment.vatRate}
                vatAmount={payment.vatAmount}
                totalAmount={payment.totalAmount}
                accentColorClass="text-blue-700"
                paidAmount={payment.soTien}
                remainingDebt={remainingDebt}
              />
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Phiếu thu tổng hợp theo Hợp đồng / Báo giá (Không có danh mục sản phẩm lẻ).
              </div>
            )}
          </section>
        </div>

        {/* ===================== CỘT VỆ TINH (30%): INTELLIGENCE INSPECTOR ===================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Thẻ 1: Khách hàng & Người nộp tiền */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Khách hàng & Người nộp
            </h4>

            <div>
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Khách hàng pháp nhân</span>
              <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={payment.tenKhachHang}>
                {payment.tenKhachHang || '---'}
              </p>
              {payment.maKh && (
                <span className="font-mono text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-1.5">
                  {payment.maKh}
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Đại diện nộp tiền</span>
              <span className="font-semibold text-slate-800 block">{payerName}</span>
              {payment.sdt && <span className="font-mono text-3xs text-blue-700 font-bold block mt-0.5">{payment.sdt}</span>}
            </div>
          </section>

          {/* Thẻ 2: Căn cứ Thu tiền */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Chứng từ căn cứ thu tiền
            </h4>

            {payment.contractId ? (
              <ContractHoverCard contract={contractDoc || { id: payment.contractId, soHopDong: payment.soHopDong, customerId: payment.customerId, tenKhachHang: payment.tenKhachHang } as any}>
                <div className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-colors rounded-lg group cursor-pointer">
                  <span className="text-3xs text-slate-400 block uppercase font-bold mb-1">Hợp đồng căn cứ:</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs block group-hover:underline">
                    {payment.soHopDong || 'HĐ chưa gắn mã'} ↗
                  </span>
                  <span className="text-3xs text-slate-500">Di chuột để xem chi tiết hợp đồng</span>
                </div>
              </ContractHoverCard>
            ) : payment.quotationId ? (
              <QuotationHoverCard quotationId={payment.quotationId}>
                <div className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 transition-colors rounded-lg group cursor-pointer">
                  <span className="text-3xs text-slate-400 block uppercase font-bold mb-1">Báo giá căn cứ:</span>
                  <span className="font-mono font-bold text-amber-700 text-xs block group-hover:underline">
                    {payment.soDonHang || 'Báo giá bán lẻ'} ↗
                  </span>
                  <span className="text-3xs text-slate-500">Di chuột để xem chi tiết báo giá</span>
                </div>
              </QuotationHoverCard>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400 italic">
                Thu tiền tự do (Không gắn chứng từ gốc)
              </div>
            )}
          </section>

          {/* Thẻ 3: Quản trị & Ghi chú */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500">
                NGƯỜI PHỤ TRÁCH
              </span>
              <StatusPill statusStr={payment.trangThaiGuiTinThanhToan as any} />
            </div>

            <div className="text-xs">
              <span className="font-bold text-slate-800 text-xs block">{payment.nguoiPhuTrach || '---'}</span>
            </div>

            {payment.ghiChu && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Ghi chú & Mã giao dịch UNC:</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-150 leading-relaxed whitespace-pre-wrap font-mono text-2xs">
                  {payment.ghiChu}
                </p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );

  const navigate = useNavigate();
  const pStatus = (payment.tinhTrangThanhToan || '').toLowerCase().trim();
  const isChuaTT = pStatus === 'chưa tt' || pStatus === 'chua tt' || pStatus === 'chưa thanh toán';

  // Dynamic Machine Allocation Gate
  const allocGate = useMemo(
    () => calculateMachineAllocation(contractDoc || _quotationDoc, deliveries),
    [contractDoc, _quotationDoc, deliveries]
  );

  const contractsList = useMemo(() => {
    if (contractDoc) return [contractDoc];
    if (payment.contractId) {
      const cached = entityCachePool.get('contracts', payment.contractId);
      if (cached) return [cached];
    }
    if (payment.soHopDong) {
      const cached = entityCachePool.find('contracts', (c: any) => c.soHopDong === payment.soHopDong);
      if (cached) return [cached];
    }
    return [];
  }, [contractDoc, payment.contractId, payment.soHopDong]);

  const quotationsList = useMemo(() => {
    if (_quotationDoc) return [_quotationDoc];
    if (quotationId) {
      const cached = entityCachePool.get('quotations', quotationId);
      if (cached) return [cached];
    }
    return [];
  }, [_quotationDoc, quotationId]);

  const customersList = useMemo(() => {
    if (customerDoc) return [customerDoc];
    if (payment.customerId) {
      const cached = entityCachePool.get('customers', payment.customerId);
      if (cached) return [cached];
    }
    return [];
  }, [customerDoc, payment.customerId]);

  const deliveryPrefill = useMemo(() => {
    if (!payment) return null;
    const isWaiver = Boolean(
      (payment as any).dacCachGiaoTruoc ||
      isChuaTT ||
      contractDoc?.dacCachGiaoTruoc
    );

    const resolvedQuo = _quotationDoc || (quotationId ? entityCachePool.get('quotations', quotationId) : null);
    const targetContract = contractDoc || (contractsList.length > 0 ? contractsList[0] : null);

    return {
      contractId: targetContract?.id || payment.contractId || '',
      paymentId: payment.id,
      quotationId: resolvedQuo?.id || payment.quotationId || '',
      customerId: payment.customerId,
      tenKhachHang: payment.tenKhachHang,
      sdt: payment.sdt,
      diaChiGiaoHang: (payment as any).diaChiGiaoHang || targetContract?.diaChiGiaoHang || (payment as any).diaChi || '',
      soHopDong: targetContract?.soHopDong || payment.soHopDong,
      soBaoGia: resolvedQuo?.soPhieuBaoGia || (payment as any).soPhieuBaoGia,
      soPhieuBaoGia: resolvedQuo?.soPhieuBaoGia || (payment as any).soPhieuBaoGia,
      ngayBaoGia: resolvedQuo?.ngayBaoGia || (payment as any).ngayBaoGia,
      giaTriHopDong: targetContract?.totalAmount || (payment as any).tongGiaTri || (payment as any).totalAmount || payment.soTien || 0,
      tinhTrangThanhToan: payment.tinhTrangThanhToan,
      nguoiPhuTrach: payment.nguoiPhuTrach,
      products: targetContract?.products || resolvedQuo?.products || (payment as any).products || [],
      danhSachMaMay: targetContract?.danhSachMaMay || (payment as any).danhSachMaMay || [],
      slMay: allocGate.remainingMachines,
      ngayLapPgh: new Date().toISOString().split('T')[0],
      ngayGiaoMay: new Date().toISOString().split('T')[0],
      dacCachGiaoTruoc: isWaiver,
      nguoiPheDuyetDacCach: (payment as any).nguoiPheDuyetDacCach || (targetContract as any)?.nguoiPheDuyetDacCach || 'Ban Giám Đốc',
      lyDoDacCach: (payment as any).lyDoDacCach || (targetContract as any)?.lyDoDacCach || 'Đặc cách giao hàng trước khi thanh toán'
    };
  }, [
    payment,
    contractDoc,
    contractsList,
    _quotationDoc,
    quotationId,
    isChuaTT,
    allocGate.remainingMachines
  ]);

  const handleCreateDelivery = () => {
    const targetDoc = contractDoc || _quotationDoc || (contractsList.length > 0 ? contractsList[0] : null) || (quotationsList.length > 0 ? quotationsList[0] : null);
    if (!targetDoc) {
      notify.warning('Hồ sơ thanh toán này chưa liên kết với Hợp đồng hoặc Báo giá.');
      return;
    }
    if (allocGate.isFullyAllocated) {
      notify.warning(`Đơn hàng/Hợp đồng này đã điều phối đủ ${allocGate.totalAssignedMachines}/${allocGate.totalOrderMachines} máy xuất kho. Không thể tạo thêm phiếu!`);
      return;
    }
    setActiveDeliveryPrefill(deliveryPrefill ? { ...deliveryPrefill } : null);
    setIsDeliveryModalOpen(true);
  };

  const handleSaveDelivery = async (data: any) => {
    try {
      const resolved = await resolveDeliverySourceDocument(data, {
        contracts: contractsList,
        quotations: quotationsList,
        payments: allRelatedPayments
      });

      if (!resolved || !resolved.source) {
        throw new Error('Không tìm thấy nguồn dữ liệu tham chiếu (Hợp đồng hoặc Báo giá)');
      }

      const source = resolved.source;
      const currentDelivered = source.deliveredQuantities || {};
      const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };

      (data.products || []).forEach((p: any, idx: number) => {
        const itemKey = getProductItemKey(p, idx);
        const qty = Number(p.quantity || 0);
        newDeliveredQuantities[itemKey] = (currentDelivered[itemKey] || 0) + qty;
      });

      await apiCreateEntity('delivery', data);
      await repositoryFactory.get<any>(resolved.sourceType).update(source.id, {
        deliveredQuantities: newDeliveredQuantities
      });

      notify.success('Lập phiếu xuất kho và cập nhật tiến độ thành công!');
      setIsDeliveryModalOpen(false);
    } catch (err: any) {
      notify.error(err.message || 'Không thể tạo phiếu xuất kho');
    }
  };

  // Horizon HUD (Omni-Sovereign Cockpit Matrix)
  const horizonHud = (
    <DrawerHeaderCockpitHUD
      currentType="payment"
      quotation={_quotationDoc}
      contracts={contractDoc ? [contractDoc] : []}
      deliveries={deliveries}
      payments={allRelatedPayments}
    />
  );

  return (
    <>
      <DetailDrawer
        isOpen={isOpen}
        onClose={onClose}
        modal={!isDeliveryModalOpen && modal}
        className={isDeliveryModalOpen ? 'opacity-0 pointer-events-none' : className}
        title={`XÁC NHẬN THANH TOÁN: ${payment.paymentId || 'N/A'}`}
        subTitle={
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-600 text-xs font-semibold">
              {payment.tinhTrangThanhToan || '---'}
            </span>
            {(payment.dacCachGiaoTruoc || payment.isExempted || triggerThresholdInfo.isPostDeliverySettlement || deliveries.some((d: any) => d.dacCachGiaoTruoc || d.isExempted)) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                ⚡ ĐẶC CÁCH BAN GIÁM ĐỐC
              </span>
            )}
          </div>
        }
        entityId={paymentId}
        entityType="payment"
        icon={<CreditCard size={16} />}
        size="studio"
        horizonHud={horizonHud}
        tabs={
          <div className="flex items-center gap-6 border-b border-slate-100 pb-px -mb-[9px] select-none pl-1 overflow-x-auto scrollbar-hide">
            {(
              [
                { id: 'overview', label: 'Tổng quan' },
                { id: 'flow', label: 'Dòng chảy 360°', count: allRelatedPayments.length > 1 ? allRelatedPayments.length : 1, loading: dLoading || pLoading },
                { id: 'nexus', label: 'Nhật ký & Hoạt động' },
              ] as const
            ).map((tab) => {
              const isTabActive = activeTab === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2.5 text-xs font-semibold relative outline-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-0 bg-transparent ${
                    isTabActive ? 'text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {'count' in tab && (
                    <span className={`text-3xs px-1.5 h-3.5 rounded-full ml-0.5 inline-flex items-center justify-center font-bold ${isTabActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-150 text-slate-700'}`}>
                      {tab.loading ? '...' : tab.count}
                    </span>
                  )}
                  {isTabActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-700 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        }
        footer={
          <div className="flex w-full select-none items-center justify-between">
            <div>
              {onDelete && (
                <Button
                  aria-label="Xoá"
                  variant="danger"
                  size="sm"
                  className="h-9 font-bold bg-white text-red-700 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    confirm({
                      title: 'Xóa giao dịch',
                      message: 'Bạn có chắc chắn muốn xóa giao dịch thanh toán này? Hành động này không thể hoàn tác.',
                      confirmText: 'Xóa',
                      variant: 'danger'
                    }).then((confirmed) => {
                      if (confirmed) onDelete(payment);
                    });
                  }}
                >
                  Xoá
                </Button>
              )}
            </div>
            <div className="flex gap-2 justify-end items-center">
              {/* Nút Tạo Phiếu Giao / Khóa khi đủ máy */}
              {(contractDoc || _quotationDoc) && (
                allocGate.isFullyAllocated ? (
                  <Button
                    aria-label="Đã đủ SL máy xuất kho"
                    variant="secondary"
                    size="sm"
                    disabled
                    className="h-9 font-bold text-emerald-800 bg-emerald-50 border-emerald-300 opacity-90 cursor-not-allowed"
                  >
                    ✓ Đã đủ máy ({allocGate.totalAssignedMachines}/{allocGate.totalOrderMachines})
                  </Button>
                ) : (
                  <Button
                    aria-label="Tạo phiếu giao"
                    variant="subtle"
                    size="sm"
                    onClick={handleCreateDelivery}
                    className="h-9 font-bold text-cyan-800 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300"
                    leftIcon={<Truck size={12} />}
                  >
                    + Phiếu giao
                  </Button>
                )
              )}

              <Button aria-label="Đóng" variant="secondary" size="sm" onClick={onClose} className="h-9 font-bold">
                Đóng
              </Button>

              {onSendZns && (
                <Button
                  aria-label="Gửi tin Zalo"
                  variant="subtle"
                  size="sm"
                  onClick={() => onSendZns(payment)}
                  className="h-9 font-bold flex items-center gap-1.5 cursor-pointer text-blue-700 hover:bg-blue-50"
                  leftIcon={<Send size={12} />}
                >
                  <span>Gửi tin Zalo</span>
                  <span className="text-3xs font-mono px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-black">
                    {payment.tinhTrangThanhToan === 'Tất toán' ? '#552490' : '#547381'}
                  </span>
                </Button>
              )}

              {onEdit && (
                <Button
                  aria-label="Chỉnh sửa"
                  variant="dark"
                  size="sm"
                  onClick={() => {
                    onEdit(payment);
                    onClose();
                  }}
                  className="h-9 font-bold"
                  leftIcon={<Edit size={12} />}
                >
                  Chỉnh sửa
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {activeTab === 'overview' && overviewPanel}
          {activeTab === 'flow' && (
            <DocumentOmniFlowRibbon
              currentType="payment"
              currentDoc={payment}
              relatedQuotations={_quotationDoc ? [_quotationDoc] : []}
              relatedContracts={contractDoc ? [contractDoc] : []}
              relatedDeliveries={deliveries}
              relatedPayments={allRelatedPayments}
              focusTarget={flowFocusTarget}
              onCreateDelivery={contractDoc || _quotationDoc ? handleCreateDelivery : undefined}
            />
          )}
          {activeTab === 'nexus' && (
            <UnifiedActivityAuditNexus
              entityId={paymentId}
              entityType="payment"
              additionalEntityIds={deliveries.map((d: any) => d.id).filter(Boolean)}
              documentCode={payment.paymentId || (payment as any).soPhieuThu || (payment as any).soChungTu}
              documentTypeLabel="chứng từ thanh toán"
              creatorOrOfficer={payment.nguoiPhuTrach}
              statusLabel={payment.tinhTrangThanhToan || 'Tất toán'}
              statusColor={payment.tinhTrangThanhToan === 'Tất toán' ? 'text-emerald-700' : 'text-amber-700'}
              createdAt={payment.createdAt || payment.ngayThanhToan}
              updatedAt={(payment as any).updatedAt || (payment as any).ngayCapNhat}
              customerName={payment.tenKhachHang}
            />
          )}
        </div>
      </DetailDrawer>

      {isRecordModalOpen && (
        <RecordInstallmentModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          payment={payment}
          defaultPayerName={payerName}
          onSave={handleSaveInstallment}
        />
      )}

      {isDeliveryModalOpen && activeDeliveryPrefill && typeof document !== 'undefined' && createPortal(
        <DeliveryFormModal
          delivery={activeDeliveryPrefill}
          payments={allRelatedPayments}
          contracts={contractsList}
          quotations={quotationsList}
          customers={customersList}
          deliveries={deliveries}
          nguoiPhuTrachList={nguoiPhuTrachList}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setActiveDeliveryPrefill(null);
          }}
          onSave={handleSaveDelivery}
        />,
        document.body
      )}
    </>
  );
}
