import { describe, it, expect, vi, beforeEach } from 'vitest';

const { docGetMock, docSetMock, fetchMock, alertMock, loggerMock } = vi.hoisted(() => ({
  docGetMock: vi.fn(),
  docSetMock: vi.fn().mockResolvedValue(undefined),
  fetchMock: vi.fn(),
  alertMock: vi.fn().mockResolvedValue(undefined),
  loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../../config/supabase.admin', () => ({
  adminDb: { collection: vi.fn(() => ({ doc: vi.fn(() => ({ get: docGetMock, set: docSetMock })) })) },
}));
vi.mock('../../lib/resilient-transport', () => ({ resilientFetch: fetchMock }));
vi.mock('../alerting.service', () => ({ sendZaloAlert: alertMock }));
// Logger mà service nhập (console): giả lập để kiểm được logger.error/warn và để đầu ra kiểm thử sạch với reporter mặc định.
vi.mock('../../../shared/lib/logger', () => ({ logger: loggerMock }));

import { ZaloTokenManagerService } from './zalo-token-manager.service';

const MIN = 60_000;
const cfg = (expiresAt: number) => ({
  zaloAppId: 'app', zaloSecretKey: 'sec', zaloOaId: 'oa', zaloRefreshToken: 'rt-cu', zaloAccessToken: 'at-cu', zaloTokenExpiresAt: expiresAt,
});
const zaloOk = () => ({ ok: true, json: async () => ({ access_token: 'at-moi', refresh_token: 'rt-moi', expires_in: 90000 }) });
const zaloReject = () => ({ ok: true, json: async () => ({ error: -14014, message: 'Refresh token invalid' }) });
const useConfig = (expiresAt: number) => docGetMock.mockResolvedValue({ exists: true, data: () => cfg(expiresAt) });
/** CSDL giả có trạng thái: get đọc bản mới nhất, set (merge) ghi từng ô — để lần xếp hàng sau thấy cặp mã vừa xoay. */
const useStore = (initial: Record<string, unknown>) => {
  const store: { doc: Record<string, unknown> } = { doc: { ...initial } };
  docGetMock.mockImplementation(async () => ({ exists: true, data: () => ({ ...store.doc }) }));
  docSetMock.mockImplementation(async (d: Record<string, unknown>) => { store.doc = { ...store.doc, ...d }; });
  return store;
};
/** Zalo giả: mỗi Refresh Token chỉ dùng được một lần (dùng lại hoặc để trống → -14014); lần gọi đầu bị giữ tới khi gọi hàm trả về. */
const useSingleUseZalo = () => {
  const used = new Set<string>();
  let calls = 0;
  let release: () => void = () => {};
  const gate = new Promise<void>(r => { release = r; });
  fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
    const call = ++calls;
    if (call === 1) await gate;
    const rt = new URLSearchParams(init.body).get('refresh_token') || '';
    if (!rt || used.has(rt)) return zaloReject();
    used.add(rt);
    return { ok: true, json: async () => ({ access_token: `at-${call}`, refresh_token: `rt-${call}`, expires_in: 90000 }) };
  });
  return () => release();
};

describe('ZaloTokenManagerService – Đợt 0A (Z0.3): làm mới lỗi thì báo, không dùng tạm mã chết; một khóa cho mọi lần làm mới', () => {
  let svc: ZaloTokenManagerService;
  // resetAllMocks (không chỉ clear): mockImplementation của ca trước (CSDL/Zalo giả có trạng thái) không rò sang ca sau.
  beforeEach(() => {
    vi.resetAllMocks();
    docSetMock.mockResolvedValue(undefined);
    alertMock.mockResolvedValue(undefined);
    svc = new ZaloTokenManagerService();
  });

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
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.error).toHaveBeenCalledWith({ reason: 'Zalo từ chối làm mới mã: Refresh token invalid' }, '[ZaloTokenManager] Làm mới Access Token Zalo thất bại');
  });

  it('Zalo từ chối + mã cũ đã hết hạn → cảnh báo, trả null (không dùng tạm mã chết)', async () => {
    useConfig(Date.now() - 1 * MIN);
    fetchMock.mockResolvedValue(zaloReject());
    expect(await svc.getValidAccessToken()).toBeNull();
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.error).toHaveBeenCalledWith({ reason: 'Zalo từ chối làm mới mã: Refresh token invalid' }, '[ZaloTokenManager] Làm mới Access Token Zalo thất bại');
  });

  it('lỗi mạng + mã cũ hết hạn → cảnh báo, trả null; lỗi mạng + mã còn hạn → trả mã cũ', async () => {
    useConfig(Date.now() - 1 * MIN);
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    expect(await svc.getValidAccessToken()).toBeNull();
    useConfig(Date.now() + 5 * MIN);
    expect(await svc.getValidAccessToken()).toBe('at-cu');
    expect(alertMock).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).toHaveBeenCalledTimes(2);
    expect(loggerMock.error).toHaveBeenCalledWith({ reason: 'Lỗi mạng khi gọi Zalo OAuth: ECONNRESET' }, '[ZaloTokenManager] Làm mới Access Token Zalo thất bại');
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

  it('ghi cảnh báo bị lỗi (sendZaloAlert ném) → kết quả làm mới vẫn đúng (mã cũ còn hạn), ghi logger.warn', async () => {
    useConfig(Date.now() + 5 * MIN);
    fetchMock.mockResolvedValue(zaloReject());
    const alertErr = new Error('không ghi được systemAlerts');
    alertMock.mockRejectedValueOnce(alertErr);
    expect(await svc.getValidAccessToken()).toBe('at-cu');
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    expect(loggerMock.warn).toHaveBeenCalledWith({ err: alertErr }, '[ZaloTokenManager] Không ghi được cảnh báo làm mới mã');
  });

  it('tự làm mới xếp hàng sau một lần "Kiểm tra kết nối" thành công → đọc lại trong khóa, dùng cặp mã mới: không gọi Zalo lần hai, không cảnh báo', async () => {
    const store = useStore(cfg(Date.now() - 1 * MIN)); // mã truy cập đã hết hạn
    const release = useSingleUseZalo();
    const manual = svc.refreshTokenDirect('app', 'sec', 'rt-cu', 'oa');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const auto = svc.getValidAccessToken(); // một lần gửi tin trong lúc đang kiểm tra: lần đọc trước khi xếp hàng còn thấy rt-cu
    await new Promise(r => setTimeout(r, 10));
    release();
    expect(await manual).toMatchObject({ success: true, accessToken: 'at-1' });
    expect(await auto).toBe('at-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(alertMock).not.toHaveBeenCalled();
    expect(loggerMock.error).not.toHaveBeenCalled();
    expect(store.doc).toMatchObject({ zaloAccessToken: 'at-1', zaloRefreshToken: 'rt-1' });
  });

  it('"Kiểm tra kết nối" với form để trống xếp hàng sau một lần tự làm mới → đọc Refresh Token đang lưu TRONG khóa (mã vừa xoay), thành công', async () => {
    const store = useStore(cfg(Date.now() + 5 * MIN)); // còn 5 phút → tự làm mới
    const release = useSingleUseZalo();
    const auto = svc.getValidAccessToken();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const manual = svc.refreshTokenDirect('app', 'sec', '', 'oa'); // route: người dùng không gõ Refresh Token → ''
    await new Promise(r => setTimeout(r, 10));
    expect(fetchMock).toHaveBeenCalledTimes(1); // lời gọi tay vẫn chờ
    release();
    expect(await auto).toBe('at-1');
    expect(await manual).toMatchObject({ success: true, accessToken: 'at-2' });
    expect(String(fetchMock.mock.calls[1][1].body)).toContain('refresh_token=rt-1');
    expect(alertMock).not.toHaveBeenCalled();
    expect(store.doc).toMatchObject({ zaloAccessToken: 'at-2', zaloRefreshToken: 'rt-2' });
  });
});
