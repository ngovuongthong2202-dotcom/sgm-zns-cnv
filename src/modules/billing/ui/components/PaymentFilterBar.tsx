import React from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

interface PaymentFilterBarProps {
  nguoiPhuTrachList: string[];
  tinhThanhList: string[];
  tinhTrangThanhToanList?: string[];
  selectedTinhTrangThanhToan: string;
  setSelectedTinhTrangThanhToan: (val: string) => void;
  selectedPhanLoai: string;
  setSelectedPhanLoai: (val: string) => void;
  selectedTinhThanh: string;
  setSelectedTinhThanh: (val: string) => void;
  selectedZns: string;
  setSelectedZns: (val: string) => void;
  selectedNguoiPhuTrach: string;
  setSelectedNguoiPhuTrach: (val: string) => void;
  selectedDateRange: [string, string];
  setSelectedDateRange: (range: [string, string]) => void;
}

export function PaymentFilterBar({
  nguoiPhuTrachList,
  tinhThanhList,
  tinhTrangThanhToanList,
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
  setSelectedDateRange,
}: PaymentFilterBarProps) {
  const statusOptions = (tinhTrangThanhToanList && tinhTrangThanhToanList.length > 0)
    ? tinhTrangThanhToanList.map(t => ({ value: t, label: t }))
    : [
        { value: 'Tất toán', label: 'Tất toán' },
        { value: 'Tạm ứng', label: 'Tạm ứng' },
        { value: 'Công nợ', label: 'Công nợ' },
        { value: 'Chưa TT', label: 'Chưa TT' },
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
        options={[
          { value: 'MÁY', label: 'Bán Máy' },
          { value: 'VẬT TƯ', label: 'Vật tư' },
          { value: 'DỊCH VỤ', label: 'Dịch vụ' },
          { value: 'KHÁC', label: 'Khác' },
        ]}
        selectedValues={selectedPhanLoai ? [selectedPhanLoai] : []}
        onChange={(vals) => setSelectedPhanLoai(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Tỉnh/Thành"
        options={tinhThanhList.map(t => ({ value: t, label: t }))}
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
