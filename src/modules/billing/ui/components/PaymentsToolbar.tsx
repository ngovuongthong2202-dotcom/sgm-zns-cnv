import { Customer } from '@/src/domain/schema/customer.schema';
import React, { useMemo } from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

export interface PaymentsFiltersProps {
  customers: Customer[];
  nguoiPhuTrachList: string[];
  tinhTrangThanhToanList?: string[];
  loaiBaoGiaList?: string[];
  selectedTinhTrangThanhToan: string;
  setSelectedTinhTrangThanhToan: (v: string) => void;
  selectedPhanLoai: string;
  setSelectedPhanLoai: (v: string) => void;
  selectedTinhThanh: string;
  setSelectedTinhThanh: (v: string) => void;
  selectedZns: string;
  setSelectedZns: (v: string) => void;
  selectedNguoiPhuTrach: string;
  setSelectedNguoiPhuTrach: (v: string) => void;
  selectedDateRange: [string, string];
  setSelectedDateRange: (v: [string, string]) => void;
}

export function PaymentsToolbar({
  customers,
  nguoiPhuTrachList,
  tinhTrangThanhToanList,
  loaiBaoGiaList,
  selectedTinhTrangThanhToan,
  setSelectedTinhTrangThanhToan,
  selectedPhanLoai,
  setSelectedPhanLoai,
  selectedTinhThanh,
  setSelectedTinhThanh,
  selectedZns,
  setSelectedZns,
  selectedNguoiPhuTrach,
  setSelectedNguoiPhuTrach,
  selectedDateRange,
  setSelectedDateRange
}: PaymentsFiltersProps) {
  const tinhThanhOptions = useMemo(() => {
    return Array.from(new Set(customers.map(c => c.tinhThanh).filter(Boolean))).sort().map(t => ({ value: t!, label: t! }));
  }, [customers]);

  const statusOptions = (tinhTrangThanhToanList && tinhTrangThanhToanList.length > 0)
    ? tinhTrangThanhToanList.map(t => ({ value: t, label: t }))
    : [
        { value: 'Tất toán', label: 'Tất toán' },
        { value: 'Công nợ', label: 'Công nợ' },
        { value: 'Chưa TT', label: 'Chưa TT' },
        { value: 'ĐÃ THANH TOÁN', label: 'ĐÃ THANH TOÁN' }
      ];

  const phanLoaiOptions = (loaiBaoGiaList && loaiBaoGiaList.length > 0)
    ? loaiBaoGiaList.map(l => ({ value: l, label: l }))
    : [
        { value: 'MÁY', label: 'Báo Giá MÁY' },
        { value: 'VẬT TƯ', label: 'Báo Giá VẬT TƯ' },
        { value: 'DỊCH VỤ', label: 'Báo Giá DỊCH VỤ' }
      ];

  return (
    <React.Fragment>
      <FilterDropdown
        label="Tình trạng"
        options={statusOptions}
        selectedValues={selectedTinhTrangThanhToan ? [selectedTinhTrangThanhToan] : []}
        onChange={(vals) => setSelectedTinhTrangThanhToan(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Phân loại"
        options={phanLoaiOptions}
        selectedValues={selectedPhanLoai ? [selectedPhanLoai] : []}
        onChange={(vals) => setSelectedPhanLoai(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Tỉnh/Thành"
        options={tinhThanhOptions}
        selectedValues={selectedTinhThanh ? [selectedTinhThanh] : []}
        onChange={(vals) => setSelectedTinhThanh(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="ZNS"
        options={[
          { value: EntityZnsStatus.THANH_CONG, label: 'Thành công' },
          { value: EntityZnsStatus.THAT_BAI, label: 'Thất bại' },
          { value: EntityZnsStatus.CHUA_GUI, label: 'Chưa gửi' },
        ]}
        selectedValues={selectedZns ? [selectedZns] : []}
        onChange={(vals) => setSelectedZns(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Phụ trách"
        options={nguoiPhuTrachList.map(v => ({ value: v, label: v }))}
        selectedValues={selectedNguoiPhuTrach ? [selectedNguoiPhuTrach] : []}
        onChange={(vals) => setSelectedNguoiPhuTrach(vals[0] || '')}
        isMulti={false}
      />
      <DateRangePopover
        label="Ngày thanh toán"
        startDate={selectedDateRange[0]}
        endDate={selectedDateRange[1]}
        onChange={(start, end) => setSelectedDateRange([start, end])}
      />
    </React.Fragment>
  );
}
