/**
 * Vietnamese Telecom Disambiguator & Phone Extraction Engine
 * Tự động bóc tách và phân loại các chuỗi số điện thoại dính chùm từ ERP
 * Hỗ trợ nhận diện số di động (10 số, Zalo) và số bàn cố định (11 số), suy luận mã vùng địa lý
 */

export interface ExtractedPhoneItem {
  raw: string;
  cleaned: string;
  formatted: string;
  type: 'MOBILE' | 'LANDLINE' | 'UNKNOWN';
  carrier?: string;
  isZaloEligible: boolean;
  label: string;
}

export interface TelecomExtractionResult {
  primaryPhone: string;
  primaryFormatted: string;
  isZaloEligible: boolean;
  phones: ExtractedPhoneItem[];
  displayBadges: Array<{
    text: string;
    type: 'MOBILE' | 'LANDLINE';
    carrier?: string;
    phone: string;
  }>;
}

// Bảng ánh xạ mã vùng cố định Việt Nam (Quy hoạch 2017)
const PROVINCE_AREA_CODES: Record<string, string> = {
  'hồ chí minh': '028',
  'tp.hcm': '028',
  'tphcm': '028',
  'hcm': '028',
  'hà nội': '024',
  'tp.hà nội': '024',
  'đà nẵng': '0236',
  'hải phòng': '0225',
  'cần thơ': '0292',
  'bình dương': '0274',
  'đồng nai': '0251',
  'long an': '0272',
  'tiền giang': '0273',
  'bà rịa': '0254',
  'vũng tàu': '0254',
  'tây ninh': '0276',
  'lâm đồng': '0263',
  'đắk lắk': '0262',
  'vĩnh long': '0270',
  'bình thuận': '0252',
  'khánh hòa': '0258',
  'quảng nam': '0235',
  'quảng ngãi': '0255',
  'thanh hóa': '0237',
  'nghệ an': '0238',
  'hải dương': '0220',
  'bắc ninh': '0222',
  'thái bình': '0227',
  'nam định': '0228',
};

// Nhận diện nhà mạng di động Việt Nam
function detectMobileCarrier(phone: string): string {
  const p3 = phone.slice(0, 3);
  if (['086', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039'].includes(p3)) {
    return 'Viettel';
  }
  if (['088', '091', '094', '083', '084', '085', '081', '082'].includes(p3)) {
    return 'Vinaphone';
  }
  if (['089', '090', '093', '070', '079', '077', '076', '078'].includes(p3)) {
    return 'MobiFone';
  }
  if (['092', '056', '058'].includes(p3)) {
    return 'Vietnamobile';
  }
  if (['099', '059'].includes(p3)) {
    return 'Gmobile';
  }
  if (['087'].includes(p3)) {
    return 'Wintel';
  }
  return 'Di động';
}

function formatPhoneDisplay(cleaned: string, type: 'MOBILE' | 'LANDLINE' | 'UNKNOWN'): string {
  if (type === 'MOBILE' && cleaned.length === 10) {
    // 0908 482 305 hoặc 0947 889 630
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  if (type === 'LANDLINE') {
    if (cleaned.startsWith('028') || cleaned.startsWith('024')) {
      // 028 3760 7173 hoặc 028 3989 6983
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
  }
  return cleaned;
}

/**
 * Trích xuất mảng số điện thoại từ một chuỗi dính chùm hoặc chứa nhiều phân cách
 */
export function extractVietnamesePhones(rawInput?: string, addressContext?: string): TelecomExtractionResult {
  if (!rawInput || typeof rawInput !== 'string') {
    return {
      primaryPhone: '',
      primaryFormatted: '',
      isZaloEligible: false,
      phones: [],
      displayBadges: []
    };
  }

  // 1. Tìm mã vùng khả dĩ từ địa chỉ ngữ cảnh nếu có
  let inferredAreaCode = '028'; // Mặc định TP.HCM theo trụ sở chính SGM
  if (addressContext) {
    const addrLower = addressContext.toLowerCase();
    for (const [kw, code] of Object.entries(PROVINCE_AREA_CODES)) {
      if (addrLower.includes(kw)) {
        inferredAreaCode = code;
        break;
      }
    }
  }

  // 2. Tách chuỗi thô bằng các dấu phân cách phổ biến
  // Thay thế dấu phân cách /, ;, ,, |, -, +, \ thành khoảng trắng
  const preNormalized = rawInput
    .replace(/[+]/g, '')
    .replace(/^(?:84)(0?[35789]\d{8})/g, '$1') // Bỏ +84 ở đầu
    .replace(/[\\/,;\-_|&]|\bhoặc\b|\bđt\b|\bsđt\b|\btel\b/gi, ' ');

  const tokens = preNormalized.split(/\s+/).map(t => t.trim()).filter(Boolean);
  const foundNumbers: string[] = [];

  for (const token of tokens) {
    const digitsOnly = token.replace(/\D/g, '');
    if (!digitsOnly) continue;

    // A. Nếu là số đơn chuẩn 10 số (di động)
    if (/^0[35789]\d{8}$/.test(digitsOnly)) {
      foundNumbers.push(digitsOnly);
      continue;
    }

    // B. Nếu là số đơn chuẩn 11 số (cố định bàn 02x)
    if (/^02\d{9}$/.test(digitsOnly)) {
      foundNumbers.push(digitsOnly);
      continue;
    }

    // C. Nếu là chuỗi số dài dính chùm (>= 18 số) từ ERP
    // Ví dụ: "0838643583376071730903814168" hoặc "09478896300925017071" hoặc "09839080070283989698302866569696"
    if (digitsOnly.length >= 18) {
      let cursor = 0;
      while (cursor < digitsOnly.length) {
        const remaining = digitsOnly.slice(cursor);
        
        // C1. Kiểm tra số di động 10 số bắt đầu bằng 03, 05, 07, 08, 09
        if (/^0[35789]\d{8}/.test(remaining)) {
          foundNumbers.push(remaining.slice(0, 10));
          cursor += 10;
          continue;
        }

        // C2. Kiểm tra số bàn cố định 11 số bắt đầu bằng 02
        if (/^02\d{9}/.test(remaining)) {
          foundNumbers.push(remaining.slice(0, 11));
          cursor += 11;
          continue;
        }

        // C3. Kiểm tra số máy bàn 8 số cục bộ không có mã vùng (ví dụ: 37607173 hoặc 39896983)
        // Khi theo sau bởi một số di động mới bắt đầu bằng 0...
        const localMatch = remaining.match(/^([2-9]\d{6,7})(?=0[235789]|$)/);
        if (localMatch) {
          const localNum = localMatch[1];
          // Ghép mã vùng suy luận địa lý
          foundNumbers.push(`${inferredAreaCode}${localNum}`);
          cursor += localNum.length;
          continue;
        }

        // Nếu không khớp pattern nào, nhảy 1 ký tự
        cursor++;
      }
      continue;
    }

    // D. Nếu là số 8 chữ số độc lập (máy bàn không mã vùng)
    if (/^[2-9]\d{7}$/.test(digitsOnly)) {
      foundNumbers.push(`${inferredAreaCode}${digitsOnly}`);
      continue;
    }

    // E. Nếu còn sót các trường hợp khác >= 9 số
    if (digitsOnly.length >= 9 && digitsOnly.length <= 11) {
      const normalizedLeading = digitsOnly.startsWith('0') ? digitsOnly : `0${digitsOnly}`;
      if (normalizedLeading.length === 10 || normalizedLeading.length === 11) {
        foundNumbers.push(normalizedLeading);
      }
    }
  }

  // Khử trùng lặp số điện thoại
  const uniquePhones = Array.from(new Set(foundNumbers));

  // Phân loại chi tiết từng số
  const items: ExtractedPhoneItem[] = uniquePhones.map(num => {
    const isMobile = /^0[35789]\d{8}$/.test(num);
    const isLandline = /^02\d{9}$/.test(num);
    const carrier = isMobile ? detectMobileCarrier(num) : (isLandline ? 'Cố định VNPT/Viettel' : undefined);
    const type: ExtractedPhoneItem['type'] = isMobile ? 'MOBILE' : (isLandline ? 'LANDLINE' : 'UNKNOWN');
    const formatted = formatPhoneDisplay(num, type);
    const label = isMobile ? `📱 Di động (${carrier || 'Zalo'})` : (isLandline ? '☎️ Bàn cố định' : 'Số liên hệ');

    return {
      raw: num,
      cleaned: num,
      formatted,
      type,
      carrier,
      isZaloEligible: isMobile,
      label
    };
  });

  // Ưu tiên số di động lên đầu làm SĐT chính (để gửi ZNS), nếu không có mới lấy số cố định
  const sortedItems = [...items].sort((a, b) => {
    if (a.isZaloEligible && !b.isZaloEligible) return -1;
    if (!a.isZaloEligible && b.isZaloEligible) return 1;
    return 0;
  });

  const primaryItem = sortedItems[0];
  const primaryPhone = primaryItem ? primaryItem.cleaned : '';
  const primaryFormatted = primaryItem ? primaryItem.formatted : '';
  const isZaloEligible = primaryItem ? primaryItem.isZaloEligible : false;

  const displayBadges = sortedItems.map(it => ({
    text: it.formatted,
    type: it.type === 'MOBILE' ? 'MOBILE' as const : 'LANDLINE' as const,
    carrier: it.carrier,
    phone: it.cleaned
  }));

  return {
    primaryPhone,
    primaryFormatted,
    isZaloEligible,
    phones: sortedItems,
    displayBadges
  };
}
