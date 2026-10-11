import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  afterEach(() => {
    vi.restoreAllMocks();
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

  // ── Vòng sửa 1 (Đợt 0A TT01) ─────────────────────────────────────────────────────────────────────────────────────────
  // (1) Tab cũ điền sẵn ghi chú nội bộ (ghiChu của đợt thu / của phiếu) vào ô Ghi chú rồi gửi lên nguyên văn; câu ngắn (≤ 30) trùng ghi chú nội bộ
  //     lưu trong CSDL phải bị thay bằng câu máy chủ, và dòng log [TT01 echo] không được chứa nội dung ghi chú. Nếu bản sao khớp ghi chú của ĐÚNG MỘT đợt có tiền thì
  //     số đợt là lanThu đã lưu của đợt đó (không đọc từ chữ); khớp nhiều đợt (mơ hồ), khớp đợt không có tiền hoặc chỉ khớp ghi chú cấp phiếu thì dùng câu máy chủ (đợt mới nhất có tiền).
  const TWO_PAID = { ...PAID_30, cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ngayThu: '2026-09-01' }, { lanThu: 2, soTien: 40_000_000, ngayThu: '2026-10-01' }] };
  const TWO_NOTED = { cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ghiChu: 'Đợt đầu - FT111' }, { lanThu: 2, soTien: 40_000_000, ghiChu: 'Đợt hai - FT222' }] };
  const ECHO_CASES: Array<{ label: string; typed: string; patch: Record<string, unknown>; expected: string }> = [
    { label: 'ghiChu của phiếu', typed: 'FT26161873245 link chứng từ', patch: {}, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChu của đợt thu', typed: 'Thu tiền đợt 1 - HĐ 004', patch: {}, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChu của phiếu (khác hoa/thường, thừa khoảng trắng)', typed: '  ft26161873245   LINK  chứng từ ', patch: {}, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChu của đợt thu thứ nhất (phiếu có hai đợt; số đợt lấy từ chính đợt đó)', typed: 'đợt đầu - ft111', patch: TWO_NOTED, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChu của đợt thu thứ hai (phiếu có hai đợt)', typed: 'Đợt hai - FT222', patch: TWO_NOTED, expected: 'Thanh toán đợt 2' },
    { label: 'note của phiếu (có khoảng trắng hai đầu)', typed: 'chuyển khoản vcb', patch: { note: '  Chuyển khoản VCB  ' }, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChuNoiBo của phiếu', typed: 'Đã đối soát', patch: { ghiChuNoiBo: 'Đã đối soát' }, expected: 'Thanh toán đợt 1' },
    { label: 'note của phiếu (dạng Unicode tách dấu)', typed: 'Chuyển khoản VCB'.normalize('NFD'), patch: { note: 'Chuyển khoản VCB' }, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChu của phiếu dài hơn 30 ký tự', typed: 'FT26161873245 link chứng từ - đã đối soát xong', patch: { ghiChu: 'FT26161873245 link chứng từ - đã đối soát xong' }, expected: 'Thanh toán đợt 1' },
    { label: 'ghiChu của đợt thu 1 dài hơn 30 ký tự và bắt đầu bằng "Thanh toán đợt 1" (phiếu có hai đợt; số đợt lấy từ chính đợt đó)', typed: 'Thanh toán đợt 1 - chuyển khoản VCB (đã đối soát)', patch: { cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ghiChu: 'Thanh toán đợt 1 - chuyển khoản VCB (đã đối soát)' }, { lanThu: 2, soTien: 40_000_000 }] }, expected: 'Thanh toán đợt 1' },
    { label: 'cùng một ghi chú ở hai đợt có tiền (mơ hồ) → câu máy chủ, đợt mới nhất', typed: 'đợt chung - ft333', patch: { cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ghiChu: 'Đợt chung - FT333' }, { lanThu: 2, soTien: 40_000_000, ghiChu: 'Đợt chung - FT333' }] }, expected: 'Thanh toán đợt 2' },
    { label: 'ghiChu của phiếu khi phiếu có hai đợt có ghi chú riêng (không khớp đợt nào) → câu máy chủ, đợt mới nhất', typed: 'FT26161873245 link chứng từ', patch: TWO_NOTED, expected: 'Thanh toán đợt 2' },
    { label: 'ghiChu của đợt không có tiền (soTien 0) → bỏ qua, câu máy chủ (đợt mới nhất có tiền)', typed: 'đợt nháp - ft444', patch: { cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ghiChu: 'Đợt đầu - FT111' }, { lanThu: 2, soTien: 40_000_000, ghiChu: 'Đợt hai - FT222' }, { lanThu: 3, soTien: 0, ghiChu: 'Đợt nháp - FT444' }] }, expected: 'Thanh toán đợt 2' },
    { label: 'số đợt lấy từ lanThu đã lưu, không phải vị trí trong mảng (lanThu 3 và 4)', typed: 'đợt ba - ft555', patch: { cacDotThu: [{ lanThu: 3, soTien: 30_000_000, ghiChu: 'Đợt ba - FT555' }, { lanThu: 4, soTien: 40_000_000, ghiChu: 'Đợt bốn - FT666' }] }, expected: 'Thanh toán đợt 3' },
    { label: 'ghi chú dài của đợt thu 1 ghi nhầm "Thanh toán đợt 2" → số đợt lấy từ vị trí đã lưu (1), không đọc từ chữ (2)', typed: 'Thanh toán đợt 2 - ghi nhầm số trong ghi chú nội bộ', patch: { cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ghiChu: 'Thanh toán đợt 2 - ghi nhầm số trong ghi chú nội bộ' }, { lanThu: 2, soTien: 40_000_000 }] }, expected: 'Thanh toán đợt 1' },
  ];
  it.each(ECHO_CASES)('ghi_chu gửi lên là bản sao $label → 200 với câu máy chủ; log [TT01 echo] không chứa nội dung ghi chú', async ({ typed, patch, expected }) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30, ...patch };
    const res = await send({}, { ghi_chu: typed });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe(expected);
    const echoLogs = warn.mock.calls.map(c => String(c[0])).filter(m => m.includes('[TT01 echo]'));
    expect(echoLogs).toHaveLength(1);
    expect(echoLogs[0]).not.toMatch(/FT2616|Thu tiền|ft[0-9]{3}|vcb|đối soát|ghi nhầm/i);
  });

  it.each(['Thanh toán đợt 1', 'Đã nhận đủ tiền cọc'])('câu ngắn thật "%s" (không trùng ghi chú nội bộ nào) → giữ nguyên, không ghi [TT01 echo]', async (typed) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
    const res = await send({}, { ghi_chu: typed });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe(typed);
    expect(warn.mock.calls.some(c => String(c[0]).includes('[TT01 echo]'))).toBe(false);
  });

  // (2) Tab cũ ở trang Thanh toán điền sẵn "Thanh toán đợt N (Còn lại: … đ)" (> 30 ký tự) và không gửi installmentIndex: với câu quá dài như vậy, giữ đợt N người dùng đã chọn
  //     (N là số lần thu của một đợt có tiền), không lấy đợt mới nhất; N không phải đợt có tiền thì giữ hành vi cũ (câu máy chủ = đợt mới nhất có tiền).
  //     Câu ≤ 30 ký tự giữ nguyên như đã gõ (xem trước = tin gửi khách), kể cả khi bắt đầu bằng "Thanh toán đợt N"; bản sao ghi chú nội bộ luôn bị thay bằng câu máy chủ, mọi độ dài.
  it.each([
    'Thanh toán đợt 1 (Còn lại: 70.000.000 đ)',
    'THANH TOÁN ĐỢT 1 (CÒN LẠI: 70.000.000 Đ)',
    'Thanh toán đợt 1 (Còn lại: 70.000.000 đ)'.normalize('NFD'),
    '  thanh   toán đợt 1 - còn lại 70tr',
  ])('bản cũ không gửi installmentIndex, ghi_chu "%s" → giữ đợt 1 người dùng đã chọn, không lấy đợt mới nhất (2)', async (typed) => {
    znsHarness.docFixtures['payments/p1'] = { ...TWO_PAID };
    const res = await send({}, { ghi_chu: typed });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1');
  });

  it.each(['Thanh toán đợt 3 (Còn lại: 30.000.000 đ)', 'Thanh toán đợt 9 (Còn lại: 30.000.000 đ)'])('số đợt trong ghi_chu "%s" không phải đợt có tiền của phiếu → câu máy chủ (đợt mới nhất có tiền: 2)', async (typed) => {
    znsHarness.docFixtures['payments/p1'] = { ...TWO_PAID, cacDotThu: [...TWO_PAID.cacDotThu, { lanThu: 3, soTien: 0, ngayThu: '' }] };
    const res = await send({}, { ghi_chu: typed });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 2');
  });

  it('ghi_chu ≤ 30 ký tự giữ nguyên như đã gõ dù bắt đầu bằng "Thanh toán đợt N" (phiếu có hai đợt có tiền): "Thanh toán đợt 1 - cọc" không bị rút gọn', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...TWO_PAID };
    const res = await send({}, { ghi_chu: 'Thanh toán đợt 1 - cọc' });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1 - cọc');
  });

  // (3) Đọc phiếu thu lỗi (CSDL ném lỗi) không được trả "chưa ghi nhận khoản thu nào" (nhân viên sẽ ghi nhận trùng một đợt): 503, chưa gửi gì.
  //     Chỉ tin xác nhận thanh toán bị chặn; các loại tin khác vẫn đi tiếp như cũ.
  const failingRead = () => ({ doc: () => ({ get: () => Promise.reject(new Error('db down')) }) });
  it('đọc phiếu thu lỗi → 503 PAYMENT_READ_FAILED, không gửi, không ghi trạng thái, có ghi log lỗi', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    znsHarness.fakeAdminDb.collection.mockImplementationOnce(failingRead);
    const res = await send({}, { ghi_chu: 'Thanh toán đợt 1' });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ success: false, code: 'PAYMENT_READ_FAILED', error: 'Không đọc được phiếu thu lúc này nên chưa gửi tin. Thử lại sau giây lát.' });
    expect(znsHarness.fakeAdminDb.collection).toHaveBeenCalledWith('payments');
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
    expect(znsHarness.docUpdateCalls).toEqual([]);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('đối chứng: lỗi đọc báo giá (QUOTATION) không chặn gửi → vẫn 200 như cũ (chỉ tin thanh toán bị 503)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    znsHarness.fakeAdminDb.collection.mockImplementationOnce(failingRead);
    const res = await request(app).post('/api/zns/send').send({ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '0912345678', payload: { tenKhachHang: 'Công ty B' } });
    expect(res.status).toBe(200);
    expect(znsHarness.executeMock).toHaveBeenCalledTimes(1);
  });

  // (4) Hai ca của kế hoạch mà bản đầu của spec chưa có.
  it('phiếu đã xóa mềm (deletedAt) dù còn các đợt có tiền → 409 PAYMENT_NOT_COLLECTED, không gửi, không ghi trạng thái', async () => {
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30, deletedAt: '2026-10-05T08:00:00Z' };
    const res = await send();
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('PAYMENT_NOT_COLLECTED');
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
    expect(znsHarness.docUpdateCalls).toEqual([]);
  });

  it('phiếu chỉ có số tiền đầu phiếu (Công nợ, soTien 50 triệu, không đợt thu) + installmentIndex 0 (dòng "Đợt 1" tự dựng) → 200, ghi_chu "Thanh toán đợt 1"', async () => {
    znsHarness.docFixtures['payments/p1'] = { customerId: 'kh1', soTien: 50_000_000, totalAmount: 100_000_000, cacDotThu: [], tinhTrangThanhToan: 'Công nợ' };
    const res = await send({}, { installmentIndex: 0 });
    expect(res.status).toBe(200);
    expect(sentPayload().ghi_chu).toBe('Thanh toán đợt 1');
  });

  // ── Vòng sửa 2 (Đợt 0A TT01) ─────────────────────────────────────────────────────────────────────────────────────────
  // supabase.admin.ts gộp cả cột data của dòng vào tài liệu ({ ...data.data, ...data }) nên dbEntity.data / hồ sơ khách.data mang nguyên bản ghi chú nội bộ;
  // bóc ghi chú ở mức trên cùng là chưa đủ: bản sao lồng trong `data` cũng không được tới nhà cung cấp, và tài liệu gốc (CSDL, hồ sơ khách) không bị sửa.
  const INTERNAL_NOTES = { ghiChu: 'FT26161873245 link chứng từ', note: 'nội bộ', ghiChuNoiBo: 'khách khó tính', cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ngayThu: '2026-10-01', ghiChu: 'Thu tiền đợt 1 - HĐ 004' }] };
  it('phiếu có dạng thật của lớp CSDL (cột data lồng nhau mang ghi chú nội bộ) → 200; không còn ghi chú nội bộ ở mức nào; data giữ các trường khác; tài liệu gốc không bị sửa', async () => {
    const stored = { ...PAID_30, data: { ...PAID_30, ...INTERNAL_NOTES } };
    const before = JSON.parse(JSON.stringify(stored));
    znsHarness.docFixtures['payments/p1'] = stored;
    const res = await send();
    expect(res.status).toBe(200);
    const p = sentPayload();
    expect(p.ghi_chu).toBe('Thanh toán đợt 1');
    const json = JSON.stringify(p);
    for (const leaked of ['FT2616', 'nội bộ', 'khách khó tính', 'Thu tiền đợt 1 - HĐ 004']) expect(json).not.toContain(leaked);
    expect(p.data).toEqual({ customerId: 'kh1', tenKhachHang: 'Công ty A', soHopDong: 'HD-2026-0002', totalAmount: 100_000_000, tinhTrangThanhToan: 'Công nợ', cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ngayThu: '2026-10-01' }] });
    expect(znsHarness.docFixtures['payments/p1']).toEqual(before);
  });

  it('hồ sơ khách có cột data (phiếu không có) → ghi chú nội bộ của khách trong data cũng không tới nhà cung cấp; hồ sơ khách không bị sửa', async () => {
    const customer = { ...CUSTOMER, data: { tenKhachHang: 'Công ty A', ghiChu: 'khách khó tính', note: 'nội bộ của khách' } };
    const before = JSON.parse(JSON.stringify(customer));
    znsHarness.docFixtures['customers/kh1'] = customer;
    znsHarness.docFixtures['payments/p1'] = { ...PAID_30 };
    const res = await send();
    expect(res.status).toBe(200);
    const p = sentPayload();
    const json = JSON.stringify(p);
    expect(json).not.toContain('khách khó tính');
    expect(json).not.toContain('nội bộ của khách');
    expect(p.data).toEqual({ tenKhachHang: 'Công ty A' });
    expect(znsHarness.docFixtures['customers/kh1']).toEqual(before);
  });

  it('đối chứng: tin báo giá (QUOTATION) giữ nguyên cả data lồng nhau — chỉ tin xác nhận thanh toán bị bóc ghi chú', async () => {
    const data = { tenKhachHang: 'Công ty B', ghiChu: 'ghi chú báo giá', note: 'ghi chú phụ', cacDotThu: [{ lanThu: 1, ghiChu: 'dòng 1' }] };
    znsHarness.docFixtures['quotations/q1'] = { tenKhachHang: 'Công ty B', ghiChu: 'ghi chú báo giá', data };
    const res = await request(app).post('/api/zns/send').send({ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '0912345678', payload: {} });
    expect(res.status).toBe(200);
    expect(sentPayload().data).toEqual(data);
    expect(sentPayload().ghiChu).toBe('ghi chú báo giá');
  });
});
