import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb, whereCalls, executeMock, bulkEnqueueMock } = vi.hoisted(() => {
  const whereCalls: unknown[][] = [];
  const makeQuery = (): any => ({
    where: vi.fn((...args: unknown[]) => { whereCalls.push(args); return makeQuery(); }),
    limit: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    })),
  });
  return {
    whereCalls,
    fakeAdminDb: { collection: vi.fn(() => makeQuery()), batch: vi.fn(), runTransaction: vi.fn() },
    executeMock: vi.fn().mockResolvedValue({ status: 'SENT_WAITING', messageId: 'msg-1' }),
    bulkEnqueueMock: vi.fn(),
  };
});

vi.mock('../config/supabase.admin', () => ({
  adminDb: fakeAdminDb,
  adminAuth: { verifyIdToken: vi.fn() },
  toTableName: (name: string) => name,
  isSupabaseAdminConfigured: false,
  supabaseAdmin: {},
}));
vi.mock('../../modules/messaging/application/use-cases/SendZnsMessage', () => ({
  SendZnsMessageUseCase: class { execute = executeMock; },
}));
vi.mock('../../modules/messaging/infrastructure/ZnsRepoSupabase', () => ({
  znsRepository: { findById: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../../modules/messaging/infrastructure/MultiProviderZnsVendor', () => ({ multiProviderZnsVendor: {} }));
vi.mock('../../modules/messaging/application/handlers/EntityEventsHandler', () => ({}));
vi.mock('../services/zns/zalo-token-manager.service', () => ({ zaloTokenManager: {} }));
vi.mock('../services/zns/vendor-webhook.handler', () => ({ vendorWebhookHandler: { handleResult: vi.fn() } }));
vi.mock('../services/zns/outbound-helpers', () => ({ bulkEnqueueHelper: bulkEnqueueMock, resolveVendorUrl: vi.fn() }));
vi.mock('../services/zns/zns-payload.builder', () => ({
  znsPayloadBuilder: {},
  sanitizeZnsCustomerName: (s: string) => s,
  sanitizeZnsPersonName: (s: string) => s,
}));
vi.mock('../lib/resilient-transport', () => ({ resilientFetch: vi.fn() }));

import znsRoutes from './zns.routes';

const app = express();
app.use(express.json());
app.use('/api/zns', znsRoutes);

const BULK_BODY = {
  success: false,
  code: 'BULK_ZNS_LOCKED',
  error: 'Gửi ZNS hàng loạt đã tạm khóa (Đợt 0A). Vui lòng gửi từng chứng từ.'
};

describe('zns.routes – Đợt 0A: khóa gửi hàng loạt, giữ gửi lẻ, bỏ tra khách theo tên', () => {
  beforeEach(() => { vi.clearAllMocks(); whereCalls.length = 0; });

  it('POST /api/zns/bulk-send trả 410 BULK_ZNS_LOCKED và không gọi bulkEnqueueHelper', async () => {
    const res = await request(app).post('/api/zns/bulk-send').send({
      requests: [{ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '0912345678' }]
    });
    expect(res.status).toBe(410);
    expect(res.body).toEqual(BULK_BODY);
    expect(bulkEnqueueMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('POST /api/zns/replay-dlq trả 410 và không gửi lại tin nào', async () => {
    const res = await request(app).post('/api/zns/replay-dlq').send({ filter: true });
    expect(res.status).toBe(410);
    expect(res.body).toEqual(BULK_BODY);
    expect(executeMock).not.toHaveBeenCalled();
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('POST /api/zns/replay trả 410 và không đổi trạng thái tin', async () => {
    const res = await request(app).post('/api/zns/replay').send({ messageId: 'msg-1' });
    expect(res.status).toBe(410);
    expect(res.body).toEqual(BULK_BODY);
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('gửi lẻ vẫn chạy: POST /api/zns/send cho báo giá không gắn khách → 200, dùng tên trên chứng từ, KHÔNG tra customers theo tenKhachHang', async () => {
    const res = await request(app).post('/api/zns/send').send({
      entityId: 'q-khong-gan-khach',
      entityType: 'QUOTATION',
      messageType: 'BAOGIA',
      phone: '0912345678',
      payload: { tenKhachHang: 'Công Ty Thép Sài Gòn', soPhieuBaoGia: 'BGM-2026-0100' }
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, messageId: 'msg-1', status: 'SENT_WAITING' });
    expect(executeMock).toHaveBeenCalledTimes(1);
    const sentPayload = executeMock.mock.calls[0][0].payload;
    expect(sentPayload.tenKhachHang).toBe('Công Ty Thép Sài Gòn');
    expect(sentPayload.phone).toBe('0912345678');
    expect(whereCalls.some(args => args[0] === 'tenKhachHang')).toBe(false);
  });

  it('gửi lẻ: thiếu entityId → 400; SĐT sai → 400 INVALID_PHONE', async () => {
    const r1 = await request(app).post('/api/zns/send').send({ entityType: 'QUOTATION', messageType: 'BAOGIA' });
    expect(r1.status).toBe(400);
    const r2 = await request(app).post('/api/zns/send').send({ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '12' });
    expect(r2.status).toBe(400);
    expect(r2.body.code).toBe('INVALID_PHONE');
    expect(executeMock).not.toHaveBeenCalled();
  });
});
