import { ProductItem } from '@/src/domain/schema/product.schema';
import { sanitizeText, sanitizeCode } from '@/src/shared/utils/inputSanitizer';

export interface TaxBreakdownTier {
  vatPct: number;
  taxableAmount: number; // Tiền hàng trước thuế thuộc nhóm thuế này
  taxAmount: number;     // Tiền thuế phát sinh
}

export interface FinancialSummary {
  totalQuantity: number;
  totalGross: number;        // Tổng tiền hàng trước chiết khấu
  totalDiscount: number;     // Tổng chiết khấu đã phân bổ
  totalBeforeTax: number;    // Tổng giá trị tính thuế (Tax Base)
  taxTiers: TaxBreakdownTier[]; // Bảng kê thuế đa bậc (0%, 8%, 10%...)
  totalVat: number;          // Tổng tiền thuế VAT
  totalAfterTax: number;     // Tổng giá trị thanh toán cuối cùng
  effectiveVatRate: number;  // Thuế suất bình quân gia quyền (%)
}

/**
 * Enterprise Isomorphic Financial Kernel: computeLineItem
 * Tuân thủ quy chuẩn kế toán Việt Nam (VAS / Thông tư 200 & Nghị định 123).
 * Tính toán đơn hướng xác định từ 5 trường gốc:
 * (price, quantity, discountPct, discountAmount, vatPct) -> 100% trường phái sinh.
 * Triệt tiêu hoàn toàn stale zero lock và bảo toàn trọn vẹn hàng tặng kèm 0 đồng.
 */
export function computeLineItem(item: ProductItem): ProductItem {
  const productName = item.productName !== undefined ? sanitizeText(item.productName) : undefined;
  const productId = item.productId !== undefined ? sanitizeCode(item.productId) : undefined;
  const partNumber = item.partNumber !== undefined ? sanitizeCode(item.partNumber) : undefined;
  const unit = item.unit !== undefined ? sanitizeText(item.unit) : undefined;
  const ghiChu = item.ghiChu !== undefined ? sanitizeText(item.ghiChu) : undefined;

  const price = Math.max(0, Math.round(Number(item.price) || 0));
  const quantity = Math.max(0, Number(item.quantity) || 0);
  const gross = Math.round(price * quantity);
  
  // 1. Phân giải chiết khấu (Explicit Intent Authority)
  let discountAmount = 0;
  let discountPct = item.discountPct !== undefined && item.discountPct !== null ? Number(item.discountPct) : undefined;
  let discountType = item.discountType;

  if (discountType === 'AMOUNT' && item.discountAmount !== undefined && item.discountAmount !== null) {
    discountAmount = Math.min(gross, Math.max(0, Math.round(Number(item.discountAmount))));
    if (gross > 0 && discountAmount > 0) {
      discountPct = parseFloat(((discountAmount / gross) * 100).toFixed(2));
    }
  } else if (discountType === 'PERCENT' && discountPct !== undefined && discountPct > 0) {
    discountAmount = Math.round(gross * (Math.min(100, discountPct) / 100));
  } else if (item.discountAmount !== undefined && item.discountAmount !== null && item.discountAmount > 0 && (discountPct === undefined || discountPct === 0)) {
    discountType = 'AMOUNT';
    discountAmount = Math.min(gross, Math.max(0, Math.round(Number(item.discountAmount))));
    if (gross > 0 && discountAmount > 0) {
      discountPct = parseFloat(((discountAmount / gross) * 100).toFixed(2));
    }
  } else if (discountPct !== undefined && discountPct > 0) {
    discountType = 'PERCENT';
    discountAmount = Math.round(gross * (Math.min(100, discountPct) / 100));
  } else if (item.discountAmount !== undefined && item.discountAmount !== null) {
    discountType = 'AMOUNT';
    discountAmount = Math.min(gross, Math.max(0, Math.round(Number(item.discountAmount))));
    if (gross > 0 && discountAmount > 0) {
      discountPct = parseFloat(((discountAmount / gross) * 100).toFixed(2));
    }
  }
  
  // 2. Trị giá trước thuế (Taxable base)
  const subtotalAfterDiscount = Math.max(0, gross - discountAmount);
  const unitPriceAfterDiscount = quantity > 0 ? Math.round(subtotalAfterDiscount / quantity) : price;
  const subtotalBeforeTax = subtotalAfterDiscount;

  // 3. Tiền thuế VAT
  const vatPct = item.vatPct !== undefined && item.vatPct !== null ? Math.max(0, Number(item.vatPct)) : 0;
  const taxAmount = Math.round(subtotalBeforeTax * (vatPct / 100));

  // 4. Thành tiền sau thuế (Tổng thu)
  const subtotalAfterTax = subtotalBeforeTax + taxAmount;

  // 5. Nhận diện hàng khuyến mãi/tặng kèm hợp lệ (0 đồng)
  const isPromotional = price === 0 && Boolean((productName || item.productName) || (productId || item.productId));

  return {
    ...item,
    ...(productName !== undefined ? { productName } : {}),
    ...(productId !== undefined ? { productId } : {}),
    ...(partNumber !== undefined ? { partNumber } : {}),
    ...(unit !== undefined ? { unit } : {}),
    ...(ghiChu !== undefined ? { ghiChu } : {}),
    price,
    quantity,
    discountType: discountType || (discountAmount > 0 ? 'AMOUNT' : discountPct ? 'PERCENT' : undefined),
    discountPct,
    discountAmount,
    subtotalAfterDiscount,
    unitPriceAfterDiscount,
    subtotalBeforeTax,
    vatPct: item.vatPct, // Bảo lưu giá trị gốc (kể cả undefined) để UI phân biệt
    taxAmount,
    subtotalAfterTax,
    total: subtotalAfterTax,
    ...(isPromotional ? { isPromotionalItem: true } : {})
  };
}

/**
 * Enterprise Aggregate Engine: aggregateProducts
 * Hỗ trợ bảng kê thuế đa bậc (Multi-Tier VAT Matrix) và tỷ lệ thuế suất bình quân gia quyền.
 */
export function aggregateProducts(products: ProductItem[]): FinancialSummary {
  const tierMap = new Map<number, { taxableAmount: number; taxAmount: number }>();

  const result: FinancialSummary = {
    totalQuantity: 0,
    totalGross: 0,
    totalDiscount: 0,
    totalBeforeTax: 0,
    taxTiers: [],
    totalVat: 0,
    totalAfterTax: 0,
    effectiveVatRate: 0
  };

  if (!products || !Array.isArray(products)) return result;

  for (const p of products) {
    const computed = computeLineItem(p);
    const qty = computed.quantity || 0;
    const price = computed.price || 0;
    const gross = Math.round(price * qty);

    result.totalQuantity += qty;
    result.totalGross += gross;
    result.totalDiscount += computed.discountAmount || 0;
    result.totalBeforeTax += computed.subtotalBeforeTax || 0;
    result.totalVat += computed.taxAmount || 0;
    result.totalAfterTax += computed.subtotalAfterTax || 0;

    // Phân rã theo từng nhóm thuế suất
    const tierRate = computed.vatPct !== undefined && computed.vatPct !== null ? Number(computed.vatPct) : 0;
    const existingTier = tierMap.get(tierRate) || { taxableAmount: 0, taxAmount: 0 };
    existingTier.taxableAmount += computed.subtotalBeforeTax || 0;
    existingTier.taxAmount += computed.taxAmount || 0;
    tierMap.set(tierRate, existingTier);
  }

  // Chuyển tierMap sang danh sách đã sắp xếp theo thuế suất
  result.taxTiers = Array.from(tierMap.entries())
    .map(([vatPct, data]) => ({
      vatPct,
      taxableAmount: data.taxableAmount,
      taxAmount: data.taxAmount
    }))
    .sort((a, b) => a.vatPct - b.vatPct);

  // Thuế suất bình quân gia quyền (%)
  result.effectiveVatRate = result.totalBeforeTax > 0 
    ? parseFloat(((result.totalVat / result.totalBeforeTax) * 100).toFixed(2)) 
    : 0;

  return result;
}

/**
 * Reverse Financial Solver: reverseSolveLineItemsFromTotal
 * Hỗ trợ chốt giá trọn gói sau thuế (ví dụ: đàm phán 3.400.000.000 ₫ bao gồm VAT).
 * Tự động phân bổ ngược lại đơn giá trước thuế của từng mặt hàng.
 */
export function reverseSolveLineItemsFromTotal(products: ProductItem[], targetTotal: number): ProductItem[] {
  if (!products || products.length === 0 || targetTotal <= 0) return products;

  const currentSummary = aggregateProducts(products);
  if (currentSummary.totalAfterTax <= 0) {
    // Nếu hiện tại tổng bằng 0, chia đều theo số lượng
    const totalQty = products.reduce((acc, p) => acc + (Number(p.quantity) || 1), 0);
    return products.map(p => {
      const q = Number(p.quantity) || 1;
      const vat = Number(p.vatPct) || 0;
      const lineAfterTax = Math.round(targetTotal * (q / totalQty));
      const lineBeforeTax = Math.round(lineAfterTax / (1 + vat / 100));
      const unitPrice = q > 0 ? Math.round(lineBeforeTax / q) : lineBeforeTax;
      return computeLineItem({ ...p, price: unitPrice });
    });
  }

  // Phân bổ tỷ trọng theo giá trị sau thuế hiện tại
  const solved = products.map(p => {
    const computed = computeLineItem(p);
    const weight = (computed.subtotalAfterTax || 0) / currentSummary.totalAfterTax;
    const targetLineAfterTax = Math.round(targetTotal * weight);
    const vat = Number(computed.vatPct) || 0;
    const targetLineBeforeTax = Math.round(targetLineAfterTax / (1 + vat / 100));
    const qty = Number(p.quantity) || 1;
    const targetGross = targetLineBeforeTax + (computed.discountAmount || 0);
    const unitPrice = qty > 0 ? Math.round(targetGross / qty) : targetGross;
    return computeLineItem({ ...p, price: unitPrice });
  });

  return solved;
}

// Hàm tương thích ngược (Deprecated functions preserved for smooth cross-module integration)
export function calculateSubTotal(products: ProductItem[]): number {
  return aggregateProducts(products).totalGross;
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

