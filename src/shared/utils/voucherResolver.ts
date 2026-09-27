/**
 * Sovereign Voucher & Lineage Resolver Engine (S-VCLE)
 * Chuẩn hóa mã chứng từ, triệt tiêu 100% rò rỉ UUID kỹ thuật,
 * nhận diện mã ERP, phân tích thông tin bàn giao thực tế và kiểm soát hạn ngạch xuất kho.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Kiểm tra một chuỗi có phải là UUID thô hệ thống không
 */
export function isUuid(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return false;
  return UUID_REGEX.test(str.trim());
}

/**
 * Phân giải mã phiếu giao hàng nghiệp vụ, tuyệt đối không để lộ UUID thô
 */
export function resolveDeliveryDisplayCode(del?: any): string {
  if (!del) return 'Chưa có PGH';
  
  // 1. Ưu tiên mã phiếu giao hàng chính thức (nếu không phải UUID)
  if (del.deliveryId && typeof del.deliveryId === 'string' && !isUuid(del.deliveryId)) {
    return del.deliveryId.trim();
  }
  
  // 2. Ưu tiên mã phiếu xuất kho ERP (soPhieuXuat)
  if (del.soPhieuXuat && typeof del.soPhieuXuat === 'string' && !isUuid(del.soPhieuXuat)) {
    return del.soPhieuXuat.trim();
  }

  // 3. Ưu tiên các alias nghiệp vụ khác
  if (del.maGiaoHang && typeof del.maGiaoHang === 'string' && !isUuid(del.maGiaoHang)) {
    return del.maGiaoHang.trim();
  }
  if (del.soPhieuGiaoHang && typeof del.soPhieuGiaoHang === 'string' && !isUuid(del.soPhieuGiaoHang)) {
    return del.soPhieuGiaoHang.trim();
  }

  // 4. Nếu có id và id không phải UUID
  if (del.id && typeof del.id === 'string' && !isUuid(del.id)) {
    return del.id.trim();
  }

  // 5. Fallback nhân đạo: nếu id là UUID, sinh mã hiển thị thân thiện chuẩn PGH-XXXX
  if (del.id && typeof del.id === 'string') {
    return `PGH-${del.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  return 'PGH-AUTO';
}

/**
 * Phân giải mã phiếu thanh toán nghiệp vụ
 */
export function resolvePaymentDisplayCode(payment?: any): string {
  if (!payment) return 'Chưa có PT';

  if (payment.paymentId && typeof payment.paymentId === 'string' && !isUuid(payment.paymentId)) {
    return payment.paymentId.trim();
  }
  if (payment.soPhieuThu && typeof payment.soPhieuThu === 'string' && !isUuid(payment.soPhieuThu)) {
    return payment.soPhieuThu.trim();
  }
  if (payment.soPhieu && typeof payment.soPhieu === 'string' && !isUuid(payment.soPhieu)) {
    return payment.soPhieu.trim();
  }
  if (payment.soChungTu && typeof payment.soChungTu === 'string' && !isUuid(payment.soChungTu)) {
    return payment.soChungTu.trim();
  }
  if (payment.id && typeof payment.id === 'string' && !isUuid(payment.id)) {
    return payment.id.trim();
  }
  if (payment.id && typeof payment.id === 'string') {
    return `PT-${payment.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  }

  return 'PT-AUTO';
}

export interface DeliveryVoucherMeta {
  displayCode: string;
  erpCode?: string;
  isDelivered: boolean;
  deliveredDate?: string | null;
  plannedDate?: string | null;
  recipientName?: string;
  carrierName?: string;
  technicianName?: string;
  machineList: string[];
  machineQty: number;
  statusLabel: string;
}

/**
 * Trích xuất toàn bộ metadata hiển thị cho một phiếu giao hàng
 */
export function resolveDeliveryVoucherMeta(del?: any): DeliveryVoucherMeta {
  const displayCode = resolveDeliveryDisplayCode(del);
  const erpCode = del?.soPhieuXuat && del.soPhieuXuat !== displayCode ? del.soPhieuXuat.trim() : undefined;
  const isDelivered = Boolean(del?.ngayGiaoThucTe);
  
  const machineList: string[] = Array.isArray(del?.danhSachMaMay) ? del.danhSachMaMay : [];
  const prodQty = del?.products?.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0) || 0;
  const machineQty = prodQty > 0 ? prodQty : (machineList.length > 0 ? machineList.length : (Number(del?.slMay) || 0));

  return {
    displayCode,
    erpCode,
    isDelivered,
    deliveredDate: del?.ngayGiaoThucTe || null,
    plannedDate: del?.ngayGiaoMay || del?.ngayTaoPhieuXuat || null,
    recipientName: del?.kyNhan || del?.tenNguoiNhan || undefined,
    carrierName: del?.tenNguoiGiao || del?.donViVanChuyen || undefined,
    technicianName: del?.thoGiaoMay || del?.kyThuatBanGiao || del?.nguoiPhuTrach || undefined,
    machineList,
    machineQty,
    statusLabel: isDelivered ? '✓ Đã bàn giao thực tế' : 'Đang xử lý xuất kho',
  };
}

export interface MachineAllocationResult {
  totalOrderMachines: number;
  totalAssignedMachines: number;
  totalDeliveredMachines: number;
  remainingMachines: number;
  isFullyAllocated: boolean;
  allocationPercentage: number;
  allocationBadgeText: string;
  buttonLabel: string;
}

/**
 * Cổng kiểm soát phân bổ cơ số máy xuất kho thời gian thực (Dynamic Machine Allocation Gate - M-IAG)
 * Đối soát tổng số máy hợp đồng với các phiếu giao hàng hiện hữu để ngăn chặn việc xuất khống.
 */
export function calculateMachineAllocation(
  contractOrQuotation?: any,
  relatedDeliveries: any[] = []
): MachineAllocationResult {
  // 1. Tổng cơ số máy theo Hợp đồng / Báo giá
  const doc = contractOrQuotation || {};
  const products = Array.isArray(doc.products) ? doc.products : [];
  const totalFromProducts = products.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0);
  const totalOrderMachines = totalFromProducts > 0 
    ? totalFromProducts 
    : (Number(doc.slMay) || (Array.isArray(doc.danhSachMaMay) ? doc.danhSachMaMay.length : 0));

  // 2. Tổng cơ số máy đã được gán vào các phiếu giao hàng (kể cả đang xử lý hay đã giao)
  const validDeliveries = relatedDeliveries.filter((d: any) => !d.deletedAt && !d.isDeleted);
  
  let totalAssignedMachines = 0;
  let totalDeliveredMachines = 0;

  for (const del of validDeliveries) {
    const meta = resolveDeliveryVoucherMeta(del);
    totalAssignedMachines += meta.machineQty;
    if (meta.isDelivered) {
      totalDeliveredMachines += meta.machineQty;
    }
  }

  // 3. Cơ số máy còn lại được phép lên phiếu mới
  const remainingMachines = totalOrderMachines > 0 
    ? Math.max(0, totalOrderMachines - totalAssignedMachines)
    : 0;

  const isFullyAllocated = totalOrderMachines > 0 && totalAssignedMachines >= totalOrderMachines;
  
  const allocationPercentage = totalOrderMachines > 0 
    ? Math.min(100, Math.round((totalAssignedMachines / totalOrderMachines) * 100))
    : 0;

  const allocationBadgeText = isFullyAllocated
    ? `✓ Đã điều phối đủ ${totalAssignedMachines}/${totalOrderMachines} máy`
    : `Đã lập ${totalAssignedMachines}/${totalOrderMachines} máy (${allocationPercentage}%)`;

  const buttonLabel = isFullyAllocated
    ? `✓ Đã đủ SL máy xuất kho (${totalAssignedMachines}/${totalOrderMachines})`
    : (remainingMachines > 0 
        ? `+ Lập Phiếu Xuất Kho (Còn ${remainingMachines} máy)` 
        : '+ Lập Phiếu Xuất Kho');

  return {
    totalOrderMachines,
    totalAssignedMachines,
    totalDeliveredMachines,
    remainingMachines,
    isFullyAllocated,
    allocationPercentage,
    allocationBadgeText,
    buttonLabel,
  };
}
