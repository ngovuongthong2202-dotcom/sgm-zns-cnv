import { describe, it, expect } from 'vitest';
import { 
  Customer 
} from '../domain/schema/customer.schema';
import { 
  detectDuplicateCustomerGroups, 
  buildConsolidationMigrationPlan,
  isValidEnterpriseTaxCode 
} from '../modules/customers/ui/utils/customerConsolidationEngine';

describe('SGM Omni-Nexus v23: Binary Contact Fusion & Tax Disambiguation Matrix', () => {
  describe('Pillar 1: Same Tax Code -> Consolidated Entity & Contact Fusion', () => {
    const masterCustomer = {
      id: 'cust-master',
      maKh: 'KH-001',
      tenKhachHang: 'Công Ty TNHH In Bao Bì Đại Nam',
      loaiHinhDoanhNghiep: 'TNHH',
      maSoThue: '0312345678',
      sdt: '0903123456',
      nguoiDaiDien: 'Nguyễn Văn Nam',
      chiNhanh: 'Trụ sở chính',
      tags: [],
      contacts: [
        {
          danhXung: 'Anh',
          nguoiDaiDien: 'Nguyễn Văn Nam',
          sdt: '0903123456',
          chucVu: 'Giám Đốc',
          chiNhanh: 'Trụ sở chính'
        }
      ]
    } as unknown as Customer;

    const duplicateCustomer = {
      id: 'cust-dup',
      maKh: 'KH-002',
      tenKhachHang: 'CÔNG TY TNHH IN BAO BÌ ĐẠI NAM (Chi nhánh HCM)',
      loaiHinhDoanhNghiep: 'TNHH',
      maSoThue: '0312345678', // Same Tax Code!
      sdt: '0903123456', // Same Phone Number!
      nguoiDaiDien: 'Nguyễn Văn Nam',
      chiNhanh: 'Văn phòng đại diện',
      tags: [],
      contacts: [
        {
          danhXung: 'Anh',
          nguoiDaiDien: 'Nguyễn Văn Nam',
          sdt: '0903123456',
          chucVu: 'Đại diện',
          chiNhanh: 'Văn phòng đại diện'
        },
        {
          danhXung: 'Chị',
          nguoiDaiDien: 'Lê Thị Thu',
          sdt: '0918999888',
          chucVu: 'Kế toán trưởng',
          chiNhanh: 'Phòng Kế toán'
        }
      ]
    } as unknown as Customer;

    it('detects duplicate customer group when tax code is identical', () => {
      const groups = detectDuplicateCustomerGroups([masterCustomer, duplicateCustomer]);
      expect(groups.length).toBe(1);
      expect(groups[0].taxCode).toBe('0312345678');
      expect(groups[0].secondaryCustomers.length).toBe(1);
      expect(groups[0].secondaryCustomers[0].id).toBe('cust-dup');
    });

    it('fuses identical phone contacts into a single contact card while preserving lineage', () => {
      const groups = detectDuplicateCustomerGroups([masterCustomer, duplicateCustomer]);
      const plan = buildConsolidationMigrationPlan(groups[0]);

      const updatedContacts = plan.updatedMasterCustomer.contacts || [];
      
      // Phone 0903123456 should only appear ONCE in the contacts array
      const matchesNam = updatedContacts.filter(c => c.sdt === '0903123456');
      expect(matchesNam.length).toBe(1);

      // Highest title 'Giám Đốc' is preserved
      expect(matchesNam[0].chucVu).toBe('Giám Đốc');

      // Provenance lineage note is attached to branch/chiNhanh
      expect(matchesNam[0].chiNhanh).toContain('KH-002');
      expect(matchesNam[0].chiNhanh).toContain('Đã hợp nhất trùng SĐT');

      // Independent contact 'Lê Thị Thu' is successfully added as well
      const matchesThu = updatedContacts.filter(c => c.sdt === '0918999888');
      expect(matchesThu.length).toBe(1);
      expect(matchesThu[0].nguoiDaiDien).toBe('Lê Thị Thu');
    });

    it('archives secondary customer and tags master customer as CONSOLIDATED_MASTER', () => {
      const groups = detectDuplicateCustomerGroups([masterCustomer, duplicateCustomer]);
      const plan = buildConsolidationMigrationPlan(groups[0]);

      expect(plan.updatedMasterCustomer.tags).toContain('CONSOLIDATED_MASTER');
      expect(plan.archivedSecondaryCustomers[0].isArchived).toBe(true);
      expect(plan.archivedSecondaryCustomers[0].mergedInto).toBe('cust-master');
      expect(plan.archivedSecondaryCustomers[0].tags).toContain('MERGED_SECONDARY');
    });
  });

  describe('Pillar 2: Different Tax Code -> Prohibits Legal Merge (Preserves Legal Identity)', () => {
    const customerA = {
      id: 'cust-A',
      maKh: 'KH-A',
      tenKhachHang: 'Công Ty Cổ Phần Cơ Khí Miền Nam',
      loaiHinhDoanhNghiep: 'CỔ PHẦN',
      maSoThue: '0311223344',
      sdt: '0909999888',
      nguoiDaiDien: 'Trần Văn Long',
      contacts: [],
      tags: []
    } as unknown as Customer;

    const customerB = {
      id: 'cust-B',
      maKh: 'KH-B',
      tenKhachHang: 'Công Ty TNHH Thương Mại Toàn Thịnh',
      loaiHinhDoanhNghiep: 'TNHH',
      maSoThue: '0399887766', // DIFFERENT Tax Code!
      sdt: '0909999888', // Same phone number (shared director or agent)
      nguoiDaiDien: 'Trần Văn Long',
      contacts: [],
      tags: []
    } as unknown as Customer;

    it('does NOT group companies with different tax codes into a duplicate consolidation group', () => {
      const groups = detectDuplicateCustomerGroups([customerA, customerB]);
      // Should not group because their legal entity tax codes are distinct
      expect(groups.length).toBe(0);
    });

    it('verifies that both tax codes are valid independent enterprise entities', () => {
      expect(isValidEnterpriseTaxCode(customerA.maSoThue)).toBe(true);
      expect(isValidEnterpriseTaxCode(customerB.maSoThue)).toBe(true);
      expect(customerA.maSoThue).not.toBe(customerB.maSoThue);
    });
  });
});
