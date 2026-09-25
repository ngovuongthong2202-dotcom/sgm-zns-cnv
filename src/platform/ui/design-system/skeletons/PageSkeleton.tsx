import React from 'react';

export function PageSkeleton() {
  return (
    <div className="p-8 space-y-4 w-full h-full animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2"></div>
      <div className="h-64 bg-slate-200 rounded w-full"></div>
    </div>
  );
}

export default PageSkeleton;
