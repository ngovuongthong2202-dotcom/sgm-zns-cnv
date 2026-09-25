import { useState, useDeferredValue } from 'react';
import {
  VisibilityState,
  ColumnFiltersState,
  ColumnDef,
} from '@tanstack/react-table';
import { ViewType } from '../../ViewSwitcher';

export function useDataViewBase<T>(
  columns: ColumnDef<T, any>[],
  initialState?: {
    columnVisibility?: VisibilityState;
    columnFilters?: ColumnFiltersState;
    globalFilter?: string;
  },
  route?: string | null,
  getSaved?: <S>(key: string, defaultVal: S) => S
) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const defaults: VisibilityState = { ...initialState?.columnVisibility };
    columns.forEach((col: any) => {
      const id = col.id || col.accessorKey;
      if (id && col.size === 0 && defaults[id] === undefined) {
        defaults[id] = false;
      }
    });
    if (route) {
      try {
        const savedColumns = localStorage.getItem(`dataview:${route}:columns`);
        if (savedColumns) {
          const parsed = JSON.parse(savedColumns);
          if (parsed.visibility) return parsed.visibility;
        }
      } catch {
        // ignore
      }
    }
    return getSaved ? getSaved('columnVisibility', getSaved('visibility', defaults)) : defaults;
  });

  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(() => {
    if (route) {
      try {
        const savedColumns = localStorage.getItem(`dataview:${route}:columns`);
        if (savedColumns) {
          const parsed = JSON.parse(savedColumns);
          if (parsed.sizing) return parsed.sizing;
        }
      } catch {
        // ignore
      }
    }
    return {};
  });

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (route) {
      try {
        const savedColumns = localStorage.getItem(`dataview:${route}:columns`);
        if (savedColumns) {
          const parsed = JSON.parse(savedColumns);
          if (parsed.order) return parsed.order;
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(() =>
    getSaved ? getSaved('columnFilters', getSaved('filters', initialState?.columnFilters || [])) : initialState?.columnFilters || []
  );

  const [globalFilter, setGlobalFilter] = useState(() =>
    getSaved ? getSaved('globalFilter', getSaved('global', initialState?.globalFilter || '')) : initialState?.globalFilter || ''
  );
  const deferredGlobalFilter = useDeferredValue(globalFilter);

  const [density, setDensity] = useState<'compact' | 'normal' | 'comfortable'>(() => {
    const savedGlobal = localStorage.getItem('dataview:density');
    if (savedGlobal === 'compact' || savedGlobal === 'comfortable' || savedGlobal === 'normal') {
      return savedGlobal as any;
    }
    if (savedGlobal === 'cozy') return 'normal';
    const saved = getSaved ? (getSaved('density', 'compact') as any) : 'compact';
    return saved === 'normal' || saved === 'cozy' ? 'normal' : saved === 'comfortable' ? 'comfortable' : 'compact';
  });

  const [viewType, setViewType] = useState<ViewType>(() => (getSaved ? getSaved('viewType', 'table') : 'table'));

  const [activeRowIndex, setActiveRowIndex] = useState(-1);

  return {
    columnVisibility, setColumnVisibility,
    columnSizing, setColumnSizing,
    columnOrder, setColumnOrder,
    columnFilters, setColumnFilters,
    globalFilter, setGlobalFilter, deferredGlobalFilter,
    density, setDensity,
    viewType, setViewType,
    activeRowIndex, setActiveRowIndex
  };
}
