import { describe, it, expect, vi, beforeEach } from 'vitest';

const { docGetMock, docSetMock, fetchMock, alertMock } = vi.hoisted(() => ({
  docGetMock: vi.fn(),
  docSetMock: vi.fn().mockResolvedValue(undefined),
  fetchMock: vi.fn(),
  alertMock: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../config/supabase.admin', () => ({
  adminDb: { collection: vi.fn(() => ({ doc: vi.fn(() => ({ get: docGetMock, set: docSetMock })) })) },
}));
vi.mock('../../lib/resilient-transport', () => ({ resilientFetch: fetchMock }));
vi.mock('../alerting.service', () => ({ sendZaloAlert: alertMock }));

import { ZaloTokenManagerService } from './zalo-token-manager.service';

const MIN = 60_000;
const cfg = (expiresAt: number) => ({
  zaloAppId: 'app', zaloSecretKey: 'sec', zaloOaId: 'oa', zaloRefreshToken: 'rt-cu', zaloAccessToken: 'at-cu', zaloTokenExpiresAt: expiresAt,
});
const zaloOk = () => ({ ok: true, json: async () => ({ access_token: 'at-moi', refresh_token: 'rt-moi', expires_in: 90000 }) });
const zaloReject = () => ({ ok: true, json: async () => ({ error: -14014, message: 'Refresh token invalid' }) });
const useConfig = (expiresAt: number) => docGetMock.mockResolvedValue({ exists: true, data: () => cfg(expiresAt) });

describe('ZaloTokenManagerService – Đợt 0A (Z0.3): làm mới lỗi thì báo, không dùng tạm mã chết; một khóa cho mọi lần làm mới', () => {
  let svc: ZaloTokenManagerService;
  beforeEach(() => { vi.clearAllMocks(); svc = new ZaloTokenManagerService(); });

  it('mã còn hạn > 15 phút → trả ngay, không gọi Zalo', async () => {
    useConfig(Date.now() + 120 * MIN);
    expect(await svc.getValidAccessToken()).toBe('at-cu');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Zalo từ chối làm mới + mã cũ còn hạn (5 phút) → cảnh báo 1 lần, trả mã cũ, không ghi CSDL', async () => {
    useConfig(Date.now() + 5 * MIN);
    fetchMock.mockResolvedValue(zaloReject());
    expect(await svc.getValidAccessToken()).toBe('at-cu');
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(String(alertMock.mock.calls[0][0])).toContain('Làm mới mã Zalo thất bại');
    expect(docSetMock).not.toHaveBeenCalled();
  });

  it('Zalo từ chối + mã cũ đã hết hạn → cảnh báo, trả null (không dùng tạm mã chết)', async () => {
    useConfig(Date.now() - 1 * MIN);
    fetchMock.mockResolvedValue(zaloReject());
    expect(await svc.getValidAccessToken()).toBeNull();
    expect(alertMock).toHaveBeenCalledTimes(1);
  });

  it('lỗi mạng + mã cũ hết hạn → cảnh báo, trả null; lỗi mạng + mã còn hạn → trả mã cũ', async () => {
    useConfig(Date.now() - 1 * MIN);
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    expect(await svc.getValidAccessToken()).toBeNull();
    useConfig(Date.now() + 5 * MIN);
    expect(await svc.getValidAccessToken()).toBe('at-cu');
    expect(alertMock).toHaveBeenCalledTimes(2);
  });

  it('làm mới thành công → lưu cặp mã mới + hạn dùng, không cảnh báo, trả mã mới', async () => {
    useConfig(Date.now() + 5 * MIN);
    fetchMock.mockResolvedValue(zaloOk());
    expect(await svc.getValidAccessToken()).toBe('at-moi');
    expect(docSetMock).toHaveBeenCalledTimes(1);
    expect(docSetMock.mock.calls[0][0]).toMatchObject({ zaloAccessToken: 'at-moi', zaloRefreshToken: 'rt-moi' });
    expect(docSetMock.mock.calls[0][0].zaloTokenExpiresAt).toBeGreaterThan(Date.now());
    expect(alertMock).not.toHaveBeenCalled();
  });

  it('hai lời gọi getValidAccessToken đồng thời → chỉ một yêu cầu Zalo (đối chứng inFlightRefreshPromise)', async () => {
    useConfig(Date.now() + 5 * MIN);
    fetchMock.mockResolvedValue(zaloOk());
    const [a, b] = await Promise.all([svc.getValidAccessToken(), svc.getValidAccessToken()]);
    expect(a).toBe('at-moi');
    expect(b).toBe('at-moi');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('"Kiểm tra kết nối" (refreshTokenDirect) trong lúc tự làm mới đang chạy → xếp hàng sau, không xoay mã làm mới hai lần song song', async () => {
    useConfig(Date.now() + 5 * MIN);
    let releaseFirst: (v: unknown) => void = () => {};
    fetchMock
      .mockImplementationOnce(() => new Promise(resolve => { releaseFirst = resolve; }))
      .mockResolvedValueOnce(zaloOk());
    const auto = svc.getValidAccessToken();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const manual = svc.refreshTokenDirect('app', 'sec', 'rt-tay', 'oa');
    await new Promise(r => setTimeout(r, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1); // lời gọi tay vẫn chờ
    releaseFirst(zaloOk());
    expect(await auto).toBe('at-moi');
    expect(await manual).toMatchObject({ success: true, accessToken: 'at-moi' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondBody = String(fetchMock.mock.calls[1][1].body);
    expect(secondBody).toContain('refresh_token=rt-tay');
  });
});
