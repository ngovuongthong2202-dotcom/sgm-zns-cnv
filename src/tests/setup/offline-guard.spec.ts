import { describe, it, expect } from 'vitest';

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
});
