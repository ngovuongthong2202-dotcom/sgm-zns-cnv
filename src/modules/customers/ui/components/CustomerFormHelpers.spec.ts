import { describe, it, expect } from 'vitest';
import { normalizeCustomerFormValues } from './CustomerFormHelpers';

describe('CustomerFormHelpers - normalizeCustomerFormValues', () => {
  it('should preserve all field and not lose any data properties', () => {
    const mockCustomer: any = {
      id: 'mock-id-123',
      maKh: 'KH001 ',
      tenKhachHang: 'Công ty  tnhh  abc  ',
      loaiHinhDoanhNghiep: 'CÔNG TY TNHH',
      tinhThanh: 'Hà Nội',
      diaChi: '123 Phố abc',
      sdt: '0987654321 ',
      nguoiDaiDien: 'nguyễn văn a',
      nguoiPhuTrach: 'nhân viên 1',
      maSoThue: ' 0102030405 ',
      
      loaiKh: 'VIP',
      contacts: [
        {
          nguoiDaiDien: 'nguyễn văn b',
          sdt: '0123456789',
          chiNhanh: 'chi nhánh  1',
          chucVu: 'giám đốc'
        }
      ],
      tags: ['tag1', 'tag2'],
      chiNhanh: 'chi nhánh chính',
      systemMetadata: { created: '123', specialFlag: true }
      
      
    };

    const normalized = normalizeCustomerFormValues(mockCustomer);

    // It should squeeze spaces and uppercase properly
    expect(normalized.maKh).toBe('KH001');
    expect(normalized.tenKhachHang).toBe('Công Ty TNHH Abc');
    expect(normalized.sdt).toBe('0123456789'); // Inherits from primary contact
    expect(normalized.nguoiDaiDien).toBe('Nguyễn Văn B'); // Inherits from primary contact
    
    // It should preserve id and systemMetadata
    expect(normalized.id).toBe('mock-id-123');
    expect((normalized as any).systemMetadata).toEqual({ created: '123', specialFlag: true });
    
    // Original properties from nested objects
    expect(normalized.contacts[0].nguoiDaiDien).toBe('Nguyễn Văn B');
    expect(normalized.contacts[0].chiNhanh).toBe('Chi Nhánh 1');
    expect(normalized.contacts[0].chucVu).toBe('Giám Đốc');
  });
});
