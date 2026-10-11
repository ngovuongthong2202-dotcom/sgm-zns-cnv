import React from 'react';

interface CurrencyCellProps {
  value: number;
  subText?: string | React.ReactNode;
}

/**
 * Đợt 0A (BG01): số tiền luôn trên một dòng và tràn thì cắt BÊN PHẢI có "…" (trước đây canh phải trong khung
 * overflow-hidden của DataViewRow nên phần tràn mất ở BÊN TRÁI — 31/311 báo giá từ 1 tỷ mất chữ số đầu). Tooltip = số đầy đủ.
 */
export function CurrencyCell({ value, subText }: CurrencyCellProps) {
  const formatted = `${new Intl.NumberFormat('vi-VN').format(value || 0)} ₫`;
  return (
    <div className="w-full min-w-0 flex flex-col items-stretch text-right justify-center gap-0.5">
       <span className="block font-currency font-bold text-slate-900 text-xs tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" title={formatted}>
         {formatted}
       </span>
       {subText && (
         <span className="block text-xs text-slate-500 font-normal truncate" title={typeof subText === 'string' ? subText : undefined}>
           {subText}
         </span>
       )}
    </div>
  );
}
