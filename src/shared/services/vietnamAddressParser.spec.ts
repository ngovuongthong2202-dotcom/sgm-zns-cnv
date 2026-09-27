import { describe, it, expect } from 'vitest';
import { 
  detectProvinceFromAddress, 
  detectDistrictFromAddress, 
  detectIndustrialZone, 
  resolveLogisticsRegion, 
  suggestLogisticsCarriers,
  parseVietnamAddressComplete 
} from './vietnamAddressParser';
import { VIETNAM_PROVINCES_2025 } from './vietnamProvincesApi';

describe('vietnamAddressParser - Hierarchical Right-to-Left Geocoding & Logistics Engine', () => {
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

  // Tests cho tính năng mới cấp Quận/Huyện & KCN & Logistics
  it('bóc tách chính xác cấp Quận/Huyện/Thị xã', () => {
    expect(detectDistrictFromAddress('310 Nguyễn Văn Luông, Phú Lâm, Quận 6, TP.HCM')).toBe('Quận 6');
    expect(detectDistrictFromAddress('Lô 5 KCN Tân Đức, Đức Hòa, Long An')).toBe('Huyện Đức Hòa');
    expect(detectDistrictFromAddress('Đường D1, KCN VSIP 1, Thuận An, Bình Dương')).toBe('TP Thuận An');
    expect(detectDistrictFromAddress('KCN Amata, Biên Hòa, Đồng Nai')).toBe('TP Biên Hòa');
  });

  it('bóc tách chính xác Cụm Khu Công Nghiệp trọng điểm cơ khí', () => {
    expect(detectIndustrialZone('Xưởng 2, KCN VSIP 1, Thuận An')).toBe('KCN VSIP 1 (Bình Dương)');
    expect(detectIndustrialZone('Kho A, KCN Sóng Thần 2, Dĩ An')).toBe('KCN Sóng Thần (Dĩ An)');
    expect(detectIndustrialZone('Lô 12, KCN Tân Đức, Đức Hòa, Long An')).toBe('KCN Tân Đức (Đức Hòa - Long An)');
    expect(detectIndustrialZone('Đường số 9, KCN Tân Bình, TP.HCM')).toBe('KCN Tân Bình (TP.HCM)');
  });

  it('phân loại đúng Vùng Vận Tải Logistics', () => {
    expect(resolveLogisticsRegion('TP Hồ Chí Minh')).toBe('Đông Nam Bộ');
    expect(resolveLogisticsRegion('Bình Dương')).toBe('Đông Nam Bộ');
    expect(resolveLogisticsRegion('Long An')).toBe('Tây Nam Bộ');
    expect(resolveLogisticsRegion('Cần Thơ')).toBe('Tây Nam Bộ');
    expect(resolveLogisticsRegion('Đắk Lắk')).toBe('Tây Nguyên');
    expect(resolveLogisticsRegion('Đà Nẵng')).toBe('Duyên Hải Miền Trung');
    expect(resolveLogisticsRegion('Hà Nội')).toBe('Bắc Bộ');
  });

  it('gợi ý danh mục Chành xe uy tín chuyên tuyến cơ khí SGM', () => {
    const tayNamBoCarriers = suggestLogisticsCarriers('Tây Nam Bộ');
    expect(tayNamBoCarriers.some(c => c.carrierName.includes('Tô Châu'))).toBe(true);

    const dongNamBoCarriers = suggestLogisticsCarriers('Đông Nam Bộ');
    expect(dongNamBoCarriers.some(c => c.carrierName.includes('SGM'))).toBe(true);
  });

  it('parseVietnamAddressComplete phân tích trọn vẹn 1 địa chỉ cơ khí thực tế', () => {
    const raw = 'Xưởng máy SGM, Lô B4 KCN Tân Đức, Huyện Đức Hòa, Tỉnh Long An';
    const result = parseVietnamAddressComplete(raw, VIETNAM_PROVINCES_2025);

    expect(result.province).toBe('Long An');
    expect(result.district).toBe('Huyện Đức Hòa');
    expect(result.industrialZone).toBe('KCN Tân Đức (Đức Hòa - Long An)');
    expect(result.logisticsRegion).toBe('Tây Nam Bộ');
    expect(result.suggestedCarriers.length).toBeGreaterThan(0);
  });
});
