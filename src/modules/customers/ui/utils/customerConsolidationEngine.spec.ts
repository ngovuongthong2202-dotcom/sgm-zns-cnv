import { describe, it, expect } from 'vitest';
import { 
  detectDuplicateCustomerGroups, 
  buildConsolidationMigrationPlan,
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
});
