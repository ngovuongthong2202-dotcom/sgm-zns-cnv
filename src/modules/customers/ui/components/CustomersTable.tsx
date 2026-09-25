import React, { useRef, useMemo, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { flexRender, Table } from '@tanstack/react-table';
import { Users } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { Customer } from '@/src/domain/schema/customer.schema';
import { t } from '@/src/i18n/vi';

interface CustomersTableProps {
  table: Table<Customer>;
  totalCustomersCount: number;
  density: 'compact' | 'normal' | 'comfortable';
  onUpdateCustomer: (id: string, updatedFields: Partial<Customer>) => Promise<void>;
  onSelectCustomer: (customer: Customer) => void;
  onClearFilters: () => void;
  fetchMore?: () => void;
  isFetching?: boolean;
}

export function CustomersTable({
  table,
  totalCustomersCount,
  density,
  onSelectCustomer,
  onClearFilters,
  fetchMore,
  isFetching,
}: CustomersTableProps) {
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { rows } = table.getRowModel();

  // Dynamic row height calculator based on styling density and multiple contacts
  const getRowHeight = (index: number) => {
    if (index >= rows.length) return 40; // Spinner/boundary bottom loader row
    const row = rows[index];
    if (row?.getIsGrouped()) return density === 'comfortable' ? 56 : 44;

    const contactsCount = Array.isArray(row?.original?.contacts) && row.original.contacts.length > 0
      ? row.original.contacts.filter(c => c && (c.sdt || c.nguoiDaiDien)).length
      : 1;
    const extraContacts = Math.max(0, contactsCount - 1);
    const extraHeight = extraContacts * 24;

    switch (density) {
      case 'compact':
        return 42 + extraHeight;
      case 'comfortable':
        return 68 + extraHeight;
      default:
        return 54 + extraHeight;
    }
  };

  // Setup virtualization sizing engine
  const rowVirtualizer = useVirtualizer({
    count: fetchMore ? rows.length + 1 : rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: getRowHeight,
    overscan: 12,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Force re-measurement of virtual elements when spacing density dynamically changes
  useEffect(() => {
    rowVirtualizer.measure();
  }, [density, rowVirtualizer]);

  // Trigger paginated fetch loader when scrolling reaches bottom items
  useEffect(() => {
    if (!fetchMore) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (!lastItem) return;

    if (lastItem.index >= rows.length - 1 && !isFetching) {
      fetchMore();
    }
  }, [virtualItems, fetchMore, isFetching, rows.length]);

  // Compute CSS column sizes dynamically
  const cssVars = useMemo(() => {
    const vars: Record<string, string> = {};
    table.getFlatHeaders().forEach((h) => {
      vars[`--col-${h.column.id}`] = `${h.getSize()}px`;
    });
    return vars;
  }, [table, table.getState().columnSizing]);

  // Differentiate Empty states clearly (Initial missing vs filtered matching zero matches)
  if (totalCustomersCount === 0 && !isFetching) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-12 text-center select-none bg-slate-50/10 min-h-[360px]">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 mb-4 border border-slate-200/50">
          <Users size={24} className="stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">{t('customer.empty.title')}</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-5 leading-normal">
          {t('customer.empty.description')}
        </p>
      </div>
    );
  }

  if (rows.length === 0 && !isFetching) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-12 text-center select-none bg-slate-50/10 min-h-[360px]">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 mb-4 border border-slate-200/50">
          <Users size={24} className="stroke-[1.5]" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900 mb-1">Không khớp bộ lọc</h3>
        <p className="text-sm text-slate-500 max-w-sm mb-5 leading-normal">
          Không phát hiện hồ sơ khách hàng nào phù hợp với điều kiện tìm kiếm hoặc phân loại hiện tại của bạn.
        </p>
        <Button
          variant="secondary"
          size="md"
          aria-label="Xóa bộ lọc"
          onClick={onClearFilters}
          className="border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
        >
          Xóa toàn bộ bộ lọc
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={tableContainerRef}
      className="flex-1 overflow-auto bg-white relative border border-slate-200/60 rounded-xl max-w-full"
      style={{ ...cssVars } as React.CSSProperties}
    >
      <div style={{ minWidth: table.getTotalSize(), width: 'max-content' }} className="flex flex-col min-w-full">
        {/* Table Sticky Headers */}
        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 shadow-[0_1px_2px_rgba(15,23,42,0.02)] z-20 flex min-w-full">
          {table.getHeaderGroups().map((headerGroup) => (
            <React.Fragment key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta as any;
                const alignClass =
                  meta?.align === 'right'
                    ? 'justify-end text-right'
                    : meta?.align === 'center'
                    ? 'justify-center text-center'
                    : 'justify-start text-left';
                return (
                  <div
                    key={header.id}
                    className={`px-4 py-3 text-2xs font-medium text-slate-500 uppercase tracking-widest whitespace-nowrap flex shrink-0 items-center select-none ${alignClass}`}
                    style={{ width: `var(--col-${header.column.id})` }}
                  >
                    <div
                      className={`flex items-center gap-1.5 cursor-pointer w-full truncate ${alignClass}`}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() ? (header.column.getIsSorted() === 'asc' ? ' 🔼' : ' 🔽') : null}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>

        {/* Scaled Virtual Body */}
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const isLoaderRow = virtualRow.index >= rows.length;
            if (isLoaderRow) {
              return (
                <div
                  key="loader-row"
                  className="absolute left-0 right-0 flex items-center justify-center py-4 text-xs font-mono text-slate-500"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  <div className="w-4 h-4 border-2 border-slate-350 border-t-slate-800 rounded-full animate-spin mr-2"></div>
                  Đang tải thêm khách hàng...
                </div>
              );
            }

            const row = rows[virtualRow.index];
            const isRowSelected = row.getIsSelected();

            if (row.getIsGrouped()) {
              return (
                <div
                  key={row.id}
                  role="row"
                  onClick={() => row.toggleExpanded()}
                  className="absolute left-0 right-0 flex items-center border-b border-slate-200 bg-slate-50/70 hover:bg-slate-100/80 transition-all cursor-pointer select-none px-6"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                    height: `${virtualRow.size}px`,
                  }}
                >
                  <div className="flex items-center gap-2.5 font-semibold text-slate-800 text-xs">
                    <span className="text-slate-500 w-4 flex items-center justify-center text-2xs">
                      {row.getIsExpanded() ? '▼' : '▶'}
                    </span>
                    <span className="uppercase text-2xs font-extrabold tracking-widest text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-[0_1px_1px_rgba(0,0,0,0.03)] font-sans">
                      {row.groupingColumnId === 'loaiKh' ? 'LOẠI KH' : row.groupingColumnId === 'tinhThanh' ? 'TỈNH/THÀNH' : row.groupingColumnId === 'nguoiPhuTrach' ? 'PHỤ TRÁCH' : row.groupingColumnId?.toUpperCase() || 'NHÓM'}
                    </span>
                    <span className="text-slate-950 font-semibold">
                      {String(row.getValue(row.groupingColumnId!)) || t('common.unassigned')}
                    </span>
                    <span className="text-xs font-normal text-slate-500 font-sans tracking-tight">
                      ({row.subRows.length} khách hàng)
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={row.id}
                role="row"
                onClick={() => onSelectCustomer(row.original)}
                className={`absolute left-0 right-0 flex items-stretch border-b border-slate-100 hover:bg-slate-50/60 transition-all cursor-pointer group select-none ${
                  isRowSelected ? 'bg-slate-50/80' : 'bg-white'
                }`}
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                  height: `${virtualRow.size}px`,
                }}
              >
                {row.getVisibleCells().map((cell) => {
                  const isActionColumn = cell.column.id === 'actions';
                  const meta = cell.column.columnDef.meta as any;
                  const alignClass =
                    meta?.align === 'right'
                      ? 'justify-end text-right'
                      : meta?.align === 'center'
                      ? 'justify-center text-center'
                      : 'justify-start text-left';

                  return (
                    <div
                      key={cell.id}
                      onClick={(e) => {
                        // Prevent row selection details if executing action buttons
                        if (isActionColumn) {
                          e.stopPropagation();
                        }
                      }}
                      className={`px-4 py-2 truncate flex shrink-0 items-center text-xs last:border-r-0 ${alignClass}`}
                      style={{ width: `var(--col-${cell.column.id})` }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
