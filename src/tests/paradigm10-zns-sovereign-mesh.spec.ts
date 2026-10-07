import { describe, it, expect } from 'vitest';
import { formatZnsDate } from '../shared/utils/formatDate';
import { calculateMaxWarrantyExpiryDate } from '../modules/fulfillment/ui/utils/handoverDocumentHelper';
import { ZaloOfficialZnsVendor, DEFAULT_ZALO_TEMPLATE_MAP } from '../modules/messaging/infrastructure/ZaloOfficialZnsVendor';
import { znsPayloadBuilder } from '../backend/services/zns/zns-payload.builder';
import type { Delivery } from '../domain/schema/delivery.schema';
import type { Payment } from '../domain/schema/payment.schema';
import type { ZnsMessage } from '../domain/schema/workflow.schema';

describe('Paradigm 10: Apex Sovereign Omni-Mesh Fabric & Sub-Entity Ledger Synchronizer', () => {
  describe('Trụ cột 1: formatZnsDate (Universal Chrono Guardrail)', () => {
    it('formats ISO date strings strictly to dd/mm/yyyy', () => {
      expect(formatZnsDate('2026-10-06T10:15:00.000Z')).toBe('06/10/2026');
      expect(formatZnsDate('2026-05-01')).toBe('01/05/2026');
      expect(formatZnsDate('2025-12-31T23:59:59.999Z')).toBe('31/12/2025');
    });

    it('preserves and normalizes already formatted dd/mm/yyyy strings', () => {
      expect(formatZnsDate('15/08/2026')).toBe('15/08/2026');
      expect(formatZnsDate('05/01/2027')).toBe('05/01/2027');
    });

    it('formats JavaScript Date instances to dd/mm/yyyy without timezone shift', () => {
      const d = new Date(2026, 9, 6); // month is 0-indexed, so 9 = October
      expect(formatZnsDate(d)).toBe('06/10/2026');
    });

    it('gracefully falls back to current date in dd/mm/yyyy when given falsy or invalid input', () => {
      const resNull = formatZnsDate(null);
      const resUndef = formatZnsDate(undefined);
      const resEmpty = formatZnsDate('');
      const regex = /^\d{2}\/\d{2}\/\d{4}$/;
      expect(regex.test(resNull)).toBe(true);
      expect(regex.test(resUndef)).toBe(true);
      expect(regex.test(resEmpty)).toBe(true);
    });
  });

  describe('Trụ cột 2: calculateMaxWarrantyExpiryDate (Warranty Intelligence Engine)', () => {
    it('identifies the longest warranty across products and calculates expiry date', () => {
      const mockDelivery: any = {
        deliveryId: 'GH-2026-001',
        soHopDong: '062/VT-SGM/2026',
        ngayGiaoHang: '2026-01-15',
        danhSachMaMay: ['SER-CNC-9988', 'SER-CNC-9989'],
        products: [
          { name: 'Máy phay CNC', warrantyMonths: 12, thoiGianBaoHanh: '12 tháng', machineCode: 'SER-CNC-9988' } as any,
          { name: 'Trục chính gia công', warrantyMonths: 24, thoiGianBaoHanh: '24 tháng', machineCode: 'SER-CNC-9989' } as any,
          { name: 'Phụ kiện kẹp', warrantyMonths: 6, thoiGianBaoHanh: '6 tháng' } as any,
        ],
      };

      const result = calculateMaxWarrantyExpiryDate(mockDelivery as Delivery);

      // Max warranty is 24 months from 2026-01-15 -> 2028-01-15
      expect(result.maxMonths).toBe(24);
      expect(result.expiryDateFormatted).toBe('15/01/2028');
      expect(result.primarySerial).toBe('SER-CNC-9988');
      expect(result.contractProductLabel).toBe('Theo 062/VT-SGM/2026');
      expect(result.contractProductLabel.length).toBeLessThanOrEqual(30);
    });

    it('defaults to 12 months when no explicit warranty duration is specified', () => {
      const mockDelivery: Partial<Delivery> = {
        deliveryId: 'GH-2026-002',
        soHopDong: '088/VT-SGM/2026',
        ngayGiaoThucTe: '2026-03-20',
        products: [
          { name: 'Thiết bị phụ trợ' } as any,
        ],
      };

      const result = calculateMaxWarrantyExpiryDate(mockDelivery as Delivery);
      expect(result.maxMonths).toBe(12);
      expect(result.expiryDateFormatted).toBe('20/03/2027');
      expect(result.contractProductLabel).toBe('Theo 088/VT-SGM/2026');
    });
  });

  describe('Trụ cột 3: Sub-Entity Installment Ledger Persistence', () => {
    it('properly tracks installment-level ZNS status in payment schema', () => {
      const mockPayment: Payment = {
        id: 'pm-001',
        maThanhToan: 'TT-001',
        hopDongId: 'hd-001',
        soHopDong: '062/VT-SGM/2026',
        tongGiaTri: 100000000,
        soTienDaThanhToan: 50000000,
        conLai: 50000000,
        ngayThanhToan: '2026-10-06',
        cacDotThu: [
          {
            dot: 1,
            soTien: 30000000,
            ngayThu: '2026-10-01',
            trangThaiZns: 'THÀNH CÔNG',
            znsStatus: 'THÀNH CÔNG',
            znsSentAt: '2026-10-01T08:00:00Z',
          },
          {
            dot: 2,
            soTien: 20000000,
            ngayThu: '2026-10-06',
            trangThaiZns: 'CHƯA GỬI',
          },
        ],
      } as any;

      // Simulate atomic dispatch update on dot 2
      const updatedCacDotThu = [...mockPayment.cacDotThu];
      updatedCacDotThu[1] = {
        ...updatedCacDotThu[1],
        trangThaiZns: 'THÀNH CÔNG',
        znsStatus: 'THÀNH CÔNG',
        znsSentAt: new Date().toISOString(),
      };
      mockPayment.cacDotThu = updatedCacDotThu;

      expect(mockPayment.cacDotThu[0].trangThaiZns).toBe('THÀNH CÔNG');
      expect(mockPayment.cacDotThu[1].trangThaiZns).toBe('THÀNH CÔNG');
      expect(mockPayment.cacDotThu[1].znsSentAt).toBeDefined();
    });
  });

  describe('Trụ cột 4: ZNS Vendor & Backend Payload for Template 531052 (Warranty Activation)', () => {
    it('maps GIAOHANG_BAOHANH to Zalo template ID 531052', () => {
      expect(DEFAULT_ZALO_TEMPLATE_MAP['GIAOHANG_BAOHANH']).toBe('531052');
      expect(DEFAULT_ZALO_TEMPLATE_MAP['GIAOHANG_HOANTAT']).toBe('531052');
    });

    it('extracts template 531052 parameters accurately in ZaloOfficialZnsVendor', () => {
      const vendor = new ZaloOfficialZnsVendor();
      const payload = {
        customer_name: 'Công ty Cổ phần Cơ khí Nam Phát',
        ma_bao_hanh: 'SGM-CNC-2026001',
        soHopDong: '062/VT-SGM/2026',
        expiryDateFormatted: '15/10/2027',
      };

      const extracted = vendor.extractTemplateData(payload, 'GIAOHANG_BAOHANH');
      expect(extracted.ma_bao_hanh).toBe('SGM-CNC-2026001');
      expect(extracted.product).toBe('Theo 062/VT-SGM/2026');
      expect(extracted.date).toBe('15/10/2027');
      expect(extracted.customer_name.length).toBeLessThanOrEqual(30);
      expect(extracted.product.length).toBeLessThanOrEqual(30);
    });

    it('builds backend payload for GIAOHANG_BAOHANH with ZnsPayloadBuilder', async () => {
      const message: ZnsMessage = {
        id: 'msg-001',
        messageType: 'GIAOHANG_BAOHANH',
        recipientPhone: '0901234567',
        phone: '0901234567',
        customerName: 'Nguyễn Văn An',
        status: 'PENDING',
        payload: {
          customer_name: 'Nguyễn Văn An',
          ma_bao_hanh: 'SN-889922',
          soHopDong: '062/VT-SGM/2026',
          date: '2026-10-06',
        },
      } as any;

      const result = await znsPayloadBuilder.buildPayload(message, 'test-key-123');
      const templateData = result.template_data as Record<string, any>;

      expect(templateData.ma_bao_hanh).toBe('SN-889922');
      expect(templateData.product).toBe('Theo 062/VT-SGM/2026');
      expect(templateData.date).toBe('06/10/2026');
      expect(templateData.customer_name).toBe('Nguyễn Văn An');
    });

    it('prioritizes soNgayDuKienHoanThanh over legacy thoiGianThucHien', () => {
      const vendor = new ZaloOfficialZnsVendor();
      const payload = {
        soNgayDuKienHoanThanh: 95,
        thoiGianThucHien: '30 ngày',
        soHopDong: '029/KD1-SGM/TN-CT/26',
      };
      const extracted = vendor.extractTemplateData(payload, 'HOPDONG_SIGN_ZNS');
      expect(extracted.so_ngay).toBe(95);
    });

    it('strictly extracts serial numbers without falling back to product names', async () => {
      const message: ZnsMessage = {
        id: 'msg-deliv-001',
        messageType: 'GIAOHANG_ZNS',
        recipientPhone: '0901234567',
        phone: '0901234567',
        customerName: 'Khách hàng A',
        payload: {
          tenKhachHang: 'Khách hàng A',
          soHopDong: '062/VT-SGM/2026',
          products: [
            { productName: 'Máy cán tôn sóng vuông', serial: 'SER-ROLL-01' },
            { productName: 'Máy dập vòm', serials: ['SER-PRESS-02', 'SER-PRESS-03'] }
          ],
        },
      } as any;

      const result = await znsPayloadBuilder.buildPayload(message, 'test-key-123');
      const templateData = result.template_data as Record<string, any>;
      expect(templateData.danh_sach_ma_may).toBe('SER-ROLL-01 | SER-PRESS-02 | SER-PRESS-03');
      expect(templateData.danh_sach_ma_may).not.toContain('Máy cán tôn sóng vuông');
    });
  });
});
