/**
 * Universal Input Sanitization Engine
 * Chuẩn hóa và làm sạch dữ liệu đầu vào cho toàn bộ hệ thống SGM-ZNS OS.
 * Loại bỏ triệt để các ký tự không in được, zero-width space, non-breaking space,
 * và chuẩn hóa định dạng MST, Số điện thoại, Tên riêng, Mã chứng từ.
 */

/**
 * Xóa bỏ ký tự vô hình (Zero-width spaces, BOM, control characters)
 */
export function removeInvisibleChars(val: string): string {
  if (!val) return '';
  return val
    // Zero-width space, zero-width non-joiner, zero-width joiner, BOM, byte order mark
    .replace(/[\u200B-\u200D\uFEFF\u200E\u200F]/g, '')
    // Non-breaking space
    .replace(/\u00A0/g, ' ')
    // Control characters (excluding \n, \r, \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
}

/**
 * Chuẩn hóa Mã Số Thuế (MST)
 * Loại bỏ toàn bộ khoảng trắng bên trong do copy-paste từ PDF/Web hóa đơn.
 * Ví dụ: "4 2 0 1 1 0 3 0 5 9" -> "4201103059"
 *        "0312 345 678 - 001"   -> "0312345678-001"
 */
export function sanitizeTaxCode(val: string | null | undefined): string {
  if (!val) return '';
  const cleaned = removeInvisibleChars(String(val));
  // Xóa mọi khoảng trắng (\s), chỉ giữ số, chữ cái và dấu gạch ngang chi nhánh (-)
  return cleaned
    .replace(/\s+/g, '')
    .toUpperCase()
    .trim();
}

/**
 * Chuẩn hóa chuỗi văn bản thông thường (Tên khách hàng, Địa chỉ, Ghi chú)
 * Xóa ký tự lạ, gom nhiều khoảng trắng liên tiếp thành 1 khoảng trắng, trim đầu cuối.
 */
export function sanitizeText(val: string | null | undefined): string {
  if (!val) return '';
  const cleaned = removeInvisibleChars(String(val));
  return cleaned
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Chuẩn hóa Mã chứng từ / Mã tra cứu (Mã KH, Mã SP, Mã HĐ, Mã BG...)
 * In hoa, loại bỏ khoảng trắng rác đầu cuối.
 */
export function sanitizeCode(val: string | null | undefined): string {
  if (!val) return '';
  return sanitizeTaxCode(val);
}

/**
 * Chuẩn hóa Số điện thoại Việt Nam
 * Xóa dấu chấm, khoảng trắng, dấu gạch ngang, giữ chuẩn 10 chữ số.
 */
export function sanitizePhoneVN(val: string | null | undefined): string {
  if (!val) return '';
  const cleaned = removeInvisibleChars(String(val)).replace(/[\s.\-()]/g, '');
  if (cleaned.startsWith('+84')) {
    return '0' + cleaned.slice(3);
  }
  if (cleaned.startsWith('84') && cleaned.length >= 11) {
    return '0' + cleaned.slice(2);
  }
  return cleaned;
}
