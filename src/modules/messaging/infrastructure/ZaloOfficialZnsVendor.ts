import { ZnsMessageAggregate } from '../domain/ZnsMessage';
import { ZnsVendorPort } from '../domain/ZnsVendorPort';
import { zaloTokenManager } from '../../../backend/services/zns/zalo-token-manager.service';
import { logger } from '../../../shared/lib/logger';
import { resilientFetch } from '../../../backend/lib/resilient-transport';
import { adminDb } from '../../../backend/config/supabase.admin';
import { translateZaloError } from '../../../backend/services/zns/zalo-error-dictionary';
import { sanitizeZnsCustomerName, sanitizeZnsPersonName } from '../../../backend/services/zns/zns-payload.builder';
import { formatZnsDate } from '../../../shared/utils/formatDate';
import { calculateFormattedPaymentPoints } from '../../billing/domain/loyaltyEngine';
import { formatZnsQuotationProducts } from '../../../widgets/product-list-input/useProductItemSemantic';

/**
 * Ánh xạ chuẩn xác 7 loại tin nhắn SGM sang đúng 7 Template ID đã được duyệt trên Zalo OA
 */
export const DEFAULT_ZALO_TEMPLATE_MAP: Record<string, string> = {
  CUSTOMER_PRE_QUOTE: '533060',         // 1. THÔNG TIN GIẢI PHÁP MÁY CÔNG NGHIỆP
  BAOGIA: '647061',                     // 2. THÔNG BÁO BÁO GIÁ THÀNH CÔNG (Mẫu 647061 Chuẩn ZBS 2026 - 800đ)
  HOPDONG_SIGN_ZNS: '647737',           // 3. XÁC NHẬN KÝ HỢP ĐỒNG THÀNH CÔNG (Mẫu 647737 Chuẩn ZBS 2026 - 800đ)
  THANH_TOAN_TAT_TOAN: '646935',       // 4. XÁC NHẬN THANH TOÁN (Mẫu Hợp Nhất 646935)
  THANH_TOAN_CONG_NO: '646935',         // 5. XÁC NHẬN THANH TOÁN (Mẫu Hợp Nhất 646935)
  THANH_TOAN_CONG_NO_DEN_HAN: '646935', // 5. XÁC NHẬN THANH TOÁN (Mẫu Hợp Nhất 646935)
  THANH_TOAN_XAC_NHAN: '646935',        // Mẫu Xác Nhận Thanh Toán 646935 (Chuẩn 2026)
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
    const totalCountFromProducts = Array.isArray(p.products) && p.products.length > 0
      ? p.products.reduce((acc: number, item: any) => acc + (Number(item.quantity || item.soLuong) || 1), 0)
      : (Array.isArray(p.items) ? p.items.length : 1);
    const machineCountStr = String(p.sl_may || p.slMay || p.soLuong || p.machine_count || totalCountFromProducts || 1);

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
    const quotationCode = String(p.ma_bao_gia || p.soPhieuBaoGia || p.maBaoGia || p.id || '---').slice(0, 30);
    const contractCode = String(p.so_phieu || p.soHopDong || p.maHopDong || p.contractCode || '---').slice(0, 30);
    const orderCode = String(p.order_code || p.soDonHang || p.orderCode || (contractCode !== '---' ? contractCode : '---')).slice(0, 30);
    // Ưu tiên: Đối với Thanh toán (646935), order_code là Số Đơn Hàng; đối với Hợp đồng (533068), order_code ưu tiên Số Hợp Đồng
    const resolvedContractOrderCode = messageType.includes('THANH_TOAN')
      ? String(p.order_code || p.soDonHang || p.orderCode || (contractCode !== '---' ? contractCode : '---')).slice(0, 30)
      : String(p.order_code || p.soHopDong || p.maHopDong || p.soDonHang || '---').slice(0, 30);
    const paymentCode = String(p.soPhieuThu || p.paymentId || p.maThanhToan || '---').slice(0, 30);
    const deliveryCode = String(p.soPhieuXuat || p.deliveryId || p.maGiaoHang || '---').slice(0, 30);
    let machineList = String(p.danhSachMaMay || p.maMay || 'Thiết bị tiêu chuẩn').trim();
    if (machineList.length > 200) {
      machineList = machineList.slice(0, 197) + '...';
    }

    // Số ngày hoàn thành cho template Hợp đồng (yêu cầu kiểu NUMBER)
    const rawSoNgay = parseInt(String(p.soNgayDuKienHoanThanh || p.thoiGianThucHien || p.soNgay || p.so_ngay || 30).replace(/\D/g, '') || '30', 10);
    const soNgayNum = isNaN(rawSoNgay) ? 30 : rawSoNgay;

    // Phân loại Loại Đơn (loai_don)
    let loaiDon = String(p.loai_don || p.loaiDon || '').trim();
    if (!loaiDon) {
      const loai = String(p.loai || p.loaiBaoGia || '').toUpperCase();
      if (loai.includes('VAT_TU') || loai.includes('VẬT TƯ')) {
        loaiDon = 'Cung cấp Vật Tư';
      } else if (loai.includes('DICH_VU') || loai.includes('DỊCH VỤ')) {
        loaiDon = 'Cung cấp giải pháp/dịch vụ';
      } else {
        loaiDon = 'Cung cấp Máy móc/Thiết Bị';
      }
    }

    const ghiChu = String(p.ghi_chu || p.ghiChu || p.note || 'Thanh toán đợt hợp đồng').slice(0, 100);
    const rawPaymentAmount = Number(p.so_tien || p.soTien || p.amount || 0);
    const diemThanhToan = String(p.diem_thanh_toan || p.diemThanhToan || calculateFormattedPaymentPoints(rawPaymentAmount));
    const diemKhachHang = String(p.diem_khach_hang || p.diemKhachHang || p.diemTichLuy || diemThanhToan);
    const isQuotationMsg = messageType.includes('BAOGIA') || (Boolean(p.soPhieuBaoGia) && !p.soHopDong);
    const maTraCuu = String(
      p.ma_tra_cuu || p.maTraCuu || 
      (isQuotationMsg && quotationCode !== '---' 
        ? quotationCode 
        : (orderCode !== '---' ? orderCode : (contractCode !== '---' ? contractCode : (quotationCode !== '---' ? quotationCode : 'DH-SGM'))))
    ).trim();

    const templateData: Record<string, any> = {
      // 1. Nhận diện khách hàng (Bắt buộc theo chuẩn Zalo: tối đa 30 ký tự)
      customer_name: customerName,
      customer_phone: p.sdt || p.phone || '',
      phone: p.sdt || p.phone || '',

      // 1b. Tham số đối tác CNV CDP cho Khách hàng (Template 533060)
      cnv_campaign_id: String(p.cnv_campaign_id || p.campaign_id || 'SGM_CSKH_2026'),
      cnv_zns_template_id: String(p.cnv_zns_template_id || '533060'),
      cnv_tracking_id: String(p.cnv_tracking_id || p.trackingId || 'SGM_TRACK_01'),

      // 2. Phân hệ Báo giá (Template 533064 Chuẩn ZBS 2026)
      loai_don: loaiDon,
      ma_bao_gia: quotationCode,
      so_phieu_bao_gia: quotationCode,
      quotation_code: quotationCode,
      ngay_bao_gia: formatZnsDate(p.ngay_bao_gia || p.ngayBaoGia || dateFormatted),
      ngay_het_han: formatZnsDate(p.ngay_het_han || p.ngayHetHan || p.ngayHieuLuc || dateFormatted),
      product_1: String(p.product_1 || (Array.isArray(p.products) ? formatZnsQuotationProducts(p.products, 200).product_1 : '') || 'Thiết bị công nghiệp SGM').slice(0, 200).trim(),
      product_2: String(p.product_2 || (Array.isArray(p.products) ? formatZnsQuotationProducts(p.products, 200).product_2 : '') || '......').slice(0, 200).trim(),
      sl_may: machineCountStr,
      machine_count: machineCountStr,
      nguoi_phu_trach: cleanOfficer,
      officer_name: cleanOfficer,

      // 3. Phân hệ Hợp đồng (Template 647737 Chuẩn ZBS 2026)
      so_hop_dong: contractCode,
      contract_code: contractCode,
      order_code: (messageType.includes('HOPDONG') && orderCode !== '---') ? orderCode : resolvedContractOrderCode,
      so_don_hang: orderCode,
      ngay_ky: formatZnsDate(p.ngay_ky || p.ngayKy || dateFormatted),
      sign_date: formatZnsDate(p.sign_date || p.ngayKy || dateFormatted),
      so_ngay: soNgayNum,
      so_phieu: (messageType.includes('HOPDONG') || p.soHopDong) 
        ? (contractCode !== '---' ? contractCode : (p.so_phieu || quotationCode)) 
        : ((messageType.includes('THANH_TOAN') || p.so_phieu) 
          ? (contractCode !== '---' ? contractCode : quotationCode) 
          : (quotationCode !== '---' ? quotationCode : contractCode)),
      nhan_vien: cleanOfficer,

      // 4. Phân hệ Thanh toán & Điểm Thưởng Tích Hợp MDM (Template 2026 / 552490 / 547381)
      payment_code: paymentCode,
      so_tien: moneyFormatted,
      so_tien_thanh_toan: moneyFormatted,
      total_amount: moneyFormatted,
      paid_amount: moneyFormatted,
      ngay_thanh_toan: formatZnsDate(p.ngay_thanh_toan || p.ngayThanhToan || dateFormatted),
      payment_date: formatZnsDate(p.payment_date || p.ngayThanhToan || dateFormatted),
      time: formatZnsDate(p.time || p.ngayThanhToan || dateFormatted),
      date: formatZnsDate(p.date || p.expiryDateFormatted || p.ngayGiaoThucTe || p.ngayGiaoHang || p.ngayThanhToan || dateFormatted),
      ghi_chu: ghiChu,
      diem_thanh_toan: diemThanhToan,
      diem_khach_hang: diemKhachHang,

      // Tham số URL Tra Cứu Đơn Hàng (Cách 1: ma_tra_cuu; Cách 2 dự phòng: ma_don, ma_hd, so_bg)
      ma_tra_cuu: maTraCuu,
      ma_don: orderCode,
      ma_hd: contractCode,
      so_bg: quotationCode,

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
        key !== 'product_1' &&
        key !== 'product_2' &&
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

    // Strict whitelisting & safety guardrails for Template 647061 (Báo giá hoàn tất Chuẩn ZBS 2026)
    if (templateId === '647061' || templateId === '533064' || props.messageType === 'BAOGIA') {
      templateData = {
        customer_name: templateData.customer_name || 'Quý khách hàng',
        phone: templateData.phone || zaloPhone,
        loai_don: templateData.loai_don || 'Cung cấp Máy móc/Thiết Bị',
        ma_bao_gia: templateData.ma_bao_gia || templateData.so_phieu_bao_gia || 'BGM-2026-1149',
        ngay_bao_gia: templateData.ngay_bao_gia || formatZnsDate(new Date()),
        ngay_het_han: templateData.ngay_het_han || formatZnsDate(new Date(Date.now() + 7 * 86400000)),
        product_1: (templateData.product_1 || 'Thiết bị công nghiệp SGM').slice(0, 200).trim(),
        product_2: (templateData.product_2 || '......').slice(0, 200).trim(),
        sl_may: String(templateData.sl_may || 1),
        nhan_vien: templateData.nhan_vien || templateData.nguoi_phu_trach || 'Ngô Vương Thông',
        ma_tra_cuu: templateData.ma_tra_cuu || templateData.ma_bao_gia || templateData.so_phieu_bao_gia || 'BGM-2026-1149'
      };
    }

    // Strict whitelisting & safety guardrails for Template 647737 (Xác nhận ký hợp đồng thành công Chuẩn ZBS 2026 - 800đ)
    if (templateId === '647737' || templateId === '533068' || props.messageType === 'HOPDONG_SIGN_ZNS') {
      const parsedSoNgay = typeof templateData.so_ngay === 'number' ? templateData.so_ngay : (parseInt(String(templateData.so_ngay || 30).replace(/\D/g, ''), 10) || 30);
      const rawSoLuong = props.payload?.so_luong ?? props.payload?.soLuong ?? props.payload?.sl_may ?? templateData.sl_may ?? 1;
      const parsedSoLuong = typeof rawSoLuong === 'number' ? rawSoLuong : (parseInt(String(rawSoLuong).replace(/\D/g, ''), 10) || 1);

      templateData = {
        customer_name: templateData.customer_name || 'Quý khách hàng',
        phone: templateData.phone || zaloPhone,
        loai_don: templateData.loai_don || 'Cung cấp Máy móc/Thiết Bị',
        so_phieu: templateData.so_hop_dong && templateData.so_hop_dong !== '---' ? templateData.so_hop_dong : (templateData.so_phieu !== '---' ? templateData.so_phieu : 'HD-SGM'),
        order_code: templateData.so_don_hang && templateData.so_don_hang !== '---' ? templateData.so_don_hang : (templateData.order_code !== '---' ? templateData.order_code : 'DH-SGM'),
        ma_bao_gia: templateData.ma_bao_gia && templateData.ma_bao_gia !== '---' ? templateData.ma_bao_gia : 'BG-SGM',
        ngay_ky: templateData.ngay_ky || formatZnsDate(new Date()),
        so_ngay: parsedSoNgay,
        nhan_vien: templateData.nhan_vien || templateData.nguoi_phu_trach || 'Ngô Vương Thông',
        so_luong: parsedSoLuong,
        ma_tra_cuu: templateData.ma_tra_cuu || templateData.so_hop_dong || templateData.order_code || 'HD-SGM'
      };
    }

    // Strict whitelisting & safety guardrails for Template 646935 (Xác nhận thanh toán)
    if (templateId === '646935' || props.messageType === 'THANH_TOAN_XAC_NHAN' || props.messageType === 'THANH_TOAN_TAT_TOAN' || props.messageType === 'THANH_TOAN_CONG_NO') {
      templateData = {
        customer_name: templateData.customer_name || 'Quý khách hàng',
        phone: templateData.phone || zaloPhone,
        so_phieu: templateData.so_phieu && templateData.so_phieu !== '---' ? templateData.so_phieu : (templateData.order_code !== '---' ? templateData.order_code : 'HD-SGM'),
        order_code: templateData.order_code && templateData.order_code !== '---' ? templateData.order_code : (templateData.so_phieu !== '---' ? templateData.so_phieu : 'DH-SGM'),
        ma_bao_gia: templateData.ma_bao_gia && templateData.ma_bao_gia !== '---' ? templateData.ma_bao_gia : 'BG-SGM',
        nhan_vien: templateData.nhan_vien || 'Ngô Vương Thông',
        date: templateData.date || formatZnsDate(new Date()),
        ghi_chu: templateData.ghi_chu || 'Thanh toán đợt hợp đồng',
        diem_thanh_toan: templateData.diem_thanh_toan || '0',
        ...(templateData.loai_don ? { loai_don: templateData.loai_don } : {}),
        ...(templateData.diem_khach_hang ? { diem_khach_hang: templateData.diem_khach_hang } : {}),
        ...(templateData.ma_tra_cuu ? { ma_tra_cuu: templateData.ma_tra_cuu } : {})
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
