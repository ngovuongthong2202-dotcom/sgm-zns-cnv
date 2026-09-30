import { describe, it, expect } from 'vitest';
import { classifyErpCustomer } from './erpCustomerClassifier';

describe('erpCustomerClassifier - Multi-Factor Semantic Disambiguation Engine', () => {
  it('correctly classifies "Anh Phạm Trung Đức" (KH0345) as Individual and strips salutation prefix', () => {
    const result = classifyErpCustomer('Anh Phạm Trung Đức', '', 'Anh Đức', '0968688850');

    expect(result.detectedType).toBe('Cá nhân');
    expect(result.ontologyGroup).toBe('CA_NHAN');
    expect(result.salutation).toBe('Anh');
    expect(result.cleanCustomerName).toBe('Phạm Trung Đức');
    expect(result.loaiHinhDoanhNghiep).toBe('CÁ NHÂN');
    expect(result.isConfident).toBe(true);
    expect(result.confidenceReason).toContain('Anh');
  });

  it('correctly classifies "Việt Hùng" (KH0346) with representative "Anh Hùng" as Individual', () => {
    const result = classifyErpCustomer('Việt Hùng', '', 'Anh Hùng', '');

    expect(result.detectedType).toBe('Cá nhân');
    expect(result.ontologyGroup).toBe('CA_NHAN');
    expect(result.cleanCustomerName).toBe('Việt Hùng');
    expect(result.loaiHinhDoanhNghiep).toBe('CÁ NHÂN');
    expect(result.isConfident).toBe(true);
  });

  it('correctly classifies corporate enterprise "CÔNG TY TNHH TẬP ĐOÀN TÔN THIÊN TÂN" with MST', () => {
    const result = classifyErpCustomer('CÔNG TY TNHH TẬP ĐOÀN TÔN THIÊN TÂN', '0304115161', 'Vũ Thị Hòa', '02838384265');

    expect(result.detectedType).toBe('Doanh nghiệp');
    expect(result.ontologyGroup).toBe('DOANH_NGHIEP');
    expect(result.loaiHinhDoanhNghiep).toBe('CÔNG TY TNHH');
    expect(result.cleanCustomerName).toContain('Tập Đoàn Tôn Thiên Tân');
    expect(result.tenZns).toBe('Tập Đoàn Tôn Thiên Tân');
    expect(result.tenZns).not.toContain('Tđ');
  });

  it('correctly classifies manufacturing plant "Nhà Máy Tôn Thép Vạn Niên" (KH0377)', () => {
    const result = classifyErpCustomer('Nhà Máy Tôn Thép Vạn Niên', '', 'Anh Niên', '0981889838');

    expect(result.detectedType).toBe('Doanh nghiệp');
    expect(result.ontologyGroup).toBe('NHA_MAY_XUONG');
    expect(result.cleanCustomerName).toBe('Nhà Máy Tôn Thép Vạn Niên');
    expect(result.representative).toBe('Anh Niên');
  });

  it('correctly classifies salutation prefix "Chị Lan" as Individual', () => {
    const result = classifyErpCustomer('Chị Lan', '', 'Lan', '0912345678');

    expect(result.detectedType).toBe('Cá nhân');
    expect(result.ontologyGroup).toBe('CA_NHAN');
    expect(result.salutation).toBe('Chị');
    expect(result.cleanCustomerName).toBe('Lan');
    expect(result.loaiHinhDoanhNghiep).toBe('CÁ NHÂN');
  });

  it('correctly classifies retailer / dealer "Đại lý Tôn Thép Hoàng Sa"', () => {
    const result = classifyErpCustomer('Đại lý Tôn Thép Hoàng Sa', '', 'Anh Vân', '0377909717');

    expect(result.detectedType).toBe('Doanh nghiệp');
    expect(result.ontologyGroup).toBe('DAI_LY_HO_KD');
    expect(result.loaiHinhDoanhNghiep).toBe('HỘ KINH DOANH');
  });
});
