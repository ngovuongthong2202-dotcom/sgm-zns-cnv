/**
 * Đợt 0A (BM03): mật khẩu không bao giờ được giữ trong state hay localStorage của phiên trình duyệt.
 * Vùng domain: không dùng any.
 */
const SECRET_SESSION_KEYS = ['password', 'passwordHash', 'matKhau'] as const;

export function stripSessionSecrets<T extends Record<string, unknown>>(data: T | null | undefined): Omit<T, 'password'> | null {
  if (!data || typeof data !== 'object') return null;
  const copy: Record<string, unknown> = { ...data };
  for (const k of SECRET_SESSION_KEYS) delete copy[k];
  return copy as Omit<T, 'password'>;
}

export function sessionHasSecrets(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  return SECRET_SESSION_KEYS.some(k => Object.prototype.hasOwnProperty.call(data, k));
}
