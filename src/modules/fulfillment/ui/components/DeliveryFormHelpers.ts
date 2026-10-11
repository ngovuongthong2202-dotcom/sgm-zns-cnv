import { sanitizeCode, sanitizeText, sanitizePhoneVN } from '@/src/shared/utils/inputSanitizer';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { isPaymentUnpaid } from '@/src/domain/enums/payment-status';

import { isSourceDocumentFullyDelivered } from '@/src/domain/services/delivery-reconciler';

export function normalizeDeliveryFormValues(data: any) {
  data.ghiChu = sanitizeText(data.ghiChu);
  data.deliveryId = sanitizeCode(data.deliveryId);
  data.soPhieuXuat = sanitizeCode(data.soPhieuXuat);
  data.donViVanChuyen = sanitizeText(data.donViVanChuyen);
  if (data.contractId) {
    const isValidUuid = typeof data.contractId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.contractId);
    if (!isValidUuid) {
      if (!data.soHopDong) {
        data.soHopDong = data.contractId;
      }
      data.contractId = null;
    }
  }
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

    // Auto sync root serials from machine line-items
    const collectedLineSerials = Array.from(
      new Set(data.products.flatMap((p: any) => (Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay : [])))
    ).filter(Boolean);

    if (collectedLineSerials.length > 0) {
      data.danhSachMaMay = collectedLineSerials;
    }
  }
  return data;
}

import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

export interface WaiverFields {
  dacCachGiaoTruoc: boolean;
  nguoiPheDuyetDacCach: string;
  lyDoDacCach: string;
}

export interface ResolveWaiverInput {
  /** Chứng từ cha theo thứ tự ưu tiên (phiếu thu, rồi hợp đồng/báo giá nguồn). */
  parents?: Array<Record<string, unknown> | null | undefined>;
  /** Các đợt giao trước của cùng chứng từ. */
  previousDeliveries?: Array<Record<string, unknown> | null | undefined>;
  /** Giá trị nhân viên đang có trong form. */
  current?: Partial<WaiverFields> | null;
}

const EMPTY_WAIVER: WaiverFields = { dacCachGiaoTruoc: false, nguoiPheDuyetDacCach: '', lyDoDacCach: '' };

// Đợt 0A (GH02): hai hằng dưới đây CHỈ dùng để LOẠI dữ liệu đặc cách do mã cũ tự điền (phiếu lưu trước Đợt 0A) khỏi việc
// kế thừa — KHÔNG BAO GIỜ dùng để điền sẵn. Nhãn chung không phải người duyệt cụ thể (so sau khi cắt khoảng trắng, không phân biệt hoa thường).
const LEGACY_GENERIC_APPROVER_LABEL = 'Ban Giám Đốc';
// Ba câu lý do chỉ mã cũ từng tự viết (không có trong các chip lý do nhanh của form).
const LEGACY_AUTO_FILLED_REASONS: readonly string[] = [
  'Giao hàng trước thanh toán theo phê duyệt của Lãnh đạo',
  'Kế thừa Đặc cách Ban Giám Đốc từ đợt giao trước',
  'Kế thừa Đặc cách Ban Giám Đốc từ đơn hàng',
];

function isLegacyAutoFilledWaiver(approver: string, reason: string): boolean {
  // NFC: chữ Việt gõ kiểu tổ hợp vẫn so khớp được với hằng (dựng sẵn).
  const approverKey = approver.normalize('NFC').toLowerCase();
  const reasonKey = reason.normalize('NFC');
  return approverKey === LEGACY_GENERIC_APPROVER_LABEL.toLowerCase() || LEGACY_AUTO_FILLED_REASONS.includes(reasonKey);
}

function recordedWaiver(src?: Record<string, unknown> | null): WaiverFields | null {
  if (!src || src.dacCachGiaoTruoc !== true) return null;
  const approver = typeof src.nguoiPheDuyetDacCach === 'string' ? src.nguoiPheDuyetDacCach.trim() : '';
  const reason = typeof src.lyDoDacCach === 'string' ? src.lyDoDacCach.trim() : '';
  if (!approver || !reason) return null; // đặc cách thiếu người duyệt hoặc lý do không được kế thừa
  if (isLegacyAutoFilledWaiver(approver, reason)) return null; // đặc cách do mã cũ tự điền không được kế thừa
  return { dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: approver, lyDoDacCach: reason };
}

/**
 * Đợt 0A (GH02; nguyên tắc 2): giá trị điền sẵn cho đặc cách giao trước. Không bao giờ tự bật, không bao giờ điền
 * người duyệt/lý do mặc định. Chỉ chép nguyên văn một đặc cách ĐÃ GHI NHẬN (cờ + người duyệt + lý do), hoặc giữ lựa chọn
 * nhân viên đang có trong form. Đặc cách do mã cũ tự điền (nhãn chung, hoặc câu lý do chỉ mã cũ viết — xem hai hằng
 * LEGACY_… ở trên) không tính là đã ghi nhận.
 */
export function resolveWaiverPrefill(input: ResolveWaiverInput): WaiverFields {
  const cur = input.current;
  if (cur && cur.dacCachGiaoTruoc === true) {
    return {
      dacCachGiaoTruoc: true,
      nguoiPheDuyetDacCach: typeof cur.nguoiPheDuyetDacCach === 'string' ? cur.nguoiPheDuyetDacCach.trim() : '',
      lyDoDacCach: typeof cur.lyDoDacCach === 'string' ? cur.lyDoDacCach.trim() : '',
    };
  }
  for (const parent of input.parents || []) {
    const w = recordedWaiver(parent);
    if (w) return w;
  }
  for (const d of input.previousDeliveries || []) {
    const w = recordedWaiver(d);
    if (w) return w;
  }
  return { ...EMPTY_WAIVER };
}

export function validateDeliveryBusinessRules(data: any, payments: any[], maxQuantities: Record<string, number>, delivery: any): { valid: boolean; error?: string } {
  if (!data.soPhieuXuat || !String(data.soPhieuXuat).trim()) {
    return { valid: false, error: 'Vui lòng nhập Số Phiếu Xuất Kho (ERP) trước khi lưu giao hàng' };
  }

  if (!data.donViVanChuyen || !String(data.donViVanChuyen).trim()) {
    return { valid: false, error: 'Vui lòng nhập hoặc chọn Đơn vị Vận chuyển / Chành xe giao hàng' };
  }

  if (data.paymentId && !data.dacCachGiaoTruoc) {
    const selectedPayment = payments.find((p: any) => p.id === data.paymentId);
    if (selectedPayment && isPaymentUnpaid(selectedPayment.tinhTrangThanhToan)) {
      return { valid: false, error: 'Không được tạo phiếu giao hàng đối với Giao dịch Chưa thanh toán' };
    }
  }

  // Đợt 0A (GH02): đặc cách phải có người duyệt cụ thể VÀ lý do (form lẫn máy chủ — xem workflow.routes.ts)
  if (data.dacCachGiaoTruoc) {
    if (!data.nguoiPheDuyetDacCach || !String(data.nguoiPheDuyetDacCach).trim()) {
      return { valid: false, error: 'Đặc cách giao trước cần chọn người duyệt cụ thể trong ô "Lãnh đạo phê duyệt".' };
    }
    if (!data.lyDoDacCach || !String(data.lyDoDacCach).trim()) {
      return { valid: false, error: 'Vui lòng nhập căn cứ / lý do phê duyệt của Sếp khi áp dụng Đặc cách Giao trước' };
    }
  }

  // Đợt 0A (GH02): phiếu giao theo hợp đồng mà không có phiếu thu và không đặc cách — trước đây lọt qua không chốt nào.
  // Chỉ áp cho phiếu giao MỚI: bản sửa phiếu đã lưu (có id) không bị chặn, để sửa thông tin không buộc bật đặc cách (và sinh phiếu thu neo).
  // Nhánh báo giá không có phiếu thu giữ nguyên (GH12, Đợt 1).
  if (!delivery?.id && data.contractId && !data.paymentId && !data.dacCachGiaoTruoc) {
    return { valid: false, error: 'Hợp đồng chưa có phiếu thu: bật Đặc cách, chọn người duyệt và ghi lý do, hoặc lập phiếu thu trước.' };
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
        return { valid: false, error: `Sản phẩm ${p.productName || p.tenSanPham} vượt quá số lượng còn lại cho phép (${maxLimit})` };
      }
      if (p.soNgayBaoHanh !== undefined && p.soNgayBaoHanh !== null && Number(p.soNgayBaoHanh) < 0) {
        return { valid: false, error: `Số ngày bảo hành của sản phẩm ${p.productName || p.tenSanPham} không được là số âm` };
      }

      // Resolve item type: strictly respect explicit itemType, fallback heuristic only when undefined
      const resolvedType = p.itemType || detectItemType(p.productName || p.tenSanPham, p.unit || p.dvt);
      const isMachine = resolvedType === 'MACHINE';
      const requiredQty = Number(p.quantity || p.soLuong || 1);

      // Check serial quota STRICTLY for MACHINE items only. Material & Service serials are optional!
      if (isMachine && requiredQty > 0) {
        const serials = Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay.filter(Boolean) : [];
        if (serials.length !== requiredQty) {
          return { 
            valid: false, 
            error: `Sản phẩm máy "${p.productName || p.tenSanPham}" đang giao ${requiredQty} máy nhưng chỉ có ${serials.length} mã serial. Vui lòng nhập đủ ${requiredQty} serial máy.` 
          };
        }
      }
    }
  }

  if (normalizeLoai(data.loai) === QUOTATION_LOAI.MAY && Number(data.slMay || 0) > 0) {
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
