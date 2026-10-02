import { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { getProductItemKey } from '@/src/shared/utils/product-key';

export interface RemainingProductItem extends ProductItem {
  baselineQuantity: number;
  shippedQuantity: number;
  remainingQuantity: number;
}

export interface DeliveryReconciliationResult {
  totalBaselineQuantity: number;
  totalShippedQuantity: number;
  remainingProducts: RemainingProductItem[];
  isFullyDelivered: boolean;
  tienDoLuyKe: number;
  nextDotGiaoHang: number;
  totalShipmentsCount: number;
  hasShipments: boolean;
}

/**
 * Calculates remaining quantities, cumulative progress, and allocation limits
 * across multi-shipment deliveries (Omni-Milestone Fulfillment Nexus)
 */
export function reconcileDeliveryShipments(delivery: Delivery): DeliveryReconciliationResult {
  const baselineProducts = Array.isArray(delivery.products) ? delivery.products : [];
  const shipments = Array.isArray(delivery.cacDotGiao) ? delivery.cacDotGiao : [];

  // Compute total baseline quantity
  const totalBaselineQuantity = baselineProducts.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

  // Map total shipped quantity per product key
  const shippedQuantityMap = new Map<string, number>();

  shipments.forEach(shipment => {
    const sProducts = Array.isArray(shipment.products) ? shipment.products : [];
    sProducts.forEach((sp, idx) => {
      const key = getProductItemKey(sp, idx);
      const prev = shippedQuantityMap.get(key) || 0;
      shippedQuantityMap.set(key, prev + (Number(sp.quantity) || 0));

      // Also track by productId or productName if key doesn't match
      if (sp.productId) {
        const idKey = `id:${sp.productId}`;
        shippedQuantityMap.set(idKey, (shippedQuantityMap.get(idKey) || 0) + (Number(sp.quantity) || 0));
      }
      if (sp.productName) {
        const nameKey = `name:${sp.productName.trim().toLowerCase()}`;
        shippedQuantityMap.set(nameKey, (shippedQuantityMap.get(nameKey) || 0) + (Number(sp.quantity) || 0));
      }
    });
  });

  let totalShippedQuantity = 0;

  const remainingProducts: RemainingProductItem[] = baselineProducts.map((p, idx) => {
    const key = getProductItemKey(p, idx);
    const idKey = p.productId ? `id:${p.productId}` : '';
    const nameKey = p.productName ? `name:${p.productName.trim().toLowerCase()}` : '';

    let shippedQty = 0;
    if (shippedQuantityMap.has(key)) {
      shippedQty = shippedQuantityMap.get(key)!;
    } else if (idKey && shippedQuantityMap.has(idKey)) {
      shippedQty = shippedQuantityMap.get(idKey)!;
    } else if (nameKey && shippedQuantityMap.has(nameKey)) {
      shippedQty = shippedQuantityMap.get(nameKey)!;
    }

    const baselineQty = Number(p.quantity) || 0;
    const remainingQty = Math.max(0, baselineQty - shippedQty);
    totalShippedQuantity += shippedQty;

    return {
      ...p,
      baselineQuantity: baselineQty,
      shippedQuantity: shippedQty,
      remainingQuantity: remainingQty,
    };
  });

  const isFullyDelivered = remainingProducts.length > 0 && remainingProducts.every(p => p.remainingQuantity <= 0);
  const tienDoLuyKe = totalBaselineQuantity > 0 
    ? Math.min(100, Math.round((totalShippedQuantity / totalBaselineQuantity) * 100))
    : (isFullyDelivered ? 100 : 0);

  const nextDotGiaoHang = shipments.length > 0
    ? Math.max(...shipments.map(s => s.dotGiaoHang || 0)) + 1
    : 1;

  return {
    totalBaselineQuantity,
    totalShippedQuantity,
    remainingProducts,
    isFullyDelivered,
    tienDoLuyKe,
    nextDotGiaoHang,
    totalShipmentsCount: shipments.length,
    hasShipments: shipments.length > 0,
  };
}

/**
 * Validates whether a new shipment's product quantities stay within remaining allowances
 */
export function validateShipmentQuantities(
  requestedProducts: ProductItem[],
  remainingProducts: RemainingProductItem[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  requestedProducts.forEach((rp, idx) => {
    const match = remainingProducts[idx] || remainingProducts.find(
      r => (rp.productId && r.productId === rp.productId) || (rp.productName && r.productName === rp.productName)
    );

    if (match) {
      const reqQty = Number(rp.quantity) || 0;
      if (reqQty < 0) {
        errors.push(`Sản phẩm "${rp.productName}": Số lượng không thể âm.`);
      } else if (reqQty > match.remainingQuantity) {
        errors.push(`Sản phẩm "${rp.productName}": Số lượng xuất (${reqQty}) vượt quá số lượng còn lại (${match.remainingQuantity} ${match.unit || 'Cái'}).`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface FinancialGateResult {
  isPassed: boolean;
  totalPaid: number;
  cumulativeShippedValue: number;
  shortfallAmount: number;
  requiresExecutiveWaiver: boolean;
  warningMessage?: string;
}

/**
 * Dynamic Financial Gate: Verifies that cumulative shipments do not exceed total paid amount
 */
export function evaluateShipmentFinancialGate(
  delivery: Delivery,
  currentShipmentValue: number,
  allPayments: any[] = []
): FinancialGateResult {
  // Find linked payment
  const matchingPayment = allPayments.find(p => 
    (delivery.paymentId && p.id === delivery.paymentId) ||
    (delivery.contractId && p.contractId === delivery.contractId) ||
    (delivery.quotationId && p.quotationId === delivery.quotationId) ||
    (delivery.soHopDong && p.soHopDong && delivery.soHopDong.trim().toLowerCase() === p.soHopDong.trim().toLowerCase())
  );

  const totalPaid = matchingPayment
    ? (Array.isArray(matchingPayment.cacDotThu) && matchingPayment.cacDotThu.length > 0
        ? matchingPayment.cacDotThu.reduce((sum: number, d: any) => sum + (Number(d.soTien) || 0), 0)
        : Number(matchingPayment.soTien || 0))
    : 0;

  // Calculate past shipments' values
  const pastShipments = Array.isArray(delivery.cacDotGiao) ? delivery.cacDotGiao : [];
  const pastShippedValue = pastShipments.reduce((sum, s) => sum + (Number(s.giaTriXuatKhoDotNay) || 0), 0);

  const cumulativeShippedValue = pastShippedValue + (Number(currentShipmentValue) || 0);
  const shortfallAmount = Math.max(0, cumulativeShippedValue - totalPaid);

  const isPassed = totalPaid >= cumulativeShippedValue || (matchingPayment && matchingPayment.tinhTrangThanhToan === 'HOAN_TAT');
  const requiresExecutiveWaiver = !isPassed;

  return {
    isPassed,
    totalPaid,
    cumulativeShippedValue,
    shortfallAmount,
    requiresExecutiveWaiver,
    warningMessage: requiresExecutiveWaiver
      ? `Tổng giá trị xuất kho (${new Intl.NumberFormat('vi-VN').format(cumulativeShippedValue)} ₫) vượt quá số tiền đã thanh toán (${new Intl.NumberFormat('vi-VN').format(totalPaid)} ₫). Cần phê duyệt Đặc cách Ban Giám Đốc.`
      : undefined,
  };
}

/**
 * Zero-Loss Auto-Migration: Merges discrete multi-document deliveries into
 * single master records with cacDotGiao[] ledgers.
 */
export function migrateLegacyDeliveriesToUnifiedLedger(deliveries: Delivery[]): Delivery[] {
  if (!Array.isArray(deliveries) || deliveries.length === 0) return [];

  // Group by unique order reference (contractId -> soHopDong -> quotationId)
  const groupMap = new Map<string, Delivery[]>();

  deliveries.forEach(d => {
    let groupKey = '';
    if (d.contractId && d.contractId !== '') {
      groupKey = `contract:${d.contractId}`;
    } else if (d.soHopDong && d.soHopDong.trim() !== '') {
      groupKey = `contract_code:${d.soHopDong.trim().toLowerCase()}`;
    } else if (d.quotationId && d.quotationId !== '') {
      groupKey = `quotation:${d.quotationId}`;
    } else if (d.soDonHang && d.soDonHang.trim() !== '') {
      groupKey = `order_code:${d.soDonHang.trim().toLowerCase()}`;
    } else {
      groupKey = `standalone:${d.id || d.deliveryId}`;
    }

    const list = groupMap.get(groupKey) || [];
    list.push(d);
    groupMap.set(groupKey, list);
  });

  const unifiedList: Delivery[] = [];

  groupMap.forEach((groupDocs) => {
    if (groupDocs.length === 1) {
      // Single doc: Ensure cacDotGiao has at least 1 shipment if soPhieuXuat exists
      const doc = { ...groupDocs[0] };
      if ((!doc.cacDotGiao || doc.cacDotGiao.length === 0) && doc.soPhieuXuat) {
        const initialShipment: DeliveryShipment = {
          id: `DOT-${doc.dotGiaoHang || 1}`,
          dotGiaoHang: doc.dotGiaoHang || 1,
          soPhieuXuat: doc.soPhieuXuat,
          ngayGiaoMay: doc.ngayGiaoMay || '',
          ngayGiaoThucTe: doc.ngayGiaoThucTe || null,
          tinhTrangGiaoHang: doc.tinhTrangGiaoHang || 'CHO_GIAO',
          products: doc.products || [],
          danhSachMaMay: doc.danhSachMaMay || [],
          slMay: doc.slMay,
          dvt: doc.dvt || 'Máy',
          thoGiaoMay: doc.thoGiaoMay || '',
          sdtThoGiaoMay: doc.sdtThoGiaoMay || '',
          donViVanChuyen: doc.donViVanChuyen || '',
          soDienThoaiDonViVanChuyen: doc.soDienThoaiDonViVanChuyen || '',
          keToanKho: doc.keToanKho || '',
          khoXuat: doc.khoXuat || '',
          soBienBanNghiemThu: doc.soBienBanNghiemThu || '',
          ngayNghiemThu: doc.ngayNghiemThu || '',
          tinhTrangNghiemThu: doc.tinhTrangNghiemThu || 'DONG_Y',
          yKienNghiemThu: doc.yKienNghiemThu || '',
          kyNhan: doc.kyNhan || '',
          ghiChu: doc.ghiChu || '',
          dacCachGiaoTruoc: doc.dacCachGiaoTruoc || false,
          lyDoDacCach: doc.lyDoDacCach || '',
          nguoiPheDuyetDacCach: doc.nguoiPheDuyetDacCach || '',
          thongTinGuiZnsGiaoHang: doc.thongTinGuiZnsGiaoHang,
          trangThaiGuiTinGiaoHang: doc.trangThaiGuiTinGiaoHang,
          isDotCuoiCung: doc.isDotCuoiCung || false,
          giaTriXuatKhoDotNay: doc.giaTriXuatKhoDotNay,
          createdAt: doc.ngayLapPgh || doc.ngayGiaoMay || new Date().toISOString(),
        };
        doc.cacDotGiao = [initialShipment];
      }
      unifiedList.push(doc);
      return;
    }

    // Multiple docs for same order: Merge into master
    // Sort by dotGiaoHang or createdAt
    const sorted = [...groupDocs].sort((a, b) => {
      const dotA = a.dotGiaoHang || 1;
      const dotB = b.dotGiaoHang || 1;
      if (dotA !== dotB) return dotA - dotB;
      const dateA = a.ngayLapPgh || a.ngayGiaoMay || '';
      const dateB = b.ngayLapPgh || b.ngayGiaoMay || '';
      return dateA.localeCompare(dateB);
    });

    const master = { ...sorted[0] };
    const mergedShipments: DeliveryShipment[] = [];

    // Collect all existing shipments or discrete docs
    sorted.forEach((doc, idx) => {
      if (doc.cacDotGiao && doc.cacDotGiao.length > 0) {
        doc.cacDotGiao.forEach(s => {
          if (!mergedShipments.some(ms => ms.soPhieuXuat === s.soPhieuXuat && ms.dotGiaoHang === s.dotGiaoHang)) {
            mergedShipments.push(s);
          }
        });
      } else if (doc.soPhieuXuat) {
        const dotNum = doc.dotGiaoHang || (idx + 1);
        mergedShipments.push({
          id: `DOT-${dotNum}`,
          dotGiaoHang: dotNum,
          soPhieuXuat: doc.soPhieuXuat,
          ngayGiaoMay: doc.ngayGiaoMay || '',
          ngayGiaoThucTe: doc.ngayGiaoThucTe || null,
          tinhTrangGiaoHang: doc.tinhTrangGiaoHang || 'CHO_GIAO',
          products: doc.products || [],
          danhSachMaMay: doc.danhSachMaMay || [],
          slMay: doc.slMay,
          dvt: doc.dvt || 'Máy',
          thoGiaoMay: doc.thoGiaoMay || '',
          sdtThoGiaoMay: doc.sdtThoGiaoMay || '',
          donViVanChuyen: doc.donViVanChuyen || '',
          soDienThoaiDonViVanChuyen: doc.soDienThoaiDonViVanChuyen || '',
          keToanKho: doc.keToanKho || '',
          khoXuat: doc.khoXuat || '',
          soBienBanNghiemThu: doc.soBienBanNghiemThu || '',
          ngayNghiemThu: doc.ngayNghiemThu || '',
          tinhTrangNghiemThu: doc.tinhTrangNghiemThu || 'DONG_Y',
          yKienNghiemThu: doc.yKienNghiemThu || '',
          kyNhan: doc.kyNhan || '',
          ghiChu: doc.ghiChu || '',
          dacCachGiaoTruoc: doc.dacCachGiaoTruoc || false,
          lyDoDacCach: doc.lyDoDacCach || '',
          nguoiPheDuyetDacCach: doc.nguoiPheDuyetDacCach || '',
          thongTinGuiZnsGiaoHang: doc.thongTinGuiZnsGiaoHang,
          trangThaiGuiTinGiaoHang: doc.trangThaiGuiTinGiaoHang,
          isDotCuoiCung: doc.isDotCuoiCung || (idx === sorted.length - 1),
          giaTriXuatKhoDotNay: doc.giaTriXuatKhoDotNay,
          createdAt: doc.ngayLapPgh || doc.ngayGiaoMay || new Date().toISOString(),
        });
      }
    });

    master.cacDotGiao = mergedShipments;
    const latestShipment = mergedShipments[mergedShipments.length - 1];
    if (latestShipment) {
      master.soPhieuXuat = latestShipment.soPhieuXuat;
      master.ngayGiaoMay = latestShipment.ngayGiaoMay;
      master.ngayGiaoThucTe = latestShipment.ngayGiaoThucTe;
      master.thoGiaoMay = latestShipment.thoGiaoMay;
      master.sdtThoGiaoMay = latestShipment.sdtThoGiaoMay;
      master.donViVanChuyen = latestShipment.donViVanChuyen;
    }

    const recon = reconcileDeliveryShipments(master);
    master.tienDoLuyKe = recon.tienDoLuyKe;
    if (recon.isFullyDelivered) {
      master.tinhTrangGiaoHang = 'HOAN_TAT';
    }

    unifiedList.push(master);
  });

  return unifiedList;
}
