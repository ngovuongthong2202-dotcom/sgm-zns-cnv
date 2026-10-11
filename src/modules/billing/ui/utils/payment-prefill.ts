import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

/**
 * Đợt 0A (TT04; nguyên tắc 2): giá trị điền sẵn cho phiếu thu mới. Được phép: dữ liệu chứng từ cha, người tạo, ngày hôm nay
 * (khuyến nghị ★ của câu QB9 — còn mở; nếu chủ sở hữu chọn "chỉ dữ liệu chứng từ cha" thì bỏ nguoiPhuTrach/ngayThanhToan ở đây).
 * Không bao giờ: số tiền thực thu, trạng thái "Tất toán"/"ĐÃ THANH TOÁN", đặc cách, lý do, ghi chú.
 */
export interface QuotationPrefillContext {
  currentPaymentId: string;
  defaultOfficer: string;
  today: string; // yyyy-MM-dd
}

type AnyRecord = Record<string, any>;

export function buildQuotationPaymentPrefill(prefillQuotation: AnyRecord, contracts: AnyRecord[] | undefined, ctx: QuotationPrefillContext) {
  const normLoai = (prefillQuotation.phanLoai || prefillQuotation.loai || prefillQuotation.loaiBaoGia) || 'BG Vật tư';
  const quoTotal = Number(prefillQuotation.totalAmount) || Number(prefillQuotation.subTotal) || 0;
  const linkedContract = (contracts || []).find((c) =>
    (c.quotationId && (c.quotationId === prefillQuotation.id || c.quotationId === prefillQuotation.soPhieuBaoGia)) ||
    (c.soPhieuBaoGia && (c.soPhieuBaoGia === prefillQuotation.soPhieuBaoGia || c.soPhieuBaoGia === prefillQuotation.id))
  );
  const resolvedContractId = linkedContract?.id || '';
  return {
    paymentId: ctx.currentPaymentId,
    trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
    tinhTrangThanhToan: 'Chưa TT',
    phuongThucThanhToan: 'Chuyển khoản',
    sourceValue: resolvedContractId ? `CONTRACT:${resolvedContractId}` : `QUOTATION:${prefillQuotation.id}`,
    quotationId: prefillQuotation.id,
    contractId: resolvedContractId,
    customerId: prefillQuotation.customerId || prefillQuotation.customer_id || '',
    maKh: prefillQuotation.maKh || '',
    tenKhachHang: prefillQuotation.tenKhachHang || '',
    sdt: prefillQuotation.soZaloMacDinh || prefillQuotation.sdt || '',
    tenNguoiNop: prefillQuotation.nguoiLienHe || prefillQuotation.nguoiNhan || prefillQuotation.tenKhachHang || '',
    isNguoiNopKhac: false,
    soDonHang: linkedContract?.soDonHang || prefillQuotation.soDonHang || '',
    soHopDong: linkedContract?.soHopDong || '',
    soPhieuBaoGia: prefillQuotation.soPhieuBaoGia || '',
    subTotal: prefillQuotation.subTotal || 0,
    vatRate: prefillQuotation.vatRate || 0,
    vatAmount: prefillQuotation.vatAmount || 0,
    discountRate: prefillQuotation.discountRate || 0,
    discountAmount: prefillQuotation.discountAmount || 0,
    totalAmount: quoTotal,
    soTien: undefined as number | undefined,
    products: prefillQuotation.products || [],
    ngayThanhToan: ctx.today,
    nguoiPhuTrach: ctx.defaultOfficer,
    phanLoai: normLoai,
    loai: normLoai,
  };
}

export interface ContractPrefillTotals {
  products: AnyRecord[];
  totalAmount: number;
  subTotal: number;
  vatRate: number;
  discountRate: number;
  slMay: number;
  today: string;
}

export function buildContractPaymentPrefill(contract: AnyRecord, t: ContractPrefillTotals) {
  return {
    contractId: contract.id,
    quotationId: contract.quotationId || '',
    soPhieuBaoGia: contract.soPhieuBaoGia || '',
    customerId: contract.customerId || '',
    maKh: contract.maKh || '',
    tenKhachHang: contract.tenKhachHang || '',
    tenNguoiNop: contract.nguoiDaiDien || contract.tenKhachHang || '',
    sdt: contract.sdt || '',
    soHopDong: contract.soHopDong || '',
    soDonHang: contract.soDonHang || '',
    totalAmount: t.totalAmount,
    products: t.products,
    slMay: t.slMay,
    loai: contract.loai || (t.products[0]?.productName || ''),
    dvt: contract.dvt || (t.products[0]?.unit || 'Máy'),
    nguoiPhuTrach: contract.nguoiPhuTrach || '',
    vatRate: t.vatRate,
    discountRate: t.discountRate,
    subTotal: t.subTotal,
    trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
    tinhTrangThanhToan: 'Chưa TT',
    phuongThucThanhToan: 'Chuyển khoản',
    soTien: undefined as number | undefined,
    congNoConLai: t.totalAmount,
    ngayThanhToan: t.today,
  };
}
