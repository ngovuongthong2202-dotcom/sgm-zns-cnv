import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveAdminDbMode, adminDbMode } from './supabase.admin';

// Logger giả: kiểm được số lần và nội dung của logger.error lúc khởi động; đầu ra kiểm thử cũng sạch hơn.
const { loggerMock } = vi.hoisted(() => ({
  loggerMock: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
vi.mock('../lib/logger', () => ({ logger: loggerMock }));

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

// Khóa giả dựng LÚC CHẠY: không để chuỗi dạng JWT nào nằm trong mã nguồn (src/tests/no-secret-literals.spec.ts quét mọi tệp).
const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const fakeJwt = (payload: unknown) => [b64url({ alg: 'HS256', typ: 'JWT' }), b64url(payload), 'sig'].join('.');

describe('supabase.admin – Đợt 0A (MC13): xét theo GIÁ TRỊ khóa, không chỉ theo biến nào để trống', () => {
  it('cùng một giá trị ở cả hai biến → anon-fallback (khóa anon dán nhầm vào ô service role)', () => {
    const same = 'z'.repeat(40);
    expect(resolveAdminDbMode({ configured: true, serviceKey: same, anonKey: same })).toBe('anon-fallback');
    expect(resolveAdminDbMode({ configured: true, serviceKey: `  ${same}  `, anonKey: same })).toBe('anon-fallback');
  });

  it('khóa kiểu sb_publishable_… trong ô service role → anon-fallback', () => {
    const publishable = 'sb_publishable_' + 'p'.repeat(30);
    expect(resolveAdminDbMode({ configured: true, serviceKey: publishable, anonKey: '' })).toBe('anon-fallback');
    expect(resolveAdminDbMode({ configured: true, serviceKey: publishable, anonKey: 'x'.repeat(40) })).toBe('anon-fallback');
  });

  it('khóa kiểu sb_secret_… trong ô service role → service-role', () => {
    const secret = 'sb_secret_' + 's'.repeat(30);
    expect(resolveAdminDbMode({ configured: true, serviceKey: secret, anonKey: 'sb_publishable_' + 'p'.repeat(30) })).toBe('service-role');
  });

  it('khóa dạng JWT có role "anon" trong ô service role → anon-fallback', () => {
    expect(resolveAdminDbMode({ configured: true, serviceKey: fakeJwt({ role: 'anon' }), anonKey: '' })).toBe('anon-fallback');
    expect(resolveAdminDbMode({ configured: true, serviceKey: fakeJwt({ role: 'anon' }), anonKey: 'x'.repeat(40) })).toBe('anon-fallback');
  });

  it('khóa dạng JWT có role "service_role" trong ô service role → service-role (dù khóa anon cũng là JWT)', () => {
    const serviceKey = fakeJwt({ role: 'service_role' });
    expect(resolveAdminDbMode({ configured: true, serviceKey, anonKey: fakeJwt({ role: 'anon' }) })).toBe('service-role');
  });

  it('chuỗi không giải mã được, hoặc payload không phải đối tượng có role "anon" → service-role, không ném lỗi', () => {
    const undecodable = [b64url({ alg: 'HS256' }), '%%%', 'sig'].join('.');
    const samples = ['aaaa.bbbb.cccc', 'a.b.c.d', undecodable, fakeJwt(null), fakeJwt('anon'), fakeJwt([]), fakeJwt({}), fakeJwt({ role: 123 })];
    for (const serviceKey of samples) {
      expect(resolveAdminDbMode({ configured: true, serviceKey, anonKey: 'x'.repeat(40) })).toBe('service-role');
    }
  });

  it('ô service role trống, anon dài đúng 10 ký tự → offline (không có khóa nào dùng được)', () => {
    expect(resolveAdminDbMode({ configured: true, serviceKey: '', anonKey: 'x'.repeat(10) })).toBe('offline');
  });

  it('ô service role trống, anon dài 11 ký tự → anon-fallback', () => {
    expect(resolveAdminDbMode({ configured: true, serviceKey: '', anonKey: 'x'.repeat(11) })).toBe('anon-fallback');
  });

  it('cả hai ô trống dù đã cấu hình → offline', () => {
    expect(resolveAdminDbMode({ configured: true, serviceKey: '  ', anonKey: '' })).toBe('offline');
  });
});

describe('supabase.admin – Đợt 0A (MC13): dòng lỗi lúc khởi động khi chạy bằng khóa anon', () => {
  const DUMMY_ANON = 'anon-' + 'q'.repeat(30);
  const DUMMY_SERVICE = 'service-' + 'w'.repeat(30);
  const fetchSpy = vi.fn(async () => { throw new Error('spec này không được gọi mạng'); });

  // Nạp lại module với biến môi trường tùy ý. URL hợp lệ nhưng không định tuyến được (.invalid); tạo client Supabase không gọi mạng.
  async function loadFresh(keys: { service: string; anon: string }) {
    vi.resetModules();
    vi.stubEnv('SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.invalid');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', keys.service);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', keys.anon);
    const mod = await import('./supabase.admin');
    await new Promise((resolve) => setTimeout(resolve, 0)); // để mọi việc khởi tạo bất đồng bộ (nếu có) chạy xong trước khi kiểm
    return mod;
  }
  const everythingLogged = () => JSON.stringify([loggerMock.info, loggerMock.warn, loggerMock.error, loggerMock.debug].map((fn) => fn.mock.calls));

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('ô service role trống → đúng một dòng logger.error kiểu "thiếu biến", không chứa giá trị khóa', async () => {
    const mod = await loadFresh({ service: '', anon: DUMMY_ANON });
    expect(mod.isAdminUsingAnonFallback).toBe(true);
    expect(mod.adminDbMode()).toBe('anon-fallback');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(loggerMock.error.mock.calls[0]);
    expect(logged).toContain('SUPABASE_SERVICE_ROLE_KEY is missing');
    expect(logged).not.toContain('holds the public');
    expect(logged).not.toContain('audit_logs'); // 0001 chỉ cấm DELETE/TRUNCATE trên audit_logs; ghi nhật ký (INSERT/UPDATE) vẫn chạy
    expect(everythingLogged()).not.toContain(DUMMY_ANON);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('khóa anon dán nhầm vào ô service role → đúng một dòng logger.error kiểu "khóa công khai", không chứa giá trị khóa', async () => {
    const mod = await loadFresh({ service: DUMMY_ANON, anon: DUMMY_ANON });
    expect(mod.isAdminUsingAnonFallback).toBe(true);
    expect(mod.adminDbMode()).toBe('anon-fallback');
    expect(loggerMock.error).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(loggerMock.error.mock.calls[0]);
    expect(logged).toContain('SUPABASE_SERVICE_ROLE_KEY holds the public anon/publishable key');
    expect(logged).not.toContain('is missing');
    expect(logged).not.toContain('audit_logs');
    expect(everythingLogged()).not.toContain(DUMMY_ANON);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('có khóa service role khác khóa anon → service-role, không có dòng logger.error nào', async () => {
    const mod = await loadFresh({ service: DUMMY_SERVICE, anon: DUMMY_ANON });
    expect(mod.isAdminUsingAnonFallback).toBe(false);
    expect(mod.adminDbMode()).toBe('service-role');
    expect(loggerMock.error).not.toHaveBeenCalled();
    expect(everythingLogged()).not.toContain(DUMMY_SERVICE);
    expect(everythingLogged()).not.toContain(DUMMY_ANON);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
