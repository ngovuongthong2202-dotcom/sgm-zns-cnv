import { describe, it, expect } from 'vitest';
import { toPublicZnsConfig, pickZnsConfigUpdate, ZNS_CONFIG_PUBLIC_FIELDS, ZNS_CONFIG_SECRET_FIELDS } from './zns-config.policy';

const savedDoc = {
  znsProvider: 'ZALO_OFFICIAL', zaloAppId: '123', zaloOaId: '456',
  zaloSecretKey: 'bi-mat-1', zaloRefreshToken: 'rt-1', zaloAccessToken: 'at-1', zaloTokenExpiresAt: 1_800_000_000_000,
  vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/bg', vendorWebhookSecret: '',
  maxRetries: 3, retryBackoffMs: 5000, requireSecret: true, isAsyncVendor: true, templateStrictMode: true,
  updatedAt: '2026-10-01T00:00:00.000Z', updatedBy: 'admin',
  // khóa đi vòng từ shim DocRef.get (ZNS05 "lớp cấu hình lồng")
  data: { zaloSecretKey: 'bi-mat-cu', data: { zaloRefreshToken: 'rt-cu' } }, id: 'zns_config', updated_at: '2026-09-30T00:00:00.000Z',
};

describe('zns-config.policy – Đợt 0A (ZNS05/Z0.3)', () => {
  it('toPublicZnsConfig: có ô công khai, hạn dùng, cờ secrets; KHÔNG có giá trị bí mật, không có data/id/updated_at', () => {
    const pub = toPublicZnsConfig(savedDoc);
    expect(pub.zaloAppId).toBe('123');
    expect(pub.vendorUrl_BAOGIA).toBe('https://hub.cnvcdp.com/webhook/bg');
    expect(pub.zaloTokenExpiresAt).toBe(1_800_000_000_000);
    expect(pub.secrets).toEqual({ zaloSecretKey: true, zaloRefreshToken: true, vendorWebhookSecret: false });
    for (const k of ['zaloSecretKey', 'zaloRefreshToken', 'zaloAccessToken', 'vendorWebhookSecret', 'data', 'id', 'updated_at']) {
      expect(pub, k).not.toHaveProperty(k);
    }
    expect(JSON.stringify(pub)).not.toContain('bi-mat');
    expect(JSON.stringify(pub)).not.toContain('rt-1');
    expect(JSON.stringify(pub)).not.toContain('at-1');
  });

  it('pickZnsConfigUpdate: thân form cũ đầy đủ → chỉ còn ô cho phép; mã truy cập/hạn dùng/data/id/updated_at/secrets bị bỏ và liệt kê', () => {
    const { payload, rejectedKeys, refreshTokenReplaced } = pickZnsConfigUpdate({
      ...savedDoc, secrets: { zaloSecretKey: true }, zaloSecretKey: '', zaloRefreshToken: '', updatedBy: 'thong', success: true,
    });
    for (const k of ZNS_CONFIG_PUBLIC_FIELDS) if (savedDoc[k as keyof typeof savedDoc] !== undefined) expect(payload[k], k).toEqual(savedDoc[k as keyof typeof savedDoc]);
    expect(payload.updatedBy).toBe('thong');
    for (const k of ['zaloAccessToken', 'zaloTokenExpiresAt', 'data', 'id', 'updated_at', 'updatedAt', 'secrets', 'success', 'zaloSecretKey', 'zaloRefreshToken']) {
      expect(payload, k).not.toHaveProperty(k);
    }
    expect(rejectedKeys.sort()).toEqual(['data', 'id', 'secrets', 'success', 'updatedAt', 'updated_at', 'zaloAccessToken', 'zaloTokenExpiresAt']);
    expect(refreshTokenReplaced).toBe(false);
  });

  it('bí mật: chuỗi rỗng và giá trị che bị bỏ qua; chuỗi mới được ghi; mã làm mới mới xóa mã truy cập/hạn dùng', () => {
    expect(pickZnsConfigUpdate({ zaloSecretKey: '', zaloRefreshToken: '   ', vendorWebhookSecret: '••••abcd' }).payload).toEqual({});
    const r = pickZnsConfigUpdate({ zaloRefreshToken: ' rt-moi ' });
    expect(r.payload).toEqual({ zaloRefreshToken: 'rt-moi', zaloAccessToken: '', zaloTokenExpiresAt: 0 });
    expect(r.refreshTokenReplaced).toBe(true);
    expect(pickZnsConfigUpdate({ zaloSecretKey: 'sec-moi' }).payload).toEqual({ zaloSecretKey: 'sec-moi' });
    expect(ZNS_CONFIG_SECRET_FIELDS).toEqual(['zaloSecretKey', 'zaloRefreshToken', 'vendorWebhookSecret']);
  });

  it('đầu vào null/undefined không ném', () => {
    expect(toPublicZnsConfig(undefined).secrets).toEqual({ zaloSecretKey: false, zaloRefreshToken: false, vendorWebhookSecret: false });
    expect(pickZnsConfigUpdate(null)).toEqual({ payload: {}, rejectedKeys: [], refreshTokenReplaced: false });
  });

  // Rà soát cuối (ZNS01): ô vendorUrl_* chỉ nhận https tới hub CNV; địa chỉ khác không được ghi (giá trị đang lưu giữ nguyên) và nằm trong rejectedKeys.
  it('vendorUrl_*: http:// tới hub CNV bị từ chối (không ghi, có trong rejectedKeys); https tới hub CNV được ghi', () => {
    const r = pickZnsConfigUpdate({ vendorUrl_BAOGIA: 'http://hub.cnvcdp.com/webhook/bg', vendorUrl_GIAOHANG_ZNS: 'https://hub.cnvcdp.com/webhook/gh' });
    expect(r.payload).toEqual({ vendorUrl_GIAOHANG_ZNS: 'https://hub.cnvcdp.com/webhook/gh' });
    expect(r.rejectedKeys).toEqual(['vendorUrl_BAOGIA']);
  });

  it('vendorUrl_*: máy chủ khác (kể cả tên giả dạng hub.cnvcdp.com.evil.example, đường dẫn chứa tên hub) hoặc chuỗi không phải địa chỉ bị từ chối; ô khác vẫn được ghi', () => {
    const r = pickZnsConfigUpdate({
      vendorUrl_BAOGIA: 'https://evil.example/hub.cnvcdp.com', vendorUrl_HOPDONG_SIGN_ZNS: 'https://hub.cnvcdp.com.evil.example/x',
      vendorUrl_DEFAULT: 'khong-phai-url', zaloAppId: '789',
    });
    expect(r.payload).toEqual({ zaloAppId: '789' });
    expect(r.rejectedKeys.sort()).toEqual(['vendorUrl_BAOGIA', 'vendorUrl_DEFAULT', 'vendorUrl_HOPDONG_SIGN_ZNS']);
  });

  it('vendorUrl_*: có tên đăng nhập/mật khẩu hoặc cổng khác 443 bị từ chối; cổng 443 được ghi; chuỗi rỗng vẫn theo luật cũ (ghi chuỗi rỗng)', () => {
    const r = pickZnsConfigUpdate({
      vendorUrl_BAOGIA: 'https://u:p@hub.cnvcdp.com/webhook/x', vendorUrl_GIAOHANG_ZNS: 'https://hub.cnvcdp.com:22/webhook/x',
      vendorUrl_THANH_TOAN_XAC_NHAN: 'https://hub.cnvcdp.com:443/webhook/tt', vendorUrl_GIAOHANG_HOANTAT: '',
    });
    expect(r.payload).toEqual({ vendorUrl_THANH_TOAN_XAC_NHAN: 'https://hub.cnvcdp.com:443/webhook/tt', vendorUrl_GIAOHANG_HOANTAT: '' });
    expect(r.rejectedKeys.sort()).toEqual(['vendorUrl_BAOGIA', 'vendorUrl_GIAOHANG_ZNS']);
  });
});
