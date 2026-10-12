/**
 * Đợt 0A (ZNS05/Z0.3; BM-02/BM-03): danh sách ô cho phép của tài liệu settings/zns_config.
 * - GET không bao giờ trả giá trị bí mật, chỉ trả cờ secrets.<ô> = "đã lưu".
 * - POST chỉ nhận ô liệt kê. Không nhận mã truy cập/hạn dùng (máy chủ tự làm mới), không nhận data/id/updated_at
 *   (khóa đi vòng từ GET cũ, nguồn của "lớp cấu hình lồng"), không nhận updatedAt (máy chủ đặt).
 * - Bí mật chỉ nhận khi là chuỗi không rỗng và không phải giá trị che; chuỗi rỗng = "không đổi".
 * - Ô vendorUrl_* chỉ nhận địa chỉ https của hub CNV (isAllowedVendorUrl, rà soát cuối ZNS01); địa chỉ khác không ghi (giá trị đang lưu
 *   giữ nguyên) và nằm trong rejectedKeys. Chuỗi rỗng vẫn theo luật cũ.
 */
export const ZNS_CONFIG_PUBLIC_FIELDS = [
  'znsProvider', 'zaloAppId', 'zaloOaId',
  'vendorUrl_CUSTOMER_PRE_QUOTE', 'vendorUrl_BAOGIA', 'vendorUrl_HOPDONG_SIGN_ZNS', 'vendorUrl_THANH_TOAN_XAC_NHAN',
  'vendorUrl_THANH_TOAN_TAT_TOAN', 'vendorUrl_THANH_TOAN_CONG_NO', 'vendorUrl_GIAOHANG_ZNS', 'vendorUrl_GIAOHANG_HOANTAT', 'vendorUrl_DEFAULT',
  'maxRetries', 'retryBackoffMs', 'requireSecret', 'isAsyncVendor', 'templateStrictMode',
] as const;

export const ZNS_CONFIG_SECRET_FIELDS = ['zaloSecretKey', 'zaloRefreshToken', 'vendorWebhookSecret'] as const;
export type ZnsConfigSecretField = (typeof ZNS_CONFIG_SECRET_FIELDS)[number];

export interface ZnsConfigPublic extends Record<string, unknown> {
  secrets: Record<ZnsConfigSecretField, boolean>;
}

export interface ZnsConfigUpdate {
  payload: Record<string, unknown>;
  rejectedKeys: string[];
  refreshTokenReplaced: boolean;
}

const PUBLIC_SET: ReadonlySet<string> = new Set(ZNS_CONFIG_PUBLIC_FIELDS);
const SECRET_SET: ReadonlySet<string> = new Set(ZNS_CONFIG_SECRET_FIELDS);
const MASK_PATTERN = /^[•*]{3,}.{0,4}$/;
const ALLOWED_VENDOR_HOSTS: readonly string[] = ['hub.cnvcdp.com'];

/** Đợt 0A (ZNS01): chỉ https tới hub CNV, không tên đăng nhập/mật khẩu, cổng mặc định. Dùng cho ping (zns.routes.ts) và khi lưu ô vendorUrl_*. */
export function isAllowedVendorUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && ALLOWED_VENDOR_HOSTS.includes(u.hostname)
      && !u.username && !u.password && (u.port === '' || u.port === '443');
  } catch {
    return false;
  }
}

const isBlank = (v: unknown): boolean => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

export function toPublicZnsConfig(doc: Record<string, unknown> | null | undefined): ZnsConfigPublic {
  const src = doc || {};
  const out: Record<string, unknown> = {};
  for (const k of ZNS_CONFIG_PUBLIC_FIELDS) if (src[k] !== undefined) out[k] = src[k];
  if (src.zaloTokenExpiresAt !== undefined) out.zaloTokenExpiresAt = src.zaloTokenExpiresAt;
  if (src.updatedAt !== undefined) out.updatedAt = src.updatedAt;
  if (src.updatedBy !== undefined) out.updatedBy = src.updatedBy;
  const secrets = {} as Record<ZnsConfigSecretField, boolean>;
  for (const k of ZNS_CONFIG_SECRET_FIELDS) secrets[k] = typeof src[k] === 'string' && (src[k] as string).trim().length > 0;
  return { ...out, secrets };
}

export function pickZnsConfigUpdate(body: Record<string, unknown> | null | undefined): ZnsConfigUpdate {
  const src = body || {};
  const payload: Record<string, unknown> = {};
  const rejectedKeys: string[] = [];
  let refreshTokenReplaced = false;
  for (const [k, v] of Object.entries(src)) {
    if (PUBLIC_SET.has(k) || k === 'updatedBy') {
      // outbound-helpers gửi dữ liệu khách thật tới các ô này: địa chỉ ngoài hub CNV không được ghi (rà soát cuối ZNS01).
      if (k.startsWith('vendorUrl_') && !isBlank(v) && !isAllowedVendorUrl(v)) { rejectedKeys.push(k); continue; }
      payload[k] = v;
      continue;
    }
    if (SECRET_SET.has(k)) {
      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (trimmed && !MASK_PATTERN.test(trimmed)) {
          payload[k] = trimmed;
          if (k === 'zaloRefreshToken') refreshTokenReplaced = true;
        }
      }
      continue;
    }
    rejectedKeys.push(k);
  }
  if (refreshTokenReplaced) {
    payload.zaloAccessToken = '';
    payload.zaloTokenExpiresAt = 0;
  }
  return { payload, rejectedKeys, refreshTokenReplaced };
}
