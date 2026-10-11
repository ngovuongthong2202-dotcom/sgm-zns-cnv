/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

const { getUserMock, verifyPasswordMock } = vi.hoisted(() => ({ getUserMock: vi.fn(), verifyPasswordMock: vi.fn() }));
vi.mock('@/src/data/repositories/users.repo', () => ({
  usersRepo: { getUser: getUserMock, verifyPassword: verifyPasswordMock, setUser: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock('@/src/shared/config/supabase.client', () => ({
  isSupabaseConfigured: false,
  supabase: { auth: { signOut: vi.fn().mockResolvedValue(undefined), signInWithPassword: vi.fn() } },
}));
vi.mock('@/src/shared/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }));

import { AuthProvider, useAuth } from './AuthContext';
vi.stubGlobal('localStorage', (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window.localStorage);

const KEY = 'sgm_user_session';
// Repo "rò" password về (mô phỏng bản repo cũ): AuthContext phải tự làm sạch, không dựa vào repo.
const leakyUser = { id: 'thong', username: 'thong', displayName: 'Ngô Vương Thông', department: 'IT', position: 'Admin', role: 'Administrator' as const, password: 'bi-mat-123' };
const wrapper = ({ children }: { children: React.ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const stored = () => JSON.parse(localStorage.getItem(KEY) || 'null');

describe('AuthContext – Đợt 0A (BM03): phiên trình duyệt không chứa mật khẩu', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); getUserMock.mockResolvedValue(leakyUser); verifyPasswordMock.mockResolvedValue(true); });

  it('login("thong","dung") → true; state và sgm_user_session không có khóa password; so mật khẩu qua verifyPassword', async () => {
    getUserMock.mockResolvedValueOnce(leakyUser).mockResolvedValue(null);
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = false;
    await act(async () => { ok = await result.current.login('thong', 'dung'); });
    expect(ok).toBe(true);
    expect(verifyPasswordMock).toHaveBeenCalledWith('thong', 'dung');
    expect(result.current.userData).not.toHaveProperty('password');
    expect(result.current.userData?.role).toBe('Administrator');
    expect(stored().userData).not.toHaveProperty('password');
    expect(JSON.stringify(stored())).not.toContain('bi-mat');
  });

  it('mật khẩu sai → false, không ghi localStorage', async () => {
    verifyPasswordMock.mockResolvedValue(false);
    const { result } = renderHook(() => useAuth(), { wrapper });
    let ok = true;
    await act(async () => { ok = await result.current.login('thong', 'sai'); });
    expect(ok).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('khởi động với sgm_user_session cũ còn password → bản lưu được ghi lại sạch, state sạch', async () => {
    getUserMock.mockResolvedValue(null);
    localStorage.setItem(KEY, JSON.stringify({ user: { uid: 'thong', username: 'thong', displayName: 'T', email: 't@sgm.vn', photoURL: '' }, userData: { username: 'thong', role: 'Administrator', password: 'bi-mat-cu' } }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(stored().userData).not.toHaveProperty('password'));
    expect(result.current.userData).not.toHaveProperty('password');
    expect(JSON.stringify(localStorage.getItem(KEY))).not.toContain('bi-mat');
  });

  it('effect nền getUser trả dòng có password → state và localStorage vẫn sạch', async () => {
    localStorage.setItem(KEY, JSON.stringify({ user: { uid: 'thong', username: 'thong', displayName: 'T', email: 't@sgm.vn', photoURL: '' }, userData: { username: 'thong', role: 'Chuyên viên' } }));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(getUserMock).toHaveBeenCalledWith('thong'));
    await waitFor(() => expect(result.current.userData?.displayName).toBe('Ngô Vương Thông'));
    expect(result.current.userData).not.toHaveProperty('password');
    expect(stored().userData).not.toHaveProperty('password');
  });

  it('logout xóa sgm_user_session và sgm_active_role (đối chứng)', async () => {
    localStorage.setItem('sgm_active_role', 'Administrator');
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => { await result.current.login('thong', 'dung'); });
    await act(async () => { await result.current.logout(); });
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem('sgm_active_role')).toBeNull();
    expect(result.current.user).toBeNull();
  });
});
