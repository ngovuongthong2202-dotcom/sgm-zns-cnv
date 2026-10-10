import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb } = vi.hoisted(() => {
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    orderBy: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    })),
  });
  return {
    fakeAdminDb: {
      collection: vi.fn(() => makeQuery()),
      batch: vi.fn(() => ({ update: vi.fn(), set: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) })),
      runTransaction: vi.fn(),
    },
  };
});

vi.mock('../config/supabase.admin', () => ({
  adminDb: fakeAdminDb,
  adminAuth: { verifyIdToken: vi.fn() },
  toTableName: (name: string) => name,
  isSupabaseAdminConfigured: false,
  supabaseAdmin: {},
}));
vi.mock('../services/workflow/sequence-generator.service', () => ({
  sequenceGeneratorService: { getNextCode: vi.fn().mockResolvedValue('BGM-2026-0001') },
}));

import workflowRoutes from './workflow.routes';

const app = express();
app.use(express.json());
app.use('/api/workflow', workflowRoutes);

describe('workflow.routes – Đợt 0A: khóa reconcile-duplicates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POST /api/workflow/reconcile-duplicates trả 403 RECONCILE_LOCKED và không đọc bảng báo giá', async () => {
    const res = await request(app).post('/api/workflow/reconcile-duplicates').send({});
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      success: false,
      code: 'RECONCILE_LOCKED',
      error: 'Công cụ tự đánh số lại báo giá trùng đã bị khóa (Đợt 0A).'
    });
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('đối chứng: GET /api/workflow/next-code/quotation vẫn trả mã', async () => {
    const res = await request(app).get('/api/workflow/next-code/quotation?loai=MAY');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, code: 'BGM-2026-0001' });
  });
});
