import { ZnsMessageAggregate } from '../domain/ZnsMessage';
import { ZnsVendorPort } from '../domain/ZnsVendorPort';
import { zaloTokenManager } from '../../../backend/services/zns/zalo-token-manager.service';
import { logger } from '../../../shared/lib/logger';
import { resilientFetch } from '../../../backend/lib/resilient-transport';
import { adminDb } from '../../../backend/config/supabase.admin';
import { translateZaloError } from '../../../backend/services/zns/zalo-error-dictionary';
import { sanitizeZnsCustomerName, sanitizeZnsPersonName } from '../../../backend/services/zns/zns-payload.builder';
import { formatZnsDate } from '../../../shared/utils/formatDate';

/**
 * Ánh xạ chuẩn xác 7 loại tin nhắn SGM sang đúng 7 Template ID đã được duyệt trên Zalo OA
 */
export const DEFAULT_ZALO_TEMPLATE_MAP: Record<string, string> = {
  CUSTOMER_PRE_QUOTE: '533060',         // 1. THÔNG TIN GIẢI PHÁP MÁY CÔNG NGHIỆP
  BAOGIA: '533064',                     // 2. THÔNG BÁO BÁO GIÁ THÀNH CÔNG
  HOPDONG_SIGN_ZNS: '533068',           // 3. XÁC NHẬN KÝ HỢP ĐỒNG THÀNH CÔNG
  THANH_TOAN_TAT_TOAN: '552490',       // 4. XÁC NHẬN HOÀN TẤT THANH TOÁN (Tất toán)
  THANH_TOAN_CONG_NO: '547381',         // 5. XÁC NHẬN THANH TOÁN THÀNH CÔNG ver2 (Công nợ)
  THANH_TOAN_CONG_NO_DEN_HAN: '547381', // 5. XÁC NHẬN THANH TOÁN THÀNH CÔNG ver2 (Công nợ)
  GIAOHANG_ZNS: '552545',               // 6. XÁC NHẬN GIAO HÀNG (Chính thức)
  GIAOHANG_HOANTAT: '531052',          // 7. XÁC NHẬN KÍCH HOẠT BẢO HÀNH THÀNH CÔNG
  GIAOHANG_BAOHANH: '531052'           // 7. XÁC NHẬN KÍCH HOẠT BẢO HÀNH THÀNH CÔNG
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
  public extractTemplateData(payload: Record<string, any>, messageType: string): Record<string, any> {
    const p = payload || {};
    const rawDate = p.ngayKy || p.ngayThanhToan || p.ngayGiaoThucTe || p.ngayBaoGia || new Date();
    const dateFormatted = formatZnsDate(rawDate);
    const moneyFormatted = new Intl.NumberFormat('vi-VN').format(Number(p.soTien || p.totalAmount || p.giaTriHopDong || 0)) + ' đ';
    const machineCountStr = String(p.slMay || p.machine_count || (Array.isArray(p.items) ? p.items.length : 1));

    // 1. Ưu tiên tuyệt đối trường "Chuẩn ZNS" (tenZns / ten_zns) để customer_name không vượt quá 30 ký tự
    const znsCandidate = p.tenZns || p.ten_zns || p.tenKhachHangZns || p.customer_name_zns;
    let customerName = (znsCandidate || p.customer_name || p.tenKhachHang || 'Quý khách hàng').toString().trim();
    if (customerName.length > 30) {
      customerName = sanitizeZnsCustomerName(customerName);
    }
    if (customerName.length > 30) {
      customerName = customerName.slice(0, 30).trim();
    }

    // 2. Nhận diện người phụ trách & nhân viên (Bắt buộc theo chuẩn Zalo: tối đa 30 ký tự, bóc tách chức danh trong ngoặc)
    const rawOfficer = (p.nguoiPhuTrach || p.nhanVien || p.officer_name || 'Ngô Vương Thông').toString().trim();
    const cleanOfficer = sanitizeZnsPersonName(rawOfficer);

    // 3. Chuẩn hóa mã chứng từ (tối đa 30 ký tự)
    const quotationCode = String(p.soPhieuBaoGia || p.maBaoGia || p.id || '---').slice(0, 30);
    const contractCode = String(p.soHopDong || p.maHopDong || p.contractCode || '---').slice(0, 30);
    const orderCode = String(p.soDonHang || p.orderCode || p.soHopDong || '---').slice(0, 30);
    // Ưu tiên tuyệt đối: p.order_code (được chọn từ UI/Override) -> contractCode (Số Hợp đồng) -> orderCode (Số Đơn hàng)
    const resolvedContractOrderCode = String(p.order_code || p.soHopDong || p.maHopDong || p.soDonHang || '---').slice(0, 30);
    const paymentCode = String(p.soPhieuThu || p.paymentId || p.maThanhToan || '---').slice(0, 30);
    const deliveryCode = String(p.soPhieuXuat || p.deliveryId || p.maGiaoHang || '---').slice(0, 30);
    let machineList = String(p.danhSachMaMay || p.maMay || 'Thiết bị tiêu chuẩn').trim();
    if (machineList.length > 200) {
      machineList = machineList.slice(0, 197) + '...';
    }

    // Số ngày hoàn thành cho template Hợp đồng (yêu cầu kiểu NUMBER)
    const rawSoNgay = parseInt(String(p.soNgayDuKienHoanThanh || p.thoiGianThucHien || p.soNgay || p.so_ngay || 30).replace(/\D/g, '') || '30', 10);
    const soNgayNum = isNaN(rawSoNgay) ? 30 : rawSoNgay;

    const templateData: Record<string, any> = {
      // 1. Nhận diện khách hàng (Bắt buộc theo chuẩn Zalo: tối đa 30 ký tự)
      customer_name: customerName,
      customer_phone: p.sdt || p.phone || '',
      phone: p.sdt || p.phone || '',

      // 1b. Tham số đối tác CNV CDP cho Khách hàng (Template 533060)
      cnv_campaign_id: String(p.cnv_campaign_id || p.campaign_id || 'SGM_CSKH_2026'),
      cnv_zns_template_id: String(p.cnv_zns_template_id || '533060'),
      cnv_tracking_id: String(p.cnv_tracking_id || p.trackingId || 'SGM_TRACK_01'),

      // 2. Phân hệ Báo giá (Template 533064)
      so_phieu_bao_gia: quotationCode,
      quotation_code: quotationCode,
      ngay_bao_gia: formatZnsDate(p.ngay_bao_gia || p.ngayBaoGia || dateFormatted),
      ngay_het_han: formatZnsDate(p.ngay_het_han || p.ngayHetHan || p.ngayHieuLuc || dateFormatted),
      sl_may: machineCountStr,
      machine_count: machineCountStr,
      nguoi_phu_trach: cleanOfficer,
      officer_name: cleanOfficer,

      // 3. Phân hệ Hợp đồng (Template 533068)
      so_hop_dong: contractCode,
      contract_code: contractCode,
      order_code: resolvedContractOrderCode,
      so_don_hang: orderCode,
      ngay_ky: formatZnsDate(p.ngay_ky || p.ngayKy || dateFormatted),
      sign_date: formatZnsDate(p.sign_date || p.ngayKy || dateFormatted),
      so_ngay: soNgayNum,
      so_phieu: quotationCode || contractCode,
      nhan_vien: cleanOfficer,

      // 4. Phân hệ Thanh toán (Tất toán: 552490, Công nợ: 547381)
      payment_code: paymentCode,
      so_tien: moneyFormatted,
      so_tien_thanh_toan: moneyFormatted,
      total_amount: moneyFormatted,
      paid_amount: moneyFormatted,
      ngay_thanh_toan: formatZnsDate(p.ngay_thanh_toan || p.ngayThanhToan || dateFormatted),
      payment_date: formatZnsDate(p.payment_date || p.ngayThanhToan || dateFormatted),
      time: formatZnsDate(p.time || p.ngayThanhToan || dateFormatted),

      // 5. Phân hệ Giao hàng (Xác nhận giao hàng: 552545)
      So_hop_dong: contractCode,
      So_don_hang: orderCode,
      so_phieu_xuat: deliveryCode,
      delivery_code: deliveryCode,
      ngay_giao_may: formatZnsDate(p.ngay_giao_may || p.ngayGiaoThucTe || p.ngayGiaoHang || dateFormatted),
      delivery_date: formatZnsDate(p.delivery_date || p.ngayGiaoThucTe || p.ngayGiaoHang || dateFormatted),
      danh_sach_ma_may: machineList,
      dvt: String(p.dvt || 'Máy').slice(0, 30),
      so_luong: machineCountStr,

      // 6. Phân hệ Kích hoạt Bảo hành (Template 531052)
      ma_bao_hanh: String(p.ma_bao_hanh || p.serial || (Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay[0] : null) || p.soPhieuXuat || p.deliveryId || 'BH-SGM').slice(0, 30),
      product: String(p.product || (contractCode !== '---' ? ('Theo ' + contractCode) : (orderCode !== '---' ? ('Theo ' + orderCode) : (p.sanPham || p.tenMay || 'Theo HĐ SGM')))).slice(0, 30),
      date: formatZnsDate(p.date || p.expiryDateFormatted || p.ngayGiaoThucTe || p.ngayGiaoHang || dateFormatted),

      // 7. Nhận diện công ty (≤ 30 ký tự)
      company_name: 'Cơ Khí Sài Gòn (SGM)'
    };

    // Universal safety guardrail: Đảm bảo không biến văn bản nào vượt quá 30 ký tự (ngoại trừ danh sách máy, mã CNV & URLs)
    for (const [key, val] of Object.entries(templateData)) {
      if (
        typeof val === 'string' && 
        key !== 'danh_sach_ma_may' && 
        key !== 'cnv_campaign_id' &&
        key !== 'cnv_zns_template_id' &&
        key !== 'cnv_tracking_id' &&
        !key.includes('link') && 
        !key.includes('url') && 
        val.length > 30
      ) {
        templateData[key] = val.slice(0, 30).trim();
      }
    }

    return templateData;
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
    let templateData = this.extractTemplateData(props.payload || {}, props.messageType);

    // Strict whitelisting for Template 531052 (Kích hoạt bảo hành) to avoid Zalo OpenAPI error -124
    if (templateId === '531052' || props.messageType === 'GIAOHANG_HOANTAT' || props.messageType === 'GIAOHANG_BAOHANH') {
      templateData = {
        customer_name: templateData.customer_name,
        ma_bao_hanh: templateData.ma_bao_hanh,
        product: templateData.product,
        date: templateData.date
      };
    }

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
