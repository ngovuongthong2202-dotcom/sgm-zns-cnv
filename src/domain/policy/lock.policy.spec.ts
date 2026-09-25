import { describe, it, expect } from 'vitest';
import { checkQuotationLock, checkPaymentLock, checkCustomerLock } from './lock.policy';
import { checkContractLock } from '../../modules/contracts/domain/ContractPolicy';
import { Quotation } from '../../domain/schema/quotation.schema';
import { Contract } from '../../domain/schema/contract.schema';
import { Payment } from '../../domain/schema/payment.schema';
import { Delivery } from '../../domain/schema/delivery.schema';

describe('Policy Locks', () => {
  describe('checkQuotationLock', () => {
    it('should be unlocked if no children exist', () => {
      const q = { id: 'Q1' } as Quotation;
      expect(checkQuotationLock(q, [], [], [])).toEqual({ locked: false });
    });

    it('should be locked if contract exists', () => {
      const q = { id: 'Q1' } as Quotation;
      const c = { id: 'C1', soHopDong: 'C-001', quotationId: 'Q1' } as Contract;
      const result = checkQuotationLock(q, [c], [], []);
      expect(result.locked).toBe(true);
      expect(result.blockingDocuments).toContain('Hợp đồng: C-001');
    });

    it('should be locked if payment exists', () => {
      const q = { id: 'Q1' } as Quotation;
      const p = { id: 'P1', paymentId: 'PT-001', quotationId: 'Q1' } as Payment;
      const result = checkQuotationLock(q, [], [p], []);
      expect(result.locked).toBe(true);
      expect(result.blockingDocuments).toContain('Thanh toán: PT-001');
    });
  });

  describe('checkContractLock', () => {
    it('should be unlocked if no children exist', () => {
      const c = { id: 'C1' } as Contract;
      expect(checkContractLock(c, [], [])).toEqual({ locked: false });
    });

    it('should be locked if delivery exists', () => {
      const c = { id: 'C1', soHopDong: 'C-001' } as Contract;
      const d = { id: 'D1', deliveryId: 'GH-001', contractId: 'C1' } as Delivery;
      const result = checkContractLock(c, [], [d]);
      expect(result.locked).toBe(true);
      expect(result.blockingDocuments).toContain('Giao hàng: GH-001');
    });
  });

  describe('checkPaymentLock', () => {
    it('should be unlocked if no delivery exists', () => {
      const p = { id: 'P1' } as Payment;
      expect(checkPaymentLock(p, [])).toEqual({ locked: false });
    });

    it('should be locked if delivery exists', () => {
      const p = { id: 'P1', paymentId: 'PT-001' } as Payment;
      const d = { id: 'D1', deliveryId: 'GH-001', paymentId: 'P1' } as Delivery;
      const result = checkPaymentLock(p, [d]);
      expect(result.locked).toBe(true);
      expect(result.blockingDocuments).toContain('Giao hàng: GH-001');
    });

    it('should include detailedBlocks when locked', () => {
      const p = { id: 'P1', paymentId: 'PT-001' } as Payment;
      const d = { id: 'D1', deliveryId: 'GH-001', paymentId: 'P1', ngayGiaoHang: '2026-09-23' } as unknown as Delivery;
      const result = checkPaymentLock(p, [d]);
      expect(result.locked).toBe(true);
      expect(result.detailedBlocks).toHaveLength(1);
      expect(result.detailedBlocks?.[0]).toEqual({
        type: 'delivery',
        id: 'D1',
        code: 'GH-001',
        label: 'Giao hàng: GH-001',
        date: '2026-09-23',
        status: undefined
      });
    });
  });

  describe('checkCustomerLock', () => {
    it('should be unlocked if customer has no transactions', () => {
      const cust = { id: 'CUST-1', maKhachHang: 'KH-001' } as any;
      expect(checkCustomerLock(cust, [], [], [], [])).toEqual({ locked: false });
    });

    it('should be locked with detailedBlocks if customer has a quotation', () => {
      const cust = { id: 'CUST-1', maKhachHang: 'KH-001', tenKhachHang: 'Alpha Corp' } as any;
      const q = { id: 'Q1', soPhieuBaoGia: 'BG-001', customerId: 'CUST-1', tongTien: 1000000 } as any;
      const result = checkCustomerLock(cust, [q], [], [], []);
      expect(result.locked).toBe(true);
      expect(result.blockingDocuments).toContain('Báo giá: BG-001');
      expect(result.detailedBlocks?.[0].type).toBe('quotation');
      expect(result.detailedBlocks?.[0].code).toBe('BG-001');
    });
  });
});

