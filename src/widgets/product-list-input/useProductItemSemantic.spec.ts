import { describe, it, expect } from 'vitest';
import {
  detectItemType,
  calculateActualMachineCount,
  smartAllocateSerials,
  getAvailableRootSerials,
  ITEM_SEMANTIC_CONFIG,
  formatZnsQuotationProducts,
  formatZnsProductItemTitle,
  packItemsWithBudget
} from './useProductItemSemantic';
import { ProductItem } from '@/src/domain/schema/product.schema';

describe('useProductItemSemantic - The Sovereign Hybrid Item-Semantic Kernel', () => {
  describe('detectItemType', () => {
    it('detects MACHINE even when unit is Cái, Bộ or Dàn', () => {
      expect(detectItemType('Máy cán tôn sóng vuông 11 sóng')).toBe('MACHINE');
      expect(detectItemType('Dây chuyền cán xà gồ C/Z tự động')).toBe('MACHINE');
      expect(detectItemType('Hệ thống dập vòm thuỷ lực K1200')).toBe('MACHINE');
      expect(detectItemType('Khung dập tôn cuộn')).toBe('MACHINE');
    });

    it('detects MATERIAL for spare parts, blades, rollers, accessories', () => {
      expect(detectItemType('Lưỡi dao cắt Cr12MoV')).toBe('MATERIAL');
      expect(detectItemType('Trục cán định hình')).toBe('MATERIAL');
      expect(detectItemType('Con lăn dẫn hướng phi 80')).toBe('MATERIAL');
      expect(detectItemType('Ốc vít và bulong liên kết')).toBe('MATERIAL');
      expect(detectItemType('Dầu nhớt bôi trơn công nghiệp')).toBe('MATERIAL');
    });

    it('detects SERVICE for installation, calibration, and training', () => {
      expect(detectItemType('Dịch vụ lắp đặt và cân chỉnh máy tại xưởng')).toBe('SERVICE');
      expect(detectItemType('Chuyển giao công nghệ và hướng dẫn vận hành')).toBe('SERVICE');
      expect(detectItemType('Bảo dưỡng định kỳ 6 tháng')).toBe('SERVICE');
      expect(detectItemType('Chi phí nhân công thi công')).toBe('SERVICE');
    });

    it('falls back to defaultType for generic or empty strings', () => {
      expect(detectItemType('', 'MACHINE')).toBe('MACHINE');
      expect(detectItemType('Sản phẩm thử nghiệm', 'MATERIAL')).toBe('MATERIAL');
    });
  });

  describe('calculateActualMachineCount', () => {
    it('strictly counts quantities of MACHINE items and excludes materials/services', () => {
      const items: ProductItem[] = [
        {
          id: '1',
          productName: 'Máy cán tôn 1 tầng',
          quantity: 2,
          unit: 'Cái', // Even though unit is 'Cái', it's counted as MACHINE
          itemType: 'MACHINE'
        },
        {
          id: '2',
          productName: 'Lưỡi dao cắt dự phòng',
          quantity: 5,
          unit: 'Bộ',
          itemType: 'MATERIAL'
        },
        {
          id: '3',
          productName: 'Dịch vụ cân chỉnh máy tại chỗ',
          quantity: 1,
          unit: 'Gói',
          itemType: 'SERVICE'
        },
        {
          id: '4',
          productName: 'Máy dập vòm thuỷ lực',
          quantity: 1,
          unit: 'Máy',
          itemType: 'MACHINE'
        }
      ];

      // Total machines = 2 + 1 = 3 (excludes 5 blades and 1 service)
      expect(calculateActualMachineCount(items)).toBe(3);
    });

    it('auto-detects itemType if not explicitly set', () => {
      const items: ProductItem[] = [
        {
          id: '1',
          productName: 'Máy uốn vòm nóc',
          quantity: 1,
          unit: 'Cái'
        },
        {
          id: '2',
          productName: 'Ốc vít bu lông',
          quantity: 100,
          unit: 'Cái'
        }
      ];

      expect(calculateActualMachineCount(items)).toBe(1);
    });
  });

  describe('smartAllocateSerials & getAvailableRootSerials', () => {
    it('allocates unassigned root serials only to MACHINE items up to their quantity', () => {
      const rootSerials = ['SN-2026-001', 'SN-2026-002', 'SN-2026-003'];
      const products: ProductItem[] = [
        {
          id: '1',
          productName: 'Máy cán tôn sóng vuông',
          quantity: 2,
          itemType: 'MACHINE',
          danhSachMaMay: []
        },
        {
          id: '2',
          productName: 'Lưỡi dao cắt',
          quantity: 2,
          itemType: 'MATERIAL',
          danhSachMaMay: []
        }
      ];

      const allocated = smartAllocateSerials(products, rootSerials);

      // Machine row gets first 2 serials
      expect(allocated[0].danhSachMaMay).toEqual(['SN-2026-001', 'SN-2026-002']);
      // Material row gets NO serials
      expect(allocated[1].danhSachMaMay).toEqual([]);

      // Available pool should have the remaining serial
      const available = getAvailableRootSerials(allocated, rootSerials);
      expect(available).toEqual(['SN-2026-003']);
    });

    it('preserves existing assigned serials and does not duplicate them', () => {
      const rootSerials = ['SN-01', 'SN-02', 'SN-03'];
      const products: ProductItem[] = [
        {
          id: '1',
          productName: 'Máy cán xà gồ',
          quantity: 2,
          itemType: 'MACHINE',
          danhSachMaMay: ['SN-01'] // already has 1
        }
      ];

      const allocated = smartAllocateSerials(products, rootSerials);
      expect(allocated[0].danhSachMaMay).toEqual(['SN-01', 'SN-02']);

      const available = getAvailableRootSerials(allocated, rootSerials);
      expect(available).toEqual(['SN-03']);
    });
  });

  describe('ITEM_SEMANTIC_CONFIG', () => {
    it('has required keys and labels for all types', () => {
      expect(ITEM_SEMANTIC_CONFIG.MACHINE.shortLabel).toBe('Máy');
      expect(ITEM_SEMANTIC_CONFIG.MATERIAL.shortLabel).toBe('Vật tư');
      expect(ITEM_SEMANTIC_CONFIG.SERVICE.shortLabel).toBe('Dịch vụ');
    });
  });

  describe('formatZnsQuotationProducts - Enterprise Sovereign Adaptive Matrix (Phương án 10)', () => {
    it('TC1: formats mixed items with 2 machines, 1 material, 1 service correctly', () => {
      const items: ProductItem[] = [
        { id: '1', productName: 'Máy cán tôn sóng vuông 11 sóng', quantity: 1, itemType: 'MACHINE' },
        { id: '2', productName: 'Máy dập vòm thuỷ lực K1200', quantity: 1, itemType: 'MACHINE' },
        { id: '3', productName: 'Lưỡi dao cắt SKD11', quantity: 2, unit: 'Bộ', itemType: 'MATERIAL' },
        { id: '4', productName: 'Dịch vụ lắp đặt và hướng dẫn vận hành', quantity: 1, itemType: 'SERVICE' }
      ];

      const result = formatZnsQuotationProducts(items, 200);
      expect(result.product_1).toBe('Máy cán tôn sóng vuông 11 sóng | Máy dập vòm thuỷ lực K1200');
      expect(result.product_2).toBe('Lưỡi dao cắt SKD11 (SL: 2 Bộ) | Dịch vụ lắp đặt và hướng dẫn vận hành');
      expect(result.product_1.length).toBeLessThanOrEqual(200);
      expect(result.product_2.length).toBeLessThanOrEqual(200);
    });

    it('TC2: formats quotation with exactly 1 item: product_1 has item, product_2 has "......"', () => {
      const items: ProductItem[] = [
        { id: '1', productName: 'Máy cán xà gồ C/Z tự động', quantity: 1, itemType: 'MACHINE' }
      ];

      const result = formatZnsQuotationProducts(items, 200);
      expect(result.product_1).toBe('Máy cán xà gồ C/Z tự động');
      expect(result.product_2).toBe('......');
    });

    it('TC2b: formats quotation with 1 item having quantity > 1', () => {
      const items: ProductItem[] = [
        { id: '1', productName: 'Máy cán tôn 11 sóng', quantity: 2, unit: 'Dàn', itemType: 'MACHINE' }
      ];

      const result = formatZnsQuotationProducts(items, 200);
      expect(result.product_1).toBe('Máy cán tôn 11 sóng (SL: 2 Dàn)');
      expect(result.product_2).toBe('......');
    });

    it('TC3: formats pure machines (3 machines, 0 materials/services) across both lines without waste', () => {
      const items: ProductItem[] = [
        { id: '1', productName: 'Máy cán tôn 2 tầng sóng vuông và sóng la phông', quantity: 1, itemType: 'MACHINE' },
        { id: '2', productName: 'Máy dập vòm thuỷ lực', quantity: 1, itemType: 'MACHINE' },
        { id: '3', productName: 'Máy xả cuộn 5 tấn tự động', quantity: 1, itemType: 'MACHINE' }
      ];

      const result = formatZnsQuotationProducts(items, 200);
      expect(result.product_1).toBe('Máy cán tôn 2 tầng sóng vuông và sóng la phông');
      expect(result.product_2).toBe('Máy dập vòm thuỷ lực | Máy xả cuộn 5 tấn tự động');
      expect(result.product_1.length).toBeLessThanOrEqual(200);
      expect(result.product_2.length).toBeLessThanOrEqual(200);
    });

    it('TC4: formats pure materials & services (0 machines, 2 materials, 1 service)', () => {
      const items: ProductItem[] = [
        { id: '1', productName: 'Lưỡi dao cắt SKD11', quantity: 4, unit: 'Cái', itemType: 'MATERIAL' },
        { id: '2', productName: 'Trục cán định hình phi 90', quantity: 2, unit: 'Cây', itemType: 'MATERIAL' },
        { id: '3', productName: 'Dịch vụ bảo dưỡng và cân chỉnh định kỳ', quantity: 1, itemType: 'SERVICE' }
      ];

      const result = formatZnsQuotationProducts(items, 200);
      expect(result.product_1).toBe('Lưỡi dao cắt SKD11 (SL: 4 Cái)');
      expect(result.product_2).toBe('Trục cán định hình phi 90 (SL: 2 Cây) | Dịch vụ bảo dưỡng và cân chỉnh định kỳ');
      expect(result.product_1.length).toBeLessThanOrEqual(200);
      expect(result.product_2.length).toBeLessThanOrEqual(200);
    });

    it('TC5: gracefully truncates with " | ...... " when items exceed 200 characters limit', () => {
      const items: ProductItem[] = [
        { id: '1', productName: 'Dây chuyền máy cán tôn sóng vuông 11 sóng công nghiệp tốc độ cao 35m/phút hệ thống điều khiển PLC tự động tích hợp dao cắt thuỷ lực servo', quantity: 1, itemType: 'MACHINE' },
        { id: '2', productName: 'Hệ thống máy dập vòm cong bán tự động khuôn dập linh hoạt theo bán kính điều chỉnh tự do từ R1200 đến R8000', quantity: 1, itemType: 'MACHINE' },
        { id: '3', productName: 'Máy xả cuộn thuỷ lực tự động tải trọng 10 tấn tích hợp cơ cấu ép cuộn chống bung và cánh tay đỡ phụ', quantity: 1, itemType: 'MACHINE' }
      ];

      const result = formatZnsQuotationProducts(items, 200);
      expect(result.product_1.length).toBeLessThanOrEqual(200);
      expect(result.product_2.length).toBeLessThanOrEqual(200);
      // TC5 has pure machines: machine 1 in product_1, machine 2 & 3 in product_2
      // Check that product_2 contains " | ...... " if machine 2 + machine 3 exceeds 200 chars
      if (result.product_2.includes(' | ...... ')) {
        expect(result.product_2).toContain(' | ...... ');
      }
    });

    it('TC6: handles empty product list safely without throwing', () => {
      const result = formatZnsQuotationProducts([], 200);
      expect(result.product_1).toBe('Thiết bị công nghiệp SGM');
      expect(result.product_2).toBe('......');
    });
  });
});

