import { Payment } from '@/src/domain/schema/payment.schema';

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
  if (!sourceValue) return 0;
  const [type, id] = sourceValue.split(':');
  const otherPayments = payments.filter(
    (p) =>
      p.id !== paymentId &&
      (type === 'CONTRACT' ? p.contractId === id : p.quotationId === id) &&
      (p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN')
  );
  return otherPayments.reduce((acc, curr) => acc + (curr.soTien || 0), 0);
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
