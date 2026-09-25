import React from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

interface ContractFilterBarProps {
  nguoiPhuTrachList: string[];
  tinhThanhList: string[];
  selectedNguoiPhuTrach: string;
  setSelectedNguoiPhuTrach: (val: string) => void;
  selectedZns: string;
  setSelectedZns: (val: string) => void;
  selectedTinhThanh: string;
  setSelectedTinhThanh: (val: string) => void;
  selectedDkHoanThanh: string;
  setSelectedDkHoanThanh: (val: string) => void;
  selectedTienDoTT: string;
  setSelectedTienDoTT: (val: string) => void;
  selectedTienDoGiao: string;
  setSelectedTienDoGiao: (val: string) => void;
  selectedDateRange: [string, string];
  setSelectedDateRange: (range: [string, string]) => void;
}

export function ContractFilterBar({
  nguoiPhuTrachList,
  tinhThanhList,
  selectedNguoiPhuTrach,
  setSelectedNguoiPhuTrach,
  selectedZns,
  setSelectedZns,
  selectedTinhThanh,
  setSelectedTinhThanh,
  selectedDkHoanThanh,
  setSelectedDkHoanThanh,
  selectedTienDoTT,
  setSelectedTienDoTT,
  selectedTienDoGiao,
  setSelectedTienDoGiao,
  selectedDateRange,
  setSelectedDateRange,
}: ContractFilterBarProps) {
  return (
    <React.Fragment>
      <FilterDropdown
        label="Phụ trách"
        options={nguoiPhuTrachList.map(v => ({ value: v, label: v }))}
        selectedValues={selectedNguoiPhuTrach ? [selectedNguoiPhuTrach] : []}
        onChange={(vals) => setSelectedNguoiPhuTrach(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="ZNS"
        options={[
          { value: EntityZnsStatus.THANH_CONG, label: 'Thành công' },
          { value: EntityZnsStatus.THAT_BAI, label: 'Thất bại' },
          { value: EntityZnsStatus.CHUA_GUI, label: 'Chưa gửi' }
        ]}
        selectedValues={selectedZns ? [selectedZns] : []}
        onChange={(vals) => setSelectedZns(vals[0] || '')}
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
        label="DK Hoàn thành"
        options={[
          { value: 'TODAY', label: 'Hôm nay' },
          { value: 'OVERDUE', label: 'Quá hạn' },
          { value: 'UPCOMING', label: 'Sắp tới (14 ngày)' }
        ]}
        selectedValues={selectedDkHoanThanh ? [selectedDkHoanThanh] : []}
        onChange={(vals) => setSelectedDkHoanThanh(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Tiến độ TT"
        options={[
          { value: 'CHUA_TT', label: 'Chưa thanh toán' },
          { value: 'DANG_TT', label: 'Đang thanh toán' },
          { value: 'DA_TT', label: 'Đã tất toán' }
        ]}
        selectedValues={selectedTienDoTT ? [selectedTienDoTT] : []}
        onChange={(vals) => setSelectedTienDoTT(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Tiến độ giao"
        options={[
          { value: 'CHUA_GIAO', label: 'Chưa giao hàng' },
          { value: 'DANG_GIAO', label: 'Đang giao hàng' },
          { value: 'DA_GIAO', label: 'Đã hoàn thành' }
        ]}
        selectedValues={selectedTienDoGiao ? [selectedTienDoGiao] : []}
        onChange={(vals) => setSelectedTienDoGiao(vals[0] || '')}
        isMulti={false}
      />
      <DateRangePopover
        label="Ngày ký"
        startDate={selectedDateRange[0]}
        endDate={selectedDateRange[1]}
        onChange={(start, end) => setSelectedDateRange([start, end])}
      />
    </React.Fragment>
  );
}
