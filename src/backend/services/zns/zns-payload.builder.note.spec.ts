import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { znsPayloadBuilder } from './zns-payload.builder';
import { templateRendererService } from './template-renderer.service';
import type { ZnsMessage } from '../../../domain/schema/workflow.schema';

// Đợt 0A (TT01): bộ dựng tin KHÔNG được lấy ghi chú nội bộ (ghiChu / note / ghiChuNoiBo) làm ghi_chu.
// Lớp chính: các ca hành vi bên dưới chạy buildPayload thật, offline, với bộ dựng mẫu (templateRendererService) giả lập.
// Lớp phụ: bẫy văn bản ở cuối tệp, chỉ bắt kiểu viết lại ngay trên một dòng; nó không thay được các ca hành vi.
vi.mock('./template-renderer.service', () => ({
  templateRendererService: { render: vi.fn() },
}));

type Built = { template_data: Record<string, string>; data: Record<string, unknown>; newValues: Record<string, unknown> };

const NEUTRAL = 'Thanh toán đợt hợp đồng';
const TYPED = 'Thanh toán đợt 2';
const INTERNAL = {
  ghiChu: 'UNC FT26161873245 link chứng từ',
  note: 'nội bộ ghi chú',
  ghiChuNoiBo: 'chỉ nhân viên xem',
};
const NOTE_ONLY_VARIANTS: Array<[string, Record<string, string>]> = [
  ['ghiChu', { ghiChu: INTERNAL.ghiChu }],
  ['note', { note: INTERNAL.note }],
  ['ghiChuNoiBo', { ghiChuNoiBo: INTERNAL.ghiChuNoiBo }],
  ['cả ba', INTERNAL],
];
const PAYMENT_TYPES = ['THANH_TOAN_XAC_NHAN', 'THANH_TOAN_TAT_TOAN', 'THANH_TOAN_CONG_NO'] as const;
const BASE = { tenKhachHang: 'Công ty A', sdt: '0912345678', soHopDong: 'HD-2026-0002', ngayThanhToan: '07/10/2026' };

async function build(messageType: ZnsMessage['messageType'], payload: Record<string, unknown>): Promise<Built> {
  const now = new Date().toISOString();
  const message: ZnsMessage = {
    id: 'note-spec', messageType, entityId: 'PAY-1', entityType: 'PAYMENT', phone: '0912345678', trackingId: 'T1',
    attemptBucket: 0, retryCount: 0, status: 'INIT', createdAt: now, updatedAt: now, payload,
  };
  return (await znsPayloadBuilder.buildPayload(message, 'note-spec-key')) as unknown as Built;
}

describe('zns-payload.builder – hành vi: ghi chú nội bộ không bao giờ thành ghi_chu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mỗi lần gọi trả một đối tượng MỚI: buildPayload sửa chính đối tượng bộ dựng mẫu trả về (bỏ __version, gán ghi_chu),
    // nên dùng chung một đối tượng (mockResolvedValue) sẽ làm ghi_chu của ca trước rò sang ca sau.
    vi.mocked(templateRendererService.render).mockImplementation(async () => ({ __version: 1 }));
  });

  it.each(PAYMENT_TYPES)('%s: chỉ có ghi chú nội bộ → ghi_chu là câu trung tính, không chuỗi nội bộ nào lọt vào template_data', async (type) => {
    for (const [name, notes] of NOTE_ONLY_VARIANTS) {
      const { template_data } = await build(type, { ...BASE, ...notes });
      expect(template_data.ghi_chu, `${type} / ${name}`).toBe(NEUTRAL);
      const dump = JSON.stringify(template_data);
      for (const text of Object.values(notes)) expect(dump, `${type} / ${name}`).not.toContain(text);
    }
  });

  it.each(PAYMENT_TYPES)('%s: ghi_chu đã dựng cho khách được giữ nguyên, ghi chú nội bộ đi kèm bị bỏ qua', async (type) => {
    const { template_data } = await build(type, { ...BASE, ghi_chu: TYPED, ...INTERNAL });
    expect(template_data.ghi_chu, type).toBe(TYPED);
    const dump = JSON.stringify(template_data);
    for (const text of Object.values(INTERNAL)) expect(dump, type).not.toContain(text);
  });

  it('đường CNV của mẫu thanh toán: data.ghi_chu và newValues.ghi_chu cũng chỉ là câu đã dựng hoặc câu trung tính', async () => {
    const notesOnly = await build('THANH_TOAN_XAC_NHAN', { ...BASE, ...INTERNAL });
    expect(notesOnly.data.ghi_chu).toBe(NEUTRAL);
    expect(notesOnly.newValues.ghi_chu).toBe(NEUTRAL);

    const typed = await build('THANH_TOAN_XAC_NHAN', { ...BASE, ghi_chu: TYPED, ...INTERNAL });
    expect(typed.data.ghi_chu).toBe(TYPED);
    expect(typed.newValues.ghi_chu).toBe(TYPED);
  });

  it('dòng ghi_chu dùng chung của đường CNV (khi bộ biến chưa có ghi_chu): cũng không lấy ghi chú nội bộ', async () => {
    // CUSTOMER_PRE_QUOTE không đòi ghi_chu nên template_data không có ghi_chu: giá trị trong data/newValues do chính dòng dựng chung quyết định.
    for (const [name, notes] of NOTE_ONLY_VARIANTS) {
      const built = await build('CUSTOMER_PRE_QUOTE', { ...BASE, ...notes });
      expect(built.template_data.ghi_chu, `${name}: tiền đề`).toBeUndefined();
      expect(built.newValues.ghi_chu, name).toBe(NEUTRAL);
      expect(built.data.ghi_chu, name).toBe(NEUTRAL);
    }

    const typed = await build('CUSTOMER_PRE_QUOTE', { ...BASE, ghi_chu: TYPED, ...INTERNAL });
    expect(typed.template_data.ghi_chu).toBeUndefined();
    expect(typed.newValues.ghi_chu).toBe(TYPED);
    expect(typed.data.ghi_chu).toBe(TYPED);
  });
});

// Lớp phụ: bẫy văn bản. Chỉ bắt đúng kiểu viết cũ (một dòng vừa có ghi_chu vừa có từ ghiChu); các cách viết khác
// (p.note, ghiChuNoiBo, gán trên nhiều dòng, qua biến trung gian) chỉ các ca hành vi ở trên mới bắt được.
describe('zns-payload.builder – bẫy văn bản (lớp phụ)', () => {
  it('không còn dòng nào gán ghi_chu từ p.ghiChu', () => {
    const src = fs.readFileSync(path.resolve(__dirname, 'zns-payload.builder.ts'), 'utf8');
    const offending = src.split(/\r?\n/).map((line, i) => ({ line, no: i + 1 })).filter(({ line }) => /ghi_chu/.test(line) && /\bghiChu\b/.test(line));
    expect(offending).toEqual([]);
  });
});
