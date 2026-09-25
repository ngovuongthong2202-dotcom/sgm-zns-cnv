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
});
