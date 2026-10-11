import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb } = vi.hoisted(() => {
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    orderBy: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
  });
  return { fakeAdminDb: { collection: vi.fn((_name: string) => makeQuery()) } };
});

vi.mock('../config/supabase.admin', () => ({
  adminDb: fakeAdminDb,
  adminAuth: { verifyIdToken: vi.fn() },
  toTableName: (name: string) => name,
  isSupabaseAdminConfigured: false,
  supabaseAdmin: {},
}));

import { searchRoutes } from './search.routes'; // search.routes.ts chỉ có named export (dòng 187), không có default

const app = express();
app.use('/api/search', searchRoutes);

const INVALID_COLLECTION = {
  success: false,
  code: 'INVALID_COLLECTION',
  error: 'Chỉ tra cứu được 5 bảng nghiệp vụ: khách hàng, báo giá, hợp đồng, phiếu thu, phiếu giao.'
};
const calledCollections = () => fakeAdminDb.collection.mock.calls.map(c => c[0]);

describe('search.routes – Đợt 0A: chỉ 5 bảng nghiệp vụ, rào đứng trước CSDL', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['users', 'settings', 'zns_messages', 'auditLogs', 'znsMessages'])(
    'GET /api/search/%s → 400 INVALID_COLLECTION, adminDb.collection không được gọi', async (coll) => {
      const res = await request(app).get(`/api/search/${coll}`);
      expect(res.status).toBe(400);
      expect(res.body).toEqual(INVALID_COLLECTION);
      expect(fakeAdminDb.collection).not.toHaveBeenCalled();
    }
  );

  it('một phần tử sai là từ chối cả yêu cầu: customers,users?q=a → 400, không chạm CSDL', async () => {
    const res = await request(app).get('/api/search/customers,users?q=a');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_COLLECTION');
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('không chuẩn hóa ngầm: "Customers" (sai hoa thường) và "customers," (phần tử rỗng) → 400', async () => {
    expect((await request(app).get('/api/search/Customers')).status).toBe(400);
    expect((await request(app).get('/api/search/customers,')).status).toBe(400);
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('ô "Hợp đồng, báo giá" của form phiếu thu vẫn tìm được: contracts,quotations?q=hd → 200, đọc đúng hai bảng', async () => {
    const res = await request(app).get('/api/search/contracts,quotations?q=hd');
    expect(res.status).toBe(200);
    expect(calledCollections()).toEqual(expect.arrayContaining(['contracts', 'quotations']));
    expect(calledCollections().every(c => ['contracts', 'quotations'].includes(c))).toBe(true);
  });

  it('đối chứng useDeliveryForm: payments?q=PT-2026&limit=1 → 200 và nhánh nối (contracts/quotations/deliveries) vẫn chạy', async () => {
    const res = await request(app).get('/api/search/payments?q=PT-2026&limit=1');
    expect(res.status).toBe(200);
    expect(calledCollections()).toContain('payments');
  });
});
