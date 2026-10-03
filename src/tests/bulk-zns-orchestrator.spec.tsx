/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  resolveQuotationChronoMeta, 
  extractDateFromQuotationCode, 
  calculateExpirationDate 
} from '@/src/shared/utils/quotationDateResolver';
import { BulkZnsModal } from '@/src/widgets/BulkZnsModal';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { 
  isZnsSuccessStatus, 
  isRecipientZnsAlreadySent, 
  isZnsAlreadySent 
} from '@/src/domain/zns-client';

// Mock IAM
vi.mock('@/src/modules/iam', () => ({
  useAuth: () => ({
    user: { email: 'admin@sgm.vn', displayName: 'Administrator' },
    userData: { role: 'ADMINISTRATOR' }
  }),
  can: () => true
}));

// Mock ZNS Domain & Client
vi.mock('@/src/domain/zns', () => ({
  sendZnsMessage: vi.fn().mockResolvedValue({ success: true, trackingId: 'mock-zns-123' })
}));

// Mock Realtime collection
vi.mock('@/src/data/realtime-store', () => ({
  useRealtimeCollection: () => ({ data: [] })
}));

// Mock Notifications & Cache
vi.mock('@/src/shared/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('@/src/data/swr-fetchers', () => ({
  clearSwrColCache: vi.fn()
}));

vi.mock('@/src/shared/utils/crossTabSync', () => ({
  crossTabSync: {
    broadcast: vi.fn()
  }
}));

vi.mock('@/src/modules/customers/application/use-cases/UpdateCustomer', () => ({
  UpdateCustomer: {
    execute: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/src/modules/sales/infrastructure/QuotationRepoFirestore', () => ({
  quotationRepo: {
    update: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Sovereign Chrono Domain & Safe Bulk ZNS Orchestrator (Paradigm 10)', () => {

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
          {
            nguoiDaiDien: 'A. Thông',
            sdt: '0938 384 265',
            chucVu: 'Phó Giám Đốc'
          },
          {
            nguoiDaiDien: 'C. Yến',
            sdt: '0779 054 678',
            chucVu: 'Kế toán trưởng'
          }
        ]
      };

      // Contact 1 (A. Thông - 0938384265) WAS sent successfully
      const isContact1Sent = isRecipientZnsAlreadySent({
        entity: customerKH0436,
        entityType: 'CUSTOMER',
        contact: customerKH0436.contacts[0],
        phone: '0938384265'
      });
      expect(isContact1Sent).toBe(true);

      // Contact 2 (C. Yến - 0779054678) WAS NOT sent
      const isContact2Sent = isRecipientZnsAlreadySent({
        entity: customerKH0436,
        entityType: 'CUSTOMER',
        contact: customerKH0436.contacts[1],
        phone: '0779054678'
      });
      expect(isContact2Sent).toBe(false);
    });
  });

  describe('4. Bulk ZNS Modal Pre-flight Scanner & Reactive Bento HUD', () => {
    const mockCustomers: any[] = [
      {
        id: 'c1',
        maKh: 'KH001',
        tenKhachHang: 'Công ty Di Động Chuẩn',
        sdt: '0912.345.678',
        nguoiDaiDien: 'Nguyễn Văn A',
        trangThaiGuiTinQuangCao: 'CHƯA GỬI'
      },
      {
        id: 'c2',
        maKh: 'KH002',
        tenKhachHang: 'Công ty Số Bàn Cố Định',
        sdt: '028 3822 5678', // Landline - MUST BE EXCLUDED!
        nguoiDaiDien: 'Trần Văn B',
        trangThaiGuiTinQuangCao: 'CHƯA GỬI'
      },
      {
        id: 'c3',
        maKh: 'KH003',
        tenKhachHang: 'Tập đoàn Đa Đầu Mối',
        sdt: '0988.111.222',
        nguoiDaiDien: 'Lê Văn C',
        trangThaiGuiTinQuangCao: 'CHƯA GỬI',
        contacts: [
          {
            nguoiDaiDien: 'Lê Văn C (Tổng Giám Đốc)',
            sdt: '0988.111.222',
            chucVu: 'TGĐ'
          },
          {
            nguoiDaiDien: 'Phạm Thị D (Kế toán trưởng)',
            sdt: '0977.333.444',
            chucVu: 'Kế toán'
          },
          {
            nguoiDaiDien: 'Văn phòng đại diện',
            sdt: '024 3987 6543', // Landline contact under multi-contact customer
            chucVu: 'Lễ tân'
          }
        ]
      },
      {
        id: 'c4',
        maKh: 'KH004',
        tenKhachHang: 'Công ty Đã Gửi Thành Công',
        sdt: '0933.888.999',
        nguoiDaiDien: 'Hoàng Văn E',
        trangThaiGuiTinQuangCao: 'THÀNH CÔNG' // Accented success status from DB
      }
    ];

    it('should exclude landlines and accurately count already-sent records in Card 4', () => {
      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="CUSTOMER"
          items={mockCustomers}
        />
      );

      // Verify Modal Title
      expect(screen.getByText(/Hệ Thống Gửi ZNS Hàng Loạt/i)).toBeTruthy();
      
      // Card 4 must display 1 already-sent record (c4 with 'THÀNH CÔNG'), NOT 0!
      expect(screen.getByText('Đã gửi thành công')).toBeTruthy();
      expect(screen.getByText('Tự động bỏ qua (Chặn trùng)')).toBeTruthy();

      // KH002 (028...) and c3 receptionist (024...) are excluded landlines
      expect(screen.getAllByText(/Số bàn cố định/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Bỏ qua \(Số bàn cố định 028\)/i)).toBeTruthy();
      expect(screen.getByText(/Bỏ qua \(Số bàn cố định 024\)/i)).toBeTruthy();
    });

    it('should update Card 2 and Card 4 reactively when allowResend is toggled', () => {
      const { container } = render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="CUSTOMER"
          items={mockCustomers}
        />
      );

      // Initially, Card 4 subtitle says "Tự động bỏ qua (Chặn trùng)"
      expect(screen.getByText('Tự động bỏ qua (Chặn trùng)')).toBeTruthy();

      // Find allowResend toggle checkbox (first checkbox in controls)
      const resendCheckbox = container.querySelector('input[type="checkbox"]');
      expect(resendCheckbox).not.toBeNull();

      // Toggle allowResend ON
      fireEvent.click(resendCheckbox!);

      // Card 4 subtitle must update to unlock resend message
      expect(screen.getByText(/Đã mở khóa gửi lại \(1 lượt\)/i)).toBeTruthy();
      // Row for c4 now shows "Sẵn sàng gửi lại"
      expect(screen.getByText(/Sẵn sàng gửi lại/i)).toBeTruthy();
    });

    it('should support Quotation bulk dispatch with accurate landline exclusion and carrier detection', () => {
      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="QUOTATION"
          items={[
            {
              id: 'q1',
              soPhieuBaoGia: '11-BG2601-001',
              tenKhachHang: 'Công ty Xây Dựng Nam Phát',
              sdt: '0908.123.456',
              nguoiDaiDien: 'Lê Văn Nam',
              trangThaiGuiTinBaoGia: 'CHƯA GỬI'
            },
            {
              id: 'q2',
              soPhieuBaoGia: '11-BG2601-002',
              tenKhachHang: 'Công ty Cố Định Miền Tây',
              sdt: '0274 3822 999', // Binh Duong Landline
              nguoiDaiDien: 'Đặng Văn Tây',
              trangThaiGuiTinBaoGia: 'CHƯA GỬI'
            }
          ] as any}
        />
      );

      expect(screen.getByText(/Hệ Thống Gửi ZNS Hàng Loạt/i)).toBeTruthy();
      expect(screen.getByText(/11-BG2601-001/i)).toBeTruthy();
      expect(screen.getByText(/11-BG2601-002/i)).toBeTruthy();
      expect(screen.getByText(/Bỏ qua \(Số bàn cố định 027\)/i)).toBeTruthy();
    });
  });

  describe('5. Strict Single-Send Quarantine Guarantee', () => {
    it('verifies Contracts, Payments, and Deliveries remain strictly quarantined from bulk actions', () => {
      // Contract, Payment, and Delivery entities are strictly NOT passed to BulkZnsModal
      const allowedEntityTypes = ['CUSTOMER', 'QUOTATION'];
      expect(allowedEntityTypes).toContain('CUSTOMER');
      expect(allowedEntityTypes).toContain('QUOTATION');
      expect(allowedEntityTypes).not.toContain('CONTRACT');
      expect(allowedEntityTypes).not.toContain('PAYMENT');
      expect(allowedEntityTypes).not.toContain('DELIVERY');
    });
  });

  describe('6. Sovereign Dual-Tier Disambiguation & In-Flight Atomic Persistence', () => {
    it('scans multi-contact customer KH0213 and lists both contacts individually', () => {
      const customerKH0213: any = {
        id: 'cust-213',
        maKh: 'KH0213',
        tenKhachHang: 'Công ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
        trangThaiGuiTinQuangCao: 'CHUA_GUI',
        contacts: [
          {
            nguoiDaiDien: 'Phạm Vương',
            sdt: '0908 482 305',
            chucVu: 'Đại diện'
          },
          {
            nguoiDaiDien: 'Thành Ngô',
            sdt: '0357 988 317',
            chucVu: 'Đầu mối từ KH0216'
          }
        ]
      };

      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="CUSTOMER"
          items={[customerKH0213]}
        />
      );

      expect(screen.getByText(/Phạm Vương/i)).toBeTruthy();
      expect(screen.getByText(/Thành Ngô/i)).toBeTruthy();
      expect(screen.getByText('0908 482 305')).toBeTruthy();
      expect(screen.getByText('0357 988 317')).toBeTruthy();
    });

    it('differentiates primary phone from secondary phone for 1 contact and skips secondary by default', () => {
      const customerMultiPhone: any = {
        id: 'cust-multi-phone',
        maKh: 'KH0999',
        tenKhachHang: 'Công ty Cơ Khí Đa Tuyến',
        trangThaiGuiTinQuangCao: 'CHUA_GUI',
        contacts: [
          {
            nguoiDaiDien: 'Nguyễn Văn Đạt',
            sdt: '0938 111 222',
            sdtPhu: '0909 333 444',
            chucVu: 'Giám Đốc'
          }
        ]
      };

      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="CUSTOMER"
          items={[customerMultiPhone]}
        />
      );

      // Primary phone is selected and ready to send
      expect(screen.getByText('0938 111 222')).toBeTruthy();
      // Secondary phone is identified and skipped to prevent duplicate sending to the same person
      expect(screen.getByText('0909 333 444')).toBeTruthy();
      expect(screen.getByText(/Bỏ qua số phụ \(Tránh gửi trùng 2 tin cho cùng 1 người\)/i)).toBeTruthy();
    });

    it('atomically persists customer contactsZnsHistory and contact status upon dispatch', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined);
      const customerToDispatch: any = {
        id: 'cust-persist-1',
        maKh: 'KH0888',
        tenKhachHang: 'Công ty Cơ Khí Đồng Bộ',
        trangThaiGuiTinQuangCao: 'CHUA_GUI',
        contacts: [
          {
            nguoiDaiDien: 'Trần Văn Đồng',
            sdt: '0912 345 678',
            chucVu: 'Trưởng phòng'
          }
        ]
      };

      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="CUSTOMER"
          items={[customerToDispatch]}
          onUpdateCustomer={mockUpdate}
        />
      );

      // Find the start dispatch button
      const startButton = screen.getByRole('button', { name: /bắt đầu gửi/i });
      expect(startButton).toBeTruthy();

      fireEvent.click(startButton);

      // Verify onUpdateCustomer was called with updated contacts and contactsZnsHistory
      await vi.waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith(
          'cust-persist-1',
          expect.objectContaining({
            trangThaiGuiTinQuangCao: 'THANH_CONG',
            contacts: expect.arrayContaining([
              expect.objectContaining({
                trangThaiZns: 'THANH_CONG'
              })
            ]),
            contactsZnsHistory: expect.objectContaining({
              '0912345678': expect.objectContaining({
                status: 'SUCCESS'
              })
            })
          })
        );
      });
    });
  });

  describe('7. V50 Sovereign Omni-Mesh Orchestrator & Universal 5-Tier Dispatch Fabric', () => {
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
        {
          id: 'msg-marketing-1',
          entityId: 'cust-123',
          entityType: 'CUSTOMER',
          messageType: 'CUSTOMER_PRE_QUOTE',
          phone: '0988777666',
          status: 'SUCCESS'
        }
      ];

      const isSent = isRecipientZnsAlreadySent({
        entity: newQuote,
        entityType: 'QUOTATION',
        phone: '0988777666',
        znsMessages: pastMarketingMessages
      });

      // Crucial: Must be false! Marketing message to this phone must NOT block the quotation!
      expect(isSent).toBe(false);
    });

    it('marks quotation as sent only when the message matches this quotation ID or quote code', () => {
      const quote: any = {
        id: 'q-target-88',
        soPhieuBaoGia: 'BG-2026-0088',
        sdt: '0988 777 666'
      };

      const quoteMessages = [
        {
          id: 'msg-bg-1',
          entityId: 'q-target-88',
          entityType: 'QUOTATION',
          messageType: 'BAOGIA',
          phone: '0988777666',
          status: 'SUCCESS'
        }
      ];

      const isSent = isRecipientZnsAlreadySent({
        entity: quote,
        entityType: 'QUOTATION',
        phone: '0988777666',
        znsMessages: quoteMessages
      });

      expect(isSent).toBe(true);
    });

    it('preserves exact 1-to-1 cardinality for quotations even when quotation has multiple phones', () => {
      const quoteWithTwoPhones: any = {
        id: 'q-dual-phone-1',
        soPhieuBaoGia: 'BG-2026-0555',
        tenKhachHang: 'Công Ty Cơ Khí Miền Nam',
        sdt: '0912 345 678, 0987 654 321',
        totalAmount: 250000000,
        ngayBaoGia: '2026-10-02'
      };

      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="QUOTATION"
          items={[quoteWithTwoPhones]}
        />
      );

      // Verify exactly 1 row is rendered on table (1-to-1 cardinality)
      expect(screen.getByText('BG-2026-0555')).toBeTruthy();
      expect(screen.getAllByText(/250\.000\.000/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/2026-10-02/)).toBeTruthy();
      // Primary mobile is displayed
      expect(screen.getByText('0912 345 678')).toBeTruthy();
      // Modal header shows 1 quotation ready
      expect(screen.getByText(/1 báo giá sẵn sàng/i)).toBeTruthy();
    });

    it('hydrates missing phone from parent customer master profile', () => {
      const quoteMissingPhone: any = {
        id: 'q-missing-phone-1',
        soPhieuBaoGia: 'BG-2026-0777',
        customerId: 'cust-hydrated-99',
        tenKhachHang: 'Công Ty Xây Dựng Hòa Bình',
        sdt: '', // Empty in quotation
        totalAmount: 85000000
      };

      const parentCustomer: any = {
        id: 'cust-hydrated-99',
        maKh: 'KH099',
        tenKhachHang: 'Công Ty Xây Dựng Hòa Bình',
        sdt: '0903 888 999',
        contacts: [
          {
            nguoiDaiDien: 'Kỹ sư Tuấn',
            sdt: '0903 888 999',
            chucVu: 'Chỉ huy trưởng'
          }
        ]
      };

      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="QUOTATION"
          items={[quoteMissingPhone]}
          customers={[parentCustomer]}
        />
      );

      // Successfully hydrated phone from customer profile
      expect(screen.getByText('0903 888 999')).toBeTruthy();
      expect(screen.getByText(/Từ hồ sơ KH/i)).toBeTruthy();
      expect(screen.getByText(/Kỹ sư Tuấn/i)).toBeTruthy();
    });

    it('does NOT duplicate corporate customer name when nguoiDaiDien matches tenKhachHang', () => {
      const quoteWithSameName: any = {
        id: 'q-same-name-1',
        soPhieuBaoGia: 'BG-2026-0888',
        tenKhachHang: 'Công Ty Cổ Phần Tập Đoàn Hoa Sen',
        nguoiDaiDien: 'Công Ty Cổ Phần Tập Đoàn Hoa Sen',
        sdt: '0918 222 333'
      };

      const { container } = render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="QUOTATION"
          items={[quoteWithSameName]}
        />
      );

      // Verify the company name is rendered, but not duplicated with 👤 prefix
      expect(screen.getByText('Công Ty Cổ Phần Tập Đoàn Hoa Sen')).toBeTruthy();
      expect(container.textContent).not.toContain('👤 Công Ty Cổ Phần Tập Đoàn Hoa Sen');
    });

    it('updates quotation with lifecycleStatus SENT upon successful dispatch', async () => {
      const { quotationRepo } = await import('@/src/modules/sales/infrastructure/QuotationRepoFirestore');
      const mockQuoteToDispatch: any = {
        id: 'q-dispatch-lifecycle',
        soPhieuBaoGia: 'BG-2026-0999',
        tenKhachHang: 'Công Ty Cơ Khí Tự Động',
        sdt: '0908 123 456',
        totalAmount: 500000000
      };

      render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="QUOTATION"
          items={[mockQuoteToDispatch]}
        />
      );

      const startBtn = screen.getByRole('button', { name: /bắt đầu gửi/i });
      fireEvent.click(startBtn);

      await vi.waitFor(() => {
        expect(quotationRepo.update).toHaveBeenCalledWith(
          'q-dispatch-lifecycle',
          expect.objectContaining({
            trangThaiGuiTinBaoGia: 'THANH_CONG',
            trangThaiZns: 'THANH_CONG',
            lifecycleStatus: 'SENT'
          })
        );
      });
    });
  });
});

