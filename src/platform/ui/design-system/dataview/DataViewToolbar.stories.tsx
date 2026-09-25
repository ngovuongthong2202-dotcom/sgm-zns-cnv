import React from 'react';
import { DataViewToolbar } from './DataViewToolbar';

export default {
  title: 'Design System/DataView/DataViewToolbar',
  component: DataViewToolbar,
};

export const Default = () => {
  return (
    <div className="border border-slate-200">
      <DataViewToolbar
        globalFilter=""
        setGlobalFilter={() => {}}
        sorting={[]}
        setSorting={() => {}}
        grouping={[]}
        setGrouping={() => {}}
        columnVisibility={{}}
        setColumnVisibility={() => {}}
        columnFilters={[]}
        setColumnFilters={() => {}}
        availableColumns={[
          { id: 'name', label: 'Tên Khách Hàng' },
          { id: 'status', label: 'Trạng thái' }
        ]}
        groupByOptions={[
          { id: 'company', label: 'Công ty' },
          { id: 'status', label: 'Trạng thái' }
        ]}
      />
    </div>
  );
}
