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
