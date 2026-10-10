import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { cronServiceMock } = vi.hoisted(() => {
  process.env.CRON_SECRET = 'test-secret';
  return {
    cronServiceMock: {
      syncCustomerSnapshots: vi.fn().mockResolvedValue({ processed: 0 }),
      processOutbox: vi.fn().mockResolvedValue({ processed: 0 }),
      cleanupExpiredLocks: vi.fn().mockResolvedValue({ deletedCount: 0 }),
      logHeartbeat: vi.fn().mockResolvedValue(undefined),
    }
  };
});

vi.mock('../services/cron/cron.service', () => ({ cronService: cronServiceMock }));
vi.mock('../services/alerting.service', () => ({ sendZaloAlert: vi.fn() }));
vi.mock('../config/supabase.admin', () => {
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    count: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ data: () => ({ count: 0 }) }) })),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    doc: vi.fn(() => ({ get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }) })),
  });
  return {
    adminDb: { collection: vi.fn(() => makeQuery()) },
    adminAuth: { verifyIdToken: vi.fn().mockRejectedValue(new Error('invalid token')) },
    isSupabaseAdminConfigured: false,
    supabaseAdmin: {},
  };
});

import cronRoutes from './cron.routes';

const app = express();
app.use(express.json());
app.use('/api/cron', cronRoutes);
const auth = { Authorization: 'Bearer test-secret' };

describe('cron.routes – Đợt 0A: gỡ sync-snapshots và preview, giữ process-outbox', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /api/cron/sync-snapshots trả 410 SYNC_REMOVED kể cả khi CRON_SECRET đúng; không gọi syncCustomerSnapshots', async () => {
    const res = await request(app).post('/api/cron/sync-snapshots').set(auth).send({});
    expect(res.status).toBe(410);
    expect(res.body).toEqual({
      success: false,
      code: 'SYNC_REMOVED',
      error: 'Tác vụ đồng bộ hồ sơ khách sang chứng từ đã được gỡ (Đợt 0A).'
    });
    expect(cronServiceMock.syncCustomerSnapshots).not.toHaveBeenCalled();
    expect(cronServiceMock.logHeartbeat).not.toHaveBeenCalled();
  });

  it('POST /api/cron/sync-snapshots không có token cũng trả 410 (không còn 401)', async () => {
    const res = await request(app).post('/api/cron/sync-snapshots').send({});
    expect(res.status).toBe(410);
  });

  it('POST /api/cron/preview trả 410 CRON_PREVIEW_REMOVED với mọi jobId', async () => {
    for (const jobId of ['sync-snapshots', 'outbox', 'khac']) {
      const res = await request(app).post('/api/cron/preview').set(auth).send({ jobId });
      expect(res.status, jobId).toBe(410);
      expect(res.body.code).toBe('CRON_PREVIEW_REMOVED');
    }
  });

  it('POST /api/cron/process-outbox vẫn đòi xác thực: không token → 401', async () => {
    const res = await request(app).post('/api/cron/process-outbox').send({});
    expect(res.status).toBe(401);
    expect(cronServiceMock.processOutbox).not.toHaveBeenCalled();
  });

  it('POST /api/cron/process-outbox với CRON_SECRET đúng → 200 và processOutbox được gọi', async () => {
    const res = await request(app).post('/api/cron/process-outbox').set(auth).send({});
    expect(res.status).toBe(200);
    expect(cronServiceMock.processOutbox).toHaveBeenCalledTimes(1);
  });

  it('POST /api/cron/cleanup-locks với CRON_SECRET đúng → 200 và cleanupExpiredLocks được gọi', async () => {
    const res = await request(app).post('/api/cron/cleanup-locks').set(auth).send({});
    expect(res.status).toBe(200);
    expect(cronServiceMock.cleanupExpiredLocks).toHaveBeenCalledTimes(1);
  });
});
