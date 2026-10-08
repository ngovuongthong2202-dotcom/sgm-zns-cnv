import { describe, it, expect } from 'vitest';
import { ZBS_TEMPLATE_REGISTRY, getZbsTemplateInfo } from '@/src/domain/constants/zbs-template.registry';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { ZaloOfficialZnsVendor } from '@/src/modules/messaging/infrastructure/ZaloOfficialZnsVendor';
import { ZnsMessageAggregate } from '@/src/modules/messaging/domain/ZnsMessage';
import { resolveVendorUrl } from '@/src/backend/services/zns/outbound-helpers';

describe('ZBS Universal Template Registry & Dispatch Matrix', () => {
  it('should define all 7 required business templates with correct official IDs', () => {
    // 1. Khách Hàng (Trước báo giá)
    const custTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.CUSTOMER_PRE_QUOTE];
    expect(custTemplate).toBeDefined();
    expect(custTemplate.templateId).toBe('533060');
    expect(custTemplate.businessDomain).toBe('CUSTOMER');
    expect(custTemplate.previewUrl).toContain('account.zalo.cloud');

    // 2. Báo Giá
    const quoteTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.BAOGIA];
    expect(quoteTemplate).toBeDefined();
    expect(quoteTemplate.templateId).toBe('647061');
    expect(quoteTemplate.businessDomain).toBe('QUOTATION');

    // 3. Hợp Đồng
    const contractTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.HOPDONG_SIGN_ZNS];
    expect(contractTemplate).toBeDefined();
    expect(contractTemplate.templateId).toBe('533068');
    expect(contractTemplate.businessDomain).toBe('CONTRACT');

    // 4 & 5. Thanh Toán Hợp Nhất 2026 (Mẫu 646935)
    const payFullTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.THANH_TOAN_TAT_TOAN];
    expect(payFullTemplate).toBeDefined();
    expect(payFullTemplate.templateId).toBe('646935');
    expect(payFullTemplate.businessDomain).toBe('PAYMENT');

    const payDebtTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.THANH_TOAN_CONG_NO];
    expect(payDebtTemplate).toBeDefined();
    expect(payDebtTemplate.templateId).toBe('646935');
    expect(payDebtTemplate.businessDomain).toBe('PAYMENT');

    // 6. Giao Hàng (Xác nhận giao hàng)
    const delivTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_ZNS];
    expect(delivTemplate).toBeDefined();
    expect(delivTemplate.templateId).toBe('552545');
    expect(delivTemplate.businessDomain).toBe('DELIVERY');

    // 7. Giao Hàng (Kích hoạt bảo hành)
    const warrantyTemplate = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.GIAOHANG_BAOHANH];
    expect(warrantyTemplate).toBeDefined();
    expect(warrantyTemplate.templateId).toBe('531052');
    expect(warrantyTemplate.businessDomain).toBe('DELIVERY');
  });

  it('should accurately resolve template info via getZbsTemplateInfo with subtypes and aliases', () => {
    // Payment resolution (Hợp nhất về Mẫu 646935)
    const payFull = getZbsTemplateInfo('PAYMENT', 'TAT_TOAN');
    expect(payFull?.templateId).toBe('646935');

    const payDebt = getZbsTemplateInfo('PAYMENT', 'CONG_NO');
    expect(payDebt?.templateId).toBe('646935');

    // Delivery resolution
    const deliveryRoute = getZbsTemplateInfo('DELIVERY', 'GIAOHANG_ZNS');
    expect(deliveryRoute?.templateId).toBe('552545');

    const deliveryWarranty = getZbsTemplateInfo('DELIVERY', 'BAOHANH');
    expect(deliveryWarranty?.templateId).toBe('531052');

    // Legacy GIAOHANG_HOANTAT alias
    const hoanTatAlias = getZbsTemplateInfo('GIAOHANG_HOANTAT');
    expect(hoanTatAlias?.templateId).toBe('531052');
  });

  it('should extract valid template_data conforming to Zalo OpenAPI specifications', () => {
    const vendor = new ZaloOfficialZnsVendor();
    const extractFn = (vendor as any).extractTemplateData.bind(vendor);

    // 1. Customer template data (533060)
    const custData = extractFn(
      { customer_name: 'Công ty Cán Tôn A', phone: '0901234567' },
      ZnsMessageType.CUSTOMER_PRE_QUOTE
    );
    expect(custData.customer_name).toBe('Công ty Cán Tôn A');
    expect(custData.cnv_campaign_id).toBe('SGM_CSKH_2026');
    expect(custData.cnv_zns_template_id).toBe('533060');

    // 2. Contract template data (533068): so_ngay MUST be NUMBER
    const contractData = extractFn(
      { 
        customer_name: 'Nguyễn Văn A', 
        soHopDong: 'HD-2026-0001', 
        thoiGianThucHien: '45',
        nguoiPhuTrach: 'Kỹ sư Hoàng'
      },
      ZnsMessageType.HOPDONG_SIGN_ZNS
    );
    expect(contractData.so_ngay).toBe(45);
    expect(typeof contractData.so_ngay).toBe('number');
    expect(contractData.order_code).toBe('HD-2026-0001');

    // 3. Delivery template data (552545)
    const deliveryData = extractFn(
      {
        customer_name: 'Xưởng Tôn Miền Tây',
        soHopDong: 'HD-2026-0002',
        soDonHang: 'DH-0002',
        deliveryId: 'XK-999',
        slMay: 2
      },
      ZnsMessageType.GIAOHANG_ZNS
    );
    expect(deliveryData.So_hop_dong).toBe('HD-2026-0002');
    expect(deliveryData.So_don_hang).toBe('DH-0002');
    expect(deliveryData.so_phieu_xuat).toBe('XK-999');

    // 4. Warranty template data (531052)
    const warrantyData = extractFn(
      {
        customer_name: 'Khách hàng B',
        soPhieuXuat: 'XK-888',
        sanPham: 'Máy Cán 2 Tầng'
      },
      ZnsMessageType.GIAOHANG_BAOHANH
    );
    expect(warrantyData.ma_bao_hanh).toBe('XK-888');
    expect(warrantyData.product).toBe('Máy Cán 2 Tầng');
    expect(warrantyData.date).toBeDefined();
  });

  it('should enforce length guardrails on string parameters', () => {
    const vendor = new ZaloOfficialZnsVendor();
    const extractFn = (vendor as any).extractTemplateData.bind(vendor);

    const longStringPayload = {
      customer_name: 'Tên Khách Hàng Rất Dài Vượt Quá 30 Ký Tự Để Kiểm Tra Guardrail',
      so_phieu_bao_gia: 'BG-2026-99999999999999999999999999999999999'
    };

    const extracted = extractFn(longStringPayload, ZnsMessageType.BAOGIA);
    expect(extracted.customer_name.length).toBeLessThanOrEqual(30);
    expect(extracted.so_phieu_bao_gia.length).toBeLessThanOrEqual(30);
  });

  it('should validate and create ZnsMessageAggregate with THANH_TOAN_XAC_NHAN successfully', () => {
    const aggregateResult = ZnsMessageAggregate.create({
      entityId: 'pay-test-001',
      entityType: 'PAYMENT',
      messageType: ZnsMessageType.THANH_TOAN_XAC_NHAN,
      phone: '0901234567',
      payload: {
        customer_name: 'Khách hàng SGM',
        soHopDong: 'HD-2026-0002',
        soDonHang: 'DH-ERP-001-26',
        soTien: 5000000,
        loai_don: 'Cung cấp Máy móc/Thiết Bị'
      }
    });

    expect(aggregateResult.isSuccess).toBe(true);
    const msg = aggregateResult.getValue();
    expect(msg.props.messageType).toBe('THANH_TOAN_XAC_NHAN');
    expect(msg.props.status).toBe('INIT');
  });

  it('should resolve webhook URL for THANH_TOAN_XAC_NHAN with fallback to THANH_TOAN_TAT_TOAN', () => {
    // 1. With explicit vendorUrl_THANH_TOAN_XAC_NHAN
    const url1 = resolveVendorUrl({ vendorUrl_THANH_TOAN_XAC_NHAN: 'https://hub.cnvcdp.com/webhook/test-xacnhan' }, 'THANH_TOAN_XAC_NHAN');
    expect(url1).toBe('https://hub.cnvcdp.com/webhook/test-xacnhan');

    // 2. With fallback to vendorUrl_THANH_TOAN_TAT_TOAN
    const url2 = resolveVendorUrl({ vendorUrl_THANH_TOAN_TAT_TOAN: 'https://hub.cnvcdp.com/webhook/test-tattoan' }, 'THANH_TOAN_XAC_NHAN');
    expect(url2).toBe('https://hub.cnvcdp.com/webhook/test-tattoan');

    // 3. From default environment config
    const url3 = resolveVendorUrl({}, 'THANH_TOAN_XAC_NHAN');
    expect(url3).toBeDefined();
    expect(url3).toContain('hub.cnvcdp.com/webhook');
  });

  it('should extract all 12 parameters required for Template 646935 (Xác nhận thanh toán)', () => {
    const vendor = new ZaloOfficialZnsVendor();
    const extractFn = (vendor as any).extractTemplateData.bind(vendor);

    const paymentPayload = {
      customer_name: 'Công ty Cơ Khí An Phát',
      phone: '0912345678',
      soHopDong: 'HD-2026-0002',
      soDonHang: 'DH-ERP-001-26',
      soPhieuBaoGia: 'BG-2026-0038',
      nguoiPhuTrach: 'Ngô Vương Thông (SGM)',
      ngayThanhToan: '07/10/2026',
      soTien: 2200000,
      ghiChu: 'Thanh toán đợt 2 theo tiến độ',
      loai_don: 'Cung cấp Máy móc/Thiết Bị'
    };

    const extracted = extractFn(paymentPayload, ZnsMessageType.THANH_TOAN_XAC_NHAN);
    expect(extracted.customer_name).toBe('Công ty Cơ Khí An Phát');
    expect(extracted.so_phieu).toBe('HD-2026-0002');
    expect(extracted.order_code).toBe('DH-ERP-001-26');
    expect(extracted.ma_bao_gia).toBe('BG-2026-0038');
    expect(extracted.nhan_vien).toBe('Ngô Vương Thông');
    expect(extracted.date).toBe('07/10/2026');
    expect(extracted.ghi_chu).toBe('Thanh toán đợt 2 theo tiến độ');
    expect(extracted.diem_thanh_toan).toBe('2.200');
    expect(extracted.loai_don).toBe('Cung cấp Máy móc/Thiết Bị');
    expect(extracted.ma_tra_cuu).toBe('DH-ERP-001-26');
  });
});
