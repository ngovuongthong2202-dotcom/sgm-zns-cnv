import { Quotation } from '@/src/domain/schema/quotation.schema';
import { normalizeBusinessName, normalizePersonName, normalizeCode } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

export function normalizeQuotationFormValues(data: Quotation): Quotation {
  const normalized: Partial<Quotation> = { ...data };

  if (normalized.soPhieuBaoGia) {
      normalized.soPhieuBaoGia = normalizeCode(normalized.soPhieuBaoGia);
  }
  if (normalized.nguoiDaiDien) {
    normalized.nguoiDaiDien = normalizePersonName(normalized.nguoiDaiDien);
  }
  if (normalized.tenKhachHang) {
    normalized.tenKhachHang = normalizeBusinessName(normalized.tenKhachHang);
  }
  if (normalized.sdt) {
    normalized.sdt = normalizePhoneVN(normalized.sdt) || normalized.sdt;
  }
  
  if (Array.isArray(normalized.products) && normalized.products.length > 0) {
    const healedProducts = normalized.products.map(computeLineItem);
    const aggs = aggregateProducts(healedProducts);
    normalized.products = healedProducts;
    normalized.subTotal = aggs.totalGross;
    normalized.discountAmount = aggs.totalDiscount;
    normalized.vatAmount = aggs.totalVat;
    normalized.totalAmount = aggs.totalAfterTax;
    if (aggs.totalBeforeTax > 0) {
      normalized.vatRate = Math.round((aggs.totalVat / aggs.totalBeforeTax) * 100);
    }
    if (aggs.totalGross > 0) {
      normalized.discountRate = Number(((aggs.totalDiscount / aggs.totalGross) * 100).toFixed(2));
    }
  }

  normalized.slMay = Number(normalized.slMay) || (normalized.products?.reduce((acc: number, p: any) => acc + (p.quantity || 0), 0) || 0);

  return normalized as Quotation;
}
