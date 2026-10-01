import { describe, it, expect } from 'vitest';
import { 
  adaptSalesOrderToQuotation, 
  resolveCustomerFromErp, 
  ErpSalesOrderData 
} from '../modules/sales/ui/utils/salesOrderAdapter';
import { Customer } from '../domain/schema/customer.schema';
import { 
  normalizeTaxCode, 
  isValidEnterpriseTaxCode, 
  calculateBusinessNameSimilarity 
} from '../modules/customers/ui/utils/customerConsolidationEngine';
import { extractVietnamesePhones } from '../modules/customers/ui/utils/vietnameseTelecomExtractor';
import { detectProvinceFromAddress } from '../shared/services/vietnamAddressParser';

describe('SGM Omni-Nexus v23: Controlled ERP Customer Ingestion Gate', () => {
  const mockCrmCustomers = [
    {
      id: 'cust-001',
      maKh: 'KH-001',
      tenKhachHang: 'Công Ty TNHH Sắt Thép Gia Bách Hiệu',
      loaiHinhDoanhNghiep: 'TNHH',
      maSoThue: '3400861168',
      sdt: '0903123456',
      diaChi: 'Hàm Thuận Nam, Bình Thuận',
      tinhThanh: 'Bình Thuận',
      contacts: [],
      tags: []
    }
  ] as unknown as Customer[];

  describe('Pillar 1: ERP Tax Code Sanitization & Validation', () => {
    it('normalizes ERP tax code containing spaced digits (e.g. 3 4 0 0 8 6 1 1 6 8)', () => {
      const spacedTax = '3 4 0 0 8 6 1 1 6 8';
      const normalized = normalizeTaxCode(spacedTax);
      expect(normalized).toBe('3400861168');
      expect(isValidEnterpriseTaxCode(normalized)).toBe(true);
    });

    it('normalizes ERP tax code containing hyphens or underscores', () => {
      const hyphenTax = '34-00861168';
      const normalized = normalizeTaxCode(hyphenTax);
      expect(normalized).toBe('3400861168');
    });

    it('rejects dummy or blacklisted test tax codes from ERP ingestion', () => {
      expect(isValidEnterpriseTaxCode('0000000000')).toBe(false);
      expect(isValidEnterpriseTaxCode('1234567890')).toBe(false);
      expect(isValidEnterpriseTaxCode('9999999999')).toBe(false);
    });
  });

  describe('Pillar 2: ERP Telecom & Address Intelligence Parsing', () => {
    it('extracts primary Zalo-eligible mobile phone and landline contact from ERP text', () => {
      const rawContact = 'Anh Hùng 0903.123.456 / 0283.888.9999';
      const telecom = extractVietnamesePhones(rawContact);
      expect(telecom.primaryPhone).toBe('0903123456');
      expect(telecom.isZaloEligible).toBe(true);
      expect(telecom.landlinePhones.length).toBeGreaterThan(0);
      expect(telecom.landlinePhones[0].cleaned).toBe('02838889999');
    });

    it('detects administrative province accurately from ERP full address', () => {
      const erpAddress = 'Lô 5, KCN Hòa Phú, Xã Hòa Phú, Huyện Long Hồ, Tỉnh Vĩnh Long';
      const province = detectProvinceFromAddress(erpAddress);
      expect(province).toBe('Vĩnh Long');
    });
  });

  describe('Pillar 3: Fuzzy Duplicate Diagnostics Before Customer Creation', () => {
    it('identifies potential duplicate if ERP name is near-identical to an existing customer', () => {
      const erpCustomerName = 'CÔNG TY TNHH SẮT THÉP GIA BÁCH HIỆU';
      const existingName = mockCrmCustomers[0].tenKhachHang;

      const similarity = calculateBusinessNameSimilarity(erpCustomerName, existingName);
      expect(similarity).toBeGreaterThan(0.8);
    });

    it('prevents accidental duplicate creation when tax code strictly matches CRM customer', () => {
      const erpOrder: ErpSalesOrderData = {
        _id: 'erp-ord-01',
        code: '11-PXBHDH2604-031',
        customer_snapshot: {
          customer_name: 'CÔNG TY TNHH SẮT THÉP GIA BÁCH HIỆU',
          tax_code: '3 4 0 0 8 6 1 1 6 8',
          phone: '0903123456'
        },
        lines: []
      };

      const { matchedCustomer, matchType } = resolveCustomerFromErp(erpOrder, mockCrmCustomers);
      expect(matchType).toBe('TAX_CODE');
      expect(matchedCustomer).not.toBeNull();
      expect(matchedCustomer?.id).toBe('cust-001');

      const adapted = adaptSalesOrderToQuotation(erpOrder, matchedCustomer, 'BG-2026-0001');
      expect(adapted.customerId).toBe('cust-001');
      expect(adapted.maKh).toBe('KH-001');
    });

    it('leaves customerId empty when customer is brand new, triggering the Ingestion Gate', () => {
      const brandNewErpOrder: ErpSalesOrderData = {
        _id: 'erp-ord-02',
        code: '11-PXBHDH2604-099',
        customer_snapshot: {
          customer_name: 'CÔNG TY TNHH CÔNG NGHỆ MỚI TOÀN CẦU',
          tax_code: '0318999888',
          phone: '0912345678',
          address: '123 Đường 3/2, Quận 10, TP. Hồ Chí Minh'
        },
        lines: []
      };

      const { matchedCustomer, matchType } = resolveCustomerFromErp(brandNewErpOrder, mockCrmCustomers);
      expect(matchedCustomer).toBeNull();
      expect(matchType).toBeNull();

      const adapted = adaptSalesOrderToQuotation(brandNewErpOrder, null, 'BG-2026-0002');
      expect(adapted.customerId).toBe('');
      expect(adapted.tenKhachHang).toBe('CÔNG TY TNHH CÔNG NGHỆ MỚI TOÀN CẦU');
      expect(adapted.maKh).toBe('0318999888');
    });
  });
});
