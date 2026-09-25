import { Customer } from '@/src/domain/schema/customer.schema';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';

export interface FilterParams {
  customers: Customer[];
  selectedLoaiKh: string;
  selectedNguoiPhuTrach: string;
  selectedZnsStatus: string;
  selectedTinhThanh: string;
  debouncedFilter: string;
  selectedCreatedDateRange?: [string, string];
}

export function filterCustomersList({
  customers,
  selectedLoaiKh,
  selectedNguoiPhuTrach,
  selectedZnsStatus,
  selectedTinhThanh,
  debouncedFilter,
  selectedCreatedDateRange
}: FilterParams): Customer[] {
  let result = customers;

  // 1. Filter by Loại KH
  if (selectedLoaiKh) {
    const target = selectedLoaiKh.trim().toLowerCase();
    result = result.filter(c => (c.loaiKh || '').trim().toLowerCase() === target);
  }

  // 2. Filter by Người phụ trách
  if (selectedNguoiPhuTrach) {
    const target = selectedNguoiPhuTrach.trim().toLowerCase();
    result = result.filter(c => (c.nguoiPhuTrach || '').trim().toLowerCase() === target);
  }

  // 3. Filter by Trạng thái ZNS
  if (selectedZnsStatus) {
    let target = selectedZnsStatus;
    if (selectedZnsStatus === 'THANH_CONG') target = EntityZnsStatus.THANH_CONG;
    else if (selectedZnsStatus === 'THAT_BAI') target = EntityZnsStatus.THAT_BAI;
    else if (selectedZnsStatus === 'CHUA_GUI') target = EntityZnsStatus.CHUA_GUI;
    else if (selectedZnsStatus === 'DANG_GUI') target = EntityZnsStatus.DANG_DAY;

    result = result.filter(c => {
      const norm = normalizeLegacyStatus(c.trangThaiGuiTinQuangCao);
      return norm === target || norm === selectedZnsStatus;
    });
  }

  // 4. Filter by Tỉnh/Thành
  if (selectedTinhThanh) {
    result = result.filter(c => c.tinhThanh === selectedTinhThanh);
  }

  // 4.1 Filter by created date range
  if (selectedCreatedDateRange && (selectedCreatedDateRange[0] || selectedCreatedDateRange[1])) {
    const [start, end] = selectedCreatedDateRange;
    result = result.filter(c => {
      const dateStr = c.ngayTao ? String(c.ngayTao).substring(0, 10) : '';
      if (!dateStr) return false;
      if (start && dateStr < start) return false;
      if (end && dateStr > end) return false;
      return true;
    });
  }

  // 5. Filter by fuzzy search (diacritic and case insensitive)
  const query = debouncedFilter.trim();
  if (!query) {
    return result;
  }

  const normalize = (str: string) => 
    String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

  const normalizedQuery = normalize(query);

  return result.filter(c => {
    if (c.tenKhachHang && normalize(c.tenKhachHang).includes(normalizedQuery)) return true;
    if (c.nguoiDaiDien && normalize(c.nguoiDaiDien).includes(normalizedQuery)) return true;
    if (c.maKh && normalize(c.maKh).includes(normalizedQuery)) return true;
    if (c.sdt && String(c.sdt).includes(normalizedQuery)) return true;
    if (c.nguoiPhuTrach && normalize(c.nguoiPhuTrach).includes(normalizedQuery)) return true;

    // Check contacts array
    if (Array.isArray(c.contacts)) {
      for (const contact of c.contacts) {
        if (contact) {
          if (contact.nguoiDaiDien && normalize(contact.nguoiDaiDien).includes(normalizedQuery)) return true;
          if (contact.sdt && String(contact.sdt).includes(normalizedQuery)) return true;
        }
      }
    }

    return false;
  });
}
