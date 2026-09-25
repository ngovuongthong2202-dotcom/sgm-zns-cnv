import React from 'react';

interface PicCellProps {
  fullName?: string;
  onClick?: () => void;
  emptyLabel?: string;
}

export function PicCell({ fullName, onClick, emptyLabel = 'Chưa phân công' }: PicCellProps) {
  const firstName = fullName ? fullName.split(' ').pop() : '';

  return (
    <div 
      className={`flex items-center w-full min-w-0 gap-2 group ${onClick ? 'cursor-pointer' : ''}`} 
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
    >
      <div className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-2xs shrink-0 uppercase tracking-widest">
        {firstName ? firstName.substring(0, 2) : '?'}
      </div>
      <span 
        className="text-xs font-medium border-b border-transparent group-hover:border-blue-500/30 text-slate-700 truncate block" 
        title={fullName || emptyLabel}
      >
        {firstName || <span className="text-slate-500 italic font-normal">{emptyLabel}</span>}
      </span>
    </div>
  );
}
