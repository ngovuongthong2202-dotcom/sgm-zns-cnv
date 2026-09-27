import { describe, it, expect } from 'vitest';
import { detectProvinceFromAddress } from './vietnamAddressParser';
import { VIETNAM_PROVINCES_2025 } from './vietnamProvincesApi';

describe('vietnamAddressParser - Hierarchical Right-to-Left Geocoding', () => {
  it('tự động nhận biết TP Hồ Chí Minh từ ví dụ thực tế của người dùng: 310 Nguyễn Văn Luông, Phú Lâm, Tphcm', () => {
    const address = '310 Nguyễn Văn Luông, Phú Lâm, Tphcm';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('TP Hồ Chí Minh');
  });

  it('nhận biết chính xác khi nhập trực tiếp Tp Hồ Chí Minh', () => {
    const address = 'Tp Hồ Chí Minh';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('TP Hồ Chí Minh');
  });

  it('tránh bẫy tên đường: Đường Hà Nội tại TP.HCM không bị nhận nhầm thành Tỉnh Hà Nội', () => {
    const address = 'Số 45 Đường Hà Nội, Phường Tân Phú, Quận 7, TP Hồ Chí Minh';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('TP Hồ Chí Minh');
  });

  it('tránh bẫy tên đường: Đường Đồng Nai tại Sài Gòn nhận diện đúng TP.HCM', () => {
    const address = '12 đường Đồng Nai, Phường 2, Tân Bình, Sài Gòn';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('TP Hồ Chí Minh');
  });

  it('nhận diện đúng KCN Sóng Thần, Dĩ An thuộc Bình Dương', () => {
    const address = 'Lô C, KCN Sóng Thần 2, Dĩ An, Bình Dương';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('Bình Dương');
  });

  it('nhận diện đúng KCN Amata, Biên Hòa thuộc Đồng Nai', () => {
    const address = 'Đường số 3, KCN Amata, Long Bình, Biên Hòa, Đồng Nai';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('Đồng Nai');
  });

  it('nhận diện đúng Cầu Giấy, Hà Nội', () => {
    const address = 'Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, HN';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('Hà Nội');
  });

  it('nhận diện đúng Đà Nẵng từ viết tắt đn', () => {
    const address = '456 Lê Duẩn, Thanh Khê, ĐN';
    const detected = detectProvinceFromAddress(address, VIETNAM_PROVINCES_2025);
    expect(detected).toBe('Đà Nẵng');
  });

  it('nhận diện đúng Bà Rịa - Vũng Tàu từ BR-VT và KCN Phú Mỹ', () => {
    const address = 'KCN Phú Mỹ 1, Thị xã Phú Mỹ, BR-VT';
    const detected = detectProvinceFromAddress(address, ['Bà Rịa - Vũng Tàu', 'TP Hồ Chí Minh', 'Đồng Nai']);
    expect(detected).toBe('Bà Rịa - Vũng Tàu');
  });

  it('trả về null nếu chuỗi rỗng hoặc không xác định được', () => {
    expect(detectProvinceFromAddress('', VIETNAM_PROVINCES_2025)).toBeNull();
    expect(detectProvinceFromAddress('Số 10 hẻm 2', VIETNAM_PROVINCES_2025)).toBeNull();
  });
});
