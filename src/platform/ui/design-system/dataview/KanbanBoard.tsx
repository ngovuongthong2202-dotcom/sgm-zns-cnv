import React from 'react';
import { Table } from '@tanstack/react-table';

interface KanbanBoardProps<T> {
  table: Table<T>;
  onRowSelect?: (row: T) => void;
}

export function KanbanBoard<T>({ table, onRowSelect }: KanbanBoardProps<T>) {
  const { rows } = table.getRowModel();
  // Filter out only group rows (the top level)
  const groupRows = rows.filter(r => r.getIsGrouped() && r.depth === 0);

  if (!table.getState().grouping.length) {
    return <div className="p-8 text-center text-slate-600">Vui lòng Group theo 1 tiêu chí để xem chế độ Kanban</div>;
  }

  return (
    <div className="flex w-full h-full overflow-x-auto p-6 gap-6 bg-slate-50/50">
      {groupRows.map((groupRow) => {
         const title = groupRow.getValue(groupRow.groupingColumnId || '');
         const leafRows = groupRow.getLeafRows();
         return (
           <div key={groupRow.id} className="flex flex-col bg-slate-50 rounded-xl border border-slate-200 min-w-[320px] max-w-[320px] shadow-sm">
             <div className="px-4 py-3 border-b flex justify-between items-center bg-white rounded-t-xl">
               <h3 className="font-bold text-slate-800 uppercase text-xs tracking-wider">{String(title) || 'Khác'}</h3>
               <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-semibold">{leafRows.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto p-3 space-y-3">
               {leafRows.map((leaf) => {
                 // Try to guess a "title" or primary field from the object
                 const data = leaf.original as any; 
                 const itemName = data.tenKhachHang || data.soDonHang || data.soHopDong || data.deliveryId || data.paymentId || 'Mục phi danh';
                 const subText = data.maKh || data.ngayGiaoMay || data.ngayThanhToan || data.ngayKy || '';
                 
                 return (
                   <div 
                     key={leaf.id} 
                     onClick={() => onRowSelect?.(leaf.original)}
                     className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:shadow hover:border-brand-primary transition-all active:scale-[0.98]"
                   >
                     <div className="font-semibold text-slate-800 text-sm">{itemName}</div>
                     {subText && <div className="text-xs text-slate-600 mt-1 font-mono">{subText}</div>}
                   </div>
                 );
               })}
             </div>
           </div>
         );
      })}
    </div>
  );
}
