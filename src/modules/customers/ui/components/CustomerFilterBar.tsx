import React from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

interface CustomersFiltersProps {
  nguoiPhuTrachList: string[];
  tinhThanhList: string[];
  loaiKhachHangList: string[];
  selectedNguoiPhuTrach: string;
  setSelectedNguoiPhuTrach: (val: string) => void;
  selectedZnsStatus: string;
  setSelectedZnsStatus: (val: string) => void;
  selectedTinhThanh: string;
  setSelectedTinhThanh: (val: string) => void;
  selectedLoaiKh: string;
  setSelectedLoaiKh: (val: string) => void;
  selectedCreatedDateRange: [string, string];
  setSelectedCreatedDateRange: (range: [string, string]) => void;
}

export function CustomerFilterBar({
  nguoiPhuTrachList,
  tinhThanhList,
  loaiKhachHangList,
  selectedNguoiPhuTrach,
  setSelectedNguoiPhuTrach,
  selectedZnsStatus,
  setSelectedZnsStatus,
  selectedTinhThanh,
  setSelectedTinhThanh,
  selectedLoaiKh,
  setSelectedLoaiKh,
  selectedCreatedDateRange,
  setSelectedCreatedDateRange,
}: CustomersFiltersProps) {
  
  const nguoiPhuTrachOptions = nguoiPhuTrachList.map(item => ({ value: item, label: item }));
  const loaiKhOptions = loaiKhachHangList.map(item => ({ value: item, label: item }));
  const tinhThanhOptions = tinhThanhList.map(item => ({ value: item, label: item }));

  const znsOptions = [
    { value: EntityZnsStatus.THANH_CONG, label: 'Thành công' },
    { value: EntityZnsStatus.THAT_BAI, label: 'Thất bại' },
    { value: EntityZnsStatus.CHUA_GUI, label: 'Chưa gửi' },
    { value: EntityZnsStatus.DANG_DAY, label: 'Đang gửi' },
  ];

  const getActiveChipsCount = () => {
    let count = 0;
    if (selectedNguoiPhuTrach) count++;
    if (selectedLoaiKh) count++;
    if (selectedTinhThanh) count++;
    if (selectedZnsStatus) count++;
    if (selectedCreatedDateRange[0] || selectedCreatedDateRange[1]) count++;
    return count;
  };

  return (
    <div className="flex items-center gap-2 flex-nowrap shrink-0">
      <FilterDropdown
        label="Phụ trách"
        options={nguoiPhuTrachOptions}
        selectedValues={selectedNguoiPhuTrach ? [selectedNguoiPhuTrach] : []}
        onChange={(vals) => setSelectedNguoiPhuTrach(vals[0] || '')}
        isMulti={false}
      />

      <FilterDropdown
        label="Loại KH"
        options={loaiKhOptions}
        selectedValues={selectedLoaiKh ? [selectedLoaiKh] : []}
        onChange={(vals) => setSelectedLoaiKh(vals[0] || '')}
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
        options={znsOptions}
        selectedValues={selectedZnsStatus ? [selectedZnsStatus] : []}
        onChange={(vals) => setSelectedZnsStatus(vals[0] || '')}
        isMulti={false}
      />

      <DateRangePopover
        label="Ngày tạo"
        startDate={selectedCreatedDateRange[0]}
        endDate={selectedCreatedDateRange[1]}
        onChange={(start, end) => setSelectedCreatedDateRange([start, end])}
      />

      {getActiveChipsCount() > 0 && (
        <span className="font-mono text-2xs text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded-full font-bold">
          Đã lọc {getActiveChipsCount()}
        </span>
      )}
    </div>
  );
}
