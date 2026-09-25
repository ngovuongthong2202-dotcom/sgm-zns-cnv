import { describe, it, expect } from 'vitest';
import { DeliveryStatusVO } from '@/src/domain/value-objects/DeliveryStatusVO';
import { DeliverySchema } from '@/src/domain/schema/delivery.schema';

describe('Delivery Confirmation Revert & Deletion Logic', () => {
  it('correctly identifies completed delivery when ngayGiaoThucTe is present', () => {
    const isComp = DeliveryStatusVO.isCompleted('Đang giao', '2026-09-25');
    expect(isComp).toBe(true);
  });

  it('correctly returns false for isCompleted when ngayGiaoThucTe is null or cleared', () => {
    const isCompNull = DeliveryStatusVO.isCompleted('Đang giao', null);
    expect(isCompNull).toBe(false);

    const isCompEmpty = DeliveryStatusVO.isCompleted('Đang giao', '');
    expect(isCompEmpty).toBe(false);

    const isCompUndef = DeliveryStatusVO.isCompleted('Đang giao', undefined);
    expect(isCompUndef).toBe(false);
  });

  it('allows nullable ngayGiaoThucTe in DeliverySchema', () => {
    const validData = {
      deliveryId: 'GH-2026-001',
      paymentId: 'PM-001',
      customerId: 'CUST-001',
      ngayGiaoThucTe: null,
      tinhTrangGiaoHang: 'Đang giao',
      kyNhan: '',
    };
    const parsed = DeliverySchema.safeParse(validData);
    expect(parsed.success).toBe(true);
  });

  it('reverting confirmation resets completed flags to allow deletion', () => {
    const confirmedDelivery = {
      deliveryId: 'GH-2026-001',
      paymentId: 'PM-001',
      customerId: 'CUST-001',
      ngayGiaoThucTe: '2026-09-25',
      tinhTrangGiaoHang: 'Hoàn tất',
      kyNhan: 'Nguyễn Văn A',
    };

    expect(DeliveryStatusVO.isCompleted(confirmedDelivery.tinhTrangGiaoHang, confirmedDelivery.ngayGiaoThucTe)).toBe(true);

    // Revert confirmation
    const revertedDelivery = {
      ...confirmedDelivery,
      ngayGiaoThucTe: null,
      tinhTrangGiaoHang: 'Đang giao',
      kyNhan: '',
    };

    expect(DeliveryStatusVO.isCompleted(revertedDelivery.tinhTrangGiaoHang, revertedDelivery.ngayGiaoThucTe)).toBe(false);
  });
});
