import { useState } from 'react';
import { SortingState } from '@tanstack/react-table';

export function useDataViewSorting(
  initialState?: SortingState,
  getSaved?: <S>(key: string, defaultVal: S) => S
) {
  const [sorting, setSorting] = useState<SortingState>(() =>
    getSaved ? getSaved<SortingState>('sorting', initialState || []) : initialState || []
  );

  return { sorting, setSorting };
}
