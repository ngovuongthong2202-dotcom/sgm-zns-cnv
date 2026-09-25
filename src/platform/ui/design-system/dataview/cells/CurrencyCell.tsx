import React from 'react';

interface CurrencyCellProps {
  value: number;
  subText?: string | React.ReactNode;
}

export function CurrencyCell({ value, subText }: CurrencyCellProps) {
  return (
    <div className="w-full flex flex-col items-end justify-center gap-0.5">
       <span className="font-mono font-medium text-slate-800 text-xs tabular-nums">
         {new Intl.NumberFormat('vi-VN').format(value || 0)} ₫
       </span>
       {subText && (
         <span className="text-xs text-slate-500 font-normal whitespace-nowrap">
           {subText}
         </span>
       )}
    </div>
  );
}
