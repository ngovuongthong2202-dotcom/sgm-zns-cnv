import { describe, it, expect } from 'vitest';
import {
  resolveQuotationChronoMeta,
  extractDateFromQuotationCode,
  calculateExpirationDate
} from '@/src/shared/utils/quotationDateResolver';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { isZnsSuccessStatus, isRecipientZnsAlreadySent } from '@/src/domain/zns-client';

// Chuyển từ spec "gửi hàng loạt" cũ (đã xóa ở Đợt 0A cùng hộp gửi hàng loạt). Các hàm này vẫn phục vụ gửi lẻ.
describe('Chrono domain, telecom extractor & ZNS status resolution (hàm thuần)', () => {

  describe('1. Quotation Chrono Date & Expiration Engine', () => {
    it('should correctly parse issue date from quotation code (e.g. 11-BG2601-017 -> 2026-01-01)', () => {
      const parsedDate = extractDateFromQuotationCode('11-BG2601-017');
      expect(parsedDate).toBe('2026-01-01');
    });

    it('should calculate expiration date accurately based on validity days', () => {
      const expireDate = calculateExpirationDate('2026-01-01', 30);
      expect(expireDate).toBe('2026-01-31');
    });

    it('should prioritize ngayBaoGia and code over ngayCapNhat, preventing false "Khách hàng mới" on updated old quotes', () => {
      const mockQuote: any = {
        id: 'q-2601-017',
        soPhieuBaoGia: '11-BG2601-017',
        ngayBaoGia: '2026-01-05',
        ngayCapNhat: '2026-10-02',
        thoiHanBaoGia: '30 ngày'
      };

      const meta = resolveQuotationChronoMeta(mockQuote, new Date('2026-10-03'));
      expect(meta.issueDateFormatted).toBe('05/01/2026');
      expect(meta.isExpired).toBe(true);
      expect(meta.statusBadge.text).toContain('Hết hạn');
      expect(meta.daysRemaining).toBeLessThan(0);
    });

    it('should infer date from code when ngayBaoGia is omitted, ignoring recent ngayCapNhat', () => {
      const mockQuote: any = {
        id: 'q-2601-018',
        soPhieuBaoGia: '11-BG2601-018',
        ngayCapNhat: '2026-10-02',
        thoiHanBaoGia: '15'
      };

      const meta = resolveQuotationChronoMeta(mockQuote, new Date('2026-10-03'));
      expect(meta.issueDateFormatted).toBe('01/01/2026');
      expect(meta.isExpired).toBe(true);
      expect(meta.statusBadge.text).toContain('Hết hạn');
    });
  });

  describe('2. Vietnamese Telecom Extractor & Landline Quarantine', () => {
    it('should identify landline phones by 63 provincial area codes and detect province', () => {
      const hcmLandline = extractVietnamesePhones('028 3822 5678');
      expect(hcmLandline.landlinePhones.length).toBe(1);
      expect(hcmLandline.mobilePhones.length).toBe(0);
      expect(hcmLandline.landlinePhones[0].province).toBe('TP. Hồ Chí Minh');

      const hnLandline = extractVietnamesePhones('024 3825 1234');
      expect(hnLandline.landlinePhones.length).toBe(1);
      expect(hnLandline.mobilePhones.length).toBe(0);
      expect(hnLandline.landlinePhones[0].province).toBe('Hà Nội');

      const mobile = extractVietnamesePhones('0903.123.456');
      expect(mobile.mobilePhones.length).toBe(1);
      expect(mobile.landlinePhones.length).toBe(0);
      expect(mobile.mobilePhones[0].carrier).toBe('MobiFone');
    });
  });

  describe('3. SSOT ZNS Status Normalization & 4-Tier Resolution Engine', () => {
    it('should normalize accented Vietnamese and legacy strings to success status', () => {
      expect(isZnsSuccessStatus('THÀNH CÔNG')).toBe(true);
      expect(isZnsSuccessStatus('Thành Công')).toBe(true);
      expect(isZnsSuccessStatus('THANH_CONG')).toBe(true);
      expect(isZnsSuccessStatus('SUCCESS')).toBe(true);
      expect(isZnsSuccessStatus('ĐÃ GỬI')).toBe(true);
      expect(isZnsSuccessStatus('da_gui')).toBe(true);
      expect(isZnsSuccessStatus('CHƯA GỬI')).toBe(false);
      expect(isZnsSuccessStatus('THẤT BẠI')).toBe(false);
      expect(isZnsSuccessStatus(null)).toBe(false);
    });

    it('should resolve per-contact delivery history individually for multi-contact customer KH0436', () => {
      const customerKH0436: any = {
        id: 'cust-436',
        maKh: 'KH0436',
        tenKhachHang: 'Công ty Cổ Phần Cơ Khí Xây Dựng Nam Phát',
        trangThaiGuiTinQuangCao: 'CHUA_GUI',
        contactsZnsHistory: {
          '0938384265': { status: 'SUCCESS', timestamp: '2026-09-15T08:00:00Z' }
        },
        contacts: [
          { nguoiDaiDien: 'A. Thông', sdt: '0938 384 265', chucVu: 'Phó Giám Đốc' },
          { nguoiDaiDien: 'C. Yến', sdt: '0779 054 678', chucVu: 'Kế toán trưởng' }
        ]
      };

      const isContact1Sent = isRecipientZnsAlreadySent({
        entity: customerKH0436,
        entityType: 'CUSTOMER',
        contact: customerKH0436.contacts[0],
        phone: '0938384265'
      });
      expect(isContact1Sent).toBe(true);

      const isContact2Sent = isRecipientZnsAlreadySent({
        entity: customerKH0436,
        entityType: 'CUSTOMER',
        contact: customerKH0436.contacts[1],
        phone: '0779054678'
      });
      expect(isContact2Sent).toBe(false);
    });
  });

  describe('4. Quotation-level sent detection (chuyển từ describe 7 cũ)', () => {
    it('does NOT mark a new quotation as sent when customer previously received marketing ZNS', () => {
      const newQuote: any = {
        id: 'q-new-2026',
        soPhieuBaoGia: 'BG-2026-0099',
        customerId: 'cust-123',
        tenKhachHang: 'Công Ty Thép Sài Gòn',
        sdt: '0988 777 666',
        trangThaiGuiTinBaoGia: null
      };

      const pastMarketingMessages = [
        { id: 'msg-marketing-1', entityId: 'cust-123', entityType: 'CUSTOMER', messageType: 'CUSTOMER_PRE_QUOTE', phone: '0988777666', status: 'SUCCESS' }
      ];

      const isSent = isRecipientZnsAlreadySent({
        entity: newQuote,
        entityType: 'QUOTATION',
        phone: '0988777666',
        znsMessages: pastMarketingMessages
      });
      expect(isSent).toBe(false);
    });

    it('marks quotation as sent only when the message matches this quotation ID or quote code', () => {
      const quote: any = { id: 'q-target-88', soPhieuBaoGia: 'BG-2026-0088', sdt: '0988 777 666' };
      const quoteMessages = [
        { id: 'msg-bg-1', entityId: 'q-target-88', entityType: 'QUOTATION', messageType: 'BAOGIA', phone: '0988777666', status: 'SUCCESS' }
      ];

      const isSent = isRecipientZnsAlreadySent({
        entity: quote,
        entityType: 'QUOTATION',
        phone: '0988777666',
        znsMessages: quoteMessages
      });
      expect(isSent).toBe(true);
    });
  });
});
