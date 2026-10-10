import { describe, it, expect } from 'vitest';
import { 
  isSameCustomer, 
  normalizeCoreBusinessName, 
  filterBySameCustomer,
  sanitizeDeliveryCustomerBoundary 
} from './customerIdentityResolver';

describe('customerIdentityResolver (Zero-Contamination Boundary)', () => {
  it('correctly matches when customerId is identical', () => {
    const docA = { customerId: 'CUST-001', tenKhachHang: 'Công Ty Long Hưng' };
    const docB = { customerId: 'CUST-001', soHopDong: '11-BHDH2603-026' };
    expect(isSameCustomer(docA, docB)).toBe(true);
  });

  it('correctly matches when one document is the customer object itself', () => {
    const customer = { id: 'CUST-001', loaiKh: 'DOANH_NGHIEP', tenKhachHang: 'Công Ty Long Hưng' };
    const delivery = { customerId: 'CUST-001', deliveryId: 'PGH-2026-0084' };
    expect(isSameCustomer(customer, delivery)).toBe(true);
  });

  it('correctly matches when maKh is identical regardless of case/spaces', () => {
    const docA = { maKh: 'KH0598 ', tenKhachHang: 'Lê Ngân Hà' };
    const docB = { maKh: ' kh0598', soPhieuBaoGia: '11-BG2609-001' };
    expect(isSameCustomer(docA, docB)).toBe(true);
  });

  it('STRICTLY REJECTS cross-customer linking when customer IDs differ even if ERP codes match (Long Hưng vs Hợi Thủy)', () => {
    // Exact bug scenario reported by user:
    const deliveryLongHung = {
      customerId: 'CUST-LONG-HUNG',
      maKh: 'KH0100',
      tenKhachHang: 'Công Ty TNHH Sản Xuất Thương Mại Và Xây Dựng Long Hưng',
      soHopDong: '11-BHDH2603-026', // Shared ERP order code
      deliveryId: 'PGH-2026-0084'
    };

    const paymentHoiThuy = {
      customerId: 'CUST-HOI-THUY',
      maKh: 'KH0200',
      tenKhachHang: 'Cửa Hàng Vật Liệu Xây Dựng Hợi Thủy',
      soHopDong: '11-BHDH2603-026', // Shared ERP order code
      paymentId: 'PT-2026-9256'
    };

    const contractHoiThuy = {
      customerId: 'CUST-HOI-THUY',
      maKh: 'KH0200',
      tenKhachHang: 'Cửa Hàng Vật Liệu Xây Dựng Hợi Thủy',
      soHopDong: '017/KD1-SGM/TN-CT/26',
      id: 'CTR-HOI-THUY'
    };

    expect(isSameCustomer(deliveryLongHung, paymentHoiThuy)).toBe(false);
    expect(isSameCustomer(deliveryLongHung, contractHoiThuy)).toBe(false);
  });

  it('correctly normalizes Vietnamese core business names and strips legal prefixes', () => {
    expect(normalizeCoreBusinessName('Công Ty TNHH Long Hưng')).toBe('long hưng');
    expect(normalizeCoreBusinessName('Cửa Hàng Vật Liệu Xây Dựng Hợi Thủy')).toBe('hợi thủy');
    expect(normalizeCoreBusinessName('Doanh Nghiệp Tư Nhân Cơ Khí Đại Nghĩa')).toBe('cơ khí đại nghĩa');
  });

  it('matches by normalized core business name when IDs are omitted', () => {
    const docA = { tenKhachHang: 'Công Ty TNHH Lê Ngân Hà' };
    const docB = { tenKhachHang: 'Cty TNHH Lê Ngân Hà' };
    expect(isSameCustomer(docA, docB)).toBe(true);
  });

  it('matches by normalized Vietnamese phone numbers', () => {
    const docA = { sdt: '0982 023 456' };
    const docB = { sdtLienHe: '+84982023456' };
    expect(isSameCustomer(docA, docB)).toBe(true);
  });

  it('filterBySameCustomer only keeps documents belonging to the anchor customer', () => {
    const anchor = { customerId: 'C_LH', tenKhachHang: 'Long Hưng' };
    const candidates = [
      { id: '1', customerId: 'C_LH', note: 'LH Payment 1' },
      { id: '2', customerId: 'C_HT', note: 'HT Payment 2' },
      { id: '3', customerId: 'C_LH', note: 'LH Delivery 3' },
    ];

    const filtered = filterBySameCustomer(anchor, candidates);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(x => x.id)).toEqual(['1', '3']);
  });

  it('sanitizeDeliveryCustomerBoundary detects safe vs unsafe cross-links', () => {
    const deliveryLH = { customerId: 'C_LH', tenKhachHang: 'Long Hưng' };
    const contractSafe = { customerId: 'C_LH', soHopDong: 'HD-LH' };
    const contractUnsafe = { customerId: 'C_HT', soHopDong: 'HD-HT' };

    expect(sanitizeDeliveryCustomerBoundary(deliveryLH, contractSafe).isSafeContract).toBe(true);
    expect(sanitizeDeliveryCustomerBoundary(deliveryLH, contractUnsafe).isSafeContract).toBe(false);
  });

  it('nhận diện chuẩn xác khi có mergedCustomerCodes hoặc mergedInto (chuyển từ customer-consolidation-modal.spec.tsx)', () => {
    const masterDoc = { id: 'cust-216', maKh: 'KH0216', mergedCustomerCodes: ['KH0213', 'KH0200'] };
    const legacyDeliveryDoc = { id: 'del-1', maKh: 'KH0213', customerId: 'cust-213' };
    expect(isSameCustomer(masterDoc, legacyDeliveryDoc)).toBe(true);

    const secondaryWithMergedInto = { id: 'cust-213', maKh: 'KH0213', mergedInto: 'cust-216' };
    expect(isSameCustomer(secondaryWithMergedInto, masterDoc)).toBe(true);
  });
});
