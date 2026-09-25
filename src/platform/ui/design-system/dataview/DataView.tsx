import { Button } from '@/src/design-system';
import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { flexRender, Table } from '@tanstack/react-table';
import { DataViewRow } from './DataViewRow';
import { Eye, Pencil, Send, Trash2 } from 'lucide-react';

interface DataViewProps<T> {
  table: Table<T>;
  activeRowIndex: number;
  onRowSelect?: (row: T) => void;
  onRowDoubleClick?: (row: T) => void;
  onRowHover?: (row: T) => void;
  onRowEdit?: (row: T) => void;
  onRowZns?: (row: T) => void;
  onRowDelete?: (row: T) => void;
  customRowActions?: (row: T) => React.ReactNode;
  height?: number | string;
  renderGroupHeader?: (row: any) => React.ReactNode;  
  renderSubComponent?: (props: { row: any }) => React.ReactNode;  
  density?: 'compact' | 'normal' | 'comfortable';
}

  export function DataView<T>({ 
    table, 
    activeRowIndex, 
    onRowSelect, 
    onRowDoubleClick: _onRowDoubleClick, 
    onRowHover, 
    onRowEdit,
    onRowZns,
    onRowDelete,
    customRowActions,
    height = 'h-full', 
    renderGroupHeader, 
    renderSubComponent, 
    density = 'compact', 
    fetchMore, 
    isFetching 
  }: DataViewProps<T> & { fetchMore?: () => void, isFetching?: boolean }) {
    const tableContainerRef = useRef<HTMLDivElement>(null);
  
    const { rows } = table.getRowModel();
    const columnSizing = table.getState().columnSizing;
    
    // Context Menu State
    const [contextMenu, setContextMenu] = React.useState<{ x: number; y: number; row: T } | null>(null);

    React.useEffect(() => {
      const handleOutside = () => setContextMenu(null);
      window.addEventListener('click', handleOutside);
      window.addEventListener('contextmenu', handleOutside);
      return () => {
        window.removeEventListener('click', handleOutside);
        window.removeEventListener('contextmenu', handleOutside);
      };
    }, []);
  
    // PA3: Create dynamic CSS variables for pure CSS resizing without per-cell re-renders
    const cssVars = React.useMemo(() => {
      const vars: Record<string, string> = {};
      table.getFlatHeaders().forEach(h => {
        vars[`--col-${h.column.id}`] = `${h.getSize()}px`;
      });
      return vars;
    }, [columnSizing, table.getFlatHeaders()]);
  
    const getRowHeight = (index: number) => {
      if (index >= rows.length) return 32; // Spinner row
      const row = rows[index];
      if (row?.getIsGrouped()) return density === 'comfortable' ? 52 : 44;
      switch (density) {
        case 'compact': return 30; 
        case 'comfortable': return 44;
        default: return 36; // cozy or normal behavior
      }
    };
  
    const rowVirtualizer = useVirtualizer({
      count: fetchMore ? rows.length + 1 : rows.length,
      getScrollElement: () => tableContainerRef.current,
      estimateSize: getRowHeight,
      overscan: 5,
      measureElement: (element, entry, _virtualizer) => {
        if (entry) {
          return entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        }
        return element.getBoundingClientRect().height;
      },
      enabled: true,
    });

    const virtualItems = rowVirtualizer.getVirtualItems();

    // Listen to rows expanded/collapsed and trigger re-measure
    const expandedState = table.getState().expanded;
    React.useEffect(() => {
      rowVirtualizer.measure();
    }, [expandedState, rowVirtualizer]);

    React.useEffect(() => {
      if (!fetchMore) return;
      const lastItem = virtualItems[virtualItems.length - 1];
      if (!lastItem) return;

      if (lastItem.index >= rows.length - 1 && !isFetching) {
        fetchMore();
      }
    }, [virtualItems, fetchMore, isFetching, rows.length]);
  
    return (
      <div
        ref={tableContainerRef}
        className="overflow-auto border border-slate-200 rounded-xl bg-white relative"
        style={{ height, ...cssVars } as React.CSSProperties}
      >
        <div style={{ minWidth: table.getTotalSize(), width: 'max-content' }} className="flex flex-col min-w-full">
          {/* Header */}
          <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm border-b border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.02)] z-[20] flex min-w-full">
            {table.getHeaderGroups().map(headerGroup => (
              <React.Fragment key={headerGroup.id}>
                {headerGroup.headers.map(header => {
                  if (header.column.getIsGrouped()) return null; // [Redesign] Hide grouped column headers natively
                  const meta = header.column.columnDef.meta as any | undefined;
                  const alignClass = meta?.align === 'right' ? 'justify-end text-right' : meta?.align === 'center' ? 'justify-center text-center' : 'justify-start text-left';
                  const isSticky = false; // meta?.isSticky;
                  const stickRight = false; // meta?.stickRight;
                  const hiddenOnTablet = meta?.hiddenOnTablet;
                  return (
                    <div
                      key={header.id}
                      className={`px-4 py-2 text-2xs font-semibold text-slate-500 normal-case tracking-normal whitespace-nowrap relative group select-none flex-shrink-0 items-center ${alignClass} ${isSticky ? 'sticky left-0 bg-slate-50/95 z-30 shadow-[inset_-1px_0_0_#e2e8f0]' : ''} ${stickRight ? 'sticky right-0 bg-slate-50/95 z-30 shadow-[inset_1px_0_0_#e2e8f0]' : ''} ${hiddenOnTablet ? 'hidden xl:flex' : 'flex'}`}
                      style={{ width: `calc(var(--col-${header.column.id}) + 0px)` }}
                    >
                      <div className={`flex items-center gap-2 cursor-pointer ${alignClass} w-full truncate`} onClick={header.column.getToggleSortingHandler()}>
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {{
                          asc: ' 🔼',
                          desc: ' 🔽',
                        }[header.column.getIsSorted() as string] ?? null}
                      </div>
                      {/* Resize Handle */}
                      <div
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        className={`absolute right-0 top-0 h-full w-4 cursor-col-resize user-select-none touch-none flex justify-center items-center group-hover:opacity-100 ${
                          header.column.getIsResizing() ? 'opacity-100' : 'opacity-0'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={`w-1 h-full transition-colors ${header.column.getIsResizing() ? 'bg-brand-accent' : 'bg-slate-300'}`} />
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          
          {/* Body */}
          <div className="relative min-w-full" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
            {virtualItems.map(virtualRow => {
              if (virtualRow.index >= rows.length) {
                return null;
              }
              const row = rows[virtualRow.index];
              const isActive = virtualRow.index === activeRowIndex;
              const visibleColumnIds = table.getVisibleFlatColumns().map(c => c.id).join(',') + '|' + (table.getState().columnOrder?.join(',') || '');
              return (
               <DataViewRow 
                   key={row.id}
                   row={row}
                   virtualRow={virtualRow}
                   visibleColumnIds={visibleColumnIds}
                   isActive={isActive}
                   isSelected={row.getIsSelected()}
                   isSomeSelected={row.getIsSomeSelected()}
                   isExpanded={row.getIsExpanded()}
                   density={density}
                   renderGroupHeader={renderGroupHeader}
                   renderSubComponent={renderSubComponent}
                   onRowSelect={onRowSelect}
                   onRowHover={onRowHover}
                   onRowEdit={onRowEdit}
                   onRowZns={onRowZns}
                   onRowDelete={onRowDelete}
                   customRowActions={customRowActions}
                   onContextMenu={(e) => {
                     e.preventDefault();
                     setContextMenu({ x: e.clientX, y: e.clientY, row: row.original as T });
                   }}
                   measureElement={rowVirtualizer.measureElement}
                />
              );
            })}
          </div>
        </div>

        {/* Custom Context Menu */}
        {contextMenu && (
          <div 
            className="fixed bg-white border border-slate-200/95 shadow-[0_4px_16px_rgba(15,23,42,0.12)] rounded-lg py-1 z-[9999] min-w-[160px] select-none text-slate-750 font-sans"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={() => setContextMenu(null)}
          >
            <Button 
              type="button" 
              onClick={() => onRowSelect?.(contextMenu.row)}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent text-slate-700 font-medium cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>Xem chi tiết</span>
            </Button>
            {onRowEdit && (
              <Button 
                type="button" 
                onClick={() => onRowEdit(contextMenu.row)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent text-slate-700 font-medium cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-400" />
                <span>Chỉnh sửa</span>
              </Button>
            )}
            {onRowZns && (
              <Button 
                type="button" 
                onClick={() => onRowZns(contextMenu.row)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center gap-2 border-0 bg-transparent text-slate-700 font-medium cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-slate-400" />
                <span>Gửi tin ZNS</span>
              </Button>
            )}
            {onRowDelete && (
              <div className="border-t border-slate-100 my-1"></div>
            )}
            {onRowDelete && (
              <Button 
                type="button" 
                onClick={() => onRowDelete(contextMenu.row)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-650 flex items-center gap-2 border-0 bg-transparent font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
                <span>Xóa bản ghi</span>
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }
