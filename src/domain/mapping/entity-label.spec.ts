import { describe, it, expect } from 'vitest';
import { getEntityDisplayLabel, LABEL_FALLBACK } from './entity-label';

describe('entity-label reference resolver', () => {
  it('should return fallback for nullish inputs', () => {
    expect(getEntityDisplayLabel('customer', null)).toBe(LABEL_FALLBACK);
    expect(getEntityDisplayLabel('quotation', undefined)).toBe(LABEL_FALLBACK);
    expect(getEntityDisplayLabel('delivery', null)).toBe(LABEL_FALLBACK);
    expect(getEntityDisplayLabel('unknown', { id: '123' })).toBe(LABEL_FALLBACK);
  });

  it('should resolve customer display label correctly', () => {
    expect(getEntityDisplayLabel('customer', { maKh: 'KH001', tenKhachHang: 'Công ty TNHH A' })).toBe('KH001');
    expect(getEntityDisplayLabel('customer', { tenKhachHang: 'Công ty TNHH A' })).toBe('Công ty TNHH A');
    expect(getEntityDisplayLabel('customer', { sdt: '0987654321' })).toBe('0987654321');
    expect(getEntityDisplayLabel('customer', { id: 'unknown-id' })).toBe('Không tìm thấy khách hàng');
  });

  it('should resolve quotation display label correctly', () => {
    expect(getEntityDisplayLabel('quotation', { soPhieuBaoGia: 'BG-001' })).toBe('BG-001');
    expect(getEntityDisplayLabel('quotation', { id: 'unknown-id' })).toBe('Chưa có số phiếu');
  });

  it('should resolve contract display label correctly', () => {
    expect(getEntityDisplayLabel('contract', { soHopDong: 'HD-001' })).toBe('HD-001');
    expect(getEntityDisplayLabel('contract', { soDonHang: 'DH-001' })).toBe('DH-001');
    expect(getEntityDisplayLabel('contract', { id: 'unknown-id' })).toBe('Chưa có số hợp đồng');
  });

  it('should resolve payment display label correctly', () => {
    expect(getEntityDisplayLabel('payment', { soChungTu: 'CT-001' })).toBe('CT-001');
    expect(getEntityDisplayLabel('payment', { paymentId: 'PAY-002' })).toBe('PAY-002');
    expect(getEntityDisplayLabel('payment', { maPhieuTH: 'TH-003' })).toBe('TH-003');
    expect(getEntityDisplayLabel('payment', { code: 'CODE-004' })).toBe('CODE-004');
    expect(getEntityDisplayLabel('payment', { id: 'unknown-id' })).toBe('Chưa có số chứng từ');
  });

  it('should resolve delivery display label correctly', () => {
    expect(getEntityDisplayLabel('delivery', { deliveryId: 'DEL-001' })).toBe('DEL-001');
    expect(getEntityDisplayLabel('delivery', { soPhieuXuat: 'PX-002' })).toBe('PX-002');
    expect(getEntityDisplayLabel('delivery', { maPhieu: 'MP-003' })).toBe('MP-003');
    expect(getEntityDisplayLabel('delivery', { id: 'unknown-id' })).toBe('Chưa có số phiếu xuất');
  });

  it('should resolve product display label correctly', () => {
    expect(getEntityDisplayLabel('product', { productName: 'Product A' })).toBe('Product A');
    expect(getEntityDisplayLabel('product', { tenMay: 'May A' })).toBe('May A');
    expect(getEntityDisplayLabel('product', { productCode: 'PC-001' })).toBe('PC-001');
    expect(getEntityDisplayLabel('product', { id: 'unknown-id' })).toBe('Chưa có tên máy');
  });
});
