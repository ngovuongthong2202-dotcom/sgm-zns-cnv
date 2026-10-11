import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const { fakeAdminDb, batchMock, docFixtures } = vi.hoisted(() => {
  const docFixtures: Record<string, Record<string, unknown>> = {
    'pay-unpaid': { tinhTrangThanhToan: 'Chưa TT', soTien: 0, cacDotThu: [], contractId: 'c1', products: [] },
    'pay-paid': { tinhTrangThanhToan: 'Đã TT', soTien: 100, contractId: 'c1', products: [] },
    'c1': { soHopDong: 'HD-01', products: [] },
  };
  const batchMock = { update: vi.fn(), set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) };
  const makeQuery = (): any => ({
    where: vi.fn(() => makeQuery()),
    limit: vi.fn(() => makeQuery()),
    orderBy: vi.fn(() => makeQuery()),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0 }),
    doc: vi.fn((id?: string) => ({
      id: id || 'new-id',
      get: vi.fn(async () => (id && docFixtures[id])
        ? { exists: true, id, data: (): unknown => docFixtures[id] }
        : { exists: false, data: (): undefined => undefined }),
      update: vi.fn().mockResolvedValue(undefined),
      set: vi.fn().mockResolvedValue(undefined),
    })),
  });
  return {
    docFixtures,
    batchMock,
    fakeAdminDb: { collection: vi.fn(() => makeQuery()), batch: vi.fn(() => batchMock), runTransaction: vi.fn() },
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
  sequenceGeneratorService: { getNextCode: vi.fn().mockResolvedValue('PGH-2026-0001') },
}));

import workflowRoutes from './workflow.routes';

const app = express();
app.use(express.json());
app.use('/api/workflow', workflowRoutes);
const NEW_CODES = ['WAIVER_INCOMPLETE', 'CONTRACT_WITHOUT_RECEIPT'];
const post = (data: Record<string, unknown>) => request(app).post('/api/workflow/create/delivery').send({ data });

describe('workflow.routes – Đợt 0A (GH02): đặc cách cần người duyệt + lý do; hợp đồng chưa có phiếu thu qua công tắc', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllEnvs());

  it('đặc cách bật, có lý do, KHÔNG người duyệt → 422 WAIVER_INCOMPLETE, không chạm CSDL', async () => {
    const res = await post({ contractId: 'c1', dacCachGiaoTruoc: true, lyDoDacCach: 'Giao gấp' });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ success: false, code: 'WAIVER_INCOMPLETE', error: 'Đặc cách giao trước cần người duyệt và lý do.' });
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
    expect(batchMock.commit).not.toHaveBeenCalled();
  });

  it('đặc cách bật, có người duyệt, KHÔNG lý do (hoặc chỉ khoảng trắng) → 422', async () => {
    const r1 = await post({ contractId: 'c1', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam' });
    expect(r1.status).toBe(422);
    const r2 = await post({ contractId: 'c1', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: '   ' });
    expect(r2.status).toBe(422);
    expect(r2.body.code).toBe('WAIVER_INCOMPLETE');
    expect(batchMock.commit).not.toHaveBeenCalled();
  });

  it('ca lạm dụng: dacCachGiaoTruoc là chuỗi "yes", người duyệt là mảng → 422, không phải 500', async () => {
    const res = await post({ contractId: 'c1', dacCachGiaoTruoc: 'yes', nguoiPheDuyetDacCach: ['a'], lyDoDacCach: 'x' });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('WAIVER_INCOMPLETE');
  });

  it('hợp đồng, không paymentId, không đặc cách, DELIVERY_UNPAID_CONTRACT_GUARD=block → 422 CONTRACT_WITHOUT_RECEIPT, không chạm CSDL', async () => {
    vi.stubEnv('DELIVERY_UNPAID_CONTRACT_GUARD', 'block');
    const res = await post({ contractId: 'c1', dacCachGiaoTruoc: false, products: [] });
    expect(res.status).toBe(422);
    expect(res.body).toEqual({ success: false, code: 'CONTRACT_WITHOUT_RECEIPT', error: 'Hợp đồng chưa có phiếu thu: cần đặc cách có người duyệt hoặc lập phiếu thu trước.' });
    expect(fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('cùng yêu cầu khi công tắc chưa bật (mặc định report) → chỉ ghi nhận bằng console.warn [GH02 report-only] và đi tiếp như cũ', async () => {
    vi.stubEnv('DELIVERY_UNPAID_CONTRACT_GUARD', '');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const res = await post({ contractId: 'c1', dacCachGiaoTruoc: false, products: [] });
    expect(NEW_CODES).not.toContain(res.body.code);
    expect(warn.mock.calls.some(c => String(c[0]).includes('[GH02 report-only]'))).toBe(true);
    warn.mockRestore();
  });

  it('phiếu thu Chưa TT, không đặc cách → 422 từ canCreateDelivery (luật cũ giữ nguyên)', async () => {
    const res = await post({ paymentId: 'pay-unpaid', dacCachGiaoTruoc: false, products: [] });
    expect(res.status).toBe(422);
    expect(NEW_CODES).not.toContain(res.body.code);
  });

  it('phiếu thu Chưa TT + đặc cách đủ người duyệt và lý do → qua chốt và được ghi (200, batch.commit một lần)', async () => {
    const res = await post({ paymentId: 'pay-unpaid', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: 'Giao theo tiến độ hợp đồng dự án', products: [] });
    expect(NEW_CODES).not.toContain(res.body.code);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it('đối chứng GH12 (Đợt 1): báo giá không có phiếu thu vẫn như hôm nay (200, được ghi, không phải hai mã mới)', async () => {
    const res = await post({ quotationId: 'q1', products: [] });
    expect(NEW_CODES).not.toContain(res.body.code);
    expect(res.status).toBe(200);
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it('block + hợp đồng + đặc cách đủ người duyệt và lý do, không phiếu thu → 200, ghi một lần (công tắc không chặn ca đặc cách)', async () => {
    vi.stubEnv('DELIVERY_UNPAID_CONTRACT_GUARD', 'block');
    const res = await post({ contractId: 'c1', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Sếp Nam', lyDoDacCach: 'Giao theo tiến độ hợp đồng dự án', products: [] });
    expect(NEW_CODES).not.toContain(res.body.code);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });

  it('block + hợp đồng + phiếu thu đã thu, không đặc cách → không phải CONTRACT_WITHOUT_RECEIPT (công tắc không chặn ca đã có phiếu thu)', async () => {
    vi.stubEnv('DELIVERY_UNPAID_CONTRACT_GUARD', 'block');
    const res = await post({ contractId: 'c1', paymentId: 'pay-paid', dacCachGiaoTruoc: false, products: [] });
    expect(NEW_CODES).not.toContain(res.body.code);
    expect(res.status).toBe(200);
    expect(batchMock.commit).toHaveBeenCalledTimes(1);
  });
});
