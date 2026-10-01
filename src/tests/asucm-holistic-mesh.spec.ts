import { describe, it, expect } from 'vitest';
import { extractVietnamesePhones, resolveZnsTargetPhone } from '../modules/customers/ui/utils/vietnameseTelecomExtractor';
import { matchesEnterpriseSearch } from '../shared/utils/vietnameseSearchEngine';

describe('ASUCM 3.3 Sovereign Single-Truth Inherited Poly-Phone & Auto-Decomposed Mesh', () => {
  describe('1. Concatenated Phone Decomposition (Row 90 Fix)', () => {
    it('should cleanly decompose 32-digit concatenated phone string into 3 separate valid VN numbers', () => {
      const concatenated = '09839080070283989698302866569696';
      const result = extractVietnamesePhones(concatenated);

      expect(result.phones).toHaveLength(3);
      expect(result.phones[0].cleaned).toBe('0983908007');
      expect(result.phones[0].type).toBe('MOBILE');
      expect(result.phones[0].carrier).toBe('Viettel');

      expect(result.phones[1].cleaned).toBe('02839896983');
      expect(result.phones[1].type).toBe('LANDLINE');
      expect(result.phones[1].carrier).toBe('Cố định VNPT/Viettel');

      expect(result.phones[2].cleaned).toBe('02866569696');
      expect(result.phones[2].type).toBe('LANDLINE');
      expect(result.phones[2].carrier).toBe('Cố định VNPT/Viettel');

      // Primary phone defaults to the first mobile number
      expect(result.primaryPhone).toBe('0983908007');
    });

    it('should prioritize mobile number for ZNS dispatch over landlines', () => {
      const phoneList = ['02839896983', '0983908007', '02866569696'];
      const znsTarget = resolveZnsTargetPhone('02839896983', phoneList);

      // Even though the primary target is a landline, resolveZnsTargetPhone selects the mobile
      expect(znsTarget.validPhone).toBe('0983908007');
      expect(znsTarget.carrier).toBe('Viettel');
    });

    it('should respect soZaloMacDinh when explicitly provided', () => {
      const phoneList = ['0901234567', '0983908007'];
      const znsTarget = resolveZnsTargetPhone('0901234567', phoneList);
      expect(znsTarget.validPhone).toBe('0901234567');
      expect(znsTarget.carrier).toBe('MobiFone');
    });
  });

  describe('2. Multi-Phone Enterprise Search Engine Indexing', () => {
    it('should match target by secondary phone in sdtPhu', () => {
      const quotation = {
        tenKhachHang: 'Công Ty Cổ Phần Thép Hảo Hiệp',
        sdt: '0983908007',
        sdtPhu: '02839896983',
        soPhieuBaoGia: 'BG-2026-0090'
      };

      expect(matchesEnterpriseSearch(quotation, '02839896983')).toBe(true);
      expect(matchesEnterpriseSearch(quotation, '39896983')).toBe(true);
    });

    it('should match target by any phone in danhSachSdt array', () => {
      const contract = {
        tenKhachHang: 'Công Ty Nam Á',
        sdt: '0912345678',
        danhSachSdt: ['0912345678', '02866569696', '0987654321'],
        soHopDong: 'HD-2026-0042'
      };

      expect(matchesEnterpriseSearch(contract, '02866569696')).toBe(true);
      expect(matchesEnterpriseSearch(contract, '0987654321')).toBe(true);
    });

    it('should match customer by phone inside nested contacts array', () => {
      const customer = {
        tenKhachHang: 'Công Ty TNHH Minh Khang',
        contacts: [
          {
            nguoiDaiDien: 'Nguyễn Văn Minh',
            sdt: '0903112233',
            danhSachSdt: ['0903112233', '02435556677']
          }
        ]
      };

      expect(matchesEnterpriseSearch(customer, '02435556677')).toBe(true);
      expect(matchesEnterpriseSearch(customer, 'Minh')).toBe(true);
    });
  });

  describe('3. Single-Truth Inheritance in Payment & Billing', () => {
    it('should inherit payer and clean mobile phone directly from Quotation', () => {
      const mockQuotation = {
        id: 'QUO-001',
        tenKhachHang: 'Công Ty Cổ Phần Thép Hảo Hiệp',
        nguoiLienHe: 'Anh Hảo',
        sdt: '0983908007',
        soZaloMacDinh: '0983908007',
        danhSachSdt: ['0983908007', '02839896983', '02866569696'],
        subTotal: 100000000,
        totalAmount: 110000000
      };

      const inheritedPayer = mockQuotation.nguoiLienHe || mockQuotation.tenKhachHang;
      const inheritedPhone = mockQuotation.soZaloMacDinh || mockQuotation.sdt;

      expect(inheritedPayer).toBe('Anh Hảo');
      expect(inheritedPhone).toBe('0983908007');
      expect(extractVietnamesePhones(inheritedPhone).phones[0].type).toBe('MOBILE');
    });

    it('should inherit payer and clean mobile phone directly from Contract', () => {
      const mockContract = {
        id: 'CTR-001',
        tenKhachHang: 'Tập Đoàn Hòa Phát',
        nguoiDaiDien: 'Trần Đình Long',
        sdt: '0903998877',
        soHopDong: 'HD-HP-2026-01'
      };

      const inheritedPayer = mockContract.nguoiDaiDien || mockContract.tenKhachHang;
      const inheritedPhone = mockContract.sdt;

      expect(inheritedPayer).toBe('Trần Đình Long');
      expect(inheritedPhone).toBe('0903998877');
    });
  });
});
