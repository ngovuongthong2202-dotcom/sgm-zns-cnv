import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { znsHarness } from './zns-route-harness';
import znsRoutes from './zns.routes';

const app = express();
app.use(express.json());
app.use('/api/zns', znsRoutes);
const CFG = 'settings/zns_config';
const okResponse = (body = '{"ok":true,"secret":"noi-dung-cua-dich"}') => ({ status: 200, text: async () => body });

describe('zns.routes – Đợt 0A (ZNS01): ping chỉ tới địa chỉ CNV đã lưu, không theo chuyển hướng, không trả nội dung', () => {
  beforeEach(() => { znsHarness.reset(); vi.stubEnv('CNV_DEFAULT_WEBHOOK_URL', ''); });
  afterEach(() => vi.unstubAllEnvs());

  it('thân có testUrl lạ (địa chỉ nội bộ) → vẫn chỉ gọi địa chỉ ĐÃ LƯU với redirect manual; phản hồi không có url/response', async () => {
    znsHarness.docFixtures[CFG] = { vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/abc' };
    znsHarness.resilientFetchMock.mockResolvedValue(okResponse());
    const res = await request(app).post('/api/zns/test-webhook-dryrun').send({ testUrl: 'http://169.254.169.254/latest/meta-data' });
    expect(res.status).toBe(200);
    expect(znsHarness.resilientFetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = znsHarness.resilientFetchMock.mock.calls[0];
    expect(url).toBe('https://hub.cnvcdp.com/webhook/abc');
    expect(init.redirect).toBe('manual');
    expect(res.body).toEqual({ success: true, status: 200, latencyMs: expect.any(Number), message: expect.stringContaining('HTTP 200') });
    expect(JSON.stringify(res.body)).not.toContain('169.254');
    expect(JSON.stringify(res.body)).not.toContain('noi-dung-cua-dich');
    expect(JSON.stringify(res.body)).not.toContain('hub.cnvcdp.com/webhook/abc');
  });

  it('slot hợp lệ → ping đúng ô đó', async () => {
    znsHarness.docFixtures[CFG] = { vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/bg', vendorUrl_GIAOHANG_ZNS: 'https://hub.cnvcdp.com/webhook/gh' };
    znsHarness.resilientFetchMock.mockResolvedValue(okResponse());
    const res = await request(app).post('/api/zns/test-webhook-dryrun').send({ slot: 'vendorUrl_GIAOHANG_ZNS', url: 'https://evil.example/x' });
    expect(res.status).toBe(200);
    expect(znsHarness.resilientFetchMock.mock.calls[0][0]).toBe('https://hub.cnvcdp.com/webhook/gh');
  });

  it('chưa lưu địa chỉ nào và không có CNV_DEFAULT_WEBHOOK_URL → 400 NO_SAVED_VENDOR_URL, không gọi', async () => {
    znsHarness.docFixtures[CFG] = { znsProvider: 'ZALO_OFFICIAL' };
    const res = await request(app).post('/api/zns/test-webhook-dryrun').send({ testUrl: 'https://hub.cnvcdp.com/webhook/tu-than-gui-len' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ success: false, code: 'NO_SAVED_VENDOR_URL', error: 'Chưa lưu địa chỉ Webhook CNV nào trong Cài đặt → Vendor & Webhook.' });
    expect(znsHarness.resilientFetchMock).not.toHaveBeenCalled();
  });

  it.each(['http://hub.cnvcdp.com/webhook/abc', 'https://hub.cnvcdp.com.evil.example/x', 'https://evil.example/hub.cnvcdp.com', 'khong-phai-url'])(
    'địa chỉ đã lưu "%s" → 400 VENDOR_URL_NOT_ALLOWED, không gọi', async (saved) => {
      znsHarness.docFixtures[CFG] = { vendorUrl_BAOGIA: saved };
      const res = await request(app).post('/api/zns/test-webhook-dryrun').send({});
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VENDOR_URL_NOT_ALLOWED');
      expect(znsHarness.resilientFetchMock).not.toHaveBeenCalled();
    }
  );

  it('đích trả 500 → 502 { success:false, status:500, latencyMs } không kèm nội dung', async () => {
    znsHarness.docFixtures[CFG] = { vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/abc' };
    znsHarness.resilientFetchMock.mockResolvedValue({ status: 500, text: async () => 'stack trace cua dich' });
    const res = await request(app).post('/api/zns/test-webhook-dryrun').send({});
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ success: false, status: 500, latencyMs: expect.any(Number), error: expect.stringContaining('HTTP 500') });
    expect(JSON.stringify(res.body)).not.toContain('stack trace');
  });
});
