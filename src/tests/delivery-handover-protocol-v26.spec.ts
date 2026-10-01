import { describe, it, expect } from 'vitest';
import { 
  resolveAcceptanceProtocolCode 
} from '../shared/utils/voucherResolver';
import { 
  formatVietnamLegalDate, 
  formatVietnamLegalTime, 
  resolveMachineSerials,
  SGM_OFFICIAL_TECHNICAL_CHECKLIST 
} from '../modules/fulfillment/ui/utils/handoverDocumentHelper';
import { SGM_COMPANY_INFO } from '../shared/constants/companyInfo';
import { Delivery } from '../domain/schema/delivery.schema';
import { ProductItem } from '../domain/schema/product.schema';

describe('SGM Omni-Handover Protocol v26: Industrial Acceptance & Handover Specification', () => {
  describe('Pillar 1: Acceptance Protocol Numbering Engine (resolveAcceptanceProtocolCode)', () => {
    it('generates standardized protocol number from PGH code (e.g. PGH-2026-0016 -> 016/NT-BGTB-SGM/2026)', () => {
      const mockDelivery: Partial<Delivery> = {
        deliveryId: 'PGH-2026-0016'
      };
      const code = resolveAcceptanceProtocolCode(mockDelivery);
      expect(code).toBe('016/NT-BGTB-SGM/2026');
    });

    it('extracts sequence from ERP warehouse voucher code (e.g. 11-PXBHDH2604-031 -> 031/NT-BGTB-SGM/2026)', () => {
      const mockDelivery: Partial<Delivery> = {
        soPhieuXuat: '11-PXBHDH2604-031'
      };
      const code = resolveAcceptanceProtocolCode(mockDelivery);
      expect(code).toBe('031/NT-BGTB-SGM/2026');
    });

    it('preserves explicitly designated protocol code (e.g. 025/NT-BGTB-SGM/2026)', () => {
      const mockDelivery: Partial<Delivery> = {
        soBienBanNghiemThu: '025/NT-BGTB-SGM/2026'
      };
      const code = resolveAcceptanceProtocolCode(mockDelivery);
      expect(code).toBe('025/NT-BGTB-SGM/2026');
    });

    it('provides reliable fallback protocol code when delivery is empty', () => {
      const currentYear = new Date().getFullYear();
      const code = resolveAcceptanceProtocolCode(null);
      expect(code).toBe(`025/NT-BGTB-SGM/${currentYear}`);
    });
  });

  describe('Pillar 2: Vietnamese Legal Typography & Date Formatting', () => {
    it('formats ISO date into Vietnamese legal style: "ngày 16 tháng 04 năm 2026"', () => {
      const formatted = formatVietnamLegalDate('2026-04-16');
      expect(formatted).toBe('ngày 16 tháng 04 năm 2026');
    });

    it('handles undefined or invalid date gracefully without throwing error', () => {
      expect(formatVietnamLegalDate(undefined)).toContain('ngày');
      expect(formatVietnamLegalDate(null)).toContain('ngày');
      expect(formatVietnamLegalDate('invalid-date')).toBe('ngày ... tháng ... năm 2026');
    });

    it('formats handover time into hours and minutes text', () => {
      const timeInfo = formatVietnamLegalTime('2026-04-16T14:30:00');
      expect(timeInfo.hours).toBe('14');
      expect(timeInfo.minutes).toBe('30');
      expect(timeInfo.formatted).toBe('14 giờ 30 phút');
    });
  });

  describe('Pillar 3: Precision Machine Matrix & Serial Extraction', () => {
    it('extracts item-level serials (Số KH: SGM036-26) accurately', () => {
      const mockItem: Partial<ProductItem> = {
        productName: 'Máy cán tôn 2 tầng SGM VN K1200mm',
        quantity: 1,
        danhSachMaMay: ['SGM036-26']
      };
      const mockDelivery: Partial<Delivery> = {
        deliveryId: 'PGH-2026-0016',
        products: [mockItem as ProductItem]
      };

      const serial = resolveMachineSerials(mockItem as ProductItem, mockDelivery as Delivery, 0);
      expect(serial).toBe('SGM036-26');
    });

    it('inherits from delivery-level serial list when item-level list is empty', () => {
      const mockItem: Partial<ProductItem> = {
        productName: 'Máy cán tôn sóng vuông',
        quantity: 1
      };
      const mockDelivery: Partial<Delivery> = {
        deliveryId: 'PGH-2026-0016',
        products: [mockItem as ProductItem],
        danhSachMaMay: ['SGM036-26']
      };

      const serial = resolveMachineSerials(mockItem as ProductItem, mockDelivery as Delivery, 0);
      expect(serial).toBe('SGM036-26');
    });
  });

  describe('Pillar 4: Industrial 5 Golden Acceptance Criteria', () => {
    it('defines all 5 golden engineering verification categories', () => {
      expect(SGM_OFFICIAL_TECHNICAL_CHECKLIST.length).toBe(5);
      const categories = SGM_OFFICIAL_TECHNICAL_CHECKLIST.map(c => c.category);
      
      expect(categories[0]).toContain('Kết cấu cơ khí');
      expect(categories[1]).toContain('Truyền động & Thủy lực');
      expect(categories[2]).toContain('Điện điều khiển PLC');
      expect(categories[3]).toContain('Chạy thử tải tôn');
      expect(categories[4]).toContain('Hồ sơ & Hướng dẫn');
    });
  });

  describe('Pillar 5: SGM Corporate Identity Synchronization', () => {
    it('verifies official SGM contact info from real-world template', () => {
      expect(SGM_COMPANY_INFO.hotlineTechnical).toBe('0932.000.999');
      expect(SGM_COMPANY_INFO.hotlineSupport).toBe('0901.828.492');
      expect(SGM_COMPANY_INFO.directorName).toBe('NGUYỄN PHÚ QUỐC');
      expect(SGM_COMPANY_INFO.directorTitle).toBe('Giám Đốc');
      expect(SGM_COMPANY_INFO.saigonMachineWebsite).toBe('saigonmachine.vn');
      expect(SGM_COMPANY_INFO.addressCompact).toContain('Lô 12A, Đường Số 9, KCN Tân Tạo');
    });
  });
});
