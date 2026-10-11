import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../../shared/lib/logger';
import { resilientFetch } from '../../lib/resilient-transport';
import { sendZaloAlert } from '../alerting.service';

export interface ZaloOaCredentials {
  provider?: 'ZALO_OFFICIAL' | 'CNV' | 'HYBRID';
  appId?: string;
  secretKey?: string;
  oaId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number;
  updatedAt?: string;
}

export class ZaloTokenManagerService {
  private inFlightRefreshPromise: Promise<string | null> | null = null;
  /** Đợt 0A (Z0.3): một hàng đợi cho MỌI lần gọi Zalo OAuth (tự làm mới lẫn "Kiểm tra kết nối") để hai đường không xoay mã làm mới hai lần. */
  private refreshQueue: Promise<unknown> = Promise.resolve();

  private runExclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.refreshQueue.then(task, task);
    this.refreshQueue = run.catch(() => undefined);
    return run;
  }

  /**
   * Lấy cấu hình Zalo OA từ CSDL settings/zns_config hoặc Environment
   */
  public async getCredentials(): Promise<ZaloOaCredentials> {
    try {
      const doc = await adminDb.collection('settings').doc('zns_config').get();
      const data = doc.exists ? doc.data() || {} : {};

      return {
        provider: data.znsProvider || (process.env.ZNS_PROVIDER as any) || 'HYBRID',
        appId: data.zaloAppId || process.env.ZALO_APP_ID || '',
        secretKey: data.zaloSecretKey || process.env.ZALO_SECRET_KEY || '',
        oaId: data.zaloOaId || process.env.ZALO_OA_ID || '',
        accessToken: data.zaloAccessToken || process.env.ZALO_ACCESS_TOKEN || '',
        refreshToken: data.zaloRefreshToken || process.env.ZALO_REFRESH_TOKEN || '',
        tokenExpiresAt: Number(data.zaloTokenExpiresAt || process.env.ZALO_TOKEN_EXPIRES_AT || 0),
        updatedAt: data.updatedAt || ''
      };
    } catch (err) {
      logger.error({ err }, '[ZaloTokenManager] Lỗi đọc cấu hình Zalo OA từ CSDL');
      return {
        provider: 'HYBRID',
        appId: process.env.ZALO_APP_ID || '',
        secretKey: process.env.ZALO_SECRET_KEY || '',
        oaId: process.env.ZALO_OA_ID || '',
        accessToken: process.env.ZALO_ACCESS_TOKEN || '',
        refreshToken: process.env.ZALO_REFRESH_TOKEN || '',
        tokenExpiresAt: 0
      };
    }
  }

  /**
   * Cập nhật thông tin xác thực Zalo OA vào CSDL
   */
  public async saveCredentials(creds: Partial<ZaloOaCredentials>): Promise<void> {
    const docRef = adminDb.collection('settings').doc('zns_config');
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString()
    };

    if (creds.provider !== undefined) updateData.znsProvider = creds.provider;
    if (creds.appId !== undefined) updateData.zaloAppId = creds.appId;
    if (creds.secretKey !== undefined) updateData.zaloSecretKey = creds.secretKey;
    if (creds.oaId !== undefined) updateData.zaloOaId = creds.oaId;
    if (creds.accessToken !== undefined) updateData.zaloAccessToken = creds.accessToken;
    if (creds.refreshToken !== undefined) updateData.zaloRefreshToken = creds.refreshToken;
    if (creds.tokenExpiresAt !== undefined) updateData.zaloTokenExpiresAt = creds.tokenExpiresAt;

    await docRef.set(updateData, { merge: true });
    logger.info('[ZaloTokenManager] Đã cập nhật cấu hình Zalo OA vào CSDL');
  }

  /**
   * Lấy Access Token hợp lệ. Nếu sắp hết hạn (< 15 phút), tự động gọi API Zalo để refresh.
   */
  public async getValidAccessToken(): Promise<string | null> {
    const creds = await this.getCredentials();
    const now = Date.now();
    const marginMs = 15 * 60 * 1000; // 15 phút an toàn

    // 1. Nếu access token còn hạn sử dụng an toàn (> 15 phút), dùng ngay không cần gọi Zalo
    if (creds.accessToken && creds.tokenExpiresAt && (creds.tokenExpiresAt - now > marginMs)) {
      return creds.accessToken;
    }

    // 2. Nếu thiếu App ID hoặc Secret Key nhưng access token vẫn chưa quá hạn, dùng tạm
    if (!creds.appId || !creds.secretKey) {
      if (creds.accessToken && (!creds.tokenExpiresAt || creds.tokenExpiresAt > now)) {
        return creds.accessToken;
      }
      return creds.accessToken || null;
    }

    // 3. Nếu không có refresh token, không thể tự làm mới
    if (!creds.refreshToken) {
      if (creds.accessToken && (!creds.tokenExpiresAt || creds.tokenExpiresAt > now)) {
        return creds.accessToken;
      }
      return null;
    }

    // 4. Khóa chống Race-Condition khi nhiều request cùng xin refresh đồng thời
    if (this.inFlightRefreshPromise) {
      return this.inFlightRefreshPromise;
    }

    this.inFlightRefreshPromise = this.runExclusive(() => this.performTokenRefresh(creds)).finally(() => {
      this.inFlightRefreshPromise = null;
    });

    return this.inFlightRefreshPromise;
  }

  /**
   * Gọi Zalo OAuth v4 để đổi refresh_token lấy access_token mới
   */
  private async performTokenRefresh(creds: ZaloOaCredentials): Promise<string | null> {
    try {
      logger.info('[ZaloTokenManager] Bắt đầu tự động làm mới Access Token Zalo qua Refresh Token...');

      const response = await resilientFetch('https://oauth.zaloapp.com/v4/oa/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'secret_key': creds.secretKey!
        },
        body: new URLSearchParams({
          app_id: creds.appId!,
          grant_type: 'refresh_token',
          refresh_token: creds.refreshToken!
        }).toString()
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || data.error || !data.access_token) {
        const errorMsg = data?.message || data?.error_description || JSON.stringify(data);
        return this.handleRefreshFailure(creds, `Zalo từ chối làm mới mã: ${errorMsg}`);
      }

      const newAccessToken = data.access_token;
      const newRefreshToken = data.refresh_token || creds.refreshToken;
      const expiresInSec = Number(data.expires_in) || 90000; // Mặc định 25 giờ
      const newExpiresAt = Date.now() + (expiresInSec * 1000);

      await this.saveCredentials({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenExpiresAt: newExpiresAt
      });

      logger.info(`[ZaloTokenManager] Làm mới Token Zalo thành công! Hạn dùng mới: ${new Date(newExpiresAt).toISOString()}`);
      return newAccessToken;
    } catch (err: any) {
      return this.handleRefreshFailure(creds, `Lỗi mạng khi gọi Zalo OAuth: ${err?.message || String(err)}`);
    }
  }

  /**
   * Đợt 0A (Z0.3): làm mới thất bại thì BÁO (log lỗi + cảnh báo hệ thống), không âm thầm dùng tạm mã cũ:
   * mã cũ chỉ được trả khi còn trong hạn; đã hết hạn → null để lần gửi lỗi rõ ràng thay vì "có vẻ gửi" bằng mã chết.
   */
  private async handleRefreshFailure(creds: ZaloOaCredentials, reason: string): Promise<string | null> {
    logger.error({ reason }, '[ZaloTokenManager] Làm mới Access Token Zalo thất bại');
    try {
      await sendZaloAlert(`[ZNS] Làm mới mã Zalo thất bại: ${reason}. Kiểm tra Cài đặt → Vendor & Webhook; có thể phải cấp quyền lại OA và gõ Refresh Token mới.`);
    } catch (alertErr) {
      logger.warn({ err: alertErr }, '[ZaloTokenManager] Không ghi được cảnh báo làm mới mã');
    }
    const stillValid = Boolean(creds.accessToken) && Number(creds.tokenExpiresAt || 0) > Date.now();
    return stillValid ? (creds.accessToken as string) : null;
  }

  /**
   * Gọi Zalo OAuth v4 để cấp mới Token với tham số truyền trực tiếp từ client (test connection)
   */
  public refreshTokenDirect(appId: string, secretKey: string, refreshToken: string, oaId?: string): Promise<{ success: boolean; accessToken?: string; expiresAt?: number; error?: string }> {
    // Đợt 0A (Z0.3): đi qua cùng hàng đợi với tự làm mới — nút "Kiểm tra kết nối" và cron không xoay mã làm mới hai lần.
    return this.runExclusive(async () => {
      try {
        logger.info({ appId }, '[ZaloTokenManager] Xác thực & cấp mới Token Zalo trực tiếp...');
        const response = await resilientFetch('https://oauth.zaloapp.com/v4/oa/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'secret_key': secretKey
          },
          body: new URLSearchParams({
            app_id: appId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken
          }).toString()
        });

        const data = await response.json().catch(() => null);

        if (!response.ok || !data || data.error || !data.access_token) {
          const errorMsg = data?.message || data?.error_description || (data?.error ? `Mã lỗi Zalo: ${data.error}` : 'Lỗi không xác định từ Zalo OAuth');
          return { success: false, error: errorMsg };
        }

        const newAccessToken = data.access_token;
        const newRefreshToken = data.refresh_token || refreshToken;
        const expiresInSec = Number(data.expires_in) || 90000;
        const newExpiresAt = Date.now() + (expiresInSec * 1000);

        await this.saveCredentials({
          appId,
          secretKey,
          oaId,
          refreshToken: newRefreshToken,
          accessToken: newAccessToken,
          tokenExpiresAt: newExpiresAt
        });

        return { success: true, accessToken: newAccessToken, expiresAt: newExpiresAt };
      } catch (err: any) {
        return { success: false, error: err.message || String(err) };
      }
    });
  }
}

export const zaloTokenManager = new ZaloTokenManagerService();
