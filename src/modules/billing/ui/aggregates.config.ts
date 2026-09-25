import { Payment } from '@/src/domain/schema/payment.schema';

export const paymentAggregates = {
  totalCustomers: (payments: Payment[]) => {
    const customers = new Set(payments.map(p => p.customerId).filter(Boolean));
    return customers.size;
  },
  totalPayments: (payments: Payment[]) => payments.length,
  completedPayments: (payments: Payment[]) => payments.filter(p => p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN').length,
  pendingPayments: (payments: Payment[]) => payments.filter(p => 
    p.tinhTrangThanhToan !== 'Tất toán' && 
    p.tinhTrangThanhToan !== 'ĐÃ THANH TOÁN' && 
    p.tinhTrangThanhToan !== 'Miễn phí'
  ).length,
  overduePayments: (payments: Payment[]) => payments.filter(p => {
    if (p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || p.tinhTrangThanhToan === 'Miễn phí') return false;
    if (!p.ngayDenHan) return false;
    const han = new Date(p.ngayDenHan).getTime();
    const nay = new Date().getTime();
    return nay > han;
  }).length,
  totalAmount: (payments: Payment[]) => payments.reduce((sum, p) => sum + (p.soTien || 0), 0),
  collectedAmount: (payments: Payment[]) => payments.filter(p => p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN').reduce((sum, p) => sum + (p.soTien || 0), 0),
  debtAmount: (payments: Payment[]) => payments.filter(p => p.tinhTrangThanhToan === 'Công nợ' || p.tinhTrangThanhToan === 'Chưa TT').reduce((sum, p) => sum + (p.soTien || 0), 0)
};
