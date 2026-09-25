import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { realtimeStore } from './realtime-store';
import { repositoryFactory } from './repositories';

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
});
