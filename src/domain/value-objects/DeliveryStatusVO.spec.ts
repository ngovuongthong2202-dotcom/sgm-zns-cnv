import { describe, it, expect } from 'vitest';
import { DeliveryStatusVO, CanonicalDeliveryStatus } from './DeliveryStatusVO';

describe('DeliveryStatusVO', () => {
  it('correctly maps completed delivery statuses', () => {
    expect(DeliveryStatusVO.fromString('HOAN_TAT')).toBe(CanonicalDeliveryStatus.HOAN_TAT);
    expect(DeliveryStatusVO.fromString('HOAN TẤT')).toBe(CanonicalDeliveryStatus.HOAN_TAT);
    expect(DeliveryStatusVO.fromString('Hoàn tất')).toBe(CanonicalDeliveryStatus.HOAN_TAT);
    expect(DeliveryStatusVO.fromString('Đã giao')).toBe(CanonicalDeliveryStatus.HOAN_TAT);
    expect(DeliveryStatusVO.fromString('DA_GIAO')).toBe(CanonicalDeliveryStatus.HOAN_TAT);
    expect(DeliveryStatusVO.fromString('COMPLETED')).toBe(CanonicalDeliveryStatus.HOAN_TAT);
  });

  it('correctly evaluates isCompleted through status or actual delivery date', () => {
    expect(DeliveryStatusVO.isCompleted('HOAN_TAT')).toBe(true);
    expect(DeliveryStatusVO.isCompleted('Hoàn tất')).toBe(true);
    expect(DeliveryStatusVO.isCompleted('CHUA_GIAO', '2026-09-24')).toBe(true);
    expect(DeliveryStatusVO.isCompleted('CHUA_GIAO', '')).toBe(false);
    expect(DeliveryStatusVO.isCompleted('CHUA_GIAO', undefined)).toBe(false);
  });

  it('correctly identifies in-progress and cancelled statuses', () => {
    expect(DeliveryStatusVO.fromString('DANG_GIAO')).toBe(CanonicalDeliveryStatus.DANG_GIAO);
    expect(DeliveryStatusVO.fromString('Đang giao')).toBe(CanonicalDeliveryStatus.DANG_GIAO);
    expect(DeliveryStatusVO.fromString('DA_HUY')).toBe(CanonicalDeliveryStatus.DA_HUY);
    expect(DeliveryStatusVO.fromString('Đã hủy')).toBe(CanonicalDeliveryStatus.DA_HUY);
  });
});
