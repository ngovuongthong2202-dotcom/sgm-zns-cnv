/**
 * BẢN ĐỒ ÁNH XẠ VÙNG ĐỊA LÝ KINH TẾ VIỆT NAM (VIETNAM MACRO-REGIONAL ENGINE)
 * Phục vụ phân vùng thị trường bán hàng, điều phối vận chuyển, logistics và quản trị khách hàng.
 */

export type VietnamRegion = 'Miền Nam' | 'Miền Bắc' | 'Miền Trung' | 'Tây Nguyên' | 'Toàn quốc';

export interface VietnamRegionInfo {
  region: VietnamRegion;
  subRegion: string;
  normalizedProvince: string;
  displayName: string;
}

// Bảng từ điển 63 tỉnh/thành phố chuẩn hóa
const PROVINCE_TO_REGION_MAP: Record<string, { region: VietnamRegion; subRegion: string; standardName: string }> = {
  // === MIỀN BẮC ===
  'hà nội': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'TP. Hà Nội' },
  'ha noi': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'TP. Hà Nội' },
  'hải phòng': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'TP. Hải Phòng' },
  'hai phong': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'TP. Hải Phòng' },
  'quảng ninh': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Quảng Ninh' },
  'bắc ninh': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Bắc Ninh' },
  'hưng yên': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Hưng Yên' },
  'hải dương': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Hải Dương' },
  'thái bình': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Thái Bình' },
  'nam định': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Nam Định' },
  'ninh bình': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Ninh Bình' },
  'hà nam': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Hà Nam' },
  'vĩnh phúc': { region: 'Miền Bắc', subRegion: 'Đồng bằng sông Hồng', standardName: 'Vĩnh Phúc' },
  'phú thọ': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Phú Thọ' },
  'bắc giang': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Bắc Giang' },
  'thái nguyên': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Thái Nguyên' },
  'lạng sơn': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Lạng Sơn' },
  'tuyên quang': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Tuyên Quang' },
  'cao bằng': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Cao Bằng' },
  'hà giang': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Hà Giang' },
  'bắc kạn': { region: 'Miền Bắc', subRegion: 'Đông Bắc', standardName: 'Bắc Kạn' },
  'lào cai': { region: 'Miền Bắc', subRegion: 'Tây Bắc', standardName: 'Lào Cai' },
  'yên bái': { region: 'Miền Bắc', subRegion: 'Tây Bắc', standardName: 'Yên Bái' },
  'điện biên': { region: 'Miền Bắc', subRegion: 'Tây Bắc', standardName: 'Điện Biên' },
  'lai châu': { region: 'Miền Bắc', subRegion: 'Tây Bắc', standardName: 'Lai Châu' },
  'sơn la': { region: 'Miền Bắc', subRegion: 'Tây Bắc', standardName: 'Sơn La' },
  'hòa bình': { region: 'Miền Bắc', subRegion: 'Tây Bắc', standardName: 'Hòa Bình' },

  // === MIỀN TRUNG ===
  'đà nẵng': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'TP. Đà Nẵng' },
  'da nang': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'TP. Đà Nẵng' },
  'thừa thiên huế': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Thừa Thiên Huế' },
  'huế': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Thừa Thiên Huế' },
  'quảng nam': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Quảng Nam' },
  'quảng ngãi': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Quảng Ngãi' },
  'bình định': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Bình Định' },
  'phú yên': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Phú Yên' },
  'khánh hòa': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Khánh Hòa' },
  'nha trang': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Khánh Hòa' },
  'ninh thuận': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Ninh Thuận' },
  'bình thuận': { region: 'Miền Trung', subRegion: 'Duyên hải Nam Trung Bộ', standardName: 'Bình Thuận' },
  'thanh hóa': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Thanh Hóa' },
  'nghệ an': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Nghệ An' },
  'hà tĩnh': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Hà Tĩnh' },
  'quảng bình': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Quảng Bình' },
  'quảng trị': { region: 'Miền Trung', subRegion: 'Bắc Trung Bộ', standardName: 'Quảng Trị' },

  // === TÂY NGUYÊN ===
  'đắk lắk': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Đắk Lắk' },
  'dak lak': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Đắk Lắk' },
  'đắc lắc': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Đắk Lắk' },
  'gia lai': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Gia Lai' },
  'lâm đồng': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Lâm Đồng' },
  'đà lạt': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Lâm Đồng' },
  'kon tum': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Kon Tum' },
  'đắk nông': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Đắk Nông' },
  'dak nong': { region: 'Tây Nguyên', subRegion: 'Tây Nguyên', standardName: 'Đắk Nông' },

  // === MIỀN NAM ===
  'hồ chí minh': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'ho chi minh': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'tp.hcm': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'tp hcm': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'tphcm': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'sài gòn': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'sai gon': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'TP. Hồ Chí Minh' },
  'bình dương': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Bình Dương' },
  'binh duong': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Bình Dương' },
  'đồng nai': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Đồng Nai' },
  'dong nai': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Đồng Nai' },
  'bà rịa - vũng tàu': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Bà Rịa - Vũng Tàu' },
  'bà rịa vũng tàu': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Bà Rịa - Vũng Tàu' },
  'vũng tàu': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Bà Rịa - Vũng Tàu' },
  'tây ninh': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Tây Ninh' },
  'bình phước': { region: 'Miền Nam', subRegion: 'Đông Nam Bộ', standardName: 'Bình Phước' },
  'long an': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Long An' },
  'tiền giang': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Tiền Giang' },
  'bến tre': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Bến Tre' },
  'trà vinh': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Trà Vinh' },
  'vĩnh long': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Vĩnh Long' },
  'đồng tháp': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Đồng Tháp' },
  'an giang': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'An Giang' },
  'kiên giang': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Kiên Giang' },
  'cần thơ': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'TP. Cần Thơ' },
  'can tho': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'TP. Cần Thơ' },
  'hậu giang': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Hậu Giang' },
  'sóc trăng': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Sóc Trăng' },
  'bạc liêu': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Bạc Liêu' },
  'cà mau': { region: 'Miền Nam', subRegion: 'Đồng bằng sông Cửu Long', standardName: 'Cà Mau' },
};

/**
 * Chuẩn hóa và nhận diện vùng địa lý từ tên tỉnh thành
 */
export function getVietnameseRegion(tinhThanh?: string | null): VietnamRegionInfo {
  if (!tinhThanh || typeof tinhThanh !== 'string' || !tinhThanh.trim()) {
    return {
      region: 'Toàn quốc',
      subRegion: 'Toàn quốc',
      normalizedProvince: 'Toàn quốc',
      displayName: 'Toàn quốc'
    };
  }

  const rawClean = tinhThanh
    .toLowerCase()
    .trim()
    .replace(/^(tỉnh|thành phố|thanh pho|tp\.?|tp\s+)/gi, '')
    .trim();

  // Tìm trong từ điển
  if (PROVINCE_TO_REGION_MAP[rawClean]) {
    const item = PROVINCE_TO_REGION_MAP[rawClean];
    return {
      region: item.region,
      subRegion: item.subRegion,
      normalizedProvince: item.standardName,
      displayName: `${item.region} • ${item.standardName}`
    };
  }

  // Quét tìm từ khóa gần đúng
  for (const [key, item] of Object.entries(PROVINCE_TO_REGION_MAP)) {
    if (rawClean.includes(key) || key.includes(rawClean)) {
      return {
        region: item.region,
        subRegion: item.subRegion,
        normalizedProvince: item.standardName,
        displayName: `${item.region} • ${item.standardName}`
      };
    }
  }

  // Fallback nếu không khớp
  const fallbackName = tinhThanh.trim();
  return {
    region: 'Toàn quốc',
    subRegion: 'Khu vực khác',
    normalizedProvince: fallbackName,
    displayName: fallbackName
  };
}

/**
 * Hiển thị nhãn Khu Vực Phân Vùng chuyên nghiệp
 * Ví dụ: "Miền Nam • TP. Hồ Chí Minh"
 */
export function formatCustomerRegionDisplay(tinhThanh?: string | null): string {
  const info = getVietnameseRegion(tinhThanh);
  return info.displayName;
}

/**
 * Khử trùng lặp địa chỉ chi tiết và tỉnh thành (Smart Anti-Duplication Address Formatter)
 * Đảm bảo không bao giờ xuất hiện chuỗi như "..., Tp Hồ Chí Minh, Tp Hồ Chí Minh"
 */
export function cleanDuplicateAddress(
  diaChi?: string | null,
  tinhThanh?: string | null,
  xaPhuong?: string | null
): string {
  const parts: string[] = [];
  const cleanDiaChi = (diaChi || '').trim().replace(/,\s*$/, '');
  const cleanXaPhuong = (xaPhuong || '').trim().replace(/,\s*$/, '');
  const cleanTinhThanh = (tinhThanh || '').trim().replace(/,\s*$/, '');

  if (!cleanDiaChi && !cleanTinhThanh && !cleanXaPhuong) {
    return 'Chưa cập nhật địa chỉ';
  }

  if (cleanDiaChi) {
    parts.push(cleanDiaChi);
  }

  const diaChiLower = cleanDiaChi.toLowerCase();

  // Kiểm tra xã phường nếu chưa có trong diaChi
  if (cleanXaPhuong) {
    const xpLower = cleanXaPhuong.toLowerCase();
    const xpCore = xpLower.replace(/^(phường|xã|thị trấn|tt\.?)\s+/gi, '').trim();
    if (!diaChiLower.includes(xpLower) && !diaChiLower.includes(xpCore)) {
      parts.push(cleanXaPhuong);
    }
  }

  // Kiểm tra tỉnh thành nếu chưa có trong diaChi
  if (cleanTinhThanh) {
    const provLower = cleanTinhThanh.toLowerCase();
    const provCore = provLower.replace(/^(tỉnh|thành phố|thanh pho|tp\.?|tp\s+)/gi, '').trim();
    
    // Nếu trong diaChi chưa có tên tỉnh thành thì mới thêm
    const isAlreadyPresent = diaChiLower.endsWith(provLower) || 
                             diaChiLower.endsWith(provCore) || 
                             diaChiLower.includes(`, ${provLower}`) || 
                             diaChiLower.includes(`, ${provCore}`) ||
                             diaChiLower.includes(` ${provCore}`);
                             
    if (!isAlreadyPresent) {
      parts.push(cleanTinhThanh);
    }
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Tách bỏ tỉnh/thành khỏi chuỗi địa chỉ chi tiết thô nhận từ VietQR API
 */
export function stripProvinceFromAddress(rawAddress: string, detectedProvince: string): string {
  if (!rawAddress) return '';
  let cleaned = rawAddress.trim();
  
  if (!detectedProvince) return cleaned;

  const provLower = detectedProvince.toLowerCase().trim();
  const provCore = provLower.replace(/^(tỉnh|thành phố|thanh pho|tp\.?|tp\s+)/gi, '').trim();

  // Pattern bóc tách hậu tố tỉnh thành ở cuối chuỗi
  const regexPatterns = [
    new RegExp(`[,\\s]+(?:Thành phố|Tỉnh|TP\\.?)?\\s*${provCore}\\s*$`, 'i'),
    new RegExp(`[,\\s]+(?:TP\\s+Hồ\\s+Chí\\s+Minh|TP\\.HCM|TPHCM|Sài\\s+Gòn)\\s*$`, 'i'),
    new RegExp(`[,\\s]+${provLower}\\s*$`, 'i')
  ];

  for (const regex of regexPatterns) {
    if (regex.test(cleaned)) {
      cleaned = cleaned.replace(regex, '').trim();
      break;
    }
  }

  return cleaned.replace(/,\s*$/, '');
}
