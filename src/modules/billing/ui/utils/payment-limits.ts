import { Payment } from '@/src/domain/schema/payment.schema';
import { calculateOtherPaidMultiMilestone } from '@/src/domain/services/financial-reconciler';

export function calculateTotals(
  products: any[],
  currentSubTotal: number,
  vatRate: number,
  discountRate: number
) {
  const calculatedSubTotal =
    products && products.length > 0
      ? products.reduce((acc: number, p: any) => acc + (p.price || 0) * (p.quantity || 1), 0)
      : null;

  const finalSubTotal = calculatedSubTotal !== null ? Math.round(calculatedSubTotal) : currentSubTotal;
  const discountAmount = Math.round(finalSubTotal * (discountRate / 100));
  const vatAmount = Math.round(Math.max(0, finalSubTotal - discountAmount) * (vatRate / 100));
  const totalAmount = finalSubTotal + vatAmount - discountAmount;

  return {
    calculatedSubTotal,
    finalSubTotal,
    vatAmount,
    discountAmount,
    totalAmount: Math.round(totalAmount)
  };
}

export function calculateOtherPaid(
  paymentId: string | undefined,
  payments: Payment[],
  sourceValue: string
): number {
  return calculateOtherPaidMultiMilestone(paymentId, payments, sourceValue);
}

export function determinePaymentStatus(
  soTienVal: number,
  otherPaid: number,
  totalAmountVal: number
): 'Tất toán' | 'Công nợ' | 'Chưa TT' | null {
  if (totalAmountVal === 0) return null;
  const totalReceived = soTienVal + otherPaid;
  if (totalReceived >= totalAmountVal) {
    return 'Tất toán';
  } else if (totalReceived > 0) {
    return 'Công nợ';
  } else {
    return 'Chưa TT';
  }
}
