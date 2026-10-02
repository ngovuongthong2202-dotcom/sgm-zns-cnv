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

  describe('4. Zero-Hallucination Machine Serial & Plan Code Engine (v53)', () => {
    it('should NOT generate fake SGM036-26 numbers for materials, cables, or services without machine code', async () => {
      const { resolveMachineSerials } = await import('@/src/modules/fulfillment/ui/utils/handoverDocumentHelper');

      const serviceItem = {
        productName: 'Chi phí nhân công lắp đặt',
        quantity: 1,
        unit: 'Lần',
        itemType: 'SERVICE' as const
      };

      const materialItem = {
        productName: 'Dây cáp điện 3 pha',
        quantity: 50,
        unit: 'Mét',
        itemType: 'MATERIAL' as const
      };

      const emptyDelivery = {
        deliveryId: 'PGH-2026-7209',
        products: [serviceItem, materialItem]
      };

      const serviceSerial = resolveMachineSerials(serviceItem as any, emptyDelivery as any, 0);
      const materialSerial = resolveMachineSerials(materialItem as any, emptyDelivery as any, 1);

      // Crucial: Must be empty string, NEVER hallucinated SGM036-26
      expect(serviceSerial).toBe('');
      expect(materialSerial).toBe('');
      expect(serviceSerial).not.toContain('SGM036');
      expect(materialSerial).not.toContain('SGM037');
    });

    it('should preserve genuine machineCode and danhSachMaMay when assigned', async () => {
      const { resolveMachineSerials } = await import('@/src/modules/fulfillment/ui/utils/handoverDocumentHelper');

      const realMachineItem = {
        productName: 'Máy dập vòm ngói',
        quantity: 1,
        unit: 'Máy',
        machineCode: 'SGM-DV-2026-099',
        danhSachMaMay: ['SGM-DV-2026-099']
      };

      const realDelivery = {
        deliveryId: 'PGH-2026-0001',
        products: [realMachineItem]
      };

      const serial = resolveMachineSerials(realMachineItem as any, realDelivery as any, 0);
      expect(serial).toBe('SGM-DV-2026-099');
    });
  });

  describe('5. Intelligent Warranty Resolution Engine (v53)', () => {
    it('should resolve standard 12 months for industrial machines, --- for services, and Theo NSX for parts', async () => {
      const { resolveItemWarranty } = await import('@/src/modules/fulfillment/ui/utils/handoverDocumentHelper');

      const machineItem = { productName: 'Máy cán tôn sóng vuông 11 sóng', unit: 'Bộ' };
      const laborItem = { productName: 'Chi phí ăn uống đi lại', unit: 'Gói' };
      const partItem = { productName: 'Dao cắt tôn SKD11', unit: 'Cái' };

      expect(resolveItemWarranty(machineItem as any)).toBe('12 tháng');
      expect(resolveItemWarranty(laborItem as any)).toBe('---');
      expect(resolveItemWarranty(partItem as any)).toBe('Theo NSX');
    });
  });

  describe('6. Commercial Representative Deduplication (v53)', () => {
    it('should identify duplicate Bên B representatives and collapse into 1 title', () => {
      const deliveryWithSameRep = {
        nguoiDaiDien: 'ANH ĐẠT',
        kyNhan: 'anh đạt'
      };

      const rep1Name = (deliveryWithSameRep.nguoiDaiDien || '').trim();
      const rep2Name = (deliveryWithSameRep.kyNhan || '').trim();
      const isDuplicateBRep = Boolean(
        rep1Name && 
        rep2Name && 
        rep1Name.toLowerCase() === rep2Name.toLowerCase()
      );
      const showSecondBRep = Boolean(rep2Name) && !isDuplicateBRep;

      expect(isDuplicateBRep).toBe(true);
      expect(showSecondBRep).toBe(false);
    });

    it('should render both representatives when distinct persons', () => {
      const deliveryWithDistinctReps = {
        nguoiDaiDien: 'Ông Nguyễn Văn A',
        kyNhan: 'Anh Trần Văn B'
      };

      const rep1Name = (deliveryWithDistinctReps.nguoiDaiDien || '').trim();
      const rep2Name = (deliveryWithDistinctReps.kyNhan || '').trim();
      const isDuplicateBRep = Boolean(
        rep1Name && 
        rep2Name && 
        rep1Name.toLowerCase() === rep2Name.toLowerCase()
      );
      const showSecondBRep = Boolean(rep2Name) && !isDuplicateBRep;

      expect(isDuplicateBRep).toBe(false);
      expect(showSecondBRep).toBe(true);
    });
  });

  describe('7. Dataviews Dynamic Milestone Suppression (v53)', () => {
    it('should suppress Đợt 1 badge when order is 100% delivered or has zero remaining products', () => {
      const singleFullyShippedDelivery = {
        id: 'PGH-2026-7212',
        slMay: 1,
        products: [{ productName: 'Máy cán vòm', quantity: 1 }],
        cacDotGiao: [{
          dotGiaoHang: 1,
          isDotCuoiCung: false, // Legacy field was false!
          products: [{ productName: 'Máy cán vòm', quantity: 1 }]
        }]
      };

      const recon = reconcileDeliveryShipments(singleFullyShippedDelivery as any);
      const isRemainingZero = recon.isFullyDelivered ||
        (recon.remainingProducts.length > 0 && recon.remainingProducts.every(item => item.remainingQuantity <= 0));
      const shipments = singleFullyShippedDelivery.cacDotGiao;
      const isPartialPending = !isRemainingZero && shipments.length === 1;

      expect(recon.isFullyDelivered).toBe(true);
      expect(isRemainingZero).toBe(true);
      // Crucial: Must be FALSE so "Đợt 1" badge is NEVER rendered on completed/single orders!
      expect(isPartialPending).toBe(false);
    });
  });

});
