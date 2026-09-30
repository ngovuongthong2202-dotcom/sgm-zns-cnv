import { Customer } from '@/src/domain/schema/customer.schema';
import { cleanProperVietnameseText, normalizeBusinessName, normalizePersonName, normalizeCode, squeezeSpaces } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { sanitizeTaxCode } from '@/src/shared/utils/inputSanitizer';
import { stripProvinceFromAddress } from '@/src/shared/utils/vietnamRegionHelper';

/**
 * Danh sách Loại hình Doanh nghiệp chuẩn hóa (theo Luật Doanh nghiệp Việt Nam 2020)
 * Dùng cho dropdown lựa chọn và lưu trữ nhất quán trong CRM
 */
export const STANDARDIZED_BUSINESS_TYPES = [
  'CÔNG TY CỔ PHẦN',
  'CÔNG TY TNHH MỘT THÀNH VIÊN',
  'CÔNG TY TNHH HAI THÀNH VIÊN TRỞ LÊN',
  'CÔNG TY TNHH',
  'DOANH NGHIỆP TƯ NHÂN',
  'CÔNG TY HỢP DANH',
  'HỘ KINH DOANH',
  'CÁ NHÂN',
  'HỢP TÁC XÃ / LIÊN HIỆP HTX',
  'CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN',
  'CƠ SỞ SẢN XUẤT / KINH DOANH',
  'KHÁC'
] as const;

export type StandardizedBusinessType = typeof STANDARDIZED_BUSINESS_TYPES[number];

/**
 * Danh sách tiền tố loại hình DN mở rộng dùng để parse/nhận diện từ chuỗi thô (VietQR, MST...)
 * Sắp xếp theo thứ tự ưu tiên: cụm dài và cụ thể trước, cụm ngắn sau
 */
export const BUSINESS_TYPE_MAPPINGS: Array<{ match: RegExp; standard: StandardizedBusinessType; shortPrefix: string }> = [
  // TNHH 1TV
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)\s+(?:MỘT|1)\s+THÀNH\s+VIÊN/i,
    standard: 'CÔNG TY TNHH MỘT THÀNH VIÊN',
    shortPrefix: 'TNHH MTV'
  },
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)\s+MTV/i,
    standard: 'CÔNG TY TNHH MỘT THÀNH VIÊN',
    shortPrefix: 'TNHH MTV'
  },
  // TNHH 2TV trở lên
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)\s+(?:HAI|2)\s+THÀNH\s+VIÊN(?:\s+TRỞ\s+LÊN)?/i,
    standard: 'CÔNG TY TNHH HAI THÀNH VIÊN TRỞ LÊN',
    shortPrefix: 'TNHH 2TV'
  },
  // Công ty TNHH chung (phải khớp trước Cổ Phần nếu có TNHH trước)
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)/i,
    standard: 'CÔNG TY TNHH',
    shortPrefix: 'TNHH'
  },
  // Công ty Cổ phần
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:CỔ PHẦN|CP|CTCP)/i,
    standard: 'CÔNG TY CỔ PHẦN',
    shortPrefix: 'CP'
  },
  // Doanh nghiệp tư nhân
  {
    match: /^(?:DOANH NGHIỆP TƯ NHÂN|DNTN)/i,
    standard: 'DOANH NGHIỆP TƯ NHÂN',
    shortPrefix: 'DNTN'
  },
  // Công ty hợp danh
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?HỢP DANH/i,
    standard: 'CÔNG TY HỢP DANH',
    shortPrefix: 'HD'
  },
  // Hộ kinh doanh
  {
    match: /^(?:HỘ KINH DOANH|HKD)/i,
    standard: 'HỘ KINH DOANH',
    shortPrefix: 'HKD'
  },
  // Hợp tác xã
  {
    match: /^(?:LIÊN HIỆP HỢP TÁC XÃ|HỢP TÁC XÃ|HTX)/i,
    standard: 'HỢP TÁC XÃ / LIÊN HIỆP HTX',
    shortPrefix: 'HTX'
  },
  // Chi nhánh / VPĐD
  {
    match: /^(?:VĂN PHÒNG ĐẠI DIỆN|VPĐD|CHI NHÁNH|CN\b)/i,
    standard: 'CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN',
    shortPrefix: 'CN'
  },
  // Cơ sở sản xuất / kinh doanh
  {
    match: /^(?:CƠ SỞ SẢN XUẤT|CƠ SỞ KINH DOANH|CƠ SỞ)/i,
    standard: 'CƠ SỞ SẢN XUẤT / KINH DOANH',
    shortPrefix: 'CS'
  },
  // Tập đoàn / Tổng công ty độc lập (khi không có TNHH/CP phía trước)
  {
    match: /^(?:TẬP ĐOÀN ĐẦU TƯ|TẬP ĐOÀN|TỔNG CÔNG TY)/i,
    standard: 'CÔNG TY CỔ PHẦN',
    shortPrefix: 'TĐ'
  }
];

export const BUSINESS_TYPE_PREFIXES = STANDARDIZED_BUSINESS_TYPES;

export interface NameSuggestionItem {
  id: string;
  label: string;
  value: string;
  charCount: number;
  isZnsSafe: boolean; // charCount <= 30
  category: 'ULTRA_COMPACT' | 'STANDARD_ZNS' | 'COMMERCIAL' | 'LEGAL';
  badgeText: string;
  badgeClass: string;
}

export interface CorporateIdentityResult {
  loaiHinh: string;
  tenPhapLy: string;
  tenThuongMai: string;
  tenZns: string;
  tenNgayNgan: string; // Tương thích ngược
  suggestions: NameSuggestionItem[];
}

/**
 * Bảng ánh xạ rút gọn tên tỉnh/thành phố cho chi nhánh & địa phương
 */
const PROVINCE_SHORT_MAP: Record<string, string> = {
  'thành phố hồ chí minh': 'TP.HCM',
  'tp hồ chí minh': 'TP.HCM',
  'tp. hồ chí minh': 'TP.HCM',
  'tp hcm': 'TP.HCM',
  'hồ chí minh': 'TP.HCM',
  'thành phố hà nội': 'Hà Nội',
  'tp hà nội': 'Hà Nội',
  'tp. hà nội': 'Hà Nội',
  'hà nội': 'Hà Nội',
  'thành phố đà nẵng': 'Đà Nẵng',
  'tp đà nẵng': 'Đà Nẵng',
  'tp. đà nẵng': 'Đà Nẵng',
  'đà nẵng': 'Đà Nẵng',
  'thành phố cần thơ': 'Cần Thơ',
  'tp cần thơ': 'Cần Thơ',
  'tp. cần thơ': 'Cần Thơ',
  'cần thơ': 'Cần Thơ',
  'thành phố hải phòng': 'Hải Phòng',
  'tp hải phòng': 'Hải Phòng',
  'tp. hải phòng': 'Hải Phòng',
  'hải phòng': 'Hải Phòng',
  'thành phố huế': 'Huế',
  'tp huế': 'Huế',
  'tp. huế': 'Huế',
  'huế': 'Huế'
};

/**
 * Rút gọn chuỗi địa danh hành chính (loại bỏ chữ "Tỉnh", "Thành phố", "Tp.")
 */
function condenseLocationName(locStr: string): string {
  if (!locStr) return '';
  const lower = locStr.trim().toLowerCase();
  if (PROVINCE_SHORT_MAP[lower]) {
    return PROVINCE_SHORT_MAP[lower];
  }
  // Loại bỏ các tiền tố Tỉnh, Thành phố, Huyện, Thị xã
  const cleaned = locStr
    .replace(/^(?:Tỉnh|Thành phố|Thành phó|Tp\.?|Thị xã|Tx\.?|Huyện)\s+/i, '')
    .trim();
  return normalizeBusinessName(cleaned);
}

/**
 * Supreme Enterprise Name & Corporate Identity Generator
 * Bóc tách thực thể 3 tầng: [Loại hình] + [Lõi Thương hiệu & Ngành nghề] + [Chi nhánh & Địa phương]
 * Tự động sinh 4 biến thể ZNS có chủ đích, loại bỏ triệt để lỗi `- - CN`, lỗi mất tỉnh thành và đảm bảo <= 30 ký tự
 */
export function generateEnterpriseNameSuggestions(rawName: string): CorporateIdentityResult {
  // 1. Loại bỏ tiền tố MST hoặc ID ngay trên chuỗi thô TRƯỚC KHI clean
  let raw = (rawName || '').trim();
  raw = raw.replace(/^[0-9]{10}(?:\s*-\s*[0-9]{3})?\s*[-–:]\s*/i, '').trim();
  raw = raw.replace(/^(?:MST|Mã số thuế)\s*[:：\-]?\s*[0-9]{10,13}\s*[-–:]\s*/i, '').trim();

  raw = cleanProperVietnameseText(raw).trim();
  const tenPhapLy = raw;
  let workingStr = raw;
  let detectedLoaiHinh = '';
  let shortLegalPrefix = '';

  // 2. Tách Loại Hình Pháp Lý
  for (const item of BUSINESS_TYPE_MAPPINGS) {
    const match = workingStr.match(item.match);
    if (match) {
      detectedLoaiHinh = item.standard;
      shortLegalPrefix = item.shortPrefix;
      workingStr = workingStr.slice(match[0].length).trim();
      break;
    }
  }

  // Fallback kiểm tra STANDARDIZED_BUSINESS_TYPES
  if (!detectedLoaiHinh) {
    for (const type of STANDARDIZED_BUSINESS_TYPES) {
      const rx = new RegExp(`^${type}\\s+(.*)`, 'i');
      const match = workingStr.match(rx);
      if (match) {
        detectedLoaiHinh = type;
        workingStr = match[1].trim();
        break;
      }
    }
  }

  // Làm sạch các dấu gạch ngang đầu chuỗi còn sót
  workingStr = workingStr.replace(/^[\s\-–:;,.]+/, '').trim();

  // 3. Tách Hậu Tố Chi Nhánh / VPĐD / Địa Điểm Kinh Doanh nếu có
  let branchSuffix = '';
  let branchLocation = '';
  const branchPattern = /(?:[-–]\s*|\s+)(?:CHI NHÁNH|CN|VĂN PHÒNG ĐẠI DIỆN|VPĐD|ĐỊA ĐIỂM KINH DOANH|ĐĐKD|NHÀ MÁY|XƯỞNG)\s*(?:TẠI|Ở)?\s*(?:TỈNH|THÀNH PHỐ|TP\.?|TX\.?|HUYỆN)?\s*([^,\n;]+)$/i;
  const branchMatch = workingStr.match(branchPattern);

  if (branchMatch) {
    const rawLoc = branchMatch[1] ? branchMatch[1].trim() : '';
    branchLocation = condenseLocationName(rawLoc);
    branchSuffix = branchLocation ? ` - CN ${branchLocation}` : ' - CN';
    // Cắt bỏ phần chi nhánh khỏi workingStr
    workingStr = workingStr.slice(0, branchMatch.index).trim();
  }

  // 4. Chuẩn hóa Lõi Thương Hiệu & Ngành Nghề (Vietnamese Linguistic Preserving Engine)
  let brandWithIndustry = workingStr.replace(/[\s\-–:;,.]+$/, '').trim();
  if (!brandWithIndustry) {
    brandWithIndustry = raw;
  }

  // Làm sạch dấu cách và dấu gạch thừa
  const cleanFinal = (str: string) => {
    return str
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*-\s*/g, ' - ')
      .replace(/\s*-\s*/g, ' - ')
      .replace(/^[\s\-–:;,.]+/, '')
      .replace(/[\s\-–:;,.]+$/, '')
      .trim();
  };

  // Trích xuất thương hiệu cốt lõi (loại bỏ các cụm ngành nghề dài nếu cần)
  let brandCoreOnly = brandWithIndustry
    .replace(/(?:Đầu Tư|Thương Mại|Dịch Vụ|Sản Xuất|Xây Dựng|Cơ Khí|Xuất Nhập Khẩu|Nông Nghiệp)\s+/gi, '')
    .trim();
  if (!brandCoreOnly || brandCoreOnly.length < 2) {
    brandCoreOnly = brandWithIndustry;
  }

  // Tên thương mại nguyên bản
  const optCommercial = cleanFinal(`${brandWithIndustry}${branchSuffix}`);

  // Biến thể ZNS tinh gọn: Rút gọn các cụm từ ghép liên từ thương mại thông dụng (TM&DV, SX-TM, ĐT&PT, ĐT-XD, XNK)
  // Tuyệt đối BẢO TOÀN danh xưng Tập Đoàn, Tổng Công Ty
  let condensedIndustry = brandWithIndustry;
  condensedIndustry = condensedIndustry.replace(/(?<![\p{L}\p{N}])(?:Thương Mại\s+(?:Và|&)\s+Dịch Vụ|Thương Mại\s+Dịch Vụ)(?![\p{L}\p{N}])/gui, 'TM&DV');
  condensedIndustry = condensedIndustry.replace(/(?<![\p{L}\p{N}])(?:Sản Xuất\s+(?:Và|&)\s+Thương Mại|Sản Xuất\s+Thương Mại)(?![\p{L}\p{N}])/gui, 'SX-TM');
  condensedIndustry = condensedIndustry.replace(/(?<![\p{L}\p{N}])(?:Đầu Tư\s+(?:Và|&)\s+Phát Triển)(?![\p{L}\p{N}])/gui, 'ĐT&PT');
  condensedIndustry = condensedIndustry.replace(/(?<![\p{L}\p{N}])(?:Đầu Tư\s+(?:Và|&)\s+Xây Dựng|Đầu Tư\s+Xây Dựng)(?![\p{L}\p{N}])/gui, 'ĐT-XD');
  condensedIndustry = condensedIndustry.replace(/(?<![\p{L}\p{N}])(?:Cơ Khí\s+(?:Và|&)\s+Chế Tạo|Cơ Khí\s+Chế Tạo)(?![\p{L}\p{N}])/gui, 'Cơ Khí');
  condensedIndustry = condensedIndustry.replace(/(?<![\p{L}\p{N}])(?:Xuất Nhập Khẩu)(?![\p{L}\p{N}])/gui, 'XNK');

  let optStandardZns = cleanFinal(`${condensedIndustry}${branchSuffix}`);
  if (optStandardZns.length > 29) {
    // Nếu vẫn dài, dùng brandCoreOnly + branchLocation
    optStandardZns = cleanFinal(`${brandCoreOnly}${branchLocation ? ` - CN ${branchLocation}` : branchSuffix}`);
  }
  if (optStandardZns.length > 29) {
    // Cắt an toàn theo ranh giới từ ngữ (Word-boundary Preserving)
    const cutLimit = 29 - branchSuffix.length;
    if (cutLimit > 5) {
      const truncatedCore = brandCoreOnly.slice(0, cutLimit).trim();
      const lastSpace = truncatedCore.lastIndexOf(' ');
      const safeCore = lastSpace > 3 ? truncatedCore.slice(0, lastSpace).trim() : truncatedCore;
      optStandardZns = cleanFinal(`${safeCore}${branchSuffix}`);
    } else {
      optStandardZns = optStandardZns.slice(0, 29).trim();
    }
  }

  // Biến thể siêu tinh gọn (Brand Core Only)
  let optUltraCompact = cleanFinal(`${brandCoreOnly}${branchSuffix}`);
  if (optUltraCompact.length > 29) {
    optUltraCompact = optStandardZns;
  }

  // Biến thể pháp lý đầy đủ chuẩn ĐKKD & rút gọn loại hình
  let optLegalFull = cleanProperVietnameseText(tenPhapLy);
  if (detectedLoaiHinh && workingStr) {
    const legalTitleCase = normalizeBusinessName(detectedLoaiHinh);
    const branchPart = branchLocation ? ` - CN ${branchLocation}` : (branchSuffix ? ` ${branchSuffix}` : '');
    optLegalFull = normalizeBusinessName(`${legalTitleCase} ${brandWithIndustry}${branchPart}`);
  }
  const optLegalShort = cleanFinal(`${shortLegalPrefix ? `${shortLegalPrefix} ` : ''}${optStandardZns}`);

  // Chuẩn hóa Proper Case giữ nguyên từ viết tắt
  const cCommercial = normalizeBusinessName(optCommercial);
  const cZns = normalizeBusinessName(optStandardZns);
  const cUltra = normalizeBusinessName(optUltraCompact);
  const cLegalShort = normalizeBusinessName(optLegalShort);
  const cLegalFull = normalizeBusinessName(optLegalFull);

  // Tạo mảng Suggestions với đầy đủ 4 phân loại rõ ràng
  const rawSuggestions: Array<{ label: string; value: string; category: NameSuggestionItem['category']; badgeText: string }> = [
    { 
      label: 'Tên Chuẩn ZNS (< 30 kt)', 
      value: cZns.length <= 29 ? cZns : (cCommercial.length <= 29 ? cCommercial : cUltra), 
      category: 'STANDARD_ZNS', 
      badgeText: 'Chuẩn ZNS' 
    },
    { 
      label: 'Tên Thương Mại', 
      value: cCommercial, 
      category: 'COMMERCIAL', 
      badgeText: 'Thương Mại' 
    },
    { 
      label: 'Thương Hiệu Cốt Lõi', 
      value: cUltra, 
      category: 'ULTRA_COMPACT', 
      badgeText: 'Thương Hiệu' 
    },
    { 
      label: 'Pháp Lý Đầy Đủ (ĐKKD)', 
      value: cLegalFull, 
      category: 'LEGAL', 
      badgeText: 'Pháp Lý ĐKKD' 
    },
    { 
      label: 'Pháp Lý Rút Gọn', 
      value: cLegalShort, 
      category: 'COMMERCIAL', 
      badgeText: 'Pháp Lý Gọn' 
    }
  ];

  const seenValues = new Set<string>();
  const suggestions: NameSuggestionItem[] = [];

  rawSuggestions.forEach((item, idx) => {
    const val = item.value.trim();
    if (val && !seenValues.has(val.toLowerCase())) {
      seenValues.add(val.toLowerCase());
      const charCount = val.length;
      const isZnsSafe = charCount <= 29;
      let badgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      if (charCount > 29 && charCount <= 35) {
        badgeClass = 'bg-amber-50 text-amber-900 border-amber-300';
      } else if (charCount > 35) {
        badgeClass = 'bg-slate-100 text-slate-700 border-slate-300';
      }

      suggestions.push({
        id: `sug_${idx}_${charCount}`,
        label: item.label,
        value: val,
        charCount,
        isZnsSafe,
        category: item.category,
        badgeText: `${item.badgeText} (${charCount} kt)`,
        badgeClass
      });
    }
  });

  // Chọn tên tối ưu cho từng tầng định danh
  const bestZnsCandidate = cZns.length <= 29 ? cZns : (cCommercial.length <= 29 ? cCommercial : cUltra);
  const bestCommercialCandidate = cCommercial;

  return {
    loaiHinh: detectedLoaiHinh,
    tenPhapLy: cLegalFull,
    tenThuongMai: bestCommercialCandidate,
    tenZns: bestZnsCandidate,
    tenNgayNgan: bestZnsCandidate,
    suggestions
  };
}

/**
 * Tương thích ngược: autoDetectBusinessName
 */
export function autoDetectBusinessName(rawName: string): { 
  loaiHinh: string; 
  tenNgayNgan: string; 
  tenPhapLy: string;
  tenThuongMai: string;
  tenZns: string;
  suggestions?: NameSuggestionItem[];
} {
  const result = generateEnterpriseNameSuggestions(rawName);
  return {
    loaiHinh: result.loaiHinh,
    tenNgayNgan: result.tenZns,
    tenPhapLy: result.tenPhapLy,
    tenThuongMai: result.tenThuongMai,
    tenZns: result.tenZns,
    suggestions: result.suggestions
  };
}

/**
 * Parse dữ liệu doanh nghiệp từ cổng VietQR / Tổng Cục Thuế
 * Luôn đảm bảo tenKhachHang là Tên Pháp Nhân Đầy Đủ theo ĐKKD cho nghiệp vụ B2B
 */
export function parseVietQRBusinessData(business: any, provinces: string[]): {
  loaiHinhDoanhNghiep: string;
  tenKhachHang: string;
  tenPhapLy: string;
  tenThuongMai: string;
  tenZns: string;
  diaChi: string;
  tinhThanh: string;
  xaPhuong?: string;
  suggestions?: NameSuggestionItem[];
} {
  const rawBusinessName = cleanProperVietnameseText(business.name || '');
  const parsed = generateEnterpriseNameSuggestions(rawBusinessName);
  const loaiHinhDoanhNghiep = parsed.loaiHinh;
  
  // Tên pháp nhân đầy đủ là tên chuẩn cho Báo giá, Hợp đồng, Hóa đơn
  const tenPhapLy = parsed.tenPhapLy || rawBusinessName;
  const tenKhachHang = tenPhapLy;
  const tenThuongMai = parsed.tenThuongMai;
  const tenZns = parsed.tenZns;

  const rawAddress = cleanProperVietnameseText(business.address || '');
  let tinhThanh = '';
  const detectedProvince = provinces.find((prov) => {
    const cleanProv = prov.toLowerCase()
      .replace(/thành phố|thành phó|tỉnh|tinh|tp\.?|tp\s+/gi, '')
      .trim();
    return cleanProv.length >= 2 && rawAddress.toLowerCase().includes(cleanProv);
  });
  if (detectedProvince) {
    tinhThanh = detectedProvince;
  }

  // Tách bỏ tỉnh/thành khỏi chuỗi địa chỉ chi tiết để tránh trùng lặp
  const diaChi = detectedProvince ? stripProvinceFromAddress(rawAddress, detectedProvince) : rawAddress;

  // Bóc tách phường/xã nếu có
  let xaPhuong = '';
  const wardMatch = diaChi.match(/(?:Phường|Xã|Thị trấn)\s+[^,]+/i);
  if (wardMatch) {
    xaPhuong = cleanProperVietnameseText(wardMatch[0]);
  }

  return {
    loaiHinhDoanhNghiep,
    tenKhachHang,
    tenPhapLy,
    tenThuongMai: parsed.tenThuongMai,
    tenZns,
    diaChi,
    tinhThanh,
    xaPhuong,
    suggestions: parsed.suggestions
  };
}

export function normalizeCustomerFormValues(data: Customer): Customer {
  const trimStr = (v: string | null | undefined) => (typeof v === 'string' ? squeezeSpaces(v) : v);

  const normalized: Partial<Customer> = {};
  for (const key of Object.keys(data)) {
    (normalized as any)[key] = trimStr((data as any)[key]);
  }
  normalized.maKh = normalizeCode(normalized.maKh);
  normalized.loaiHinhDoanhNghiep = (normalized.loaiHinhDoanhNghiep || '').toString().trim().toUpperCase();
  
  const isIndividual = normalized.loaiHinhDoanhNghiep === 'CÁ NHÂN' || normalized.loaiKh === 'Cá nhân';
  if (isIndividual) {
    normalized.loaiHinhDoanhNghiep = 'CÁ NHÂN';
    normalized.tenKhachHang = normalizePersonName(normalized.tenKhachHang);
    if (!normalized.nguoiDaiDien && normalized.tenKhachHang) {
      normalized.nguoiDaiDien = normalized.tenKhachHang;
    }
  } else {
    normalized.tenKhachHang = normalizeBusinessName(normalized.tenKhachHang);
  }

  normalized.maSoThue = normalized.maSoThue ? sanitizeTaxCode(normalized.maSoThue) : '';
  normalized.diaChi = cleanProperVietnameseText(normalized.diaChi);
  normalized.tinhThanh = cleanProperVietnameseText(normalized.tinhThanh);
  normalized.nguoiDaiDien = normalizePersonName(normalized.nguoiDaiDien);
  const cleanBranchOrContactNote = (val?: string | null) => {
    if (!val) return '';
    const str = squeezeSpaces(val);
    if (str.includes('@')) return str;
    return cleanProperVietnameseText(str);
  };

  normalized.chiNhanh = cleanBranchOrContactNote(normalized.chiNhanh);
  normalized.sdt = normalizePhoneVN(normalized.sdt as any) || normalized.sdt;
  normalized.nhuCauKhachHang = (normalized.nhuCauKhachHang || '').toString().trim();
  normalized.tags = Array.isArray(normalized.tags) ? Array.from(new Set(normalized.tags.map((t: string) => (t || '').trim()).filter(Boolean))) : [];
  
  if (Array.isArray(normalized.contacts)) {
    const rawCleaned = normalized.contacts.map((c: any) => {
      const nc: any = {};
      for (const key of Object.keys(c || {})) {
        nc[key] = trimStr((c as any)[key]);
      }
      nc.nguoiDaiDien = normalizePersonName(nc.nguoiDaiDien);
      nc.chiNhanh = cleanBranchOrContactNote(nc.chiNhanh);
      nc.chucVu = cleanProperVietnameseText(nc.chucVu);
      nc.sdt = normalizePhoneVN(nc.sdt) || nc.sdt;
      if (c.trangThaiZns) nc.trangThaiZns = c.trangThaiZns;
      if (c.ngayGuiZns) nc.ngayGuiZns = c.ngayGuiZns;
      if (c.lastZnsTrackingId) nc.lastZnsTrackingId = c.lastZnsTrackingId;
      return nc;
    });

    // Keep primary contact or any contact that has at least name, phone, title or branch
    normalized.contacts = rawCleaned.filter((c: any, idx: number) => {
      if (idx === 0) return true;
      return Boolean((c.nguoiDaiDien || '').trim() || (c.sdt || '').trim() || (c.chucVu || '').trim() || (c.chiNhanh || '').trim());
    });

    // Map root sdt, nguoiDaiDien, chiNhanh from primary contact to prevent missing fields
    if (normalized.contacts.length > 0) {
      const primaryContact = normalized.contacts[0];
      normalized.sdt = primaryContact.sdt || normalized.sdt || '';
      normalized.nguoiDaiDien = primaryContact.nguoiDaiDien || normalized.nguoiDaiDien || '';
      normalized.chiNhanh = primaryContact.chiNhanh || normalized.chiNhanh || '';
    } else if (normalized.sdt || normalized.nguoiDaiDien || normalized.chiNhanh) {
      normalized.contacts = [{
        danhXung: '',
        nguoiDaiDien: normalized.nguoiDaiDien || '',
        sdt: normalized.sdt || '',
        chucVu: '',
        chiNhanh: normalized.chiNhanh || ''
      }];
    }
  } else if (normalized.sdt || normalized.nguoiDaiDien || normalized.chiNhanh) {
    normalized.contacts = [{
      danhXung: '',
      nguoiDaiDien: normalized.nguoiDaiDien || '',
      sdt: normalized.sdt || '',
      chucVu: '',
      chiNhanh: normalized.chiNhanh || ''
    }];
  }

  return normalized as Customer;
}
