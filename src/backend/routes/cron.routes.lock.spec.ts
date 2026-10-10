import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { cronServiceMock, fakeAdminDb } = vi.hoisted(() => {
  process.env.CRON_SECRET = 'test-secret';
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    count: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) })),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }) })),
  });
  return {
    cronServiceMock: {
      processOutbox: vi.fn().mockResolvedValue({ processed: 0 }),
      cleanupExpiredLocks: vi.fn().mockResolvedValue({ deletedCount: 0 }),
      logHeartbeat: vi.fn().mockResolvedValue(undefined),
    },
    fakeAdminDb: { collection: vi.fn(() => makeQuery()) },
  };
});

vi.mock('../services/cron/cron.service', () => ({ cronService: cronServiceMock }));
vi.mock('../services/alerting.service', () => ({ sendZaloAlert: vi.fn() }));
vi.mock('../config/supabase.admin', () => ({
  adminDb: fakeAdminDb,
  adminAuth: { verifyIdToken: vi.fn().mockRejectedValue(new Error('invalid token')) },
  isSupabaseAdminConfigured: false,
  supabaseAdmin: {},
}));

import cronRoutes from './cron.routes';

const app = express();
app.use(express.json());
app.use('/api/cron', cronRoutes);
const auth = { Authorization: 'Bearer test-secret' };

describe('cron.routes – Đợt 0A: gỡ sync-snapshots và preview, giữ process-outbox', () => {
  beforeEach(() => vi.clearAllMocks());

  // Bằng chứng "không chạm CSDL" cho các đường đã gỡ: adminDb giả (đúng đối tượng cron.routes.ts nhập) không bị gọi.
  // adminDb giả chỉ có collection; gọi hàm khác của nó sẽ lỗi 500 và trượt kiểm tra mã 410.
  const expectNoDbAccess = () => {
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  };

  it('POST /api/cron/sync-snapshots trả 410 SYNC_REMOVED kể cả khi CRON_SECRET đúng; không chạm CSDL', async () => {
    const res = await request(app).post('/api/cron/sync-snapshots').set(auth).send({});
    expect(res.status).toBe(410);
    expect(res.body).toEqual({
      success: false,
      code: 'SYNC_REMOVED',
      error: 'Tác vụ đồng bộ hồ sơ khách sang chứng từ đã được gỡ (Đợt 0A).'
    });
    expect(cronServiceMock.logHeartbeat).not.toHaveBeenCalled();
    expectNoDbAccess();
  });

  it('POST /api/cron/sync-snapshots không có token cũng trả 410 (không còn 401) và không chạm CSDL', async () => {
    const res = await request(app).post('/api/cron/sync-snapshots').send({});
    expect(res.status).toBe(410);
    expectNoDbAccess();
  });

  it('POST /api/cron/preview trả 410 CRON_PREVIEW_REMOVED với mọi jobId và không chạm CSDL', async () => {
    for (const jobId of ['sync-snapshots', 'outbox', 'khac']) {
      const res = await request(app).post('/api/cron/preview').set(auth).send({ jobId });
      expect(res.status, jobId).toBe(410);
      expect(res.body.code).toBe('CRON_PREVIEW_REMOVED');
    }
    expectNoDbAccess();
  });

  it('POST /api/cron/process-outbox vẫn đòi xác thực: không token → 401', async () => {
    const res = await request(app).post('/api/cron/process-outbox').send({});
    expect(res.status).toBe(401);
    expect(cronServiceMock.processOutbox).not.toHaveBeenCalled();
  });

  it('POST /api/cron/process-outbox với token sai → 401, không chạy processOutbox', async () => {
    const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: 'Bearer wrong' }).send({});
    expect(res.status).toBe(401);
    expect(cronServiceMock.processOutbox).not.toHaveBeenCalled();
  });

  it('POST /api/cron/process-outbox với CRON_SECRET đúng → 200 và processOutbox được gọi', async () => {
    const res = await request(app).post('/api/cron/process-outbox').set(auth).send({});
    expect(res.status).toBe(200);
    expect(cronServiceMock.processOutbox).toHaveBeenCalledTimes(1);
    // Đối chứng cho expectNoDbAccess: đường còn chạy đọc CSDL qua đúng adminDb giả này (đếm tin DLQ/FAILED).
    expect(fakeAdminDb.collection).toHaveBeenCalled();
  });

  it('POST /api/cron/cleanup-locks với CRON_SECRET đúng → 200 và cleanupExpiredLocks được gọi', async () => {
    const res = await request(app).post('/api/cron/cleanup-locks').set(auth).send({});
    expect(res.status).toBe(200);
    expect(cronServiceMock.cleanupExpiredLocks).toHaveBeenCalledTimes(1);
  });
});
