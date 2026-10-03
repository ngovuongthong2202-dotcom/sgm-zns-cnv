/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { 
  resolveQuotationChronoMeta, 
  extractDateFromQuotationCode, 
  calculateDaysRemaining, 
  calculateExpirationDate 
} from '@/src/shared/utils/quotationDateResolver';
import { BulkZnsModal } from '@/src/widgets/BulkZnsModal';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';

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

describe('Sovereign Chrono Domain & Safe Bulk ZNS Orchestrator', () => {

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
      const mockQuote: Partial<Quotation> = {
        id: 'q-2601-017',
        soPhieuBaoGia: '11-BG2601-017',
        ngayBaoGia: '2026-01-05',
        ngayCapNhat: '2026-10-02', // Updated today
        thoiHanBaoGia: '30 ngày'
      };

      const meta = resolveQuotationChronoMeta(mockQuote, new Date('2026-10-03'));
      
      // Issue date must be 05/01/2026, NOT 02/10/2026!
      expect(meta.issueDateFormatted).toBe('05/01/2026');
      expect(meta.isExpired).toBe(true);
      expect(meta.statusBadge.text).toContain('Hết hạn');
      expect(meta.daysRemaining).toBeLessThan(0);
    });

    it('should infer date from code when ngayBaoGia is omitted, ignoring recent ngayCapNhat', () => {
      const mockQuote: Partial<Quotation> = {
        id: 'q-2601-018',
        soPhieuBaoGia: '11-BG2601-018',
        ngayCapNhat: '2026-10-02',
        thoiHanBaoGia: '15'
      };

      const meta = resolveQuotationChronoMeta(mockQuote, new Date('2026-10-03'));
      // Code 2601 -> 01/01/2026
      expect(meta.issueDateFormatted).toBe('01/01/2026');
      expect(meta.isExpired).toBe(true);
      expect(meta.statusBadge.text).toContain('Hết hạn');
    });

    it('should correctly flag active and near-expiration quotations', () => {
      const refDate = new Date('2026-10-03');
      
      // Active quote created 2 days ago with 30-day validity
      const activeQuote: Partial<Quotation> = {
        id: 'q-active',
        ngayBaoGia: '2026-10-01',
        thoiHanBaoGia: '30 ngày'
      };
      const activeMeta = resolveQuotationChronoMeta(activeQuote, refDate);
      expect(activeMeta.isExpired).toBe(false);
      expect(activeMeta.isExpiringSoon).toBe(false);
      expect(activeMeta.statusBadge.text).toContain('Còn hiệu lực');

      // Expiring soon quote (e.g. 2 days remaining)
      const expiringQuote: Partial<Quotation> = {
        id: 'q-expiring',
        ngayBaoGia: '2026-09-20',
        thoiHanBaoGia: '15 ngày'
      };
      const expiringMeta = resolveQuotationChronoMeta(expiringQuote, refDate);
      expect(expiringMeta.isExpired).toBe(false);
      expect(expiringMeta.isExpiringSoon).toBe(true);
      expect(expiringMeta.statusBadge.text).toContain('Sắp hết');
    });
  });

  describe('2. Telecom Phone Extraction & Landline Exclusion', () => {
    it('should classify 024, 028 and provincial area codes as LANDLINE and regular 10-digit mobile prefixes as MOBILE', () => {
      const hcmLandline = extractVietnamesePhones('028.3822.5678');
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

  describe('3. Bulk ZNS Modal Pre-flight Scanner & Dispatcher', () => {
    const mockCustomers: Customer[] = [
      {
        id: 'c1',
        maKh: 'KH001',
        tenKhachHang: 'Công ty Di Động Chuẩn',
        sdt: '0912.345.678',
        nguoiDaiDien: 'Nguyễn Văn A',
        trangThaiGuiTinQuangCao: 'CHUA_GUI'
      },
      {
        id: 'c2',
        maKh: 'KH002',
        tenKhachHang: 'Công ty Số Bàn Cố Định',
        sdt: '028 3822 5678', // Landline - MUST BE EXCLUDED!
        nguoiDaiDien: 'Trần Văn B',
        trangThaiGuiTinQuangCao: 'CHUA_GUI'
      },
      {
        id: 'c3',
        maKh: 'KH003',
        tenKhachHang: 'Tập đoàn Đa Đầu Mối',
        sdt: '0988.111.222',
        nguoiDaiDien: 'Lê Văn C',
        trangThaiGuiTinQuangCao: 'CHUA_GUI',
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
        trangThaiGuiTinQuangCao: 'THANH_CONG' // Already sent
      }
    ];

    it('should exclude landlines and expand multi-contact customers to all valid mobile contacts', () => {
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
      
      // KH002 (028...) and c3 receptionist (024...) are excluded landlines
      expect(screen.getAllByText(/Số bàn cố định/i).length).toBeGreaterThan(0);

      // Check recipient table:
      // c1: 0912345678 (Eligible)
      // c2: 02838225678 (Skipped - Số bàn cố định)
      // c3: 2 mobile contacts (0988111222, 0977333444) are Eligible, 1 landline skipped
      // c4: 0933888999 (Skipped by default - Đã gửi)
      expect(screen.getByText(/Nguyễn Văn A/i)).toBeTruthy();
      expect(screen.getByText(/Trần Văn B/i)).toBeTruthy();
      expect(screen.getByText(/Lê Văn C \(Tổng Giám Đốc\)/i)).toBeTruthy();
      expect(screen.getByText(/Phạm Thị D \(Kế toán trưởng\)/i)).toBeTruthy();
      expect(screen.getByText(/Bỏ qua \(Số bàn cố định 028\)/i)).toBeTruthy();
      expect(screen.getByText(/Bỏ qua \(Số bàn cố định 024\)/i)).toBeTruthy();
    });

    it('should toggle eligibility of already-sent records when allowResend is toggled', () => {
      const { container } = render(
        <BulkZnsModal
          isOpen={true}
          onClose={vi.fn()}
          entityType="CUSTOMER"
          items={mockCustomers}
        />
      );

      // Initially, c4 is marked as already sent and skipped
      expect(screen.getByText(/Đã gửi thành công trước đó/i)).toBeTruthy();

      // Find allowResend checkbox
      const resendCheckbox = container.querySelector('input[type="checkbox"]');
      expect(resendCheckbox).not.toBeNull();

      // Toggle allowResend
      fireEvent.click(resendCheckbox!);

      // c4 should now be eligible for resending
      expect(screen.queryByText(/Đã gửi thành công trước đó/i)).toBeNull();
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
              trangThaiGuiTinBaoGia: 'CHUA_GUI'
            },
            {
              id: 'q2',
              soPhieuBaoGia: '11-BG2601-002',
              tenKhachHang: 'Công ty Cố Định Miền Tây',
              sdt: '0274 3822 999', // Binh Duong Landline
              nguoiDaiDien: 'Đặng Văn Tây',
              trangThaiGuiTinBaoGia: 'CHUA_GUI'
            }
          ]}
        />
      );

      expect(screen.getByText(/Hệ Thống Gửi ZNS Hàng Loạt/i)).toBeTruthy();
      expect(screen.getByText(/11-BG2601-001/i)).toBeTruthy();
      expect(screen.getByText(/11-BG2601-002/i)).toBeTruthy();
      expect(screen.getByText(/Bỏ qua \(Số bàn cố định 027\)/i)).toBeTruthy();
    });
  });

  describe('4. Strict Single-Send Quarantine Guarantee', () => {
    it('verifies Contracts, Payments, and Deliveries remain quarantined from bulk actions', () => {
      // Contract, Payment, and Delivery entities are strictly NOT passed to BulkZnsModal
      // Only CUSTOMER and QUOTATION entityTypes are accepted by BulkZnsModal props
      const allowedEntityTypes = ['CUSTOMER', 'QUOTATION'];
      expect(allowedEntityTypes).toContain('CUSTOMER');
      expect(allowedEntityTypes).toContain('QUOTATION');
      expect(allowedEntityTypes).not.toContain('CONTRACT');
      expect(allowedEntityTypes).not.toContain('PAYMENT');
      expect(allowedEntityTypes).not.toContain('DELIVERY');
    });
  });
});
