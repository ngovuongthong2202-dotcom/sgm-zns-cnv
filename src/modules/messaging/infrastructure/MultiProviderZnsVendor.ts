import { ZnsMessageAggregate } from '../domain/ZnsMessage';
import { ZnsVendorPort } from '../domain/ZnsVendorPort';
import { zaloOfficialZnsVendor } from './ZaloOfficialZnsVendor';
import { znsVendor as cnvZnsVendor } from './CnvZnsVendor';
import { zaloTokenManager } from '../../../backend/services/zns/zalo-token-manager.service';
import { logger } from '../../../shared/lib/logger';

export class MultiProviderZnsVendor implements ZnsVendorPort {
  async send(message: ZnsMessageAggregate): Promise<{ trackingId: string; success: boolean; rawResponse: any; error?: string }> {
    const creds = await zaloTokenManager.getCredentials();
    const provider = creds.provider || 'HYBRID';

    // 1. Chế độ chỉ dùng Webhook CNV
    if (provider === 'CNV') {
      logger.info({ messageId: message.id }, '[MultiProviderZnsVendor] Định tuyến: Kênh Webhook CNV');
      return cnvZnsVendor.send(message);
    }

    // 2. Chế độ chỉ dùng Zalo OpenAPI Trực Tiếp
    if (provider === 'ZALO_OFFICIAL') {
      logger.info({ messageId: message.id }, '[MultiProviderZnsVendor] Định tuyến: Kênh Trực Tiếp Zalo OpenAPI');
      return zaloOfficialZnsVendor.send(message);
    }

    // 3. Chế độ Đa Kênh Thông Minh (HYBRID): Ưu tiên Zalo OpenAPI, tự động Fallback sang CNV
    const hasZaloConfig = Boolean((creds.appId && creds.secretKey) || creds.accessToken);

    if (hasZaloConfig) {
      logger.info({ messageId: message.id }, '[MultiProviderZnsVendor] Thử nghiệm gửi qua Zalo OpenAPI Trực Tiếp...');
      const directResult = await zaloOfficialZnsVendor.send(message);

      if (directResult.success) {
        return directResult;
      }

      // Nếu lỗi do dữ liệu Zalo từ chối (ví dụ SĐT không tồn tại, hết hạn mức), giữ nguyên kết quả lỗi rõ ràng
      if (directResult.error && directResult.error.includes('[Zalo Mã')) {
        return directResult;
      }

      logger.warn({ messageId: message.id, error: directResult.error }, '[MultiProviderZnsVendor] Gặp sự cố kết nối Zalo OpenAPI. Tự động Fallback sang Webhook CNV...');
    } else {
      logger.info({ messageId: message.id }, '[MultiProviderZnsVendor] Chưa cấu hình Zalo App. Định tuyến sang Webhook CNV...');
    }

    // Fallback sang CNV
    return cnvZnsVendor.send(message);
  }
}

export const multiProviderZnsVendor = new MultiProviderZnsVendor();
