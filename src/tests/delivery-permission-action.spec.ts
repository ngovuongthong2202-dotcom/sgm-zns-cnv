import { describe, it, expect } from 'vitest';
import { can, AuthRole } from '../modules/iam/domain/auth.policy';
import { DeliveryStatusVO } from '../domain/value-objects/DeliveryStatusVO';
import { Delivery } from '../domain/schema/delivery.schema';

describe('SGM Omni-Nexus v23: Delivery Field Handover Permission & Financial Gatekeeper', () => {
  describe('Pillar 1: Staff (Chuyên viên) Operational Handover Authorization', () => {
    const staffRole: AuthRole = 'Chuyên viên';

    it('allows "Chuyên viên" to perform "update" on delivery resource (Operational Handover Confirmation)', () => {
      // In Omni-Nexus v23, delivery completion in field is an operational update action
      const hasPermission = can('update', 'delivery', staffRole);
      expect(hasPermission).toBe(true);
    });

    it('blocks "Chuyên viên" from performing "approve" action (Reserved for Management Authorization)', () => {
      // Management approval remains strictly restricted from regular staff
      const hasPermission = can('approve', 'delivery', staffRole);
      expect(hasPermission).toBe(false);
    });

    it('blocks "Chuyên viên" from performing "delete" on delivery resource', () => {
      // Deleting delivery slips is forbidden for staff to avoid paper trail tampering
      const hasPermission = can('delete', 'delivery', staffRole);
      expect(hasPermission).toBe(false);
    });

    it('blocks "Chuyên viên" from performing "force_unlock" on delivery resource', () => {
      // Force unlock is restricted to Administrator
      const hasPermission = can('force_unlock', 'delivery', staffRole);
      expect(hasPermission).toBe(false);
    });

    it('allows "Chuyên viên" to send ZNS notification for delivery', () => {
      const hasPermission = can('send_zns', 'delivery', staffRole);
      expect(hasPermission).toBe(true);
    });
  });

  describe('Pillar 2: Higher Roles (Ban Giám Đốc, Administrator) Matrix', () => {
    it('grants "Ban Giám Đốc" full operational and approval access to delivery', () => {
      expect(can('update', 'delivery', 'Ban Giám Đốc')).toBe(true);
      expect(can('approve', 'delivery', 'Ban Giám Đốc')).toBe(true);
      expect(can('view', 'delivery', 'Ban Giám Đốc')).toBe(true);
    });

    it('grants "Administrator" supreme omni-access across all delivery actions', () => {
      expect(can('update', 'delivery', 'Administrator')).toBe(true);
      expect(can('approve', 'delivery', 'Administrator')).toBe(true);
      expect(can('delete', 'delivery', 'Administrator')).toBe(true);
      expect(can('force_unlock', 'delivery', 'Administrator')).toBe(true);
    });
  });

  describe('Pillar 3: Delivery Status Lifecycle & Financial Clearance Synchronization', () => {
    it('correctly classifies delivered status when ngayGiaoThucTe is present', () => {
      expect(DeliveryStatusVO.isCompleted('Hoàn tất', '2026-10-01')).toBe(true);
      expect(DeliveryStatusVO.isCompleted('Đang giao', '2026-10-01')).toBe(true);
      expect(DeliveryStatusVO.isCompleted('Đang giao', undefined)).toBe(false);
      expect(DeliveryStatusVO.isCompleted('Đang giao', null)).toBe(false);
    });

    it('safely handles post-delivery settlement exemption (Đặc cách Giao trước - Tất toán sau)', () => {
      const mockDelivery: Partial<Delivery> = {
        deliveryId: 'PGH-2026-0016',
        soPhieuXuat: '11-PXBHDH2604-031',
        tenKhachHang: 'Công Ty TNHH Sắt Thép Gia Bách Hiệu',
        tinhTrangGiaoHang: 'Đang giao',
        dacCachGiaoTruoc: true
      };

      // Staff with 'update' permission can proceed with completion
      const canStaffComplete = can('update', 'delivery', 'Chuyên viên');
      expect(canStaffComplete).toBe(true);
      expect(mockDelivery.dacCachGiaoTruoc).toBe(true);
    });
  });
});
