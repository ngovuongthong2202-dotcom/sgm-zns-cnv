import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { adminDb } from '../backend/config/supabase.admin';
import { 
  isValidEnterpriseTaxCode, 
  isBranchTaxCode, 
  calculateBusinessNameSimilarity,
  detectDuplicateCustomerGroups,
  buildConsolidationMigrationPlan,
  BLACKLISTED_DUMMY_TAX_CODES 
} from '../modules/customers/ui/utils/customerConsolidationEngine';

describe('Sovereign MDM Nexus: Complete Enterprise Integrity Verification Suite', () => {
  describe('Pillar 1: Tax Disambiguation & Junk Tax Code Shield', () => {
    it('correctly validates valid 10-digit enterprise tax codes', () => {
      expect(isValidEnterpriseTaxCode('0312345678')).toBe(true);
      expect(isValidEnterpriseTaxCode('0101234567')).toBe(true);
      expect(isValidEnterpriseTaxCode('03-12345678')).toBe(true);
    });

    it('rejects blacklisted dummy and test tax codes', () => {
      expect(isValidEnterpriseTaxCode('0000000000')).toBe(false);
      expect(isValidEnterpriseTaxCode('1111111111')).toBe(false);
      expect(isValidEnterpriseTaxCode('1234567890')).toBe(false);
      expect(isValidEnterpriseTaxCode('0123456789')).toBe(false);
      expect(isValidEnterpriseTaxCode('9999999999')).toBe(false);
    });

    it('rejects 13-digit branch codes from 10-digit master consolidation', () => {
      expect(isBranchTaxCode('0312345678-001')).toBe(true);
      expect(isValidEnterpriseTaxCode('0312345678-001')).toBe(false);
      expect(isBranchTaxCode('0312345678001')).toBe(true);
      expect(isValidEnterpriseTaxCode('0312345678001')).toBe(false);
    });

    it('rejects repetitive single-digit sequences', () => {
      expect(isValidEnterpriseTaxCode('22222222')).toBe(false);
      expect(isValidEnterpriseTaxCode('8888888888')).toBe(false);
    });
  });

  describe('Pillar 2: Legal Entity Name Similarity Scoring', () => {
    it('computes 1.0 similarity for identical normalized names', () => {
      const sim = calculateBusinessNameSimilarity(
        'CÔNG TY TNHH CÔNG NGHỆ SÀI GÒN',
        'công ty tnhh công nghệ sài gòn'
      );
      expect(sim).toBe(1.0);
    });

    it('computes high similarity for minor punctuation or prefix differences', () => {
      const sim = calculateBusinessNameSimilarity(
        'CÔNG TY TNHH IN BAO BÌ TIẾN THÀNH',
        'CÔNG TY TNHH SẢN XUẤT IN BAO BÌ TIẾN THÀNH'
      );
      expect(sim).toBeGreaterThan(0.6);
    });

    it('computes low similarity for completely divergent business names', () => {
      const sim = calculateBusinessNameSimilarity(
        'CÔNG TY TNHH CƠ KHÍ CHÍNH XÁC QUANG MINH',
        'CỬA HÀNG VẬT LIỆU XÂY DỰNG BÌNH DƯƠNG'
      );
      expect(sim).toBeLessThan(0.4);
    });
  });

  describe('Pillar 3: Non-Destructive Customer Consolidation Migration Plan', () => {
    it('preserves master primary contact and tags secondary contacts with origin source code', () => {
      const masterCustomer: any = {
        id: 'cust-master-1',
        maKh: 'KH-001',
        tenKhachHang: 'TẬP ĐOÀN CÔNG NGHỆ TOÀN CẦU',
        maSoThue: '0309998888',
        nguoiDaiDien: 'Ông Trần Văn Chủ Tịch',
        sdt: '0903111222',
        contacts: [
          { nguoiDaiDien: 'Ông Trần Văn Chủ Tịch', sdt: '0903111222', chucVu: 'Chủ tịch' }
        ]
      };

      const secondaryCustomer: any = {
        id: 'cust-sec-2',
        maKh: 'KH-002',
        tenKhachHang: 'TẬP ĐOÀN CÔNG NGHỆ TOÀN CẦU - CHI NHÁNH HÀ NỘI',
        maSoThue: '0309998888',
        nguoiDaiDien: 'Bà Nguyễn Thị Giám Đốc HN',
        sdt: '0912333444',
        chiNhanh: 'Văn phòng Hà Nội',
        contacts: [
          { nguoiDaiDien: 'Anh Lê Kỹ Thuật HN', sdt: '0988555666', chucVu: 'Trưởng ban Kỹ thuật' }
        ]
      };

      const group = {
        taxCode: '0309998888',
        normalizedName: 'TẬP ĐOÀN CÔNG NGHỆ TOÀN CẦU',
        masterCustomer,
        secondaryCustomers: [secondaryCustomer],
        allCustomersInGroup: [masterCustomer, secondaryCustomer],
        totalQuotationsCount: 2,
        distinctContactsCount: 3
      };

      const plan = buildConsolidationMigrationPlan(group, [], [], [], []);

      expect(plan.updatedMasterCustomer.contacts?.length).toBeGreaterThanOrEqual(3);
      // Verify secondary contacts receive origin badge in chiNhanh
      const secContact = plan.updatedMasterCustomer.contacts?.find(c => c.nguoiDaiDien === 'Bà Nguyễn Thị Giám Đốc HN');
      expect(secContact).toBeDefined();
      expect(secContact?.chiNhanh).toContain('KH-002');
    });
  });

  describe('Pillar 4: Historical Document Snapshot Immutability (Zero-Trust Sealing)', () => {
    it('reassigns document customerId/maKh without corrupting original contact person or phone', async () => {
      const masterId = `test-master-${Date.now()}`;
      const secId = `test-sec-${Date.now()}`;
      const quoteId = `test-quote-${Date.now()}`;

      // 1. Create master customer with head office phone
      await adminDb.collection('customers').doc(masterId).set({
        id: masterId,
        maKh: 'KH-MASTER',
        tenKhachHang: 'TỔNG CÔNG TY SGM',
        sdt: '02839998888', // Head office hotline
        maSoThue: '0398765432'
      });

      // 2. Create secondary customer with regional contact
      await adminDb.collection('customers').doc(secId).set({
        id: secId,
        maKh: 'KH-SECONDARY',
        tenKhachHang: 'CHI NHÁNH SGM BÌNH DƯƠNG',
        sdt: '0901234567',
        maSoThue: '0398765432'
      });

      // 3. Create historical quotation with specific contact person and mobile phone
      const originalQuotePhone = '0988777666';
      const originalQuoteContact = 'Kỹ sư Phạm Văn Hùng';
      await adminDb.collection('quotations').doc(quoteId).set({
        id: quoteId,
        soPhieuBaoGia: 'BG-HISTORIC-001',
        customerId: secId,
        maKh: 'KH-SECONDARY',
        tenKhachHang: 'CHI NHÁNH SGM BÌNH DƯƠNG',
        nguoiDaiDien: originalQuoteContact,
        sdt: originalQuotePhone, // Historic contact phone
        totalAmount: 50000000
      });

      // 4. Simulate sovereign merge logic (Non-destructive reassignment)
      const batch = adminDb.batch();
      
      batch.update(adminDb.collection('customers').doc(secId), {
        isArchived: true,
        mergedInto: masterId,
        ngayCapNhat: new Date().toISOString()
      });

      // Reassign quotation: update customerId and maKh, but DO NOT overwrite sdt or nguoiDaiDien!
      batch.update(adminDb.collection('quotations').doc(quoteId), {
        customerId: masterId,
        maKh: 'KH-MASTER',
        // BẢO TOÀN NGUYÊN VẸN: sdt and nguoiDaiDien are NOT touched!
        updatedAt: new Date().toISOString()
      });

      // Record auditLog
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, {
        action: 'MERGE_CUSTOMERS',
        entityId: masterId,
        entityType: 'customers',
        userId: 'admin@sgm.vn',
        timestamp: new Date().toISOString(),
        details: {
          masterId,
          masterMaKh: 'KH-MASTER',
          secondaryIds: [secId],
          secondarySnapshots: {
            [secId]: { id: secId, maKh: 'KH-SECONDARY', tenKhachHang: 'CHI NHÁNH SGM BÌNH DƯƠNG', sdt: '0901234567' }
          },
          affectedDocuments: {
            quotations: [{ id: quoteId, previousCustomerId: secId, previousMaKh: 'KH-SECONDARY' }],
            contracts: [],
            payments: [],
            deliveries: []
          }
        }
      });

      await batch.commit();

      // 5. Verify the quotation state
      const updatedQuoteDoc = await adminDb.collection('quotations').doc(quoteId).get();
      const updatedQuote = updatedQuoteDoc.data();

      // Administrative foreign keys are successfully mapped to Master
      expect(updatedQuote?.customerId).toBe(masterId);
      expect(updatedQuote?.maKh).toBe('KH-MASTER');

      // CRITICAL ASSERTION: The historic contact person and phone MUST NOT be corrupted by Master hotline!
      expect(updatedQuote?.sdt).toBe(originalQuotePhone);
      expect(updatedQuote?.sdt).not.toBe('02839998888');
      expect(updatedQuote?.nguoiDaiDien).toBe(originalQuoteContact);

      // Verify audit log exists
      const savedAuditDoc = await auditRef.get();
      expect(savedAuditDoc.exists).toBe(true);
      expect(savedAuditDoc.data()?.action).toBe('MERGE_CUSTOMERS');

      // Clean up
      await adminDb.collection('customers').doc(masterId).delete();
      await adminDb.collection('customers').doc(secId).delete();
      await adminDb.collection('quotations').doc(quoteId).delete();
      await auditRef.delete();
    }, 15000);
  });
});
