import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BaseRepository } from './base.repo';
import { supabase } from '@/src/shared/config/supabase.client';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';

vi.mock('@/src/shared/config/supabase.client', () => {
  const fromMock = vi.fn();
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: fromMock,
      channel: vi.fn(() => ({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnValue({})
      })),
      removeChannel: vi.fn()
    }
  };
});

describe('BaseRepository (Supabase)', () => {
  let repo: BaseRepository<any>;

  beforeEach(() => {
    vi.clearAllMocks();
    entityCachePool.clear();
    repo = new BaseRepository('customers');
  });

  it('generateId should return a valid uuid string', () => {
    const id = repo.generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(10);
  });

  it('getById should return null if record not found', async () => {
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: null, error: null })
    });

    const result = await repo.getById('non-existent');
    expect(result).toBeNull();
  });

  it('getById should return data if exists and not deleted', async () => {
    const mockRow = {
      id: 'cust-1',
      ma_kh: 'KH-001',
      data: { tenKhachHang: 'Công ty SGM', sdt: '0901234567' },
      deleted_at: null
    };

    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockRow, error: null })
    });

    const result = await repo.getById('cust-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('cust-1');
    expect((result as any)?.tenKhachHang).toBe('Công ty SGM');
  });

  it('getById should return null if record has deletedAt', async () => {
    const mockRow = {
      id: 'cust-deleted',
      data: { tenKhachHang: 'Công ty Cũ' },
      deleted_at: '2026-01-01T00:00:00Z'
    };

    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: mockRow, error: null })
    });

    const result = await repo.getById('cust-deleted');
    expect(result).toBeNull();
  });

  it('create should save data with upsert and return an id', async () => {
    const upsertMock = vi.fn().mockResolvedValueOnce({ error: null });
    (supabase.from as any).mockReturnValueOnce({
      upsert: upsertMock
    });

    const id = await repo.create({ tenKhachHang: 'Khách Mới' });
    expect(typeof id).toBe('string');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id,
        data: expect.objectContaining({ tenKhachHang: 'Khách Mới' })
      })
    );
  });

  it('softDelete should update deleted_at', async () => {
    // getById first
    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValueOnce({ data: { id: 'cust-1', data: {} }, error: null })
    });

    const upsertMock = vi.fn().mockResolvedValueOnce({ error: null });
    (supabase.from as any).mockReturnValueOnce({
      upsert: upsertMock
    });

    await repo.softDelete('cust-1');
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cust-1',
        deleted_at: expect.any(String)
      })
    );
  });

  it('list should map rows correctly and exclude soft-deleted records', async () => {
    const mockRows = [
      { id: 'c1', data: { tenKhachHang: 'Khách 1' }, deleted_at: null },
      { id: 'c2', data: { tenKhachHang: 'Khách 2' }, deleted_at: '2026-01-01' }
    ];

    (supabase.from as any).mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValueOnce({ data: mockRows, error: null })
    });

    const res = await repo.list({});
    expect(res).toHaveLength(1);
    expect((res[0] as any).id).toBe('c1');
  });

  describe('listAll – nạp theo trang (Đợt 0A – lô 2)', () => {
    beforeEach(() => {
      // vi.clearAllMocks() không xóa hàng đợi mockReturnValueOnce: xóa hẳn để một kiểm thử hỏng không rò chuỗi mock sang kiểm thử sau.
      // fromMock là vi.fn() không có giá trị trả về nền (các kiểm thử cũ không dựa vào giá trị nền nào) nên không cần đặt lại.
      vi.mocked(supabase.from).mockReset();
    });

    const makeRows = (from: number, to: number) =>
      Array.from({ length: to - from }, (_, i) => ({
        id: `p${from + i}`, data: { soTien: 1 }, deleted_at: null, created_at: '2026-10-01T00:00:00.000Z'
      }));
    const pageChain = (rows: any[] | null, error: any = null) => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValueOnce({ data: rows, error }),
    });
    const countChain = (count: number) => ({
      select: vi.fn().mockReturnThis(),
      is: vi.fn().mockResolvedValueOnce({ count, error: null }),
    });

    it('trang cuối ngắn hơn cỡ trang → dừng, capped=false, không gọi đếm; dòng trùng id giữa hai trang chỉ giữ một', async () => {
      (supabase.from as any)
        .mockReturnValueOnce(pageChain(makeRows(0, 1000)))
        .mockReturnValueOnce(pageChain([...makeRows(999, 1000), ...makeRows(1000, 1299)]));
      const res = await repo.listAll({}, { pageSize: 1000, maxRows: 2000 });
      expect(res.items).toHaveLength(1299);
      expect(res.capped).toBe(false);
      expect(res.total).toBe(1299);
      expect(supabase.from).toHaveBeenCalledTimes(2);
    });

    it('chạm trần 2000 → đếm count:exact đúng một lần, capped=true, total lấy từ CSDL', async () => {
      (supabase.from as any)
        .mockReturnValueOnce(pageChain(makeRows(0, 1000)))
        .mockReturnValueOnce(pageChain(makeRows(1000, 2000)))
        .mockReturnValueOnce(countChain(2300));
      const res = await repo.listAll({}, { pageSize: 1000, maxRows: 2000 });
      expect(res.items).toHaveLength(2000);
      expect(res.capped).toBe(true);
      expect(res.total).toBe(2300);
      expect(supabase.from).toHaveBeenCalledTimes(3);
    });

    it('mỗi trang dùng .range(offset, offset+limit-1) và có khóa phụ order("id") để không xáo dòng cùng created_at', async () => {
      const first = pageChain(makeRows(0, 10));
      const second = pageChain(makeRows(10, 15));
      (supabase.from as any).mockReturnValueOnce(first).mockReturnValueOnce(second);
      const res = await repo.listAll({}, { pageSize: 10, maxRows: 20 });
      expect(res.items).toHaveLength(15);
      expect(first.range).toHaveBeenCalledWith(0, 9);
      expect(second.range).toHaveBeenCalledWith(10, 19);
      expect(first.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(first.order).toHaveBeenCalledWith('id', { ascending: false });
    });

    it('lỗi ở trang 2 → ném lỗi, không trả danh sách cụt', async () => {
      (supabase.from as any)
        .mockReturnValueOnce(pageChain(makeRows(0, 1000)))
        .mockReturnValueOnce(pageChain(null, { message: 'mất kết nối' }));
      await expect(repo.listAll({}, { pageSize: 1000, maxRows: 2000 })).rejects.toThrow(/mất kết nối/);
    });

    it('list() vẫn nuốt lỗi thành [] như trước (các nơi gọi cũ dựa vào điều này)', async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'boom' } })
      });
      await expect(repo.list({})).resolves.toEqual([]);
    });

    it('subscribe({ maxRows }) nạp theo trang và gọi callback kèm meta { total, capped }', async () => {
      (supabase.from as any)
        .mockReturnValueOnce(pageChain(makeRows(0, 1000)))
        .mockReturnValueOnce(pageChain(makeRows(1000, 2000)))
        .mockReturnValueOnce(countChain(2300));
      const cb = vi.fn();
      const unsub = repo.subscribe({ limit: 2000, pageSize: 1000, maxRows: 2000 }, cb);
      await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(1));
      expect(cb.mock.calls[0][0]).toHaveLength(2000);
      expect(cb.mock.calls[0][1]).toBe(2000);
      expect(cb.mock.calls[0][2]).toEqual({ total: 2300, capped: true });
      unsub();
    });

    it('subscribe(500) (bộ sưu tập ngoài nhóm lõi) vẫn nạp một lần bằng list() và không kèm meta', async () => {
      (supabase.from as any).mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce({ data: makeRows(0, 3), error: null })
      });
      const cb = vi.fn();
      const unsub = repo.subscribe(500, cb);
      await vi.waitFor(() => expect(cb).toHaveBeenCalledTimes(1));
      expect(cb.mock.calls[0][1]).toBe(3);
      expect(cb.mock.calls[0][2]).toBeUndefined();
      unsub();
    });
  });
});
