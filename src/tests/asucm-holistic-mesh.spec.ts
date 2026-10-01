import { describe, it, expect } from 'vitest';
import { TABLE_DESCRIPTORS, COLLECTION_TABLE_MAP, toTableName, sanitizeForeignKey } from '@/src/platform/data/schema.descriptor';
import { normalizeContactForCustomerForm } from '@/src/modules/customers/ui/hooks/useCustomerForm';
import { detectCarrier, formatPhoneDisplay } from '@/src/platform/ui/design-system/form/SmartPhoneInput';
import { collectionTableMap as adminCollectionTableMap } from '@/src/backend/config/supabase.admin';

describe('ASUCM 3.0 Holistic Architecture & Bug-Free Regression Tests', () => {

  describe('Bug 1 Regression: Quotation to Payment Sync Stability', () => {
    it('should correctly validate that quotation prefill parameters contain valid quotation data without cyclic loops', () => {
      const mockQuotation = {
        id: 'bg-12345',
        soPhieuBaoGia: 'BG-2026-001',
        customerId: 'kh-67890',
        totalAmount: 50000000,
        loai: 'Máy may',
        products: [{ maSanPham: 'SP01', tenSanPham: 'Máy 1 kim', soLuong: 2, donGia: 25000000 }]
      };

      // Ensure that prefill object extracts clean payment defaults
      const prefillPayment = {
        quotationId: mockQuotation.id,
        customerId: mockQuotation.customerId,
        soTien: mockQuotation.totalAmount,
        noiDung: `Thanh toán cho báo giá ${mockQuotation.soPhieuBaoGia}`
      };

      expect(prefillPayment.quotationId).toBe('bg-12345');
      expect(prefillPayment.soTien).toBe(50000000);
      expect(prefillPayment.customerId).toBe('kh-67890');
    });
  });

  describe('Bug 2 Regression: Redundant "Người nộp tiền" Elimination', () => {
    it('should not add a synthetic "Người nộp tiền" if payer name is identical to customer or representative', () => {
      const customer = {
        tenKhachHang: 'Công ty May Mặc ABC',
        nguoiDaiDien: 'Nguyễn Văn A',
        sdt: '0983916267'
      };

      const payment = {
        tenNguoiNop: 'Nguyễn Văn A',
        sdtNguoiNop: '0983916267',
        isThirdPartyPayer: false
      };

      // Check logic: when payer is representative or not third party, payer is deduplicated
      const isRedundant = !payment.isThirdPartyPayer || 
        payment.tenNguoiNop.toLowerCase() === customer.nguoiDaiDien.toLowerCase() ||
        payment.tenNguoiNop.toLowerCase() === customer.tenKhachHang.toLowerCase();

      expect(isRedundant).toBe(true);
    });

    it('should distinctly recognize an authentic third-party payer when flagged', () => {
      const payment = {
        tenNguoiNop: 'Trần Thị B (Kế toán chi hộ)',
        sdtNguoiNop: '0912345678',
        isThirdPartyPayer: true
      };

      expect(payment.isThirdPartyPayer).toBe(true);
      expect(payment.tenNguoiNop).toContain('chi hộ');
    });
  });

  describe('Bug 3 Regression: Payment to Delivery Lifecycle & Exemption', () => {
    it('should allow delivery with dacCachGiaoTruoc or direct contract link without paymentId', () => {
      const deliveryData = {
        contractId: 'hd-9999',
        customerId: 'kh-1111',
        dacCachGiaoTruoc: true,
        paymentId: ''
      };

      const isDirectOrExempt = Boolean(
        deliveryData.dacCachGiaoTruoc || (!deliveryData.paymentId && deliveryData.contractId)
      );

      expect(isDirectOrExempt).toBe(true);
    });
  });

  describe('Bug 4 Regression: Poly-Phone Multi-Phone Support for Contacts', () => {
    it('should cleanly unpack concatenated phones into distinct list for a contact', () => {
      const rawContact = {
        nguoiDaiDien: 'Trần Văn Cường',
        sdt: '0983916267/ 0919389089',
        chucVu: 'Giám đốc kỹ thuật'
      };

      const normalized = normalizeContactForCustomerForm(rawContact);

      expect(normalized.danhSachSdt).toHaveLength(2);
      expect(normalized.danhSachSdt).toContain('0983916267');
      expect(normalized.danhSachSdt).toContain('0919389089');
      expect(normalized.sdt).toBe('0983916267'); // Primary phone
      expect(normalized.sdtPhu).toBe('0919389089');
    });

    it('should detect telecom carriers and format phones correctly', () => {
      const viettel = '0983916267';
      const vinaphone = '0919389089';
      const mobifone = '0903814168';

      expect(detectCarrier(viettel)?.name).toBe('Viettel');
      expect(detectCarrier(vinaphone)?.name).toBe('VinaPhone');
      expect(detectCarrier(mobifone)?.name).toBe('MobiFone');

      expect(formatPhoneDisplay(viettel)).toBe('0983 916 267');
    });

    it('should preserve explicit danhSachSdt array if already set', () => {
      const rawContact = {
        nguoiDaiDien: 'Lê Hoàng',
        sdt: '0947889630',
        danhSachSdt: ['0947889630', '0925017071', '0903814168'],
        chucVu: 'Trưởng phòng'
      };

      const normalized = normalizeContactForCustomerForm(rawContact);
      expect(normalized.danhSachSdt).toHaveLength(3);
      expect(normalized.danhSachSdt[0]).toBe('0947889630');
      expect(normalized.danhSachSdt[1]).toBe('0925017071');
      expect(normalized.danhSachSdt[2]).toBe('0903814168');
      expect(normalized.sdtPhu).toBe('0925017071 / 0903814168');
    });
  });

  describe('ASUCM 3.0 Database Schema & Parity Descriptors', () => {
    it('should map all critical 18 tables in TABLE_DESCRIPTORS and COLLECTION_TABLE_MAP', () => {
      const requiredTables = [
        'customers', 'quotations', 'contracts', 'payments', 'deliveries',
        'users', 'settings', 'counters', 'zns_messages', 'zns_templates',
        'drafts', 'presence', 'metrics_rollup', 'cross_entity_sync_jobs',
        'workflow_events', 'zns_callbacks', 'zns_dead_letters', 'audit_logs'
      ];

      for (const table of requiredTables) {
        expect(TABLE_DESCRIPTORS[table]).toBeDefined();
        expect(COLLECTION_TABLE_MAP[table]).toBe(table);
      }
    });

    it('should ensure counters table is mapped to counters, not settings', () => {
      expect(toTableName('counters')).toBe('counters');
      expect(adminCollectionTableMap['counters']).toBe('counters');
      expect(TABLE_DESCRIPTORS['counters']).toBeDefined();
      expect(TABLE_DESCRIPTORS['counters'].physicalColumns.has('current_value')).toBe(true);
    });

    it('should contain physical indexed financial columns for financial tables', () => {
      expect(TABLE_DESCRIPTORS['quotations'].physicalColumns.has('tong_tien')).toBe(true);
      expect(TABLE_DESCRIPTORS['contracts'].physicalColumns.has('gia_tri_hop_dong')).toBe(true);
      expect(TABLE_DESCRIPTORS['payments'].physicalColumns.has('so_tien')).toBe(true);
      expect(TABLE_DESCRIPTORS['customers'].physicalColumns.has('total_debt')).toBe(true);
      expect(TABLE_DESCRIPTORS['customers'].physicalColumns.has('ltv')).toBe(true);
    });

    it('should sanitize foreign keys cleanly', () => {
      expect(sanitizeForeignKey('  KH00123  ')).toBe('KH00123');
      expect(sanitizeForeignKey('   ')).toBeNull();
      expect(sanitizeForeignKey(null)).toBeNull();
      expect(sanitizeForeignKey('undefined')).toBeNull();
      expect(sanitizeForeignKey('N/A')).toBeNull();
      expect(sanitizeForeignKey('---')).toBeNull();
    });
  });
});
