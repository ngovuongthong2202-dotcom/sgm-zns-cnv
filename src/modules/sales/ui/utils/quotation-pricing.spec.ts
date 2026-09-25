import { describe, it, expect } from 'vitest';
import {
  calculateSubTotal,
  calculateVatAmount,
  calculateDiscountAmount,
  calculateTotalAmount,
  formatVietnameseCurrency,
  computeLineItem,
  aggregateProducts
} from '@/src/domain/pricing/quotation-pricing';
import { ProductItem } from '@/src/domain/schema/product.schema';

describe('quotation-pricing calculations', () => {
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
      // gross = 1M
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

    it('handles floating point inputs gracefully with rounding', () => {
      const item: ProductItem = { productName: 'D', quantity: 1, price: 100.12, discountPct: 10, vatPct: 8 };
      const computed = computeLineItem(item);
      // gross = Math.round(100.12 * 1) = 100
      // diff: discountAmount = round(100 * 0.1) = 10
      // subtotalBefore = 90
      // tax = round(90 * 0.08) = 7
      // subtotalAfter = 97
      expect(computed.discountAmount).toBe(10);
      expect(computed.subtotalBeforeTax).toBe(90);
      expect(computed.taxAmount).toBe(7);
      expect(computed.subtotalAfterTax).toBe(97);
    });
  });

  describe('aggregateProducts', () => {
    it('returns zeroes for empty product list', () => {
      const agg = aggregateProducts([]);
      expect(agg.totalQuantity).toBe(0);
      expect(agg.totalGross).toBe(0);
      expect(agg.totalDiscount).toBe(0);
      expect(agg.totalBeforeTax).toBe(0);
      expect(agg.totalVat).toBe(0);
      expect(agg.totalAfterTax).toBe(0);
    });

    it('aggregates multiple line items correctly', () => {
      const items: ProductItem[] = [
        { productName: 'A', quantity: 2, price: 100000, discountPct: 10, vatPct: 8 }, // gross 200k, disc 20k, befortax 180k, tax 14.4k->14400, aftertax 194400
        { productName: 'B', quantity: 1, price: 300000, vatPct: 10 } // gross 300k, befortax 300k, tax 30k, aftertax 330k
      ];
      const agg = aggregateProducts(items);
      expect(agg.totalQuantity).toBe(3);
      expect(agg.totalGross).toBe(500000);
      expect(agg.totalDiscount).toBe(20000);
      expect(agg.totalBeforeTax).toBe(480000);
      expect(agg.totalVat).toBe(44400); // 14400 + 30000
      expect(agg.totalAfterTax).toBe(524400); // 194400 + 330000
    });

    it('aggregates correctly when items lack fields', () => {
      const items: any[] = [
        { productName: 'A' }, // empty row basically
        { productName: 'B', quantity: 2, price: 100 },
      ];
      const agg = aggregateProducts(items);
      expect(agg.totalQuantity).toBe(2);
      expect(agg.totalGross).toBe(200);
      expect(agg.totalDiscount).toBe(0);
      expect(agg.totalBeforeTax).toBe(200);
      expect(agg.totalVat).toBe(0);
      expect(agg.totalAfterTax).toBe(200);
    });
  });

  // Keep old tests underneath
  describe('calculateSubTotal', () => {
    it('returns 0 for empty product list', () => {
      expect(calculateSubTotal([])).toBe(0);
      expect(calculateSubTotal(null as any)).toBe(0);
    });

    it('calculates correct subTotal and handles typical inputs', () => {
      const items: ProductItem[] = [
        { productName: 'Máy A', quantity: 2, price: 100000 },
        { productName: 'Máy B', quantity: 3, price: 50000 }
      ];
      expect(calculateSubTotal(items)).toBe(350000);
    });

    it('avoids floating point inaccuracies', () => {
      const items: ProductItem[] = [
        { productName: 'Máy C', quantity: 3, price: 100.12 }, 
        { productName: 'Máy D', quantity: 1, price: 200.24 }  
      ];
      expect(calculateSubTotal(items)).toBe(500);
    });

    it('safely parses legacy string prices/quantities', () => {
      const items: any[] = [
        { productName: 'Legacy Item', quantity: '2', price: '150000' }
      ];
      expect(calculateSubTotal(items)).toBe(300000);
    });
  });

  describe('calculateVatAmount', () => {
    it('calculates correct VAT amount after discount', () => {
      expect(calculateVatAmount(1000000, 0, 10)).toBe(100000);
      expect(calculateVatAmount(1000000, 0, 8)).toBe(80000);
      expect(calculateVatAmount(1000000, 0, 0)).toBe(0);
      expect(calculateVatAmount(1000000, 200000, 10)).toBe(80000);
    });

    it('handles floating point rates or negative inputs gracefully', () => {
      expect(calculateVatAmount(1000000, 0, -10)).toBe(0);
      expect(calculateVatAmount(-1000, 0, 10)).toBe(0);
      expect(calculateVatAmount(1000000, 1500000, 10)).toBe(0);
    });
  });

  describe('calculateDiscountAmount', () => {
    it('calculates correct discount amount based on percent rate', () => {
      expect(calculateDiscountAmount(1000000, 5)).toBe(50000);
      expect(calculateDiscountAmount(1000000, 0)).toBe(0);
    });

    it('clamps discount rates to maximum 100%', () => {
      expect(calculateDiscountAmount(1000000, 150)).toBe(1000000);
      expect(calculateDiscountAmount(1000000, -5)).toBe(0);
    });
  });

  describe('calculateTotalAmount', () => {
    it('adds VAT and subtracts discount correctly', () => {
      expect(calculateTotalAmount(1000000, 100000, 50000)).toBe(1050000);
    });

    it('never returns negative value even with extreme discount', () => {
      expect(calculateTotalAmount(1000000, 100000, 1500000)).toBe(0);
    });
  });

  describe('formatVietnameseCurrency', () => {
    it('formats correct currency text with VND symbol', () => {
      const formatted = formatVietnameseCurrency(100000);
      expect(formatted).toContain('100.000');
    });
  });
});
