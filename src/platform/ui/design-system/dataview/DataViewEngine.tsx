/* eslint-disable max-lines */
import React, { useEffect, useMemo } from 'react';
import { DataView } from './DataView';
import { DataViewToolbar } from './DataViewToolbar';
import { AggregateBar } from './AggregateBar';
import { useDataView } from './useDataView';
import { Table } from '@tanstack/react-table';
const KanbanBoard = React.lazy(() => import('./KanbanBoard').then(m => ({ default: m.KanbanBoard }))) as <T>(props: { table: Table<T>; onRowSelect?: (row: T) => void }) => React.ReactElement;
import { ChevronLeft, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react';
import { PageSkeleton } from '../skeletons/PageSkeleton';
import { Button } from '../Button';
import { EmptyState } from '../EmptyState';
import { ViewOption } from '../ViewSwitcher';

export interface DataViewEngineProps<T> {
  dataView: ReturnType<typeof useDataView<T>>;
  columns: any[]; 
  groupByOptions: { id: string; label: string }[];
  title?: string;
  searchTemplate?: string;
  aggregates?: { label: string; value: React.ReactNode; onClick?: () => void; isActive?: boolean }[]; 
  customAggregateBar?: React.ReactNode;
  emptyState?: React.ReactNode;
  renderGroupHeader?: (row: any) => React.ReactNode; 
  renderSubComponent?: (props: { row: any }) => React.ReactNode;
  onRowSelect?: (row: T) => void; 
  onRowDoubleClick?: (row: T) => void;
  onRowHover?: (row: T) => void;
  onRowEdit?: (row: T) => void;
  onRowZns?: (row: T) => void;
  onRowDelete?: (row: T) => void;
  customRowActions?: (row: T) => React.ReactNode;
  fetchMore?: () => void;
  isFetching?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onResetAllFilters?: () => void;
  entityFilters?: React.ReactNode;
  onImportExcel?: () => void;
  availableViews?: ViewOption[];
  hasActiveDomainFilters?: boolean;
  onCreateNew?: () => void;
  createNewLabel?: string;
  canCreate?: boolean;
  primaryAction?: React.ReactNode;
  extraActions?: React.ReactNode;
}

export function DataViewEngine<T>({
  dataView,
  columns,
  groupByOptions,
  title,
  searchTemplate,
  aggregates,
  customAggregateBar,
  emptyState: customEmptyState,
  renderGroupHeader,
  onRowSelect,
  onRowDoubleClick,
  onRowHover,
  onRowEdit,
  onRowZns,
  onRowDelete,
  customRowActions,
  fetchMore,
  isFetching,
  error,
  onRetry,
  onResetAllFilters,
 
  entityFilters,
  onImportExcel,
  renderSubComponent,
  availableViews,
  hasActiveDomainFilters,
  onCreateNew,
  createNewLabel,
  canCreate,
  primaryAction,
  extraActions
}: DataViewEngineProps<T>) {
  const { 
    table, 
    globalFilter, 
    setGlobalFilter, 
    sorting, 
    setSorting, 
    grouping, 
    setGrouping, 
    columnVisibility, 
    setColumnVisibility, 
    columnFilters, 
    setColumnFilters, 
    activeRowIndex, 
    density, 
    setDensity, 
    viewType,
    setViewType,
    savedViews, 
    activeViewId, 
    handleSelectView, 
    handleSaveCurrentView,
    handleDeleteSavedView
  } = dataView;

  // React on global density switcher event triggers
  const lastDensityRef = React.useRef(density);
  useEffect(() => {
    lastDensityRef.current = density;
  }, [density]);

  useEffect(() => {
    let isMounted = true;
    const handleGlobalDensity = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newD = customEvent.detail;
      if (newD && newD !== lastDensityRef.current) {
        lastDensityRef.current = newD;
        // Defer state update to next loop tick to prevent side-effects during mount/render
        setTimeout(() => {
          if (isMounted) {
            setDensity(newD);
          }
        }, 0);
      }
    };
    window.addEventListener('sgm_density_changed', handleGlobalDensity);
    return () => {
      isMounted = false;
      window.removeEventListener('sgm_density_changed', handleGlobalDensity);
    };
  }, [setDensity]);

  // Pagination page turning keyboard navigation support (ignores if focusing input elements)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl instanceof HTMLInputElement || 
        activeEl instanceof HTMLTextAreaElement || 
        activeEl?.isContentEditable
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (table.getCanPreviousPage()) {
          e.preventDefault();
          table.previousPage();
        }
      } else if (e.key === 'ArrowRight') {
        if (table.getCanNextPage()) {
          e.preventDefault();
          table.nextPage();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [table]);

  // Check if we show the debug/perf info: only if ?debug=perf is in query params
  const isDebugMode = typeof window !== 'undefined' && window.location.search.includes('debug=perf');

  // Render performance benchmarking
  const startTimeRef = React.useRef(0);
  startTimeRef.current = performance.now();
  const benchmarkRef = React.useRef<HTMLSpanElement>(null);

  const filteredData = table.getFilteredRowModel().rows;
  
  const pageIndex = table.getState().pagination?.pageIndex ?? 0;
  const pageSize = table.getState().pagination?.pageSize ?? 25;
  const totalCount = filteredData.length;
  const startItem = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endItem = Math.min((pageIndex + 1) * pageSize, totalCount);

  React.useLayoutEffect(() => {
    if (!isDebugMode) return;
    const elapsed = performance.now() - startTimeRef.current;
    if (benchmarkRef.current) {
      const mode = totalCount > 1000 ? 'Virtual-1K+' : 'Virtual-Active';
      benchmarkRef.current.innerText = `Render: ${elapsed.toFixed(1)}ms (${mode})`;
    }
  });

  // Dynamic context-aware Empty State resolver
  const resolvedEmptyState = useMemo(() => {
    if (customEmptyState) return customEmptyState;

    if (globalFilter && String(globalFilter).trim() !== '') {
      return (
        <EmptyState 
          variant="search"
          searchQuery={String(globalFilter)}
          onReset={() => {
            setGlobalFilter('');
          }}
        />
      );
    }

    if ((columnFilters && columnFilters.length > 0) || (globalFilter === '' && totalCount === 0 && table.getCoreRowModel().rows.length > 0)) {
      // Something matched 0 records but elements actually exist in the master core dataset
      return (
        <EmptyState 
          variant="filtered"
          onReset={() => {
            setColumnFilters([]);
            setGlobalFilter('');
            if (onResetAllFilters) onResetAllFilters();
          }}
        />
      );
    }

    return (
      <EmptyState 
        variant="empty"
      />
    );
  }, [customEmptyState, globalFilter, columnFilters, totalCount, table, onResetAllFilters, setGlobalFilter, setColumnFilters]);

  if (error) {
    return (
      <div className="flex flex-col h-full bg-slate-50 items-center justify-center p-12 text-center select-none">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Không tải được dữ liệu</h3>
        <p className="text-xs text-slate-500 mb-6 max-w-sm">Chi tiết lỗi: {error.message}</p>
        <Button variant="secondary" size="md" onClick={onRetry} className="flex items-center gap-1.5 px-4">
           Thử tải lại dữ liệu
        </Button>
      </div>
    );
  }

  if (isFetching && totalCount === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-slate-50/50 relative overflow-hidden rounded-xl border border-slate-200 bg-white">
       {/* Search and control bar */}
      <DataViewToolbar 
        title={title}
        searchTemplate={searchTemplate}
        globalFilter={globalFilter as string} setGlobalFilter={setGlobalFilter}
        sorting={sorting} setSorting={setSorting}
        grouping={grouping} setGrouping={setGrouping}
        columnVisibility={columnVisibility} setColumnVisibility={setColumnVisibility}
        columnOrder={dataView.columnOrder} onColumnOrderChange={dataView.setColumnOrder}
        columnFilters={columnFilters} setColumnFilters={setColumnFilters}
        availableColumns={columns.map((c: any) => ({ 
          id: c.id || c.accessorKey, 
          label: typeof c.header === 'string' ? c.header : (c.meta?.label || c.id || c.accessorKey), 
          size: c.size 
        })).filter((c: any) => c.id && c.id !== 'select' && c.id !== 'actions')}
        groupByOptions={groupByOptions}
        density={density}
        setDensity={setDensity}
        viewType={viewType}
        setViewType={setViewType}
        savedViews={savedViews}
        activeViewId={activeViewId}
        isAdmin={dataView.isAdmin}
        onSelectView={handleSelectView}
        onSaveCurrentView={handleSaveCurrentView}
        onDeleteView={handleDeleteSavedView}
        onPublishAsOrgTemplate={dataView.handlePublishAsOrgTemplate}
        availableViews={availableViews}
        entityFilters={entityFilters}
        onResetAllFilters={onResetAllFilters}
        hasActiveDomainFilters={hasActiveDomainFilters}
        isAllExpanded={dataView.table.getIsAllRowsExpanded()}
        onToggleExpandAll={() => dataView.table.toggleAllRowsExpanded()}
        onCreateNew={onCreateNew}
        createNewLabel={createNewLabel}
        canCreate={canCreate}
        primaryAction={primaryAction}
        extraActions={extraActions}
      />
      {customAggregateBar ? customAggregateBar : (aggregates && <AggregateBar stats={aggregates as any} />)}

      {/* Grid Canvas area */}
      <div className="flex-1 p-4 overflow-auto flex flex-col pt-0 bg-white min-h-0">
          {!filteredData.length && !isFetching && !grouping.length ? (
            <div className="p-8 flex flex-col items-center justify-center h-full">
              {resolvedEmptyState}
            </div>
          ) : viewType === 'board' || viewType === 'kanban' ? (
            <React.Suspense fallback={<PageSkeleton />}>
              <KanbanBoard 
                table={table} 
                onRowSelect={onRowSelect} 
              />
            </React.Suspense>
          ) : (
            <DataView 
              table={table} 
              activeRowIndex={activeRowIndex} 
              onRowSelect={onRowSelect} 
              onRowDoubleClick={onRowDoubleClick} 
              onRowHover={onRowHover}
              onRowEdit={onRowEdit}
              onRowZns={onRowZns}
              onRowDelete={onRowDelete}
              customRowActions={customRowActions}
              renderGroupHeader={renderGroupHeader} 
              renderSubComponent={renderSubComponent} 
              density={density} 
              fetchMore={fetchMore} 
              isFetching={isFetching} 
            />
          )}
      </div>

      {/* Refactored Pagination Footer - Enterprise Dense/Clean Style */}
      <div className="h-10 bg-white border-t border-slate-200/80 px-4 flex items-center justify-between shrink-0 select-none z-10 sticky bottom-0 text-2xs font-medium text-slate-500">
         <div className="flex items-center w-1/3">
           <span>
             <span className="font-semibold text-slate-700">{totalCount === 0 ? 0 : startItem}</span> – <span className="font-semibold text-slate-700">{endItem}</span> của <span className="font-semibold text-slate-700">{totalCount}</span>
           </span>
         </div>
         
         <div className="flex items-center justify-center gap-1 w-1/3">
           <Button 
             title="Trang trước"
             type="button"
             onClick={() => table.previousPage()}
             disabled={!table.getCanPreviousPage()}
             className="w-7 h-7 flex items-center justify-center rounded-[6px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors outline-none cursor-pointer"
           >
             <ChevronLeft className="w-4 h-4" /> 
           </Button>
           
           <div className="px-2 flex items-center h-7 rounded-[6px] hover:bg-slate-50 cursor-default select-none border border-transparent hover:border-slate-200/60 transition-colors">
              Trang <span className="font-bold text-slate-800 mx-1 w-4 text-center">{table.getPageCount() > 0 ? pageIndex + 1 : 0}</span> / <span className="ml-1 w-4 text-center">{table.getPageCount()}</span>
           </div>
           
           <Button 
             title="Trang sau"
             type="button"
             onClick={() => table.nextPage()}
             disabled={!table.getCanNextPage()}
             className="w-7 h-7 flex items-center justify-center rounded-[6px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors outline-none cursor-pointer"
           >
             <ChevronRight className="w-4 h-4" />
           </Button>
         </div>
         <div className="flex items-center justify-end w-1/3">
           <div className="flex items-center gap-2">
             <span>Hiển thị</span>
             <div className="relative">
               <select
                 aria-label="Kích thước trang hiển thị"
                 value={pageSize}
                 onChange={e => table.setPageSize(Number(e.target.value))}
                 className="h-7 text-2xs font-semibold text-slate-700 bg-transparent hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-[6px] pl-2 pr-6 focus:border-blue-500 focus:bg-white outline-none cursor-pointer appearance-none transition-all"
               >
                 {[25, 50, 100, 200, 500].map(sz => (
                   <option key={sz} value={sz}>{sz} dòng</option>
                 ))}
               </select>
               <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-slate-400">
                 <ChevronDown className="w-3.5 h-3.5" />
               </div>
             </div>
           </div>
         </div>
      </div>

      {isDebugMode && (
        <div className="fixed bottom-16 right-4 z-50 pointer-events-none">
          <span ref={benchmarkRef} className="font-mono text-2xs text-emerald-800 font-semibold bg-emerald-50 px-1.5 py-1 rounded shadow-sm flex items-center gap-1.5 border border-emerald-200 opacity-80" title="Chỉ số hiệu năng vẽ khung hình và ảo hóa">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Render: 0.0ms
          </span>
         </div>
      )}
    </div>
  );
}

export default DataViewEngine;
