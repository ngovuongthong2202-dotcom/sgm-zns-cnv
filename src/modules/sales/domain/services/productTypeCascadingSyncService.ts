import { repositoryFactory } from '@/src/data/repositories/factory';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { auditLogsRepo } from '@/src/data/repositories/system.repo';
import { ItemSemanticType, calculateActualMachineCount, detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';

export interface ProductTypeSyncImpact {
  quotationId: string;
  itemIndex: number;
  oldType: ItemSemanticType;
  newType: ItemSemanticType;
  productName: string;
  linkedContracts: any[];
  linkedPayments: any[];
  linkedDeliveries: any[];
  isDeliveredOrAssigned: boolean;
  deliveredQuantity: number;
  usedSerials: string[];
}

export interface ProductTypeSyncResult {
  success: boolean;
  updatedQuotation: any;
  syncedContractsCount: number;
  syncedPaymentsCount: number;
  syncedDeliveriesCount: number;
  recalculatedSlMay: number;
  message: string;
}

/**
 * Helper to match a product line item across linked entities
 */
function isMatchingProduct(target: any, targetIndex: number, candidate: any, candidateIndex: number): boolean {
  if (!target || !candidate) return false;
  if (target.productId && candidate.productId && String(target.productId).trim() === String(candidate.productId).trim()) {
    return true;
  }
  const targetName = String(target.productName || target.tenSanPham || '').trim().toLowerCase();
  const candName = String(candidate.productName || candidate.tenSanPham || '').trim().toLowerCase();
  if (targetName && candName && targetName === candName) {
    return true;
  }
  return targetIndex === candidateIndex;
}

/**
 * Pre-evaluates the downstream impact of changing an item's product type.
 */
export async function analyzeProductTypeImpact(
  quotation: Quotation,
  itemIndex: number,
  newType: ItemSemanticType
): Promise<ProductTypeSyncImpact> {
  const products = Array.isArray(quotation.products) ? quotation.products : [];
  const targetItem = products[itemIndex] || {};
  const currentType = (targetItem.itemType as ItemSemanticType) || detectItemType(targetItem.productName, targetItem.unit);

  const contractRepo = repositoryFactory.get<any>('contracts');
  const paymentRepo = repositoryFactory.get<any>('payments');
  const deliveryRepo = repositoryFactory.get<any>('deliveries');

  const [allContracts, allPayments, allDeliveries] = await Promise.all([
    contractRepo.list({ limit: 500 }).catch(() => []),
    paymentRepo.list({ limit: 500 }).catch(() => []),
    deliveryRepo.list({ limit: 500 }).catch(() => []),
  ]);

  const linkedContracts = (allContracts || []).filter((c: any) => 
    !c.deletedAt && !c.deleted_at &&
    ((c.quotationId && c.quotationId === quotation.id) || (quotation.soPhieuBaoGia && c.soPhieuBaoGia === quotation.soPhieuBaoGia))
  );
  const contractIds = new Set(linkedContracts.map((c: any) => c.id).filter(Boolean));
  const contractCodes = new Set(linkedContracts.map((c: any) => c.soHopDong).filter(Boolean));

  const linkedPayments = (allPayments || []).filter((p: any) => {
    if (p.deletedAt || p.deleted_at) return false;
    if (p.quotationId && p.quotationId === quotation.id) return true;
    if (quotation.soPhieuBaoGia && p.soPhieuBaoGia === quotation.soPhieuBaoGia) return true;
    if (p.contractId && contractIds.has(p.contractId)) return true;
    if (p.soHopDong && contractCodes.has(p.soHopDong)) return true;
    return false;
  });

  const paymentIds = new Set(linkedPayments.map((p: any) => p.id).filter(Boolean));

  const linkedDeliveries = (allDeliveries || []).filter((d: any) => {
    if (d.deletedAt || d.deleted_at || d.tinhTrangGiaoHang === 'HỦY' || d.tinhTrangGiaoHang === 'Hủy') return false;
    if (d.quotationId && d.quotationId === quotation.id) return true;
    if (quotation.soPhieuBaoGia && d.soPhieuBaoGia === quotation.soPhieuBaoGia) return true;
    if (d.contractId && contractIds.has(d.contractId)) return true;
    if (d.soHopDong && contractCodes.has(d.soHopDong)) return true;
    if (d.paymentId && paymentIds.has(d.paymentId)) return true;
    return false;
  });

  // Calculate delivered quantity and used serials for this line item
  let deliveredQuantity = 0;
  const usedSerials: string[] = [];

  linkedDeliveries.forEach((d: any) => {
    const dProds = Array.isArray(d.products) ? d.products : [];
    dProds.forEach((dp: any, dIdx: number) => {
      if (isMatchingProduct(targetItem, itemIndex, dp, dIdx)) {
        deliveredQuantity += Number(dp.quantity || dp.soLuong || 0);
        if (Array.isArray(dp.danhSachMaMay)) {
          dp.danhSachMaMay.forEach((s: string) => {
            if (s && !usedSerials.includes(s)) usedSerials.push(s);
          });
        }
      }
    });
  });

  const isDeliveredOrAssigned = deliveredQuantity > 0 || usedSerials.length > 0;

  return {
    quotationId: quotation.id || '',
    itemIndex,
    oldType: currentType,
    newType,
    productName: targetItem.productName || 'Sản phẩm',
    linkedContracts,
    linkedPayments,
    linkedDeliveries,
    isDeliveredOrAssigned,
    deliveredQuantity,
    usedSerials,
  };
}

/**
 * Performs atomic cascading sync of a product's itemType across Quotation -> Contracts -> Payments -> Deliveries.
 */
export async function syncProductTypeCascading(
  quotation: Quotation,
  itemIndex: number,
  newType: ItemSemanticType,
  actor: { email?: string; displayName?: string }
): Promise<ProductTypeSyncResult> {
  const impact = await analyzeProductTypeImpact(quotation, itemIndex, newType);
  const products = Array.isArray(quotation.products) ? JSON.parse(JSON.stringify(quotation.products)) : [];
  
  if (!products[itemIndex]) {
    throw new Error(`Không tìm thấy sản phẩm tại vị trí dòng số ${itemIndex + 1}`);
  }

  const oldType = impact.oldType;
  const targetItem = products[itemIndex];
  targetItem.itemType = newType;

  // 1. Recalculate quotation slMay and classification if necessary
  const newQuotationMachineCount = calculateActualMachineCount(products);
  const updatedQuotationPayload: Partial<Quotation> = {
    products,
    slMay: newQuotationMachineCount,
  };

  // If quotation was categorized as MACHINE but now has 0 machines, or vice-versa
  if (newQuotationMachineCount === 0 && normalizeLoai(quotation.loai) === QUOTATION_LOAI.MAY) {
    updatedQuotationPayload.loai = QUOTATION_LOAI.VAT_TU;
  } else if (newQuotationMachineCount > 0 && normalizeLoai(quotation.loai) !== QUOTATION_LOAI.MAY) {
    updatedQuotationPayload.loai = QUOTATION_LOAI.MAY;
  }

  // Update Quotation in DB & Cache
  const quoteRepo = repositoryFactory.get<any>('quotations');
  if (quotation.id) {
    await quoteRepo.update(quotation.id, updatedQuotationPayload);
  }
  const freshQuotation = { ...quotation, ...updatedQuotationPayload };
  entityCachePool.set('quotations', freshQuotation);

  // 2. Cascade update to linked Contracts
  const contractRepo = repositoryFactory.get<any>('contracts');
  let syncedContractsCount = 0;
  for (const contract of impact.linkedContracts) {
    const cProducts = Array.isArray(contract.products) ? JSON.parse(JSON.stringify(contract.products)) : [];
    let modified = false;

    cProducts.forEach((cp: any, cIdx: number) => {
      if (isMatchingProduct(targetItem, itemIndex, cp, cIdx)) {
        cp.itemType = newType;
        modified = true;
      }
    });

    if (modified || cProducts.length === 0) {
      const newContractSlMay = calculateActualMachineCount(cProducts);
      const cPayload: any = {
        products: cProducts,
        slMay: newContractSlMay,
      };
      await contractRepo.update(contract.id, cPayload);
      entityCachePool.set('contracts', { ...contract, ...cPayload });
      syncedContractsCount++;
    }
  }

  // 3. Cascade update to linked Payments
  const paymentRepo = repositoryFactory.get<any>('payments');
  let syncedPaymentsCount = 0;
  for (const payment of impact.linkedPayments) {
    let modified = false;
    const pPayload: any = {};

    if (Array.isArray(payment.products) && payment.products.length > 0) {
      const pProducts = JSON.parse(JSON.stringify(payment.products));
      pProducts.forEach((pp: any, pIdx: number) => {
        if (isMatchingProduct(targetItem, itemIndex, pp, pIdx)) {
          pp.itemType = newType;
          modified = true;
        }
      });
      if (modified) {
        pPayload.products = pProducts;
        pPayload.slMay = calculateActualMachineCount(pProducts);
      }
    }

    if (modified) {
      await paymentRepo.update(payment.id, pPayload);
      entityCachePool.set('payments', { ...payment, ...pPayload });
      syncedPaymentsCount++;
    }
  }

  // 4. Cascade update to linked Deliveries
  const deliveryRepo = repositoryFactory.get<any>('deliveries');
  let syncedDeliveriesCount = 0;
  for (const delivery of impact.linkedDeliveries) {
    let modified = false;
    const dPayload: any = {};

    if (Array.isArray(delivery.products) && delivery.products.length > 0) {
      const dProducts = JSON.parse(JSON.stringify(delivery.products));
      dProducts.forEach((dp: any, dIdx: number) => {
        if (isMatchingProduct(targetItem, itemIndex, dp, dIdx)) {
          dp.itemType = newType;
          modified = true;
        }
      });
      if (modified) {
        dPayload.products = dProducts;
        dPayload.slMay = calculateActualMachineCount(dProducts);
      }
    }

    if (modified) {
      await deliveryRepo.update(delivery.id, dPayload);
      entityCachePool.set('deliveries', { ...delivery, ...dPayload });
      syncedDeliveriesCount++;
    }
  }

  // 5. Record Audit Log for Governance & Traceability
  const author = actor.displayName || actor.email || 'Admin';
  const now = new Date().toISOString();
  const summaryMsg = `Admin ${author} đã đổi loại sản phẩm "${targetItem.productName}" từ [${oldType}] sang [${newType}]. Tự động đồng bộ: ${syncedContractsCount} HĐ, ${syncedPaymentsCount} Phiếu thu, ${syncedDeliveriesCount} Phiếu giao hàng.`;

  try {
    await auditLogsRepo.create({
      id: crypto.randomUUID(),
      action: 'ADMIN_PRODUCT_TYPE_CASCADED',
      entityId: quotation.id || '',
      entityType: 'quotation',
      timestamp: now,
      userId: author,
      details: {
        productName: targetItem.productName,
        oldType,
        newType,
        syncedContractsCount,
        syncedPaymentsCount,
        syncedDeliveriesCount,
        newQuotationMachineCount,
      }
    });

    if (quotation.customerId) {
      await repositoryFactory.get<any>('customerNotes').create({
        customerId: quotation.customerId,
        content: `[Điều chỉnh Phân loại Sản phẩm] ${summaryMsg}`,
        tags: ['he-thong', 'dong-bo-san-pham'],
        mentions: [],
        createdBy: author,
        createdAt: now,
      });
    }
  } catch (err) {
    console.warn('[syncProductTypeCascading] Failed to write audit log note:', err);
  }

  return {
    success: true,
    updatedQuotation: freshQuotation,
    syncedContractsCount,
    syncedPaymentsCount,
    syncedDeliveriesCount,
    recalculatedSlMay: newQuotationMachineCount,
    message: summaryMsg,
  };
}
