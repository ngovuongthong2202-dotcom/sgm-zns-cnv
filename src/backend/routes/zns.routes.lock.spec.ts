import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

import { znsHarness } from './zns-route-harness';

import znsRoutes from './zns.routes';

const app = express();
app.use(express.json());
app.use('/api/zns', znsRoutes);

const BULK_BODY = {
  success: false,
  code: 'BULK_ZNS_LOCKED',
  error: 'Gửi ZNS hàng loạt đã tạm khóa (Đợt 0A). Vui lòng gửi từng chứng từ.'
};

describe('zns.routes – Đợt 0A: khóa gửi hàng loạt, giữ gửi lẻ, bỏ tra khách theo tên', () => {
  beforeEach(() => znsHarness.reset());

  it('POST /api/zns/bulk-send trả 410 BULK_ZNS_LOCKED, không gửi tin và không chạm CSDL', async () => {
    const res = await request(app).post('/api/zns/bulk-send').send({
      requests: [{ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '0912345678' }]
    });
    expect(res.status).toBe(410);
    expect(res.body).toEqual(BULK_BODY);
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
    expect(znsHarness.fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('POST /api/zns/replay-dlq trả 410 và không gửi lại tin nào', async () => {
    const res = await request(app).post('/api/zns/replay-dlq').send({ filter: true });
    expect(res.status).toBe(410);
    expect(res.body).toEqual(BULK_BODY);
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
    expect(znsHarness.fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('POST /api/zns/replay trả 410 và không đổi trạng thái tin', async () => {
    const res = await request(app).post('/api/zns/replay').send({ messageId: 'msg-1' });
    expect(res.status).toBe(410);
    expect(res.body).toEqual(BULK_BODY);
    expect(znsHarness.fakeAdminDb.collection).not.toHaveBeenCalled();
  });

  it('gửi lẻ vẫn chạy: POST /api/zns/send cho báo giá không gắn khách → 200, dùng tên trên chứng từ, KHÔNG tra customers theo tenKhachHang', async () => {
    const res = await request(app).post('/api/zns/send').send({
      entityId: 'q-khong-gan-khach',
      entityType: 'QUOTATION',
      messageType: 'BAOGIA',
      phone: '0912345678',
      payload: { tenKhachHang: 'Công Ty Thép Sài Gòn', soPhieuBaoGia: 'BGM-2026-0100' }
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, messageId: 'msg-1', status: 'SENT_WAITING' });
    expect(znsHarness.executeMock).toHaveBeenCalledTimes(1);
    const sentPayload = znsHarness.executeMock.mock.calls[0][0].payload;
    expect(sentPayload.tenKhachHang).toBe('Công Ty Thép Sài Gòn');
    expect(sentPayload.phone).toBe('0912345678');
    expect(znsHarness.whereCalls.some(args => args[0] === 'tenKhachHang')).toBe(false);
  });

  it('gửi lẻ: thiếu entityId → 400; SĐT sai → 400 INVALID_PHONE', async () => {
    const r1 = await request(app).post('/api/zns/send').send({ entityType: 'QUOTATION', messageType: 'BAOGIA' });
    expect(r1.status).toBe(400);
    const r2 = await request(app).post('/api/zns/send').send({ entityId: 'q1', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '12' });
    expect(r2.status).toBe(400);
    expect(r2.body.code).toBe('INVALID_PHONE');
    expect(znsHarness.executeMock).not.toHaveBeenCalled();
  });
});
