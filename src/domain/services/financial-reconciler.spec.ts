import { describe, it, expect } from 'vitest';
import {
  reconcileContractFinancials,
  reconcileContractStats,
  getPaymentRemainingBalance,
  reconcilePaymentKpis,
  calculateOtherPaidMultiMilestone
} from './financial-reconciler';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';

describe('SGM Enterprise Financial Reconciler', () => {
  const contract023 = {
    id: 'c-023',
    soHopDong: '023/2026/HĐMB-SGM',
    customerId: 'cust-1',
    tenKhachHang: 'Công ty Bao Bì Thuận Phát',
    totalAmount: 2614680000,
    ngayKy: '2026-03-20'
  } as unknown as Contract;

  const contract021 = {
    id: 'c-021',
    soHopDong: '021/2026/HĐMB-SGM',
    customerId: 'cust-2',
    tenKhachHang: 'Công ty In Khang Huy',
    totalAmount: 2168059400,
    ngayKy: '2026-03-15'
  } as unknown as Contract;

  const contract022 = {
    id: 'c-022',
    soHopDong: '022/2026/HĐMB-SGM',
    customerId: 'cust-3',
    tenKhachHang: 'Công ty Nhựa Minh Khang',
    totalAmount: 1198740600,
    ngayKy: '2026-03-18'
  } as unknown as Contract;

  const payment023 = {
    id: 'p-023',
    paymentId: 'TT-023',
    contractId: 'c-023',
    soHopDong: '023/2026/HĐMB-SGM',
    customerId: 'cust-1',
    totalAmount: 2614680000,
    soTien: 784404000,
    tinhTrangThanhToan: 'Công nợ',
    ngayThanhToan: '2026-03-26'
  } as unknown as Payment;

  const payment021 = {
    id: 'p-021',
    paymentId: 'TT-021',
    contractId: 'c-021',
    soHopDong: '021/2026/HĐMB-SGM',
    customerId: 'cust-2',
    totalAmount: 2168059400,
    soTien: 650000000,
    tinhTrangThanhToan: 'Công nợ',
    ngayThanhToan: '2026-03-26'
  } as unknown as Payment;

  it('correctly reconciles single contract partial payment (HĐ 023)', () => {
    const prog = reconcileContractFinancials(contract023, [payment023]);
    expect(prog.totalContractAmount).toBe(2614680000);
    expect(prog.totalPaid).toBe(784404000);
    expect(prog.remainingDebt).toBe(1830276000);
    expect(prog.paymentPercentage).toBe(30);
    expect(prog.isFullyPaid).toBe(false);
    expect(prog.isPartiallyPaid).toBe(true);
    expect(prog.paidCount).toBe(1);
  });

  it('correctly preserves mathematical invariance across all 3 contracts', () => {
    const contracts = [contract023, contract021, contract022];
    const payments = [payment023, payment021];

    const stats = reconcileContractStats(contracts, payments);

    expect(stats.totalValue).toBe(5981480000);
    expect(stats.totalPaidValue).toBe(1434404000);
    expect(stats.totalUnpaidValue).toBe(4547076000);
    // Invariance Check: Total Value == Total Paid + Total Unpaid
    expect(stats.totalPaidValue + stats.totalUnpaidValue).toBe(stats.totalValue);

    expect(stats.paidCount).toBe(2); // 2 contracts have collections
    expect(stats.unpaidCount).toBe(3); // All 3 have remaining debt
  });

  it('correctly calculates remaining debt for partial payments in Billing module', () => {
    const debt023 = getPaymentRemainingBalance(payment023);
    const debt021 = getPaymentRemainingBalance(payment021);

    expect(debt023).toBe(1830276000);
    expect(debt021).toBe(1518059400);

    const totalDebt = debt023 + debt021;
    expect(totalDebt).toBe(3348335400);
  });

  it('correctly reconciles Billing KPI metrics for today collections and total debt', () => {
    const payments = [payment023, payment021];
    const testDate = new Date('2026-03-26T12:00:00Z');

    const kpis = reconcilePaymentKpis(payments, testDate);

    expect(kpis.collectedToday).toBe(1434404000);
    expect(kpis.collectedThisWeek).toBe(1434404000);
    expect(kpis.collectedThisMonth).toBe(1434404000);
    expect(kpis.collectedThisYear).toBe(1434404000);
    expect(kpis.totalDebt).toBe(3348335400);
  });

  it('supports multi-milestone payments in calculateOtherPaidMultiMilestone', () => {
    const milestone1 = {
      id: 'p-m1',
      contractId: 'c-023',
      soTien: 784404000,
      tinhTrangThanhToan: 'Công nợ'
    } as unknown as Payment;
    const milestone2 = {
      id: 'p-m2',
      contractId: 'c-023',
      soTien: 500000000,
      tinhTrangThanhToan: 'Công nợ'
    } as unknown as Payment;

    const otherPaid = calculateOtherPaidMultiMilestone('p-m3', [milestone1, milestone2], 'CONTRACT:c-023');
    expect(otherPaid).toBe(1284404000);
  });
});
