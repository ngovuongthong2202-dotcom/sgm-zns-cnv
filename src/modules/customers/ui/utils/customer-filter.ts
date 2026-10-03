import { Customer } from '@/src/domain/schema/customer.schema';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { isZnsSuccessStatus } from '@/src/domain/zns-client';
import { matchesEnterpriseSearch } from '@/src/shared/utils/vietnameseSearchEngine';

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
  // 0. Exclude archived or merged customer records so only active consolidated records are shown
  let result = customers.filter(c => !c.isArchived && !c.mergedInto && !(c as any).is_archived && !(c as any).merged_into && !c.tenKhachHang?.startsWith('[ĐÃ GỘP VÀO'));

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
    if (selectedZnsStatus === 'THANH_CONG' || selectedZnsStatus === EntityZnsStatus.THANH_CONG) {
      result = result.filter(c => 
        isZnsSuccessStatus(c.trangThaiGuiTinQuangCao) || 
        isZnsSuccessStatus((c as any).trangThaiZns) || 
        Boolean((c as any).contactsZnsHistory && Object.values((c as any).contactsZnsHistory).some((h: any) => isZnsSuccessStatus(typeof h === 'object' ? h?.status : h)))
      );
    } else if (selectedZnsStatus === 'THAT_BAI' || selectedZnsStatus === EntityZnsStatus.THAT_BAI) {
      result = result.filter(c => {
        const norm = normalizeLegacyStatus(c.trangThaiGuiTinQuangCao);
        return norm === EntityZnsStatus.THAT_BAI || norm === EntityZnsStatus.VUOT_HAN_MUC;
      });
    } else if (selectedZnsStatus === 'CHUA_GUI' || selectedZnsStatus === EntityZnsStatus.CHUA_GUI) {
      result = result.filter(c => {
        const hasSuccess = isZnsSuccessStatus(c.trangThaiGuiTinQuangCao) || isZnsSuccessStatus((c as any).trangThaiZns) || 
          Boolean((c as any).contactsZnsHistory && Object.values((c as any).contactsZnsHistory).some((h: any) => isZnsSuccessStatus(typeof h === 'object' ? h?.status : h)));
        return !hasSuccess && (normalizeLegacyStatus(c.trangThaiGuiTinQuangCao) === EntityZnsStatus.CHUA_GUI || !c.trangThaiGuiTinQuangCao);
      });
    } else {
      result = result.filter(c => {
        const norm = normalizeLegacyStatus(c.trangThaiGuiTinQuangCao);
        return norm === selectedZnsStatus;
      });
    }
  }

  // 4. Filter by Tỉnh/Thành
  if (selectedTinhThanh) {
    const target = selectedTinhThanh.toLowerCase().trim();
    result = result.filter(c => {
      const prov = (c.tinhThanh || '').toLowerCase().trim();
      return prov === target || prov.includes(target);
    });
  }

  // 4.1 Filter by created date range
  if (selectedCreatedDateRange && (selectedCreatedDateRange[0] || selectedCreatedDateRange[1])) {
    const [start, end] = selectedCreatedDateRange;
    result = result.filter(c => {
      const rawDate = c.ngayTao || (c as any).createdAt || '';
      const dateStr = rawDate ? String(rawDate).substring(0, 10) : '';
      if (!dateStr) return false;
      if (start && dateStr < start) return false;
      if (end && dateStr > end) return false;
      return true;
    });
  }

  // 5. Filter by Universal Enterprise Search (MST, SĐT mờ, Tiếng Việt không dấu, danh bạ)
  const query = debouncedFilter.trim();
  if (!query) {
    return result;
  }

  return result.filter(c => matchesEnterpriseSearch(c, query));
}
