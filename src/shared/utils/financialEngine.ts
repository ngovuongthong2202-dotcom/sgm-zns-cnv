export interface LineItemFinancialInput {
  id: string;
  price?: number;
  quantity?: number;
  discountPct?: number;
  discountAmount?: number;
  vatPct?: number;
  vatAmount?: number;
  subtotalBeforeTax?: number;
  totalAmount?: number;
}

/**
 * Enterprise Financial Precision Engine
 * Solves currency parsing, IEEE-754 floating-point inaccuracies, and penny allocation discrepancies.
 */
export const FinancialEngine = {
  /**
   * Safely parses an unknown value into an integer (VND amount).
   * Strips all formatting dots, commas, spaces, currency symbols.
   */
  toInteger(val: unknown, fallback = 0): number {
    if (typeof val === 'number') {
      return isNaN(val) ? fallback : Math.round(val);
    }
    if (typeof val !== 'string') return fallback;
    const clean = val.replace(/[^\d-]/g, '');
    const parsed = parseInt(clean, 10);
    return isNaN(parsed) ? fallback : Math.max(0, parsed);
  },

  /**
   * Safely parses an unknown value into a float (percentages: VAT, Discount).
   * Replaces comma with dot and clamps within [0, max].
   */
  toFloat(val: unknown, fallback = 0, max = 100): number {
    if (typeof val === 'number') {
      return isNaN(val) ? fallback : Math.min(max, Math.max(0, val));
    }
    if (typeof val !== 'string') return fallback;
    const clean = val.replace(',', '.').replace(/[^\d.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? fallback : Math.min(max, Math.max(0, parsed));
  },

  /**
   * Standard Vietnamese currency formatter (e.g. 15.000.000).
   */
  formatVND(amount: number | undefined | null): string {
    return new Intl.NumberFormat('vi-VN').format(amount || 0);
  },

  /**
   * Penny-Exact Discount Allocation (Hare-Niemeyer / Largest Remainder Method).
   * Guarantees that the sum of line item discounts EXACTLY matches totalDiscountToDistribute (0 VND discrepancy).
   */
  distributeDiscountAmount<T extends { price?: number; quantity?: number; discountAmount?: number; discountPct?: number }>(
    items: T[],
    totalDiscountToDistribute: number
  ): T[] {
    if (!items.length || totalDiscountToDistribute <= 0) return items;

    const subtotals = items.map(it => (it.price || 0) * (it.quantity || 1));
    const grandSubtotal = subtotals.reduce((sum, s) => sum + s, 0);
    if (grandSubtotal <= 0) return items;

    // Step 1: Compute floor allocations
    const rawAllocations = subtotals.map(st => (st * totalDiscountToDistribute) / grandSubtotal);
    const floorAllocations = rawAllocations.map(raw => Math.floor(raw));
    const distributedSum = floorAllocations.reduce((sum, f) => sum + f, 0);
    let remainder = totalDiscountToDistribute - distributedSum;

    // Step 2: Sort indices by decimal part descending
    const indexedRemainders = rawAllocations
      .map((raw, idx) => ({
        idx,
        decimalPart: raw - floorAllocations[idx]
      }))
      .sort((a, b) => b.decimalPart - a.decimalPart);

    // Step 3: Distribute 1 VND to largest remainders until remainder is 0
    const finalAllocations = [...floorAllocations];
    let r = 0;
    while (remainder > 0 && r < indexedRemainders.length) {
      finalAllocations[indexedRemainders[r].idx] += 1;
      remainder -= 1;
      r = (r + 1) % indexedRemainders.length;
    }

    // Step 4: Map back to items with exact discountAmount and recalculate discountPct
    return items.map((it, idx) => {
      const itemDiscount = finalAllocations[idx];
      const lineSubtotal = subtotals[idx];
      const discountPct = lineSubtotal > 0 ? Number(((itemDiscount / lineSubtotal) * 100).toFixed(2)) : 0;
      return {
        ...it,
        discountAmount: itemDiscount,
        discountPct
      };
    });
  }
};
