import { squeezeSpaces, normalizeCode, normalizeBusinessName } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';

export function normalizeDeliveryFormValues(data: any) {
  data.ghiChu = squeezeSpaces(data.ghiChu);
  data.deliveryId = normalizeCode(data.deliveryId);
  data.soPhieuXuat = normalizeCode(data.soPhieuXuat);
  data.donViVanChuyen = normalizeBusinessName(data.donViVanChuyen);
  if (data.sdt) {
    data.sdt = normalizePhoneVN(data.sdt) || data.sdt;
  }
  return data;
}

export function validateDeliveryBusinessRules(data: any, payments: any[], maxQuantities: Record<string, number>, delivery: any): { valid: boolean; error?: string } {
  if (data.paymentId) {
    const selectedPayment = payments.find((p: any) => p.id === data.paymentId);
    if (selectedPayment && selectedPayment.tinhTrangThanhToan === 'Chưa TT') {
      return { valid: false, error: 'Không được tạo phiếu giao hàng đối với Giao dịch Chưa thanh toán' };
    }
  }

  if (data.products) {
    for (const [index, p] of data.products.entries()) {
      const itemKey = getProductItemKey(p, index);
      const maxLimit = maxQuantities[itemKey];
      if (maxLimit !== undefined && p.quantity > maxLimit) {
        return { valid: false, error: `Sản phẩm ${p.productName} vượt quá số lượng còn lại cho phép (${maxLimit})` };
      }
      if (p.soNgayBaoHanh === undefined || p.soNgayBaoHanh === null || p.soNgayBaoHanh < 0) {
        return { valid: false, error: `Vui lòng nhập số ngày bảo hành hợp lệ cho sản phẩm ${p.productName}` };
      }
    }
  }

  if (normalizeLoai(data.loai) === QUOTATION_LOAI.MAY) {
    const serials = data.danhSachMaMay || [];
    if (serials.length !== data.slMay) {
      return { valid: false, error: `Bàn giao máy yêu cầu số lượng serial khớp số lượng máy: Bạn đang giao ${data.slMay} máy nhưng nhập ${serials.length} serial.` };
    }
  }

  if (data.slMay === 0) {
    return { valid: false, error: "Vui lòng nhập số lượng sản phẩm cần giao" };
  }

  return { valid: true };
}
