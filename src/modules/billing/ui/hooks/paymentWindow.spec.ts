import { describe, it, expect } from 'vitest';
import { isPaymentWindowReady, type PaymentWindowLike } from './paymentWindow';

// Điểm tích lũy gửi cho khách chỉ được tính trên cửa sổ phiếu thu trong bộ nhớ khi cửa sổ đó đã nạp xong (Đợt 0A DL01).
const loaded: PaymentWindowLike = { data: [{ id: 'p1' }, { id: 'p2' }], loading: false, total: 2, capped: false };

describe('isPaymentWindowReady – cửa sổ phiếu thu đủ tin cậy để tính điểm tích lũy', () => {
  it('chưa có dòng nào → chưa sẵn sàng', () => {
    expect(isPaymentWindowReady({ ...loaded, data: [] })).toBe(false);
  });

  it('còn đang nạp → chưa sẵn sàng', () => {
    expect(isPaymentWindowReady({ ...loaded, loading: true })).toBe(false);
  });

  it('chưa biết tổng và chưa chạm trần (entry vừa được mồi từ entityCachePool) → chưa sẵn sàng', () => {
    expect(isPaymentWindowReady({ ...loaded, total: null, capped: false })).toBe(false);
  });

  it('đã biết tổng → sẵn sàng', () => {
    expect(isPaymentWindowReady({ ...loaded, total: 2, capped: false })).toBe(true);
  });

  it('chưa biết tổng nhưng đã chạm trần → sẵn sàng', () => {
    expect(isPaymentWindowReady({ ...loaded, total: null, capped: true })).toBe(true);
  });
});
