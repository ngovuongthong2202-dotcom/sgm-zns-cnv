import { ZnsMessageAggregate } from '../domain/ZnsMessage';
import { ZnsVendorPort } from '../domain/ZnsVendorPort';
import { zaloTokenManager } from '../../../backend/services/zns/zalo-token-manager.service';
import { logger } from '../../../shared/lib/logger';
import { resilientFetch } from '../../../backend/lib/resilient-transport';
import { adminDb } from '../../../backend/config/supabase.admin';
import { translateZaloError } from '../../../backend/services/zns/zalo-error-dictionary';

/**
 * Ánh xạ mặc định các loại tin nhắn SGM sang 6 Template ID đã được duyệt trên Zalo OA
 */
export const DEFAULT_ZALO_TEMPLATE_MAP: Record<string, string> = {
  HOPDONG_SIGN_ZNS: '552604',           // XÁC NHẬN KÝ HỢP ĐỒNG THÀNH CÔNG
  GIAOHANG_ZNS: '552545',               // XÁC NHẬN GIAO HÀNG (Chính thức)
  GIAOHANG_HOANTAT: '552545',          // XÁC NHẬN GIAO HÀNG (Chính thức)
  THANH_TOAN_TAT_TOAN: '552490',       // XÁC NHẬN HOÀN TẤT THANH TOÁN
  THANH_TOAN_CONG_NO: '547381',         // XÁC NHẬN THANH TOÁN THÀNH CÔNG ver2
  THANH_TOAN_CONG_NO_DEN_HAN: '547381', // XÁC NHẬN THANH TOÁN THÀNH CÔNG ver2
  BAOGIA: '552604',                     // Fallback thông báo khách hàng
  CUSTOMER_PRE_QUOTE: '552604'         // Fallback thông báo khách hàng
};

export class ZaloOfficialZnsVendor implements ZnsVendorPort {
  /**
   * Chuẩn hóa số điện thoại theo chuẩn Zalo OpenAPI: 84xxxxxxxxx
   */
  private normalizePhoneForZalo(phone: string): string {
    let cleaned = String(phone || '').replace(/[\s.\-()]/g, '');
    if (cleaned.startsWith('+84')) cleaned = cleaned.slice(1);
    else if (cleaned.startsWith('0')) cleaned = '84' + cleaned.slice(1);
    else if (!cleaned.startsWith('84')) cleaned = '84' + cleaned;
    return cleaned;
  }

  /**
   * Trích xuất các tham số dữ liệu mẫu (template_data) từ payload chứng từ SGM
   */
  private extractTemplateData(payload: Record<string, any>, messageType: string): Record<string, any> {
    const p = payload || {};
    const dateFormatted = p.ngayKy || p.ngayThanhToan || p.ngayGiaoThucTe || p.ngayBaoGia || new Date().toLocaleDateString('vi-VN');
    const moneyFormatted = new Intl.NumberFormat('vi-VN').format(Number(p.soTien || p.totalAmount || p.giaTriHopDong || 0)) + ' đ';

    return {
      customer_name: p.tenKhachHang || p.customer_name || 'Quý khách hàng',
      customer_phone: p.sdt || p.phone || '',
      contract_code: p.soHopDong || p.maHopDong || p.contract_code || '---',
      quotation_code: p.soPhieuBaoGia || p.maBaoGia || '---',
      delivery_code: p.deliveryId || p.maGiaoHang || p.soPhieuXuat || '---',
      payment_code: p.paymentId || p.maThanhToan || p.soPhieuThu || '---',
      order_code: p.soDonHang || '---',
      total_amount: moneyFormatted,
      paid_amount: moneyFormatted,
      sign_date: dateFormatted,
      delivery_date: dateFormatted,
      payment_date: dateFormatted,
      machine_count: String(p.slMay || p.machine_count || '1'),
      officer_name: p.nguoiPhuTrach || 'Ngô Vương Thông',
      company_name: 'Công ty TNHH Sài Gòn Machinery (SGM)'
    };
  }

  async send(message: ZnsMessageAggregate): Promise<{ trackingId: string; success: boolean; rawResponse: any; error?: string }> {
    const props = message.props;
    const trackingId = message.id;

    // 1. Lấy Access Token hợp lệ
    const accessToken = await zaloTokenManager.getValidAccessToken();
    if (!accessToken) {
      const err = 'Chưa cấu hình hoặc không thể xác thực Token Zalo OA. Vui lòng kiểm tra Zalo App ID & Secret Key trong Cài đặt.';
      logger.error(`[ZaloOfficialZnsVendor] ${err}`);
      return { trackingId, success: false, rawResponse: null, error: err };
    }

    // 2. Tìm Template ID phù hợp
    let templateId = DEFAULT_ZALO_TEMPLATE_MAP[props.messageType] || '552604';
    try {
      const settingsDoc = await adminDb.collection('settings').doc('zns_config').get();
      const cfg = settingsDoc.exists ? settingsDoc.data() || {} : {};
      const customTpl = cfg[`templateId_${props.messageType}`];
      if (customTpl) templateId = String(customTpl).trim();
    } catch {
      // Giữ default template ID
    }

    // 3. Chuẩn hóa SĐT và Dữ liệu template
    const zaloPhone = this.normalizePhoneForZalo(props.phone);
    const templateData = this.extractTemplateData(props.payload || {}, props.messageType);

    const zaloPayload = {
      phone: zaloPhone,
      template_id: templateId,
      template_data: templateData,
      tracking_id: trackingId
    };

    logger.info({ trackingId, templateId, phone: zaloPhone }, '[ZaloOfficialZnsVendor] Gửi tin ZNS trực tiếp qua Zalo Cloud OpenAPI...');

    // 4. Gửi trực tiếp tới endpoint Zalo Business
    try {
      const response = await resilientFetch('https://business.openapi.zalo.me/message/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': accessToken
        },
        body: JSON.stringify(zaloPayload)
      });

      const responseBody = await response.json().catch(() => null);

      if (!response.ok || !responseBody || responseBody.error !== 0) {
        const errorCode = responseBody?.error ?? -1;
        const rawMsg = responseBody?.message || `HTTP ${response.status}`;
        const translated = translateZaloError(errorCode, rawMsg);
        const detailedError = `[Zalo Mã ${errorCode}]: ${translated.explanation} (${rawMsg})`;

        logger.warn({ trackingId, responseBody, detailedError }, '[ZaloOfficialZnsVendor] Zalo OpenAPI từ chối gửi tin');
        return {
          trackingId,
          success: false,
          rawResponse: responseBody,
          error: detailedError
        };
      }

      logger.info({ trackingId, msgId: responseBody.data?.msg_id }, '[ZaloOfficialZnsVendor] Gửi ZNS thành công qua Zalo OpenAPI!');
      return {
        trackingId,
        success: true,
        rawResponse: responseBody
      };
    } catch (err: any) {
      logger.error({ err, trackingId }, '[ZaloOfficialZnsVendor] Lỗi kết nối tới Zalo Cloud OpenAPI');
      return {
        trackingId,
        success: false,
        rawResponse: null,
        error: `Lỗi kết nối tới Zalo Cloud: ${err.message || String(err)}`
      };
    }
  }
}

export const zaloOfficialZnsVendor = new ZaloOfficialZnsVendor();
