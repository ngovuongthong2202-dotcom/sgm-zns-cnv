import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb, fullDataMock, runRollupMock } = vi.hoisted(() => {
  const makeQuery = (): any => ({
    select: vi.fn(() => makeQuery()),
    where: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    doc: vi.fn(() => ({
      get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
      set: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    })),
  });
  return {
    fakeAdminDb: { collection: vi.fn(() => makeQuery()) },
    fullDataMock: vi.fn().mockResolvedValue({ breakdownVatTu: [], breakdownMay: [] }),
    runRollupMock: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../config/supabase.admin', () => ({ adminDb: fakeAdminDb, adminAuth: { verifyIdToken: vi.fn() }, toTableName: (n: string) => n, isSupabaseAdminConfigured: false, supabaseAdmin: {} }));
vi.mock('../../modules/reporting/infrastructure/metrics/metrics-rollup.service', () => ({ metricsRollupService: { runRollup: runRollupMock, runCustomRollup: vi.fn() } }));
vi.mock('../../modules/reporting/application/queries/GetReportsFullData', () => ({ GetReportsFullData: { execute: fullDataMock } }));
vi.mock('../../modules/reporting/ai/ai.service', () => ({ aiService: { generateReportInsight: vi.fn().mockResolvedValue('ok') } }));

import reportsRoutes from './reports.routes';

const app = express();
app.use(express.json());
app.use('/api/reports', reportsRoutes);

describe('reports.routes – Đợt 0A (BM01): /search-index trả 410; full-data và flush không đổi', () => {
  beforeEach(() => vi.clearAllMocks());

  it('GET /api/reports/search-index → 410 SEARCH_INDEX_REMOVED, không đọc customers/users', async () => {
    const res = await request(app).get('/api/reports/search-index');
    expect(res.status).toBe(410);
    expect(res.body).toEqual({ success: false, code: 'SEARCH_INDEX_REMOVED', error: 'Chỉ mục tìm kiếm báo cáo đã được gỡ (Đợt 0A).' });
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('đối chứng: GET /api/reports/full-data → 200 với dữ liệu của GetReportsFullData', async () => {
    const res = await request(app).get('/api/reports/full-data');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { breakdownVatTu: [], breakdownMay: [] } });
  });

  it('đối chứng: POST /api/reports/flush → 200 và chạy runRollup (đường này vẫn mở tới B2 – phần còn mở của báo cáo cổng)', async () => {
    const res = await request(app).post('/api/reports/flush').send({});
    expect(res.status).toBe(200);
    expect(runRollupMock).toHaveBeenCalledTimes(1);
  });
});
