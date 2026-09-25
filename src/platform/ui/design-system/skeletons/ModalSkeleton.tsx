import React from 'react';

export function ModalSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-6 bg-slate-200 rounded w-1/3"></div>
      <div className="h-4 bg-slate-200 rounded w-full"></div>
      <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      <div className="h-32 bg-slate-200 rounded w-full"></div>
    </div>
  );
}

export default ModalSkeleton;
