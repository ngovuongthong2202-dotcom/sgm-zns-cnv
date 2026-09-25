import { describe, it, expect } from 'vitest';
import {
  STANDARDIZED_BUSINESS_TYPES,
  autoDetectBusinessName,
  parseVietQRBusinessData,
  normalizeCustomerFormValues,
} from './CustomerFormHelpers';

describe('CustomerFormHelpers - Business Type Standardization & Smart Extraction', () => {
  it('contains legal Vietnamese standardized enterprise types without redundant industry duplicates', () => {
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('CÔNG TY CỔ PHẦN');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('CÔNG TY TNHH MỘT THÀNH VIÊN');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('CÔNG TY TNHH HAI THÀNH VIÊN TRỞ LÊN');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('CÔNG TY TNHH');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('DOANH NGHIỆP TƯ NHÂN');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('HỘ KINH DOANH');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('HỢP TÁC XÃ / LIÊN HIỆP HTX');
    expect(STANDARDIZED_BUSINESS_TYPES).toContain('CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN');

    // Không còn chứa các cụm ngành nghề lộn xộn trong danh sách loại hình
    expect(STANDARDIZED_BUSINESS_TYPES).not.toContain('CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ');
    expect(STANDARDIZED_BUSINESS_TYPES).not.toContain('CÔNG TY CỔ PHẦN THƯƠNG MẠI VÀ DỊCH VỤ');
    expect(STANDARDIZED_BUSINESS_TYPES).not.toContain('CÔNG TY TNHH TM VÀ DV');
    expect(STANDARDIZED_BUSINESS_TYPES).not.toContain('CÔNG TY CP TM & DV');
  });

  it('correctly extracts business type and clean short name from realistic MST raw company name', () => {
    const raw = 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI TÔN LONG PHÁT';
    const result = autoDetectBusinessName(raw);

    expect(result.loaiHinh).toBe('CÔNG TY TNHH MỘT THÀNH VIÊN');
    expect(result.tenNgayNgan).toBe('Thương Mại Tôn Long Phát');
    expect(result.tenNgayNgan.length).toBeLessThan(30);
  });

  it('normalizes common abbreviation variants to standard legal business types', () => {
    // TNHH MTV variants
    expect(autoDetectBusinessName('CÔNG TY TNHH MTV Á CHÂU').loaiHinh).toBe('CÔNG TY TNHH MỘT THÀNH VIÊN');
    expect(autoDetectBusinessName('CTY TNHH 1 THÀNH VIÊN TOÀN CẦU').loaiHinh).toBe('CÔNG TY TNHH MỘT THÀNH VIÊN');
    expect(autoDetectBusinessName('CÔNG TY TRÁCH NHIỆM HỮU HẠN MỘT THÀNH VIÊN MINH KHANG').loaiHinh).toBe('CÔNG TY TNHH MỘT THÀNH VIÊN');

    // Cổ phần variants
    expect(autoDetectBusinessName('CÔNG TY CP TẬP ĐOÀN HOA SEN').loaiHinh).toBe('CÔNG TY CỔ PHẦN');
    expect(autoDetectBusinessName('CTCP ĐẦU TƯ NAM LONG').loaiHinh).toBe('CÔNG TY CỔ PHẦN');
    expect(autoDetectBusinessName('CÔNG TY CỔ PHẦN VINAMILK').loaiHinh).toBe('CÔNG TY CỔ PHẦN');

    // DNTN & Hộ kinh doanh
    expect(autoDetectBusinessName('DNTN VÀNG BẠC KIM CƯƠNG').loaiHinh).toBe('DOANH NGHIỆP TƯ NHÂN');
    expect(autoDetectBusinessName('HỘ KINH DOANH NGUYỄN VĂN A').loaiHinh).toBe('HỘ KINH DOANH');

    // Chi nhánh
    expect(autoDetectBusinessName('CHI NHÁNH CÔNG TY ABC TẠI HÀ NỘI').loaiHinh).toBe('CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN');
  });

  it('strictly guarantees company name is under 30 characters (< 30) for very long names', () => {
    const veryLongName = 'CÔNG TY CỔ PHẦN SẢN XUẤT THƯƠNG MẠI VÀ DỊCH VỤ CƠ KHÍ CHẾ TẠO MÁY CÔNG NGHIỆP TOÀN CẦU VIỆT NAM';
    const result = autoDetectBusinessName(veryLongName);

    expect(result.loaiHinh).toBe('CÔNG TY CỔ PHẦN');
    expect(result.tenNgayNgan.length).toBeLessThan(30);
    // Tên không bị cắt lửng giữa từ nếu có thể
    expect(result.tenNgayNgan).not.toMatch(/\s$/);
  });

  it('intelligently abbreviates commercial phrases (TM&DV, SX-TM, ĐT-XD)', () => {
    const raw = 'CÔNG TY TNHH THƯƠNG MẠI VÀ DỊCH VỤ AN PHÁT';
    const result = autoDetectBusinessName(raw);

    expect(result.loaiHinh).toBe('CÔNG TY TNHH');
    expect(result.tenNgayNgan).toBe('TM&DV An Phát');
    expect(result.tenNgayNgan.length).toBeLessThan(30);
  });

  it('parses VietQR business data properly and detects province', () => {
    const vietQrData = {
      name: 'CÔNG TY TNHH MỘT THÀNH VIÊN THƯƠNG MẠI TÔN LONG PHÁT',
      address: 'Số 96 Nguyễn Văn Linh, Phường Trương Quang Trọng, Quảng Ngãi'
    };
    const provinces = ['Hà Nội', 'TP. Hồ Chí Minh', 'Quảng Ngãi', 'Đà Nẵng'];
    const result = parseVietQRBusinessData(vietQrData, provinces);

    expect(result.loaiHinhDoanhNghiep).toBe('CÔNG TY TNHH MỘT THÀNH VIÊN');
    expect(result.tenKhachHang).toBe('Thương Mại Tôn Long Phát');
    expect(result.tinhThanh).toBe('Quảng Ngãi');
    expect(result.tenKhachHang.length).toBeLessThan(30);
  });
});

describe('CustomerFormHelpers - normalizeCustomerFormValues', () => {
  it('should preserve all field and not lose any data properties', () => {
    const mockCustomer: any = {
      id: 'mock-id-123',
      maKh: 'KH001 ',
      tenKhachHang: 'Công ty  tnhh  abc  ',
      loaiHinhDoanhNghiep: 'CÔNG TY TNHH',
      tinhThanh: 'Hà Nội',
      diaChi: '123 Phố abc',
      sdt: '0987654321 ',
      nguoiDaiDien: 'nguyễn văn a',
      nguoiPhuTrach: 'nhân viên 1',
      maSoThue: ' 0102030405 ',
      
      loaiKh: 'VIP',
      contacts: [
        {
          nguoiDaiDien: 'nguyễn văn b',
          sdt: '0123456789',
          chiNhanh: 'chi nhánh  1',
          chucVu: 'giám đốc'
        }
      ],
      tags: ['tag1', 'tag2'],
      chiNhanh: 'chi nhánh chính',
      systemMetadata: { created: '123', specialFlag: true }
    };

    const normalized = normalizeCustomerFormValues(mockCustomer);

    // It should squeeze spaces and uppercase properly
    expect(normalized.maKh).toBe('KH001');
    expect(normalized.tenKhachHang).toBe('Công Ty TNHH Abc');
    expect(normalized.sdt).toBe('0123456789'); // Inherits from primary contact
    expect(normalized.nguoiDaiDien).toBe('Nguyễn Văn B'); // Inherits from primary contact
    
    // It should preserve id and systemMetadata
    expect(normalized.id).toBe('mock-id-123');
    expect((normalized as any).systemMetadata).toEqual({ created: '123', specialFlag: true });
    
    // Original properties from nested objects
    expect(normalized.contacts[0].nguoiDaiDien).toBe('Nguyễn Văn B');
    expect(normalized.contacts[0].chiNhanh).toBe('Chi Nhánh 1');
    expect(normalized.contacts[0].chucVu).toBe('Giám Đốc');
  });
});
