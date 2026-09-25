import { describe, it, expect } from 'vitest';
import { paymentAggregates } from './aggregates.config';
import { Payment } from '@/src/domain/schema/payment.schema';

describe('paymentAggregates', () => {
  it('totalCustomers counts unique customers', () => {
    const ps = [{ customerId: 'C1' }, { customerId: 'C1' }, { customerId: 'C2' }] as Payment[];
    expect(paymentAggregates.totalCustomers(ps)).toBe(2);
  });

  it('completedPayments counts paid items', () => {
    const ps = [
      { tinhTrangThanhToan: 'ĐÃ THANH TOÁN' },
      { tinhTrangThanhToan: 'Tất toán' },
      { tinhTrangThanhToan: 'CHƯA THANH TOÁN' }
    ] as Payment[];
    expect(paymentAggregates.completedPayments(ps)).toBe(2);
  });

  it('pendingPayments skips paid items', () => {
    const ps = [
      { tinhTrangThanhToan: 'CHƯA THANH TOÁN' },
      { tinhTrangThanhToan: 'Thanh toán 1 phần' },
      { tinhTrangThanhToan: 'ĐÃ THANH TOÁN' }
    ] as Payment[];
    expect(paymentAggregates.pendingPayments(ps)).toBe(2);
  });

  it('overduePayments logic', () => {
    // 1 day ago
    const past = new Date(Date.now() - 86400000).toISOString();
    // 1 day from now
    const future = new Date(Date.now() + 86400000).toISOString();
    
    const ps = [
      { tinhTrangThanhToan: 'ĐÃ THANH TOÁN', ngayDenHan: past }, // Paid, not overdue
      { tinhTrangThanhToan: 'CHƯA THANH TOÁN', ngayDenHan: past }, // Overdue
      { tinhTrangThanhToan: 'CHƯA THANH TOÁN', ngayDenHan: future }, // Not due yet
      { tinhTrangThanhToan: 'CHƯA THANH TOÁN' }, // No due date -> not overdue
    ] as Payment[];
    
    expect(paymentAggregates.overduePayments(ps)).toBe(1);
  });

  it('totalAmount sums amounts', () => {
    const ps = [{ soTien: 100 }, { soTien: 250 }, {}] as Payment[];
    expect(paymentAggregates.totalAmount(ps)).toBe(350);
  });
});
