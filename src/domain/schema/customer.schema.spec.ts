import { describe, it, expect } from 'vitest';
import { CustomerSchema } from './customer.schema';

describe('CustomerSchema legacy data tolerance', () => {
  it('accepts customer with empty trangThaiGuiTinQuangCao', () => {
    const result = CustomerSchema.safeParse({
      maKh: 'KH001', tenKhachHang: 'Test',
      trangThaiGuiTinQuangCao: '',  // legacy empty
    });
    expect(result.success).toBe(true);
  });
  
  it('accepts legacy non-enum status', () => {
    const result = CustomerSchema.safeParse({
      maKh: 'KH001', tenKhachHang: 'Test',
      trangThaiGuiTinQuangCao: 'ĐÃ GỬI',  // legacy string không trong enum
    });
    expect(result.success).toBe(true);
  });
  
  it('accepts customer with missing optional fields', () => {
    const result = CustomerSchema.safeParse({
      maKh: 'KH001', tenKhachHang: 'Test',
      // không có tinhThanh/diaChi/nguoiPhuTrach
    });
    expect(result.success).toBe(true);
  });
});
