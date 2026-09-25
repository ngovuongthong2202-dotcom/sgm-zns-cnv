import { Button } from '@/src/design-system';
import React from 'react';
import { flexRender, Row, Cell } from '@tanstack/react-table';
import { Eye, Pencil, Send, Trash2 } from 'lucide-react';

export interface DataViewRowProps {
  row: Row<any>;
  virtualRow: { index: number; start: number; size: number };
  visibleColumnIds: string;
  isActive: boolean;
  isSelected?: boolean;
  isSomeSelected?: boolean;
  isExpanded?: boolean;
  density?: 'compact' | 'normal' | 'comfortable';
  renderGroupHeader?: (row: Row<any>) => React.ReactNode;
  renderSubComponent?: (props: { row: Row<any> }) => React.ReactNode;
  onRowSelect?: (row: any) => void;
  onRowDoubleClick?: (row: any) => void;
  onRowHover?: (row: any) => void;
  onRowEdit?: (row: any) => void;
  onRowZns?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  customRowActions?: (row: any) => React.ReactNode;
  onContextMenu?: React.MouseEventHandler<HTMLDivElement>;
  measureElement: (element: HTMLElement | null) => void;
}

export const DataViewRow = React.memo(({ 
  row: typedRow, 
  virtualRow: typedVirtualRow, 
  isActive, 
  isSelected,
  isSomeSelected,
  density, 
  renderGroupHeader,
  renderSubComponent,
  onRowSelect, 
  onRowDoubleClick,
  onRowHover,
  onRowEdit,
  onRowZns,
  onRowDelete,
  customRowActions,
  onContextMenu,
  measureElement 
}: DataViewRowProps) => {  
  const isOdd = typedVirtualRow.index % 2 === 1;
  const bgClass = isSelected || isSomeSelected
    ? 'bg-blue-50/80 border-l-[3px] border-l-blue-600'
    : isActive
    ? 'bg-blue-50/40 border-l-[3px] border-l-blue-500'
    : isOdd
    ? 'bg-[#F8FAFC] border-l-[3px] border-l-transparent'
    : 'bg-white border-l-[3px] border-l-transparent';

  return (
    <div
      role="row"
      aria-expanded={typedRow.getIsGrouped() ? typedRow.getIsExpanded() : undefined}
      tabIndex={0}
      data-index={typedVirtualRow.index}
      ref={measureElement}
      className={`absolute top-0 left-0 min-w-full flex flex-col border-b border-slate-150/60 transition-all duration-150 cursor-pointer group/row outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 hover:bg-blue-50/70 hover:text-blue-950 ${bgClass}`}
      style={{
        transform: `translateY(${typedVirtualRow.start}px)`,
        height: 'auto', // Always use 'auto' to allow dynamic natural height measurement & prevent circular layout cache lock!
      }}
      onMouseEnter={() => {
        if (!typedRow.getIsGrouped() && onRowHover) {
          onRowHover(typedRow.original);
        }
      }}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        if (e.defaultPrevented) return;
        if (typedRow.getIsGrouped()) {
          typedRow.toggleExpanded();
        } else {
          onRowSelect?.(typedRow.original);
        }
      }}
      onDoubleClick={(e) => {
        if (e.defaultPrevented) return;
        if (!typedRow.getIsGrouped()) {
          onRowDoubleClick?.(typedRow.original);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (typedRow.getIsGrouped()) typedRow.toggleExpanded();
          else onRowSelect?.(typedRow.original);
        }
      }}
    >
      {typedRow.getIsGrouped() ? (
          <div className="flex items-center w-full py-2 bg-slate-50 border-b border-slate-200 sticky left-0 z-20 group/header hover:bg-slate-100 transition-colors cursor-pointer" 
               onClick={(e) => {
                 e.stopPropagation();
                 typedRow.toggleExpanded();
               }}
               style={{ paddingLeft: `${typedRow.depth * 28 + 16}px`, paddingRight: '16px' }}
          >
            <div className={`flex items-center justify-center shrink-0 w-5 h-5 mr-3 rounded hover:bg-slate-200/80 transition-colors ${typedRow.getIsExpanded() ? 'bg-blue-100 text-blue-700' : 'text-slate-500 bg-white border border-slate-200 shadow-sm'}`}>
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${typedRow.getIsExpanded() ? 'rotate-90' : 'rotate-0'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
               <span className="font-bold text-sm text-slate-800 tracking-tight">
                  {String(typedRow.getValue(typedRow.groupingColumnId || '') || '(Chưa phân loại)')}
               </span>
               <span className="text-2xs font-semibold whitespace-nowrap tracking-tight px-2 py-0.5 rounded bg-white text-slate-600 border border-slate-200 shadow-sm leading-none shrink-0">
                 {typedRow.getLeafRows().length}
               </span>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 ml-4 pl-4 border-l border-slate-300/60 text-slate-600">
               {typedRow.getVisibleCells().map(cell => {
                 if (cell.getIsAggregated()) {
                   const val = cell.getValue();
                   if (val == null) return null;
                   
                   const isNumeric = typeof val === 'number' || (cell.column.columnDef.meta as any)?.align === 'right';
                   if (isNumeric && typeof val === 'number') {
                     const formatted = new Intl.NumberFormat('vi-VN').format(val);
                     const metaLabel = (cell.column.columnDef.meta as any)?.label;
                     let label = metaLabel || (typeof cell.column.columnDef.header === 'string' ? cell.column.columnDef.header : cell.column.id);
                     if (label === 'soBaoGia') label = 'Số BG';
                     if (label === 'soHopDongRef') label = 'Hợp Đồng';
                     if (label === 'soDonHang') label = 'Số ĐH';
                     if (label === 'soLuotGiao') label = 'Số PG';
                     
                     // Determine unit
                     const lowerLabel = String(label).toLowerCase();
                     const lowerId = String(cell.column.id).toLowerCase();
                     const isCurrencyMatch = ['đơn giá', 'tiền', 'doanh thu', 'công nợ', 'vnd', 'trị giá', 'giá trị'].some(kw => lowerLabel.includes(kw)) 
                                        || ['giatri', 'tien', 'doanhthu', 'congno', 'sotien'].some(kw => lowerId.includes(kw));
                     // Explicitly exclude count/number metrics even if they contain the words
                     const isCount = ['số lượng', 'số ', 'sl '].some(kw => lowerLabel.includes(kw)) || lowerId.includes('count') || lowerId.startsWith('so');
                     const metaUnit = (cell.column.columnDef.meta as any)?.unit;
                     
                     const unitText = metaUnit !== undefined ? metaUnit : (isCurrencyMatch && !isCount ? 'VNĐ' : '');

                     return (
                       <div key={cell.id} className="flex items-center gap-1.5 shrink-0 text-xs bg-white px-2 py-0.5 rounded border border-slate-200 shadow-xs">
                         <span className="text-slate-500 font-medium">{label}:</span>
                         <span className="font-mono font-bold text-blue-700">{formatted}{unitText ? <span className="text-2xs text-slate-500 font-sans font-normal ml-0.5">{unitText}</span> : null}</span>
                       </div>
                     );
                   }
                 }
                 return null;
               })}
            </div>

            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20 rounded-r-md pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
      ) : (() => {
        const rowContent = (
          <div className="flex flex-col w-full min-w-max relative z-0 group-hover:z-20">
             <div className={`flex items-stretch min-w-full transition-all relative group bg-transparent`} style={{ height: density === 'compact' ? 32 : 40 }}>
              {typedRow.getVisibleCells().filter((cell: Cell<any, any>) => !cell.column.getIsGrouped()).map((typedCell: Cell<any, any>, index: number) => {
                const isSticky = false; // (typedCell.column.columnDef.meta as any | undefined)?.isSticky;
                const stickRight = false; // (typedCell.column.columnDef.meta as any | undefined)?.stickRight;
                const hiddenOnTablet = (typedCell.column.columnDef.meta as any | undefined)?.hiddenOnTablet;
                
                if (typedCell.getIsPlaceholder()) return <div key={typedCell.id} style={{ width: `calc(var(--col-${typedCell.column.id}) + 0px)` }} className={`flex-shrink-0 ${hiddenOnTablet ? 'hidden xl:flex' : 'flex'}`} />;
                
                const pyClass = density === 'compact' ? 'py-0.5 text-2xs' : density === 'comfortable' ? 'py-2 text-xs' : 'py-1 text-xs';
                const alignClass = (typedCell.column.columnDef.meta as any | undefined)?.align === 'right' ? 'justify-end text-right' : (typedCell.column.columnDef.meta as any | undefined)?.align === 'center' ? 'justify-center text-center' : 'justify-start text-left';
                
                const depthPadding = index === 0 ? typedRow.depth * 24 : 0;
                const cellValue = typedCell.getValue();
                const isNumeric = (typedCell.column.columnDef.meta as any)?.align === 'right' || (typedCell.column.columnDef.meta as any)?.isNumeric || typeof cellValue === 'number';
                const isDate = (typedCell.column.columnDef.meta as any)?.isDate || (typeof cellValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(cellValue));
                const tabularClass = (isNumeric || isDate) ? 'font-mono tabular-nums tracking-tight' : 'font-sans';
                
                return (
                  <div
                    key={typedCell.id}
                    onClick={(e) => {
                      // if actionable column, stop propagation entirely so it doesn't open drawer
                      if (typedCell.column.id === 'actions' || stickRight) {
                        e.stopPropagation();
                      }
                    }}
                    className={`px-4 ${pyClass} flex-shrink-0 flex items-center ${alignClass} overflow-hidden ${isSticky ? `sticky left-0 z-10 shadow-[inset_-1px_0_0_#e2e8f0] bg-inherit` : ''} ${stickRight ? `sticky right-0 z-10 shadow-[inset_1px_0_0_#e2e8f0] bg-inherit max-xl:opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity` : ''} ${hiddenOnTablet ? 'hidden xl:flex' : 'flex'}`}
                    style={{ width: index === 0 ? `calc(var(--col-${typedCell.column.id}) + ${depthPadding}px)` : `calc(var(--col-${typedCell.column.id}) + 0px)`, paddingLeft: index === 0 ? `${16 + depthPadding}px` : undefined }}
                  >
                    <div 
                      className={`truncate w-full ${tabularClass}`} 
                      title={typeof cellValue === 'string' || typeof cellValue === 'number' ? String(cellValue) : undefined}
                    >
                      {flexRender(typedCell.column.columnDef.cell, typedCell.getContext())}
                    </div>
                  </div>
                );
              })}

             {/* Hover Actions deck overlay */}
             {!typedRow.getIsGrouped() && (
               <div className="sticky right-0 flex-shrink-0 w-0 h-full z-30 pointer-events-none">
                 <div 
                   className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover/row:opacity-100 pointer-events-none group-hover/row:pointer-events-auto flex items-center gap-1 bg-white/95 border border-slate-200/90 rounded-[8px] p-0.5 shadow-md shadow-slate-200/40 backdrop-blur-sm transition-opacity duration-150 select-none"
                   onClick={(e) => e.stopPropagation()}
                 >
                   <Button 
                   type="button"
                   title="Xem chi tiết" 
                   onClick={(e) => { e.stopPropagation(); onRowSelect?.(typedRow.original); }} 
                   className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                 >
                   <Eye className="w-3.5 h-3.5" />
                 </Button>
                 {onRowEdit && (
                   <Button 
                     type="button"
                     title="Chỉnh sửa" 
                     onClick={(e) => { e.stopPropagation(); onRowEdit?.(typedRow.original); }} 
                     className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                   >
                     <Pencil className="w-3.5 h-3.5" />
                   </Button>
                 )}
                 {onRowZns && (
                   <Button 
                     type="button"
                     title="Gửi tin ZNS" 
                     onClick={(e) => { e.stopPropagation(); onRowZns?.(typedRow.original); }} 
                     className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                   >
                     <Send className="w-3.5 h-3.5" />
                   </Button>
                 )}
                 {onRowDelete && (
                   <Button 
                     type="button"
                     title="Xoá" 
                     onClick={(e) => { e.stopPropagation(); onRowDelete?.(typedRow.original); }} 
                     className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </Button>
                 )}
                 {customRowActions && customRowActions(typedRow.original)}
                 </div>
               </div>
             )}
            </div>
             
             {typedRow.getIsExpanded() && renderSubComponent && (
               <div className="w-full sticky left-0 border-t border-slate-200 bg-slate-50/50 cursor-default" onClick={(e) => e.stopPropagation()}>
                  {renderSubComponent({ row: typedRow })}
               </div>
             )}
          </div>
        );
        return rowContent;
      })()}
    </div>
  );
}, (prevProps: DataViewRowProps, nextProps: DataViewRowProps) => {
  const prevRow = prevProps.row;
  const nextRow = nextProps.row;
  const prevVirtualRow = prevProps.virtualRow;
  const nextVirtualRow = nextProps.virtualRow;
  return (
    prevVirtualRow.start === nextVirtualRow.start &&
    prevVirtualRow.size === nextVirtualRow.size &&
    prevVirtualRow.index === nextVirtualRow.index &&
    prevProps.visibleColumnIds === nextProps.visibleColumnIds &&
    prevProps.isActive === nextProps.isActive &&
    prevProps.density === nextProps.density &&
    prevProps.isExpanded === nextProps.isExpanded &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSomeSelected === nextProps.isSomeSelected &&
    (prevRow.original as any)?.id === (nextRow.original as any)?.id &&
    (prevRow.original as any)?.updatedAt === (nextRow.original as any)?.updatedAt
  );
});
