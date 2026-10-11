import { describe, it, expect } from 'vitest';
import { stripSessionSecrets, sessionHasSecrets } from './session-sanitizer';

describe('session-sanitizer – Đợt 0A (BM03)', () => {
  it('bỏ password/passwordHash/matKhau, giữ các trường khác, không sửa đối tượng gốc', () => {
    const input = Object.freeze({ username: 'thong', role: 'Administrator', password: 'bi-mat', passwordHash: 'x', matKhau: 'y', onboarded: true });
    const out = stripSessionSecrets(input);
    expect(out).toEqual({ username: 'thong', role: 'Administrator', onboarded: true });
    expect(input).toHaveProperty('password');
  });

  it('null/undefined → null; sessionHasSecrets đúng khi có khóa bí mật', () => {
    expect(stripSessionSecrets(null)).toBeNull();
    expect(stripSessionSecrets(undefined)).toBeNull();
    expect(sessionHasSecrets({ username: 'a', password: '' })).toBe(true);
    expect(sessionHasSecrets({ username: 'a' })).toBe(false);
    expect(sessionHasSecrets(null)).toBe(false);
  });
});
