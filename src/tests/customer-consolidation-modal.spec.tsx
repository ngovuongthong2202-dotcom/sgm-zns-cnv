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
});
