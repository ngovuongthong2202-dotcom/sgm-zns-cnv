import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CORE_HARD_CAP } from '@/src/platform/data/list-limits';

const { listMock, listAllMock } = vi.hoisted(() => ({
  listMock: vi.fn().mockResolvedValue([]),
  listAllMock: vi.fn().mockResolvedValue({ items: [], total: 0, capped: false }),
}));

vi.mock('@/src/data/repositories', () => ({
  repositoryFactory: { get: vi.fn(() => ({ list: listMock, listAll: listAllMock })) },
}));
// Cửa sổ bộ nhớ và L1 cache trống để fetcher phải xuống repo
vi.mock('@/src/data/realtime-store', () => ({
  realtimeStore: { getCollectionState: vi.fn(() => ({ data: [], loading: false, error: null, hasMore: false, loadMore: () => {} })) },
}));
vi.mock('@/src/platform/data/entity-cache-pool', () => ({
  entityCachePool: { getAll: vi.fn(() => []), setBatch: vi.fn() },
}));
vi.mock('swr', () => ({ mutate: vi.fn() }));
vi.mock('@/src/shared/lib/logger', () => ({ logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { swrColFetcher, swrColCacheMap, swrColPromiseCache } from '@/src/data/swr-fetchers';

describe('swrColFetcher – Đợt 0A (DL01): khóa lõi không lọc khóa ngoại nạp theo trang tới trần', () => {
  beforeEach(() => {
    swrColCacheMap.clear();
    swrColPromiseCache.clear();
    listMock.mockClear();
    listAllMock.mockClear();
  });

  it('`contracts:500` (bộ sưu tập lõi, không khóa ngoại) → listAll tới CORE_HARD_CAP, không gọi list()', async () => {
    const rows = await swrColFetcher('contracts:500');
    expect(rows).toEqual([]);
    expect(listAllMock).toHaveBeenCalledTimes(1);
    expect(listAllMock).toHaveBeenCalledWith({ sortField: undefined, sortDirection: 'desc' }, { maxRows: CORE_HARD_CAP });
    expect(listMock).not.toHaveBeenCalled();
  });

  it('`payments:500:contractId:x` (có khóa ngoại) → vẫn list({ limit: 500, fkField, fkId }) như cũ', async () => {
    await swrColFetcher('payments:500:contractId:x');
    expect(listMock).toHaveBeenCalledTimes(1);
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 500, fkField: 'contractId', fkId: 'x', sortDirection: 'desc' }));
    expect(listAllMock).not.toHaveBeenCalled();
  });

  it('`notifications:500` (ngoài nhóm lõi) → list({ limit: 500 }) như cũ', async () => {
    await swrColFetcher('notifications:500');
    expect(listMock).toHaveBeenCalledWith(expect.objectContaining({ limit: 500 }));
    expect(listAllMock).not.toHaveBeenCalled();
  });

  it('listAll lỗi (khóa lõi) → swrColFetcher ném đúng lỗi đó, không để lại mục cache và không sinh lỗi "Uncaught (in promise)"', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    try {
      listAllMock.mockRejectedValueOnce(new Error('[contracts] mất kết nối'));
      await expect(swrColFetcher('contracts:500')).rejects.toThrow('[contracts] mất kết nối');
      // Chờ một vòng macrotask: Node phát 'unhandledRejection' khi hàng đợi microtask đã cạn mà vẫn còn promise phụ bị từ chối không ai bắt
      await new Promise(resolve => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
      expect(swrColCacheMap.has('contracts:500')).toBe(false);
      expect(swrColPromiseCache.has('contracts:500')).toBe(false);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});
