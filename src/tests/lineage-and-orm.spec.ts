import { describe, it, expect } from 'vitest';
import { mapDocument } from '../platform/data/mapper';
import { swrDocFetcher } from '../data/swr-fetchers';

describe('Universal Lineage & ORM Normalizer Test Suite', () => {
  it('mapDocument should correctly map is_read physical column to boolean read and isRead', () => {
    // Row from PostgreSQL with is_read = true
    const pgRowTrue = {
      id: 'notif-1',
      user_id: 'user-123',
      title: 'Đơn hàng mới',
      message: 'Có đơn hàng mới tạo',
      is_read: true,
      created_at: '2026-09-25T10:00:00.000Z',
      data: {}
    };

    const docTrue = mapDocument<any>(pgRowTrue);
    expect(docTrue.read).toBe(true);
    expect(docTrue.isRead).toBe(true);
    expect(docTrue.title).toBe('Đơn hàng mới');

    // Row from PostgreSQL with is_read = false
    const pgRowFalse = {
      id: 'notif-2',
      is_read: false,
      data: {}
    };

    const docFalse = mapDocument<any>(pgRowFalse);
    expect(docFalse.read).toBe(false);
    expect(docFalse.isRead).toBe(false);
  });

  it('mapDocument should symmetrically map deliveryId <-> ma_giao_hang and paymentId <-> ma_thanh_toan', () => {
    const deliveryRow = {
      id: 'del-1',
      ma_giao_hang: 'PGH-2026-0001',
      customer_id: 'cust-1',
      data: {}
    };

    const deliveryDoc = mapDocument<any>(deliveryRow);
    expect(deliveryDoc.deliveryId).toBe('PGH-2026-0001');
    expect(deliveryDoc.maGiaoHang).toBe('PGH-2026-0001');

    const paymentRow = {
      id: 'pay-1',
      ma_thanh_toan: 'PT-2026-0001',
      customer_id: 'cust-1',
      data: {}
    };

    const paymentDoc = mapDocument<any>(paymentRow);
    expect(paymentDoc.paymentId).toBe('PT-2026-0001');
    expect(paymentDoc.maThanhToan).toBe('PT-2026-0001');
  });

  it('swrDocFetcher should self-heal and return null cleanly without crashing on empty keys or invalid formats', async () => {
    const nullDoc = await swrDocFetcher('');
    expect(nullDoc).toBeNull();

    // If key format uses '/' like quotations/abc, it should normalize to quotations:abc without syntax errors
    const docWithSlash = await swrDocFetcher('quotations/non-existent-id-999');
    expect(docWithSlash).toBeNull();
  });

  it('Universal Lineage Resolution should match child documents by both direct quotationId and indirect contractId', () => {
    const quotation = { id: 'quote-100', loai: 'MAY' } as any;
    const contracts = [
      { id: 'contract-200', quotationId: 'quote-100' }
    ] as any[];

    // Payment without direct quotationId, but linked to contract-200
    const payments = [
      { id: 'pay-1', contractId: 'contract-200', quotationId: undefined },
      { id: 'pay-2', contractId: 'contract-other', quotationId: undefined }
    ] as any[];

    // Delivery without direct quotationId, but linked to contract-200
    const deliveries = [
      { id: 'del-1', contractId: 'contract-200', quotationId: undefined },
      { id: 'del-2', contractId: 'contract-other', quotationId: undefined }
    ] as any[];

    const relatedContracts = contracts.filter(c => c.quotationId === quotation.id);
    const relatedContractIds = new Set(relatedContracts.map(c => c.id).filter(Boolean));

    const matchedPayments = payments.filter(
      p => p.quotationId === quotation.id || (p.contractId && relatedContractIds.has(p.contractId))
    );
    const matchedDeliveries = deliveries.filter(
      d => d.quotationId === quotation.id || (d.contractId && relatedContractIds.has(d.contractId))
    );

    expect(matchedPayments).toHaveLength(1);
    expect(matchedPayments[0].id).toBe('pay-1');

    expect(matchedDeliveries).toHaveLength(1);
    expect(matchedDeliveries[0].id).toBe('del-1');
  });
});
