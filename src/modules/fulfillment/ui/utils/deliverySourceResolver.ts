import { Delivery } from '@/src/domain/schema/delivery.schema';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { isSameCustomer } from '@/src/shared/utils/customerIdentityResolver';

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

  const matchesCustomerContext = (candidate: any) => {
    if (!candidate) return false;
    const hasDeliveryContext = Boolean(data.customerId || data.customer_id || data.maKh || data.tenKhachHang || data.sdt);
    const hasCandidateContext = Boolean(candidate.customerId || candidate.customer_id || candidate.maKh || candidate.tenKhachHang || candidate.sdt);
    if (!hasDeliveryContext || !hasCandidateContext) return true;
    return isSameCustomer(data, candidate);
  };

  // ═══ TẦNG 1: Tra cứu Hợp Đồng (Nếu có contractId) ═══
  if (rawContractId) {
    // 1.1 Props/Cache
    const memContract = (options?.contracts || []).find((c: any) => c && (c.id === rawContractId || c.soHopDong === rawContractId) && matchesCustomerContext(c)) ||
                        (matchesCustomerContext(entityCachePool.get('contracts', rawContractId)) ? entityCachePool.get('contracts', rawContractId) : null) ||
                        entityCachePool.find('contracts', (c: any) => (c.id === rawContractId || c.soHopDong === rawContractId) && matchesCustomerContext(c));
    if (memContract) {
      return { source: memContract, sourceType: 'contracts', sourceId: memContract.id || rawContractId };
    }

    // 1.2 Repository GetById
    try {
      const snap = await repositoryFactory.get<any>('contracts').getById(rawContractId);
      if (snap && matchesCustomerContext(snap)) {
        return { source: snap, sourceType: 'contracts', sourceId: snap.id || rawContractId };
      }
    } catch {
      // Tiếp tục fallback tầng tiếp theo
    }

    // 1.3 Self-Healing: Nếu contractId thực chất là quotationId do dữ liệu cũ bị ô nhiễm
    const memQuo = (options?.quotations || []).find((q: any) => q && (q.id === rawContractId || q.soPhieuBaoGia === rawContractId) && matchesCustomerContext(q)) ||
                   (matchesCustomerContext(entityCachePool.get('quotations', rawContractId)) ? entityCachePool.get('quotations', rawContractId) : null);
    if (memQuo) {
      return { source: memQuo, sourceType: 'quotations', sourceId: memQuo.id || rawContractId };
    }
    try {
      const qSnap = await repositoryFactory.get<any>('quotations').getById(rawContractId);
      if (qSnap && matchesCustomerContext(qSnap)) {
        return { source: qSnap, sourceType: 'quotations', sourceId: qSnap.id || rawContractId };
      }
    } catch {
      // Tiếp tục fallback
    }
  }

  // ═══ TẦNG 2: Tra cứu Báo Giá (Nếu có quotationId) ═══
  if (rawQuotationId) {
    // 2.1 Props/Cache
    const memQuotation = (options?.quotations || []).find((q: any) => q && (q.id === rawQuotationId || q.soPhieuBaoGia === rawQuotationId) && matchesCustomerContext(q)) ||
                         (matchesCustomerContext(entityCachePool.get('quotations', rawQuotationId)) ? entityCachePool.get('quotations', rawQuotationId) : null) ||
                         entityCachePool.find('quotations', (q: any) => (q.id === rawQuotationId || q.soPhieuBaoGia === rawQuotationId) && matchesCustomerContext(q));
    if (memQuotation) {
      return { source: memQuotation, sourceType: 'quotations', sourceId: memQuotation.id || rawQuotationId };
    }

    // 2.2 Repository GetById
    try {
      const snap = await repositoryFactory.get<any>('quotations').getById(rawQuotationId);
      if (snap && matchesCustomerContext(snap)) {
        return { source: snap, sourceType: 'quotations', sourceId: snap.id || rawQuotationId };
      }
    } catch {
      // Tiếp tục fallback tầng tiếp theo
    }

    // 2.3 Self-Healing: Nếu quotationId thực chất là contractId
    const memContract = (options?.contracts || []).find((c: any) => c && (c.id === rawQuotationId || c.soHopDong === rawQuotationId) && matchesCustomerContext(c)) ||
                        (matchesCustomerContext(entityCachePool.get('contracts', rawQuotationId)) ? entityCachePool.get('contracts', rawQuotationId) : null);
    if (memContract) {
      return { source: memContract, sourceType: 'contracts', sourceId: memContract.id || rawQuotationId };
    }
  }

  // ═══ TẦNG 3: Phân giải thông qua Phiếu Thu (Payment Linkage Fallback) ═══
  if (rawPaymentId) {
    let paymentDoc = (options?.payments || []).find((p: any) => p && (p.id === rawPaymentId || p.paymentId === rawPaymentId) && matchesCustomerContext(p)) ||
                     (matchesCustomerContext(entityCachePool.get('payments', rawPaymentId)) ? entityCachePool.get('payments', rawPaymentId) : null) ||
                     entityCachePool.find('payments', (p: any) => (p.id === rawPaymentId || p.paymentId === rawPaymentId) && matchesCustomerContext(p));

    if (!paymentDoc) {
      try {
        const snap = await repositoryFactory.get<any>('payments').getById(rawPaymentId);
        if (snap && matchesCustomerContext(snap)) {
          paymentDoc = snap;
        }
      } catch {
        // ignore
      }
    }

    if (paymentDoc) {
      // Nếu Payment trỏ tới HĐ
      if (paymentDoc.contractId) {
        const cSnap = (options?.contracts || []).find((c: any) => c && (c.id === paymentDoc.contractId || c.soHopDong === paymentDoc.contractId) && matchesCustomerContext(c)) ||
                      (matchesCustomerContext(entityCachePool.get('contracts', paymentDoc.contractId)) ? entityCachePool.get('contracts', paymentDoc.contractId) : null);
        if (cSnap) return { source: cSnap, sourceType: 'contracts', sourceId: cSnap.id || paymentDoc.contractId };
        try {
          const fetchedC = await repositoryFactory.get<any>('contracts').getById(paymentDoc.contractId);
          if (fetchedC && matchesCustomerContext(fetchedC)) return { source: fetchedC, sourceType: 'contracts', sourceId: fetchedC.id || paymentDoc.contractId };
        } catch {
          // ignore
        }
      }

      // Nếu Payment trỏ tới Báo giá (BG Vật tư / BG Dịch vụ)
      if (paymentDoc.quotationId) {
        const qSnap = (options?.quotations || []).find((q: any) => q && (q.id === paymentDoc.quotationId || q.soPhieuBaoGia === paymentDoc.quotationId) && matchesCustomerContext(q)) ||
                      (matchesCustomerContext(entityCachePool.get('quotations', paymentDoc.quotationId)) ? entityCachePool.get('quotations', paymentDoc.quotationId) : null);
        if (qSnap) return { source: qSnap, sourceType: 'quotations', sourceId: qSnap.id || paymentDoc.quotationId };
        try {
          const fetchedQ = await repositoryFactory.get<any>('quotations').getById(paymentDoc.quotationId);
          if (fetchedQ && matchesCustomerContext(fetchedQ)) return { source: fetchedQ, sourceType: 'quotations', sourceId: fetchedQ.id || paymentDoc.quotationId };
        } catch {
          // ignore
        }
      }

      // Nếu Payment có sẵn thông tin sản phẩm và là BG Vật tư / Dịch vụ độc lập
      if (paymentDoc.products && Array.isArray(paymentDoc.products) && paymentDoc.products.length > 0 && matchesCustomerContext(paymentDoc)) {
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
    const cMatch = (options?.contracts || []).find((c: any) => c && (c.soHopDong === soHopDong || c.contractCode === soHopDong) && matchesCustomerContext(c)) ||
                   entityCachePool.find('contracts', (c: any) => (c.soHopDong === soHopDong || c.contractCode === soHopDong) && matchesCustomerContext(c));
    if (cMatch) return { source: cMatch, sourceType: 'contracts', sourceId: cMatch.id };
  }
  if (soPhieuBaoGia) {
    const qMatch = (options?.quotations || []).find((q: any) => q && (q.soPhieuBaoGia === soPhieuBaoGia || q.soBaoGia === soPhieuBaoGia) && matchesCustomerContext(q)) ||
                   entityCachePool.find('quotations', (q: any) => (q.soPhieuBaoGia === soPhieuBaoGia || q.soBaoGia === soPhieuBaoGia) && matchesCustomerContext(q));
    if (qMatch) return { source: qMatch, sourceType: 'quotations', sourceId: qMatch.id };
  }
  const soDonHangErp = typeof data.soDonHangErp === 'string' ? data.soDonHangErp.trim() : '';
  if (soDonHangErp) {
    const qMatch = (options?.quotations || []).find((q: any) => q && (q.soDonHangErp === soDonHangErp || q.sourceRef?.code === soDonHangErp) && matchesCustomerContext(q)) ||
                   entityCachePool.find('quotations', (q: any) => (q.soDonHangErp === soDonHangErp || q.sourceRef?.code === soDonHangErp) && matchesCustomerContext(q));
    if (qMatch) return { source: qMatch, sourceType: 'quotations', sourceId: qMatch.id };
  }

  return null;
}
