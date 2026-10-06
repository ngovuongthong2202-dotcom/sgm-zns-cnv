import { describe, it, expect } from 'vitest';
import { sanitizeZnsCustomerName } from '../backend/services/zns/zns-payload.builder';
import { templateRendererService } from '../backend/services/zns/template-renderer.service';
import { zaloOfficialZnsVendor } from '../modules/messaging/infrastructure/ZaloOfficialZnsVendor';

describe('ZNS Customer Name ("Chuẩn ZNS") Strict Compliance & Length Guardrails', () => {
  it('prioritizes tenZns over long legal tenKhachHang', () => {
    const rawPayload = {
      tenKhachHang: 'Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn', // 38 chars (> 30)
      tenZns: 'Cơ Khí Công Nghiệp Sài Gòn', // 26 chars (<= 30)
      soPhieuBaoGia: 'BGM-2026-1149',
      phone: '0938384265'
    };

    // Extract template data through ZaloOfficialZnsVendor
    const templateData = (zaloOfficialZnsVendor as any).extractTemplateData(rawPayload, 'BAOGIA');
    expect(templateData.customer_name).toBe('Cơ Khí Công Nghiệp Sài Gòn');
    expect(templateData.customer_name.length).toBeLessThanOrEqual(30);
  });

  it('renders customer_name through templateRendererService prioritizing tenZns', async () => {
    const doc = {
      tenKhachHang: 'Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn',
      tenZns: 'Cơ Khí Công Nghiệp Sài Gòn',
      soPhieuBaoGia: 'BGM-2026-1149',
      sdt: '0938384265',
      ngayBaoGia: '2026-10-06',
      ngayHetHan: '2026-10-13',
      slMay: '1',
      nguoiPhuTrach: 'Ngô Vương Thông'
    };

    const rendered = await templateRendererService.render('BAOGIA', doc);
    expect(rendered.customer_name).toBe('Cơ Khí Công Nghiệp Sài Gòn');
    expect(rendered.customer_name.length).toBeLessThanOrEqual(30);
  });

  it('automatically condenses long legal name to <= 30 chars when tenZns is missing', () => {
    const longLegalName = 'Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn';
    const sanitized = sanitizeZnsCustomerName(longLegalName);
    expect(sanitized.length).toBeLessThanOrEqual(30);
    // Should be condensed or stripped of legal prefix
    expect(sanitized).toMatch(/^(TNHH\s+)?Cơ Khí Công Nghiệp Sài Gòn$/i);
  });

  it('hard enforces maximum 30 characters in ZaloOfficialZnsVendor even with ultra long input', () => {
    const ultraLong = 'Công Ty Cổ Phần Tập Đoàn Đầu Tư Xây Dựng Và Phát Triển Hạ Tầng Đô Thị Việt Nam';
    const rawPayload = {
      tenKhachHang: ultraLong,
      phone: '0901234567'
    };

    const templateData = (zaloOfficialZnsVendor as any).extractTemplateData(rawPayload, 'CUSTOMER_PRE_QUOTE');
    expect(templateData.customer_name.length).toBeLessThanOrEqual(30);
    expect(templateData.customer_name.length).toBeGreaterThan(0);
  });

  it('supports snake_case ten_zns variant gracefully', () => {
    const rawPayload = {
      ten_khach_hang: 'Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn',
      ten_zns: 'Cơ Khí Công Nghiệp Sài Gòn'
    };

    const templateData = (zaloOfficialZnsVendor as any).extractTemplateData(rawPayload, 'BAOGIA');
    expect(templateData.customer_name).toBe('Cơ Khí Công Nghiệp Sài Gòn');
    expect(templateData.customer_name.length).toBeLessThanOrEqual(30);
  });
});
