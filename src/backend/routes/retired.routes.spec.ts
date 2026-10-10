import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { retired, RETIRED, retiredRoutes } from './retired.routes';

describe('retired.routes (Đợt 0A) – trả lời cố định cho các đường đã khóa/gỡ', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', retiredRoutes);
  app.post('/api/demo-403', retired(403, 'MERGE_LOCKED', 'khóa thử'));
  app.post('/api/demo-merge', RETIRED.merge);

  it('retired() trả đúng mã và thân JSON cố định, bỏ qua nội dung gửi lên', async () => {
    const res = await request(app).post('/api/demo-403').set('Authorization', 'Bearer bat-ky').send({ anything: 1 });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ success: false, code: 'MERGE_LOCKED', error: 'khóa thử' });
  });

  it('RETIRED.merge dùng đúng câu chữ trong bảng mã', async () => {
    const res = await request(app).post('/api/demo-merge').send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('MERGE_LOCKED');
    expect(res.body.error).toBe('Chức năng gộp khách hàng đang tạm khóa để nâng cấp an toàn (Đợt 0A).');
  });

  it.each([
    ['post', '/api/migration/run-phase6'],
    ['post', '/api/migration/standardize-entities'],
    ['post', '/api/migration/denormalize-customers'],
    ['get', '/api/migration'],
    ['put', '/api/migration/anything/else'],
  ])('%s %s trả 410 MIGRATION_REMOVED', async (method, path) => {
    const res = await (request(app) as any)[method](path).send({});
    expect(res.status).toBe(410);
    expect(res.body).toEqual({
      success: false,
      code: 'MIGRATION_REMOVED',
      error: 'Công cụ chuyển đổi dữ liệu một lần đã được gỡ (Đợt 0A).'
    });
  });
});
