import { squeezeSpaces, normalizeCode, normalizeBusinessName } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { sanitizeCode, sanitizeText, sanitizePhoneVN } from '@/src/shared/utils/inputSanitizer';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';

import { isSourceDocumentFullyDelivered } from '@/src/domain/services/delivery-reconciler';

export function normalizeDeliveryFormValues(data: any) {
  data.ghiChu = sanitizeText(data.ghiChu);
  data.deliveryId = sanitizeCode(data.deliveryId);
  data.soPhieuXuat = sanitizeCode(data.soPhieuXuat);
  data.donViVanChuyen = sanitizeText(data.donViVanChuyen);
  if (data.diaChiGiaoHang) {
    data.diaChiGiaoHang = sanitizeText(data.diaChiGiaoHang);
  }
  if (data.tenKhachHang) {
    data.tenKhachHang = sanitizeText(data.tenKhachHang);
  }
  if (data.sdt) {
    data.sdt = sanitizePhoneVN(data.sdt) || data.sdt;
  }
  if (Array.isArray(data.danhSachMaMay)) {
    data.danhSachMaMay = data.danhSachMaMay.map(sanitizeCode).filter(Boolean);
  }
  if (Array.isArray(data.products)) {
    data.products = data.products.map((p: any) => ({
      ...p,
      productName: sanitizeText(p.productName),
      productId: sanitizeCode(p.productId),
      unit: sanitizeText(p.unit),
      ghiChu: sanitizeText(p.ghiChu),
      soNgayBaoHanh: p.soNgayBaoHanh !== undefined && p.soNgayBaoHanh !== null ? Math.max(0, Number(p.soNgayBaoHanh)) : 0,
      danhSachMaMay: Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay.map(sanitizeCode).filter(Boolean) : undefined,
    }));
  }
  return data;
}

export function validateDeliveryBusinessRules(data: any, payments: any[], maxQuantities: Record<string, number>, _delivery: any): { valid: boolean; error?: string } {
  if (data.paymentId) {
    const selectedPayment = payments.find((p: any) => p.id === data.paymentId);
    if (selectedPayment && selectedPayment.tinhTrangThanhToan === 'Chưa TT') {
      return { valid: false, error: 'Không được tạo phiếu giao hàng đối với Giao dịch Chưa thanh toán' };
    }
  }

  // Chặn nếu không có sản phẩm nào hợp lệ và không có số lượng máy
  const hasProducts = Array.isArray(data.products) && data.products.length > 0;
  const hasValidProductQty = hasProducts && data.products.some((p: any) => (p.quantity || 0) > 0);
  const hasSlMay = Number(data.slMay || 0) > 0;

  if (!hasValidProductQty && !hasSlMay) {
    return { valid: false, error: 'Chứng từ này đã giao đủ 100% số lượng hàng hóa (số lượng còn phải giao = 0)' };
  }

  if (data.products) {
    for (const [index, p] of data.products.entries()) {
      const itemKey = getProductItemKey(p, index);
      const maxLimit = maxQuantities[itemKey];
      if (maxLimit !== undefined && p.quantity > maxLimit) {
        return { valid: false, error: `Sản phẩm ${p.productName} vượt quá số lượng còn lại cho phép (${maxLimit})` };
      }
      if (p.soNgayBaoHanh !== undefined && p.soNgayBaoHanh !== null && Number(p.soNgayBaoHanh) < 0) {
        return { valid: false, error: `Số ngày bảo hành của sản phẩm ${p.productName} không được là số âm` };
      }
    }
  }

  if (normalizeLoai(data.loai) === QUOTATION_LOAI.MAY) {
    const serials = data.danhSachMaMay || [];
    if (serials.length !== data.slMay) {
      return { valid: false, error: `Bàn giao máy yêu cầu số lượng serial khớp số lượng máy: Bạn đang giao ${data.slMay} máy nhưng nhập ${serials.length} serial.` };
    }
  }

  if (data.slMay === 0 && (!data.products || data.products.length === 0)) {
    return { valid: false, error: "Vui lòng nhập số lượng sản phẩm cần giao" };
  }

  return { valid: true };
}

/**
 * Kiểm tra xem một chứng từ (Payment / Contract / Quotation) đã giao đủ 100% số lượng (còn phải giao = 0) hay chưa
 */
export const isDeliverySourceFullyDelivered = isSourceDocumentFullyDelivered;
