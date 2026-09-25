import { Payment } from '@/src/domain/schema/payment.schema';
import React from 'react';

export function PaymentGroupHeader({ row }: { row: any }) {
  const subPayments = row.subRows.map((sr: any) => sr.original);
  const sumCollected = subPayments.reduce((acc: number, p: Payment) => {
    if (p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || p.tinhTrangThanhToan === 'Miễn phí' || p.tinhTrangThanhToan === 'Miễn Phí') {
      return acc + (p.soTien || 0);
    }
    return acc;
  }, 0);
  const sumPending = subPayments.reduce((acc: number, p: Payment) => {
    if (p.tinhTrangThanhToan === 'Chưa TT' || p.tinhTrangThanhToan === 'Công nợ') {
      return acc + (p.soTien || 0);
    }
    return acc;
  }, 0);
  const titleStr = String(row.getValue(row.groupingColumnId) || '(Chưa rõ)');

  return (
    <div className="flex items-center justify-between w-full h-11 bg-slate-50 border-y border-slate-200 sticky left-0 z-20 group/header hover:bg-slate-100 transition-colors cursor-pointer pr-6 text-sm font-semibold text-slate-800"
         onClick={(e) => { e.stopPropagation(); row.toggleExpanded(); }}
         style={{ paddingLeft: `${row.depth * 28 + 16}px` }}
    >
       {row.depth === 0 && <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-300 group-hover/header:bg-slate-400 transition-colors" />}
       <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className={`flex flex-shrink-0 items-center justify-center w-4 h-4 rounded border transition-all shadow-sm ${row.getIsExpanded() ? 'bg-slate-800 border-slate-800 text-white' : 'bg-white border-slate-300 text-slate-500'}`}>
            <svg className={`w-3 h-3 transition-transform duration-200 ${row.getIsExpanded() ? 'rotate-90' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <span className="font-bold text-sm text-slate-800 tracking-tight">{titleStr}</span>
          <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-2xs leading-none shrink-0 mb-0.5">{row.subRows.length} phiếu</span>

          <div className="flex flex-wrap items-center gap-3 ml-4 pl-4 border-l border-slate-300/60 text-slate-600">
             {sumPending > 0 && (
               <div className="flex items-center gap-1.5 text-xs bg-white px-2 py-0.5 rounded border border-amber-100 text-amber-700 shadow-xs">
                  <span className="font-medium text-slate-500">Chờ thu:</span>
                  <span className="font-mono font-bold">{new Intl.NumberFormat('vi-VN').format(sumPending)} <span className="text-2xs font-sans font-normal text-slate-400">đ</span></span>
               </div>
             )}
             {sumCollected > 0 && (
               <div className="flex items-center gap-1.5 text-xs bg-white px-2 py-0.5 rounded border border-emerald-100 text-emerald-700 shadow-xs">
                  <span className="font-medium text-slate-500">Đã thu:</span>
                  <span className="font-mono font-bold">{new Intl.NumberFormat('vi-VN').format(sumCollected)} <span className="text-2xs font-sans font-normal text-slate-400">đ</span></span>
               </div>
             )}
          </div>
       </div>
    </div>
  );
}
