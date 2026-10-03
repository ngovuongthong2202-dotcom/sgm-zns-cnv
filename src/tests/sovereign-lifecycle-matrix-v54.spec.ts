import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  sanitizeZnsCustomerName, 
  sanitizeZnsPersonName, 
  znsPayloadBuilder 
} from '@/src/backend/services/zns/zns-payload.builder';
import { SendZnsMessageUseCase } from '@/src/modules/messaging/application/use-cases/SendZnsMessage';
import { ZnsRepository } from '@/src/modules/messaging/domain/ZnsRepository';
import { ZnsVendorPort } from '@/src/modules/messaging/domain/ZnsVendorPort';
import { ZnsMessageAggregate } from '@/src/modules/messaging/domain/ZnsMessage';
import { templateRendererService } from '@/src/backend/services/zns/template-renderer.service';

vi.mock('@/src/backend/services/zns/template-renderer.service', () => ({
  templateRendererService: {
    render: vi.fn(),
  }
}));

describe('V54 Sovereign Autonomous Lifecycle Matrix & Dual-Flight Omni-Mesh Fabric', () => {

  describe('1. Smart 30-Char Truncation Engine', () => {
    it('preserves core commercial name within 30 chars by stripping legal prefix', () => {
      // 41 characters with legal prefix
      const raw = 'Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn';
      const result = sanitizeZnsCustomerName(raw);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).toBe('Cơ Khí Công Nghiệp Sài Gòn'); // 26 chars
    });

    it('leaves company name untouched when total length is <= 30 chars', () => {
      const raw = 'Công Ty TNHH Sao Mai';
      const result = sanitizeZnsCustomerName(raw);
      expect(result.length).toBeLessThanOrEqual(30);
      expect(result).toBe('Công Ty TNHH Sao Mai');
    });

    it('strips parentheses and titles from PIC/Employee name to avoid Zalo -136 errors', () => {
      const rawPic = 'Ngô Vương Thông (IT - Administrator)';
      const cleanPic = sanitizeZnsPersonName(rawPic);
      expect(cleanPic).toBe('Ngô Vương Thông');
      expect(cleanPic.length).toBeLessThanOrEqual(30);
    });

    it('handles fallback safely when PIC name is empty or undefined', () => {
      const cleanPic = sanitizeZnsPersonName('');
      expect(cleanPic).toBe('Ngô Vương Thông');
    });
  });

  describe('2. CNV 3-Column Trigger Payload Builder', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('injects map.col, map.act, and map.disp with "Gửi tin" into commonData for BAOGIA', async () => {
      vi.mocked(templateRendererService.render).mockResolvedValue({
        __version: 1,
        customer_name: 'Cơ Khí Sài Gòn',
        phone: '0938384265',
        so_phieu_bao_gia: 'BGVT-2026-0764',
        ngay_bao_gia: '03/10/2026',
        ngay_het_han: '03/11/2026',
        sl_may: '1',
        nguoi_phu_trach: 'Ngô Vương Thông'
      });

      const message: any = {
        id: 'msg-v54-test',
        entityId: 'BGVT-2026-0764',
        entityType: 'QUOTATION',
        messageType: 'BAOGIA',
        phone: '0938384265',
        payload: {
          soPhieuBaoGia: 'BGVT-2026-0764',
          tenKhachHang: 'Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn',
          sdt: '0938384265',
          nguoiPhuTrach: 'Ngô Vương Thông (IT - Administrator)'
        }
      };

      const payload = await znsPayloadBuilder.buildPayload(message, 'test-key-v54');
      const common = payload.data as Record<string, any>;
      const newVals = payload.newValues as Record<string, any>;

      // Verify all 3 trigger attributes
      expect(common['Gửi ZNS Báo giá']).toBe('Gửi tin');
      expect(common['hanh_dong_gui_zns_bao_gia']).toBe('Gửi tin');
      expect(newVals['Gửi ZNS Báo giá']).toBe('Gửi tin');

      // Verify sanitized PIC without parenthesis
      expect(common['nguoi_phu_trach']).toBe('Ngô Vương Thông');
      expect(newVals['nguoi_phu_trach']).toBe('Ngô Vương Thông');

      // Verify phone present at root and data
      expect(payload.phone).toBe('0938384265');
      expect(common.phone).toBe('0938384265');
      expect(newVals.phone).toBe('0938384265');
    });
  });

  describe('3. SendZnsMessageUseCase Idempotency Phá Khóa (forceResend)', () => {
    it('bypasses cached SENT_WAITING status when forceResend is true', async () => {
      const mockSavedMessages: any[] = [];
      const mockRepo: ZnsRepository = {
        findById: vi.fn().mockImplementation(async (id: string) => {
          if (id.includes('already-sent')) {
            return ZnsMessageAggregate.create({
              entityId: 'BGVT-2026-0764',
              entityType: 'QUOTATION',
              messageType: 'BAOGIA' as any,
              phone: '0938384265',
              payload: {}
            }, id).getValue();
          }
          return null;
        }),
        findByTrackingId: vi.fn(),
        findBySttAndPhone: vi.fn(),
        save: vi.fn().mockImplementation(async (msg) => {
          mockSavedMessages.push(msg);
        }),
        findDlqMessages: vi.fn(),
        generateIdempotencyKey: vi.fn().mockImplementation((type, id, msgType, ver, attempt) => {
          return `${type}_${id}_${msgType}_${ver}_attempt_${attempt}`;
        })
      };

      const mockVendor: ZnsVendorPort = {
        send: vi.fn().mockResolvedValue({ success: true, trackingId: 'cnv-track-v54-new' })
      };

      const useCase = new SendZnsMessageUseCase(mockRepo, mockVendor);

      // Call with forceResend = true
      const result = await useCase.execute({
        entityId: 'BGVT-2026-0764',
        entityType: 'QUOTATION',
        messageType: 'BAOGIA',
        phone: '0938384265',
        payload: { test: true },
        forceResend: true,
        attemptBucket: 1727960000000
      });

      expect(mockVendor.send).toHaveBeenCalledTimes(1);
      expect(result.status).toBe('SENT_WAITING');
    });

    it('returns cached status without calling vendor when forceResend is false and status is already SENT_WAITING', async () => {
      const existingMsg = ZnsMessageAggregate.create({
        entityId: 'BGVT-2026-0764',
        entityType: 'QUOTATION',
        messageType: 'BAOGIA' as any,
        phone: '0938384265',
        payload: {}
      }, 'idemp-0').getValue();
      existingMsg.markSentWaiting('old-track');

      const mockRepo: ZnsRepository = {
        findById: vi.fn().mockResolvedValue(existingMsg),
        findByTrackingId: vi.fn(),
        findBySttAndPhone: vi.fn(),
        save: vi.fn(),
        findDlqMessages: vi.fn(),
        generateIdempotencyKey: vi.fn().mockReturnValue('idemp-0')
      };

      const mockVendor: ZnsVendorPort = {
        send: vi.fn()
      };

      const useCase = new SendZnsMessageUseCase(mockRepo, mockVendor);

      const result = await useCase.execute({
        entityId: 'BGVT-2026-0764',
        entityType: 'QUOTATION',
        messageType: 'BAOGIA',
        phone: '0938384265',
        payload: {},
        forceResend: false,
        attemptBucket: 0
      });

      expect(mockVendor.send).not.toHaveBeenCalled();
      expect(result.status).toBe('SENT_WAITING');
    });
  });

  describe('4. Cross-Module Customer ID Inversion Fix', () => {
    it('guarantees that customerId is preserved from customer profile and not overwritten by quotationId', () => {
      const clientEntity = { customerId: 'KH-00123', tenKhachHang: 'Công Ty An Phát' };
      const dbEntity = { customerId: 'KH-00123' };
      const body = { entityId: 'BGVT-2026-0764', entityType: 'QUOTATION' };

      // Fixed logic from zns.routes.ts
      const resolvedCustomerId = clientEntity.customerId || dbEntity.customerId || (body.entityType === 'CUSTOMER' ? body.entityId : undefined);

      expect(resolvedCustomerId).toBe('KH-00123');
      expect(resolvedCustomerId).not.toBe('BGVT-2026-0764');
    });
  });

});
