import React, { ReactNode } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface GroupHeaderProps {
  title: ReactNode;
  count?: number;
  isExpanded: boolean;
  onToggle: () => void;
  level?: number;
  aggregates?: Record<string, any>;
}

export function GroupHeader({ title, count, isExpanded, onToggle, level = 0, aggregates }: GroupHeaderProps) {
  return (
    <div 
      className="flex items-center w-full py-2 px-3 bg-slate-50 border-b border-border-subtle cursor-pointer hover:bg-slate-100 transition-colors"
      style={{ paddingLeft: `${(level + 1) * 12}px` }}
      onClick={onToggle}
    >
      <div className="mr-2 text-text-muted">
        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </div>
      <div className="font-semibold text-sm text-text-primary mr-2">
        {title || <span className="italic text-text-muted">Empty</span>}
      </div>
      {count !== undefined && (
        <span className="bg-slate-200 text-slate-700 text-xs py-0.5 px-2 rounded-full">
          {count}
        </span>
      )}
      <div className="ml-auto text-xs text-text-muted flex gap-4">
        {aggregates && Object.entries(aggregates).map(([k, v]) => (
           <div key={k}>
             <span className="font-medium mr-1">{k}:</span>
             <span>{String(v)}</span>
           </div>
        ))}
      </div>
    </div>
  );
}
