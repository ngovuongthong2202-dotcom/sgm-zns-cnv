import React from 'react';
import { formatDate } from '@/src/shared/utils/formatDate';

interface DateBadgeCellProps {
  dateStr?: string | null;
  badge?: string;
  badgeClass?: string;
  // If no badge, formats date normally. If badge, shows date and badge underneath.
}

export function DateBadgeCell({ dateStr, badge, badgeClass }: DateBadgeCellProps) {
  if (!dateStr) return <span className="text-slate-500 text-xs">—</span>;

  return (
    <div className="flex flex-col gap-0.5 items-start justify-center min-w-0">
      <span className="text-xs text-slate-600 truncate">{formatDate(dateStr)}</span>
      {badge && (
        <span className={`px-1 rounded text-3xs font-bold uppercase tracking-wider ${badgeClass || 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
