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

  it.each([
    'http://hub.cnvcdp.com/webhook/abc', 'https://hub.cnvcdp.com.evil.example/x', 'https://evil.example/hub.cnvcdp.com', 'khong-phai-url',
    // có tên đăng nhập/mật khẩu trong địa chỉ, hoặc cổng khác 443
    'https://u:p@hub.cnvcdp.com/webhook/x', 'https://hub.cnvcdp.com:22/webhook/x',
  ])(
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

  it('gọi máy chủ CNV bị lỗi (thông báo lỗi chứa địa chỉ đã lưu) → 500 PING_FAILED, không lặp lại địa chỉ; chi tiết chỉ vào nhật ký máy chủ', async () => {
    znsHarness.docFixtures[CFG] = { vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/secret-path' };
    znsHarness.resilientFetchMock.mockRejectedValue(new Error('boom https://hub.cnvcdp.com/webhook/secret-path'));
    const res = await request(app).post('/api/zns/test-webhook-dryrun').send({});
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, code: 'PING_FAILED', error: 'Không gọi được máy chủ CNV. Xem nhật ký máy chủ để biết chi tiết.' });
    expect(JSON.stringify(res.body)).not.toContain('secret-path');
    expect(znsHarness.resilientFetchMock).toHaveBeenCalledTimes(1);
    expect(znsHarness.loggerMock.error).toHaveBeenCalledWith(expect.objectContaining({ detail: expect.stringContaining('secret-path') }), expect.any(String));
  });
});

describe('zns.routes – Đợt 0A (ZNS05/Z0.3): GET /config không trả bí mật; POST /config chỉ nhận ô cho phép', () => {
  const FULL_DOC = {
    znsProvider: 'ZALO_OFFICIAL', zaloAppId: '123', zaloOaId: '456',
    zaloSecretKey: 'bi-mat-1', zaloRefreshToken: 'rt-1', zaloAccessToken: 'at-1', zaloTokenExpiresAt: 1_800_000_000_000,
    vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/bg', vendorWebhookSecret: '',
    maxRetries: 3, retryBackoffMs: 5000, requireSecret: true, isAsyncVendor: true, templateStrictMode: true,
    updatedAt: '2026-10-01T00:00:00.000Z', updatedBy: 'admin',
    data: { zaloSecretKey: 'bi-mat-cu' }, id: 'zns_config', updated_at: '2026-09-30T00:00:00.000Z',
  };
  beforeEach(() => { znsHarness.reset(); znsHarness.docFixtures[CFG] = { ...FULL_DOC }; });

  it('GET /api/zns/config → không có zaloSecretKey/zaloAccessToken/zaloRefreshToken/vendorWebhookSecret/data/id; có secrets, vendorUrl_*, zaloTokenExpiresAt', async () => {
    const res = await request(app).get('/api/zns/config');
    expect(res.status).toBe(200);
    const cfg = res.body.config;
    for (const k of ['zaloSecretKey', 'zaloAccessToken', 'zaloRefreshToken', 'vendorWebhookSecret', 'data', 'id', 'updated_at']) expect(cfg, k).not.toHaveProperty(k);
    expect(cfg.secrets).toEqual({ zaloSecretKey: true, zaloRefreshToken: true, vendorWebhookSecret: false });
    expect(cfg.vendorUrl_BAOGIA).toBe('https://hub.cnvcdp.com/webhook/bg');
    expect(cfg.zaloTokenExpiresAt).toBe(1_800_000_000_000);
    expect(JSON.stringify(res.body)).not.toMatch(/bi-mat|rt-1|at-1/);
  });

  it('POST /api/zns/config với thân form cũ (kèm zaloAccessToken, zaloTokenExpiresAt, data, id, updated_at) → payload set chỉ có ô cho phép + updatedAt', async () => {
    const res = await request(app).post('/api/zns/config').send({ ...FULL_DOC, zaloSecretKey: '', zaloRefreshToken: '', updatedBy: 'thong' });
    expect(res.status).toBe(200);
    expect(znsHarness.docSetCalls).toHaveLength(1);
    const { path, data, options } = znsHarness.docSetCalls[0];
    expect(path).toBe(CFG);
    expect(options).toEqual({ merge: true });
    for (const k of ['zaloAccessToken', 'zaloTokenExpiresAt', 'data', 'id', 'updated_at', 'zaloSecretKey', 'zaloRefreshToken']) expect(data, k).not.toHaveProperty(k);
    expect(data.zaloAppId).toBe('123');
    expect(data.updatedBy).toBe('thong');
    expect(typeof data.updatedAt).toBe('string');
    expect(res.body.ignoredKeys.sort()).toEqual(['data', 'id', 'updatedAt', 'updated_at', 'zaloAccessToken', 'zaloTokenExpiresAt']);
    expect(JSON.stringify(res.body.config)).not.toMatch(/bi-mat|rt-1|at-1/);
  });

  it('POST {zaloRefreshToken:""} → không ghi zaloRefreshToken; {zaloRefreshToken:"rt-moi"} → ghi và xóa mã truy cập/hạn dùng', async () => {
    await request(app).post('/api/zns/config').send({ zaloRefreshToken: '' });
    expect(znsHarness.docSetCalls[0].data).not.toHaveProperty('zaloRefreshToken');
    await request(app).post('/api/zns/config').send({ zaloRefreshToken: 'rt-moi' });
    expect(znsHarness.docSetCalls[1].data).toMatchObject({ zaloRefreshToken: 'rt-moi', zaloAccessToken: '', zaloTokenExpiresAt: 0 });
  });

  it('POST {zaloSecretKey:"••••abcd"} (giá trị che) → bỏ qua, khóa thật không bị ghi đè', async () => {
    await request(app).post('/api/zns/config').send({ zaloSecretKey: '••••abcd' });
    expect(znsHarness.docSetCalls[0].data).not.toHaveProperty('zaloSecretKey');
  });

  it('POST /api/zns/test-zalo-direct với appId/secretKey/refreshToken rỗng → dùng App ID/Secret Key/OA ID đã lưu, Refresh Token để trống (token manager đọc trong khóa); phản hồi không chứa accessToken', async () => {
    znsHarness.zaloTokenManagerMock.getCredentials.mockResolvedValue({ appId: '123', secretKey: 'bi-mat-1', oaId: '456', refreshToken: 'rt-1' });
    const res = await request(app).post('/api/zns/test-zalo-direct').send({ appId: '', secretKey: '', oaId: '', refreshToken: '' });
    expect(res.status).toBe(200);
    // Đợt 0A (Z0.3, vòng sửa 1): không truyền Refresh Token đọc sẵn ở đây (một lần tự làm mới đang chạy có thể vừa xoay mất).
    expect(znsHarness.zaloTokenManagerMock.refreshTokenDirect).toHaveBeenCalledWith('123', 'bi-mat-1', '', '456');
    expect(res.body).not.toHaveProperty('accessToken');
    expect(JSON.stringify(res.body)).not.toMatch(/bi-mat|rt-1/);
  });

  it('POST /api/zns/test-zalo-direct với Refresh Token vừa gõ → truyền đúng mã đó (đã cắt khoảng trắng)', async () => {
    znsHarness.zaloTokenManagerMock.getCredentials.mockResolvedValue({ appId: '123', secretKey: 'bi-mat-1', oaId: '456', refreshToken: 'rt-1' });
    const res = await request(app).post('/api/zns/test-zalo-direct').send({ refreshToken: ' rt-tay ' });
    expect(res.status).toBe(200);
    expect(znsHarness.zaloTokenManagerMock.refreshTokenDirect).toHaveBeenCalledWith('123', 'bi-mat-1', 'rt-tay', '456');
  });

  it('POST /api/zns/config khi không đọc được dòng cấu hình (hoặc chưa có) và thân không có bí mật mới → 503 ZNS_CONFIG_UNREADABLE, không ghi', async () => {
    delete znsHarness.docFixtures[CFG];
    const res = await request(app).post('/api/zns/config').send({ zaloAppId: '123', zaloSecretKey: '', zaloRefreshToken: '  ', vendorWebhookSecret: '••••abcd', updatedBy: 'thong' });
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      success: false,
      code: 'ZNS_CONFIG_UNREADABLE',
      error: 'Không đọc được cấu hình ZNS đang lưu (hoặc chưa có). Chưa lưu để không làm mất khóa Zalo. Nếu đã có cấu hình, thử lại sau giây lát; nếu là lần lưu đầu, hãy nhập đủ khóa Zalo.',
    });
    expect(znsHarness.docSetCalls).toHaveLength(0);
  });

  it('POST /api/zns/config khi không đọc được dòng cấu hình nhưng thân có bí mật mới → vẫn lưu (200), phản hồi không lặp lại bí mật', async () => {
    delete znsHarness.docFixtures[CFG];
    const res = await request(app).post('/api/zns/config').send({ zaloAppId: '123', zaloSecretKey: 'sec-moi', updatedBy: 'thong' });
    expect(res.status).toBe(200);
    expect(znsHarness.docSetCalls).toHaveLength(1);
    expect(znsHarness.docSetCalls[0].data).toMatchObject({ zaloAppId: '123', zaloSecretKey: 'sec-moi', updatedBy: 'thong' });
    expect(JSON.stringify(res.body)).not.toContain('sec-moi');
  });
});
