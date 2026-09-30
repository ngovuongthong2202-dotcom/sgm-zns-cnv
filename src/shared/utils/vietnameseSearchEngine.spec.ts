import { describe, it, expect } from 'vitest';
import { 
  normalizeVietnameseSearch, 
  extractDigits, 
  cleanTaxCode, 
  matchesEnterpriseSearch 
} from './vietnameseSearchEngine';

describe('vietnameseSearchEngine', () => {
  it('normalizes Vietnamese text correctly removing diacritics and converting đ/Đ', () => {
    expect(normalizeVietnameseSearch('Nguyễn Văn Đồng')).toBe('nguyen van dong');
    expect(normalizeVietnameseSearch('CÔNG TY TNHH ĐẠI ĐỒNG TIẾN')).toBe('cong ty tnhh dai dong tien');
  });

  it('cleans tax code and extracts digits reliably', () => {
    expect(cleanTaxCode('0313-884-841')).toBe('0313884841');
    expect(cleanTaxCode('0313 884 841 - 001')).toBe('0313884841001');
    expect(extractDigits('0913.938.819 / 0259 382 3242')).toBe('091393881902593823242');
  });

  const mockCustomer = {
    id: 'cust-123',
    maKh: 'KH0123',
    tenKhachHang: 'Công Ty TNHH Sản Xuất Cơ Khí Nam Sơn',
    nguoiDaiDien: 'Ông Trần Văn Nam',
    maSoThue: '0313884841',
    sdt: '0913938819',
    tinhThanh: 'Bình Dương',
    contacts: [
      {
        nguoiDaiDien: 'Chị Mai Kế Toán',
        sdt: '0983916267',
        chucVu: 'Kế toán trưởng',
        email: 'ketoan@namson.vn'
      }
    ],
    products: [
      {
        productName: 'Máy Dán Nhãn Decal Tự Động SGM-500',
        model: 'SGM-500',
        danhSachMaMay: ['MM-2026-001', 'MM-2026-002']
      }
    ]
  };

  it('matches customer by exact or formatted Tax Code (Mã số thuế)', () => {
    // Exact digits
    expect(matchesEnterpriseSearch(mockCustomer, '0313884841')).toBe(true);
    // Formatted with hyphens / spaces
    expect(matchesEnterpriseSearch(mockCustomer, '0313-884-841')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, '0313 884')).toBe(true);
    // Non-existent tax
    expect(matchesEnterpriseSearch(mockCustomer, '9999999999')).toBe(false);
  });

  it('matches customer by formatted phone number with spaces or dots', () => {
    // Phone with spaces
    expect(matchesEnterpriseSearch(mockCustomer, '0913 938 819')).toBe(true);
    // Phone with dots
    expect(matchesEnterpriseSearch(mockCustomer, '0913.938.819')).toBe(true);
    // Contact phone with spaces
    expect(matchesEnterpriseSearch(mockCustomer, '0983 916 267')).toBe(true);
  });

  it('matches customer by embedded contact name, title, or email', () => {
    expect(matchesEnterpriseSearch(mockCustomer, 'chi mai')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, 'ke toan truong')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, 'ketoan@namson.vn')).toBe(true);
  });

  it('matches customer by product model, name, or machine code', () => {
    expect(matchesEnterpriseSearch(mockCustomer, 'may dan nhan')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, 'SGM-500')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, 'MM-2026-001')).toBe(true);
  });

  it('returns true when query is empty or blank', () => {
    expect(matchesEnterpriseSearch(mockCustomer, '')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, '   ')).toBe(true);
    expect(matchesEnterpriseSearch(mockCustomer, null)).toBe(true);
  });
});
