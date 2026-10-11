import { describe, it, expect } from 'vitest';
import { resolveAdminDbMode, adminDbMode } from './supabase.admin';

describe('supabase.admin – Đợt 0A (MC13): nhận ra máy chủ đang chạy bằng khóa anon', () => {
  it('chưa cấu hình (URL không phải http) → offline, bất kể khóa', () => {
    expect(resolveAdminDbMode({ configured: false, serviceKey: '', anonKey: 'x'.repeat(40) })).toBe('offline');
    expect(resolveAdminDbMode({ configured: false, serviceKey: 'y'.repeat(40), anonKey: '' })).toBe('offline');
  });

  it('cấu hình xong, SUPABASE_SERVICE_ROLE_KEY trống, VITE_SUPABASE_ANON_KEY dài ≥ 11 → anon-fallback', () => {
    expect(resolveAdminDbMode({ configured: true, serviceKey: '', anonKey: 'x'.repeat(40) })).toBe('anon-fallback');
    expect(resolveAdminDbMode({ configured: true, serviceKey: '   ', anonKey: 'x'.repeat(40) })).toBe('anon-fallback');
  });

  it('có khóa service role → service-role (dù anon cũng có)', () => {
    expect(resolveAdminDbMode({ configured: true, serviceKey: 'y'.repeat(40), anonKey: 'x'.repeat(40) })).toBe('service-role');
    expect(resolveAdminDbMode({ configured: true, serviceKey: 'y'.repeat(40), anonKey: '' })).toBe('service-role');
  });

  it('trong môi trường kiểm thử (bốn biến = offline) adminDbMode() là offline', () => {
    expect(adminDbMode()).toBe('offline');
  });
});
