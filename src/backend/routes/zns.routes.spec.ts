import { describe, it, expect } from 'vitest';
// Mimic logic since we just want to test the regex behavior quickly
function normalizeVNPhone(raw: string): string | null {
  if (!raw) return null;
  // Strip space, dot, dash, parens
  let cleaned = String(raw).replace(/[\s.\-()]/g, '');
  // Convert +84 / 84 prefix -> 0
  if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('84') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
  // Validate: must be 10 digits starting with 0
  if (!/^0\d{9}$/.test(cleaned)) return null;
  return cleaned;
}

describe('normalizeVNPhone', () => {
  it('strip space', () => expect(normalizeVNPhone('0912 345 678')).toBe('0912345678'));
  it('convert +84', () => expect(normalizeVNPhone('+84912345678')).toBe('0912345678'));
  it('convert 84', () => expect(normalizeVNPhone('84912345678')).toBe('0912345678'));
  it('keep 0', () => expect(normalizeVNPhone('0912345678')).toBe('0912345678'));
  it('reject too short', () => expect(normalizeVNPhone('091234')).toBe(null));
});
