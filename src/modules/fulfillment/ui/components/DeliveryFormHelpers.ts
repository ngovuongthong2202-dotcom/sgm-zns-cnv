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

  // Chặn nếu không có sản phẩm nào hoặc tất cả sản phẩm đều có số lượng <= 0 (đã giao đủ)
  if (!data.products || data.products.length === 0 || data.products.every((p: any) => (p.quantity || 0) <= 0)) {
    return { valid: false, error: 'Chứng từ này đã giao đủ 100% số lượng hàng hóa (số lượng còn phải giao = 0)' };
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

  if (data.slMay === 0 && (!data.products || data.products.length === 0)) {
    return { valid: false, error: "Vui lòng nhập số lượng sản phẩm cần giao" };
  }

  return { valid: true };
}

/**
 * Kiểm tra xem một chứng từ (Payment / Contract / Quotation) đã giao đủ 100% số lượng (còn phải giao = 0) hay chưa
 */
export function isDeliverySourceFullyDelivered(
  sourceDoc: any,
  deliveries: any[] = [],
  contracts: any[] = [],
  quotations: any[] = []
): boolean {
  if (!sourceDoc) return false;

  // Lọc danh sách giao hàng hợp lệ (không bị xóa, không bị hủy)
  const validDeliveries = (deliveries || []).filter((d: any) => 
    !d.deletedAt && !d.deleted_at && String(d.tinhTrangGiaoHang || '').toUpperCase() !== 'HỦY'
  );

  // Tìm hợp đồng và báo giá liên quan nếu sourceDoc là payment
  const contractData = sourceDoc.contractId 
    ? contracts.find((c: any) => c.id === sourceDoc.contractId || c.soHopDong === sourceDoc.soHopDong)
    : (sourceDoc.soHopDong ? contracts.find((c: any) => c.soHopDong === sourceDoc.soHopDong) : null);

  const quotationData = sourceDoc.quotationId
    ? quotations.find((q: any) => q.id === sourceDoc.quotationId || q.soPhieuBaoGia === sourceDoc.soPhieuBaoGia)
    : (sourceDoc.soPhieuBaoGia ? quotations.find((q: any) => q.soPhieuBaoGia === sourceDoc.soPhieuBaoGia) : null);

  // Lấy danh sách sản phẩm từ các nguồn
  const productList = (Array.isArray(sourceDoc.products) && sourceDoc.products.length > 0 ? sourceDoc.products : null)
    || (Array.isArray(sourceDoc.sanPham) && sourceDoc.sanPham.length > 0 ? sourceDoc.sanPham : null)
    || (Array.isArray(contractData?.products) && contractData.products.length > 0 ? contractData.products : null)
    || (Array.isArray(contractData?.sanPham) && contractData.sanPham.length > 0 ? contractData.sanPham : null)
    || (Array.isArray(quotationData?.sanPham) && quotationData.sanPham.length > 0 ? quotationData.sanPham : null)
    || (Array.isArray(quotationData?.products) && quotationData.products.length > 0 ? quotationData.products : null)
    || (Array.isArray(sourceDoc.items) && sourceDoc.items.length > 0 ? sourceDoc.items : null)
    || [];

  // Lọc các phiếu giao hàng liên quan đến chứng từ này
  const linkedDeliveries = validDeliveries.filter((d: any) => {
    if (d.paymentId && (d.paymentId === sourceDoc.id || d.paymentId === sourceDoc.paymentId)) return true;
    if (d.soChungTuThamChieu && (d.soChungTuThamChieu === sourceDoc.paymentId || d.soChungTuThamChieu === sourceDoc.id)) return true;
    if (contractData && d.contractId && d.contractId === contractData.id) return true;
    if (sourceDoc.contractId && d.contractId && d.contractId === sourceDoc.contractId) return true;
    if (sourceDoc.soHopDong && d.soHopDong && d.soHopDong === sourceDoc.soHopDong) return true;
    if (quotationData && d.quotationId && d.quotationId === quotationData.id) return true;
    if (sourceDoc.quotationId && d.quotationId && d.quotationId === sourceDoc.quotationId) return true;
    if (sourceDoc.soPhieuBaoGia && d.soPhieuBaoGia && d.soPhieuBaoGia === sourceDoc.soPhieuBaoGia) return true;
    if (sourceDoc.soDonHang && d.soDonHang && d.soDonHang === sourceDoc.soDonHang) return true;
    return false;
  });

  // Nếu có danh sách sản phẩm
  if (productList.length > 0) {
    const actualDeliveredMap: Record<string, number> = {};

    linkedDeliveries.forEach((d: any) => {
      const dItems = Array.isArray(d.products) && d.products.length > 0 ? d.products : (Array.isArray(d.sanPham) ? d.sanPham : []);
      dItems.forEach((dp: any, idx: number) => {
        const itemKey = getProductItemKey(dp, idx);
        const qty = Number(dp.quantity || dp.soLuong || 0);
        actualDeliveredMap[itemKey] = (actualDeliveredMap[itemKey] || 0) + qty;
        if (dp.productId) actualDeliveredMap[String(dp.productId)] = (actualDeliveredMap[String(dp.productId)] || 0) + qty;
        if (dp.productName) {
          const normName = String(dp.productName).trim().toLowerCase();
          actualDeliveredMap[normName] = (actualDeliveredMap[normName] || 0) + qty;
        }
      });
    });

    const sourceDeliveredQuantities = (sourceDoc.deliveredQuantities || contractData?.deliveredQuantities || quotationData?.deliveredQuantities || {}) as Record<string, number>;

    let totalContracted = 0;
    let allItemsDone = true;

    for (const [index, cp] of productList.entries()) {
      const itemKey = getProductItemKey(cp, index);
      const reqQty = Number(cp.quantity || cp.soLuong || 0);
      totalContracted += reqQty;

      const normName = String(cp.productName || cp.tenSanPham || '').trim().toLowerCase();
      const fromDeliveries = Number(
        actualDeliveredMap[itemKey] ?? 
        (cp.productId ? actualDeliveredMap[String(cp.productId)] : undefined) ?? 
        (normName ? actualDeliveredMap[normName] : undefined) ?? 
        0
      );
      const fromSource = Number(sourceDeliveredQuantities[itemKey] || 0);
      const deliveredCount = Math.max(fromDeliveries, fromSource);

      if (deliveredCount < reqQty) {
        allItemsDone = false;
      }
    }

    if (totalContracted > 0 && allItemsDone) {
      return true;
    }
  }

  // Trường hợp giao máy theo slMay (hoặc không có mảng chi tiết sản phẩm)
  const totalSlMay = Number(sourceDoc.slMay || contractData?.slMay || quotationData?.slMay || 0);
  if (totalSlMay > 0) {
    const totalDeliveredSlMay = linkedDeliveries.reduce((sum: number, d: any) => sum + Number(d.slMay || 0), 0);
    if (totalDeliveredSlMay >= totalSlMay) {
      return true;
    }
  }

  // Nếu đã có phiếu giao hàng với trạng thái hoàn tất và không còn sản phẩm thiếu
  const hasCompletedDelivery = linkedDeliveries.some((d: any) => 
    (d.tinhTrangGiaoHang === 'Hoàn tất' || d.tinhTrangGiaoHang === 'HOÀN TẤT' || d.tinhTrangGiaoHang === 'Hoàn thành' || !!d.ngayGiaoThucTe) &&
    (Array.isArray(d.products) && d.products.length > 0)
  );
  if (hasCompletedDelivery && linkedDeliveries.length > 0) {
    return true;
  }

  return false;
}
