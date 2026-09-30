import { Delivery } from '@/src/domain/schema/delivery.schema';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';

export interface ResolvedDeliverySource {
  source: any;
  sourceType: 'contracts' | 'quotations';
  sourceId: string;
}

/**
 * Sovereign Source Document Resolver (SH-MLE)
 * Phân giải chứng từ nguồn đa tầng (Cache -> Direct ID -> Payment Fallback -> Code Matching)
 * Đảm bảo 100% tìm thấy đúng chứng từ tham chiếu (Hợp đồng / Báo giá).
 */
export async function resolveDeliverySourceDocument(
  data: Partial<Delivery> | any,
  options?: {
    contracts?: any[];
    quotations?: any[];
    payments?: any[];
  }
): Promise<ResolvedDeliverySource | null> {
  if (!data) return null;

  const rawContractId = typeof data.contractId === 'string' ? data.contractId.trim() : '';
  const rawQuotationId = typeof data.quotationId === 'string' ? data.quotationId.trim() : '';
  const rawPaymentId = typeof data.paymentId === 'string' ? data.paymentId.trim() : '';
  const soHopDong = typeof data.soHopDong === 'string' ? data.soHopDong.trim() : '';
  const soPhieuBaoGia = (typeof data.soPhieuBaoGia === 'string' ? data.soPhieuBaoGia.trim() : '') ||
                        (typeof data.soBaoGia === 'string' ? data.soBaoGia.trim() : '');

  // ═══ TẦNG 1: Tra cứu Hợp Đồng (Nếu có contractId) ═══
  if (rawContractId) {
    // 1.1 Props/Cache
    const memContract = (options?.contracts || []).find((c: any) => c && (c.id === rawContractId || c.soHopDong === rawContractId)) ||
                        entityCachePool.get('contracts', rawContractId) ||
                        entityCachePool.find('contracts', (c: any) => c.id === rawContractId || c.soHopDong === rawContractId);
    if (memContract) {
      return { source: memContract, sourceType: 'contracts', sourceId: memContract.id || rawContractId };
    }

    // 1.2 Repository GetById
    try {
      const snap = await repositoryFactory.get<any>('contracts').getById(rawContractId);
      if (snap) {
        return { source: snap, sourceType: 'contracts', sourceId: snap.id || rawContractId };
      }
    } catch {
      // Tiếp tục fallback tầng tiếp theo
    }

    // 1.3 Self-Healing: Nếu contractId thực chất là quotationId do dữ liệu cũ bị ô nhiễm
    const memQuo = (options?.quotations || []).find((q: any) => q && (q.id === rawContractId || q.soPhieuBaoGia === rawContractId)) ||
                   entityCachePool.get('quotations', rawContractId);
    if (memQuo) {
      return { source: memQuo, sourceType: 'quotations', sourceId: memQuo.id || rawContractId };
    }
    try {
      const qSnap = await repositoryFactory.get<any>('quotations').getById(rawContractId);
      if (qSnap) {
        return { source: qSnap, sourceType: 'quotations', sourceId: qSnap.id || rawContractId };
      }
    } catch {
      // Tiếp tục fallback
    }
  }

  // ═══ TẦNG 2: Tra cứu Báo Giá (Nếu có quotationId) ═══
  if (rawQuotationId) {
    // 2.1 Props/Cache
    const memQuotation = (options?.quotations || []).find((q: any) => q && (q.id === rawQuotationId || q.soPhieuBaoGia === rawQuotationId)) ||
                         entityCachePool.get('quotations', rawQuotationId) ||
                         entityCachePool.find('quotations', (q: any) => q.id === rawQuotationId || q.soPhieuBaoGia === rawQuotationId);
    if (memQuotation) {
      return { source: memQuotation, sourceType: 'quotations', sourceId: memQuotation.id || rawQuotationId };
    }

    // 2.2 Repository GetById
    try {
      const snap = await repositoryFactory.get<any>('quotations').getById(rawQuotationId);
      if (snap) {
        return { source: snap, sourceType: 'quotations', sourceId: snap.id || rawQuotationId };
      }
    } catch {
      // Tiếp tục fallback tầng tiếp theo
    }

    // 2.3 Self-Healing: Nếu quotationId thực chất là contractId
    const memContract = (options?.contracts || []).find((c: any) => c && (c.id === rawQuotationId || c.soHopDong === rawQuotationId)) ||
                        entityCachePool.get('contracts', rawQuotationId);
    if (memContract) {
      return { source: memContract, sourceType: 'contracts', sourceId: memContract.id || rawQuotationId };
    }
  }

  // ═══ TẦNG 3: Phân giải thông qua Phiếu Thu (Payment Linkage Fallback) ═══
  if (rawPaymentId) {
    let paymentDoc = (options?.payments || []).find((p: any) => p && (p.id === rawPaymentId || p.paymentId === rawPaymentId)) ||
                     entityCachePool.get('payments', rawPaymentId) ||
                     entityCachePool.find('payments', (p: any) => p.id === rawPaymentId || p.paymentId === rawPaymentId);

    if (!paymentDoc) {
      try {
        paymentDoc = await repositoryFactory.get<any>('payments').getById(rawPaymentId);
      } catch {
        // ignore
      }
    }

    if (paymentDoc) {
      // Nếu Payment trỏ tới HĐ
      if (paymentDoc.contractId) {
        const cSnap = (options?.contracts || []).find((c: any) => c.id === paymentDoc.contractId || c.soHopDong === paymentDoc.contractId) ||
                      entityCachePool.get('contracts', paymentDoc.contractId);
        if (cSnap) return { source: cSnap, sourceType: 'contracts', sourceId: cSnap.id || paymentDoc.contractId };
        try {
          const fetchedC = await repositoryFactory.get<any>('contracts').getById(paymentDoc.contractId);
          if (fetchedC) return { source: fetchedC, sourceType: 'contracts', sourceId: fetchedC.id || paymentDoc.contractId };
        } catch {
          // ignore
        }
      }

      // Nếu Payment trỏ tới Báo giá (BG Vật tư / BG Dịch vụ)
      if (paymentDoc.quotationId) {
        const qSnap = (options?.quotations || []).find((q: any) => q.id === paymentDoc.quotationId || q.soPhieuBaoGia === paymentDoc.quotationId) ||
                      entityCachePool.get('quotations', paymentDoc.quotationId);
        if (qSnap) return { source: qSnap, sourceType: 'quotations', sourceId: qSnap.id || paymentDoc.quotationId };
        try {
          const fetchedQ = await repositoryFactory.get<any>('quotations').getById(paymentDoc.quotationId);
          if (fetchedQ) return { source: fetchedQ, sourceType: 'quotations', sourceId: fetchedQ.id || paymentDoc.quotationId };
        } catch {
          // ignore
        }
      }

      // Nếu Payment có sẵn thông tin sản phẩm và là BG Vật tư / Dịch vụ độc lập
      if (paymentDoc.products && Array.isArray(paymentDoc.products) && paymentDoc.products.length > 0) {
        return {
          source: paymentDoc,
          sourceType: paymentDoc.contractId ? 'contracts' : 'quotations',
          sourceId: paymentDoc.contractId || paymentDoc.quotationId || paymentDoc.id
        };
      }
    }
  }

  // ═══ TẦNG 4: Tra cứu theo Mã Nghiệp Vụ (Code Matching Fallback) ═══
  if (soHopDong) {
    const cMatch = entityCachePool.find('contracts', (c: any) => c.soHopDong === soHopDong || c.contractCode === soHopDong);
    if (cMatch) return { source: cMatch, sourceType: 'contracts', sourceId: cMatch.id };
  }
  if (soPhieuBaoGia) {
    const qMatch = (options?.quotations || []).find((q: any) => q && (q.soPhieuBaoGia === soPhieuBaoGia || q.soBaoGia === soPhieuBaoGia)) ||
                   entityCachePool.find('quotations', (q: any) => q.soPhieuBaoGia === soPhieuBaoGia || q.soBaoGia === soPhieuBaoGia);
    if (qMatch) return { source: qMatch, sourceType: 'quotations', sourceId: qMatch.id };
  }
  const soDonHangErp = typeof data.soDonHangErp === 'string' ? data.soDonHangErp.trim() : '';
  if (soDonHangErp) {
    const qMatch = (options?.quotations || []).find((q: any) => q && (q.soDonHangErp === soDonHangErp || q.sourceRef?.code === soDonHangErp)) ||
                   entityCachePool.find('quotations', (q: any) => q.soDonHangErp === soDonHangErp || q.sourceRef?.code === soDonHangErp);
    if (qMatch) return { source: qMatch, sourceType: 'quotations', sourceId: qMatch.id };
  }

  return null;
}
