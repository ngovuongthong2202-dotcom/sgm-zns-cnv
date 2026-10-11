import { describe, it, expect } from 'vitest';
import { buildQuotationPaymentPrefill, buildContractPaymentPrefill } from './payment-prefill';

const ctx = { currentPaymentId: 'PT-2026-0009', defaultOfficer: 'Ngô Vương Thông', today: '2026-10-11' };
const quotation = {
  id: 'QUO-1', soPhieuBaoGia: 'BGDV-2026-0151', phanLoai: 'Dịch vụ', customerId: 'CUST-001', maKh: 'KH-001', tenKhachHang: 'Cửa Hàng Minh Ánh', sdt: '0901234567',
  subTotal: 2_623_000, vatRate: 8, vatAmount: 209_840, discountRate: 0, discountAmount: 0, totalAmount: 2_832_840, products: [{ productName: 'Dịch vụ bảo dưỡng', quantity: 1, price: 2_623_000 }],
};
const contract = { id: 'c1', soHopDong: 'HD-2026-0002', quotationId: 'QUO-1', soDonHang: 'DH-01', customerId: 'CUST-001', maKh: 'KH-001', tenKhachHang: 'Cửa Hàng Minh Ánh', sdt: '0901234567', nguoiDaiDien: 'Anh Ánh', soPhieuBaoGia: 'BGDV-2026-0151' };
const FORBIDDEN_STATUSES = ['ĐÃ THANH TOÁN', 'Tất toán', 'DA_THANH_TOAN'];

describe('payment-prefill – Đợt 0A (TT04): phiếu thu mới không điền 100 % và "Tất toán"', () => {
  it('từ báo giá: soTien undefined, "Chưa TT", totalAmount = tổng báo giá, không có đặc cách/lý do/ghi chú', () => {
    const p = buildQuotationPaymentPrefill(quotation, [], ctx);
    expect(p.soTien).toBeUndefined();
    expect(p.tinhTrangThanhToan).toBe('Chưa TT');
    expect(p.totalAmount).toBe(2_832_840);
    expect(p.sourceValue).toBe('QUOTATION:QUO-1');
    expect(p).not.toHaveProperty('dacCachGiaoTruoc');
    expect(p).not.toHaveProperty('lyDoDacCach');
    expect(p).not.toHaveProperty('ghiChu');
    expect(p).toMatchObject({ paymentId: 'PT-2026-0009', nguoiPhuTrach: 'Ngô Vương Thông', ngayThanhToan: '2026-10-11', phanLoai: 'Dịch vụ', loai: 'Dịch vụ', tenKhachHang: 'Cửa Hàng Minh Ánh' });
  });

  it('từ báo giá có hợp đồng liên kết: sourceValue CONTRACT:<id>, soHopDong/soDonHang chép từ hợp đồng (dữ liệu chứng từ cha được phép)', () => {
    const p = buildQuotationPaymentPrefill(quotation, [contract], ctx);
    expect(p.sourceValue).toBe('CONTRACT:c1');
    expect(p.contractId).toBe('c1');
    expect(p.soHopDong).toBe('HD-2026-0002');
    expect(p.soDonHang).toBe('DH-01');
    expect(p.tinhTrangThanhToan).toBe('Chưa TT');
    expect(p.soTien).toBeUndefined();
  });

  it('từ hợp đồng: soTien undefined, "Chưa TT", congNoConLai = tổng hợp đồng, không ghi chú/lý do điền sẵn', () => {
    const p = buildContractPaymentPrefill(contract, { products: [{ productName: 'Máy', quantity: 1, price: 100 }], totalAmount: 100_000_000, subTotal: 92_592_593, vatRate: 8, discountRate: 0, slMay: 1, today: '2026-10-11' });
    expect(p.soTien).toBeUndefined();
    expect(p.tinhTrangThanhToan).toBe('Chưa TT');
    expect(p.congNoConLai).toBe(100_000_000);
    expect(p.totalAmount).toBe(100_000_000);
    for (const k of ['dacCachGiaoTruoc', 'lyDoDacCach', 'ghiChu']) expect(p, k).not.toHaveProperty(k);
    expect(p).toMatchObject({ contractId: 'c1', soHopDong: 'HD-2026-0002', tenNguoiNop: 'Anh Ánh', phuongThucThanhToan: 'Chuyển khoản', ngayThanhToan: '2026-10-11' });
  });

  it('không giá trị nào của hai đối tượng bằng một trạng thái "đã thanh toán" viết cứng', () => {
    const values = [...Object.values(buildQuotationPaymentPrefill(quotation, [contract], ctx)), ...Object.values(buildContractPaymentPrefill(contract, { products: [], totalAmount: 1, subTotal: 1, vatRate: 0, discountRate: 0, slMay: 1, today: '2026-10-11' }))];
    for (const v of values) expect(FORBIDDEN_STATUSES).not.toContain(v);
  });

  it('báo giá tổng 0 → vẫn "Chưa TT", không ném', () => {
    const p = buildQuotationPaymentPrefill({ ...quotation, totalAmount: 0, subTotal: 0 }, undefined, ctx);
    expect(p.tinhTrangThanhToan).toBe('Chưa TT');
    expect(p.totalAmount).toBe(0);
  });
});
