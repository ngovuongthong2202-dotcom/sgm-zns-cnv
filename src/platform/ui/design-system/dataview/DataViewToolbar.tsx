import React, { useState } from 'react';
import { Search, X, ArrowUpDown, Plus } from 'lucide-react';
import { SortingState, ColumnFiltersState, VisibilityState, GroupingState } from '@tanstack/react-table';
import { SortMenu } from '../SortMenu';
import { GroupMenu } from '../GroupMenu';
import { SavedViewsMenu } from '../SavedViewsMenu';
import { ColumnsManager } from '../ColumnsManager';
import { useDebounce } from '@/src/hooks/useDebounce';
import { SavedView } from './savedViews';
import { ViewSwitcher, ViewOption, ViewType } from '../ViewSwitcher';
import { Button } from '../Button';
import { Tooltip } from '../Tooltip';

export interface DataViewToolbarProps {
  title?: string;
  searchTemplate?: string;
  globalFilter: string;
  setGlobalFilter: (val: string) => void;
  sorting: SortingState;
  setSorting: (val: SortingState) => void;
  grouping: GroupingState;
  setGrouping: (val: GroupingState) => void;
  columnVisibility: VisibilityState;
  setColumnVisibility: (val: VisibilityState) => void;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
  columnFilters: ColumnFiltersState;
  setColumnFilters: (val: ColumnFiltersState) => void;
  availableColumns: { id: string; label: string }[];
  groupByOptions: { id: string; label: string }[];
  density?: 'compact' | 'normal' | 'comfortable';
  setDensity?: (val: 'compact' | 'normal' | 'comfortable') => void;
  viewType?: ViewType;
  setViewType?: (val: ViewType) => void;
  savedViews?: SavedView[]; 
  activeViewId?: string;
  isAdmin?: boolean;
  onSelectView?: (id: string) => void;
  onSaveCurrentView?: (name: string) => void;
  onDeleteView?: (id: string) => void;
  onPublishAsOrgTemplate?: (isForced: boolean) => void;
  availableViews?: ViewOption[];
  entityFilters?: React.ReactNode;
  onResetAllFilters?: () => void;
  hasActiveDomainFilters?: boolean;
  isAllExpanded?: boolean;
  onToggleExpandAll?: () => void;
  onCreateNew?: () => void;
  createNewLabel?: string;
  canCreate?: boolean;
  primaryAction?: React.ReactNode;
  extraActions?: React.ReactNode;
}

export function DataViewToolbar({
  title,
  globalFilter,
  setGlobalFilter,
  searchTemplate = "Tìm kiếm...",
  sorting,
  setSorting,
  grouping,
  setGrouping,
  columnVisibility,
  setColumnVisibility,
  columnOrder,
  onColumnOrderChange,
  columnFilters,
  setColumnFilters,
  availableColumns,
  groupByOptions,
  density: _density = 'normal',
  setDensity: _setDensity,
  viewType = 'table',
  setViewType,
  savedViews = [],
  activeViewId,
  isAdmin,
  onSelectView,
  onSaveCurrentView,
  onDeleteView,
  onPublishAsOrgTemplate,
  availableViews = [],
  entityFilters,
  onResetAllFilters,
  hasActiveDomainFilters = false,
  isAllExpanded,
  onToggleExpandAll,
  onCreateNew,
  createNewLabel = "Tạo mới",
  canCreate = true,
  primaryAction,
  extraActions,
}: DataViewToolbarProps) {
  const [searchTerm, setSearchTerm] = useState(globalFilter || '');
  const debouncedSearch = useDebounce(searchTerm, 250);

  React.useEffect(() => {
    if (debouncedSearch !== globalFilter) {
      setGlobalFilter(debouncedSearch);
    }
  }, [debouncedSearch, globalFilter, setGlobalFilter]);

  React.useEffect(() => {
    setSearchTerm(globalFilter || '');
  }, [globalFilter]);

  const removeFilter = (id: string) => {
    setColumnFilters(columnFilters.filter(f => f.id !== id));
  };

  const handleResetAllFilters = () => {
    setColumnFilters([]);
    setGlobalFilter('');
    if (onResetAllFilters) {
      onResetAllFilters();
    }
  };

  return (
    <>
      <div className="sticky top-0 z-[40] w-full shrink-0 flex flex-col bg-white border-b border-slate-200/80 shadow-sm">
        {/* MAIN TOOLBAR ROW */}
        <div className="flex items-center gap-3 px-5 min-h-[52px] w-full flex-nowrap">
          
          {/* Left Side: Title & Search */}
          {title && (
            <h2 className="text-sm font-semibold text-slate-900 shrink-0 mr-2">{title}</h2>
          )}
          
          <div className="relative group w-full max-w-[260px] shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors w-4 h-4" strokeWidth={2} />
            <input 
              aria-label="Tìm kiếm nhanh dữ liệu"
              type="text"
              placeholder={searchTemplate}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 h-8 rounded-lg bg-slate-100/80 hover:bg-slate-200/50 focus:bg-white border focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 border-transparent outline-none transition-all placeholder:text-slate-500 text-slate-800 text-xs font-medium placeholder:font-medium"
            />
            {searchTerm && (
              <Button 
                type="button" 
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer border-0 inline-flex items-center justify-center shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="w-px h-5 bg-slate-200 mx-1 hidden md:block shrink-0" />

          {/* Filters & View Switches Inline */}
          <div className="flex items-center gap-2 flex-1 min-w-0 shrink py-1 flex-nowrap overflow-x-auto no-scrollbar">
            {entityFilters}
          </div>

          {/* Right Actions: Sort, Group, Columns */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Sort */}
            <div className="h-8 w-8 hover:bg-slate-50 transition-colors flex items-center justify-center cursor-pointer shrink-0 rounded-md shadow-sm border border-slate-200 bg-white">
              <SortMenu sorting={sorting} onSortingChange={setSorting} availableColumns={availableColumns} customTrigger={
                <Button type="button" className="h-full w-full flex items-center justify-center border-none bg-transparent cursor-pointer outline-none relative group tooltip-trigger" variant="ghost">
                  <ArrowUpDown className="w-4 h-4 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  {sorting.length > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />}
                </Button>
              } />
            </div>

            {/* Group */}
            {groupByOptions && groupByOptions.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <GroupMenu grouping={grouping} onGroupingChange={setGrouping} options={groupByOptions} />
                {grouping && grouping.length > 0 && onToggleExpandAll && (
                  <Button
                    type="button"
                    onClick={onToggleExpandAll}
                    className="h-8 px-3 flex items-center justify-center gap-1.5 text-xs font-medium border bg-white border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 transition-colors shrink-0 whitespace-nowrap shadow-sm cursor-pointer"
                    title={isAllExpanded ? "Thu gọn tất cả nhóm" : "Mở rộng tất cả nhóm"}
                   variant="secondary" size="sm">
                    {isAllExpanded ? "Thu gọn" : "Mở rộng"}
                  </Button>
                )}
              </div>
            )}

            {/* Views / Segmenting */}
            <div className="h-8 flex items-center justify-center shrink-0">
              <SavedViewsMenu 
                views={savedViews} 
                activeViewId={activeViewId} 
                isAdmin={isAdmin}
                onSelectView={onSelectView || (() => {})} 
                onSaveCurrentView={onSaveCurrentView || (() => {})} 
                onDeleteView={onDeleteView}
                onPublishAsOrgTemplate={onPublishAsOrgTemplate}
                onResetAllFilters={handleResetAllFilters}
              />
            </div>

            {/* View switcher */}
            {setViewType && availableViews && availableViews.length > 0 && (
              <div className="h-8 shrink-0">
                <ViewSwitcher 
                  view={viewType as any} 
                  availableViews={availableViews} 
                  onChange={(val) => setViewType(val)} 
                />
              </div>
            )}
            
            {/* Columns */}
            <div className="shrink-0 ml-1">
              <ColumnsManager
                availableColumns={availableColumns}
                visibility={columnVisibility}
                onVisibilityChange={setColumnVisibility}
                columnOrder={columnOrder}
                onColumnOrderChange={onColumnOrderChange}
              />
            </div>
            
            {extraActions && (
              <div className="flex items-center gap-2 shrink-0 ml-1 border-l border-slate-200 pl-3">
                {extraActions}
              </div>
            )}
            
            {(onCreateNew || primaryAction) && (
              <div className="shrink-0 ml-1">
                {onCreateNew ? (
                  canCreate ? (
                    <Button variant="primary" size="md" onClick={onCreateNew} title={createNewLabel} className="px-2.5">
                       <Plus className="w-5 h-5" />
                    </Button>
                  ) : (
                    <Tooltip content="Bạn không có quyền thực hiện chức năng này">
                      <div className="inline-block cursor-not-allowed">
                        <Button variant="primary" size="md" disabled title={createNewLabel} className="px-2.5 pointer-events-none">
                           <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </Tooltip>
                  )
                ) : primaryAction}
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE FILTER CHIPS ROW (Only if customized) */}
        {(columnFilters.length > 0 || hasActiveDomainFilters) && (
          <div className="flex items-center justify-between px-5 py-2 bg-slate-50/50 border-t border-slate-100 gap-3 w-full shrink-0">
            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {columnFilters.map(filter => {
                const colLabel = availableColumns.find(c => c.id === filter.id)?.label || filter.id;
                let displayVal: string;
                if (Array.isArray(filter.value)) {
                  if (filter.value.length === 2 && filter.value.some(v => v && v.includes('-'))) {
                    const [start, end] = filter.value;
                    displayVal = start && end ? `${start} ~ ${end}` : start ? `>= ${start}` : end ? `<= ${end}` : 'Tất cả';
                  } else {
                    displayVal = filter.value.join(', ');
                  }
                } else {
                  displayVal = String(filter.value);
                }
                if (!displayVal || displayVal === 'all') return null;

                return (
                  <span key={filter.id} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full bg-blue-50/80 text-blue-700 text-2xs font-bold border border-blue-200/60 shrink-0 shadow-sm leading-none">
                    <span className="font-semibold text-blue-600/80">{colLabel}:</span> {displayVal}
                    <Button 
                      type="button" 
                      variant="ghost"
                      size="xs"
                      iconOnly
                      onClick={() => removeFilter(filter.id)} 
                      className="hover:bg-blue-200/50 rounded-full p-0.5 -mr-1 text-blue-600"
                      aria-label={`Xoá bộ lọc ${colLabel}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </span>
                );
              })}
            </div>

            <div className="flex items-center shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="xs"
                onClick={handleResetAllFilters}
                className="text-2xs font-bold text-slate-700 hover:text-slate-900 ml-auto whitespace-nowrap shrink-0"
                aria-label="Xoá tất cả bộ lọc đang áp dụng"
              >
                Xoá bộ lọc
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

