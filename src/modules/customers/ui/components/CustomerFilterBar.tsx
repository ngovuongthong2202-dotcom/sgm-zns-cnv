import React from 'react';
import { FilterDropdown } from '@/src/design-system/dataview/FilterDropdown';
import { DateRangePopover } from '@/src/design-system/dataview/DateRangePopover';

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
  tinhThanhList: _tinhThanhList,
  loaiKhachHangList,
  selectedNguoiPhuTrach,
  setSelectedNguoiPhuTrach,
  selectedZnsStatus: _selectedZnsStatus,
  setSelectedZnsStatus: _setSelectedZnsStatus,
  selectedTinhThanh: _selectedTinhThanh,
  setSelectedTinhThanh: _setSelectedTinhThanh,
  selectedLoaiKh,
  setSelectedLoaiKh,
  selectedCreatedDateRange,
  setSelectedCreatedDateRange,
}: CustomersFiltersProps) {
  
  const nguoiPhuTrachOptions = nguoiPhuTrachList.map(item => ({ value: item, label: item }));
  const loaiKhOptions = loaiKhachHangList.map(item => ({ value: item, label: item }));

  const getActiveChipsCount = () => {
    let count = 0;
    if (selectedNguoiPhuTrach) count++;
    if (selectedLoaiKh) count++;
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
