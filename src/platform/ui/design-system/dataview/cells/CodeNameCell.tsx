import React from 'react';
import { normalizeCode } from '@/src/shared/utils/textFormatter';

interface CodeNameCellProps {
  code?: string | null;
  subType?: string | null;
}

export function CodeNameCell({ code, subType }: CodeNameCellProps) {
  const displayCode = normalizeCode(code || '') || '---';
  const displaySub = subType || '---';

  return (
    <div className="w-full min-w-0 flex flex-col items-start justify-center gap-0.5">
      <span 
        className="text-2xs font-bold text-slate-500 tracking-wider uppercase truncate" 
        title={displaySub}
      >
        {displaySub}
      </span>
      <span 
        className="font-mono font-medium text-slate-800 text-xs tracking-tight truncate" 
        title={displayCode}
      >
        {displayCode}
      </span>
    </div>
  );
}
