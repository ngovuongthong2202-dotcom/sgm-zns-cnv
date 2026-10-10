/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { setSpy, getByIdSpy } = vi.hoisted(() => ({
  setSpy: vi.fn().mockResolvedValue(undefined),
  getByIdSpy: vi.fn().mockResolvedValue({ id: 'c1', tenKhachHang: 'Tên cũ', ngayCapNhat: '2026-10-01T00:00:00.000Z' }),
}));

vi.mock('@/src/data/repositories', () => ({
  repositoryFactory: {
    get: () => ({ set: setSpy, getById: getByIdSpy, generateId: () => 'id-moi' }),
  },
}));
vi.mock('@/src/modules/iam', () => ({ useAuth: () => ({ user: { uid: 'u1' } }) }));
vi.mock('@/src/design-system', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
  OptimisticConflictError: class OptimisticConflictError extends Error {},
}));
vi.mock('swr', () => ({ mutate: vi.fn() }));
vi.mock('@/src/data/swr-fetchers', () => ({ clearSwrColCache: vi.fn() }));
vi.mock('@/src/shared/utils/crossTabSync', () => ({ crossTabSync: { broadcast: vi.fn() } }));
vi.mock('@/src/data/realtime-store', () => ({
  realtimeStore: { mutateOptimistic: vi.fn(), getSnapshot: () => [], restoreSnapshot: vi.fn() },
}));
vi.mock('@/src/shared/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { useMutation } from './useMutation';

describe('useMutation.updateRecord cho customers (Đợt 0A)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ success: true }) })) as any;
  });

  it('cập nhật khách hàng chỉ gọi /api/workflow/update; không ghi crossEntitySyncJobs, không gọi /api/customers/trigger-sync', async () => {
    const { result } = renderHook(() => useMutation<any>({ collection: 'customers' }));
    await act(async () => {
      await result.current.updateRecord('c1', { tenKhachHang: 'Tên mới', sdt: '0912345678' });
    });

    expect(getByIdSpy).toHaveBeenCalledWith('c1');
    expect(setSpy).not.toHaveBeenCalled();
    const urls = (global.fetch as any).mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls.some((u: string) => u.includes('/api/workflow/update/customers/c1'))).toBe(true);
    expect(urls.some((u: string) => u.includes('/api/customers/trigger-sync'))).toBe(false);
  });
});
