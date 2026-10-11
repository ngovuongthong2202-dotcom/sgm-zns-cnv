import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { kpisMock, fakeAdminDb } = vi.hoisted(() => ({
  kpisMock: vi.fn(),
  fakeAdminDb: { collection: vi.fn(() => ({ doc: vi.fn(() => ({ set: vi.fn().mockResolvedValue(undefined), get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }) })) })) },
}));

vi.mock('../config/supabase.admin', () => ({ adminDb: fakeAdminDb, adminAuth: { verifyIdToken: vi.fn() }, toTableName: (n: string) => n, isSupabaseAdminConfigured: false, supabaseAdmin: {} }));
vi.mock('../../modules/reporting/infrastructure/metrics/metrics-rollup.service', () => ({ metricsRollupService: { runRollup: vi.fn().mockResolvedValue(undefined), runCustomRollup: vi.fn() } }));
vi.mock('../../modules/reporting/application/queries/GetDashboardKpis', () => ({ GetDashboardKpis: { execute: kpisMock } }));

import analyticsRoutes from './analytics.routes';

const app = express();
app.use(express.json());
app.use('/api/analytics', analyticsRoutes);

const FORBIDDEN_KEYS = ['phone', 'sdt', 'payload', 'customerName', 'tenKhachHang', 'noiDung'];
function collectKeys(value: unknown, out: Set<string> = new Set()): Set<string> {
  if (Array.isArray(value)) value.forEach(v => collectKeys(v, out));
  else if (value && typeof value === 'object') Object.entries(value as Record<string, unknown>).forEach(([k, v]) => { out.add(k); collectKeys(v, out); });
  return out;
}
const freshKpis = () => ({
  generatedAt: new Date().toISOString(),
  updateTime: '1760000000000',
  stats: { khachCanCham: 1 },
  zns: {
    total: 2, sentToday: 1,
    recentZns: [
      { id: 'm1', status: 'SUCCESS', messageType: 'BAOGIA', entityType: 'QUOTATION', entityId: 'q1', createdAt: '2026-10-10T01:00:00.000Z', phone: '0912345678', payload: { tenKhachHang: 'Công ty A', noiDung: 'Báo giá 1 tỷ' } },
      { id: 'm2', status: 'FAILED', messageType: 'THANH_TOAN_XAC_NHAN', entityType: 'PAYMENT', entityId: 'p1', createdAt: '2026-10-11T01:00:00.000Z', sdt: '0987654321', customerName: 'Công ty B' },
    ],
  },
});

describe('analytics.routes – Đợt 0A (BM01): /today không trả SĐT và nội dung tin', () => {
  beforeEach(() => { vi.clearAllMocks(); kpisMock.mockResolvedValue(freshKpis()); });

  it('recentZns chỉ còn id/status/messageType/entityType/entityId/createdAt, sắp mới nhất trước; không khóa nào lộ SĐT/nội dung', async () => {
    const res = await request(app).get('/api/analytics/today');
    expect(res.status).toBe(200);
    expect(res.body.data.zns.recentZns).toEqual([
      { id: 'm2', status: 'FAILED', messageType: 'THANH_TOAN_XAC_NHAN', entityType: 'PAYMENT', entityId: 'p1', createdAt: '2026-10-11T01:00:00.000Z' },
      { id: 'm1', status: 'SUCCESS', messageType: 'BAOGIA', entityType: 'QUOTATION', entityId: 'q1', createdAt: '2026-10-10T01:00:00.000Z' },
    ]);
    const keys = collectKeys(res.body.data.zns.recentZns);
    for (const k of FORBIDDEN_KEYS) expect(keys.has(k), k).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('0912345678');
    expect(JSON.stringify(res.body)).not.toContain('0987654321');
    expect(res.body.data.zns.total).toBe(2);
    expect(res.body.data.stats).toEqual({ khachCanCham: 1 });
  });

  it('giữ ETag: If-None-Match khớp → 304', async () => {
    const first = await request(app).get('/api/analytics/today');
    const etag = first.headers.etag;
    expect(etag).toBe('W/"1760000000000"');
    const second = await request(app).get('/api/analytics/today').set('If-None-Match', etag);
    expect(second.status).toBe(304);
  });

  it('bản tổng hợp không có zns → vẫn 200, không ném', async () => {
    kpisMock.mockResolvedValue({ generatedAt: new Date().toISOString(), updateTime: '1', stats: {} });
    const res = await request(app).get('/api/analytics/today');
    expect(res.status).toBe(200);
    expect(res.body.data.zns).toBeUndefined();
  });
});
