import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb, addMock, batchMock } = vi.hoisted(() => {
  process.env.CRON_SECRET = 'test-secret';
  const addMock = vi.fn().mockResolvedValue({ id: 'audit-1' });
  const batchMock = { update: vi.fn(), set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    orderBy: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    add: addMock,
    doc: vi.fn(() => ({
      id: 'new-id',
      get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    })),
  });
  return {
    addMock,
    batchMock,
    fakeAdminDb: { collection: vi.fn((_name: string) => makeQuery()), batch: vi.fn(() => batchMock), runTransaction: vi.fn() },
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
  sequenceGeneratorService: { getNextCode: vi.fn().mockResolvedValue('KH0001') },
}));

import workflowRoutes from './workflow.routes';

const app = express();
app.use(express.json());
app.use('/api/workflow', workflowRoutes);

const INVALID_ENTITY = {
  success: false,
  code: 'INVALID_ENTITY',
  error: 'Chỉ ghi được 5 bảng nghiệp vụ qua đường quy trình: khách hàng, báo giá, hợp đồng, phiếu thu, phiếu giao.'
};
const calledCollections = () => fakeAdminDb.collection.mock.calls.map(c => c[0]);

describe('workflow.routes – Đợt 0A: chỉ 5 bảng nghiệp vụ, rào đứng trước CSDL', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['users', 'settings', 'znsTemplates', 'auditLogs', 'idempotencyKeys', 'zns_messages'])(
    'POST /api/workflow/create/%s → 400 INVALID_ENTITY, không collection/batch', async (type) => {
      const res = await request(app).post(`/api/workflow/create/${type}`).send({ data: { username: 'x' } });
      expect(res.status).toBe(400);
      expect(res.body).toEqual(INVALID_ENTITY);
      expect(fakeAdminDb.collection).not.toHaveBeenCalled();
      expect(fakeAdminDb.batch).not.toHaveBeenCalled();
    }
  );

  it('PUT /api/workflow/update/settings/zns_config → 400, không đọc/ghi', async () => {
    const res = await request(app).put('/api/workflow/update/settings/zns_config').send({ data: { zaloAccessToken: 'x' } });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(INVALID_ENTITY);
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('DELETE /api/workflow/delete/settings/zns_config {userId:"ghost"} → 400, batch.delete không được gọi (ca lạm dụng BM01)', async () => {
    const res = await request(app).delete('/api/workflow/delete/settings/zns_config').send({ userId: 'ghost' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual(INVALID_ENTITY);
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
    expect(batchMock.delete).not.toHaveBeenCalled();
  });

  it('DELETE /api/workflow/delete/users/admin với x-internal-admin = CRON_SECRET → 400 (rào đứng trước nhánh nội bộ)', async () => {
    const res = await request(app).delete('/api/workflow/delete/users/admin').set('x-internal-admin', 'test-secret').send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ENTITY');
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('POST /api/workflow/restore/users/admin → 400, không chạm CSDL', async () => {
    const res = await request(app).post('/api/workflow/restore/users/admin').send({ userId: 'ghost' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('INVALID_ENTITY');
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('next-code: /users → 400; /payment vẫn 200 với mã từ bộ cấp số', async () => {
    const bad = await request(app).get('/api/workflow/next-code/users');
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_ENTITY');
    const ok = await request(app).post('/api/workflow/next-code/payment').send({});
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ success: true, code: 'KH0001' });
  });

  it('đối chứng: /create/customers và /create/customer đi vào nhánh nghiệp vụ (có đọc CSDL, không phải INVALID_ENTITY)', async () => {
    for (const type of ['customers', 'customer']) {
      vi.clearAllMocks();
      const res = await request(app).post(`/api/workflow/create/${type}`).send({ data: { tenKhachHang: 'Khách thử', sdt: '0912345678' } });
      expect(res.body.code, type).not.toBe('INVALID_ENTITY');
      expect(fakeAdminDb.collection, type).toHaveBeenCalled();
    }
  });

  it('check-gate: parentDocType "users" → 400 không chạm CSDL; "contracts" đi tiếp như cũ', async () => {
    const bad = await request(app).post('/api/workflow/check-gate').send({ targetEntity: 'PAYMENT', parentId: 'admin', parentDocType: 'users' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('INVALID_ENTITY');
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
    const ok = await request(app).post('/api/workflow/check-gate').send({ targetEntity: 'PAYMENT', parentId: 'c1', parentDocType: 'contracts' });
    expect(ok.body.code).not.toBe('INVALID_ENTITY');
    expect(calledCollections()).toContain('contracts');
  });

  describe('POST /api/workflow/zns-manual-bypass (thay cho /create/auditLogs)', () => {
    it('ghi một dòng auditLogs với action cố định ZNS_MANUAL_BYPASS, chỉ nhận các trường cho phép', async () => {
      const res = await request(app).post('/api/workflow/zns-manual-bypass').send({
        entityType: 'quotation', docId: 'q1', previousStatus: 'CHỜ GỬI', userId: 'u1', action: 'DELETE', entityTypeKhac: 'users'
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(calledCollections()).toEqual(['auditLogs']);
      expect(addMock).toHaveBeenCalledTimes(1);
      const row = addMock.mock.calls[0][0];
      expect(row.action).toBe('ZNS_MANUAL_BYPASS');
      expect(row.entityId).toBe('q1');
      expect(row.entityType).toBe('quotation');
      expect(row.userId).toBe('u1');
      expect(row.details).toEqual({ previousStatus: 'CHỜ GỬI', newStatus: 'THÀNH CÔNG', note: 'Người dùng xác nhận ZNS thành công thủ công do webhook trễ.' });
      expect(Object.keys(row).sort()).toEqual(['action', 'details', 'entityId', 'entityType', 'timestamp', 'userId']);
    });

    it('entityType lạ hoặc thiếu docId → 400 INVALID_BYPASS, không ghi', async () => {
      const r1 = await request(app).post('/api/workflow/zns-manual-bypass').send({ entityType: 'users', docId: 'admin' });
      expect(r1.status).toBe(400);
      expect(r1.body.code).toBe('INVALID_BYPASS');
      const r2 = await request(app).post('/api/workflow/zns-manual-bypass').send({ entityType: 'payment', docId: '   ' });
      expect(r2.status).toBe(400);
      expect(addMock).not.toHaveBeenCalled();
      expect(fakeAdminDb.collection).not.toHaveBeenCalled();
    });
  });
});
