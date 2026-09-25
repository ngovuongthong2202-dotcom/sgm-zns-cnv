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

  it('safely handles null values returned from Supabase database columns', () => {
    const result = CustomerSchema.safeParse({
      maKh: 'KH0010',
      tenKhachHang: 'Cơ Khí Công Nghiệp Sài Gòn',
      loaiKh: 'Doanh nghiệp',
      loaiHinhDoanhNghiep: 'CÔNG TY TNHH',
      maSoThue: null,
      tinhThanh: 'Thành phố Hồ Chí Minh',
      diaChi: null,
      nguoiPhuTrach: 'Mạnh Hùng (Admin)',
      sdt: null,
      contacts: [
        { nguoiDaiDien: 'Ngô Vương Thông', sdt: '0938384265', chucVu: null, chiNhanh: null }
      ]
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sdt).toBe('');
      expect(result.data.contacts?.[0].sdt).toBe('0938384265');
      expect(result.data.contacts?.[0].nguoiDaiDien).toBe('Ngô Vương Thông');
    }
  });
});
