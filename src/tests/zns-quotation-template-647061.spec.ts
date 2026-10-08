import { describe, it, expect } from 'vitest';
import { ZBS_TEMPLATE_REGISTRY } from '../domain/constants/zbs-template.registry';
import { ZnsMessageType } from '../domain/enums/zns-status';
import { zaloOfficialZnsVendor } from '../modules/messaging/infrastructure/ZaloOfficialZnsVendor';
import { znsPayloadBuilder } from '../backend/services/zns/zns-payload.builder';
import { templateRendererService } from '../backend/services/zns/template-renderer.service';
import { formatZnsQuotationProducts } from '../widgets/product-list-input/useProductItemSemantic';

describe('ZBS Quotation Template 647061 & Semantic Product Packaging Integration', () => {
  it('verifies ZBS Template Registry for BAOGIA adheres strictly to 647061 specification', () => {
    const template = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.BAOGIA];
    expect(template).toBeDefined();
    expect(template.templateId).toBe('647061');
    expect(template.templateName).toBe('Xác nhận báo giá');
    expect(template.price).toBe(800);
    expect(template.ctaButtons).toBeDefined();
    expect(template.ctaButtons?.length).toBe(2);
    expect(template.ctaButtons?.[0].title).toBe('Đến trang thông tin OA');
    expect(template.ctaButtons?.[1].title).toBe('Tra cứu báo giá');
    expect(template.ctaButtons?.[1].content).toBe('https://sgm-os.onrender.com/tra-cuu-bao-gia?code=<ma_tra_cuu>');

    // Check parameters
    const paramNames = template.params.map(p => p.name);
    expect(paramNames).toContain('customer_name');
    expect(paramNames).toContain('phone');
    expect(paramNames).toContain('loai_don');
    expect(paramNames).toContain('ma_bao_gia');
    expect(paramNames).toContain('ngay_bao_gia');
    expect(paramNames).toContain('ngay_het_han');
    expect(paramNames).toContain('product_1');
    expect(paramNames).toContain('product_2');
    expect(paramNames).toContain('sl_may');
    expect(paramNames).toContain('nhan_vien');
    expect(paramNames).toContain('ma_tra_cuu');

    const p1 = template.params.find(p => p.name === 'product_1');
    const p2 = template.params.find(p => p.name === 'product_2');
    expect(p1?.maxLength).toBe(200);
    expect(p2?.maxLength).toBe(200);
  });

  it('correctly splits 4 mixed items into product_1 (machines) and product_2 (material + service)', () => {
    const items = [
      { name: 'Máy Hàn Laser Fiber 1500W', quantity: 1, type: 'MAY_MOC' },
      { name: 'Máy Cắt Laser Fiber CNC', quantity: 1, type: 'MAY_MOC' },
      { name: 'Kính bảo hộ Laser bước sóng 1064nm', quantity: 2, type: 'VAT_TU' },
      { name: 'Bảo trì định kỳ máy laser 12 tháng', quantity: 1, type: 'DICH_VU' }
    ];

    const result = formatZnsQuotationProducts(items);
    expect(result.product_1).toContain('Máy Hàn Laser Fiber 1500W');
    expect(result.product_1).toContain('Máy Cắt Laser Fiber CNC');
    expect(result.product_2).toContain('Kính bảo hộ Laser bước sóng 1064nm (x2)');
    expect(result.product_2).toContain('Bảo trì định kỳ máy laser 12 tháng');
    expect(result.product_1.length).toBeLessThanOrEqual(200);
    expect(result.product_2.length).toBeLessThanOrEqual(200);
  });

  it('sets product_2 to "......" when quotation only contains 1 item', () => {
    const items = [
      { name: 'Máy Cán Tôn Sóng Vuông 9 Sóng', quantity: 1, type: 'MAY_MOC' }
    ];

    const result = formatZnsQuotationProducts(items);
    expect(result.product_1).toBe('Máy Cán Tôn Sóng Vuông 9 Sóng');
    expect(result.product_2).toBe('......');
  });

  it('safely truncates overflow items to representative item + " | ...... "', () => {
    const superLongName = 'Hệ thống Dây chuyền Tự động hóa Dập uốn định hình liên tục đa chức năng công suất cao 1000kW thế hệ mới năm 2026';
    const items = [
      { name: superLongName, quantity: 1, type: 'MAY_MOC' },
      { name: 'Hệ thống cấp phôi tự động bổ sung siêu trường siêu trọng tốc độ cao', quantity: 1, type: 'MAY_MOC' },
      { name: 'Máy nén khí trục vít công nghiệp 50HP', quantity: 1, type: 'MAY_MOC' },
      { name: 'Dịch vụ lắp đặt', quantity: 1, type: 'DICH_VU' }
    ];

    const result = formatZnsQuotationProducts(items);
    expect(result.product_1.length).toBeLessThanOrEqual(200);
    expect(result.product_1).toContain('| ......');
    expect(result.product_2).toContain('Dịch vụ lắp đặt');
  });

  it('truncates ultra long single item to <= 200 chars with " | ...... "', () => {
    const ultraLong = 'Dây chuyền máy cán tôn tự động công suất lớn tích hợp máy xả cuộn '.repeat(5);
    const result = formatZnsQuotationProducts([{ name: ultraLong }]);
    expect(result.product_1.length).toBeLessThanOrEqual(200);
    expect(result.product_1).toContain('| ......');
    expect(result.product_2).toBe('......');
  });

  it('extracts all template 533064 fields accurately in ZaloOfficialZnsVendor', () => {
    const rawPayload = {
      customer_name: 'Anh Thông',
      phone: '0938384265',
      soPhieuBaoGia: 'BGM-2026-1149',
      ngayBaoGia: '2026-10-06',
      ngayHetHan: '2026-11-06',
      nhanVien: 'Ngô Vương Thông',
      loaiDon: 'Cung cấp Máy móc',
      products: [
        { name: 'Máy Hàn Laser 1500W', quantity: 1, type: 'MAY_MOC' },
        { name: 'Kính bảo hộ Laser', quantity: 1, type: 'VAT_TU' }
      ]
    };

    const templateData = (zaloOfficialZnsVendor as any).extractTemplateData(rawPayload, 'BAOGIA');
    expect(templateData.customer_name).toBe('Anh Thông');
    expect(templateData.loai_don).toBe('Cung cấp Máy móc');
    expect(templateData.ma_bao_gia).toBe('BGM-2026-1149');
    expect(templateData.ngay_bao_gia).toBe('06/10/2026');
    expect(templateData.ngay_het_han).toBe('06/11/2026');
    expect(templateData.product_1).toContain('Máy Hàn Laser 1500W');
    expect(templateData.product_2).toContain('Kính bảo hộ Laser');
    expect(templateData.sl_may).toBe('2');
    expect(templateData.nhan_vien).toBe('Ngô Vương Thông');
    expect(templateData.ma_tra_cuu).toBe('BGM-2026-1149');
  });

  it('renders quotation template through templateRendererService and backend payload builder', async () => {
    const rawDoc = {
      id: 'bg-001',
      customerName: 'Cơ Khí Sài Gòn',
      tenZns: 'Cơ Khí Sài Gòn',
      soPhieuBaoGia: 'BG-2026-0038',
      maBaoGia: 'BG-2026-0038',
      ngayBaoGia: '2026-10-07',
      ngayHetHan: '2026-11-07',
      nguoiPhuTrach: 'Ngô Vương Thông',
      products: [
        { productName: 'Máy Chấn Thủy Lực CNC', quantity: 1 }
      ]
    };

    const rendered = await templateRendererService.render('BAOGIA', rawDoc) as Record<string, string>;
    expect(rendered.ma_bao_gia).toBe('BG-2026-0038');
    expect(rendered.ngay_bao_gia).toBe('07/10/2026');
    expect(rendered.product_1).toBe('Máy Chấn Thủy Lực CNC');
    expect(rendered.product_2).toBe('......');

    const msg = {
      id: 'msg-bg-001',
      messageType: 'BAOGIA',
      recipientPhone: '0938384265',
      phone: '0938384265',
      customerName: 'Cơ Khí Sài Gòn',
      status: 'PENDING',
      payload: rawDoc
    };

    const built = await znsPayloadBuilder.buildPayload(msg as any, 'dummy-key');
    const td = built.template_data as Record<string, any>;
    expect(td.ma_bao_gia).toBe('BG-2026-0038');
    expect(td.product_1).toBe('Máy Chấn Thủy Lực CNC');
    expect(td.product_2).toBe('......');
  });

  it('correctly cleans tracking code from complex ZNS query formats', async () => {
    const { extractCleanTrackingCode } = await import('../features/tracking/PublicOrderTrackingPage');
    expect(extractCleanTrackingCode('BGM-2026-3014')).toBe('BGM-2026-3014');
    expect(extractCleanTrackingCode('https://sgm-os.onrender.com/tra-cuu-bao-gia?code=BGM-2026-3014')).toBe('BGM-2026-3014');
    expect(extractCleanTrackingCode('<BGM-2026-3014>')).toBe('BGM-2026-3014');
  });
});
