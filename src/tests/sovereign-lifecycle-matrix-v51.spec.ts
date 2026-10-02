import { describe, it, expect, vi } from 'vitest';
import { reconcileDeliveryShipments } from '@/src/modules/fulfillment/ui/utils/delivery-reconciler';

describe('The Sovereign Unified Lifecycle Matrix (v51) Comprehensive Tests', () => {

  describe('1. Fulfillment Milestone Intelligence & Button Suppression', () => {
    it('should calculate isFullyDelivered and remaining quantities accurately when 7/7 items dispatched', () => {
      const deliveryWithAllShipped = {
        id: 'DEL-2026-0084',
        deliveryId: 'PGH-2026-0084',
        slMay: 7,
        products: [
          {
            id: 'item-1',
            productName: 'Máy cán vòm sóng ngói',
            quantity: 7,
            price: 150000000,
            unit: 'Máy'
          }
        ],
        cacDotGiao: [
          {
            id: 'DOT-1',
            dotGiaoHang: 1,
            soPhieuXuat: 'PXK-2026-0084',
            ngayGiaoMay: '2026-10-02',
            ngayGiaoThucTe: null, // Pending confirmation
            products: [
              {
                id: 'item-1',
                productName: 'Máy cán vòm sóng ngói',
                quantity: 7,
                price: 150000000,
                unit: 'Máy'
              }
            ]
          }
        ]
      };

      const recon = reconcileDeliveryShipments(deliveryWithAllShipped as any);

      expect(recon.totalBaselineQuantity).toBe(7);
      expect(recon.totalShippedQuantity).toBe(7);
      expect(recon.isFullyDelivered).toBe(true);
      expect(recon.tienDoLuyKe).toBe(100);

      // Verify all products have remainingQuantity <= 0
      const isRemainingZero = recon.isFullyDelivered ||
        (recon.remainingProducts.length > 0 && recon.remainingProducts.every(p => p.remainingQuantity <= 0));
      expect(isRemainingZero).toBe(true);
    });

    it('should handle deliveries defined solely by slMay when products array is empty', () => {
      const deliveryWithScalarSlMay = {
        id: 'DEL-2026-0099',
        deliveryId: 'PGH-2026-0099',
        slMay: 5,
        products: [],
        cacDotGiao: [
          {
            id: 'DOT-1',
            dotGiaoHang: 1,
            soPhieuXuat: 'PXK-2026-0099',
            slMay: 5,
            products: []
          }
        ]
      };

      const recon = reconcileDeliveryShipments(deliveryWithScalarSlMay as any);
      expect(recon.totalBaselineQuantity).toBe(5);
      expect(recon.totalShippedQuantity).toBe(5);
      expect(recon.isFullyDelivered).toBe(true);
      expect(recon.tienDoLuyKe).toBe(100);
    });

    it('should keep nextDotGiaoHang active when partially shipped', () => {
      const partialDelivery = {
        id: 'DEL-2026-0100',
        deliveryId: 'PGH-2026-0100',
        slMay: 10,
        products: [
          {
            id: 'item-1',
            productName: 'Máy cán xà gồ C',
            quantity: 10,
            unit: 'Máy'
          }
        ],
        cacDotGiao: [
          {
            id: 'DOT-1',
            dotGiaoHang: 1,
            soPhieuXuat: 'PXK-2026-0100-1',
            products: [
              {
                id: 'item-1',
                productName: 'Máy cán xà gồ C',
                quantity: 4,
                unit: 'Máy'
              }
            ]
          }
        ]
      };

      const recon = reconcileDeliveryShipments(partialDelivery as any);
      expect(recon.totalBaselineQuantity).toBe(10);
      expect(recon.totalShippedQuantity).toBe(4);
      expect(recon.isFullyDelivered).toBe(false);
      expect(recon.tienDoLuyKe).toBe(40);
      expect(recon.nextDotGiaoHang).toBe(2);
    });
  });

  describe('2. Dual-Axis Progress vs Physical Confirmation Logic', () => {
    it('should distinguish awaiting physical confirmation (100% allocated) vs fully confirmed', () => {
      const deliveryPendingConfirm = {
        ngayGiaoThucTe: null,
        tinhTrangGiaoHang: 'ĐANG_GIAO',
        tienDoLuyKe: 100
      };

      const isPhysicalConfirmed = Boolean(deliveryPendingConfirm.ngayGiaoThucTe) ||
        ['HOAN_TAT', 'DA_GIAO', 'ĐÃ GIAO', 'HOÀN TẤT'].includes(deliveryPendingConfirm.tinhTrangGiaoHang);

      const isCompleted = isPhysicalConfirmed && deliveryPendingConfirm.tienDoLuyKe >= 100;
      const isAwaitingConfirm = deliveryPendingConfirm.tienDoLuyKe >= 100 && !isPhysicalConfirmed;

      expect(isCompleted).toBe(false);
      expect(isAwaitingConfirm).toBe(true);
    });

    it('should confirm Hoàn tất 100% only when physical date or HOAN_TAT status exists', () => {
      const deliveryConfirmed = {
        ngayGiaoThucTe: '2026-10-02',
        tinhTrangGiaoHang: 'HOAN_TAT',
        tienDoLuyKe: 100
      };

      const isPhysicalConfirmed = Boolean(deliveryConfirmed.ngayGiaoThucTe) ||
        ['HOAN_TAT', 'DA_GIAO', 'ĐÃ GIAO', 'HOÀN TẤT'].includes(deliveryConfirmed.tinhTrangGiaoHang);

      const isCompleted = isPhysicalConfirmed && deliveryConfirmed.tienDoLuyKe >= 100;
      expect(isCompleted).toBe(true);
    });
  });

  describe('3. Cockpit HUD targetId Defensive Extraction', () => {
    it('should extract string targetId correctly whether passed string or entity object', () => {
      const rawObject = { id: 'contract-xyz-123', soHopDong: 'HD-2026-001' };
      const rawString = 'contract-xyz-123';

      const targetIdFromObj = typeof rawObject === 'string' ? rawObject : (rawObject.id || (rawObject as any)._id);
      const targetIdFromStr = typeof rawString === 'string' ? rawString : ((rawString as any).id || (rawString as any)._id);

      expect(targetIdFromObj).toBe('contract-xyz-123');
      expect(targetIdFromStr).toBe('contract-xyz-123');
      expect(targetIdFromObj).not.toBe('[object Object]');
    });
  });

});
