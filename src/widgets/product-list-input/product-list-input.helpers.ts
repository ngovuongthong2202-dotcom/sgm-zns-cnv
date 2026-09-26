import { ProductItem } from '@/src/domain/schema/product.schema';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { FinancialEngine } from '@/src/shared/utils/financialEngine';

export function distributeDiscountAmount(products: ProductItem[], amt: number): ProductItem[] {
  const distributed = FinancialEngine.distributeDiscountAmount(products, amt);
  if (distributed === products) return products;
  return distributed.map(p => computeLineItem({ ...p, discountPct: undefined, discountAmount: p.discountAmount }));
}

export function syncBaoHanhDates(products: ProductItem[], showBaoHanh: boolean | undefined, baseDateForBaoHanh: string | undefined): { needsUpdate: boolean; updatedProducts: ProductItem[] } {
  if (!showBaoHanh) return { needsUpdate: false, updatedProducts: products };
  
  let needsUpdate = false;
  const effectiveBaseDate = baseDateForBaoHanh || new Date().toISOString().split('T')[0];
  const updatedProducts = products.map(p => {
    if (p.soNgayBaoHanh && p.soNgayBaoHanh > 0) {
      const baseDate = new Date(effectiveBaseDate);
      if (!isNaN(baseDate.getTime())) {
        const estimatedDate = new Date(baseDate.getTime() + p.soNgayBaoHanh * 24 * 60 * 60 * 1000);
        const newDateStr = estimatedDate.toISOString().split('T')[0];
        if (p.ngayHetHanBaoHanh !== newDateStr) {
          needsUpdate = true;
          return { ...p, ngayHetHanBaoHanh: newDateStr };
        }
      }
    } else if (p.ngayHetHanBaoHanh && !p.soNgayBaoHanh) {
      needsUpdate = true;
      const newP = { ...p };
      delete newP.ngayHetHanBaoHanh;
      return newP;
    }
    return p;
  });

  return { needsUpdate, updatedProducts };
}
