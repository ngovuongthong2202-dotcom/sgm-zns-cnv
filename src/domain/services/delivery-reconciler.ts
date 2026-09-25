/**
 * SGM Enterprise Isomorphic Delivery Reconciliation Engine
 * Single Source of Truth for calculating shipment fulfillment, multi-shipment tracking,
 * and delivery gating across Sales, Contracts, Billing, and Fulfillment.
 */

export interface ReconcilerProductItem {
  id?: string;
  productId?: string;
  productCode?: string;
  code?: string;
  productName?: string;
  tenSanPham?: string;
  quantity?: number;
  soLuong?: number;
  [key: string]: unknown;
}

export interface ReconcilerSourceDocument {
  id?: string;
  paymentId?: string;
  contractId?: string;
  quotationId?: string;
  soHopDong?: string;
  soPhieuBaoGia?: string;
  soDonHang?: string;
  soChungTuThamChieu?: string;
  products?: ReconcilerProductItem[];
  sanPham?: ReconcilerProductItem[];
  items?: ReconcilerProductItem[];
  deliveredQuantities?: Record<string, number>;
  slMay?: number;
  tinhTrangGiaoHang?: string;
  deletedAt?: string | null;
  deleted_at?: string | null;
  ngayGiaoThucTe?: string | null;
  [key: string]: unknown;
}

function isUuidString(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
}

export function isDeliveryCancelled(status?: string | null): boolean {
  if (!status) return false;
  const s = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase();
  return s === 'HUY' || s === 'DA HUY' || s === 'CANCELLED';
}

/**
 * Standardized key generator for line items in quotations, contracts, and deliveries.
 * Priority: productId -> productName/tenSanPham -> clean non-uuid id -> index
 */
export function getItemKey(
  p: ReconcilerProductItem | null | undefined,
  index?: number
): string {
  if (!p) return typeof index === 'number' ? String(index) : 'unknown';
  if (p.productId && String(p.productId).trim() !== '') {
    return String(p.productId).trim();
  }
  const name = p.productName || p.tenSanPham;
  if (name && String(name).trim() !== '') {
    return String(name).trim();
  }
  if (p.id && !isUuidString(String(p.id)) && String(p.id).length < 32) {
    return String(p.id);
  }
  return typeof index === 'number' ? String(index) : 'unknown';
}

/**
 * Computes map of accumulated delivered quantities from a list of deliveries.
 * Each item's quantity is aggregated uniquely across its identifier aliases (key, productId, productName).
 */
export function computeDeliveredQuantitiesMap(
  deliveries: ReconcilerSourceDocument[] = []
): Record<string, number> {
  const actualDeliveredMap: Record<string, number> = {};
  const validDeliveries = (deliveries || []).filter((d) =>
    !d.deletedAt && !d.deleted_at && !isDeliveryCancelled(d.tinhTrangGiaoHang)
  );

  for (const d of validDeliveries) {
    const items: ReconcilerProductItem[] = Array.isArray(d.products) && d.products.length > 0
      ? d.products
      : (Array.isArray(d.sanPham) ? d.sanPham : []);

    items.forEach((dp, idx) => {
      const primaryKey = getItemKey(dp, idx);
      const qty = Number(dp.quantity || dp.soLuong || 0);

      const keys = new Set<string>();
      keys.add(primaryKey);
      if (dp.productId && String(dp.productId).trim()) {
        keys.add(String(dp.productId).trim());
      }
      const pName = dp.productName || dp.tenSanPham;
      if (pName && String(pName).trim()) {
        keys.add(String(pName).trim().toLowerCase());
      }

      keys.forEach((k) => {
        actualDeliveredMap[k] = (actualDeliveredMap[k] || 0) + qty;
      });
    });
  }
  return actualDeliveredMap;
}

/**
 * Determines whether a source document (Payment / Contract / Quotation) has had
 * 100% of its contracted items delivered across all linked delivery shipments.
 */
export function isSourceDocumentFullyDelivered(
  sourceDoc: ReconcilerSourceDocument | null | undefined,
  deliveries: ReconcilerSourceDocument[] = [],
  contracts: ReconcilerSourceDocument[] = [],
  quotations: ReconcilerSourceDocument[] = []
): boolean {
  if (!sourceDoc) return false;

  const validDeliveries = (deliveries || []).filter((d) =>
    !d.deletedAt && !d.deleted_at && !isDeliveryCancelled(d.tinhTrangGiaoHang)
  );

  const contractData = sourceDoc.contractId
    ? contracts.find((c) => c.id === sourceDoc.contractId || c.soHopDong === sourceDoc.soHopDong)
    : (sourceDoc.soHopDong ? contracts.find((c) => c.soHopDong === sourceDoc.soHopDong) : null);

  const quotationData = sourceDoc.quotationId
    ? quotations.find((q) => q.id === sourceDoc.quotationId || q.soPhieuBaoGia === sourceDoc.soPhieuBaoGia)
    : (sourceDoc.soPhieuBaoGia ? quotations.find((q) => q.soPhieuBaoGia === sourceDoc.soPhieuBaoGia) : null);

  const productList: ReconcilerProductItem[] =
    (Array.isArray(sourceDoc.products) && sourceDoc.products.length > 0 ? sourceDoc.products : null) ||
    (Array.isArray(sourceDoc.sanPham) && sourceDoc.sanPham.length > 0 ? sourceDoc.sanPham : null) ||
    (Array.isArray(contractData?.products) && contractData.products.length > 0 ? contractData.products : null) ||
    (Array.isArray(contractData?.sanPham) && contractData.sanPham.length > 0 ? contractData.sanPham : null) ||
    (Array.isArray(quotationData?.products) && quotationData.products.length > 0 ? quotationData.products : null) ||
    (Array.isArray(quotationData?.sanPham) && quotationData.sanPham.length > 0 ? quotationData.sanPham : null) ||
    (Array.isArray(sourceDoc.items) && sourceDoc.items.length > 0 ? sourceDoc.items : null) ||
    [];

  const linkedDeliveries = validDeliveries.filter((d) => {
    if (d.paymentId && (d.paymentId === sourceDoc.id || d.paymentId === sourceDoc.paymentId)) return true;
    if (d.soChungTuThamChieu && (d.soChungTuThamChieu === sourceDoc.paymentId || d.soChungTuThamChieu === sourceDoc.id)) return true;
    if (contractData && d.contractId && d.contractId === contractData.id) return true;
    if (sourceDoc.contractId && d.contractId && d.contractId === sourceDoc.contractId) return true;
    if (sourceDoc.soHopDong && d.soHopDong && d.soHopDong === sourceDoc.soHopDong) return true;
    if (quotationData && d.quotationId && d.quotationId === quotationData.id) return true;
    if (sourceDoc.quotationId && d.quotationId && d.quotationId === sourceDoc.quotationId) return true;
    if (sourceDoc.soPhieuBaoGia && d.soPhieuBaoGia && d.soPhieuBaoGia === sourceDoc.soPhieuBaoGia) return true;
    if (sourceDoc.soDonHang && d.soDonHang && d.soDonHang === sourceDoc.soDonHang) return true;
    return false;
  });

  if (productList.length > 0) {
    const actualDeliveredMap = computeDeliveredQuantitiesMap(linkedDeliveries);
    const sourceDeliveredQuantities = (sourceDoc.deliveredQuantities || contractData?.deliveredQuantities || quotationData?.deliveredQuantities || {}) as Record<string, number>;

    let totalContracted = 0;
    let allItemsDone = true;

    for (const [index, cp] of productList.entries()) {
      const itemKey = getItemKey(cp, index);
      const reqQty = Number(cp.quantity || cp.soLuong || 0);
      totalContracted += reqQty;

      const normName = String(cp.productName || cp.tenSanPham || '').trim().toLowerCase();
      const fromDeliveries = Number(
        actualDeliveredMap[itemKey] ??
        (cp.productId ? actualDeliveredMap[String(cp.productId).trim()] : undefined) ??
        (normName ? actualDeliveredMap[normName] : undefined) ??
        0
      );
      const fromSource = Number(sourceDeliveredQuantities[itemKey] || 0);
      const deliveredCount = Math.max(fromDeliveries, fromSource);

      if (deliveredCount < reqQty) {
        allItemsDone = false;
      }
    }

    // Khi chứng từ có mảng sản phẩm, trạng thái giao đủ phụ thuộc hoàn toàn vào kết quả duyệt từng sản phẩm
    return totalContracted > 0 && allItemsDone;
  }

  // Fallback 1: Trường hợp giao máy theo số lượng tổng slMay (không có mảng chi tiết sản phẩm)
  const totalSlMay = Number(sourceDoc.slMay || contractData?.slMay || quotationData?.slMay || 0);
  if (totalSlMay > 0) {
    const totalDeliveredSlMay = linkedDeliveries.reduce((sum: number, d) => sum + Number(d.slMay || 0), 0);
    return totalDeliveredSlMay >= totalSlMay;
  }

  // Fallback 2: Hồ sơ cũ không quản lý danh mục sản phẩm chi tiết
  const hasCompletedDelivery = linkedDeliveries.some((d) =>
    (d.tinhTrangGiaoHang === 'Hoàn tất' || d.tinhTrangGiaoHang === 'HOÀN TẤT' || d.tinhTrangGiaoHang === 'Hoàn thành' || !!d.ngayGiaoThucTe) &&
    (Array.isArray(d.products) && d.products.length > 0)
  );

  return Boolean(hasCompletedDelivery && linkedDeliveries.length > 0);
}

/**
 * Validates a new shipment to ensure no line item exceeds the remaining undelivered quantity.
 */
export function validateShipmentQuantities(
  newShipmentItems: ReconcilerProductItem[] = [],
  contractedProducts: ReconcilerProductItem[] = [],
  existingDeliveries: ReconcilerSourceDocument[] = [],
  sourceDeliveredQuantities: Record<string, number> = {}
): { valid: boolean; error?: string; overItemName?: string } {
  if (!contractedProducts || contractedProducts.length === 0) {
    return { valid: true };
  }

  const deliveredMap = computeDeliveredQuantitiesMap(existingDeliveries);

  for (const [index, cp] of contractedProducts.entries()) {
    const itemKey = getItemKey(cp, index);
    const contractedQty = Number(cp.quantity || cp.soLuong || 0);
    const normName = String(cp.productName || cp.tenSanPham || '').trim().toLowerCase();

    const fromDeliveries = Number(
      deliveredMap[itemKey] ??
      (cp.productId ? deliveredMap[String(cp.productId).trim()] : undefined) ??
      (normName ? deliveredMap[normName] : undefined) ??
      0
    );
    const fromSource = Number(sourceDeliveredQuantities[itemKey] || 0);
    const previousDelivered = Math.max(fromDeliveries, fromSource);

    const matchingNewItem = newShipmentItems.find((np, nIdx) => {
      const nKey = getItemKey(np, nIdx);
      if (nKey === itemKey) return true;
      if (np.productId && cp.productId && String(np.productId).trim() === String(cp.productId).trim()) return true;
      const npName = String(np.productName || np.tenSanPham || '').trim().toLowerCase();
      return Boolean(npName && normName && npName === normName);
    });

    const newShipmentQty = Number(matchingNewItem?.quantity || matchingNewItem?.soLuong || 0);
    const remainingAllowed = Math.max(0, contractedQty - previousDelivered);

    if (newShipmentQty > remainingAllowed) {
      const label = cp.productName || cp.tenSanPham || itemKey;
      return {
        valid: false,
        error: `Sản phẩm ${label} vượt quá số lượng còn lại cho phép (${remainingAllowed}, yêu cầu: ${newShipmentQty})`,
        overItemName: label
      };
    }
  }

  return { valid: true };
}
