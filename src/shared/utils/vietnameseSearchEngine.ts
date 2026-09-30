/**
 * UNIVERSAL ENTERPRISE SEARCH TOKENIZER & MATCHER
 * Động cơ tìm kiếm thông minh đa năng cho toàn bộ hệ sinh thái SGM OS:
 * 1. Tiếng Việt không dấu (NFD normalization + đ/Đ -> d/D)
 * 2. Mã số thuế (MST) không phụ thuộc dấu gạch nối, khoảng trắng
 * 3. Số điện thoại mờ (Fuzzy Digits Matching: bất chấp khoảng trắng, dấu chấm, dấu gạch chéo)
 * 4. Hỗ trợ đa trường (Direct fields, Contacts, Products, Machine codes)
 */

export function normalizeVietnameseSearch(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export function extractDigits(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(/\D/g, '');
}

export function cleanTaxCode(tax: string | null | undefined): string {
  if (!tax) return '';
  return String(tax).replace(/[\s\-_.]/g, '').toUpperCase();
}

export interface EnterpriseSearchTarget {
  maSoThue?: string | null;
  taxCode?: string | null;
  sdt?: string | null;
  phone?: string | null;
  soDienThoai?: string | null;
  tenKhachHang?: string | null;
  nguoiDaiDien?: string | null;
  nguoiPhuTrach?: string | null;
  maKh?: string | null;
  diaChi?: string | null;
  diaChiGiaoHang?: string | null;
  tinhThanh?: string | null;
  contacts?: Array<{
    nguoiDaiDien?: string | null;
    sdt?: string | null;
    phone?: string | null;
    chucVu?: string | null;
    email?: string | null;
  } | null> | null;
  [key: string]: any;
}

/**
 * Kiểm tra xem một thực thể hoặc đối tượng bất kỳ có khớp với từ khóa tìm kiếm hay không.
 */
export function matchesEnterpriseSearch(
  target: EnterpriseSearchTarget | null | undefined,
  rawQuery: string | null | undefined
): boolean {
  if (!target || typeof target !== 'object') return false;
  if (!rawQuery || !rawQuery.trim()) return true;

  const queryTrimmed = rawQuery.trim();
  const normalizedQuery = normalizeVietnameseSearch(queryTrimmed);
  const queryDigits = extractDigits(queryTrimmed);
  const queryTaxClean = cleanTaxCode(queryTrimmed);

  // 1. Kiểm tra Mã số thuế (MST / Tax Code)
  const targetTax = cleanTaxCode(target.maSoThue || target.taxCode || (target as any).tax_code);
  if (targetTax) {
    if (queryTaxClean && queryTaxClean.length >= 3 && targetTax.includes(queryTaxClean)) {
      return true;
    }
    if (normalizedQuery && normalizeVietnameseSearch(targetTax).includes(normalizedQuery)) {
      return true;
    }
  }

  // 2. Kiểm tra Số điện thoại (Fuzzy Digits Match)
  const targetPhones = [
    target.sdt,
    target.phone,
    target.soDienThoai,
    (target as any).sdtThoGiaoMay,
    (target as any).sdtBan,
    (target as any).so_dien_thoai
  ].filter(Boolean);

  for (const ph of targetPhones) {
    const phDigits = extractDigits(ph);
    if (queryDigits && queryDigits.length >= 3 && phDigits.includes(queryDigits)) {
      return true;
    }
    if (normalizedQuery && normalizeVietnameseSearch(String(ph)).includes(normalizedQuery)) {
      return true;
    }
  }

  // 3. Kiểm tra danh bạ liên hệ lồng ghép (embedded contacts)
  if (Array.isArray(target.contacts)) {
    for (const ct of target.contacts) {
      if (!ct) continue;
      // Khớp tên liên hệ
      if (ct.nguoiDaiDien && normalizeVietnameseSearch(ct.nguoiDaiDien).includes(normalizedQuery)) {
        return true;
      }
      // Khớp chức vụ
      if (ct.chucVu && normalizeVietnameseSearch(ct.chucVu).includes(normalizedQuery)) {
        return true;
      }
      // Khớp email
      if (ct.email && normalizeVietnameseSearch(ct.email).includes(normalizedQuery)) {
        return true;
      }
      // Khớp SĐT liên hệ
      const ctPhone = ct.sdt || ct.phone;
      if (ctPhone) {
        const ctDigits = extractDigits(ctPhone);
        if (queryDigits && queryDigits.length >= 3 && ctDigits.includes(queryDigits)) {
          return true;
        }
        if (normalizedQuery && normalizeVietnameseSearch(String(ctPhone)).includes(normalizedQuery)) {
          return true;
        }
      }
    }
  }

  // 4. Kiểm tra các trường văn bản cốt lõi
  const directTextFields = [
    target.tenKhachHang,
    target.nguoiDaiDien,
    target.nguoiPhuTrach,
    target.maKh,
    target.diaChi,
    target.diaChiGiaoHang,
    target.tinhThanh,
    (target as any).soPhieuBaoGia,
    (target as any).soBaoGia,
    (target as any).soHopDong,
    (target as any).soPhieuThu,
    (target as any).maPhieuThu,
    (target as any).soPhieuGiao,
    (target as any).maGiaoHang,
    (target as any).maDonHang,
    (target as any).noiDung,
    (target as any).ghiChu,
    (target as any).nhuCauKhachHang
  ];

  for (const field of directTextFields) {
    if (field && normalizeVietnameseSearch(String(field)).includes(normalizedQuery)) {
      return true;
    }
  }

  // 5. Kiểm tra danh sách sản phẩm / vật tư / mã máy
  const productLists = [
    (target as any).products,
    (target as any).items,
    (target as any).danhSachSanPham,
    (target as any).hangMuc
  ];

  for (const list of productLists) {
    if (Array.isArray(list)) {
      for (const item of list) {
        if (!item) continue;
        if (typeof item === 'string') {
          if (normalizeVietnameseSearch(item).includes(normalizedQuery)) return true;
          continue;
        }
        if (item.productName && normalizeVietnameseSearch(String(item.productName)).includes(normalizedQuery)) return true;
        if (item.tenSanPham && normalizeVietnameseSearch(String(item.tenSanPham)).includes(normalizedQuery)) return true;
        if (item.productId && normalizeVietnameseSearch(String(item.productId)).includes(normalizedQuery)) return true;
        if (item.model && normalizeVietnameseSearch(String(item.model)).includes(normalizedQuery)) return true;
        if (item.sku && normalizeVietnameseSearch(String(item.sku)).includes(normalizedQuery)) return true;
        if (item.serial && normalizeVietnameseSearch(String(item.serial)).includes(normalizedQuery)) return true;
        if (Array.isArray(item.danhSachMaMay)) {
          for (const mm of item.danhSachMaMay) {
            if (mm && normalizeVietnameseSearch(String(mm)).includes(normalizedQuery)) return true;
          }
        }
      }
    }
  }

  // 6. Kiểm tra mã máy cấp gốc (danhSachMaMay)
  if (Array.isArray((target as any).danhSachMaMay)) {
    for (const mm of (target as any).danhSachMaMay) {
      if (mm && normalizeVietnameseSearch(String(mm)).includes(normalizedQuery)) return true;
    }
  }

  return false;
}
