import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realtimeStore } from './realtime-store';
import { repositoryFactory } from './repositories';
import { CORE_ABSOLUTE_CEILING, CORE_HARD_CAP, CORE_PAGE_SIZE, DEFAULT_WINDOW_LIMIT } from '../platform/data/list-limits';

vi.mock('@/src/shared/config/supabase.client', () => ({
  isSupabaseConfigured: false,
  supabase: {}
}));

describe('realtime-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    (realtimeStore as any).listeners.clear();
  });

  it('collection có doc thiếu ngayKy/ngayThanhToan/ngayGiaoMay/ngayBaoGia vẫn xuất hiện trong kết quả', async () => {
    let subscribeCallback: (docs: unknown[], count?: number) => void;

    const mockRepo = {
      subscribe: vi.fn((limit: number, cb: (docs: unknown[], count?: number) => void) => {
        subscribeCallback = cb;
        return vi.fn(); // unsubscribe
      })
    };

    vi.spyOn(repositoryFactory, 'get').mockReturnValue(mockRepo as any);

    const mockDocs = [
      {
        id: 'doc1',
        name: 'Doc 1',
        createdAt: '2023-01-01T00:00:00Z',
        ngayKy: '2023-01-05T00:00:00Z'
      },
      {
        id: 'doc2',
        name: 'Doc 2',
        createdAt: '2023-01-02T00:00:00Z' // Missing ngayKy
      }
    ];

    let lastState: any;
    const unsub = realtimeStore.subscribe('contracts', (state) => {
      lastState = state;
    });

    subscribeCallback!(mockDocs, mockDocs.length);

    expect(lastState).toBeTruthy();
    expect(lastState.data).toHaveLength(2);
    expect(lastState.data[0].id).toBe('doc1'); // 2023-01-05
    expect(lastState.data[1].id).toBe('doc2'); // 2023-01-02

    unsub();
  });

  const makeRepo = () => {
    let callback: ((docs: unknown[], count?: number, meta?: { total: number | null; capped: boolean }) => void) | null = null;
    const repo = {
      subscribe: vi.fn((_optsOrLimit: unknown, cb: typeof callback, _onError?: (err: Error) => void) => {
        callback = cb;
        return vi.fn();
      })
    };
    return { repo, emit: (docs: unknown[], count: number, meta?: { total: number | null; capped: boolean }) => callback?.(docs, count, meta) };
  };
  const docs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}`, createdAt: '2026-10-01T00:00:00Z' }));

  it('bộ sưu tập lõi đăng ký theo trang: subscribe nhận { limit: 2000, pageSize: 1000, maxRows: 2000 }', () => {
    const { repo } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    const unsub = realtimeStore.subscribe('payments', () => {});
    expect(repo.subscribe).toHaveBeenCalledTimes(1);
    expect(repo.subscribe.mock.calls[0][0]).toEqual({ limit: CORE_HARD_CAP, pageSize: CORE_PAGE_SIZE, maxRows: CORE_HARD_CAP });
    unsub();
  });

  it('bộ sưu tập ngoài nhóm lõi vẫn đăng ký với số 500 như cũ', () => {
    const { repo } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    const unsub = realtimeStore.subscribe('notifications', () => {});
    expect(repo.subscribe.mock.calls[0][0]).toBe(DEFAULT_WINDOW_LIMIT);
    unsub();
  });

  it('chạm trần: capped=true, total=2300, loaded=2000, hasMore=true; chưa chạm trần: capped=false, hasMore=false', () => {
    const { repo, emit } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    let last: any;
    const unsub = realtimeStore.subscribe('payments', (s) => { last = s; });

    emit(docs(2000), 2000, { total: 2300, capped: true });
    expect(last.capped).toBe(true);
    expect(last.total).toBe(2300);
    expect(last.loaded).toBe(2000);
    expect(last.hasMore).toBe(true);

    emit(docs(1500), 1500, { total: 1500, capped: false });
    expect(last.capped).toBe(false);
    expect(last.total).toBe(1500);
    expect(last.loaded).toBe(1500);
    expect(last.hasMore).toBe(false);
    unsub();
  });

  it('loadMore khi đã chạm trần nâng maxRows lên 3000 và đăng ký lại; gọi lại khi đang tải là no-op; không vượt 5000', () => {
    const { repo, emit } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    let last: any;
    const unsub = realtimeStore.subscribe('payments', (s) => { last = s; });

    emit(docs(CORE_HARD_CAP), CORE_HARD_CAP, { total: 9000, capped: true });
    last.loadMore();
    expect(repo.subscribe).toHaveBeenCalledTimes(2);
    expect(repo.subscribe.mock.calls[1][0]).toEqual({ limit: CORE_HARD_CAP + CORE_PAGE_SIZE, pageSize: CORE_PAGE_SIZE, maxRows: CORE_HARD_CAP + CORE_PAGE_SIZE });

    last.loadMore(); // lượt trước chưa trả kết quả → bỏ qua
    expect(repo.subscribe).toHaveBeenCalledTimes(2);

    emit(docs(CORE_HARD_CAP + CORE_PAGE_SIZE), CORE_HARD_CAP + CORE_PAGE_SIZE, { total: 9000, capped: true });
    last.loadMore();
    emit(docs(CORE_HARD_CAP + 2 * CORE_PAGE_SIZE), CORE_HARD_CAP + 2 * CORE_PAGE_SIZE, { total: 9000, capped: true });
    last.loadMore();
    emit(docs(CORE_ABSOLUTE_CEILING), CORE_ABSOLUTE_CEILING, { total: 9000, capped: true });
    expect(repo.subscribe.mock.calls[repo.subscribe.mock.calls.length - 1][0]).toEqual({ limit: CORE_ABSOLUTE_CEILING, pageSize: CORE_PAGE_SIZE, maxRows: CORE_ABSOLUTE_CEILING });
    expect(last.capped).toBe(true);
    expect(last.hasMore).toBe(false); // đã tới trần tuyệt đối
    const callsBefore = repo.subscribe.mock.calls.length;
    last.loadMore();
    expect(repo.subscribe.mock.calls.length).toBe(callsBefore);
    unsub();
  });

  it('bộ sưu tập ngoài nhóm lõi: hasMore khi đủ 500 dòng và loadMore nâng lên 1000 như cũ', () => {
    const { repo, emit } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    let last: any;
    const unsub = realtimeStore.subscribe('notifications', (s) => { last = s; });
    emit(docs(DEFAULT_WINDOW_LIMIT), DEFAULT_WINDOW_LIMIT);
    expect(last.hasMore).toBe(true);
    expect(last.capped).toBe(false);
    last.loadMore();
    expect(repo.subscribe.mock.calls[1][0]).toBe(2 * DEFAULT_WINDOW_LIMIT);
    unsub();
  });

  it('loadMore giữ nguyên danh tính giữa các lần thông báo', () => {
    const { repo, emit } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    let last: any;
    const unsub = realtimeStore.subscribe('payments', (s) => { last = s; });

    emit(docs(CORE_HARD_CAP), CORE_HARD_CAP, { total: CORE_HARD_CAP + 300, capped: true });
    const first = last;
    emit(docs(CORE_HARD_CAP), CORE_HARD_CAP, { total: CORE_HARD_CAP + 301, capped: true }); // vd: một dòng mới làm tổng tăng
    const second = last;

    expect(second).not.toBe(first);
    expect(first.loadMore).toBeTypeOf('function');
    expect(second.loadMore).toBe(first.loadMore);
    expect(realtimeStore.getCollectionState('payments').loadMore).toBe(first.loadMore);
    unsub();
  });

  it('lượt nâng trần bị lỗi: lùi về cỡ cũ, dừng tự nạp, thử lại thủ công dùng cỡ cũ', () => {
    const { repo, emit } = makeRepo();
    vi.spyOn(repositoryFactory, 'get').mockReturnValue(repo as any);
    // handleDatabaseError ghi lỗi ra console.error: chặn lại để đầu ra kiểm thử sạch
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    let last: any;
    const unsub = realtimeStore.subscribe('payments', (s) => { last = s; });

    emit(docs(CORE_HARD_CAP), CORE_HARD_CAP, { total: 9000, capped: true });
    last.loadMore();
    expect(repo.subscribe).toHaveBeenCalledTimes(2);
    expect(repo.subscribe.mock.calls[1][0]).toEqual({ limit: CORE_HARD_CAP + CORE_PAGE_SIZE, pageSize: CORE_PAGE_SIZE, maxRows: CORE_HARD_CAP + CORE_PAGE_SIZE });

    const expandError = repo.subscribe.mock.calls[1][2];
    expect(expandError).toBeTypeOf('function');
    expandError!(new Error('mất kết nối'));
    expect(last.hasMore).toBe(false);
    expect(last.error).toBeInstanceOf(Error);
    expect(last.error.message).toBe('mất kết nối');
    expect(last.capped).toBe(true);
    expect(last.loaded).toBe(CORE_HARD_CAP);

    last.loadMore(); // thử lại thủ công: đúng cỡ đã nạp thành công, không nâng trần
    expect(repo.subscribe).toHaveBeenCalledTimes(3);
    expect(repo.subscribe.mock.calls[2][0]).toEqual({ limit: CORE_HARD_CAP, pageSize: CORE_PAGE_SIZE, maxRows: CORE_HARD_CAP });

    const retryCallback = repo.subscribe.mock.calls[2][1];
    retryCallback!(docs(CORE_HARD_CAP), CORE_HARD_CAP, { total: 9000, capped: true });
    expect(last.error).toBeNull();
    expect(last.hasMore).toBe(true);

    last.loadMore();
    expect(repo.subscribe).toHaveBeenCalledTimes(4);
    expect(repo.subscribe.mock.calls[3][0]).toEqual({ limit: CORE_HARD_CAP + CORE_PAGE_SIZE, pageSize: CORE_PAGE_SIZE, maxRows: CORE_HARD_CAP + CORE_PAGE_SIZE });
    expect(consoleError).toHaveBeenCalledTimes(1); // đúng một lỗi CSDL: lượt nâng trần bị lỗi, không có lượt tự thử lại
    unsub();
    consoleError.mockRestore();
  });
});
