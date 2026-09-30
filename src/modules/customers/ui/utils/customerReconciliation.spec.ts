import { describe, it, expect } from 'vitest';
import { detectMisclassifiedCustomer } from './customerReconciliation';
import { Customer } from '@/src/domain/schema/customer.schema';

describe('customerReconciliation utility', () => {
  it('detects KH0345 "Anh Phạm Trung Đức" misclassified as Doanh nghiệp and suggests Cá nhân', () => {
    const mockCustomer: Partial<Customer> = {
      maKh: 'KH0345',
      tenKhachHang: 'Anh Phạm Trung Đức',
      loaiKh: 'Doanh nghiệp',
      loaiHinhDoanhNghiep: 'CÔNG TY TNHH',
      nguoiDaiDien: 'Anh Đức',
      sdt: '0968688850',
      tinhThanh: 'Hòa Bình',
      diaChi: 'Khu 4, Thị Trấn Cao Phong'
    };

    const result = detectMisclassifiedCustomer(mockCustomer);

    expect(result.needsReconciliation).toBe(true);
    expect(result.suggestedCustomer.loaiKh).toBe('Cá nhân');
    expect(result.suggestedCustomer.loaiHinhDoanhNghiep).toBe('CÁ NHÂN');
    expect(result.suggestedCustomer.tenKhachHang).toBe('Phạm Trung Đức');
  });

  it('keeps genuine corporate enterprise as Doanh nghiệp without false alarms', () => {
    const mockCustomer: Partial<Customer> = {
      maKh: 'KH001',
      tenKhachHang: 'Công Ty TNHH Tập Đoàn Tôn Thiên Tân',
      loaiKh: 'Doanh nghiệp',
      loaiHinhDoanhNghiep: 'CÔNG TY TNHH',
      maSoThue: '0304115161',
      sdt: '02838384265'
    };

    const result = detectMisclassifiedCustomer(mockCustomer);

    expect(result.needsReconciliation).toBe(false);
  });
});
