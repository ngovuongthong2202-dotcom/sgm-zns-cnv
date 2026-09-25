import { describe, it, expect } from 'vitest';
import { customerAggregates } from './aggregates.config';
import { Customer } from '@/src/domain/schema/customer.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

describe('customerAggregates', () => {
  it('totalCustomers counts all items', () => {
    const customers = [{ id: '1' }, { id: '2' }] as Customer[];
    expect(customerAggregates.totalCustomers(customers)).toBe(2);
  });

  it('totalRegions gets unique count of tinhThanh', () => {
    const customers = [
      { tinhThanh: 'Hanoi' },
      { tinhThanh: 'Hanoi' },
      { tinhThanh: 'HCMC' },
      {}
    ] as Customer[];
    expect(customerAggregates.totalRegions(customers)).toBe(2);
  });

  it('totalZnsSent counts only SUCCESS status', () => {
    const customers = [
      { trangThaiGuiTinQuangCao: EntityZnsStatus.THANH_CONG },
      { trangThaiGuiTinQuangCao: 'SUCCESS' },
      { trangThaiGuiTinQuangCao: EntityZnsStatus.CHUA_GUI },
    ] as Customer[];
    expect(customerAggregates.totalZnsSent(customers)).toBe(2);
  });

  it('snapshot test for all aggregates', () => {
    const customers = [
      { tinhThanh: 'Hanoi', trangThaiGuiTinQuangCao: 'SUCCESS' },
      { tinhThanh: 'HCMC', trangThaiGuiTinQuangCao: null },
      { tinhThanh: 'Danang', trangThaiGuiTinQuangCao: 'SUCCESS' },
    ] as Customer[];
    
    expect({
      totalCustomers: customerAggregates.totalCustomers(customers),
      totalRegions: customerAggregates.totalRegions(customers),
      totalZnsSent: customerAggregates.totalZnsSent(customers),
    }).toMatchInlineSnapshot(`
      {
        "totalCustomers": 3,
        "totalRegions": 3,
        "totalZnsSent": 2,
      }
    `);
  });
});
