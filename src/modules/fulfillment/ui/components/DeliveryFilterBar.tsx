import React from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

interface DeliveryFilterBarProps {
  nguoiGiaoList: string[];
  tinhThanhList: string[];
  selectedStatus: string;
  setSelectedStatus: (val: string) => void;
  selectedSchedule: string;
  setSelectedSchedule: (val: string) => void;
  selectedNguoiGiao: string;
  setSelectedNguoiGiao: (val: string) => void;
  selectedTinhThanh: string;
  setSelectedTinhThanh: (val: string) => void;
  selectedZns: string;
  setSelectedZns: (val: string) => void;
  selectedNgayDuKien: [string, string];
  setSelectedNgayDuKien: (range: [string, string]) => void;
  selectedNgayThucTe: [string, string];
  setSelectedNgayThucTe: (range: [string, string]) => void;
}

export function DeliveryFilterBar({
  nguoiGiaoList,
  tinhThanhList,
  selectedStatus,
  setSelectedStatus,
  selectedSchedule,
  setSelectedSchedule,
  selectedNguoiGiao,
  setSelectedNguoiGiao,
  selectedTinhThanh,
  setSelectedTinhThanh,
  selectedZns,
  setSelectedZns,
  selectedNgayDuKien,
  setSelectedNgayDuKien,
  selectedNgayThucTe,
  setSelectedNgayThucTe,
}: DeliveryFilterBarProps) {
  return (
    <React.Fragment>
      <FilterDropdown
        label="Trạng thái"
        options={[
          { value: 'pending', label: 'Chờ giao' },
          { value: 'ongoing', label: 'Đang đi giao' },
          { value: 'completed', label: 'Đã hoàn tất' },
        ]}
        selectedValues={selectedStatus ? [selectedStatus] : []}
        onChange={(vals) => setSelectedStatus(vals[0] || '')}
        isMulti={false}
      />
      <FilterDropdown
        label="Phụ trách"
        options={nguoiGiaoList.map(v => ({ value: v, label: v }))}
        selectedValues={selectedNguoiGiao ? [selectedNguoiGiao] : []}
        onChange={(vals) => setSelectedNguoiGiao(vals[0] || '')}
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
      <DateRangePopover
        label="Ngày dự kiến"
        startDate={selectedNgayDuKien[0]}
        endDate={selectedNgayDuKien[1]}
        onChange={(start, end) => setSelectedNgayDuKien([start, end])}
      />
      <DateRangePopover
        label="Ngày thực tế"
        startDate={selectedNgayThucTe[0]}
        endDate={selectedNgayThucTe[1]}
        onChange={(start, end) => setSelectedNgayThucTe([start, end])}
      />
    </React.Fragment>
  );
}
