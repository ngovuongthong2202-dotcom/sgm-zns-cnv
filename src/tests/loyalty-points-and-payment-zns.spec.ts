import { describe, it, expect } from 'vitest';
import { 
  formatPoints, 
  calculatePaymentPoints, 
  calculateFormattedPaymentPoints,
  calculateCustomerCumulativePoints,
  calculateFormattedCustomerCumulativePoints 
} from '@/src/modules/billing/domain/loyaltyEngine';

describe('Phase 2 & 3: Loyalty Points Engine & MDM Consolidation', () => {
  it('calculates points based strictly on 1.000 VNĐ = 1 Point', () => {
    expect(calculatePaymentPoints(1000)).toBe(1);
    expect(calculatePaymentPoints(2200000)).toBe(2200);
    expect(calculatePaymentPoints(15000000)).toBe(15000);
    expect(calculatePaymentPoints(999)).toBe(0); // Floor rounding
    expect(calculatePaymentPoints(-5000)).toBe(0);
  });

  it('formats points with Vietnamese thousand dot separators', () => {
    // 2200 -> "2.200", 15000 -> "15.000"
    expect(formatPoints(2200)).toBe('2.200');
    expect(formatPoints(15000)).toBe('15.000');
    expect(calculateFormattedPaymentPoints(2200000)).toBe('2.200');
    expect(calculateFormattedPaymentPoints(15000000)).toBe('15.000');
  });

  it('calculates customer cumulative points across installments', () => {
    const customerPayments = [
      {
        customerId: 'KH-001',
        dotThanhToan: [
          { soTien: 5000000 },
          { soTien: 10000000 }
        ]
      }
    ];

    const points = calculateCustomerCumulativePoints('KH-001', customerPayments);
    expect(points).toBe(15000); // 15.000.000 / 1.000 = 15.000
    expect(calculateFormattedCustomerCumulativePoints('KH-001', customerPayments)).toBe('15.000');
  });

  it('incorporates merged secondary customer IDs (MDM integration) into cumulative points', () => {
    const payments = [
      { customerId: 'KH-MASTER', soTien: 10000000 },
      { customerId: 'KH-SECONDARY-1', soTien: 5000000 },
      { customerId: 'KH-SECONDARY-2', soTien: 3000000 },
      { customerId: 'KH-OTHER', soTien: 20000000 } // Unrelated customer
    ];

    const mergedIds = ['KH-SECONDARY-1', 'KH-SECONDARY-2'];
    const totalPoints = calculateCustomerCumulativePoints('KH-MASTER', payments, mergedIds);

    // Total = 10tr + 5tr + 3tr = 18tr -> 18.000 points
    expect(totalPoints).toBe(18000);
    expect(calculateFormattedCustomerCumulativePoints('KH-MASTER', payments, mergedIds)).toBe('18.000');
  });
});
