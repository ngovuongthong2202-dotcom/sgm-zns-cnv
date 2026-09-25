import { useState } from 'react';
import { PaginationState } from '@tanstack/react-table';

export function useDataViewPagination(initialState?: PaginationState) {
  const [pagination, setPagination] = useState<PaginationState>(
    initialState || { pageIndex: 0, pageSize: 25 }
  );

  return { pagination, setPagination };
}
