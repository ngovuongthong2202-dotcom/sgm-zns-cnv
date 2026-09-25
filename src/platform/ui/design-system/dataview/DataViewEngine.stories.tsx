import React from 'react';
import { DataViewEngine } from './DataViewEngine';
import { useDataView } from './useDataView';

// Dummy data and config for story
const dummyData = [
  { id: '1', name: 'Nguyễn Văn A', company: 'Công ty X', status: 'Active', total: 1000000 },
  { id: '2', name: 'Trần Thị B', company: 'Công ty Y', status: 'Inactive', total: 500000 },
  { id: '3', name: 'Lê Văn C', company: 'Công ty Z', status: 'Active', total: 2000000 },
];

const dummyColumns = [
  { accessorKey: 'id', header: 'ID', size: 60 },
  { accessorKey: 'name', header: 'Tên Khách Hàng', size: 200 },
  { accessorKey: 'company', header: 'Công ty', size: 200 },
  { accessorKey: 'status', header: 'Trạng thái', size: 100 },
  { accessorKey: 'total', header: 'Tổng tiền', size: 150 },
];

const DummyWrapper = () => {
  const dataView = useDataView({
    data: dummyData,
    columns: dummyColumns as any,
    initialState: {
      sorting: [{ id: 'name', desc: false }]
    }
  });

  return (
    <div className="h-[600px] border border-slate-200">
      <DataViewEngine
        dataView={dataView as any}
        columns={dummyColumns as any}
        groupByOptions={[
          { id: 'company', label: 'Công ty' },
          { id: 'status', label: 'Trạng thái' }
        ]}
      />
    </div>
  );
};

export default {
  title: 'Design System/DataView/DataViewEngine',
  component: DataViewEngine,
};

export const Default = () => <DummyWrapper />;
