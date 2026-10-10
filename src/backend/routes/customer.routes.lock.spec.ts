import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb, cronServiceMock } = vi.hoisted(() => {
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    orderBy: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    })),
  });
  return {
    fakeAdminDb: {
      collection: vi.fn(() => makeQuery()),
      batch: vi.fn(() => ({ update: vi.fn(), set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) })),
      runTransaction: vi.fn(),
    },
    cronServiceMock: { syncCustomerSnapshots: vi.fn().mockResolvedValue({ processed: 0 }) },
  };
});

vi.mock('../config/supabase.admin', () => ({
  adminDb: fakeAdminDb,
  adminAuth: { verifyIdToken: vi.fn() },
  toTableName: (name: string) => name,
  isSupabaseAdminConfigured: false,
  supabaseAdmin: {},
}));
vi.mock('../services/cron/cron.service', () => ({ cronService: cronServiceMock }));
vi.mock('../../modules/reporting/ai', () => ({ aiService: {} }));
vi.mock('../services/workflow/sequence-generator.service', () => ({
  sequenceGeneratorService: { getNextCode: vi.fn().mockResolvedValue('KH0001') },
}));

import customerRoutes from './customer.routes';

const app = express();
app.use(express.json());
app.use('/api/customers', customerRoutes);

const MERGE_BODY = {
  success: false,
  code: 'MERGE_LOCKED',
  error: 'Chức năng gộp khách hàng đang tạm khóa để nâng cấp an toàn (Đợt 0A).'
};

describe('customer.routes – Đợt 0A: khóa gộp (403), gỡ trigger-sync (410)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /api/customers/merge trả 403 MERGE_LOCKED và không tạo batch/đọc CSDL', async () => {
    const res = await request(app).post('/api/customers/merge')
      .send({ targetCustomerId: 'a', sourceCustomerIds: ['b'], userEmail: 'x@sgm.vn' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual(MERGE_BODY);
    expect(fakeAdminDb.batch).not.toHaveBeenCalled();
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('POST /api/customers/rollback-merge trả 403 MERGE_LOCKED', async () => {
    const res = await request(app).post('/api/customers/rollback-merge').send({ auditLogId: 'audit-1' });
    expect(res.status).toBe(403);
    expect(res.body).toEqual(MERGE_BODY);
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('GET /api/customers/merge-history trả 403 MERGE_LOCKED', async () => {
    const res = await request(app).get('/api/customers/merge-history');
    expect(res.status).toBe(403);
    expect(res.body).toEqual(MERGE_BODY);
  });

  it('POST /api/customers/trigger-sync trả 410 SYNC_REMOVED và không gọi cronService', async () => {
    const res = await request(app).post('/api/customers/trigger-sync').send({});
    expect(res.status).toBe(410);
    expect(res.body).toEqual({
      success: false,
      code: 'SYNC_REMOVED',
      error: 'Tác vụ đồng bộ hồ sơ khách sang chứng từ đã được gỡ (Đợt 0A).'
    });
    expect(cronServiceMock.syncCustomerSnapshots).not.toHaveBeenCalled();
  });

  it('đối chứng: POST /api/customers/generate-makh vẫn trả 200 với mã mới', async () => {
    const res = await request(app).post('/api/customers/generate-makh').send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, maKh: 'KH0001' });
  });

  it('đối chứng: POST /api/customers/check-duplicate thiếu dữ liệu vẫn trả 400 (đường giữ nguyên)', async () => {
    const res = await request(app).post('/api/customers/check-duplicate').send({});
    expect(res.status).toBe(400);
  });
});
