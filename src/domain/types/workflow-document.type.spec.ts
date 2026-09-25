import { describe, it, expect } from 'vitest';
import { identifyDocument } from './workflow-document.type';

describe('Workflow Document Type Identifier', () => {
  it('correctly identifies Quotation based on soPhieuBaoGia', () => {
    const q = { id: 'q1', soPhieuBaoGia: 'BG-2026-001', customerId: 'c1', totalAmount: 1000000 };
    const identified = identifyDocument(q);
    expect(identified?.kind).toBe('quotation');
  });

  it('correctly identifies Contract based on soHopDong even when it has snapshot field loai', () => {
    const c = { id: 'c1', soHopDong: 'HD-2026-001', loai: 'BG Máy', quotationId: 'q1', customerId: 'c1' };
    const identified = identifyDocument(c);
    expect(identified?.kind).toBe('contract');
  });

  it('correctly identifies Payment based on paymentId even when it has soHopDong snapshot', () => {
    const p = { id: 'p1', paymentId: 'TT-001', soHopDong: 'HD-2026-001', loai: 'BG Máy', contractId: 'c1', customerId: 'c1' };
    const identified = identifyDocument(p);
    expect(identified?.kind).toBe('payment');
  });

  it('correctly identifies Delivery based on deliveryId even when it has paymentId snapshot', () => {
    const d = { id: 'd1', deliveryId: 'GH-001', paymentId: 'TT-001', soHopDong: 'HD-2026-001', contractId: 'c1', customerId: 'c1' };
    const identified = identifyDocument(d);
    expect(identified?.kind).toBe('delivery');
  });

  it('correctly identifies Customer when only customer fields are present', () => {
    const cust = { id: 'c1', maKh: 'KH001', tenKhachHang: 'Công ty ABC', sdt: '0901234567' };
    const identified = identifyDocument(cust);
    expect(identified?.kind).toBe('customer');
  });

  it('returns null for empty or invalid objects', () => {
    expect(identifyDocument(null)).toBeNull();
    expect(identifyDocument(undefined)).toBeNull();
    expect(identifyDocument({})).toBeNull();
  });
});
