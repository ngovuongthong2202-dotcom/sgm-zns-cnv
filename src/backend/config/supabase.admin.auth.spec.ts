import { describe, it, expect, vi, afterEach } from 'vitest';

// Chuỗi mã quản trị dev cũ: chép từ supabase.admin.ts:999 TRƯỚC khi xóa ở Bước 3. Không được ghi vào tài liệu.
const LEGACY_DEV_TOKEN = 'sgm_admin_dev_token';

async function loadAdminAuth() {
  vi.resetModules();
  const mod = await import('./supabase.admin');
  return mod.adminAuth;
}

describe('adminAuth.verifyIdToken – Đợt 0A (BM02/K-SEC-8): không còn mã viết cứng, bypass chỉ ở development', () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it('NODE_ENV=production: mã quản trị viết cứng cũ → null', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
    const adminAuth = await loadAdminAuth();
    expect(await adminAuth.verifyIdToken(LEGACY_DEV_TOKEN)).toBeNull();
  });

  it('NODE_ENV=production + DEV_BYPASS_AUTH=true: token bất kỳ vẫn → null', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    const adminAuth = await loadAdminAuth();
    expect(await adminAuth.verifyIdToken('bat-ky')).toBeNull();
    expect(await adminAuth.verifyIdToken(LEGACY_DEV_TOKEN)).toBeNull();
  });

  it('NODE_ENV=development + DEV_BYPASS_AUTH=true: token bất kỳ → quản trị (chỉ máy phát triển)', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_BYPASS_AUTH', 'true');
    const adminAuth = await loadAdminAuth();
    expect(await adminAuth.verifyIdToken('bat-ky')).toEqual({ uid: 'admin-001', email: 'admin@sgm.vn', role: 'admin' });
  });

  it('NODE_ENV=test (mặc định của vitest), không bypass: token lạ → null (nhánh test cũ đã xóa)', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false');
    const adminAuth = await loadAdminAuth();
    expect(await adminAuth.verifyIdToken('bat-ky')).toBeNull();
    expect(await adminAuth.verifyIdToken(LEGACY_DEV_TOKEN)).toBeNull();
  });

  it('token rỗng hoặc undefined → null, không ném lỗi', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_BYPASS_AUTH', 'false'); // máy phát triển có thể export DEV_BYPASS_AUTH=true (.env.example) → kết quả không được phụ thuộc máy
    const adminAuth = await loadAdminAuth();
    expect(await adminAuth.verifyIdToken('')).toBeNull();
    expect(await adminAuth.verifyIdToken(undefined as unknown as string)).toBeNull();
  });
});
