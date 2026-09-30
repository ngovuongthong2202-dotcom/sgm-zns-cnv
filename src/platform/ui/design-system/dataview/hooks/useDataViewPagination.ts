import { useState } from 'react';
import { PaginationState } from '@tanstack/react-table';

export function useDataViewPagination(initialState?: PaginationState, storageKey?: string | null) {
  const [pagination, setPagination] = useState<PaginationState>(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(`${storageKey}:pagination`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed.pageIndex === 'number' && typeof parsed.pageSize === 'number') {
            return parsed;
          }
        }
      } catch {
        // Fallback
      }
    }
    return initialState || { pageIndex: 0, pageSize: 25 };
  });

  const setPaginationPersisted: typeof setPagination = (updater) => {
    setPagination(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (storageKey && typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`${storageKey}:pagination`, JSON.stringify(next));
        } catch {
          // Ignore
        }
      }
      return next;
    });
  };

  return { pagination, setPagination: setPaginationPersisted };
}
