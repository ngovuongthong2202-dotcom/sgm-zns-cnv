import React from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

interface QuotationFilterBarProps {
  nguoiPhuTrachList: string[];
  tinhThanhList: string[];
  selectedZns: string;
  setSelectedZns: (val: string) => void;
  selectedNguoiPhuTrach: string;
  setSelectedNguoiPhuTrach: (val: string) => void;
  selectedTinhThanh: string;
  setSelectedTinhThanh: (val: string) => void;
  selectedTienDo: string;
  setSelectedTienDo: (val: string) => void;
  selectedHieuLuc: string;
  setSelectedHieuLuc: (val: string) => void;
  selectedDateRange: [string, string];
  setSelectedDateRange: (range: [string, string]) => void;
}

export const hieuLucOptions = [
  { value: 'CON_HIEU_LUC', label: 'Còn hiệu lực' },
  { value: 'HET_HAN', label: 'Hết hiệu lực' }
];

export const tienDoOptions = [
  { value: 'CO_HOP_DONG', label: 'Có Hợp đồng' },
  { value: 'DA_THANH_TOAN', label: 'Đã Thanh toán' },
  { value: 'DA_GIAO_HANG', label: 'Đã Giao hàng' }
];

export function QuotationFilterBar({
  nguoiPhuTrachList,
  tinhThanhList,
  selectedZns,
  setSelectedZns,
  selectedNguoiPhuTrach,
  setSelectedNguoiPhuTrach,
  selectedTinhThanh,
  setSelectedTinhThanh,
  selectedTienDo,
  setSelectedTienDo,
  selectedHieuLuc,
  setSelectedHieuLuc,
  selectedDateRange,
  setSelectedDateRange,
}: QuotationFilterBarProps) {
  return (
    <React.Fragment>
      <FilterDropdown
        label="ZNS"
        options={[
          { value: EntityZnsStatus.THANH_CONG, label: 'Thành công' },
          { value: EntityZnsStatus.THAT_BAI, label: 'Thất bại' },
          { value: EntityZnsStatus.CHUA_GUI, label: 'Chưa gửi' },
          { value: EntityZnsStatus.DANG_DAY, label: 'Đang gửi' }
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
      <FilterDropdown
        label="Tỉnh/Thành"
        options={tinhThanhList.map(v => ({ value: v, label: v }))}
        selectedValues={selectedTinhThanh ? [selectedTinhThanh] : []}
        onChange={(vals) => setSelectedTinhThanh(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Tiến độ"
        options={tienDoOptions}
        selectedValues={selectedTienDo ? [selectedTienDo] : []}
        onChange={(vals) => setSelectedTienDo(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Hiệu lực"
        options={hieuLucOptions}
        selectedValues={selectedHieuLuc ? [selectedHieuLuc] : []}
        onChange={(vals) => setSelectedHieuLuc(vals[0] || '')}
        isMulti={false}
      />
      <DateRangePopover
        label="Ngày báo giá"
        startDate={selectedDateRange[0]}
        endDate={selectedDateRange[1]}
        onChange={(start, end) => setSelectedDateRange([start, end])}
      />
    </React.Fragment>
  );
}
