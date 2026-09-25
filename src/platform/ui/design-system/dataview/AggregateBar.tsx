import React from 'react';

interface AggregateBarProps {
  stats: { 
    label: string; 
    value: string | number;
    onClick?: () => void;
    isActive?: boolean;
  }[];
}

export function AggregateBar({ stats }: AggregateBarProps) {
  return (
    <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto text-sm shrink-0 w-full select-none">
      {stats.map((stat, idx) => {
        const isClickable = !!stat.onClick;
        const activeClasses = stat.isActive
          ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-500/10'
          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700 hover:border-slate-300';

        return (
          <div 
            key={idx} 
            onClick={stat.onClick}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                stat.onClick?.();
              }
            }}
            className={`flex items-baseline gap-2 whitespace-nowrap px-3 py-1 rounded-lg border shadow-[0_1px_1.5px_rgba(15,23,42,0.02)] transition-all ${isClickable ? 'cursor-pointer active:scale-[0.98]' : 'bg-transparent border-transparent shadow-none'} ${isClickable ? activeClasses : ''}`}
            aria-label={`${stat.label}: ${stat.value} ${stat.isActive ? '(Đang kích hoạt bộ lọc)' : ''}`}
          >
            <span className="text-slate-500 uppercase tracking-wide text-2xs font-bold">{stat.label}</span>
            <span className="font-bold text-slate-800 text-sm font-sans">{stat.value}</span>
            {stat.isActive && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 ml-1 shrink-0" />
            )}
          </div>
        );
      })}
    </div>
  );
}
