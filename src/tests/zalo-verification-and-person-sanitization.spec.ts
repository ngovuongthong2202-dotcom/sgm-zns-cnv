import { describe, it, expect } from 'vitest';
import { sanitizeZnsPersonName, sanitizeZnsCustomerName } from '../backend/services/zns/zns-payload.builder';
import { zaloOfficialZnsVendor } from '../modules/messaging/infrastructure/ZaloOfficialZnsVendor';
import { translateZaloError, resolveZaloError } from '../backend/services/zns/zalo-error-dictionary';
import fs from 'fs';
import path from 'path';

describe('Zalo Domain Verification & Person Name Compliance Suite', () => {
  describe('1. sanitizeZnsPersonName Guardrail', () => {
    it('strips parentheses containing role/dept and preserves official name', () => {
      const raw = 'Ngô Vương Thông (IT - Administrator)';
      const clean = sanitizeZnsPersonName(raw);
      expect(clean).toBe('Ngô Vương Thông');
      expect(clean.length).toBeLessThanOrEqual(30);
    });

    it('handles multiple parentheses and whitespace', () => {
      const raw = '  Trần Thị Hoài Ngân   (Kế toán) (Admin)  ';
      const clean = sanitizeZnsPersonName(raw);
      expect(clean).toBe('Trần Thị Hoài Ngân');
      expect(clean.length).toBeLessThanOrEqual(30);
    });

    it('falls back to default person name if empty', () => {
      expect(sanitizeZnsPersonName('')).toBe('Ngô Vương Thông');
      expect(sanitizeZnsPersonName(undefined as any)).toBe('Ngô Vương Thông');
    });

    it('clamps strings longer than 30 characters safely at word boundary', () => {
      const longName = 'Nguyễn Thị Hoàng Phương Thảo Thùy Dương';
      const clean = sanitizeZnsPersonName(longName);
      expect(clean.length).toBeLessThanOrEqual(30);
    });
  });

  describe('2. ZaloOfficialZnsVendor extractTemplateData compliance', () => {
    it('guarantees nguoi_phu_trach <= 30 chars for BAOGIA message', () => {
      const rawPayload = {
        tenKhachHang: 'Công ty Cơ Khí Sài Gòn',
        tenZns: 'Cơ Khí Sài Gòn',
        soPhieuBaoGia: 'BGM-2026-1149',
        nguoiPhuTrach: 'Ngô Vương Thông (IT - Administrator)',
        slMay: 2,
        ngayBaoGia: '06/10/2026'
      };

      const extracted = (zaloOfficialZnsVendor as any).extractTemplateData(rawPayload, 'BAOGIA');
      expect(extracted.nguoi_phu_trach).toBe('Ngô Vương Thông');
      expect(extracted.nguoi_phu_trach.length).toBeLessThanOrEqual(30);
      expect(extracted.customer_name).toBe('Cơ Khí Sài Gòn');
      expect(extracted.customer_name.length).toBeLessThanOrEqual(30);
      expect(extracted.so_phieu_bao_gia).toBe('BGM-2026-1149');
      expect(extracted.company_name).toBe('Cơ Khí Sài Gòn (SGM)');
      expect(extracted.company_name.length).toBeLessThanOrEqual(30);
    });

    it('clamps any overly long template field to <= 30 chars', () => {
      const rawPayload = {
        customer_name: 'Công ty Cổ Phần Tập Đoàn Đầu Tư Xây Dựng Và Phát Triển Hạ Tầng',
        soPhieuBaoGia: 'BGM-2026-SUPER-EXTRA-LONG-CODE-NUMBER-999999999999',
        nguoiPhuTrach: 'Trần Nguyễn Hoàng Anh Khôi Minh Trí (Giám Đốc Kỹ Thuật Dự Án)'
      };

      const extracted = (zaloOfficialZnsVendor as any).extractTemplateData(rawPayload, 'BAOGIA');
      for (const [key, val] of Object.entries(extracted)) {
        if (typeof val === 'string' && key !== 'danh_sach_ma_may') {
          expect((val as string).length).toBeLessThanOrEqual(30);
        }
      }
    });
  });

  describe('3. Dynamic Contextual Error Dictionary', () => {
    it('translates code -1121 specifically for nguoi_phu_trach', () => {
      const res = translateZaloError(-1121, 'nguoi_phu_trach data breaks max length');
      expect(res.explanation).toContain('người phụ trách');
      expect(res.actionGuide).toContain('ngoặc đơn');
    });

    it('translates code -1121 specifically for customer_name', () => {
      const res = translateZaloError(-1121, 'customer_name data breaks max length');
      expect(res.explanation).toContain('khách hàng');
      expect(res.actionGuide).toContain('Chuẩn ZNS');
    });

    it('translates code -1121 specifically for document codes', () => {
      const res = translateZaloError(-1121, 'so_phieu_bao_gia data breaks max length');
      expect(res.explanation).toContain('chứng từ');
    });

    it('parses raw error string in resolveZaloError accurately', () => {
      const raw = '{"error":-1121,"message":"nguoi_phu_trach data breaks max length"}';
      const resolved = resolveZaloError(raw);
      expect(resolved.code).toBe(-1121);
      expect(resolved.reason).toContain('người phụ trách');
    });
  });

  describe('4. Zalo Domain Verification Meta Tag Presence', () => {
    it('verifies index.html has the meta verification tag in <head>', () => {
      const indexPath = path.join(process.cwd(), 'index.html');
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('name="zalo-platform-site-verification"');
      expect(content).toContain('NFEp0htcDovC-vigiCqADK7yswojYW5GC3Ot');
    });
  });
});
