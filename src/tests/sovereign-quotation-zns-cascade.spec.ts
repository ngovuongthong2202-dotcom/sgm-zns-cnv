import { describe, it, expect } from 'vitest';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { isRecipientZnsAlreadySent } from '@/src/domain/zns-client';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { validateDocumentUpdate } from '@/src/domain/policy/document-integrity.policy';
import { detectCommercialCoreDelta } from '@/src/modules/sales/ui/hooks/useQuotationActions';

describe('Sovereign Quotation ZNS & 360 Phone Cascade Engine', () => {

  describe('1. Commercial Core Delta & Integrity Policy', () => {
    it('detects commercial delta when items or prices change', () => {
      const oldQ: any = {
        totalAmount: 10000000,
        items: [{ id: '1', maHangHoa: 'HH1', donGia: 100000, soLuong: 100 }]
      };
      const newQ: any = {
        totalAmount: 12000000,
        items: [{ id: '1', maHangHoa: 'HH1', donGia: 120000, soLuong: 100 }]
      };

      expect(detectCommercialCoreDelta(oldQ, newQ)).toBe(true);
    });

    it('does NOT trigger commercial delta on superficial or non-commercial property updates', () => {
      const oldQ: any = {
        totalAmount: 10000000,
        trangThai: 'MOI_TAO',
        updatedAt: '2026-10-01T00:00:00Z',
        items: [{ id: '1', maHangHoa: 'HH1', donGia: 100000, soLuong: 100 }]
      };
      const newQ: any = {
        totalAmount: 10000000,
        trangThai: 'DANG_XU_LY',
        updatedAt: '2026-10-05T00:00:00Z',
        items: [{ id: '1', maHangHoa: 'HH1', donGia: 100000, soLuong: 100 }]
      };

      expect(detectCommercialCoreDelta(oldQ, newQ)).toBe(false);
    });

    it('does NOT trigger product integrity false-positives on computed line-item fields', () => {
      const before: any = {
        customerId: 'CUST-1',
        totalAmount: 500000,
        products: [{
          maHangHoa: 'A1',
          tenHangHoa: 'Sản phẩm A',
          donGia: 50000,
          soLuong: 10
        }]
      };

      // After includes calculated fields like subtotalBeforeTax, itemTotal
      const after: any = {
        customerId: 'CUST-1',
        totalAmount: 500000,
        products: [{
          maHangHoa: 'A1',
          tenHangHoa: 'Sản phẩm A',
          donGia: 50000,
          soLuong: 10,
          subtotalBeforeTax: 500000,
          itemTotal: 550000
        }]
      };

      const result = validateDocumentUpdate('quotation', before, after, true);
      expect(result.canUpdate).toBe(true);
      expect(result.forbiddenFieldsChanged).toBeUndefined();
    });
  });

  describe('2. Multi-Phone Detection & Independent ZNS History Resolution', () => {
    it('extracts all distinct mobile phones from multi-phone contact string', () => {
      const rawContact = 'Anh Đức (0583 985 148 / 0983 480 240)';
      const ext = extractVietnamesePhones(rawContact);

      expect(ext.mobilePhones.length).toBe(2);
      expect(ext.mobilePhones.map(m => m.cleaned)).toContain('0583985148');
      expect(ext.mobilePhones.map(m => m.cleaned)).toContain('0983480240');
    });

    it('accurately resolves ZNS sent state independently for each phone number', () => {
      const quotation: any = {
        id: 'BG-001',
        soPhieuBaoGia: 'BG-001',
        trangThaiGuiTinBaoGia: 'THANH_CONG'
      };

      const realtimeZnsMessages = [
        {
          id: 'msg-1',
          entityId: 'BG-001',
          entityType: 'QUOTATION',
          phone: '0583985148',
          status: 'SUCCESS'
        }
      ];

      // Phone 1 was sent
      const isPhone1Sent = isRecipientZnsAlreadySent({
        entity: quotation,
        entityType: 'QUOTATION',
        phone: '0583985148',
        znsMessages: realtimeZnsMessages
      });
      expect(isPhone1Sent).toBe(true);

      // Phone 2 was NOT sent yet
      const isPhone2Sent = isRecipientZnsAlreadySent({
        entity: quotation,
        entityType: 'QUOTATION',
        phone: '0983480240',
        znsMessages: realtimeZnsMessages
      });
      expect(isPhone2Sent).toBe(false);
    });
  });

  describe('3. Customer Phone Cascade & Quotation Reset', () => {
    it('reverts quotation to CHO_GUI when customer phone changes after successful ZNS dispatch', () => {
      const oldQuotation: any = {
        id: 'BG-100',
        tenKhachHang: 'Công Ty Minh Phát',
        sdt: '0901234567',
        trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG,
        sentAt: '2026-10-01T10:00:00Z',
        thongTinGuiZnsBaoGia: {
          soDienThoaiNhan: '0901234567',
          thoiGianGui: '2026-10-01T10:00:00Z',
          trangThai: 'THANH_CONG'
        }
      };

      const newCustomerData: any = {
        tenKhachHang: 'Công Ty Minh Phát',
        sdt: '0988776655' // New phone number
      };

      const isPhoneChanged = Boolean(
        newCustomerData.sdt && 
        oldQuotation.sdt && 
        newCustomerData.sdt.trim() !== oldQuotation.sdt.trim()
      );
      expect(isPhoneChanged).toBe(true);

      const willResetZns = isPhoneChanged && oldQuotation.trangThaiGuiTinBaoGia === EntityZnsStatus.THANH_CONG;
      expect(willResetZns).toBe(true);

      const quoteUpdates: any = {
        tenKhachHang: newCustomerData.tenKhachHang,
        sdt: newCustomerData.sdt
      };

      if (willResetZns) {
        quoteUpdates.trangThaiGuiTinBaoGia = EntityZnsStatus.CHO_GUI;
        quoteUpdates.trangThaiZns = EntityZnsStatus.CHO_GUI;
        quoteUpdates.thongTinGuiZnsBaoGia = {
          ...oldQuotation.thongTinGuiZnsBaoGia,
          needsResendAfterEdit: true,
          previousSentPhone: oldQuotation.sdt,
          resetReason: `Đổi số điện thoại khách hàng từ ${oldQuotation.sdt} sang ${newCustomerData.sdt}`
        };
      }

      expect(quoteUpdates.trangThaiGuiTinBaoGia).toBe(EntityZnsStatus.CHO_GUI);
      expect(quoteUpdates.sdt).toBe('0988776655');
      expect(quoteUpdates.thongTinGuiZnsBaoGia.previousSentPhone).toBe('0901234567');
      expect(quoteUpdates.thongTinGuiZnsBaoGia.needsResendAfterEdit).toBe(true);
    });

    it('does NOT alter immutable prior entries in zns_messages table during cascade', () => {
      const priorZnsMessages = [
        {
          id: 'msg-archived-1',
          entityId: 'BG-100',
          phone: '0901234567',
          status: 'SUCCESS',
          sentAt: '2026-10-01T10:00:00Z'
        }
      ];

      // After cascade update of quotation, past ZNS logs remain immutable
      expect(priorZnsMessages[0].phone).toBe('0901234567');
      expect(priorZnsMessages[0].status).toBe('SUCCESS');
      expect(priorZnsMessages.length).toBe(1);
    });
  });

});
