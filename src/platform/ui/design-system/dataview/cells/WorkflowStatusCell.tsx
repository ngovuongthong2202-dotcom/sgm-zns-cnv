import React from 'react';

interface WorkflowStatusCellProps {
  label: string;
  colorClass: string; 
  // e.g., 'bg-red-50 text-red-700 border-red-200'
}

export function WorkflowStatusCell({ label, colorClass }: WorkflowStatusCellProps) {
  return (
    <div className="w-full flex items-center min-w-0">
      <div 
        className={`px-2 py-0.5 text-xs font-medium rounded-md border ${colorClass} truncate max-w-full`} 
        title={label}
      >
        {label}
      </div>
    </div>
  );
}
