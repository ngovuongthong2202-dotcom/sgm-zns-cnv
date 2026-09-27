/**
 * DOMAIN LIFECYCLE RECONCILER (LÕI ĐIỀU PHỐI VÒNG ĐỜI CHỨNG TỪ TOÀN NĂNG)
 * 
 * Quản lý và giải quyết bất biến toán học của dòng chảy 5 module:
 * Khách Hàng -> Báo Giá -> Hợp Đồng -> Thanh Toán -> Giao Hàng
 * 
 * Xác định chính xác thứ bậc ưu tiên 8 cấp độ trạng thái đơn hàng:
 * 1. HOÀN THÀNH TOÀN DIỆN (100% Giao hàng & Tất toán)
 * 2. ĐÃ BÀN GIAO MÁY THỰC TẾ (Đã giao máy thực tế, chờ quyết toán nợ)
 * 3. ĐÃ XUẤT LỆNH GIAO HÀNG (Đã lập phiếu giao hàng / đang vận chuyển)
 * 4. ĐÃ TẤT TOÁN 100% (Thu đủ tiền, chờ xuất kho)
 * 5. ĐỦ ĐIỀU KIỆN XUẤT XƯỞNG (≥70% giá trị)
 * 6. ĐẶC CÁCH BAN GIÁM ĐỐC (Giao trước trả sau)
 * 7. ĐỦ ĐIỀU KIỆN SẢN XUẤT (≥30% cọc)
 * 8. CHƯA ĐỦ CỌC 30% SẢN XUẤT
 */

import { hasActualCashCollected } from '@/src/domain/enums/payment-status';

export type LifecycleMilestoneKey = 
  | 'COMPLETED_100'
  | 'DELIVERED_ACTUAL'
  | 'DELIVERY_ORDERED'
  | 'SETTLED_100'
  | 'READY_DELIVERY_70'
  | 'SPECIAL_WAIVER'
  | 'PRODUCTION_SECURED_30'
  | 'PENDING_DEPOSIT';

export interface LifecycleBadgeInfo {
  key: LifecycleMilestoneKey;
  label: string;
  variant: 'emerald' | 'cyan' | 'blue' | 'indigo' | 'amber' | 'slate';
  iconName: 'check-circle' | 'truck' | 'wallet' | 'sparkles' | 'alert-triangle' | 'clock';
  paidRatio: number;
  deliveryRatio: number;
  totalPaid: number;
  contractTotal: number;
  totalDeliveredQty: number;
  totalContractQty: number;
  isDeliveredActual: boolean;
  hasDeliveryNotes: boolean;
  isPaidFull: boolean;
  isSpecialWaiver: boolean;
  tooltip: string;
}

export interface ReconcileLifecycleInput {
  quotation?: any | null;
  contracts?: any[];
  contract?: any | null;
  deliveries?: any[];
  payments?: any[];
}

export function resolveDocumentLifecycleBadge(input: ReconcileLifecycleInput): LifecycleBadgeInfo {
  const { quotation, deliveries = [], payments = [] } = input;
  const contract = input.contract || (Array.isArray(input.contracts) && input.contracts.length > 0 ? input.contracts[0] : null);

  // 1. Phân tích tài chính (Financial Analysis)
  const contractTotal = Number(
    contract?.totalAmount || 
    contract?.giaTriHopDong || 
    quotation?.totalAmount || 
    0
  );

  const validPayments = (payments || []).filter(
    (p: any) => !p.deletedAt && !p.isDeleted && (hasActualCashCollected(p.tinhTrangThanhToan) || p.tinhTrangThanhToan === 'Đã thu tiền' || p.trangThai === 'Đã thu' || p.trangThai === 'DA_THU')
  );

  const totalPaid = validPayments.reduce((sum: number, p: any) => sum + (Number(p.soTien) || 0), 0);
  const paidRatio = contractTotal > 0 ? Math.min(100, (totalPaid / contractTotal) * 100) : 0;
  
  const hasSettlementPayment = (payments || []).some(
    (p: any) => p.tinhTrangThanhToan?.includes('Tất toán') || p.tinhTrangThanhToan?.includes('Đã thu đủ')
  );
  const isPaidFull = paidRatio >= 99.5 || hasSettlementPayment;
  const is30PercentSecured = paidRatio >= 29.5 || isPaidFull;
  const is70PercentSecured = paidRatio >= 69.5 || isPaidFull;

  // 2. Phân tích giao hàng (Fulfillment Analysis)
  const validDeliveries = (deliveries || []).filter((d: any) => !d.deletedAt && !d.isDeleted);
  const hasDeliveryNotes = validDeliveries.length > 0;

  // Số lượng máy theo hợp đồng
  const totalContractQty = Number(
    contract?.slMay || 
    contract?.products?.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0) || 
    quotation?.slMay || 
    1
  );

  // Số lượng máy đã giao thực tế
  const totalDeliveredQty = validDeliveries.reduce((sum: number, d: any) => {
    const isDelivered = Boolean(d.ngayGiaoThucTe) || 
      d.trangThai === 'Hoàn tất bàn giao' || 
      d.trangThai === 'Đã giao' || 
      d.trangThai === 'DA_GIAO' || 
      d.trangThai === 'HOAN_TAT';

    if (isDelivered) {
      const qty = Number(
        d.products?.reduce((ps: number, p: any) => ps + (Number(p.quantity) || 0), 0) || 
        d.soLuong || 
        d.slGiao || 
        d.slMay || 
        d.danhSachMaMay?.length || 
        1
      );
      return sum + qty;
    }
    return sum;
  }, 0);

  const deliveryRatio = totalContractQty > 0 ? Math.min(100, Math.round((totalDeliveredQty / totalContractQty) * 100)) : 0;

  // Kiểm tra cờ bàn giao thực tế
  const isDeliveredActual = validDeliveries.some((d: any) => 
    Boolean(d.ngayGiaoThucTe) || 
    d.trangThai === 'Hoàn tất bàn giao' || 
    d.trangThai === 'Đã giao' ||
    d.trangThai === 'DA_GIAO' || 
    d.trangThai === 'HOAN_TAT'
  ) || (totalDeliveredQty >= totalContractQty && totalDeliveredQty > 0);

  // 3. Phân tích đặc cách phê duyệt
  const isSpecialWaiver = Boolean(
    contract?.dacCachGiaoTruoc || 
    contract?.isPostDeliverySettlement || 
    contract?.isExempted ||
    quotation?.dacCachGiaoTruoc || 
    quotation?.isExempted ||
    validDeliveries.some((d: any) => d.dacCachGiaoTruoc || d.isExempted)
  );

  // ==========================================
  // MA TRẬN 8 CẤP ĐỘ PHÂN CẤP VÒNG ĐỜI CHỨNG TỪ
  // ==========================================

  // Cấp 1: Hoàn tất toàn diện (100% Giao hàng & Tất toán)
  if (isDeliveredActual && isPaidFull) {
    return {
      key: 'COMPLETED_100',
      label: 'HOÀN THÀNH TOÀN DIỆN (100%)',
      variant: 'emerald',
      iconName: 'check-circle',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Đơn hàng đã bàn giao máy thực tế thành công và hoàn tất 100% nghĩa vụ thanh toán'
    };
  }

  // Cấp 2: Đã bàn giao máy thực tế (Đã giao hàng, chờ thanh toán nốt)
  if (isDeliveredActual) {
    return {
      key: 'DELIVERED_ACTUAL',
      label: 'ĐÃ BÀN GIAO MÁY THỰC TẾ',
      variant: 'cyan',
      iconName: 'truck',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Đã hoàn tất bàn giao máy cho khách hàng theo ngày giao thực tế'
    };
  }

  // Cấp 3: Đã xuất lệnh giao hàng (Có phiếu giao hàng đang xử lý xuất kho)
  if (hasDeliveryNotes) {
    return {
      key: 'DELIVERY_ORDERED',
      label: 'ĐÃ XUẤT LỆNH GIAO HÀNG',
      variant: 'blue',
      iconName: 'truck',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Đã phát hành lệnh giao hàng, hàng đang được chuẩn bị hoặc vận chuyển đến khách'
    };
  }

  // Cấp 4: Đã tất toán 100% (Thu đủ tiền, chờ xuất xưởng)
  if (isPaidFull) {
    return {
      key: 'SETTLED_100',
      label: 'ĐÃ TẤT TOÁN (100%)',
      variant: 'emerald',
      iconName: 'wallet',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Khách hàng đã thanh toán đủ 100% giá trị hợp đồng, chờ lịch xuất kho bàn giao'
    };
  }

  // Cấp 5: Đủ điều kiện xuất xưởng (≥70%)
  if (is70PercentSecured) {
    return {
      key: 'READY_DELIVERY_70',
      label: 'ĐỦ ĐIỀU KIỆN XUẤT XƯỞNG (≥70%)',
      variant: 'indigo',
      iconName: 'check-circle',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Khách hàng đã thanh toán tối thiểu 70% giá trị đơn hàng, đủ điều kiện xuất xưởng'
    };
  }

  // Cấp 6: Đặc cách phê duyệt từ Ban Giám Đốc
  if (isSpecialWaiver) {
    return {
      key: 'SPECIAL_WAIVER',
      label: 'ĐẶC CÁCH BAN GIÁM ĐỐC',
      variant: 'amber',
      iconName: 'sparkles',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Được Ban Giám Đốc phê duyệt đặc cách bàn giao máy trước quyết toán sau'
    };
  }

  // Cấp 7: Đủ điều kiện sản xuất (≥30%)
  if (is30PercentSecured) {
    return {
      key: 'PRODUCTION_SECURED_30',
      label: 'ĐỦ ĐIỀU KIỆN SẢN XUẤT (≥30%)',
      variant: 'emerald',
      iconName: 'check-circle',
      paidRatio,
      deliveryRatio,
      totalPaid,
      contractTotal,
      totalDeliveredQty,
      totalContractQty,
      isDeliveredActual,
      hasDeliveryNotes,
      isPaidFull,
      isSpecialWaiver,
      tooltip: 'Khách hàng đã cọc tối thiểu 30% giá trị hợp đồng, đủ điều kiện đưa vào kế hoạch sản xuất'
    };
  }

  // Cấp 8: Chưa đủ cọc 30% sản xuất
  return {
    key: 'PENDING_DEPOSIT',
    label: 'CHƯA ĐỦ CỌC 30% SẢN XUẤT',
    variant: 'slate',
    iconName: 'alert-triangle',
    paidRatio,
    deliveryRatio,
    totalPaid,
    contractTotal,
    totalDeliveredQty,
    totalContractQty,
    isDeliveredActual,
    hasDeliveryNotes,
    isPaidFull,
    isSpecialWaiver,
    tooltip: 'Cần thu cọc tối thiểu 30% tổng giá trị hợp đồng để đủ điều kiện sản xuất'
  };
}
