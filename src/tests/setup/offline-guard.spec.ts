import { describe, it, expect, vi } from 'vitest';

const KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;

describe('offline-guard (Đợt 0A) – bộ kiểm thử không được chạm Supabase thật', () => {
  it('cả 4 biến Supabase đều là "offline" trong worker kiểm thử', () => {
    for (const key of KEYS) {
      expect(process.env[key], key).toBe('offline');
    }
  });

  it('client trình duyệt và client máy chủ đều ở chế độ giả lập, kể cả sau khi zns.config nạp dotenv', async () => {
    await import('@/src/backend/config/zns.config');
    const client = await import('@/src/shared/config/supabase.client');
    const admin = await import('@/src/backend/config/supabase.admin');
    expect(client.isSupabaseConfigured).toBe(false);
    expect(admin.isSupabaseAdminConfigured).toBe(false);
    expect(process.env.SUPABASE_SERVICE_ROLE_KEY).toBe('offline');
  });

  it('chặn cả địa chỉ thật có khoảng trắng ở đầu (client cắt khoảng trắng rồi vẫn kết nối)', async () => {
    for (const key of ['VITE_SUPABASE_URL', 'SUPABASE_URL'] as const) {
      const saved = process.env[key];
      try {
        process.env[key] = ' https://x.supabase.co';
        vi.resetModules(); // offline-guard.ts đã chạy một lần (setupFiles); xóa bộ nhớ đệm để nạp lại với giá trị vừa đặt
        await expect(import('./offline-guard'), key).rejects.toThrow(`[offline-guard] ${key} `);
      } finally {
        if (saved === undefined) delete process.env[key];
        else process.env[key] = saved;
      }
    }
  });
});
