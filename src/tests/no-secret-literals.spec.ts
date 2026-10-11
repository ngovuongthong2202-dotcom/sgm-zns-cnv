import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Rào chắn Đợt 0A (BM02, K-SEC-7): không tệp mã nào trong src/, scripts/ và server.ts được chứa bí mật viết cứng.
// LEGACY_DEV_TOKEN chép từ supabase.admin.auth.spec.ts (chuỗi mã dev cũ); đây là tệp thứ ba và cuối cùng giữ nó.
export const LEGACY_DEV_TOKEN = 'sgm_admin_dev_token';

const ROOT = path.resolve(__dirname, '..', '..');
const SELF = path.resolve(__dirname, 'no-secret-literals.spec.ts');
const ALLOWED_TOKEN_HOLDERS = new Set([
  SELF,
  path.resolve(ROOT, 'src/backend/config/supabase.admin.auth.spec.ts'),
  path.resolve(ROOT, 'src/backend/routes/cron.routes.auth.spec.ts'),
]);

export function walkSourceFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSourceFiles(full, out);
    else if (/\.(ts|tsx|js|cjs|mjs|json)$/.test(entry.name)) out.push(full);
  }
  return out;
}

export const SCANNED_FILES = [
  ...walkSourceFiles(path.join(ROOT, 'src')),
  ...walkSourceFiles(path.join(ROOT, 'scripts')),
  path.join(ROOT, 'server.ts'),
];

describe('no-secret-literals – Đợt 0A', () => {
  it('không tệp nào ngoài 3 spec được chứa chuỗi mã quản trị dev cũ', () => {
    const offenders = SCANNED_FILES
      .filter(f => !ALLOWED_TOKEN_HOLDERS.has(path.resolve(f)))
      .filter(f => fs.readFileSync(f, 'utf8').includes(LEGACY_DEV_TOKEN))
      .map(f => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('ba tệp form khách hàng không còn dựng tiêu đề Authorization từ phiên Supabase', () => {
    const files = [
      'src/modules/customers/ui/hooks/useCustomerForm.ts',
      'src/modules/customers/ui/components/QuickCustomerModal.tsx',
    ];
    for (const rel of files) {
      const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(text, rel).not.toMatch(/auth\.getSession\(\)/);
      expect(text, rel).not.toMatch(/Authorization:/);
    }
  });
});
