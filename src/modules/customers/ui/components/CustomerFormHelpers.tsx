import { Customer } from '@/src/domain/schema/customer.schema';
import { cleanProperVietnameseText, normalizeBusinessName, normalizePersonName, normalizeCode, squeezeSpaces } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';

export const BUSINESS_TYPE_PREFIXES = [
  'CÔNG TY CỔ PHẦN', 'CÔNG TY TNHH MỘT THÀNH VIÊN', 'CÔNG TY TNHH MTV', 'CÔNG TY TNHH 1 THÀNH VIÊN', 'CÔNG TY TNHH',
  'CÔNG TY TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN', 'CÔNG TY TRÁCH NHIỆM HỮU HẠN MTV', 'CÔNG TY TRÁCH NHIỆM HỮU HẠN',
  'CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ', 'CÔNG TY TRÁCH NHIỆM HỮU HẠN THƯƠNG MẠI VÀ DỊCH VỤ',
  'CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ DỊCH VỤ', 'CÔNG TY TNHH TM VÀ DV', 'CÔNG TY TNHH TM & DV',
  'CÔNG TY CP TM & DV', 'CÔNG TY CP TM VÀ DV', 'CTY TNHH', 'CTY CP', 'CTCP', 'CÔNG TY CP',
  'TẬP ĐOÀN ĐẦU TƯ', 'TẬP ĐOÀN', 'TỔNG CÔNG TY', 'CÔNG TY HỢP DANH', 'DOANH NGHIỆP TƯ NHÂN', 'DNTN',
  'CÔNG TY SẢN XUẤT THƯƠNG MẠI DỊCH VỤ', 'CÔNG TY SẢN XUẤT THƯƠNG MẠI', 'CÔNG TY THƯƠNG MẠI DỊCH VỤ',
  'CÔNG TY SẢN XUẤT', 'CÔNG TY THƯƠNG MẠI', 'CÔNG TY DỊCH VỤ', 'CÔNG TY KỸ THUẬT', 'CÔNG TY CƠ KHÍ',
  'CÔNG TY ĐẦU TƯ XÂY DỰNG', 'CÔNG TY ĐẦU TƯ PHÁT TRIỂN', 'CÔNG TY XÂY DỰNG', 'CÔNG TY ĐẦU TƯ',
  'CÔNG TY XUẤT NHẬP KHẨU', 'CÔNG TY LOGISTICS', 'CÔNG TY', 'LIÊN HIỆP HỢP TÁC XÃ', 'HỢP TÁC XÃ', 'HTX',
  'QUỸ TÍN DỤNG NHÂN DÂN', 'VĂN PHÒNG ĐẠI DIỆN', 'ĐỊA ĐIỂM KINH DOANH', 'CHI NHÁNH',
  'NHÀ MÁY', 'XƯỞNG', 'XÍ NGHIỆP', 'TRUNG TÂM', 'CỬA HÀNG', 'ĐẠI LÝ', 'NHÀ PHÂN PHỐI',
  'HỘ KINH DOANH', 'CƠ SỞ SẢN XUẤT', 'CƠ SỞ KINH DOANH'
];

export function autoDetectBusinessName(rawName: string): { loaiHinh: string; tenNgayNgan: string } {
  let cln = cleanProperVietnameseText(rawName || '');
  let loaiHinh = '';
  
  // Try to match the longest prefix first
  for (const prefix of BUSINESS_TYPE_PREFIXES) {
    const rx = new RegExp(`^${prefix}\\s+(.*)`, 'i');
    const match = cln.match(rx);
    if (match) {
      loaiHinh = prefix;
      cln = match[1];
      break;
    }
  }

  // Optimize typical words
  let tenNgayNgan = cln.trim();
  tenNgayNgan = tenNgayNgan.replace(/(?:\b|-)Chi Nhánh Tỉnh\b/gi, ' - CN');
  tenNgayNgan = tenNgayNgan.replace(/(?:\b|-)Chi Nhánh Thành phố\b/gi, ' - CN');
  tenNgayNgan = tenNgayNgan.replace(/(?:\b|-)Chi Nhánh Tp\b/gi, ' - CN');
  tenNgayNgan = tenNgayNgan.replace(/(?:\b|-)Chi Nhánh\b/gi, ' - CN');
  tenNgayNgan = tenNgayNgan.replace(/(?:\b|-)CN Tỉnh\b/gi, ' - CN');
  tenNgayNgan = tenNgayNgan.replace(/(?:\b|-)CN Thành phố\b/gi, ' - CN');
  
  // Normalize double spaces or "- -"
  tenNgayNgan = tenNgayNgan.replace(/\s+/g, ' ');
  tenNgayNgan = tenNgayNgan.replace(/-\s*-/g, '-');
  tenNgayNgan = tenNgayNgan.replace(/\s*-\s*-/g, ' - ');
  tenNgayNgan = tenNgayNgan.replace(/-\s*CN/g, '- CN');
  
  return { loaiHinh, tenNgayNgan: normalizeBusinessName(tenNgayNgan).trim() };
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
      .replace(/thành phố|thành phó|tỉnh|tinh/gi, '')
      .trim();
    return diaChi.toLowerCase().includes(cleanProv);
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
  normalized.loaiHinhDoanhNghiep = cleanProperVietnameseText(normalized.loaiHinhDoanhNghiep).toUpperCase();
  normalized.tenKhachHang = normalizeBusinessName(normalized.tenKhachHang);
  normalized.diaChi = cleanProperVietnameseText(normalized.diaChi);
  normalized.tinhThanh = cleanProperVietnameseText(normalized.tinhThanh);
  normalized.nguoiDaiDien = normalizePersonName(normalized.nguoiDaiDien);
  normalized.chiNhanh = cleanProperVietnameseText(normalized.chiNhanh);
  normalized.sdt = normalizePhoneVN(normalized.sdt as any) || normalized.sdt;
  
  if (Array.isArray(normalized.contacts)) {
    normalized.contacts = normalized.contacts.map((c: import('@/src/domain/schema/customer.schema').ContactItem) => {
      const nc: any = {};
      for (const key of Object.keys(c)) {
        nc[key] = trimStr((c as any)[key]);
      }
      nc.nguoiDaiDien = normalizePersonName(nc.nguoiDaiDien);
      nc.chiNhanh = cleanProperVietnameseText(nc.chiNhanh);
      nc.chucVu = cleanProperVietnameseText(nc.chucVu);
      nc.sdt = normalizePhoneVN(nc.sdt) || nc.sdt;
      return nc;
    });

    // Map root sdt and nguoiDaiDien from primary contact to prevent missing fields in ZNS payload
    if (normalized.contacts.length > 0) {
      const primaryContact = normalized.contacts[0];
      normalized.sdt = primaryContact.sdt || '';
      normalized.nguoiDaiDien = primaryContact.nguoiDaiDien || '';
    }
  }

  return normalized as Customer;
}
