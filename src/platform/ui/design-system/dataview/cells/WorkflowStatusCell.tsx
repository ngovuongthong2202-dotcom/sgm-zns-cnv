import React from 'react';

interface WorkflowStatusCellProps {
  label: string;
  colorClass: string; 
  title?: string;
  tooltip?: string;
  errorCode?: string | number;
}

export function WorkflowStatusCell({ label, colorClass, title, tooltip, errorCode }: WorkflowStatusCellProps) {
  const displayTitle = tooltip || title || (errorCode ? `Mã lỗi: ${errorCode}` : label);
  return (
    <div className="w-full flex items-center min-w-0">
      <div 
        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md border ${colorClass} truncate max-w-full ${tooltip ? 'cursor-help' : ''}`} 
        title={displayTitle}
      >
        <span className="truncate">{label}</span>
        {errorCode && (
          <span className="text-3xs font-mono px-1 rounded bg-red-100 text-red-800 shrink-0 font-bold">
            {errorCode}
          </span>
        )}
      </div>
    </div>
  );
}
