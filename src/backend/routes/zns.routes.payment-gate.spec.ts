import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { znsHarness } from './zns-route-harness';
import znsRoutes from './zns.routes';

const app = express();
app.use(express.json());
app.use('/api/zns', znsRoutes);

const PAID_30 = {
  customerId: 'kh1', tenKhachHang: 'Công ty A', soHopDong: 'HD-2026-0002', totalAmount: 100_000_000, tinhTrangThanhToan: 'Công nợ',
  ghiChu: 'FT26161873245 link chứng từ', cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ngayThu: '2026-10-01', ghiChu: 'Thu tiền đợt 1 - HĐ 004' }],
};
const CUSTOMER = { tenKhachHang: 'Công ty A', sdt: '0912345678', ghiChu: 'khách khó tính' };
const send = (overrides: Record<string, unknown> = {}, payload: Record<string, unknown> = {}) =>
  request(app).post('/api/zns/send').send({ entityId: 'p1', entityType: 'PAYMENT', messageType: 'THANH_TOAN_XAC_NHAN', phone: '0912345678', payload, ...overrides });
const sentPayload = () => znsHarness.executeMock.mock.calls[0][0].payload as Record<string, unknown>;

describe('zns.routes POST /send – Đợt 0A (TT01): tin thanh toán chốt theo CSDL, không ghi chú nội bộ', () => {
  beforeEach(() => {
    znsHarness.reset();
    znsHarness.docFixtures['customers/kh1'] = { ...CUSTOMER };
  });

  it('phiếu Chưa TT trong CSDL, thân gửi lên "khai" có tiền → 409 PAYMENT_NOT_COLLECTED, không gửi, không ghi trạng thái', async () => {
    znsHarness.docFixtures['payments/p1'] = { customerId: 'kh1', soTien: 0, cacDotThu: [], tinhTrangThanhToan: 'Chưa TT' };
    const res = await send({}, { soTien: 50_000_000, cacDotThu: [{ lanThu: 1, soTien: 50_000_000 }], ghi_chu: 'Thanh toán đợt 1' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, code: 'PAYMENT_NOT_COLLECTED', error: 'Phiếu thu chưa ghi nhận khoản thu nào nên không gửi được tin xác nhận thanh toán. Ghi nhận đợt thu trước.' });
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
    expect(znsHarness.docUpdateCalls).toEqual([]);
  });

  it('nhãn "Tất toán" nhưng soTien 0, không đợt thu → 409 (nhãn không tính là tiền)', async () => {
    znsHarness.docFixtures['payments/p1'] = { customerId: 'kh1', soTien: 0, cacDotThu: [], tinhTrangThanhToan: 'Tất toán' };
    expect((await send()).status).toBe(409);
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
  });

  it('phiếu thu 30 % + thân không có ghi_chu → 200; payload tới nhà cung cấp có ghi_chu "Thanh toán đợt 1", không có ghiChu/note, đợt thu không còn ghiChu', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30, note: 'note nội bộ của phiếu', ghiChuNoiBo: 'ghi chú nội bộ riêng' };
    const res = await send();
    expect(res.status).toBe(200);
    const p = sentPayload();
    expect(p.ghi_chu).toBe('Thanh toán đợt 1');
    expect(p).not.toHaveProperty('ghiChu');
    expect(p).not.toHaveProperty('note');
    expect(p).not.toHaveProperty('ghiChuNoiBo');
    expect((p.cacDotThu as Array<Record<string, unknown>>)[0]).not.toHaveProperty('ghiChu');
    expect(JSON.stringify(p)).not.toMatch(/FT2616|Thu tiền đợt|khách khó tính|note nội bộ|ghi chú nội bộ riêng/);
  });

  it('thân có ghi_chu "Thanh toán đợt 1" và installmentIndex 0 → 200, ghi_chu giữ nguyên', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
    const res = await send({}, { ghi_chu: 'Thanh toán đợt 1', installmentIndex: 0 });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1');
  });

  it('installmentIndex 7 (không tồn tại) → 400 INVALID_INSTALLMENT, không gửi', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
    const res = await send({}, { installmentIndex: 7 });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_INSTALLMENT');
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
  });

  it('bản trình duyệt cũ gửi "Tất toán 100% hợp đồng - Hoàn tất thanh toán" cho phiếu còn nợ → 409 PAYMENT_NOTE_REJECTED', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
    const res = await send({}, { ghi_chu: 'Tất toán 100% hợp đồng - Hoàn tất thanh toán' });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ success: false, code: 'PAYMENT_NOTE_REJECTED', error: 'Nội dung "Tất toán" chỉ gửi được khi phiếu đã thu đủ. Sửa ô Ghi chú thành câu phù hợp (ví dụ "Thanh toán đợt 2").' });
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
  });

  it('PAYMENT_NOTE_GUARD=report: câu "Tất toán…" cũ cho phiếu còn nợ → 200, thay bằng câu máy chủ "Thanh toán đợt 1" (chỉ ghi nhận)', async () => {
    vi.stubEnv('PAYMENT_NOTE_GUARD', 'report');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
      const res = await send({}, { ghi_chu: 'Tất toán 100% hợp đồng - Hoàn tất thanh toán' });
      expect(res.status).toBe(200);
      expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1');
      expect(warn.mock.calls.some(c => String(c[0]).includes('[TT01 report-only]'))).toBe(true);
    } finally {
      warn.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('PAYMENT_NOTE_GUARD=report: câu "Tất toán 100% hợp đồng" ngắn (≤ 30 ký tự) cho phiếu còn nợ cũng được thay bằng câu máy chủ', async () => {
    vi.stubEnv('PAYMENT_NOTE_GUARD', 'report');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
      const res = await send({}, { ghi_chu: 'Tất toán 100% hợp đồng' });
      expect(res.status).toBe(200);
      expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1');
    } finally {
      warn.mockRestore();
      vi.unstubAllEnvs();
    }
  });

  it('phiếu đã thu đủ (100/100) + câu "Tất toán…" cũ → không bị chặn bởi luật ghi chú; câu > 30 ký tự được thay bằng câu máy chủ', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30, cacDotThu: [{ lanThu: 1, soTien: 40_000_000, ngayThu: '2026-09-01' }, { lanThu: 2, soTien: 60_000_000, ngayThu: '2026-10-01' }] };
    const res = await send({}, { ghi_chu: 'Tất toán 100% hợp đồng - Hoàn tất thanh toán' });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 2');
  });

  it('bản cũ gửi "Thanh toán đợt 1 (Còn lại: 70.000.000 đ)" (> 30 ký tự) → 200 với câu máy chủ "Thanh toán đợt 1"', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
    const res = await send({}, { ghi_chu: 'Thanh toán đợt 1 (Còn lại: 70.000.000 đ)' });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1');
  });

  it('phiếu "Hủy" có tiền → 409; phiếu không có trong CSDL → 409', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30, tinhTrangThanhToan: 'Hủy' };
    expect((await send()).status).toBe(409);
    delete znsHarness.docFixtures['payments/p1'];
    expect((await send({ entityId: 'khong-co' })).status).toBe(409);
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
  });

  it.each(['THANH_TOAN_TAT_TOAN', 'THANH_TOAN_CONG_NO', 'THANH_TOAN_CONG_NO_DEN_HAN'])('%s được chốt như nhau (tiền tố THANH_TOAN_)', async (messageType) => {
    znsHarness.docFixtures['payments/p1'] = { customerId: 'kh1', soTien: 0, cacDotThu: [], tinhTrangThanhToan: 'Chưa TT' };
    expect((await send({ messageType })).status).toBe(409);
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
  });

  it('thứ tự kiểm tra giữ nguyên: thiếu entityId → 400; SĐT sai → 400 INVALID_PHONE (trước chốt, không đọc CSDL)', async () => {
    const r1 = await request(app).post('/api/zns/send').send({ entityType: 'PAYMENT', messageType: 'THANH_TOAN_XAC_NHAN' });
    expect(r1.status).toBe(400);
    const r2 = await send({ phone: '12' });
    expect(r2.status).toBe(400);
    expect(r2.body.code).toBe('INVALID_PHONE');
    expect(znsHarness.fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('đối chứng: tin báo giá (QUOTATION/BAOGIA) không đi qua chốt thanh toán → 200, ghiChu của báo giá giữ nguyên', async () => {
    znsHarness.docFixtures['quotations/q1'] = { tenKhachHang: 'Công ty B', ghiChu: 'ghi chú báo giá' };
    const res = await request(app).post('/api/zns/send').send({ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '0912345678', payload: {} });
    expect(res.status).toBe(200);
    expect(sentPayload().ghiChu).toBe('ghi chú báo giá');
  });
});
