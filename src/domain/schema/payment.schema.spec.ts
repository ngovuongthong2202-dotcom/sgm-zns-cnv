import { describe, it, expect } from 'vitest';
import { PaymentSchema } from './payment.schema';

describe('PaymentSchema', () => {
  it('should strip unknown fields but preserve all defined fields', () => {
    const input = {
      paymentId: 'P1',
      customerId: 'C1',
      soTien: 1000000,
      unknownField: 'should be stripped',
      _systemHiddenId: 'should also be stripped',
      trangThaiGuiTinThanhToan: 'THÀNH CÔNG'
    };

    const parsed = PaymentSchema.parse(input);

    // Assert that unknown fields are stripped
    expect('unknownField' in parsed).toBe(false);
    expect('_systemHiddenId' in parsed).toBe(false);

    // Assert that defined fields are preserved
    expect(parsed.paymentId).toBe('P1');
    expect(parsed.customerId).toBe('C1');
    expect(parsed.soTien).toBe(1000000);
    expect(parsed.trangThaiGuiTinThanhToan).toBe('THÀNH CÔNG');
  });

  it('preserves empty objects for dictionary fields (e.g. thongTinGuiZnsThanhToan)', () => {
    const input = {
      paymentId: 'P2',
      customerId: 'C2',
      thongTinGuiZnsThanhToan: {
        vendorTrackingId: '123'
      }
    };
    const parsed = PaymentSchema.parse(input);
    expect(parsed.thongTinGuiZnsThanhToan).toEqual({ vendorTrackingId: '123' });
  });
});
