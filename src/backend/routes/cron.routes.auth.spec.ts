import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const LEGACY_DEV_TOKEN = 'sgm_admin_dev_token'; // như supabase.admin.auth.spec.ts

const { cronServiceMock, fakeAdminDb } = vi.hoisted(() => {
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
// Giữ adminAuth THẬT (đó là thứ cần kiểm), chỉ thay adminDb.
vi.mock('../config/supabase.admin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/supabase.admin')>();
  return { ...actual, adminDb: fakeAdminDb };
});

import cronRoutes from './cron.routes';

const app = express();
app.use(express.json());
app.use('/api/cron', cronRoutes);

describe('cron.routes.verifyCronAuth – Đợt 0A (BM02): mã viết cứng → 401 ở production; thiếu CRON_SECRET chỉ mở ở development', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('production + CRON_SECRET đặt: Bearer <mã viết cứng cũ> → 401, processOutbox không chạy (nghiệm thu "Gửi mã viết cứng → 401")', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
    const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: `Bearer ${LEGACY_DEV_TOKEN}` }).send({});
    expect(res.status).toBe(401);
    expect(cronServiceMock.processOutbox).not.toHaveBeenCalled();
  });

  it('production + DEV_BYPASS_AUTH=true: cùng yêu cầu vẫn 401', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'test-secret');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: `Bearer ${LEGACY_DEV_TOKEN}` }).send({});
    expect(res.status).toBe(401);
    expect(cronServiceMock.processOutbox).not.toHaveBeenCalled();
  });

  it('production KHÔNG có CRON_SECRET: token lạ → 401 (chốt hồi quy production)', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
    const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: 'Bearer bat-ky' }).send({});
    expect(res.status).toBe(401);
  });

  // Đường vòng cũ mở cho mọi NODE_ENV khác production; nay chỉ development: 'test', 'staging' và giá trị rỗng phải bị đóng.
  it.each(['test', 'staging', ''])(
    'NODE_ENV=%s (không phải development), thiếu CRON_SECRET → 401, không chạy outbox',
    async (nodeEnv) => {
      vi.stubEnv('NODE_ENV', nodeEnv);
      vi.stubEnv('CRON_SECRET', '');
      vi.stubEnv('DEV_BYPASS_AUTH', 'false');
      const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: 'Bearer bat-ky' }).send({});
      expect(res.status).toBe(401);
      expect(cronServiceMock.processOutbox).not.toHaveBeenCalled();
    }
  );

  it('development KHÔNG có CRON_SECRET: → 200 (giữ tiện ích máy phát triển)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('CRON_SECRET', '');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
    const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: 'Bearer bat-ky' }).send({});
    expect(res.status).toBe(200);
    expect(cronServiceMock.processOutbox).toHaveBeenCalledTimes(1);
  });

  it('đối chứng: CRON_SECRET đúng → 200', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CRON_SECRET', 'test-secret');
    const res = await request(app).post('/api/cron/process-outbox').set({ Authorization: 'Bearer test-secret' }).send({});
    expect(res.status).toBe(200);
  });

  it.each(['/api/cron/rebuild-metrics', '/api/cron/cleanup-locks', '/api/cron/cleanup-storage'])(
    'production: %s với mã viết cứng cũ → 401',
    async (path) => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('CRON_SECRET', 'test-secret');
      vi.stubEnv('DEV_BYPASS_AUTH', 'false');
      const res = await request(app).post(path).set({ Authorization: `Bearer ${LEGACY_DEV_TOKEN}` }).send({});
      expect(res.status).toBe(401);
    }
  );
});
