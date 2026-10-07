import { describe, it, expect } from 'vitest';
import { 
  detectItemType, 
  calculateActualMachineCount 
} from '@/src/widgets/product-list-input/useProductItemSemantic';
import { classifyProductCategory } from '@/src/features/dashboard/components/ProductAnalyticsTab';
import { normalizeLoai, QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';

describe('Phase 1: Product Taxonomy & Statistics Standardisation', () => {
  it('accurately identifies MACHINE, MATERIAL, and SERVICE line items', () => {
    // Industrial machines
    expect(detectItemType('Máy cán xà gồ C/Z tự động', 'Bộ')).toBe('MACHINE');
    expect(detectItemType('Dây chuyền sản xuất tấm lợp panel', 'Dàn')).toBe('MACHINE');
    expect(detectItemType('Khung dập tôn vòm thuỷ lực', 'Cái')).toBe('MACHINE');

    // Materials / Spare parts
    expect(detectItemType('Dao cắt tôn máy xà gồ SKD11', 'Cái')).toBe('MATERIAL');
    expect(detectItemType('Trục cán định hình phi 80', 'Cây')).toBe('MATERIAL');
    expect(detectItemType('Ốc vít và bulong liên kết M12', 'Kg')).toBe('MATERIAL');

    // Services
    expect(detectItemType('Dịch vụ cân chỉnh máy và chạy thử', 'Gói')).toBe('SERVICE');
    expect(detectItemType('Chi phí vận chuyển và cẩu hạ hàng', 'Chuyến')).toBe('SERVICE');
    expect(detectItemType('Nhân công lắp đặt hoàn thiện', 'Công')).toBe('SERVICE');
  });

  it('calculateActualMachineCount only sums quantities of MACHINE items', () => {
    const products = [
      { productName: 'Máy cán tôn sóng ngói', quantity: 2, itemType: 'MACHINE' },
      { productName: 'Dao cắt tôn dự phòng', quantity: 10, itemType: 'MATERIAL' },
      { productName: 'Ốc vít liên kết', quantity: 100, itemType: 'MATERIAL' },
      { productName: 'Dịch vụ vận chuyển', quantity: 1, itemType: 'SERVICE' }
    ];

    const machineCount = calculateActualMachineCount(products);
    expect(machineCount).toBe(2);
  });

  it('calculateActualMachineCount returns 0 when products contain only materials or services', () => {
    const materialProducts = [
      { productName: 'Dao cắt tôn SKD11', quantity: 5, unit: 'Cái' }
    ];

    const count = calculateActualMachineCount(materialProducts);
    expect(count).toBe(0);
  });

  it('classifyProductCategory in Dashboard harmonizes with 5-tier semantic detection', () => {
    expect(classifyProductCategory({ productName: 'Máy cán xà gồ C tự động' })).toBe('MAY');
    expect(classifyProductCategory({ productName: 'Dao xả băng tôn' })).toBe('VAT_TU');
    expect(classifyProductCategory({ productName: 'Chi phí vận chuyển nội thành' })).toBe('DICH_VU');
  });

  it('normalizes quotation category correctly', () => {
    expect(normalizeLoai('BG Máy')).toBe(QUOTATION_LOAI.MAY);
    expect(normalizeLoai('BG Vật tư')).toBe(QUOTATION_LOAI.VAT_TU);
    expect(normalizeLoai('BG Dịch vụ')).toBe(QUOTATION_LOAI.DICH_VU);
  });
});
