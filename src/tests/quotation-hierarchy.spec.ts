import { describe, it, expect } from 'vitest';
import { evaluateQuotationHierarchy } from '../modules/sales/ui/hooks/useQuotationForm';

describe('Quotation Hierarchy Priority Guardian', () => {
  it('identifies BG Dịch vụ when only service items exist', () => {
    const products = [
      { id: '1', productName: 'Chi phí vận chuyển', itemType: 'SERVICE', quantity: 1, price: 500000 },
      { id: '2', productName: 'Nhân công lắp đặt máy cán', itemType: 'SERVICE', quantity: 2, price: 1000000 }
    ];

    const result = evaluateQuotationHierarchy(products, 'BG Dịch vụ');
    expect(result.recommendedType).toBe('BG Dịch vụ');
    expect(result.machineCount).toBe(0);
    expect(result.materialCount).toBe(0);
    expect(result.serviceCount).toBe(2);
    expect(result.isDiscrepancy).toBe(false);
  });

  it('promotes to BG Vật tư (Priority 2) when material is present and no machine exists', () => {
    const products = [
      { id: '1', productName: 'Lưỡi dao cắt thép', itemType: 'MATERIAL', quantity: 4, price: 250000 },
      { id: '2', productName: 'Dịch vụ mài dao', itemType: 'SERVICE', quantity: 1, price: 100000 }
    ];

    const result = evaluateQuotationHierarchy(products, 'BG Dịch vụ');
    expect(result.recommendedType).toBe('BG Vật tư');
    expect(result.materialCount).toBe(1);
    expect(result.serviceCount).toBe(1);
    expect(result.machineCount).toBe(0);
    expect(result.isDiscrepancy).toBe(true);
  });

  it('promotes to BG Máy (Priority 1) when any machine is present regardless of materials and services', () => {
    const products = [
      { id: '1', productName: 'Máy cán tôn sóng vuông K1200', itemType: 'MACHINE', quantity: 1, price: 350000000 },
      { id: '2', productName: 'Lô cán dự phòng', itemType: 'MATERIAL', quantity: 2, price: 5000000 },
      { id: '3', productName: 'Chuyển giao công nghệ & đào tạo', itemType: 'SERVICE', quantity: 1, price: 15000000 }
    ];

    const result = evaluateQuotationHierarchy(products, 'BG Vật tư');
    expect(result.recommendedType).toBe('BG Máy');
    expect(result.machineCount).toBe(1);
    expect(result.materialCount).toBe(1);
    expect(result.serviceCount).toBe(1);
    expect(result.isDiscrepancy).toBe(true);
  });

  it('correctly matches when current selection already aligns with priority hierarchy', () => {
    const products = [
      { id: '1', productName: 'Máy chấn tôn thủy lực', itemType: 'MACHINE', quantity: 1, price: 180000000 },
      { id: '2', productName: 'Dầu thủy lực nhớt 68', itemType: 'MATERIAL', quantity: 20, price: 80000 }
    ];

    const result = evaluateQuotationHierarchy(products, 'BG Máy');
    expect(result.recommendedType).toBe('BG Máy');
    expect(result.isDiscrepancy).toBe(false);
  });

  it('detects discrepancy when user selected BG Máy but only services are included', () => {
    const products = [
      { id: '1', productName: 'Bảo dưỡng định kỳ', itemType: 'SERVICE', quantity: 1, price: 2000000 }
    ];

    const result = evaluateQuotationHierarchy(products, 'BG Máy');
    expect(result.recommendedType).toBe('BG Dịch vụ');
    expect(result.isDiscrepancy).toBe(true);
  });
});
