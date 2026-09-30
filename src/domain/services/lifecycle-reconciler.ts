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
 * 5. ĐỦ ĐIỀU KIỆN XUẤT XƯỞNG (≥70% Thanh toán)
 * 6. ĐƠN ĐẶC CÁCH GIAO TRƯỚC (Theo phê duyệt Ban Giám Đốc)
 * 7. ĐỦ ĐIỀU KIỆN SẢN XUẤT (≥30% Cọc)
 * 8. CHỜ ĐẶT CỌC / KHỞI ĐỘNG
 */

import { hasActualCashCollected } from '@/src/domain/enums/payment-status';

export type WorkflowTrack = 'TRACK_MACHINE' | 'TRACK_MATERIAL' | 'TRACK_SERVICE';

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
  variant: 'emerald' | 'cyan' | 'blue' | 'sky' | 'amber' | 'slate';
  iconName: 'check-circle' | 'truck' | 'wallet' | 'sparkles' | 'alert-triangle' | 'clock';
  track: WorkflowTrack;
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

export function resolveWorkflowTrack(input: ReconcileLifecycleInput): WorkflowTrack {
  const { quotation, contract, payments = [] } = input;
  const targetDoc = contract || quotation || payments[0] || {};
  const loaiStr = String(
    targetDoc.loai || 
    targetDoc.phanLoai || 
    targetDoc.loaiBaoGia || 
    quotation?.loai || 
    quotation?.phanLoai || 
    quotation?.loaiBaoGia || 
    ''
  ).toUpperCase();

  if (loaiStr.includes('DỊCH VỤ') || loaiStr.includes('DICH VU') || loaiStr.includes('BGDV') || loaiStr.includes('BẢO TRÌ')) {
    return 'TRACK_SERVICE';
  }
  if (loaiStr.includes('VẬT TƯ') || loaiStr.includes('VAT TU') || loaiStr.includes('BGVT') || loaiStr.includes('LINH KIỆN')) {
    return 'TRACK_MATERIAL';
  }
  if (contract || targetDoc.soHopDong || targetDoc.contractId || loaiStr.includes('MÁY') || loaiStr.includes('MAY') || loaiStr.includes('BGM')) {
    return 'TRACK_MACHINE';
  }
  return 'TRACK_MACHINE';
}

export function resolveDocumentLifecycleBadge(input: ReconcileLifecycleInput): LifecycleBadgeInfo {
  const { quotation, deliveries = [], payments = [] } = input;
  const contract = input.contract || (Array.isArray(input.contracts) && input.contracts.length > 0 ? input.contracts[0] : null);
  const track = resolveWorkflowTrack(input);

  // 1. Phân tích tài chính (Financial Analysis)
  const contractTotal = Number(
    contract?.totalAmount || 
    contract?.giaTriHopDong || 
    quotation?.totalAmount || 
    (payments[0] && (payments[0].totalAmount || payments[0].soTien)) ||
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

  // Số lượng máy theo hợp đồng / Báo giá
  const totalContractQty = Number(
    contract?.slMay || 
    contract?.products?.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0) || 
    quotation?.slMay || 
    quotation?.products?.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0) ||
    1
  );

  // Số lượng đã giao thực tế
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
    (payments || []).some((p: any) => p && !p.deletedAt && !p.isDeleted && (p.dacCachGiaoTruoc || p.isExempted)) ||
    validDeliveries.some((d: any) => d.dacCachGiaoTruoc || d.isExempted)
  );

  // ==========================================
  // MA TRẬN PHÂN CẤP VÒNG ĐỜI THEO TRACK ĐA HÌNH
  // ==========================================

  // Cấp 1: Hoàn tất toàn diện (100% Giao hàng & Tất toán)
  if (isDeliveredActual && isPaidFull) {
    const label = track === 'TRACK_SERVICE'
      ? '✓ HOÀN TẤT DỊCH VỤ (100%)'
      : track === 'TRACK_MATERIAL'
        ? '✓ HOÀN TẤT XUẤT KHO VẬT TƯ (100%)'
        : 'HOÀN THÀNH TOÀN DIỆN (100%)';

    const tooltip = track === 'TRACK_SERVICE'
      ? 'Dịch vụ đã hoàn tất thi công/nghiệm thu và quyết toán 100%'
      : track === 'TRACK_MATERIAL'
        ? 'Đơn hàng vật tư đã bàn giao và tất toán 100%'
        : 'Đơn hàng đã bàn giao máy thực tế thành công và hoàn tất 100% nghĩa vụ thanh toán';

    return {
      key: 'COMPLETED_100',
      label,
      variant: 'emerald',
      iconName: 'check-circle',
      track,
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
      tooltip
    };
  }

  // Cấp 2: Đã bàn giao thực tế (Đã giao hàng, chờ thanh toán nốt)
  if (isDeliveredActual) {
    const label = track === 'TRACK_SERVICE'
      ? '🛠️ ĐÃ NGHIỆM THU DỊCH VỤ'
      : track === 'TRACK_MATERIAL'
        ? '📦 ĐÃ BÀN GIAO VẬT TƯ'
        : 'ĐÃ BÀN GIAO MÁY THỰC TẾ';

    const tooltip = track === 'TRACK_SERVICE'
      ? 'Đã hoàn tất cung cấp và nghiệm thu dịch vụ kỹ thuật'
      : track === 'TRACK_MATERIAL'
        ? 'Đã hoàn tất giao nhận vật tư/phụ tùng cho khách hàng'
        : 'Đã hoàn tất bàn giao máy cho khách hàng theo ngày giao thực tế';

    return {
      key: 'DELIVERED_ACTUAL',
      label,
      variant: 'cyan',
      iconName: 'truck',
      track,
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
      tooltip
    };
  }

  // Cấp 3: Đã xuất lệnh giao hàng (Có phiếu giao hàng đang xử lý xuất kho)
  if (hasDeliveryNotes) {
    const label = track === 'TRACK_SERVICE'
      ? '🛠️ ĐANG TRIỂN KHAI DỊCH VỤ'
      : 'ĐÃ XUẤT LỆNH GIAO HÀNG';

    return {
      key: 'DELIVERY_ORDERED',
      label,
      variant: 'blue',
      iconName: 'truck',
      track,
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
      tooltip: 'Đã phát hành phiếu xuất/lệnh giao hàng, đang chuẩn bị hoặc vận chuyển đến khách'
    };
  }

  // Cấp 4: Đã tất toán 100% (Thu đủ tiền, chờ xuất xưởng / xuất kho / thi công)
  if (isPaidFull) {
    const label = track === 'TRACK_SERVICE'
      ? '🛠️ ĐÃ TẤT TOÁN (SẴN SÀNG THI CÔNG)'
      : track === 'TRACK_MATERIAL'
        ? '📦 ĐÃ TẤT TOÁN (SẴN SÀNG XUẤT KHO)'
        : 'ĐÃ TẤT TOÁN (100%)';

    const tooltip = track === 'TRACK_SERVICE'
      ? 'Khách hàng đã thanh toán đủ 100%, sẵn sàng triển khai thi công/nghiệm thu'
      : track === 'TRACK_MATERIAL'
        ? 'Khách hàng đã thanh toán đủ 100%, sẵn sàng xuất kho giao vật tư'
        : 'Khách hàng đã thanh toán đủ 100% giá trị hợp đồng, chờ lịch xuất kho bàn giao';

    return {
      key: 'SETTLED_100',
      label,
      variant: 'emerald',
      iconName: 'wallet',
      track,
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
      tooltip
    };
  }

  // Cấp 5: Đủ điều kiện xuất xưởng / xuất kho (≥70%)
  if (is70PercentSecured) {
    const label = track === 'TRACK_SERVICE'
      ? '🛠️ ĐỦ ĐIỀU KIỆN TRIỂN KHAI (≥70%)'
      : track === 'TRACK_MATERIAL'
        ? '📦 ĐỦ ĐIỀU KIỆN XUẤT KHO (≥70%)'
        : 'ĐỦ ĐIỀU KIỆN XUẤT XƯỞNG (≥70%)';

    const tooltip = track === 'TRACK_SERVICE'
      ? 'Khách hàng đã thanh toán ≥70%, đủ điều kiện triển khai dịch vụ'
      : track === 'TRACK_MATERIAL'
        ? 'Khách hàng đã thanh toán ≥70%, đủ điều kiện xuất kho giao vật tư'
        : 'Khách hàng đã thanh toán tối thiểu 70% giá trị đơn hàng, đủ điều kiện xuất xưởng';

    return {
      key: 'READY_DELIVERY_70',
      label,
      variant: 'sky',
      iconName: 'check-circle',
      track,
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
      tooltip
    };
  }

  // Cấp 6: Đặc cách phê duyệt từ Ban Giám Đốc
  if (isSpecialWaiver) {
    return {
      key: 'SPECIAL_WAIVER',
      label: 'ĐẶC CÁCH BAN GIÁM ĐỐC',
      variant: 'amber',
      iconName: 'sparkles',
      track,
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
      tooltip: 'Được Ban Giám Đốc phê duyệt đặc cách bàn giao trước quyết toán sau'
    };
  }

  // Cấp 7: Đủ điều kiện sản xuất / xuất kho / triển khai (≥30%)
  if (is30PercentSecured) {
    const label = track === 'TRACK_SERVICE'
      ? '🛠️ ĐỦ ĐIỀU KIỆN TRIỂN KHAI (≥30%)'
      : track === 'TRACK_MATERIAL'
        ? '📦 ĐỦ ĐIỀU KIỆN XUẤT KHO (≥30%)'
        : 'ĐỦ ĐIỀU KIỆN SẢN XUẤT (≥30%)';

    const tooltip = track === 'TRACK_SERVICE'
      ? 'Khách hàng đã cọc ≥30%, đủ điều kiện xếp lịch triển khai dịch vụ'
      : track === 'TRACK_MATERIAL'
        ? 'Khách hàng đã cọc ≥30%, đủ điều kiện xuất kho chuẩn bị giao hàng'
        : 'Khách hàng đã cọc tối thiểu 30% giá trị hợp đồng, đủ điều kiện đưa vào kế hoạch sản xuất';

    return {
      key: 'PRODUCTION_SECURED_30',
      label,
      variant: 'emerald',
      iconName: 'check-circle',
      track,
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
      tooltip
    };
  }

  // Cấp 8: Chưa đủ cọc 30%
  const pendingLabel = track === 'TRACK_SERVICE'
    ? '🛠️ CHƯA ĐỦ CỌC TRIỂN KHAI'
    : track === 'TRACK_MATERIAL'
      ? '📦 CHƯA ĐỦ CỌC XUẤT KHO'
      : 'CHƯA ĐỦ CỌC 30% SẢN XUẤT';

  const pendingTooltip = track === 'TRACK_SERVICE'
    ? 'Cần thu cọc tối thiểu 30% để đủ điều kiện triển khai dịch vụ'
    : track === 'TRACK_MATERIAL'
      ? 'Cần thu cọc tối thiểu 30% để đủ điều kiện xuất kho vật tư'
      : 'Cần thu cọc tối thiểu 30% tổng giá trị hợp đồng để đủ điều kiện sản xuất';

  return {
    key: 'PENDING_DEPOSIT',
    label: pendingLabel,
    variant: 'slate',
    iconName: 'alert-triangle',
    track,
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
    tooltip: pendingTooltip
  };
}
