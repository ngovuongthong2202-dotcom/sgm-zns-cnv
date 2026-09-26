import { describe, it, expect } from 'vitest';
import {
  calculateSubTotal,
  calculateVatAmount,
  calculateDiscountAmount,
  calculateTotalAmount,
  formatVietnameseCurrency,
  computeLineItem,
  aggregateProducts,
  reverseSolveLineItemsFromTotal
} from '@/src/domain/pricing/quotation-pricing';
import { ProductItem } from '@/src/domain/schema/product.schema';

describe('quotation-pricing calculations (SGM Enterprise Unified Engine)', () => {
  describe('computeLineItem', () => {
    it('computes line item without discount and tax', () => {
      const item: ProductItem = { productName: 'A', quantity: 2, price: 100000 };
      const computed = computeLineItem(item);
      expect((computed as any).gross).toBeUndefined(); // gross is internal logic, not returned
      expect(computed.discountAmount).toBe(0);
      expect(computed.subtotalBeforeTax).toBe(200000);
      expect(computed.taxAmount).toBe(0);
      expect(computed.subtotalAfterTax).toBe(200000);
      expect(computed.total).toBe(200000);
    });

    it('computes line item with 0% discount and 8% tax', () => {
      const item: ProductItem = { productName: 'A', quantity: 1, price: 200000, discountPct: 0, vatPct: 8 };
      const computed = computeLineItem(item);
      expect(computed.discountAmount).toBe(0);
      expect(computed.subtotalBeforeTax).toBe(200000);
      expect(computed.taxAmount).toBe(16000);
      expect(computed.subtotalAfterTax).toBe(216000);
    });

    it('computes line item with 10% discount and 10% tax', () => {
      const item: ProductItem = { productName: 'B', quantity: 2, price: 500000, discountPct: 10, vatPct: 10 };
      const computed = computeLineItem(item);
      expect(computed.discountAmount).toBe(100000);
      expect(computed.subtotalBeforeTax).toBe(900000);
      expect(computed.taxAmount).toBe(90000);
      expect(computed.subtotalAfterTax).toBe(990000);
    });

    it('computes with existing discountAmount when discountPct is not provided', () => {
      const item: ProductItem = { productName: 'B', quantity: 2, price: 500000, discountAmount: 150000, vatPct: 10 };
      const computed = computeLineItem(item);
      expect(computed.discountAmount).toBe(150000);
      expect(computed.subtotalBeforeTax).toBe(850000);
      expect(computed.taxAmount).toBe(85000);
      expect(computed.subtotalAfterTax).toBe(935000);
    });

    it('heals stale zero lock: overwrites stale 0 fields when valid price and VAT are provided', () => {
      // Giả lập dữ liệu cũ bị kẹt số 0 từ catalog hoặc database
      const staleItem: ProductItem = {
        productName: 'Máy sóng ngói 2 tầng',
        quantity: 1,
        price: 1010000000,
        vatPct: 8,
        subtotalBeforeTax: 0,
        taxAmount: 0,
        subtotalAfterTax: 0,
        subtotalAfterDiscount: 0
      };

      const computed = computeLineItem(staleItem);
      expect(computed.subtotalBeforeTax).toBe(1010000000);
      expect(computed.taxAmount).toBe(80800000); // 8% của 1.010.000.000
      expect(computed.subtotalAfterTax).toBe(1090800000);
      expect(computed.total).toBe(1090800000);
    });

    it('safely handles promotional items (0 VND) without breaking', () => {
      const promoItem: ProductItem = {
        productName: 'Phụ kiện tặng kèm: 01 dao cắt',
        quantity: 1,
        price: 0,
        vatPct: 0
      };

      const computed = computeLineItem(promoItem);
      expect(computed.price).toBe(0);
      expect(computed.subtotalBeforeTax).toBe(0);
      expect(computed.taxAmount).toBe(0);
      expect(computed.subtotalAfterTax).toBe(0);
      expect((computed as any).isPromotionalItem).toBe(true);
    });

    it('handles floating point inputs gracefully with rounding', () => {
      const item: ProductItem = { productName: 'D', quantity: 1, price: 100.12, discountPct: 10, vatPct: 8 };
      const computed = computeLineItem(item);
      expect(computed.discountAmount).toBe(10);
      expect(computed.subtotalBeforeTax).toBe(90);
      expect(computed.taxAmount).toBe(7);
      expect(computed.subtotalAfterTax).toBe(97);
    });
  });

  describe('aggregateProducts (SGM Long Phat Golden Master Scenario)', () => {
    it('accurately calculates the 3-machine Long Phat scenario from the user screenshot', () => {
      // 3 máy trong ảnh chụp thực tế:
      // KH0041-4: 1 Máy @ 1.010.000.000, VAT 8%
      // KH0041-5: 1 Máy @ 1.040.000.000, VAT 8%
      // KH0041-6: 1 Máy @ 1.110.000.000, VAT 8%
      const longPhatProducts: ProductItem[] = [
        {
          productId: 'KH0041-4',
          productName: 'Máy sóng ngói 2 tầng SGM VN K1200mm 7SRB-900-H34-R52 THỦY LỰC',
          quantity: 1,
          price: 1010000000,
          vatPct: 8,
          // Giả lập stale zeros cũ từ form
          subtotalBeforeTax: 0,
          taxAmount: 0,
          subtotalAfterTax: 0
        },
        {
          productId: 'KH0041-5',
          productName: 'Máy sóng ngói 2 tầng SGM VN K1200mm 7SRB-900-H34-R52 INVERTER',
          quantity: 1,
          price: 1040000000,
          vatPct: 8,
          subtotalBeforeTax: 0,
          taxAmount: 0,
          subtotalAfterTax: 0
        },
        {
          productId: 'KH0041-6',
          productName: 'Máy sóng ngói 2 tầng SGM VN K1200mm 7SRB-900-H34-R52 SERVO',
          quantity: 1,
          price: 1110000000,
          vatPct: 8,
          subtotalBeforeTax: 0,
          taxAmount: 0,
          subtotalAfterTax: 0
        }
      ];

      const agg = aggregateProducts(longPhatProducts);

      // Kiểm tra từng chỉ số tài chính:
      expect(agg.totalQuantity).toBe(3);
      expect(agg.totalGross).toBe(3160000000); // 1.010M + 1.040M + 1.110M
      expect(agg.totalDiscount).toBe(0);
      expect(agg.totalBeforeTax).toBe(3160000000);
      expect(agg.totalVat).toBe(252800000); // 80.8M + 83.2M + 88.8M = 252.800.000 ₫
      expect(agg.totalAfterTax).toBe(3412800000); // 3.160.000.000 + 252.800.000 = 3.412.800.000 ₫
      expect(agg.effectiveVatRate).toBe(8);

      // Kiểm tra bảng phân rã thuế (Tax Breakdown Tiers)
      expect(agg.taxTiers.length).toBe(1);
      expect(agg.taxTiers[0].vatPct).toBe(8);
      expect(agg.taxTiers[0].taxableAmount).toBe(3160000000);
      expect(agg.taxTiers[0].taxAmount).toBe(252800000);
    });

    it('supports multi-tier tax breakdown (hỗn hợp 8% và 10% và 0%)', () => {
      const mixedItems: ProductItem[] = [
        { productName: 'Máy cán tôn', quantity: 1, price: 1000000000, vatPct: 8 }, // VAT 8%: tax 80M
        { productName: 'Vật tư thay thế', quantity: 2, price: 50000000, vatPct: 10 }, // VAT 10%: gross 100M, tax 10M
        { productName: 'Đào tạo kỹ thuật', quantity: 1, price: 20000000, vatPct: 0 } // VAT 0%: gross 20M, tax 0
      ];

      const agg = aggregateProducts(mixedItems);
      expect(agg.totalGross).toBe(1120000000);
      expect(agg.totalBeforeTax).toBe(1120000000);
      expect(agg.totalVat).toBe(90000000); // 80M + 10M
      expect(agg.totalAfterTax).toBe(1210000000);
      expect(agg.taxTiers.length).toBe(3);

      expect(agg.taxTiers[0]).toEqual({ vatPct: 0, taxableAmount: 20000000, taxAmount: 0 });
      expect(agg.taxTiers[1]).toEqual({ vatPct: 8, taxableAmount: 1000000000, taxAmount: 80000000 });
      expect(agg.taxTiers[2]).toEqual({ vatPct: 10, taxableAmount: 100000000, taxAmount: 10000000 });
    });

    it('returns zeroes for empty product list', () => {
      const agg = aggregateProducts([]);
      expect(agg.totalQuantity).toBe(0);
      expect(agg.totalGross).toBe(0);
      expect(agg.totalDiscount).toBe(0);
      expect(agg.totalBeforeTax).toBe(0);
      expect(agg.totalVat).toBe(0);
      expect(agg.totalAfterTax).toBe(0);
      expect(agg.taxTiers).toEqual([]);
    });
  });

  describe('reverseSolveLineItemsFromTotal (Reverse Solver)', () => {
    it('proportionally reverse solves line item prices when all-in target total is provided', () => {
      const items: ProductItem[] = [
        { productName: 'Máy A', quantity: 1, price: 1000000000, vatPct: 10 }, // 1.1 tỷ sau thuế
        { productName: 'Máy B', quantity: 1, price: 1000000000, vatPct: 10 }  // 1.1 tỷ sau thuế -> tổng 2.2 tỷ
      ];

      // Khách hàng đàm phán chốt trọn gói đúng 2.000.000.000 ₫ đã bao gồm VAT
      const solved = reverseSolveLineItemsFromTotal(items, 2000000000);
      const agg = aggregateProducts(solved);

      // Tổng sau thuế phải bằng đúng hoặc xấp xỉ 2.000.000.000 ₫ (dung sai làm tròn <= 2 đồng)
      expect(Math.abs(agg.totalAfterTax - 2000000000)).toBeLessThanOrEqual(2);
    });
  });

  describe('calculateSubTotal & Legacy Backward Compatibility', () => {
    it('returns 0 for empty product list', () => {
      expect(calculateSubTotal([])).toBe(0);
      expect(calculateSubTotal(null as any)).toBe(0);
    });

    it('calculates correct subTotal', () => {
      const items: ProductItem[] = [
        { productName: 'Máy A', quantity: 2, price: 100000 },
        { productName: 'Máy B', quantity: 3, price: 50000 }
      ];
      expect(calculateSubTotal(items)).toBe(350000);
    });
  });

  describe('calculateVatAmount', () => {
    it('calculates correct VAT amount after discount', () => {
      expect(calculateVatAmount(1000000, 0, 10)).toBe(100000);
      expect(calculateVatAmount(1000000, 0, 8)).toBe(80000);
      expect(calculateVatAmount(1000000, 0, 0)).toBe(0);
      expect(calculateVatAmount(1000000, 200000, 10)).toBe(80000);
    });
  });

  describe('calculateDiscountAmount', () => {
    it('calculates correct discount amount based on percent rate', () => {
      expect(calculateDiscountAmount(1000000, 5)).toBe(50000);
      expect(calculateDiscountAmount(1000000, 0)).toBe(0);
    });
  });

  describe('calculateTotalAmount', () => {
    it('adds VAT and subtracts discount correctly', () => {
      expect(calculateTotalAmount(1000000, 100000, 50000)).toBe(1050000);
    });
  });

  describe('formatVietnameseCurrency', () => {
    it('formats correct currency text with VND symbol', () => {
      const formatted = formatVietnameseCurrency(100000);
      expect(formatted).toContain('100.000');
    });
  });
});

