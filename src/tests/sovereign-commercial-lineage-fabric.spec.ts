import { describe, it, expect } from 'vitest';
import { isSameCustomer, resolveCustomerIdentity } from '@/src/shared/utils/customerIdentityResolver';
import { reconcileEnterpriseReceivables } from '@/src/domain/services/financial-reconciler';

describe('Sovereign Commercial Lineage & Self-Healing Identity Fabric (Paradigm 10++)', () => {
  const customerA = {
    id: '998a8e08-81c3-422a-b0e1-dda49fb1a6d2',
    maKh: 'KH0596',
    tenKhachHang: 'Cửa Hàng Vật Liệu Xây Dựng Sáu Thắng',
    sdt: '0919312039',
    tinhThanh: 'Tiền Giang'
  };

  const customerB = {
    id: '748e92c5-590c-46cb-a204-7379300776a1',
    maKh: 'KH0761', // Reassigned code
    tenKhachHang: 'Nguyễn Quang Thắng',
    sdt: '0935560199',
    tinhThanh: 'Khánh Hòa'
  };

  const quoteA = {
    id: '106412fb-eaef-409d-832c-a7c48ea3b40d',
    soPhieuBaoGia: '11-BG2601-011',
    customerId: customerA.id,
    maKh: 'KH0596',
    tenKhachHang: 'Cửa Hàng Vật Liệu Xây Dựng Sáu Thắng',
    totalAmount: 1074600
  };

  const quoteB = {
    id: '789dcb2a-330b-4e17-b061-7de523579ce7',
    soPhieuBaoGia: 'BGM-2026-0826',
    customerId: customerB.id,
    maKh: 'KH0761',
    tenKhachHang: 'Nguyễn Quang Thắng',
    totalAmount: 3047544000
  };

  describe('1. Strict Identity Isolation & Conflict Guard', () => {
    it('strictly isolates customer A and customer B when both have distinct UUIDs', () => {
      expect(isSameCustomer(customerA, customerB)).toBe(false);
      expect(isSameCustomer(customerA, quoteB)).toBe(false);
      expect(isSameCustomer(customerB, quoteA)).toBe(false);
    });

    it('strictly returns false even if two entities hypothetically share duplicate maKh', () => {
      const collidingCustomerB = {
        ...customerB,
        maKh: 'KH0596' // Artificial duplicate maKh
      };
      // Because customerA.id !== collidingCustomerB.id, isSameCustomer MUST return false!
      expect(isSameCustomer(customerA, collidingCustomerB)).toBe(false);
      expect(isSameCustomer(customerA, { ...quoteB, maKh: 'KH0596' })).toBe(false);
    });

    it('correctly matches when IDs are identical', () => {
      expect(isSameCustomer(customerA, quoteA)).toBe(true);
      expect(isSameCustomer(customerB, quoteB)).toBe(true);
    });

    it('resolves merged customer codes when explicitly recorded in mergedCustomerCodes', () => {
      const mergedCustomerA = {
        ...customerA,
        mergedCustomerCodes: [customerB.id]
      };
      expect(isSameCustomer(mergedCustomerA, customerB)).toBe(true);
      expect(isSameCustomer(mergedCustomerA, quoteB)).toBe(true);
    });
  });

  describe('2. Financial Reconciliation & LTV Boundary Security', () => {
    it('isolates financial calculations and prevents cross-customer LTV inflation', () => {
      // Reconciling Customer A with only Customer A quotes
      const recA = reconcileEnterpriseReceivables([], [], [quoteA]);
      expect(recA.totalPaid).toBe(0);
      expect(recA.totalDebt).toBe(0);

      // Reconciling Customer B with Customer B quotes
      const recB = reconcileEnterpriseReceivables([], [], [quoteB]);
      expect(recB.totalPaid).toBe(0);
      expect(recB.totalDebt).toBe(0);

      // Verify that Customer A never receives the 3.047.544.000 đ quotation
      const filteredQuotesForA = [quoteA, quoteB].filter(q => isSameCustomer(customerA, q));
      expect(filteredQuotesForA).toHaveLength(1);
      expect(filteredQuotesForA[0].id).toBe(quoteA.id);
      expect(filteredQuotesForA[0].totalAmount).toBe(1074600);

      // Verify total pipeline calculation for Customer A vs Customer B
      const totalQuotesA = filteredQuotesForA.reduce((sum, q) => sum + q.totalAmount, 0);
      expect(totalQuotesA).toBe(1074600);

      const filteredQuotesForB = [quoteA, quoteB].filter(q => isSameCustomer(customerB, q));
      expect(filteredQuotesForB).toHaveLength(1);
      expect(filteredQuotesForB[0].id).toBe(quoteB.id);
      expect(filteredQuotesForB[0].totalAmount).toBe(3047544000);
    });
  });

  describe('3. Lineage Fabric Downstream Linkage Integrity', () => {
    const contractA = {
      id: 'ct-001',
      soHopDong: '001/HĐ/26',
      customerId: customerA.id,
      quotationId: quoteA.id,
      soPhieuBaoGia: quoteA.soPhieuBaoGia,
      totalAmount: 1074600
    };

    const contractB = {
      id: 'ct-002',
      soHopDong: '002/HĐ/26',
      customerId: customerB.id,
      quotationId: quoteB.id,
      soPhieuBaoGia: quoteB.soPhieuBaoGia,
      totalAmount: 3047544000
    };

    it('matches downstream contracts strictly within customer boundary', () => {
      const allContracts = [contractA, contractB];

      const matchingContractsForQuoteA = allContracts.filter(c => 
        isSameCustomer(quoteA, c) && (c.quotationId === quoteA.id || c.soPhieuBaoGia === quoteA.soPhieuBaoGia)
      );
      expect(matchingContractsForQuoteA).toHaveLength(1);
      expect(matchingContractsForQuoteA[0].id).toBe(contractA.id);

      const matchingContractsForQuoteB = allContracts.filter(c => 
        isSameCustomer(quoteB, c) && (c.quotationId === quoteB.id || c.soPhieuBaoGia === quoteB.soPhieuBaoGia)
      );
      expect(matchingContractsForQuoteB).toHaveLength(1);
      expect(matchingContractsForQuoteB[0].id).toBe(contractB.id);
    });

    it('rejects downstream contract linkage if contract has different customerId even with colliding quote code', () => {
      const maliciousCollidingContract = {
        id: 'ct-colliding',
        soHopDong: '999/HĐ/26',
        customerId: customerB.id, // Customer B!
        quotationId: quoteA.id, // Inadvertently referenced Quote A
        soPhieuBaoGia: quoteA.soPhieuBaoGia,
        totalAmount: 5000000
      };

      const matchingForQuoteA = [contractA, maliciousCollidingContract].filter(c =>
        isSameCustomer(quoteA, c) && (c.quotationId === quoteA.id || c.soPhieuBaoGia === quoteA.soPhieuBaoGia)
      );

      // Must strictly exclude maliciousCollidingContract because isSameCustomer(quoteA, maliciousCollidingContract) is false!
      expect(matchingForQuoteA).toHaveLength(1);
      expect(matchingForQuoteA[0].id).toBe(contractA.id);
    });
  });
});
