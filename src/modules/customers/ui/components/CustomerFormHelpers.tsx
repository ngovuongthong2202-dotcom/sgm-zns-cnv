import { Customer } from '@/src/domain/schema/customer.schema';
import { cleanProperVietnameseText, normalizeBusinessName, normalizePersonName, normalizeCode, squeezeSpaces } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { sanitizeTaxCode } from '@/src/shared/utils/inputSanitizer';

/**
 * Danh sách Loại hình Doanh nghiệp chuẩn hóa (theo Luật Doanh nghiệp Việt Nam)
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
export const BUSINESS_TYPE_MAPPINGS: Array<{ match: RegExp; standard: StandardizedBusinessType }> = [
  // TNHH 1TV
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)\s+(?:MỘT|1)\s+THÀNH\s+VIÊN/i,
    standard: 'CÔNG TY TNHH MỘT THÀNH VIÊN'
  },
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)\s+MTV/i,
    standard: 'CÔNG TY TNHH MỘT THÀNH VIÊN'
  },
  // TNHH 2TV trở lên
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)\s+(?:HAI|2)\s+THÀNH\s+VIÊN(?:\s+TRỞ\s+LÊN)?/i,
    standard: 'CÔNG TY TNHH HAI THÀNH VIÊN TRỞ LÊN'
  },
  // Công ty Cổ phần
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:CỔ PHẦN|CP|CTCP)/i,
    standard: 'CÔNG TY CỔ PHẦN'
  },
  // Doanh nghiệp tư nhân
  {
    match: /^(?:DOANH NGHIỆP TƯ NHÂN|DNTN)/i,
    standard: 'DOANH NGHIỆP TƯ NHÂN'
  },
  // Công ty hợp danh
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?HỢP DANH/i,
    standard: 'CÔNG TY HỢP DANH'
  },
  // Hộ kinh doanh
  {
    match: /^(?:HỘ KINH DOANH|HKD)/i,
    standard: 'HỘ KINH DOANH'
  },
  // Hợp tác xã
  {
    match: /^(?:LIÊN HIỆP HỢP TÁC XÃ|HỢP TÁC XÃ|HTX)/i,
    standard: 'HỢP TÁC XÃ / LIÊN HIỆP HTX'
  },
  // Chi nhánh / VPĐD
  {
    match: /^(?:VĂN PHÒNG ĐẠI DIỆN|VPĐD|CHI NHÁNH|CN\b)/i,
    standard: 'CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN'
  },
  // Cơ sở sản xuất / kinh doanh
  {
    match: /^(?:CƠ SỞ SẢN XUẤT|CƠ SỞ KINH DOANH|CƠ SỞ)/i,
    standard: 'CƠ SỞ SẢN XUẤT / KINH DOANH'
  },
  // Tập đoàn / Tổng công ty
  {
    match: /^(?:TẬP ĐOÀN ĐẦU TƯ|TẬP ĐOÀN|TỔNG CÔNG TY)/i,
    standard: 'CÔNG TY CỔ PHẦN'
  },
  // Công ty TNHH chung
  {
    match: /^(?:CÔNG TY\s+|CTY\s+)?(?:TRÁCH NHIỆM HỮU HẠN|TNHH)/i,
    standard: 'CÔNG TY TNHH'
  }
];

// Giữ lại alias để tương thích ngược
export const BUSINESS_TYPE_PREFIXES = STANDARDIZED_BUSINESS_TYPES;

export function autoDetectBusinessName(rawName: string): { loaiHinh: string; tenNgayNgan: string } {
  let cln = cleanProperVietnameseText(rawName || '');
  let loaiHinh = '';

  // 1. Thử khớp với bảng BUSINESS_TYPE_MAPPINGS
  for (const item of BUSINESS_TYPE_MAPPINGS) {
    const match = cln.match(item.match);
    if (match) {
      loaiHinh = item.standard;
      cln = cln.slice(match[0].length).trim();
      break;
    }
  }

  // 2. Fallback kiểm tra tiền tố từ STANDARDIZED_BUSINESS_TYPES
  if (!loaiHinh) {
    for (const type of STANDARDIZED_BUSINESS_TYPES) {
      const rx = new RegExp(`^${type}\\s+(.*)`, 'i');
      const match = cln.match(rx);
      if (match) {
        loaiHinh = type;
        cln = match[1];
        break;
      }
    }
  }

  // 3. Tối ưu và rút gọn thông minh các cụm từ thương mại/ngành nghề
  cln = cln.replace(/^[\s\-–:;,.]+/, '').trim();

  let tenNgayNgan = cln;

  // Rút gọn các cụm từ dài phổ biến với Unicode boundaries
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Thương Mại\s+(?:Và|&)\s+Dịch Vụ|Thương Mại\s+Dịch Vụ)(?![\p{L}\p{N}])/gui, 'TM&DV');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Sản Xuất\s+(?:Và|&)\s+Thương Mại|Sản Xuất\s+Thương Mại)(?![\p{L}\p{N}])/gui, 'SX-TM');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Đầu Tư\s+(?:Và|&)\s+Phát Triển)(?![\p{L}\p{N}])/gui, 'ĐT&PT');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Đầu Tư\s+(?:Và|&)\s+Xây Dựng|Đầu Tư\s+Xây Dựng)(?![\p{L}\p{N}])/gui, 'ĐT-XD');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Xuất Nhập Khẩu)(?![\p{L}\p{N}])/gui, 'XNK');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Kỹ Thuật)(?![\p{L}\p{N}])/gui, 'KT');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Vận Tải)(?![\p{L}\p{N}])/gui, 'VT');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])(?:Công Nghệ)(?![\p{L}\p{N}])/gui, 'CN');

  // Viết gọn chi nhánh
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Chi Nhánh\s+(?:Tỉnh|Thành phố|Tp\.?)\s+/gui, ' - CN ');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Chi Nhánh(?![\p{L}\p{N}])/gui, ' - CN');
  tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])CN\s+(?:Tỉnh|Thành phố|Tp\.?)\s+/gui, ' - CN ');

  // Chuẩn hóa khoảng trắng & dấu gạch nối
  tenNgayNgan = tenNgayNgan.replace(/\s+/g, ' ');
  tenNgayNgan = tenNgayNgan.replace(/\s*-\s*/g, ' - ');
  tenNgayNgan = tenNgayNgan.replace(/^-\s*/, '').trim();

  // Đổi sang proper case
  tenNgayNgan = normalizeBusinessName(tenNgayNgan).trim();

  // 4. ĐẢM BẢO TÊN KHÁCH HÀNG / PHÁP NHÂN DƯỚI 30 KÝ TỰ (< 30 ký tự, max 29)
  if (tenNgayNgan.length > 29) {
    // Nếu vẫn quá dài, rút gọn thêm các từ đơn lẻ
    tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Thương Mại(?![\p{L}\p{N}])/gui, 'TM');
    tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Dịch Vụ(?![\p{L}\p{N}])/gui, 'DV');
    tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Đầu Tư(?![\p{L}\p{N}])/gui, 'ĐT');
    tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Sản Xuất(?![\p{L}\p{N}])/gui, 'SX');
    tenNgayNgan = tenNgayNgan.replace(/(?<![\p{L}\p{N}])Xây Dựng(?![\p{L}\p{N}])/gui, 'XD');
    tenNgayNgan = tenNgayNgan.replace(/\s+/g, ' ').trim();
  }

  // Nếu vẫn vượt quá 29 ký tự, cắt thông minh tại ranh giới từ (word boundary)
  if (tenNgayNgan.length > 29) {
    const truncated = tenNgayNgan.slice(0, 29);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > 12) {
      tenNgayNgan = truncated.slice(0, lastSpace).trim();
    } else {
      tenNgayNgan = truncated.trim();
    }
  }

  return { loaiHinh, tenNgayNgan };
}

export function parseVietQRBusinessData(business: any, provinces: string[]): {
  loaiHinhDoanhNghiep: string;
  tenKhachHang: string;
  diaChi: string;
  tinhThanh: string;
} {
  const { loaiHinh: loaiHinhDoanhNghiep, tenNgayNgan } = autoDetectBusinessName(business.name || '');
  const tenKhachHang = tenNgayNgan || normalizeBusinessName(business.name || '');

  const diaChi = cleanProperVietnameseText(business.address || '');
  let tinhThanh = '';
  const detectedProvince = provinces.find((prov) => {
    const cleanProv = prov.toLowerCase()
      .replace(/thành phố|thành phó|tỉnh|tinh|tp\.?|tp\s+/gi, '')
      .trim();
    return cleanProv.length >= 2 && diaChi.toLowerCase().includes(cleanProv);
  });
  if (detectedProvince) {
    tinhThanh = detectedProvince;
  }

  return { loaiHinhDoanhNghiep, tenKhachHang, diaChi, tinhThanh };
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
