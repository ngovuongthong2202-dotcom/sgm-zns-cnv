/**
 * Loyalty Points Calculation Engine for SGM OS
 * Rule: Strictly 1.000 VNĐ = 1 Point (Điểm tích lũy)
 * Formatted with Vietnamese thousand separators (e.g. 2.200, 15.000)
 */

export function formatPoints(points: number): string {
  const rounded = Math.floor(Math.max(0, Number(points) || 0));
  return rounded.toLocaleString('vi-VN');
}

export function calculatePaymentPoints(amount: number): number {
  const numericAmount = Math.max(0, Number(amount) || 0);
  return Math.floor(numericAmount / 1000);
}

export function calculateFormattedPaymentPoints(amount: number): string {
  return formatPoints(calculatePaymentPoints(amount));
}

/**
 * Calculates cumulative loyalty points for a customer across all completed payments.
 * Incorporates MDM consolidation by including transactions from merged customer IDs.
 */
export function calculateCustomerCumulativePoints(
  customerIdentifier: string,
  allPayments: any[] = [],
  mergedCustomerIds: string[] = []
): number {
  if (!customerIdentifier || !Array.isArray(allPayments)) return 0;

  const validIds = new Set<string>([
    customerIdentifier.trim().toLowerCase(),
    ...mergedCustomerIds.map(id => String(id || '').trim().toLowerCase()).filter(Boolean)
  ]);

  let totalPaidAmount = 0;

  for (const payment of allPayments) {
    if (!payment) continue;
    const cId = String(payment.customerId || '').trim().toLowerCase();
    const maKh = String(payment.maKh || '').trim().toLowerCase();

    const isMatch = (cId && validIds.has(cId)) || (maKh && validIds.has(maKh));
    if (!isMatch) continue;

    // If installments exist, sum installment amounts, otherwise take payment.soTien
    if (Array.isArray(payment.dotThanhToan) && payment.dotThanhToan.length > 0) {
      for (const dot of payment.dotThanhToan) {
        totalPaidAmount += Number(dot.soTien) || 0;
      }
    } else {
      totalPaidAmount += Number(payment.soTien) || 0;
    }
  }

  return calculatePaymentPoints(totalPaidAmount);
}

export function calculateFormattedCustomerCumulativePoints(
  customerIdentifier: string,
  allPayments: any[] = [],
  mergedCustomerIds: string[] = []
): string {
  return formatPoints(
    calculateCustomerCumulativePoints(customerIdentifier, allPayments, mergedCustomerIds)
  );
}
