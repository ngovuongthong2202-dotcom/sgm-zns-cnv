import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { autoDetectBusinessName } from '@/src/modules/customers/ui/components/CustomerFormHelpers';

export type CustomerOntologyGroup = 'DOANH_NGHIEP' | 'NHA_MAY_XUONG' | 'DAI_LY_HO_KD' | 'CA_NHAN';

export interface ErpCustomerClassificationResult {
  detectedType: 'Doanh nghiệp' | 'Cá nhân';
  ontologyGroup: CustomerOntologyGroup;
  cleanCustomerName: string;
  salutation: string;
  representative: string;
  taxCode: string;
  loaiHinhDoanhNghiep: string;
  tenZns: string;
  tenThuongMai: string;
  confidenceReason: string;
  isConfident: boolean;
}

// 120 Họ phổ biến nhất của người Việt Nam
const COMMON_VIETNAMESE_SURNAMES = new Set([
  'nguyễn', 'nguyen', 'trần', 'tran', 'lê', 'le', 'phạm', 'pham', 'hoàng', 'hoang',
  'huỳnh', 'huynh', 'phan', 'vũ', 'vu', 'võ', 'vo', 'đặng', 'dang', 'bùi', 'bui',
  'đỗ', 'do', 'hồ', 'ho', 'ngô', 'ngo', 'dương', 'duong', 'lý', 'ly', 'đào', 'dao',
  'đinh', 'dinh', 'đoàn', 'doan', 'lâm', 'lam', 'trịnh', 'trinh', 'mai', 'phùng',
  'phung', 'cao', 'hà', 'ha', 'lương', 'luong', 'thái', 'thai', 'tạ', 'ta', 'tô',
  'to', 'từ', 'tu', 'lưu', 'luu', 'vương', 'vuong', 'tăng', 'tang', 'khổng', 'khong',
  'la', 'lạc', 'lac', 'thạch', 'thach', 'giang', 'kiều', 'kieu', 'trương', 'truong',
  'chu', 'châu', 'chau', 'quách', 'quach', 'ninh', 'uông', 'uong', 'nghiêm', 'nghiem',
  'tống', 'tong', 'bạch', 'bach', 'tiêu', 'tieu', 'mạc', 'mac', 'việt', 'viet'
]);

// Từ khóa nhà máy / xưởng sản xuất
const PLANT_WORKSHOP_KEYWORDS = [
  'nhà máy', 'nha may', 'xưởng', 'xuong', 'xí nghiệp', 'xi nghiep', 'cơ sở sản xuất', 'cs sx'
];

// Từ khóa đại lý / cửa hàng / hộ kinh doanh
const DEALER_STORE_KEYWORDS = [
  'đại lý', 'dai ly', 'cửa hàng', 'cua hang', 'tổng kho', 'tong kho', 'hộ kinh doanh', 'hkd'
];

// Từ khóa pháp nhân doanh nghiệp
const ENTERPRISE_KEYWORDS = [
  'công ty', 'cty', 'tnhh', 'cổ phần', 'cp', 'ctcp', 'doanh nghiệp', 'dntn',
  'hợp tác xã', 'htx', 'tập đoàn', 'tct', 'chi nhánh', 'văn phòng đại diện',
  'vpđd', 'thương mại', 'dịch vụ', 'sản xuất', 'chế tạo', 'xây dựng', 'cơ khí'
];

// Danh xưng cá nhân
const SALUTATION_PATTERNS = [
  { match: /^(?:Anh|A\.)\s+/i, salutation: 'Anh' },
  { match: /^(?:Chị|Chi|C\.)\s+/i, salutation: 'Chị' },
  { match: /^(?:Ông|Bac\s+trai)\s+/i, salutation: 'Ông' },
  { match: /^(?:Bà|Bac\s+gai)\s+/i, salutation: 'Bà' },
  { match: /^(?:Cô|Co)\s+/i, salutation: 'Cô' },
  { match: /^(?:Chú|Chu)\s+/i, salutation: 'Chú' },
  { match: /^(?:Bác|Bac)\s+/i, salutation: 'Bác' },
  { match: /^(?:Em)\s+/i, salutation: 'Em' }
];

/**
 * Động Cơ Phân Định Đa Nhân Tố Ngữ Nghĩa (Multi-Factor Semantic Disambiguation Engine)
 * Phân tích dữ liệu đơn hàng ERP để bóc tách chính xác Khách hàng Doanh Nghiệp vs Khách hàng Cá Nhân
 */
export function classifyErpCustomer(
  rawCustomerName: string = '',
  rawTaxCode: string = '',
  rawRepresentative: string = '',
  rawPhone: string = ''
): ErpCustomerClassificationResult {
  const nameTrimmed = (rawCustomerName || '').trim();
  const taxTrimmed = (rawTaxCode || '').trim().replace(/[^0-9-]/g, '');
  const repTrimmed = (rawRepresentative || '').trim();
  const phoneTrimmed = (rawPhone || '').trim();

  const lowerName = nameTrimmed.toLowerCase();
  const words = nameTrimmed.split(/\s+/).filter(Boolean);

  // 1. Kiểm tra tiền tố danh xưng (Anh, Chị, Ông, Bà...)
  let extractedSalutation = '';
  let nameWithoutSalutation = nameTrimmed;

  for (const item of SALUTATION_PATTERNS) {
    if (item.match.test(nameTrimmed)) {
      extractedSalutation = item.salutation;
      nameWithoutSalutation = nameTrimmed.replace(item.match, '').trim();
      break;
    }
  }

  // 2. Kiểm tra Mã số thuế hợp lệ doanh nghiệp (10 số hoặc 13 số có gạch nối)
  const isStandardTaxCode = /^[0-9]{10}(?:-[0-9]{3})?$/.test(taxTrimmed) || /^[0-9]{13}$/.test(taxTrimmed);

  // 3. Kiểm tra Từ khóa nhà máy / xưởng
  const isPlantOrWorkshop = PLANT_WORKSHOP_KEYWORDS.some(kw => {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${kw}(?![\\p{L}\\p{N}])`, 'iu');
    return rx.test(lowerName);
  });

  // 4. Kiểm tra Từ khóa đại lý / cửa hàng
  const isDealerOrStore = DEALER_STORE_KEYWORDS.some(kw => {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${kw}(?![\\p{L}\\p{N}])`, 'iu');
    return rx.test(lowerName);
  });

  // 5. Kiểm tra Từ khóa pháp nhân doanh nghiệp
  const hasEnterpriseKeyword = ENTERPRISE_KEYWORDS.some(kw => {
    const rx = new RegExp(`(?<![\\p{L}\\p{N}])${kw}(?![\\p{L}\\p{N}])`, 'iu');
    return rx.test(lowerName);
  });

  // 6. Kiểm tra Họ người Việt Nam
  const firstWordWithoutSalutation = (nameWithoutSalutation.split(/\s+/)[0] || '').toLowerCase();
  const startsWithVietnameseSurname = COMMON_VIETNAMESE_SURNAMES.has(firstWordWithoutSalutation);
  const wordsCount = nameWithoutSalutation.split(/\s+/).length;
  const isLikelyPersonFullName = startsWithVietnameseSurname && wordsCount >= 2 && wordsCount <= 5;

  // 7. Kiểm tra tương quan giữa Tên khách hàng & Đại diện
  const repMatchesCustomer = repTrimmed && (
    lowerName.includes(repTrimmed.toLowerCase()) || 
    repTrimmed.toLowerCase().includes(nameWithoutSalutation.toLowerCase())
  );

  // ===================== TIẾN HÀNH QUYẾT ĐỊNH PHÂN LOẠI =====================

  // Trường hợp 1: Có tiền tố danh xưng rõ ràng (như "Anh Phạm Trung Đức", "Chị Lan")
  if (extractedSalutation) {
    const cleanName = cleanProperVietnameseText(nameWithoutSalutation);
    const finalRep = repTrimmed ? cleanProperVietnameseText(repTrimmed) : cleanName;
    return {
      detectedType: 'Cá nhân',
      ontologyGroup: 'CA_NHAN',
      cleanCustomerName: cleanName,
      salutation: extractedSalutation,
      representative: finalRep,
      taxCode: isStandardTaxCode ? taxTrimmed : '',
      loaiHinhDoanhNghiep: 'CÁ NHÂN',
      tenZns: cleanName.slice(0, 29),
      tenThuongMai: cleanName,
      confidenceReason: `Nhận diện tiền tố danh xưng "${extractedSalutation}" và họ tên cá nhân "${cleanName}"`,
      isConfident: true
    };
  }

  // Trường hợp 2: Nhà máy / Xưởng gia công
  if (isPlantOrWorkshop) {
    const cleanName = cleanProperVietnameseText(nameTrimmed);
    const finalRep = repTrimmed ? cleanProperVietnameseText(repTrimmed) : '';
    return {
      detectedType: 'Doanh nghiệp',
      ontologyGroup: 'NHA_MAY_XUONG',
      cleanCustomerName: cleanName,
      salutation: 'Quý nhà máy / xưởng',
      representative: finalRep,
      taxCode: taxTrimmed,
      loaiHinhDoanhNghiep: 'NHÀ MÁY / XƯỞNG SẢN XUẤT',
      tenZns: cleanName.slice(0, 29),
      tenThuongMai: cleanName,
      confidenceReason: `Nhận diện từ khóa cơ sở sản xuất / nhà máy ("${cleanName}")`,
      isConfident: true
    };
  }

  // Trường hợp 3: Có MST chuẩn và/hoặc từ khóa doanh nghiệp ĐKKD
  if (isStandardTaxCode || hasEnterpriseKeyword) {
    const detected = autoDetectBusinessName(nameTrimmed);
    const finalRep = repTrimmed ? cleanProperVietnameseText(repTrimmed) : '';
    return {
      detectedType: 'Doanh nghiệp',
      ontologyGroup: 'DOANH_NGHIEP',
      cleanCustomerName: cleanProperVietnameseText(detected.tenPhapLy || nameTrimmed),
      salutation: 'Quý công ty',
      representative: finalRep,
      taxCode: taxTrimmed,
      loaiHinhDoanhNghiep: detected.loaiHinh || 'CÔNG TY TNHH',
      tenZns: detected.tenZns,
      tenThuongMai: detected.tenThuongMai,
      confidenceReason: isStandardTaxCode 
        ? `Mã số thuế doanh nghiệp hợp lệ (${taxTrimmed})` 
        : `Tên chứa từ khóa pháp nhân/doanh nghiệp`,
      isConfident: true
    };
  }

  // Trường hợp 4: Đại lý / Cửa hàng
  if (isDealerOrStore) {
    const cleanName = cleanProperVietnameseText(nameTrimmed);
    const finalRep = repTrimmed ? cleanProperVietnameseText(repTrimmed) : '';
    return {
      detectedType: 'Doanh nghiệp',
      ontologyGroup: 'DAI_LY_HO_KD',
      cleanCustomerName: cleanName,
      salutation: 'Quý đại lý / cửa hàng',
      representative: finalRep,
      taxCode: taxTrimmed,
      loaiHinhDoanhNghiep: 'HỘ KINH DOANH',
      tenZns: cleanName.slice(0, 29),
      tenThuongMai: cleanName,
      confidenceReason: `Nhận diện từ khóa đại lý / cửa hàng thương mại`,
      isConfident: true
    };
  }

  // Trường hợp 5: Không có MST, không có từ khóa DN, nhưng là Họ tên người Việt 2-4 từ (như "Việt Hùng", "Phạm Văn Hiếm")
  if (isLikelyPersonFullName) {
    const cleanName = cleanProperVietnameseText(nameWithoutSalutation);
    const finalRep = repTrimmed ? cleanProperVietnameseText(repTrimmed) : cleanName;
    return {
      detectedType: 'Cá nhân',
      ontologyGroup: 'CA_NHAN',
      cleanCustomerName: cleanName,
      salutation: 'Anh/Chị',
      representative: finalRep,
      taxCode: '',
      loaiHinhDoanhNghiep: 'CÁ NHÂN',
      tenZns: cleanName.slice(0, 29),
      tenThuongMai: cleanName,
      confidenceReason: `Cấu trúc họ tên cá nhân Việt Nam (${cleanName}), không có mã số thuế`,
      isConfident: true
    };
  }

  // Trường hợp 6: Tương quan đại diện trùng khớp (ví dụ Tên: "Việt Hùng", Đại diện: "Anh Hùng")
  if (repMatchesCustomer && wordsCount <= 3) {
    const cleanName = cleanProperVietnameseText(nameWithoutSalutation);
    return {
      detectedType: 'Cá nhân',
      ontologyGroup: 'CA_NHAN',
      cleanCustomerName: cleanName,
      salutation: 'Anh/Chị',
      representative: repTrimmed || cleanName,
      taxCode: '',
      loaiHinhDoanhNghiep: 'CÁ NHÂN',
      tenZns: cleanName.slice(0, 29),
      tenThuongMai: cleanName,
      confidenceReason: `Trùng khớp thông tin giữa tên khách hàng và người đại diện (${repTrimmed})`,
      isConfident: true
    };
  }

  // Fallback an toàn: Doanh nghiệp / Hộ thương mại
  const fallbackDetected = autoDetectBusinessName(nameTrimmed);
  return {
    detectedType: 'Doanh nghiệp',
    ontologyGroup: 'DOANH_NGHIEP',
    cleanCustomerName: cleanProperVietnameseText(nameTrimmed),
    salutation: 'Quý công ty',
    representative: repTrimmed ? cleanProperVietnameseText(repTrimmed) : '',
    taxCode: taxTrimmed,
    loaiHinhDoanhNghiep: fallbackDetected.loaiHinh || 'CÔNG TY TNHH',
    tenZns: fallbackDetected.tenZns,
    tenThuongMai: fallbackDetected.tenThuongMai,
    confidenceReason: 'Khách hàng tổ chức / thương mại mặc định',
    isConfident: false
  };
}
