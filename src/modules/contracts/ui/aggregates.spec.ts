import { describe, it, expect } from 'vitest';
import { contractAggregates } from './aggregates.config';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';

describe('contractAggregates', () => {
  it('totalCustomersWithContracts counts unique customers', () => {
    const cs = [{ customerId: 'C1' }, { customerId: 'C1' }, { customerId: 'C2' }] as Contract[];
    expect(contractAggregates.totalCustomersWithContracts(cs)).toBe(2);
  });

  it('contractsPendingPayment logic', () => {
    const cs = [{ id: 'C1' }, { id: 'C2' }, { id: 'C3' }] as Contract[];
    const ps = [
      { contractId: 'C1', tinhTrangThanhToan: 'ĐÃ THANH TOÁN' },
      { contractId: 'C2', tinhTrangThanhToan: 'CHƯA THANH TOÁN' }
    ] as Payment[];
    // C1 is fully paid. C2 is pending. C3 has no payment, so pending.
    expect(contractAggregates.contractsPendingPayment(cs, ps)).toBe(2);
  });

  it('contractsPendingDelivery logic', () => {
    const cs = [{ id: 'C1' }, { id: 'C2' }, { id: 'C3' }] as Contract[];
    const ds = [
      { contractId: 'C1', ngayGiaoThucTe: '2023-01-01' },
      { contractId: 'C2', ngayGiaoThucTe: '' }
    ] as Delivery[];
    // C1 delivered. C2 pending. C3 pending.
    expect(contractAggregates.contractsPendingDelivery(cs, ds)).toBe(2);
  });

  it('snapshot test for all aggregates', () => {
    const cs = [{ id: 'C1', customerId: 'Cust1' }] as Contract[];
    expect({
      totalCustomers: contractAggregates.totalCustomersWithContracts(cs),
      totalContracts: contractAggregates.totalContracts(cs),
      pendingPayment: contractAggregates.contractsPendingPayment(cs, []),
      pendingDelivery: contractAggregates.contractsPendingDelivery(cs, []),
    }).toMatchInlineSnapshot(`
      {
        "pendingDelivery": 1,
        "pendingPayment": 1,
        "totalContracts": 1,
        "totalCustomers": 1,
      }
    `);
  });
});
