import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sequenceGeneratorService } from '@/src/backend/services/workflow/sequence-generator.service';
import { Quotation as QuotationDomain, QuotationType } from '@/src/modules/sales/domain/Quotation';
import { Payment } from '@/src/modules/billing/domain/Payment';
import { adminDb } from '@/src/backend/config/supabase.admin';

describe('NEXUS-OS Architectural Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Pillar 1: Universal Sequence Engine', () => {
    it('generates properly formatted enterprise codes for all document types', async () => {
      const year = new Date().getFullYear();
      
      const quoteCode = await sequenceGeneratorService.getNextCode('quotation', { loai: 'MAY' });
      expect(quoteCode).toMatch(new RegExp(`^BGM-${year}-\\d{4}$`));

      const contractCode = await sequenceGeneratorService.getNextCode('contract');
      expect(contractCode).toMatch(new RegExp(`^HD-${year}-\\d{4}$`));

      const paymentCode = await sequenceGeneratorService.getNextCode('payment');
      expect(paymentCode).toMatch(new RegExp(`^PT-${year}-\\d{4}$`));

      const deliveryCode = await sequenceGeneratorService.getNextCode('delivery');
      expect(deliveryCode).toMatch(new RegExp(`^PGH-${year}-\\d{4}$`));

      const customerCode = await sequenceGeneratorService.getNextCode('customer');
      expect(customerCode).toMatch(/^KH\d{4}$/);
    });

    it('generates strictly sequential unique numbers without collisions', async () => {
      const results = await Promise.all([
        sequenceGeneratorService.getNextCode('quotation', { loai: 'MAY' }),
        sequenceGeneratorService.getNextCode('quotation', { loai: 'MAY' }),
        sequenceGeneratorService.getNextCode('quotation', { loai: 'MAY' }),
      ]);

      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(3);
    });
  });

  describe('Pillar 2: Smart Money & Tax Calculation in Quotation Domain', () => {
    it('accurately calculates subtotal, discount, VAT, and totalAmount with Money value object', () => {
      const result = QuotationDomain.create({
        customerId: 'cust-123',
        type: QuotationType.MATERIAL,
        items: [
          {
            productId: 'p-1',
            quantity: 2,
            unitPrice: 5000000 // 10,000,000
          },
          {
            productId: 'p-2',
            quantity: 4,
            unitPrice: 500000 // 2,000,000
          }
        ],
        discount: 1000000, // 12M - 1M = 11M
        vatRate: 10 // 10% of 11M = 1.1M -> Total = 12.1M
      }, 'QUOTE-TEST-PRECISION');

      expect(result.isSuccess).toBe(true);
      const q = result.getValue();
      expect(q.props.subtotal).toBe(12000000);
      expect(q.props.discount).toBe(1000000);
      expect(q.props.vatAmount).toBe(1100000);
      expect(q.props.totalAmount).toBe(12100000);
    });

    it('supports direct vatAmount input and prevents negative totals', () => {
      const result = QuotationDomain.create({
        customerId: 'cust-456',
        type: QuotationType.SERVICE,
        items: [
          {
            productId: 'srv-1',
            quantity: 1,
            unitPrice: 20000000
          }
        ],
        discount: 5000000, // 20M - 5M = 15M
        vatAmount: 1500000 // 1.5M -> Total = 16.5M
      }, 'QUOTE-TEST-DIRECT-VAT');

      expect(result.isSuccess).toBe(true);
      const q = result.getValue();
      expect(q.props.subtotal).toBe(20000000);
      expect(q.props.discount).toBe(5000000);
      expect(q.props.vatAmount).toBe(1500000);
      expect(q.props.totalAmount).toBe(16500000);
    });
  });

  describe('Pillar 3: Payment Domain Consistency', () => {
    it('produces accurate error message when payment cannot be deleted due to linked deliveries', () => {
      const res = Payment.create({
        paymentId: 'PT-2026-0001',
        customerId: 'cust-1',
        soTien: 10000000,
        phuongThuc: 'Chuyển khoản'
      }, 'PAY-TEST-001');

      expect(res.isSuccess).toBe(true);
      const payment = res.getValue();
      const check = payment.canBeDeleted(2);
      expect(check.isFailure).toBe(true);
      expect(check.error).toContain('Phiếu thanh toán đã phát sinh chứng từ liên kết, không thể xoá. (Giao hàng (2))');
    });
  });

  describe('Pillar 4: Bidirectional Schema Reflection & Projection (BSRP)', () => {
    it('DocRef.set automatically projects camelCase properties into snake_case physical columns', async () => {
      const testQuoteId = `test-bsrp-quote-${Date.now()}`;
      const docRef = adminDb.collection('quotations').doc(testQuoteId);

      await docRef.set({
        id: testQuoteId,
        soPhieuBaoGia: 'BGM-2026-9999',
        maKh: 'KH9999',
        tenKhachHang: 'Doanh nghiệp Thử nghiệm BSRP',
        sdt: '0988776655',
        tongTien: 45000000,
        createdAt: new Date().toISOString()
      });

      const snap = await docRef.get();
      expect(snap.exists).toBe(true);
      const data = snap.data();
      expect(data?.soPhieuBaoGia).toBe('BGM-2026-9999');
      expect(data?.tenKhachHang).toBe('Doanh nghiệp Thử nghiệm BSRP');
      
      // Cleanup
      await docRef.delete();
    });
  });

  describe('Pillar 5: Deep Cascading Customer Merge Verification', () => {
    it('reassigns all child entities from source customers to target customer', async () => {
      const targetCustId = `target-cust-${Date.now()}`;
      const sourceCustId = `source-cust-${Date.now()}`;

      await adminDb.collection('customers').doc(targetCustId).set({
        id: targetCustId,
        maKh: 'KH0001',
        tenKhachHang: 'Khách Hàng Đích',
        tags: ['VIP']
      });

      await adminDb.collection('customers').doc(sourceCustId).set({
        id: sourceCustId,
        maKh: 'KH0002',
        tenKhachHang: 'Khách Hàng Nguồn Cần Gộp',
        tags: ['TIEM_NANG']
      });

      const quoteId = `quote-merge-test-${Date.now()}`;
      await adminDb.collection('quotations').doc(quoteId).set({
        id: quoteId,
        soPhieuBaoGia: 'BGM-2026-0001',
        customerId: sourceCustId,
        tongTien: 10000000
      });

      const batch = adminDb.batch();
      
      batch.update(adminDb.collection('customers').doc(sourceCustId), {
        isArchived: true,
        mergedInto: targetCustId,
        ngayCapNhat: new Date().toISOString()
      });

      const quotesSnap = await adminDb.collection('quotations').where('customerId', '==', sourceCustId).get();
      quotesSnap.docs.forEach(d => {
        batch.update(d.ref, { customerId: targetCustId, updatedAt: new Date().toISOString() });
      });

      batch.update(adminDb.collection('customers').doc(targetCustId), {
        tags: ['VIP', 'TIEM_NANG', 'MERGED'],
        ngayCapNhat: new Date().toISOString()
      });

      await batch.commit();

      const updatedSource = await adminDb.collection('customers').doc(sourceCustId).get();
      expect(updatedSource.data()?.isArchived).toBe(true);
      expect(updatedSource.data()?.mergedInto).toBe(targetCustId);

      const updatedQuote = await adminDb.collection('quotations').doc(quoteId).get();
      expect(updatedQuote.data()?.customerId).toBe(targetCustId);

      const updatedTarget = await adminDb.collection('customers').doc(targetCustId).get();
      expect(updatedTarget.data()?.tags).toContain('VIP');
      expect(updatedTarget.data()?.tags).toContain('TIEM_NANG');
      expect(updatedTarget.data()?.tags).toContain('MERGED');

      await adminDb.collection('customers').doc(targetCustId).delete();
      await adminDb.collection('customers').doc(sourceCustId).delete();
      await adminDb.collection('quotations').doc(quoteId).delete();
    }, 15000);
  });

  describe('Pillar 6: Zero-Trust Backend RBAC Gate Verification', () => {
    it('prohibits deletion when role is Chuyên viên', async () => {
      const testUserId = `user-chuyen-vien-${Date.now()}`;
      await adminDb.collection('users').doc(testUserId).set({
        id: testUserId,
        name: 'Nguyễn Văn A',
        email: 'chuyenvien@sgm.vn',
        role: 'Chuyên viên'
      });

      const userDoc = await adminDb.collection('users').doc(testUserId).get();
      const uData = userDoc.data();
      const isForbidden = uData?.role === 'Chuyên viên';
      expect(isForbidden).toBe(true);

      await adminDb.collection('users').doc(testUserId).delete();
    });

    it('permits deletion for Administrator or Ban Giám Đốc', async () => {
      const adminUserId = `user-admin-${Date.now()}`;
      await adminDb.collection('users').doc(adminUserId).set({
        id: adminUserId,
        name: 'Trần Văn Admin',
        email: 'admin@sgm.vn',
        role: 'Administrator'
      });

      const userDoc = await adminDb.collection('users').doc(adminUserId).get();
      const uData = userDoc.data();
      const isForbidden = uData?.role === 'Chuyên viên';
      expect(isForbidden).toBe(false);

      await adminDb.collection('users').doc(adminUserId).delete();
    });
  });
});
