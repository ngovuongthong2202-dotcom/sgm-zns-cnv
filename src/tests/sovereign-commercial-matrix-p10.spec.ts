import { describe, it, expect } from 'vitest';
import {
  isSourceDocumentFullyDelivered,
  isReconcilerCustomerCompatible,
  ReconcilerSourceDocument
} from '@/src/domain/services/delivery-reconciler';
import {
  getLinkedPaymentsForContract,
  reconcileContractFinancials
} from '@/src/domain/services/financial-reconciler';
import { resolveDeliverySourceDocument } from '@/src/modules/fulfillment/ui/utils/deliverySourceResolver';
import { checkContractLock } from '@/src/modules/contracts/domain/ContractPolicy';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';

describe('Sovereign Autonomous Commercial Lineage Matrix (SACLM v2.0)', () => {

  describe('1. Delivery Reconciler - Cross-Customer Isolation', () => {
    it('prevents deliveries from Customer B fulfilling contract of Customer A even when sharing duplicate soHopDong', () => {
      const contractCustA: ReconcilerSourceDocument = {
        id: 'contract-aaa',
        customerId: 'cust-aaa',
        soHopDong: 'HD-2026/SGM-VIP',
        products: [{ productId: 'p1', productName: 'Máy uốn CNC', quantity: 2 }]
      };

      // Delivery thuộc về Customer B (khác customerId), nhưng người nhập liệu gõ trùng soHopDong
      const foreignDeliveryCustB: ReconcilerSourceDocument = {
        id: 'del-foreign-bbb',
        customerId: 'cust-bbb',
        soHopDong: 'HD-2026/SGM-VIP',
        products: [{ productId: 'p1', productName: 'Máy uốn CNC', quantity: 2 }]
      };

      // Khi chỉ có delivery của khách B, Hợp đồng của khách A KHÔNG được tính là hoàn tất!
      const isDone = isSourceDocumentFullyDelivered(
        contractCustA,
        [foreignDeliveryCustB],
        [contractCustA],
        []
      );
      expect(isDone).toBe(false);

      // Khi có delivery chính chủ của khách A, Hợp đồng mới được tính là hoàn tất
      const genuineDeliveryCustA: ReconcilerSourceDocument = {
        id: 'del-genuine-aaa',
        customerId: 'cust-aaa',
        soHopDong: 'HD-2026/SGM-VIP',
        products: [{ productId: 'p1', productName: 'Máy uốn CNC', quantity: 2 }]
      };
      const isDoneGenuine = isSourceDocumentFullyDelivered(
        contractCustA,
        [foreignDeliveryCustB, genuineDeliveryCustA],
        [contractCustA],
        []
      );
      expect(isDoneGenuine).toBe(true);
    });

    it('correctly handles merged customer codes in delivery reconciler', () => {
      const contract: ReconcilerSourceDocument = {
        id: 'c-1',
        customerId: 'KH0596-NEW',
        mergedCustomerCodes: ['KH0596-OLD'],
        products: [{ productId: 'p1', quantity: 1 }]
      };
      const deliveryOldCode: ReconcilerSourceDocument = {
        id: 'd-1',
        customerId: 'KH0596-OLD',
        contractId: 'c-1',
        products: [{ productId: 'p1', quantity: 1 }]
      };

      expect(isReconcilerCustomerCompatible(contract, deliveryOldCode)).toBe(true);
      expect(isSourceDocumentFullyDelivered(contract, [deliveryOldCode], [contract], [])).toBe(true);
    });
  });

  describe('2. Financial Reconciler - Cash Flow Boundary Guard', () => {
    it('strictly isolates contract debt and does not credit payments from different customers', () => {
      const contractA = {
        id: 'contract-alpha',
        customerId: 'cust-alpha-uuid',
        soHopDong: 'HD-DONG-NAI-001',
        totalAmount: 1000000000 // 1 tỷ
      } as unknown as Contract;

      // Phiếu thu của khách hàng Beta với cùng số HĐ
      const paymentBeta = {
        id: 'pay-beta',
        paymentId: 'PT-BETA-01',
        contractId: 'contract-alpha',
        soHopDong: 'HD-DONG-NAI-001',
        customerId: 'cust-beta-uuid',
        soTien: 500000000,
        tinhTrangThanhToan: 'Đã thanh toán'
      } as unknown as Payment;

      const linked = getLinkedPaymentsForContract(contractA, [paymentBeta]);
      expect(linked).toHaveLength(0); // Bị loại bỏ hoàn toàn

      const prog = reconcileContractFinancials(contractA, [paymentBeta]);
      expect(prog.totalPaid).toBe(0);
      expect(prog.remainingDebt).toBe(1000000000);
      expect(prog.isFullyPaid).toBe(false);
    });
  });

  describe('3. Delivery Source Resolver - Multi-Tier Identity Enforcement', () => {
    it('rejects Tier 1 contract match if customer identity is discordant', async () => {
      const deliveryData = {
        customerId: 'cust-hanoi',
        tenKhachHang: 'Công Ty Hà Nội Cơ Khí',
        contractId: 'contract-saigon'
      };

      const foreignContract = {
        id: 'contract-saigon',
        customerId: 'cust-saigon',
        tenKhachHang: 'Công Ty Sài Gòn Thép',
        soHopDong: 'HD-SG-01'
      };

      const resolved = await resolveDeliverySourceDocument(deliveryData, {
        contracts: [foreignContract]
      });

      // Bị loại bỏ vì bất đồng danh tính khách hàng
      expect(resolved).toBeNull();
    });

    it('resolves Tier 1 contract match when customer identity is compatible', async () => {
      const deliveryData = {
        customerId: 'cust-hanoi',
        tenKhachHang: 'Công Ty Hà Nội Cơ Khí',
        contractId: 'contract-hanoi'
      };

      const validContract = {
        id: 'contract-hanoi',
        customerId: 'cust-hanoi',
        tenKhachHang: 'Công Ty Hà Nội Cơ Khí',
        soHopDong: 'HD-HN-01'
      };

      const resolved = await resolveDeliverySourceDocument(deliveryData, {
        contracts: [validContract]
      });

      expect(resolved).not.toBeNull();
      expect(resolved?.sourceId).toBe('contract-hanoi');
    });
  });

  describe('4. Contract Policy - checkContractLock Boundary', () => {
    it('does not lock contract if child payments belong to a different customer', () => {
      const contract = {
        id: 'c-alpha',
        customerId: 'cust-alpha',
        soHopDong: 'HD-ALPHA-2026'
      } as Contract;

      const foreignPayment = {
        id: 'p-foreign',
        paymentId: 'PT-999',
        contractId: 'c-alpha',
        soHopDong: 'HD-ALPHA-2026',
        customerId: 'cust-different',
        tinhTrangThanhToan: 'Đã thanh toán'
      } as Payment;

      const lockResult = checkContractLock(contract, [foreignPayment], []);
      expect(lockResult.locked).toBe(false);
      expect(lockResult.blockingDocuments).toBeUndefined();
    });

    it('locks contract when child payment belongs to the same customer', () => {
      const contract = {
        id: 'c-alpha',
        customerId: 'cust-alpha',
        soHopDong: 'HD-ALPHA-2026'
      } as Contract;

      const validPayment = {
        id: 'p-valid',
        paymentId: 'PT-111',
        contractId: 'c-alpha',
        soHopDong: 'HD-ALPHA-2026',
        customerId: 'cust-alpha',
        tinhTrangThanhToan: 'Đã thanh toán'
      } as Payment;

      const lockResult = checkContractLock(contract, [validPayment], []);
      expect(lockResult.locked).toBe(true);
      expect(lockResult.blockingDocuments).toContain('Thanh toán: PT-111');
    });
  });

});
