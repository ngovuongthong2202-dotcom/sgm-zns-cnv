/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { updateMock } = vi.hoisted(() => ({ updateMock: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/src/data/repositories/factory', () => ({ repositoryFactory: { get: vi.fn(() => ({ update: updateMock })) } }));
vi.mock('@/src/modules/iam', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));

import { useManualZnsBypass } from './useManualZnsBypass';

describe('useManualZnsBypass – Đợt 0A: nhật ký đi đường cố định zns-manual-bypass', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('cập nhật trạng thái qua repo rồi POST /api/workflow/zns-manual-bypass; không còn gọi /api/workflow/create/auditLogs', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ success: true }) });
    const { result } = renderHook(() => useManualZnsBypass());
    await act(async () => { await result.current.bypassZns('quotation', 'q1', 'CHỜ GỬI'); });
    expect(updateMock).toHaveBeenCalledWith('q1', expect.objectContaining({ trangThaiGuiTinBaoGia: 'THÀNH CÔNG' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/workflow/zns-manual-bypass');
    expect(JSON.parse(String(init.body))).toEqual({ entityType: 'quotation', docId: 'q1', previousStatus: 'CHỜ GỬI', userId: 'u1' });
    expect(result.current.bypassingId).toBeNull();
  });

  it('đường ghi nhật ký lỗi mạng → không ném ra ngoài, bypassingId về null', async () => {
    fetchMock.mockRejectedValue(new Error('mất mạng'));
    const { result } = renderHook(() => useManualZnsBypass());
    await act(async () => { await expect(result.current.bypassZns('payment', 'p1', 'ĐANG GỬI')).resolves.toBeUndefined(); });
    expect(result.current.bypassingId).toBeNull();
  });
});
