import { ProductItem } from '@/src/domain/schema/product.schema';

export function computeLineItem(item: ProductItem): ProductItem {
  const price = Number(item.price) || 0;
  const quantity = Number(item.quantity) || 0;
  const gross = Math.round(price * quantity);
  
  let discountAmount = item.discountAmount !== undefined && item.discountAmount !== null
    ? Number(item.discountAmount)
    : 0;
  if ((item.discountPct !== undefined && item.discountPct !== null) && item.discountPct > 0) {
    discountAmount = Math.round(gross * (Number(item.discountPct) / 100));
  }
  
  const subtotalAfterDiscount = item.subtotalAfterDiscount !== undefined && item.subtotalAfterDiscount !== null
    ? Number(item.subtotalAfterDiscount)
    : Math.max(0, gross - discountAmount);

  const unitPriceAfterDiscount = item.unitPriceAfterDiscount !== undefined && item.unitPriceAfterDiscount !== null
    ? Number(item.unitPriceAfterDiscount)
    : (quantity > 0 ? Math.round(subtotalAfterDiscount / quantity) : price);

  const subtotalBeforeTax = item.subtotalBeforeTax !== undefined && item.subtotalBeforeTax !== null
    ? Number(item.subtotalBeforeTax)
    : subtotalAfterDiscount;

  const vatPct = Number(item.vatPct) || 0;
  const taxAmount = item.taxAmount !== undefined && item.taxAmount !== null
    ? Number(item.taxAmount)
    : Math.round(subtotalBeforeTax * (vatPct / 100));

  const subtotalAfterTax = item.subtotalAfterTax !== undefined && item.subtotalAfterTax !== null
    ? Number(item.subtotalAfterTax)
    : (subtotalBeforeTax + taxAmount);

  return {
    ...item,
    price,
    quantity,
    discountPct: item.discountPct,
    discountAmount,
    subtotalAfterDiscount,
    unitPriceAfterDiscount,
    subtotalBeforeTax,
    vatPct: item.vatPct,
    taxAmount,
    subtotalAfterTax,
    total: subtotalAfterTax
  };
}

export function aggregateProducts(products: ProductItem[]) {
  const result = {
    totalQuantity: 0,
    totalGross: 0,
    totalDiscount: 0,
    totalBeforeTax: 0,
    totalVat: 0,
    totalAfterTax: 0
  };

  if (!products || !Array.isArray(products)) return result;

  for (const p of products) {
    const computed = computeLineItem(p);
    result.totalQuantity += computed.quantity || 0;
    const gross = Math.round((computed.price || 0) * (computed.quantity || 0));
    result.totalGross += gross;
    result.totalDiscount += computed.discountAmount || 0;
    result.totalBeforeTax += computed.subtotalBeforeTax || 0;
    result.totalVat += computed.taxAmount || 0;
    result.totalAfterTax += computed.subtotalAfterTax || 0;
  }

  return result;
}

// Deprecated functions kept temporarily for smooth migration before D4
export function calculateSubTotal(products: ProductItem[]): number {
  if (!products || !Array.isArray(products)) return 0;
  return products.reduce((acc: number, p: ProductItem) => {
    const price = Number(p.price) || 0;
    const quantity = Number(p.quantity) || 0;
    const lineTotal = Math.round(price * quantity);
    return acc + lineTotal;
  }, 0);
}

export function calculateVatAmount(subTotal: number, discountAmount: number, vatRate: number): number {
  const normSubTotal = Math.max(0, Math.round(subTotal || 0));
  const normDiscount = Math.max(0, Math.round(discountAmount || 0));
  const taxableAmount = Math.max(0, normSubTotal - normDiscount);
  const normVatRate = Math.max(0, Number(vatRate) || 0);
  return Math.round(taxableAmount * (normVatRate / 100));
}

export function calculateDiscountAmount(subTotal: number, discountRate: number): number {
  const normSubTotal = Math.max(0, Math.round(subTotal || 0));
  const normDiscountRate = Math.min(100, Math.max(0, Number(discountRate) || 0));
  return Math.round(normSubTotal * (normDiscountRate / 100));
}

export function calculateTotalAmount(subTotal: number, vatAmount: number, discountAmount: number): number {
  const s = Math.max(0, Math.round(subTotal || 0));
  const v = Math.max(0, Math.round(vatAmount || 0));
  const d = Math.max(0, Math.round(discountAmount || 0));
  return Math.max(0, Math.round(s + v - d));
}

export function formatVietnameseCurrency(val: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}
