import { describe, it, expect } from 'vitest';
import { deliveryAggregates } from './aggregates.config';
import { Delivery } from '@/src/domain/schema/delivery.schema';

describe('deliveryAggregates', () => {
  it('totalCustomers counts unique customers', () => {
    const ds = [{ customerId: 'C1' }, { customerId: 'C1' }, { customerId: 'C2' }] as Delivery[];
    expect(deliveryAggregates.totalCustomers(ds)).toBe(2);
  });

  it('inTransitDeliveries logic', () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    const future = new Date(Date.now() + 86400000).toISOString();
    
    const ds = [
      { ngayGiaoThucTe: '2023-01-01' }, // completed
      { ngayGiaoMay: past }, // in transit (past)
      { ngayGiaoMay: future }, // not in transit yet
      {}, // no dates, let's say in transit
    ] as Delivery[];
    
    expect(deliveryAggregates.inTransitDeliveries(ds)).toBe(2);
  });

  it('completedDeliveries counts actual delivery date', () => {
    const ds = [
      { ngayGiaoThucTe: '2023-01-01' },
      {},
    ] as Delivery[];
    expect(deliveryAggregates.completedDeliveries(ds)).toBe(1);
  });
});
