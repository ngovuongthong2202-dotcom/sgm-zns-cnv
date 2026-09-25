import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Quotation } from '@/src/domain/schema/quotation.schema';

export function QuotationGroupHeader({ row }: { row: any }) {
  let title = String(row.getValue(row.groupingColumnId));
  if (row.groupingColumnId === 'customerId') {
    const firstLeaf = row.leafRows[0]?.original as Quotation;
    title = firstLeaf ? `${firstLeaf.tenKhachHang}` : `Unknown (${title})`;
  }
  const groupDataObj = row.leafRows.map((r: any) => r.original as Quotation);
  
  // Xu hướng
  const monthCounts: Record<string, number> = {};
  groupDataObj.forEach((q: Quotation) => {
      if (!q.ngayBaoGia) return;
      const _m = q.ngayBaoGia.slice(0, 7);
      monthCounts[_m] = (monthCounts[_m] || 0) + 1;
  });
  const sortedMonths = Object.keys(monthCounts).sort();
  const sparkData = sortedMonths.slice(-6).map((m: string) => ({ name: m, value: monthCounts[m] }));
  if (sparkData.length === 0) sparkData.push({ name: 'N/A', value: 0 });

  // Tổng trị giá
  const totalValue = groupDataObj.reduce((sum: number, q: Quotation) => sum + (q.products?.reduce((a,p) => a + ((p.price || 0) * (p.quantity || 1)), 0) || 0), 0);

  const isExpanded = row.getIsExpanded();

  return (
    <div 
      className="flex items-center justify-between w-full h-11 px-4 border-b border-slate-200 transition-colors cursor-pointer group bg-slate-50 hover:bg-slate-100"
      style={{ paddingLeft: `${row.depth * 24 + 16}px` }}
      onClick={() => row.toggleExpanded()}
    >
      <div className="flex items-center min-w-0 flex-1 gap-2">
        <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded border transition-all shadow-sm ${isExpanded ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-500'}`}>
          <ChevronRight size={12} strokeWidth={2.5} className="transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }} />
        </div>
        
        <span className="font-bold text-sm text-slate-800 tracking-tight truncate max-w-[200px]">{title}</span>
        <span className="text-2xs font-semibold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full leading-none shrink-0 mb-0.5">{row.leafRows.length} phiếu</span>
        
        <div className="flex flex-wrap items-center gap-3 ml-4 pl-4 border-l border-slate-300/60 text-slate-650">
          <div className="flex items-center gap-1.5 text-xs bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs">
             <span className="text-slate-500 font-medium">Giá trị ước tính:</span>
             <span className="font-mono font-bold text-blue-700">{new Intl.NumberFormat('vi-VN').format(totalValue)} <span className="text-2xs text-slate-500 font-sans font-normal">VNĐ</span></span>
          </div>
          <span className="text-2xs font-bold tracking-wider uppercase text-slate-400 shrink-0">
             ({row.groupingColumnId === 'customerId' ? 'Khách hàng' : row.groupingColumnId === 'nguoiPhuTrach' ? 'Phụ trách' : 'Phân loại'})
          </span>
        </div>
      </div>
    </div>
  );
}
