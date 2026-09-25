import { Quotation } from '@/src/domain/schema/quotation.schema';
import { normalizeBusinessName, normalizePersonName, normalizeCode } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';

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
  
  normalized.slMay = Number(normalized.slMay) || 0;

  return normalized as Quotation;
}
