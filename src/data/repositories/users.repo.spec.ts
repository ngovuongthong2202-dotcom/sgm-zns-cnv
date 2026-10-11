import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '@/src/shared/config/supabase.client';
import { usersRepo } from './users.repo';

vi.mock('@/src/shared/config/supabase.client', () => {
  const fromMock = vi.fn();
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: fromMock,
      channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn().mockReturnValue({}) })),
      removeChannel: vi.fn(),
    },
  };
});

const row = (username: string, extra: Record<string, unknown> = {}) => ({
  id: username, username, display_name: 'Ngô Vương Thông', department: 'IT', position: 'Admin', role: 'Administrator',
  created_at: '2026-01-01T00:00:00.000Z', data: { password: 'bi-mat-123', phone: '0912345678', ...extra },
});
const singleChain = (result: { data: unknown; error: unknown }) => {
  const eq = vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(result) }));
  return { chain: { select: vi.fn(() => ({ eq })) }, eq };
};
const listChain = (result: { data: unknown; error: unknown }) => ({ select: vi.fn().mockResolvedValue(result) });
const hasPassword = (v: unknown) => JSON.stringify(v).includes('password') || JSON.stringify(v).includes('bi-mat');

describe('users.repo – Đợt 0A (BM03/BM06)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('getUser("thong") → kết quả không có khóa password; truy vấn bằng .eq("username"), không .or', async () => {
    const { chain, eq } = singleChain({ data: row('thong'), error: null });
    (supabase.from as any).mockReturnValueOnce(chain);
    const u = await usersRepo.getUser('thong');
    expect(u).toMatchObject({ id: 'thong', username: 'thong', role: 'Administrator', phone: '0912345678' });
    expect(hasPassword(u)).toBe(false);
    expect(eq).toHaveBeenCalledWith('username', 'thong');
    expect(chain.select).toHaveBeenCalledWith('*');
  });

  it('không tìm thấy theo username → thử .eq("id") rồi mới chịu', async () => {
    const first = singleChain({ data: null, error: null });
    const second = singleChain({ data: row('thong'), error: null });
    (supabase.from as any).mockReturnValueOnce(first.chain).mockReturnValueOnce(second.chain);
    const u = await usersRepo.getUser('thong');
    expect(u?.username).toBe('thong');
    expect(second.eq).toHaveBeenCalledWith('id', 'thong');
  });

  it('BM06: tên đăng nhập chứa ký tự lạ (chèn điều kiện) → null, không truy vấn', async () => {
    expect(await usersRepo.getUser('admin",role.eq."Administrator')).toBeNull();
    expect(await usersRepo.getUser('a b')).toBeNull();
    expect(await usersRepo.getUser('Thong')).toBeNull();
    expect(supabase.from).not.toHaveBeenCalled();
    expect(usersRepo.isValidUsername('ngo.thong_2026-a')).toBe(true);
    expect(usersRepo.isValidUsername('x'.repeat(65))).toBe(false);
  });

  it('getAll: không phần tử nào có password', async () => {
    (supabase.from as any).mockReturnValueOnce(listChain({ data: [row('thong'), row('le')], error: null }));
    const all = await usersRepo.getAll();
    expect(all).toHaveLength(2);
    expect(hasPassword(all)).toBe(false);
  });

  it('subscribeAll và subscribeUser: callback không nhận password', async () => {
    (supabase.from as any).mockReturnValueOnce(listChain({ data: [row('thong')], error: null }));
    const cbAll = vi.fn();
    const unsubAll = usersRepo.subscribeAll(cbAll);
    await vi.waitFor(() => expect(cbAll).toHaveBeenCalledTimes(1));
    expect(hasPassword(cbAll.mock.calls[0][0])).toBe(false);
    unsubAll();

    (supabase.from as any).mockReturnValueOnce(singleChain({ data: row('thong'), error: null }).chain);
    const cbOne = vi.fn();
    const unsubOne = usersRepo.subscribeUser('thong', cbOne);
    await vi.waitFor(() => expect(cbOne).toHaveBeenCalledTimes(1));
    expect(hasPassword(cbOne.mock.calls[0][0])).toBe(false);
    unsubOne();
  });

  it('verifyPassword: đúng → true; sai → false; không có password lưu → false; chỉ chọn cột data', async () => {
    const ok = singleChain({ data: { data: { password: 'bi-mat-123' } }, error: null });
    (supabase.from as any).mockReturnValueOnce(ok.chain);
    expect(await usersRepo.verifyPassword('thong', 'bi-mat-123')).toBe(true);
    expect(ok.chain.select).toHaveBeenCalledWith('data');
    expect(ok.eq).toHaveBeenCalledWith('username', 'thong');

    (supabase.from as any).mockReturnValueOnce(singleChain({ data: { data: { password: 'bi-mat-123' } }, error: null }).chain);
    expect(await usersRepo.verifyPassword('thong', 'sai')).toBe(false);

    (supabase.from as any).mockReturnValueOnce(singleChain({ data: { data: {} }, error: null }).chain);
    expect(await usersRepo.verifyPassword('thong', '')).toBe(false);
    (supabase.from as any).mockReturnValueOnce(singleChain({ data: { data: {} }, error: null }).chain);
    expect(await usersRepo.verifyPassword('thong', 'bat-ky')).toBe(false);

    expect(await usersRepo.verifyPassword('admin",role.eq."x', 'a')).toBe(false);
  });
});
