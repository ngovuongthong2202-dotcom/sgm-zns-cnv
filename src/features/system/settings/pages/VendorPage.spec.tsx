/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/src/modules/iam', () => ({ useAuth: () => ({ user: { uid: 'admin-thu' } }) }));
vi.mock('@/src/shared/utils/notify', () => ({ notify: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

import VendorPage from './VendorPage';

type FetchCall = { url: string; init?: RequestInit };
export const fetchCalls: FetchCall[] = [];
export const publicConfig = {
  znsProvider: 'ZALO_OFFICIAL',
  zaloAppId: '123',
  zaloOaId: '456',
  zaloTokenExpiresAt: 1_800_000_000_000,
  vendorUrl_CUSTOMER_PRE_QUOTE: 'https://hub.cnvcdp.com/webhook/pre',
  maxRetries: 3,
  retryBackoffMs: 5000,
  requireSecret: true,
  isAsyncVendor: true,
  templateStrictMode: true,
  secrets: { zaloSecretKey: true, zaloRefreshToken: true, vendorWebhookSecret: false },
};
export const jsonResponse = (body: unknown, ok = true, status = 200) => ({ ok, status, json: async () => body });
export const postedBody = (url: string) => {
  const call = fetchCalls.filter(c => c.url === url && c.init?.method === 'POST').pop();
  return call ? JSON.parse(String(call.init?.body)) : undefined;
};

export function installFetch(handlers: Record<string, (init?: RequestInit) => unknown>) {
  fetchCalls.length = 0;
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({ url, init });
    const key = `${init?.method || 'GET'} ${url}`;
    const handler = handlers[key];
    if (!handler) throw new Error(`Không có handler cho ${key}`);
    return handler(init);
  }) as unknown as typeof fetch;
}

describe('VendorPage – Đợt 0A (ZNS01): nút ping CNV gửi slot, không gửi địa chỉ', () => {
  beforeEach(() => {
    installFetch({
      'GET /api/zns/config': () => jsonResponse({ success: true, config: publicConfig }),
      'POST /api/zns/test-webhook-dryrun': () => jsonResponse({ success: true, status: 200, latencyMs: 120, message: 'Kết nối thành công tới Webhook CNV (HTTP 200, 120 ms).' }),
    });
  });

  it('bấm "Ping Thử Nghiệm Webhook CNV" → thân POST là { slot: "vendorUrl_CUSTOMER_PRE_QUOTE" }, không có testUrl; có dòng nhắc dùng địa chỉ đã lưu', async () => {
    render(<VendorPage />);
    await screen.findByText(/Ping Thử Nghiệm Webhook CNV/);
    expect(screen.getByText(/Kiểm tra dùng địa chỉ đã lưu/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Test Webhook CNV' }));
    await waitFor(() => expect(postedBody('/api/zns/test-webhook-dryrun')).toBeDefined());
    expect(postedBody('/api/zns/test-webhook-dryrun')).toEqual({ slot: 'vendorUrl_CUSTOMER_PRE_QUOTE' });
  });
});

describe('VendorPage – Đợt 0A (ZNS05/Z0.3): form không giữ mã, Kiểm tra rồi Lưu không ghi đè khóa', () => {
  beforeEach(() => {
    installFetch({
      'GET /api/zns/config': () => jsonResponse({ success: true, config: publicConfig }),
      'POST /api/zns/test-zalo-direct': () => jsonResponse({ success: true, message: 'Kết nối Zalo Cloud OpenAPI thành công!', oaId: '456', tokenExpiresAt: 1_800_100_000_000 }),
      'POST /api/zns/config': (init) => jsonResponse({ success: true, message: 'Đã lưu', config: { ...publicConfig, ...JSON.parse(String(init?.body)) , secrets: publicConfig.secrets }, ignoredKeys: [] }),
    });
  });

  it('tải trang: ô Secret Key và Refresh Token trống với chỗ giữ "Đã lưu — để trống nếu không đổi"; ô Handshake Secret chưa lưu không có chỗ giữ đó', async () => {
    render(<VendorPage />);
    const secret = await screen.findByLabelText('Zalo App Secret Key') as HTMLInputElement;
    const refresh = screen.getByLabelText('Refresh Token (Hiệu lực 90 ngày)') as HTMLInputElement;
    const hook = screen.getByLabelText('Handshake Secret (Xác thực Webhook)') as HTMLInputElement;
    expect(secret.value).toBe('');
    expect(refresh.value).toBe('');
    expect(secret.placeholder).toBe('Đã lưu — để trống nếu không đổi');
    expect(refresh.placeholder).toBe('Đã lưu — để trống nếu không đổi');
    expect(hook.placeholder).not.toBe('Đã lưu — để trống nếu không đổi');
    expect(screen.getByText(/Hạn tự động làm mới/)).toBeTruthy();
  });

  it('"Kiểm tra kết nối Zalo" thành công → tải lại GET /api/zns/config, ô bí mật vẫn trống', async () => {
    render(<VendorPage />);
    await screen.findByLabelText('Zalo App Secret Key');
    const getsBefore = fetchCalls.filter(c => c.url === '/api/zns/config' && (c.init?.method || 'GET') === 'GET').length;
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Zalo' }));
    await waitFor(() => expect(fetchCalls.filter(c => c.url === '/api/zns/config' && (c.init?.method || 'GET') === 'GET').length).toBe(getsBefore + 1));
    expect(postedBody('/api/zns/test-zalo-direct')).toEqual({ appId: '123', secretKey: '', oaId: '456', refreshToken: '' });
    expect((screen.getByLabelText('Refresh Token (Hiệu lực 90 ngày)') as HTMLInputElement).value).toBe('');
  });

  it('"Kiểm tra kết nối" rồi "Lưu toàn bộ cấu hình" → thân POST /config không có zaloAccessToken, zaloTokenExpiresAt, zaloRefreshToken, zaloSecretKey, data, id, secrets', async () => {
    render(<VendorPage />);
    await screen.findByLabelText('Zalo App Secret Key');
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Zalo' }));
    await waitFor(() => expect(postedBody('/api/zns/test-zalo-direct')).toBeDefined());
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    await waitFor(() => expect(postedBody('/api/zns/config')).toBeDefined());
    const body = postedBody('/api/zns/config');
    for (const k of ['zaloAccessToken', 'zaloTokenExpiresAt', 'zaloRefreshToken', 'zaloSecretKey', 'vendorWebhookSecret', 'data', 'id', 'secrets', 'updatedAt']) expect(body, k).not.toHaveProperty(k);
    expect(body).toMatchObject({ znsProvider: 'ZALO_OFFICIAL', zaloAppId: '123', zaloOaId: '456', updatedBy: 'admin-thu', templateStrictMode: true });
  });

  it('gõ Refresh Token mới rồi Lưu → thân có zaloRefreshToken mới (và chỉ bí mật đó)', async () => {
    render(<VendorPage />);
    const refresh = await screen.findByLabelText('Refresh Token (Hiệu lực 90 ngày)');
    fireEvent.change(refresh, { target: { value: 'rt-moi-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }));
    await waitFor(() => expect(postedBody('/api/zns/config')).toBeDefined());
    const body = postedBody('/api/zns/config');
    expect(body.zaloRefreshToken).toBe('rt-moi-123');
    expect(body).not.toHaveProperty('zaloSecretKey');
    expect(body).not.toHaveProperty('zaloAccessToken');
  });
});
