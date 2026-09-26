import { describe, it, expect } from 'vitest';
import {
  PaymentCanonicalStatus,
  normalizePaymentStatus,
  isPaymentFullyPaid,
  isPaymentPartial,
  isPaymentUnpaid,
  isPaymentCancelled,
  hasActualCashCollected
} from './payment-status';

describe('Payment Status Normalizer', () => {
  it('correctly maps full payment variations', () => {
    const fullVariants = [
      'Tất toán',
      'TẤT TOÁN',
      'tat toan',
      'Đã thanh toán',
      'ĐÃ THANH TOÁN',
      'da thanh toan',
      'Đã TT',
      'ĐÃ TT',
      'Miễn phí',
      'MIỄN PHÍ'
    ];

    for (const v of fullVariants) {
      expect(normalizePaymentStatus(v)).toBe(PaymentCanonicalStatus.PAID_FULL);
      expect(isPaymentFullyPaid(v)).toBe(true);
      expect(hasActualCashCollected(v)).toBe(true);
    }
  });

  it('correctly maps partial payment and debt variations', () => {
    const partialVariants = [
      'Công nợ',
      'CÔNG NỢ',
      'cong no',
      'Đã TT một phần',
      'Thu 1 phần',
      '1 phần',
      'mot phan'
    ];

    for (const v of partialVariants) {
      expect(normalizePaymentStatus(v)).toBe(PaymentCanonicalStatus.PAID_PARTIAL);
      expect(isPaymentPartial(v)).toBe(true);
      expect(hasActualCashCollected(v)).toBe(true);
      expect(isPaymentFullyPaid(v)).toBe(false);
    }
  });

  it('correctly maps unpaid variations', () => {
    const unpaidVariants = [
      'Chưa TT',
      'CHƯA TT',
      'Chưa thanh toán',
      'CHƯA THANH TOÁN',
      'Chờ thu',
      'CHỜ THU',
      '',
      null,
      undefined,
      'unknown status'
    ];

    for (const v of unpaidVariants) {
      expect(normalizePaymentStatus(v)).toBe(PaymentCanonicalStatus.UNPAID);
      expect(isPaymentUnpaid(v)).toBe(true);
      expect(hasActualCashCollected(v)).toBe(false);
    }
  });

  it('correctly maps cancelled variations', () => {
    const cancelledVariants = [
      'Hủy',
      'HỦY',
      'Đã hủy',
      'huy',
      'CANCELLED'
    ];

    for (const v of cancelledVariants) {
      expect(normalizePaymentStatus(v)).toBe(PaymentCanonicalStatus.CANCELLED);
      expect(isPaymentCancelled(v)).toBe(true);
      expect(hasActualCashCollected(v)).toBe(false);
    }
  });
});
