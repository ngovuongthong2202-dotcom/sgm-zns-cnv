/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerConsolidationModal } from '@/src/modules/customers/ui/components/CustomerConsolidationModal';
import { 
  detectDuplicateCustomerGroups, 
  buildConsolidationMigrationPlan 
} from '@/src/modules/customers/ui/utils/customerConsolidationEngine';
import { isSameCustomer } from '@/src/shared/utils/customerIdentityResolver';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';

// Mock IAM useAuth
vi.mock('@/src/modules/iam', () => ({
  useAuth: () => ({
    user: { email: 'admin@sgm.vn', displayName: 'Administrator' },
    userData: { role: 'ADMINISTRATOR' }
  })
}));

// Mock MergeCustomer usecase
vi.mock('@/src/modules/customers/application/use-cases/MergeCustomer', () => ({
  MergeCustomer: {
    getMergeHistory: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue({ auditLogId: 'audit-mock-123' }),
    rollback: vi.fn().mockResolvedValue('Đã hoàn tác thành công')
  }
}));

// Mock repositoryFactory
vi.mock('@/src/data/repositories', () => ({
  repositoryFactory: {
    get: () => ({
      update: vi.fn().mockResolvedValue(true)
    })
  }
}));

describe('Sovereign MDM Apex - Customer Consolidation Engine & Modal Lifecycle', () => {
  const mockCustomerA: Customer = {
    id: 'cust-216',
    maKh: 'KH0216',
    tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
    maSoThue: '0301728283',
    diaChi: '392 Nguyễn Thị Minh Khai, P.5, Q.3, TP.HCM',
    tinhThanh: 'TP. Hồ Chí Minh',
    sdt: '0357988317',
    nguoiDaiDien: 'Thành Ngô',
    contacts: [
      {
        danhXung: 'Anh',
        nguoiDaiDien: 'Thành Ngô',
        sdt: '0357988317',
        chucVu: 'Giám đốc',
        chiNhanh: 'Trụ sở chính'
      }
    ]
  } as unknown as Customer;

  const mockCustomerB: Customer = {
    id: 'cust-213',
    maKh: 'KH0213',
    tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng - Xưởng An Hạ',
    maSoThue: '0301728283',
    diaChi: 'Lô D2, KCN An Hạ, Xã Phạm Văn Hai, H.Bình Chánh, TP.HCM',
    tinhThanh: 'TP. Hồ Chí Minh',
    sdt: '0908482305',
    nguoiDaiDien: 'Phạm Vương',
    contacts: [
      {
        danhXung: 'Anh',
        nguoiDaiDien: 'Phạm Vương',
        sdt: '0908482305',
        chucVu: 'Quản đốc xưởng',
        chiNhanh: 'Nhà máy An Hạ'
      }
    ]
  } as unknown as Customer;

  const mockQuotes: Quotation[] = [
    {
      id: 'quote-1',
      soPhieuBaoGia: 'BG-2026-001',
      customerId: 'cust-213',
      maKh: 'KH0213',
      totalAmount: 450000000
    } as unknown as Quotation
  ];

  const mockContracts = [
    {
      id: 'cont-1',
      soHopDong: 'HD-2026-001',
      customerId: 'cust-216',
      maKh: 'KH0216',
      totalAmount: 850000000
    }
  ];

  const mockPayments = [
    {
      id: 'pay-1',
      paymentId: 'PT-2026-001',
      customerId: 'cust-216',
      maKh: 'KH0216',
      amount: 400000000
    }
  ];

  const mockDeliveries = [
    {
      id: 'del-1',
      deliveryId: 'PGH-2026-001',
      customerId: 'cust-213',
      maKh: 'KH0213',
      soPhieuXuat: 'PXK-001'
    }
  ];

  it('1. Tránh triệt để React Hook Error #310 khi chuyển đổi isOpen từ false sang true', () => {
    // Render initially closed (like Customers page initial mount)
    const { rerender } = render(
      <CustomerConsolidationModal
        isOpen={false}
        onClose={vi.fn()}
        customers={[mockCustomerA, mockCustomerB]}
        quotations={mockQuotes}
        contracts={mockContracts}
        payments={mockPayments}
        deliveries={mockDeliveries}
      />
    );

    expect(screen.queryByText(/Hồ sơ Master/i)).toBeNull();

    // Rerender as open (user clicks "Gộp trùng MST" button)
    // If hooks count differs, React will throw Error #310 and this test will fail!
    expect(() => {
      rerender(
        <CustomerConsolidationModal
          isOpen={true}
          onClose={vi.fn()}
          customers={[mockCustomerA, mockCustomerB]}
          quotations={mockQuotes}
          contracts={mockContracts}
          payments={mockPayments}
          deliveries={mockDeliveries}
        />
      );
    }).not.toThrow();

    // Modal elements should now be visible
    expect(screen.getByText('0301728283')).toBeDefined();
    expect(screen.getAllByText(/Hồ sơ Master/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ma Trận Tác Động Dữ Liệu Chuyển Giao/i)).toBeDefined();
  });

  it('2. Áp dụng MDSCS: Ưu tiên Master theo Hợp đồng và Bảo toàn địa chỉ xưởng', () => {
    const groups = detectDuplicateCustomerGroups(
      [mockCustomerA, mockCustomerB],
      mockQuotes,
      mockContracts,
      mockPayments,
      mockDeliveries
    );

    expect(groups.length).toBe(1);
    const grp = groups[0];
    // mockCustomerA has 1 contract (*10) + 1 payment (*6) = 16 pts
    // mockCustomerB has 1 quote (*2) + 1 delivery (*8) = 10 pts
    // mockCustomerA MUST be selected as Master!
    expect(grp.masterCustomer.maKh).toBe('KH0216');
    expect(grp.secondaryCustomers[0].maKh).toBe('KH0213');

    // Build plan
    const plan = buildConsolidationMigrationPlan(
      grp,
      mockQuotes,
      mockContracts,
      mockPayments,
      mockDeliveries
    );

    // Verify secondary's workshop address is preserved into mergedContacts
    const workshopContact = plan.updatedMasterCustomer.contacts?.find(c => 
      c.chiNhanh?.includes('Lô D2, KCN An Hạ')
    );
    expect(workshopContact).toBeDefined();
    expect(workshopContact?.chiNhanh).toContain('[Nguồn: KH0213]');

    // Verify impact metrics
    expect(plan.impactSummary.quotationsCount).toBe(1);
    expect(plan.impactSummary.totalQuotationValue).toBe(450000000);
    expect(plan.impactSummary.deliveriesCount).toBe(1);
  });

  it('3. Cho phép người dùng click Đặt làm Master hoán đổi vị trí linh hoạt', () => {
    render(
      <CustomerConsolidationModal
        isOpen={true}
        onClose={vi.fn()}
        customers={[mockCustomerA, mockCustomerB]}
        quotations={mockQuotes}
        contracts={mockContracts}
        payments={mockPayments}
        deliveries={mockDeliveries}
      />
    );

    // Find the "Đặt làm Master" button on secondary card
    const switchMasterBtn = screen.getByRole('button', { name: /Đặt làm Master/i });
    expect(switchMasterBtn).toBeDefined();

    // Click to override master
    fireEvent.click(switchMasterBtn);

    // Now KH0213 should be the master customer in preview!
    expect(screen.getByText('Tiến Hành Gộp Nhóm MST: 0301728283')).toBeDefined();
  });

  it('4. Hỗ trợ gộp bắc cầu (Transitive Merge Flattener) A -> B -> C', () => {
    const custPreMerged: Customer = {
      id: 'cust-200',
      maKh: 'KH0200',
      tenKhachHang: 'Đại Dũng Chi Nhánh Cũ',
      maSoThue: '0301728283',
      mergedCustomerCodes: ['KH0100', 'KH0150'],
      contacts: []
    } as unknown as Customer;

    const groupWithPreMerged = {
      taxCode: '0301728283',
      normalizedName: 'đại dũng',
      masterCustomer: mockCustomerA,
      secondaryCustomers: [custPreMerged],
      allCustomersInGroup: [mockCustomerA, custPreMerged],
      totalQuotationsCount: 0,
      distinctContactsCount: 1
    };

    const plan = buildConsolidationMigrationPlan(groupWithPreMerged, [], [], [], []);

    // Master KH0216 must contain KH0200 AND transitively KH0100, KH0150!
    expect(plan.updatedMasterCustomer.mergedCustomerCodes).toContain('KH0200');
    expect(plan.updatedMasterCustomer.mergedCustomerCodes).toContain('KH0100');
    expect(plan.updatedMasterCustomer.mergedCustomerCodes).toContain('KH0150');
  });

  it('5. isSameCustomer nhận diện chuẩn xác khi có mergedCustomerCodes hoặc mergedInto', () => {
    const masterDoc = {
      id: 'cust-216',
      maKh: 'KH0216',
      mergedCustomerCodes: ['KH0213', 'KH0200']
    };

    const legacyDeliveryDoc = {
      id: 'del-1',
      maKh: 'KH0213',
      customerId: 'cust-213'
    };

    // Even though maKh differs (KH0216 vs KH0213), isSameCustomer must return TRUE!
    expect(isSameCustomer(masterDoc, legacyDeliveryDoc)).toBe(true);

    const secondaryWithMergedInto = {
      id: 'cust-213',
      maKh: 'KH0213',
      mergedInto: 'cust-216'
    };

    expect(isSameCustomer(secondaryWithMergedInto, masterDoc)).toBe(true);
  });

  it('6. Quét và bảo toàn đa tầng theo từng đợt (cacDotThu trong payments và cacDotGiao trong deliveries)', () => {
    const multiInstallmentPayment = {
      id: 'pay-multi-1',
      paymentId: 'PT-2026-MULTI',
      customerId: 'cust-213',
      maKh: 'KH0213',
      soTien: 250000000,
      cacDotThu: [
        { dotThu: 1, soTien: 100000000, ngayThu: '2026-03-01', hinhThuc: 'Chuyển khoản', soChungTuThamChieu: 'UNC-01' },
        { dotThu: 2, soTien: 150000000, ngayThu: '2026-03-15', hinhThuc: 'Chuyển khoản', soChungTuThamChieu: 'UNC-02' }
      ]
    };

    const multiShipmentDelivery = {
      id: 'del-multi-1',
      deliveryId: 'PGH-2026-MULTI',
      customerId: 'cust-213',
      maKh: 'KH0213',
      cacDotGiao: [
        { dotGiao: 1, soPhieuXuat: 'PXK-01', ngayGiaoMay: '2026-03-05', soBienBanNghiemThu: 'BBGN-01' },
        { dotGiao: 2, soPhieuXuat: 'PXK-02', ngayGiaoMay: '2026-03-20', soBienBanNghiemThu: 'BBGN-02' }
      ]
    };

    const group = {
      taxCode: '0301728283',
      normalizedName: 'đại dũng',
      masterCustomer: mockCustomerA, // KH0216
      secondaryCustomers: [mockCustomerB], // KH0213
      allCustomersInGroup: [mockCustomerA, mockCustomerB],
      totalQuotationsCount: 0,
      distinctContactsCount: 2
    };

    const plan = buildConsolidationMigrationPlan(
      group,
      [],
      [],
      [multiInstallmentPayment],
      [multiShipmentDelivery]
    );

    // Verify transferring metrics count both records AND internal milestones
    expect(plan.transferringSummary.billingsCount).toBe(1);
    expect(plan.transferringSummary.paymentInstallmentsCount).toBe(2);
    expect(plan.transferringSummary.totalBillingAmount).toBe(250000000);

    expect(plan.transferringSummary.deliveriesCount).toBe(1);
    expect(plan.transferringSummary.deliveryShipmentsCount).toBe(2);

    // Combined summary must also reflect these installment totals
    expect(plan.combinedSummary.paymentInstallmentsCount).toBe(2);
    expect(plan.combinedSummary.deliveryShipmentsCount).toBe(2);
  });

  it('7. Minh bạch hóa 3 Tầng tài sản: Phân tách Master sở hữu sẵn vs Chuyển giao từ hồ sơ phụ ("Ghost Zero" resolution)', () => {
    // KH0506 (Master) already owns 1 quote
    const masterQuote = {
      id: 'quote-master',
      soPhieuBaoGia: '11-BG2604-027',
      customerId: 'cust-216',
      maKh: 'KH0216',
      totalAmount: 594000
    } as unknown as Quotation;

    const group = {
      taxCode: '0301728283',
      normalizedName: 'đại dũng',
      masterCustomer: mockCustomerA, // KH0216
      secondaryCustomers: [mockCustomerB], // KH0213
      allCustomersInGroup: [mockCustomerA, mockCustomerB],
      totalQuotationsCount: 1,
      distinctContactsCount: 2
    };

    const plan = buildConsolidationMigrationPlan(
      group,
      [masterQuote],
      [],
      [],
      []
    );

    // Master owns the quote: transferring count must be 0, but masterOwned must be 1!
    expect(plan.masterOwnedSummary.quotationsCount).toBe(1);
    expect(plan.masterOwnedSummary.totalQuotationValue).toBe(594000);
    expect(plan.transferringSummary.quotationsCount).toBe(0);
    expect(plan.transferringSummary.totalQuotationValue).toBe(0);
    expect(plan.combinedSummary.quotationsCount).toBe(1);
    expect(plan.combinedSummary.totalQuotationValue).toBe(594000);

    // Render modal to ensure the UI clearly explains "Đã quy tụ tại Master"
    render(
      <CustomerConsolidationModal
        isOpen={true}
        onClose={vi.fn()}
        customers={[mockCustomerA, mockCustomerB]}
        quotations={[masterQuote]}
        contracts={[]}
        payments={[]}
        deliveries={[]}
      />
    );

    // Verify Master owned tier banner is visible
    expect(screen.getByText(/Master KH0216 hiện có:/i)).toBeDefined();
    // Verify transferring card shows "Đã quy tụ tại Master" instead of bare confusing 0
    expect(screen.getAllByText(/Đã quy tụ tại Master/i).length).toBeGreaterThan(0);
  });

  it('8. Phản ứng tức thì khi hoán đổi Master (1-Click Reactive Reversal)', () => {
    // Quote belongs to KH0216
    const quoteForA = {
      id: 'quote-cust-a',
      soPhieuBaoGia: 'BG-A-01',
      customerId: 'cust-216',
      maKh: 'KH0216',
      totalAmount: 594000
    } as unknown as Quotation;

    const { rerender } = render(
      <CustomerConsolidationModal
        isOpen={true}
        onClose={vi.fn()}
        customers={[mockCustomerA, mockCustomerB]}
        quotations={[quoteForA]}
        contracts={[]}
        payments={[]}
        deliveries={[]}
      />
    );

    // Initially KH0216 is Master -> 0 quotations transferring, quote is at Master
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Đã quy tụ tại Master/i).length).toBeGreaterThan(0);

    // User clicks "Đặt làm Master" on KH0213
    const switchBtn = screen.getByRole('button', { name: /Đặt làm Master/i });
    fireEvent.click(switchBtn);

    // Now KH0213 is Master, KH0216 is Secondary -> The quote transfers from KH0216 to KH0213!
    // Modal will dynamically re-evaluate plan and show transferring quotation = 1!
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/594.000\s*đ/i).length).toBeGreaterThan(0);
  });

  it('9. Omni-Key Scanner: Quét và nhận diện chính xác chứng từ lưu bằng maKh khi thiếu customerId', () => {
    // A quotation that only has maKh: 'KH0213', without customerId
    const quoteWithOnlyMaKh = {
      id: 'quote-maKh-only',
      soPhieuBaoGia: 'BG-MAKH-ONLY',
      maKh: 'KH0213',
      totalAmount: 120000000
    } as unknown as Quotation;

    const group = {
      taxCode: '0301728283',
      normalizedName: 'đại dũng',
      masterCustomer: mockCustomerA, // KH0216
      secondaryCustomers: [mockCustomerB], // id: 'cust-213', maKh: 'KH0213'
      allCustomersInGroup: [mockCustomerA, mockCustomerB],
      totalQuotationsCount: 1,
      distinctContactsCount: 2
    };

    const plan = buildConsolidationMigrationPlan(
      group,
      [quoteWithOnlyMaKh],
      [],
      [],
      []
    );

    // Omni-Key Scanner must match secondary's maKh and capture this quotation!
    expect(plan.affectedQuotationIds).toContain('quote-maKh-only');
    expect(plan.transferringSummary.quotationsCount).toBe(1);
    expect(plan.transferringSummary.totalQuotationValue).toBe(120000000);
  });
});

