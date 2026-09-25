/* eslint-disable max-lines */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useDataViewKeyboard } from './keyboard';
import { aggregates as aggregateFns } from './aggregates';
import { useAuth } from '@/src/modules/iam';
import { getSavedViews, saveView, deleteView, SavedView, saveOrgTemplate } from './savedViews';
import { ViewType } from '../ViewSwitcher';
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  GroupingState,
  FilterFn,
  ColumnDef
} from '@tanstack/react-table';

import { useDataViewSorting } from './hooks/useDataViewSorting';
import { useDataViewGrouping } from './hooks/useDataViewGrouping';
import { useDataViewPagination } from './hooks/useDataViewPagination';
import { useDataViewBase } from './hooks/useDataViewBase';

export const vietnameseTextFilter: FilterFn<any> = (row, columnId, value) => {
  const normalize = (str: string) => 
    String(str || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  
  const normalizedValue = normalize(value as string);

  // 1. Check cell value
  const rowValue = row.getValue(columnId);
  if (rowValue != null && normalize(String(rowValue)).includes(normalizedValue)) {
    return true;
  }

  // 2. Search other representative name and contact options inside original
  const original = row.original as any;
  if (!original) return false;

  const checkFields = (obj: any): boolean => {
    if (!obj) return false;

    // Direct match check on the object's various name / contact / manager fields
    if (obj.nguoiDaiDien && normalize(String(obj.nguoiDaiDien)).includes(normalizedValue)) {
      return true;
    }
    if (obj.tenKhachHang && normalize(String(obj.tenKhachHang)).includes(normalizedValue)) {
      return true;
    }
    if (obj.nguoiPhuTrach && normalize(String(obj.nguoiPhuTrach)).includes(normalizedValue)) {
      return true;
    }

    // Checking embedded contacts array
    if (Array.isArray(obj.contacts)) {
      for (const contact of obj.contacts) {
        if (contact) {
          if (contact.nguoiDaiDien && normalize(String(contact.nguoiDaiDien)).includes(normalizedValue)) {
            return true;
          }
          if (contact.sdt && String(contact.sdt).includes(normalizedValue)) {
            return true;
          }
        }
      }
    }

    return false;
  };

  if (checkFields(original)) return true;
  if (original.__customerInfo && checkFields(original.__customerInfo)) return true;
  if (original.__quotationInfo && checkFields(original.__quotationInfo)) return true;

  return false;
};

export const defaultColumnFilterFn: FilterFn<any> = (row, columnId, filterValue) => {
  const rowValue = row.getValue(columnId);
  
  if (filterValue === undefined || filterValue === null || filterValue === '' || (Array.isArray(filterValue) && filterValue.length === 0)) {
    return true;
  }

  // Handle date range filter: e.g. [startDate, endDate]
  if (Array.isArray(filterValue) && filterValue.length === 2 && 
      (filterValue.some(v => v && typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) || filterValue.every(v => v === ''))) {
    const [start, end] = filterValue;
    const rowDateStr = rowValue ? String(rowValue).substring(0, 10) : '';
    if (!rowDateStr) return false;
    if (start && rowDateStr < start) return false;
    if (end && rowDateStr > end) return false;
    return true;
  }

  // Handle multi-select array filter
  if (Array.isArray(filterValue)) {
    return filterValue.some(val => {
      if (val === 'all' || val === '') return true;
      if (rowValue === undefined || rowValue === null) return false;
      return String(rowValue).toLowerCase() === String(val).toLowerCase();
    });
  }

  if (filterValue === 'all') return true;
  if (rowValue === undefined || rowValue === null) return false;
  return String(rowValue).toLowerCase() === String(filterValue).toLowerCase();
};

const getRouteKey = (viewId?: string): string => {
  if (!viewId) return '';
  if (viewId === 'customers_list') return 'customers';
  if (viewId === 'quotations_list') return 'quotations';
  if (viewId === 'contracts_list') return 'contracts';
  if (viewId === 'payments_list') return 'payments';
  if (viewId === 'deliveries_list') return 'deliveries';
  return viewId.replace('_list', '');
};

const sanitizeViewState = (stateFragment: any, validColIds: Set<string>) => {
  const res: any = {};
  if (stateFragment.grouping && Array.isArray(stateFragment.grouping)) {
    res.grouping = stateFragment.grouping.filter((id: string) => validColIds.has(id));
  } else if ('grouping' in stateFragment) res.grouping = stateFragment.grouping;

  if (stateFragment.sorting && Array.isArray(stateFragment.sorting)) {
    res.sorting = stateFragment.sorting.filter((s: any) => validColIds.has(s.id));
  } else if ('sorting' in stateFragment) res.sorting = stateFragment.sorting;

  if (stateFragment.columnFilters && Array.isArray(stateFragment.columnFilters)) {
    res.columnFilters = stateFragment.columnFilters.filter((f: any) => validColIds.has(f.id));
  } else if ('columnFilters' in stateFragment) res.columnFilters = stateFragment.columnFilters;

  if (stateFragment.columnVisibility && typeof stateFragment.columnVisibility === 'object') {
    const newVis: any = {};
    for (const k of Object.keys(stateFragment.columnVisibility)) {
      if (validColIds.has(k)) newVis[k] = stateFragment.columnVisibility[k];
    }
    res.columnVisibility = newVis;
  } else if ('columnVisibility' in stateFragment) res.columnVisibility = stateFragment.columnVisibility;

  if (stateFragment.columnSizing && typeof stateFragment.columnSizing === 'object') {
    const newSizing: any = {};
    for (const k of Object.keys(stateFragment.columnSizing)) {
      if (validColIds.has(k)) newSizing[k] = stateFragment.columnSizing[k];
    }
    res.columnSizing = newSizing;
  }

  if (stateFragment.columnOrder && Array.isArray(stateFragment.columnOrder)) {
    res.columnOrder = stateFragment.columnOrder.filter((id: string) => validColIds.has(id));
  }
  
  return res;
};

interface UseDataViewProps<T> {
  data: T[];
  columns: ColumnDef<T, any>[];
  initialState?: {
    sorting?: SortingState;
    grouping?: GroupingState;
    columnVisibility?: VisibilityState;
    columnFilters?: ColumnFiltersState;
    globalFilter?: string;
  };
  onRowSelect?: (row: T) => void;
  onNew?: () => void;
  onResetFilters?: () => void;
  viewId?: string; // Must provide to persist saved views
  meta?: any;  
}

export function useDataView<T>(props: UseDataViewProps<T>) {
  const prefix = props.viewId ? `zns_view_${props.viewId}` : null;
  const route = props.viewId ? getRouteKey(props.viewId) : null;
  const storageKey = route ? `dataview:${route}:state` : null;
  const { user: currentUser, userData } = useAuth();
  const [authReady, setAuthReady] = useState(!!currentUser);

  useEffect(() => {
    setAuthReady(!!currentUser);
  }, [currentUser]);
  
  const getSaved = <S,>(key: string, defaultVal: S): S => {
    let result: any = defaultVal;
    // 1. Try unified dataview:{route}:state first
    if (storageKey) {
      try {
        const savedStr = localStorage.getItem(storageKey);
        if (savedStr) {
          const savedObj = JSON.parse(savedStr);
          if (savedObj && savedObj[key] !== undefined) {
            result = savedObj[key];
          }
        }
      } catch {
        // ignore
      }
    } else if (prefix) {
      // 2. Fallback to backward-compatible individual settings
      try {
         const item = localStorage.getItem(`${prefix}_${key}`);
         if (item) {
           result = JSON.parse(item);
         }
      } catch { /* ignore */ }
    }

    // Extract valid column ids from props
    const validColIds = new Set(props.columns.map(c => (c as any).accessorKey || (c as any).id || (c as any).header).filter(Boolean));
    
    if (key === 'grouping' && Array.isArray(result)) {
      return result.filter((colId: string) => validColIds.has(colId)) as any;
    }
    if (key === 'sorting' && Array.isArray(result)) {
       return result.filter((sortItem: any) => validColIds.has(sortItem.id)) as any;
    }
    if (key === 'columnVisibility' && result && typeof result === 'object') {
       const newVisibility: any = {};
       for (const k of Object.keys(result)) {
         if (validColIds.has(k)) {
           newVisibility[k] = result[k];
         }
       }
       return newVisibility as any;
    }
    if (key === 'columnFilters' && Array.isArray(result)) {
       return result.filter((filterItem: any) => validColIds.has(filterItem.id)) as any;
    }

    return result;
  };

  const { sorting, setSorting } = useDataViewSorting(props.initialState?.sorting, getSaved);
  const { grouping, setGrouping, expanded, setExpanded } = useDataViewGrouping(props.initialState?.grouping, getSaved);
  const { pagination, setPagination } = useDataViewPagination();

  const {
    columnVisibility, setColumnVisibility,
    columnSizing, setColumnSizing,
    columnOrder, setColumnOrder,
    columnFilters, setColumnFilters,
    globalFilter, setGlobalFilter, deferredGlobalFilter,
    density, setDensity,
    viewType, setViewType,
    activeRowIndex, setActiveRowIndex
  } = useDataViewBase(props.columns, props.initialState, route, getSaved);

  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;
    if (currentUser?.uid && props.viewId) {
       getSavedViews(currentUser.uid, route || undefined).then(views => {
         if (!isMounted) return;
         const filtered = views.filter(v => v.sourceId === props.viewId);
         setSavedViews(filtered);
       });
    }
    return () => { isMounted = false; };
  }, [currentUser?.uid, props.viewId, route]);

  const handleSaveCurrentView = async (name: string) => {
    if (!currentUser?.uid || !props.viewId) return;
    const newView: SavedView = {
      name,
      sourceId: props.viewId,
      state: {
        columnVisibility: columnVisibility as Record<string, boolean>,
        columnSizing,
        columnOrder,
        columnFilters: columnFilters as any[],
        sorting: sorting as any[],
        grouping: grouping as string[],
        density,
        viewType,
      },
    };
    try {
        await saveView(currentUser.uid, newView, route || undefined);
        getSavedViews(currentUser.uid, route || undefined).then(views => {
             const filtered = views.filter(v => v.sourceId === props.viewId);
             setSavedViews(filtered);
        });
    } catch (err: any) {
        console.error("Failed to save view", err);
        alert("Failed to save view: " + err.message);
    }
  };

  const handleDeleteSavedView = async (id: string) => {
    if (!currentUser?.uid) return;
    try {
        await deleteView(currentUser.uid, id, route || undefined);
        setSavedViews(prev => prev.filter(v => v.id !== id));
        if (activeViewId === id) setActiveViewId(undefined);
    } catch (err: any) {
        console.error("Failed to delete view", err);
        alert("Failed to delete view: " + err.message);
    }
  };

  const handlePublishAsOrgTemplate = async (isForced: boolean = false) => {
    if (!currentUser || !props.viewId) return;
    const viewState = {
      columnVisibility,
      columnSizing,
      columnOrder,
      columnFilters,
      sorting,
      grouping: [], // Luôn mặc định: Không gộp nhóm theo yêu cầu toàn hệ thống
      density,
      viewType,
    };
    try {
       await saveOrgTemplate(route!, viewState, props.viewId, isForced);
       getSavedViews(currentUser.uid, route || undefined).then(views => {
         const filtered = views.filter(v => v.sourceId === props.viewId);
         setSavedViews(filtered);
         setActiveViewId('__org_template__');
       });
    } catch(err: any) {
       alert("Lỗi khi lưu template tổ chức: " + err.message);
    }
  };

  const handleSelectView = (id: string) => {
    const view = savedViews.find(v => v.id === id);
    if (!view) return;
    setActiveViewId(id);
    const validColIds = new Set(props.columns.map(c => (c as any).accessorKey || (c as any).id || (c as any).header).filter(Boolean));
    const cleanState = sanitizeViewState(view.state, validColIds);
    
    if (cleanState.sorting) setSorting(cleanState.sorting);
    if (cleanState.grouping) setGrouping(cleanState.grouping || []);
    if (cleanState.columnVisibility) setColumnVisibility(cleanState.columnVisibility);
    if (cleanState.columnSizing) setColumnSizing(cleanState.columnSizing);
    if (cleanState.columnOrder) setColumnOrder(cleanState.columnOrder);
    if (cleanState.columnFilters) setColumnFilters(cleanState.columnFilters);
    if (view.state.density) setDensity(view.state.density);
    if (view.state.viewType) setViewType(view.state.viewType as ViewType);
  };

  // Sync to local storage
  useEffect(() => {
    if (storageKey) {
      const stateToSave = {
        sorting,
        grouping,
        columnVisibility,
        columnFilters,
        globalFilter,
        density,
        viewType,
        _local_updatedAt: Date.now()
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }
    
    // Maintain individual items for legacy compatibility
    if (prefix) {
      localStorage.setItem(`${prefix}_sorting`, JSON.stringify(sorting));
      localStorage.setItem(`${prefix}_grouping`, JSON.stringify(grouping));
      localStorage.setItem(`${prefix}_visibility`, JSON.stringify(columnVisibility));
      localStorage.setItem(`${prefix}_filters`, JSON.stringify(columnFilters));
      localStorage.setItem(`${prefix}_global`, JSON.stringify(globalFilter));
      localStorage.setItem(`${prefix}_density`, JSON.stringify(density));
      localStorage.setItem(`${prefix}_viewType`, JSON.stringify(viewType));
      localStorage.setItem(`${prefix}_local_updatedAt`, String(Date.now()));
    }
  }, [sorting, grouping, columnVisibility, columnFilters, globalFilter, density, viewType, storageKey, prefix]);

  const columnsRef = useRef(props.columns);
  columnsRef.current = props.columns;

  // Synchronize density with global localStorage key
  useEffect(() => {
    localStorage.setItem('dataview:density', density);
  }, [density]);

  // Synchronize columns configurator with localStorage `dataview:{route}:columns`
  useEffect(() => {
    if (route) {
      const config = {
        visibility: columnVisibility,
        sizing: columnSizing,
        order: columnOrder,
      };
      localStorage.setItem(`dataview:${route}:columns`, JSON.stringify(config));
    }
  }, [columnVisibility, columnSizing, columnOrder, route]);

  const handleResetAllFilters = () => {
    setColumnFilters([]);
    setGlobalFilter('');
    if (props.onResetFilters) {
      props.onResetFilters();
    }
  };

  const table = useReactTable<T>({
    data: props.data,
    getRowId: (row, index) => (row as any).id || index.toString(),
 
    columns: props.columns,
    defaultColumn: {
      filterFn: defaultColumnFilterFn,
    },
    state: {
      sorting,
      grouping,
      columnVisibility,
      columnFilters,
      columnSizing,
      columnOrder,
      globalFilter: deferredGlobalFilter,
      expanded,
      pagination,
    },
    columnResizeMode: 'onChange',
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    onPaginationChange: setPagination,
    globalFilterFn: vietnameseTextFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getRowCanExpand: () => true,
    autoResetExpanded: false,
    enableRowSelection: false,
    meta: props.meta,
  });

  useDataViewKeyboard({
    onNextRow: () => {
      setActiveRowIndex(prev => Math.min(prev + 1, table.getRowModel().rows.length - 1));
    },
    onPrevRow: () => {
      setActiveRowIndex(prev => Math.max(prev - 1, 0));
    },
    onNew: props.onNew,
    onEdit: () => {
      if (activeRowIndex >= 0 && activeRowIndex < table.getRowModel().rows.length) {
        const row = table.getRowModel().rows[activeRowIndex];
        props.onRowSelect?.(row.original as T);
      }
    },
  });

  const rootAggregates = useMemo(() => {
    const result: any = {};
    const extractors = props.columns.reduce((acc, col: any) => {
      const colId = col.id || col.accessorKey;
      if (colId) {
        acc[colId] = col.accessorFn || col.accessor || ((row: T) => (row as any)[col.accessorKey]);  
      }
      return acc;
    }, {} as Record<string, (row: T) => any>);

    props.columns.forEach((col: any) => {
      const colId = col.id || col.accessorKey;
      const agg = col.defaultAggregate || col.meta?.aggregate;
      if (colId && agg && aggregateFns[agg as keyof typeof aggregateFns]) {
        const values = props.data.map(extractors[colId]);
        result[colId] = (aggregateFns as any)[agg](values);
      }
    });
    return result;
  }, [props.data, props.columns]);

  return {
    table,
    sorting,
    setSorting,
    grouping,
    setGrouping,
    columnVisibility,
    setColumnVisibility,
    columnFilters,
    setColumnFilters,
    globalFilter,
    setGlobalFilter,
    activeRowIndex,
    setActiveRowIndex,
    rootAggregates,
    density,
    setDensity,
    viewType,
    setViewType,
    columnOrder,
    setColumnOrder,
    savedViews,
    activeViewId,
    isAdmin: userData?.role === 'Administrator' || userData?.role === 'Ban Giám Đốc',
    handleSelectView,
    handleSaveCurrentView,
    handleDeleteSavedView,
    handlePublishAsOrgTemplate,
    handleResetAllFilters,
  };
}

export default useDataView;
