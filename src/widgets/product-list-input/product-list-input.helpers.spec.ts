import { describe, it, expect } from 'vitest';
import { distributeDiscountAmount, syncBaoHanhDates } from './product-list-input.helpers';
import { ProductItem } from '@/src/domain/schema/product.schema';

describe('product-list-input.helpers', () => {
  describe('distributeDiscountAmount', () => {
    it('should distribute discount proportionally to product prices', () => {
      const products: ProductItem[] = [
        { id: '1', productId: 'P1', productName: 'T1', quantity: 1, unit: 'Cái', price: 1000 },
        { id: '2', productId: 'P2', productName: 'T2', quantity: 2, unit: 'Cái', price: 2000 } // Total 4000
      ]; // Total gross: 5000
      
      const newProducts = distributeDiscountAmount(products, 500); // 10% discount
      
      expect(newProducts[0].discountAmount).toBe(100);
      expect(newProducts[1].discountAmount).toBe(400);
    });

    it('should handle zero total gross smoothly', () => {
      const products: ProductItem[] = [
        { id: '1', productId: 'P1', productName: 'T1', quantity: 1, unit: 'Cái', price: 0 },
      ];
      
      const newProducts = distributeDiscountAmount(products, 500);
      expect(newProducts).toBe(products);
    });
  });

  describe('syncBaoHanhDates', () => {
    it('should calculate warranty date correctly', () => {
      const products: ProductItem[] = [
        { id: '1', productId: 'P1', productName: 'T1', quantity: 1, unit: 'Cái', price: 0, soNgayBaoHanh: 365 },
      ];
      
      const { needsUpdate, updatedProducts } = syncBaoHanhDates(products, true, '2026-01-01');
      expect(needsUpdate).toBe(true);
      expect(updatedProducts[0].ngayHetHanBaoHanh).toBe('2027-01-01');
    });

    it('should remove warranty date if no base date', () => {
      const products: ProductItem[] = [
        { id: '1', productId: 'P1', productName: 'T1', quantity: 1, unit: 'Cái', price: 0, ngayHetHanBaoHanh: '2027-01-01' },
      ];
      
      const { needsUpdate, updatedProducts } = syncBaoHanhDates(products, true, undefined);
      expect(needsUpdate).toBe(true);
      expect(updatedProducts[0].ngayHetHanBaoHanh).toBeUndefined();
    });
  });
});
