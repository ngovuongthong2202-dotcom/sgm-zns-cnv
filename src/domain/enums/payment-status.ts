/**
 * SGM Enterprise Payment Canonical Status & Domain Normalizer
 * Quy chuẩn hóa toàn bộ các biến thể chuỗi trạng thái thanh toán về 4 nhóm chuẩn tắc
 */

export enum PaymentCanonicalStatus {
  PAID_FULL = 'PAID_FULL',       // Tất toán, Đã thanh toán 100%, Miễn phí
  PAID_PARTIAL = 'PAID_PARTIAL', // Công nợ, Thu 1 phần, Đã TT một phần
  UNPAID = 'UNPAID',             // Chưa TT, CHƯA THANH TOÁN, Chờ thu
  CANCELLED = 'CANCELLED'        // Hủy, HỦY, Đã hủy
}

/**
 * Chuẩn hóa chuỗi trạng thái tự do về Canonical Status
 */
export function normalizePaymentStatus(status: unknown): PaymentCanonicalStatus {
  if (!status || typeof status !== 'string') {
    return PaymentCanonicalStatus.UNPAID;
  }

  const s = status.trim().toUpperCase();

  // 1. Kiểm tra trạng thái Hủy
  if (s.includes('HỦY') || s.includes('HUY') || s.includes('CANCEL')) {
    return PaymentCanonicalStatus.CANCELLED;
  }

  // 2. Kiểm tra trạng thái Đã thanh toán 1 phần / Công nợ
  // Chú ý: Cần kiểm tra trước nhóm Đã thanh toán nếu chuỗi có chứa chữ "MỘT PHẦN"
  if (
    s.includes('MỘT PHẦN') ||
    s.includes('MOT PHAN') ||
    s.includes('1 PHẦN') ||
    s.includes('1 PHAN') ||
    s.includes('CÔNG NỢ') ||
    s.includes('CONG NO')
  ) {
    return PaymentCanonicalStatus.PAID_PARTIAL;
  }

  // 3. Kiểm tra trạng thái Tất toán / Hoàn thành 100%
  if (
    s.includes('TẤT TOÁN') ||
    s.includes('TAT TOAN') ||
    s.includes('ĐÃ THANH TOÁN') ||
    s.includes('DA THANH TOAN') ||
    s.includes('ĐÃ TT') ||
    s.includes('DA TT') ||
    s.includes('MIỄN PHÍ') ||
    s.includes('MIEN PHI')
  ) {
    return PaymentCanonicalStatus.PAID_FULL;
  }

  // 4. Mặc định là Chưa thanh toán
  return PaymentCanonicalStatus.UNPAID;
}

export const isPaymentFullyPaid = (status: unknown): boolean =>
  normalizePaymentStatus(status) === PaymentCanonicalStatus.PAID_FULL;

export const isPaymentPartial = (status: unknown): boolean =>
  normalizePaymentStatus(status) === PaymentCanonicalStatus.PAID_PARTIAL;

export const isPaymentUnpaid = (status: unknown): boolean =>
  normalizePaymentStatus(status) === PaymentCanonicalStatus.UNPAID;

export const isPaymentCancelled = (status: unknown): boolean =>
  normalizePaymentStatus(status) === PaymentCanonicalStatus.CANCELLED;

/**
 * Kiểm tra xem phiếu có phát sinh thực thu dòng tiền hay không
 * (tức không phải Chưa thanh toán và không phải Hủy)
 */
export const hasActualCashCollected = (status: unknown): boolean => {
  const norm = normalizePaymentStatus(status);
  return norm === PaymentCanonicalStatus.PAID_FULL || norm === PaymentCanonicalStatus.PAID_PARTIAL;
};
