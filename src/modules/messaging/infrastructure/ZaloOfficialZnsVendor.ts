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
  BAOGIA: '533064',                     // THÔNG BÁO BÁO GIÁ THÀNH CÔNG
  CUSTOMER_PRE_QUOTE: '533060'         // THÔNG TIN GIẢI PHÁP MÁY CÔNG NGHIỆP
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
   * Cung cấp đồng thời cả tên tiếng Việt theo duyệt mẫu Zalo OA và tên chuẩn tiếng Anh
   */
  private extractTemplateData(payload: Record<string, any>, messageType: string): Record<string, any> {
    const p = payload || {};
    const dateFormatted = p.ngayKy || p.ngayThanhToan || p.ngayGiaoThucTe || p.ngayBaoGia || new Date().toLocaleDateString('vi-VN');
    const moneyFormatted = new Intl.NumberFormat('vi-VN').format(Number(p.soTien || p.totalAmount || p.giaTriHopDong || 0)) + ' đ';
    const machineCountStr = String(p.slMay || p.machine_count || (Array.isArray(p.items) ? p.items.length : 1));

    return {
      // 1. Nhận diện khách hàng
      customer_name: p.tenKhachHang || p.customer_name || 'Quý khách hàng',
      customer_phone: p.sdt || p.phone || '',
      phone: p.sdt || p.phone || '',

      // 2. Phân hệ Báo giá
      so_phieu_bao_gia: p.soPhieuBaoGia || p.maBaoGia || p.id || '---',
      quotation_code: p.soPhieuBaoGia || p.maBaoGia || p.id || '---',
      ngay_bao_gia: p.ngayBaoGia || dateFormatted,
      ngay_het_han: p.ngayHetHan || p.ngayHieuLuc || dateFormatted,
      sl_may: machineCountStr,
      machine_count: machineCountStr,
      nguoi_phu_trach: p.nguoiPhuTrach || 'Ngô Vương Thông',
      officer_name: p.nguoiPhuTrach || 'Ngô Vương Thông',

      // 3. Phân hệ Hợp đồng
      so_hop_dong: p.soHopDong || p.maHopDong || '---',
      contract_code: p.soHopDong || p.maHopDong || '---',
      order_code: p.soDonHang || p.soHopDong || '---',
      so_don_hang: p.soDonHang || p.soHopDong || '---',
      ngay_ky: p.ngayKy || dateFormatted,
      sign_date: p.ngayKy || dateFormatted,
      so_phieu: p.soPhieuBaoGia || p.soHopDong || '---',
      nhan_vien: p.nguoiPhuTrach || 'Ngô Vương Thông',

      // 4. Phân hệ Thanh toán
      payment_code: p.soPhieuThu || p.paymentId || p.maThanhToan || '---',
      so_tien: moneyFormatted,
      so_tien_thanh_toan: moneyFormatted,
      total_amount: moneyFormatted,
      paid_amount: moneyFormatted,
      ngay_thanh_toan: p.ngayThanhToan || dateFormatted,
      payment_date: p.ngayThanhToan || dateFormatted,
      time: p.ngayThanhToan || dateFormatted,

      // 5. Phân hệ Giao hàng
      so_phieu_xuat: p.soPhieuXuat || p.deliveryId || p.maGiaoHang || '---',
      delivery_code: p.soPhieuXuat || p.deliveryId || p.maGiaoHang || '---',
      ngay_giao_may: p.ngayGiaoThucTe || p.ngayGiaoHang || dateFormatted,
      delivery_date: p.ngayGiaoThucTe || p.ngayGiaoHang || dateFormatted,
      danh_sach_ma_may: p.danhSachMaMay || p.maMay || 'Thiết bị tiêu chuẩn',
      dvt: p.dvt || 'Máy',
      so_luong: machineCountStr,

      // 6. Nhận diện công ty
      company_name: 'Công ty TNHH Cơ Khí Công Nghiệp Sài Gòn (SGM)'
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
