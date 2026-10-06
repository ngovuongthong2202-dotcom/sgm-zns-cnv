import { ZnsMessageType } from '../enums/zns-status';

export interface ZbsTemplateParamDef {
  name: string;
  label: string;
  require: boolean;
  type: 'STRING' | 'NUMBER';
  maxLength?: number;
  sampleValue?: string;
  sourceKey?: string;
}

export interface ZbsTemplateInfo {
  templateId: string;
  messageType: ZnsMessageType | string;
  templateName: string;
  businessDomain: 'CUSTOMER' | 'QUOTATION' | 'CONTRACT' | 'PAYMENT' | 'DELIVERY';
  businessLabel: string;
  status: 'ENABLE' | 'PENDING' | 'REJECT';
  previewUrl: string;
  price: number; // in VND
  providerApp: 'CNV CDP' | 'ERP SGM' | 'Zalo OA';
  params: ZbsTemplateParamDef[];
  ctaButton?: {
    type: number;
    title: string;
    content?: string;
  };
}

export const ZBS_TEMPLATE_REGISTRY: Record<string, ZbsTemplateInfo> = {
  // 1. KHÁCH HÀNG (Trước báo giá) - ID 533060
  [ZnsMessageType.CUSTOMER_PRE_QUOTE]: {
    templateId: '533060',
    messageType: ZnsMessageType.CUSTOMER_PRE_QUOTE,
    templateName: 'THÔNG TIN GIẢI PHÁP MÁY CÔNG NGHIỆP',
    businessDomain: 'CUSTOMER',
    businessLabel: 'Khách hàng (Trước báo giá)',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/pAjNkTqfE-4Qw4VjWESmWg==',
    price: 300,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'phone', label: 'Số điện thoại', require: true, type: 'STRING', maxLength: 15, sourceKey: 'phone' },
      { name: 'cnv_campaign_id', label: 'Mã chiến dịch CNV', require: true, type: 'STRING', maxLength: 200, sourceKey: 'cnv_campaign_id' },
      { name: 'cnv_zns_template_id', label: 'Mã định danh mẫu CNV', require: true, type: 'STRING', maxLength: 200, sourceKey: 'cnv_zns_template_id' }
    ],
    ctaButton: {
      type: 4,
      title: 'Zalo Mini App',
      content: 'https://zalo.me/s/3633890484640040139'
    }
  },

  // 2. BÁO GIÁ - ID 533064
  [ZnsMessageType.BAOGIA]: {
    templateId: '533064',
    messageType: ZnsMessageType.BAOGIA,
    templateName: 'THÔNG BÁO BÁO GIÁ THÀNH CÔNG',
    businessDomain: 'QUOTATION',
    businessLabel: 'Phát hành Báo giá',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/pff4sPCAG3J9Q9jPWH7T_w==',
    price: 300,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'so_phieu_bao_gia', label: 'Số phiếu báo giá', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_phieu_bao_gia' },
      { name: 'ngay_bao_gia', label: 'Ngày lập báo giá', require: true, type: 'STRING', maxLength: 30, sourceKey: 'ngay_bao_gia' },
      { name: 'ngay_het_han', label: 'Hạn hiệu lực', require: true, type: 'STRING', maxLength: 30, sourceKey: 'ngay_het_han' },
      { name: 'sl_may', label: 'Số lượng thiết bị', require: true, type: 'STRING', maxLength: 30, sourceKey: 'sl_may' },
      { name: 'nguoi_phu_trach', label: 'Người phụ trách', require: true, type: 'STRING', maxLength: 30, sourceKey: 'nguoi_phu_trach' }
    ],
    ctaButton: {
      type: 3,
      title: 'Quan tâm OA',
      content: 'https://oa.zalo.me/1336150047301360288'
    }
  },

  // 3. HỢP ĐỒNG - ID 533068
  [ZnsMessageType.HOPDONG_SIGN_ZNS]: {
    templateId: '533068',
    messageType: ZnsMessageType.HOPDONG_SIGN_ZNS,
    templateName: 'XÁC NHẬN KÝ HỢP ĐỒNG THÀNH CÔNG',
    businessDomain: 'CONTRACT',
    businessLabel: 'Xác nhận ký kết Hợp đồng',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/SknOFLCi9zQ50l8HDUMjxg==',
    price: 300,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'phone', label: 'Số điện thoại', require: true, type: 'STRING', maxLength: 15, sourceKey: 'phone' },
      { name: 'order_code', label: 'Mã hợp đồng (order_code)', require: true, type: 'STRING', maxLength: 30, sourceKey: 'order_code' },
      { name: 'ngay_ky', label: 'Ngày ký', require: true, type: 'STRING', maxLength: 30, sourceKey: 'ngay_ky' },
      { name: 'so_ngay', label: 'Số ngày hoàn thành', require: true, type: 'NUMBER', maxLength: 30, sourceKey: 'so_ngay' },
      { name: 'so_phieu', label: 'Số phiếu nguồn (Báo giá)', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_phieu' },
      { name: 'nhan_vien', label: 'Nhân viên phụ trách', require: true, type: 'STRING', maxLength: 30, sourceKey: 'nhan_vien' }
    ],
    ctaButton: {
      type: 3,
      title: 'Quan tâm OA',
      content: 'https://oa.zalo.me/1336150047301360288'
    }
  },

  // 4. THANH TOÁN (Tất toán) - ID 552490
  [ZnsMessageType.THANH_TOAN_TAT_TOAN]: {
    templateId: '552490',
    messageType: ZnsMessageType.THANH_TOAN_TAT_TOAN,
    templateName: 'Copy of XÁC NHẬN HOÀN TẤT THANH TOÁN Ver2',
    businessDomain: 'PAYMENT',
    businessLabel: 'Xác nhận Hoàn tất Thanh toán (Tất toán)',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/K9RoUlGJ84MxA7ro2uFvSg==',
    price: 300,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'phone', label: 'Số điện thoại', require: true, type: 'STRING', maxLength: 15, sourceKey: 'phone' },
      { name: 'so_don_hang', label: 'Số đơn hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_don_hang' },
      { name: 'so_hop_dong', label: 'Số hợp đồng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_hop_dong' },
      { name: 'ngay_thanh_toan', label: 'Ngày thanh toán', require: true, type: 'STRING', maxLength: 30, sourceKey: 'ngay_thanh_toan' }
    ],
    ctaButton: {
      type: 3,
      title: 'Quan tâm OA',
      content: 'https://oa.zalo.me/1336150047301360288'
    }
  },

  // 5. THANH TOÁN (Chưa tất toán - Công nợ) - ID 547381
  [ZnsMessageType.THANH_TOAN_CONG_NO]: {
    templateId: '547381',
    messageType: ZnsMessageType.THANH_TOAN_CONG_NO,
    templateName: 'XÁC NHẬN THANH TOÁN THÀNH CÔNG ver2',
    businessDomain: 'PAYMENT',
    businessLabel: 'Xác nhận Thanh toán Công nợ (Một phần)',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/G2X5E2KDV4mofu5AYE_31g==',
    price: 300,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'phone', label: 'Số điện thoại', require: true, type: 'STRING', maxLength: 15, sourceKey: 'phone' },
      { name: 'order_code', label: 'Mã hợp đồng/đơn hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'order_code' },
      { name: 'time', label: 'Thời điểm thanh toán', require: true, type: 'STRING', maxLength: 30, sourceKey: 'time' },
      { name: 'so_luong', label: 'Số lượng thiết bị', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_luong' }
    ],
    ctaButton: {
      type: 3,
      title: 'Quan tâm OA',
      content: 'https://oa.zalo.me/1336150047301360288'
    }
  },

  // 6. GIAO HÀNG (Xác nhận giao hàng) - ID 552545
  [ZnsMessageType.GIAOHANG_ZNS]: {
    templateId: '552545',
    messageType: ZnsMessageType.GIAOHANG_ZNS,
    templateName: 'XÁC NHẬN GIAO HÀNG (Chính thức)',
    businessDomain: 'DELIVERY',
    businessLabel: 'Xác nhận Giao hàng thực tế',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/6owlfEU7_kRf8Bdw6219Ww==',
    price: 300,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'phone', label: 'Số điện thoại', require: true, type: 'STRING', maxLength: 15, sourceKey: 'phone' },
      { name: 'So_hop_dong', label: 'Số hợp đồng (So_hop_dong)', require: true, type: 'STRING', maxLength: 30, sourceKey: 'So_hop_dong' },
      { name: 'So_don_hang', label: 'Số đơn hàng (So_don_hang)', require: true, type: 'STRING', maxLength: 30, sourceKey: 'So_don_hang' },
      { name: 'so_phieu_xuat', label: 'Số phiếu xuất kho', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_phieu_xuat' },
      { name: 'ngay_giao_may', label: 'Ngày bàn giao máy', require: true, type: 'STRING', maxLength: 30, sourceKey: 'ngay_giao_may' },
      { name: 'danh_sach_ma_may', label: 'Danh sách mã máy', require: true, type: 'STRING', maxLength: 200, sourceKey: 'danh_sach_ma_may' },
      { name: 'so_luong', label: 'Số lượng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'so_luong' },
      { name: 'dvt', label: 'Đơn vị tính', require: true, type: 'STRING', maxLength: 30, sourceKey: 'dvt' }
    ],
    ctaButton: {
      type: 3,
      title: 'Quan tâm OA',
      content: 'https://oa.zalo.me/1336150047301360288'
    }
  },

  // 7. GIAO HÀNG (Kích hoạt bảo hành) - ID 531052
  [ZnsMessageType.GIAOHANG_BAOHANH]: {
    templateId: '531052',
    messageType: ZnsMessageType.GIAOHANG_BAOHANH,
    templateName: 'XÁC NHẬN KÍCH HOẠT BẢO HÀNH THÀNH CÔNG',
    businessDomain: 'DELIVERY',
    businessLabel: 'Kích hoạt Bảo hành Thiết bị',
    status: 'ENABLE',
    previewUrl: 'https://account.zalo.cloud/znspreview/v9aNqe_8InJ-3hAblqyzdA==',
    price: 500,
    providerApp: 'CNV CDP',
    params: [
      { name: 'customer_name', label: 'Tên khách hàng', require: true, type: 'STRING', maxLength: 30, sourceKey: 'customer_name' },
      { name: 'ma_bao_hanh', label: 'Mã bảo hành / Số phiếu', require: true, type: 'STRING', maxLength: 30, sourceKey: 'ma_bao_hanh' },
      { name: 'product', label: 'Sản phẩm / Dòng máy', require: true, type: 'STRING', maxLength: 30, sourceKey: 'product' },
      { name: 'date', label: 'Ngày kích hoạt bảo hành', require: true, type: 'STRING', maxLength: 30, sourceKey: 'date' }
    ],
    ctaButton: {
      type: 2,
      title: 'Hotline: 0932000999',
      content: '0932000999'
    }
  }
};

/**
 * Tra cứu thông tin mẫu ZBS dựa theo messageType hoặc subtype
 */
export function getZbsTemplateInfo(messageType: string, subtype?: string): ZbsTemplateInfo | undefined {
  if (
    messageType === 'PAYMENT' || 
    messageType === 'THANH_TOAN' || 
    messageType === ZnsMessageType.THANH_TOAN_TAT_TOAN || 
    messageType === ZnsMessageType.THANH_TOAN_CONG_NO
  ) {
    if (subtype === 'TAT_TOAN' || subtype === 'Tất toán' || subtype === '552490' || subtype === ZnsMessageType.THANH_TOAN_TAT_TOAN) {
      return ZBS_TEMPLATE_REGISTRY[ZnsMessageType.THANH_TOAN_TAT_TOAN];
    }
    if (subtype === 'CONG_NO' || subtype === 'Công nợ' || subtype === '547381' || subtype === ZnsMessageType.THANH_TOAN_CONG_NO) {
      return ZBS_TEMPLATE_REGISTRY[ZnsMessageType.THANH_TOAN_CONG_NO];
    }
    return ZBS_TEMPLATE_REGISTRY[messageType] || ZBS_TEMPLATE_REGISTRY[ZnsMessageType.THANH_TOAN_CONG_NO];
  }

  if (
    messageType === 'DELIVERY' || 
    messageType === 'GIAOHANG' || 
    messageType === ZnsMessageType.GIAOHANG_ZNS || 
    messageType === ZnsMessageType.GIAOHANG_BAOHANH || 
    messageType === 'GIAOHANG_HOANTAT'
  ) {
    if (
      subtype === 'BAOHANH' || 
      subtype === 'Bảo hành' || 
      subtype === '531052' || 
      subtype === ZnsMessageType.GIAOHANG_BAOHANH || 
      subtype === 'HOANTAT'
    ) {
      return ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_BAOHANH];
    }
    if (subtype === 'GIAOHANG_ZNS' || subtype === '552545' || subtype === ZnsMessageType.GIAOHANG_ZNS) {
      return ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_ZNS];
    }
    if (messageType === 'GIAOHANG_HOANTAT') {
      return ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_BAOHANH];
    }
    return ZBS_TEMPLATE_REGISTRY[messageType] || ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_ZNS];
  }

  if (messageType === 'GIAOHANG_HOANTAT') {
    return ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_BAOHANH];
  }

  return ZBS_TEMPLATE_REGISTRY[messageType];
}
