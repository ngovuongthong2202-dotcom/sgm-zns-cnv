import { describe, it, expect } from 'vitest';
import { 
  detectDuplicateCustomerGroups, 
  buildConsolidationMigrationPlan,
  createManualDuplicateGroup,
  isBranchTaxCode,
  normalizeTaxCode 
} from './customerConsolidationEngine';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';

describe('customerConsolidationEngine - Enterprise Master Data Management', () => {
  it('phân biệt chính xác MST 10 số của công ty mẹ và 13 số của chi nhánh', () => {
    expect(isBranchTaxCode('3700381324-492')).toBe(true);
    expect(isBranchTaxCode('3700381324492')).toBe(true);
    expect(isBranchTaxCode('3700381324')).toBe(false);
    expect(normalizeTaxCode(' 0301 728 283 - 001 ')).toBe('0301728283001');
  });

  it('phát hiện chính xác nhóm trùng MST của Đại Dũng (KH0216 & KH0213) và không gộp nhầm chi nhánh 13 số', () => {
    const mockCustomers = [
      {
        id: 'cust-216',
        maKh: 'KH0216',
        tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
        maSoThue: '0301728283',
        nguoiDaiDien: 'Thành Ngô',
        sdt: '0357988317',
        tinhThanh: 'TP. Hồ Chí Minh',
        contacts: []
      },
      {
        id: 'cust-213',
        maKh: 'KH0213',
        tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
        maSoThue: '0301728283',
        nguoiDaiDien: 'Phạm Vương',
        sdt: '0908482305',
        tinhThanh: 'TP. Hồ Chí Minh',
        contacts: []
      },
      {
        id: 'cust-hs-mother',
        maKh: 'KH0384',
        tenKhachHang: 'Tập Đoàn Hoa Sen',
        maSoThue: '3700381324',
        tinhThanh: 'Bình Dương',
        contacts: []
      },
      {
        id: 'cust-hs-branch',
        maKh: 'KH0366',
        tenKhachHang: 'Công Ty Cổ Phần Tập Đoàn Hoa Sen - CN Vĩnh Long',
        maSoThue: '3700381324-492',
        tinhThanh: 'Vĩnh Long',
        contacts: []
      }
    ] as unknown as Customer[];

    const mockQuotes = [
      { id: 'q-1', soPhieuBaoGia: 'BG-01', customerId: 'cust-216', loai: 'Vật tư', nguoiDaiDien: 'Thành Ngô', sdt: '0357988317' },
      { id: 'q-2', soPhieuBaoGia: 'BG-02', customerId: 'cust-213', loai: 'Vật tư', nguoiDaiDien: 'Phạm Vương', sdt: '0908482305' },
      { id: 'q-3', soPhieuBaoGia: 'BG-03', customerId: 'cust-213', loai: 'Máy', nguoiDaiDien: 'Phạm Vương', sdt: '0908482305' },
    ] as unknown as Quotation[];

    const duplicateGroups = detectDuplicateCustomerGroups(mockCustomers, mockQuotes);

    // Chỉ có 1 nhóm trùng là Đại Dũng (Hoa Sen Chi Nhánh 13 số không bị gộp vào Hoa Sen Mẹ)
    expect(duplicateGroups.length).toBe(1);
    const daiDungGroup = duplicateGroups[0];
    expect(daiDungGroup.taxCode).toBe('0301728283');
    expect(daiDungGroup.allCustomersInGroup.length).toBe(2);

    // Master Customer phải là KH0213 vì có 2 báo giá (nhiều hơn KH0216 có 1 báo giá)
    expect(daiDungGroup.masterCustomer.maKh).toBe('KH0213');
    expect(daiDungGroup.secondaryCustomers.map(c => c.maKh)).toContain('KH0216');
    expect(daiDungGroup.totalQuotationsCount).toBe(3);
  });

  it('xây dựng kế hoạch gộp bảo toàn toàn bộ đầu mối liên hệ và chuyển giao báo giá', () => {
    const masterCust = {
      id: 'cust-213',
      maKh: 'KH0213',
      tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
      maSoThue: '0301728283',
      nguoiDaiDien: 'Phạm Vương',
      sdt: '0908482305',
      contacts: []
    } as unknown as Customer;

    const secondaryCust = {
      id: 'cust-216',
      maKh: 'KH0216',
      tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
      maSoThue: '0301728283',
      nguoiDaiDien: 'Thành Ngô',
      sdt: '0357988317',
      contacts: []
    } as unknown as Customer;

    const group = {
      taxCode: '0301728283',
      normalizedName: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
      masterCustomer: masterCust,
      secondaryCustomers: [secondaryCust],
      allCustomersInGroup: [masterCust, secondaryCust],
      totalQuotationsCount: 3,
      distinctContactsCount: 2
    };

    const mockQuotes = [
      { id: 'q-1', soPhieuBaoGia: 'BG-01', customerId: 'cust-216', loai: 'Vật tư', nguoiDaiDien: 'Thành Ngô', sdt: '0357988317' },
      { id: 'q-2', soPhieuBaoGia: 'BG-02', customerId: 'cust-213', loai: 'Vật tư', nguoiDaiDien: 'Phạm Vương', sdt: '0908482305' },
    ] as unknown as Quotation[];

    const plan = buildConsolidationMigrationPlan(group, mockQuotes);

    // Master Customer cập nhật phải chứa cả 2 đầu mối: Phạm Vương và Thành Ngô
    expect(plan.updatedMasterCustomer.contacts.length).toBe(2);
    expect(plan.updatedMasterCustomer.contacts.map(c => c.nguoiDaiDien)).toEqual(
      expect.arrayContaining(['Phạm Vương', 'Thành Ngô'])
    );
    expect(plan.updatedMasterCustomer.contacts.map(c => c.sdt)).toEqual(
      expect.arrayContaining(['0908482305', '0357988317'])
    );

    // Báo giá q-1 của KH0216 phải nằm trong danh sách cần chuyển giao
    expect(plan.affectedQuotationIds).toContain('q-1');

    // Khách hàng phụ KH0216 phải bị đánh dấu isArchived và trỏ mergedInto về KH0213
    expect(plan.archivedSecondaryCustomers[0].isArchived).toBe(true);
    expect(plan.archivedSecondaryCustomers[0].mergedInto).toBe('cust-213');
  });

  it('phát hiện chính xác nhóm trùng 13 số chi nhánh như KH0805 và KH0804 (Hoa Sen Cần Thơ)', () => {
    const mockBranchCustomers = [
      {
        id: 'cust-805',
        maKh: 'KH0805',
        tenKhachHang: 'Công Ty Cổ Phần Tập Đoàn Hoa Sen - Chi Nhánh Cần Thơ',
        maSoThue: '1801452294-001',
        tinhThanh: 'Cần Thơ',
        contacts: []
      },
      {
        id: 'cust-804',
        maKh: 'KH0804',
        tenKhachHang: 'Tập Đoàn Hoa Sen Cần Thơ',
        maSoThue: '1801452294-001',
        tinhThanh: 'Cần Thơ',
        contacts: []
      }
    ] as unknown as Customer[];

    const duplicateGroups = detectDuplicateCustomerGroups(mockBranchCustomers);
    expect(duplicateGroups.length).toBe(1);
    expect(duplicateGroups[0].taxCode).toBe('1801452294001');
    expect(duplicateGroups[0].allCustomersInGroup.length).toBe(2);
    expect(duplicateGroups[0].allCustomersInGroup.map(c => c.maKh)).toContain('KH0805');
    expect(duplicateGroups[0].allCustomersInGroup.map(c => c.maKh)).toContain('KH0804');
  });

  it('hỗ trợ tạo nhóm gộp thủ công từ 2 khách hàng bất kỳ được chọn', () => {
    const cust1 = { id: 'c1', maKh: 'KH001', tenKhachHang: 'Khách A', contacts: [] } as unknown as Customer;
    const cust2 = { id: 'c2', maKh: 'KH002', tenKhachHang: 'Khách B', contacts: [] } as unknown as Customer;
    
    const manualGroup = createManualDuplicateGroup([cust1, cust2]);
    expect(manualGroup).not.toBeNull();
    expect(manualGroup?.allCustomersInGroup.length).toBe(2);
    expect(manualGroup?.masterCustomer.maKh).toBe('KH001');
    expect(manualGroup?.secondaryCustomers[0].maKh).toBe('KH002');
  });
});

describe('customerConsolidationEngine – các kiểm thử chuyển từ customer-consolidation-modal.spec.tsx (Đợt 0A)', () => {
  const mockCustomerA: Customer = {
    id: 'cust-216',
    maKh: 'KH0216',
    tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Xây Dựng Thương Mại Đại Dũng',
    maSoThue: '0301728283',
    diaChi: '392 Nguyễn Thị Minh Khai, P.5, Q.3, TP.HCM',
    tinhThanh: 'TP. Hồ Chí Minh',
    sdt: '0357988317',
    nguoiDaiDien: 'Thành Ngô',
    contacts: [{ danhXung: 'Anh', nguoiDaiDien: 'Thành Ngô', sdt: '0357988317', chucVu: 'Giám đốc', chiNhanh: 'Trụ sở chính' }]
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
    contacts: [{ danhXung: 'Anh', nguoiDaiDien: 'Phạm Vương', sdt: '0908482305', chucVu: 'Quản đốc xưởng', chiNhanh: 'Nhà máy An Hạ' }]
  } as unknown as Customer;

  const mockQuotes: Quotation[] = [
    { id: 'quote-1', soPhieuBaoGia: 'BG-2026-001', customerId: 'cust-213', maKh: 'KH0213', totalAmount: 450000000 } as unknown as Quotation
  ];
  const mockContracts = [{ id: 'cont-1', soHopDong: 'HD-2026-001', customerId: 'cust-216', maKh: 'KH0216', totalAmount: 850000000 }];
  const mockPayments = [{ id: 'pay-1', paymentId: 'PT-2026-001', customerId: 'cust-216', maKh: 'KH0216', amount: 400000000 }];
  const mockDeliveries = [{ id: 'del-1', deliveryId: 'PGH-2026-001', customerId: 'cust-213', maKh: 'KH0213', soPhieuXuat: 'PXK-001' }];

  const groupAB = {
    taxCode: '0301728283',
    normalizedName: 'đại dũng',
    masterCustomer: mockCustomerA,
    secondaryCustomers: [mockCustomerB],
    allCustomersInGroup: [mockCustomerA, mockCustomerB],
    totalQuotationsCount: 0,
    distinctContactsCount: 2
  };

  it('2. Áp dụng MDSCS: Ưu tiên Master theo Hợp đồng và Bảo toàn địa chỉ xưởng', () => {
    const groups = detectDuplicateCustomerGroups([mockCustomerA, mockCustomerB], mockQuotes, mockContracts, mockPayments, mockDeliveries);
    expect(groups.length).toBe(1);
    const grp = groups[0];
    expect(grp.masterCustomer.maKh).toBe('KH0216');
    expect(grp.secondaryCustomers[0].maKh).toBe('KH0213');

    const plan = buildConsolidationMigrationPlan(grp, mockQuotes, mockContracts, mockPayments, mockDeliveries);
    const workshopContact = plan.updatedMasterCustomer.contacts?.find(c => c.chiNhanh?.includes('Lô D2, KCN An Hạ'));
    expect(workshopContact).toBeDefined();
    expect(workshopContact?.chiNhanh).toContain('[Nguồn: KH0213]');
    expect(plan.impactSummary.quotationsCount).toBe(1);
    expect(plan.impactSummary.totalQuotationValue).toBe(450000000);
    expect(plan.impactSummary.deliveriesCount).toBe(1);
  });

  it('4. Hỗ trợ gộp bắc cầu (Transitive Merge Flattener) A -> B -> C', () => {
    const custPreMerged: Customer = {
      id: 'cust-200', maKh: 'KH0200', tenKhachHang: 'Đại Dũng Chi Nhánh Cũ', maSoThue: '0301728283',
      mergedCustomerCodes: ['KH0100', 'KH0150'], contacts: []
    } as unknown as Customer;
    const plan = buildConsolidationMigrationPlan(
      { ...groupAB, secondaryCustomers: [custPreMerged], allCustomersInGroup: [mockCustomerA, custPreMerged], distinctContactsCount: 1 },
      [], [], [], []
    );
    expect(plan.updatedMasterCustomer.mergedCustomerCodes).toContain('KH0200');
    expect(plan.updatedMasterCustomer.mergedCustomerCodes).toContain('KH0100');
    expect(plan.updatedMasterCustomer.mergedCustomerCodes).toContain('KH0150');
  });

  it('6. Quét và bảo toàn đa tầng theo từng đợt (cacDotThu trong payments và cacDotGiao trong deliveries)', () => {
    const multiInstallmentPayment = {
      id: 'pay-multi-1', paymentId: 'PT-2026-MULTI', customerId: 'cust-213', maKh: 'KH0213', soTien: 250000000,
      cacDotThu: [
        { dotThu: 1, soTien: 100000000, ngayThu: '2026-03-01', hinhThuc: 'Chuyển khoản', soChungTuThamChieu: 'UNC-01' },
        { dotThu: 2, soTien: 150000000, ngayThu: '2026-03-15', hinhThuc: 'Chuyển khoản', soChungTuThamChieu: 'UNC-02' }
      ]
    };
    const multiShipmentDelivery = {
      id: 'del-multi-1', deliveryId: 'PGH-2026-MULTI', customerId: 'cust-213', maKh: 'KH0213',
      cacDotGiao: [
        { dotGiao: 1, soPhieuXuat: 'PXK-01', ngayGiaoMay: '2026-03-05', soBienBanNghiemThu: 'BBGN-01' },
        { dotGiao: 2, soPhieuXuat: 'PXK-02', ngayGiaoMay: '2026-03-20', soBienBanNghiemThu: 'BBGN-02' }
      ]
    };
    const plan = buildConsolidationMigrationPlan(groupAB, [], [], [multiInstallmentPayment], [multiShipmentDelivery]);
    expect(plan.transferringSummary.billingsCount).toBe(1);
    expect(plan.transferringSummary.paymentInstallmentsCount).toBe(2);
    expect(plan.transferringSummary.totalBillingAmount).toBe(250000000);
    expect(plan.transferringSummary.deliveriesCount).toBe(1);
    expect(plan.transferringSummary.deliveryShipmentsCount).toBe(2);
    expect(plan.combinedSummary.paymentInstallmentsCount).toBe(2);
    expect(plan.combinedSummary.deliveryShipmentsCount).toBe(2);
  });

  it('7. Phân tách Master sở hữu sẵn vs Chuyển giao từ hồ sơ phụ ("Ghost Zero" resolution) – phần động cơ', () => {
    const masterQuote = { id: 'quote-master', soPhieuBaoGia: '11-BG2604-027', customerId: 'cust-216', maKh: 'KH0216', totalAmount: 594000 } as unknown as Quotation;
    const plan = buildConsolidationMigrationPlan({ ...groupAB, totalQuotationsCount: 1 }, [masterQuote], [], [], []);
    expect(plan.masterOwnedSummary.quotationsCount).toBe(1);
    expect(plan.masterOwnedSummary.totalQuotationValue).toBe(594000);
    expect(plan.transferringSummary.quotationsCount).toBe(0);
    expect(plan.transferringSummary.totalQuotationValue).toBe(0);
    expect(plan.combinedSummary.quotationsCount).toBe(1);
    expect(plan.combinedSummary.totalQuotationValue).toBe(594000);
  });

  it('9. Omni-Key Scanner: nhận diện chứng từ lưu bằng maKh khi thiếu customerId', () => {
    const quoteWithOnlyMaKh = { id: 'quote-maKh-only', soPhieuBaoGia: 'BG-MAKH-ONLY', maKh: 'KH0213', totalAmount: 120000000 } as unknown as Quotation;
    const plan = buildConsolidationMigrationPlan({ ...groupAB, totalQuotationsCount: 1 }, [quoteWithOnlyMaKh], [], [], []);
    expect(plan.affectedQuotationIds).toContain('quote-maKh-only');
    expect(plan.transferringSummary.quotationsCount).toBe(1);
    expect(plan.transferringSummary.totalQuotationValue).toBe(120000000);
  });
});
