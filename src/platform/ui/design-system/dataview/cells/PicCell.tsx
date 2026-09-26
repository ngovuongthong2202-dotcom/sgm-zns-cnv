import React from 'react';
import { extractCleanFullName, extractGivenName, extractAvatarBadge } from '@/src/shared/utils/userProfile';

interface PicCellProps {
  fullName?: string;
  onClick?: () => void;
  emptyLabel?: string;
}

export function PicCell({ fullName, onClick, emptyLabel = 'Chưa phân công' }: PicCellProps) {
  const cleanFullName = extractCleanFullName(fullName);
  const givenName = extractGivenName(fullName);
  const avatarBadge = extractAvatarBadge(fullName);

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
        {avatarBadge}
      </div>
      <span 
        className="text-xs font-medium border-b border-transparent group-hover:border-blue-500/30 text-slate-700 truncate block" 
        title={fullName || cleanFullName || emptyLabel}
      >
        {givenName || <span className="text-slate-500 italic font-normal">{emptyLabel}</span>}
      </span>
    </div>
  );
}

