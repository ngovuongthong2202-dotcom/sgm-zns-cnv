/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionGlobalConfig } from 'motion/react';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
MotionGlobalConfig.skipAnimations = true;

vi.mock('@/src/shared/config/supabase.client', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
  default: {},
}));
vi.mock('swr', () => ({ default: () => ({ data: [], isLoading: false, error: null }), mutate: vi.fn() }));
vi.mock('@/src/data/realtime-store', () => ({
  useRealtimeCollection: () => ({ data: [], isLoading: false }),
  realtimeStore: { subscribe: vi.fn() },
}));
vi.mock('@/src/modules/iam/ui/AuthContext', () => ({
  useAuth: () => ({ user: { uid: '123' }, hasRole: () => true }),
}));
vi.mock('@/src/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/src/platform/ui/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/src/contexts/DrawerStackContext', () => ({
  useDrawerStack: () => ({ pushDrawer: vi.fn(), popDrawer: vi.fn() }),
  DrawerStackProvider: ({ children }: any) => <div>{children}</div>,
}));

import { DataViewEngine } from '@/src/platform/ui/design-system/dataview/DataViewEngine';

const mockDataView = {
  table: {
    getHeaderGroups: () => [],
    getRowModel: () => ({ rows: [] }),
    getCenterTotalSize: () => 0,
    getFilteredRowModel: () => ({ rows: [] }),
    getCoreRowModel: () => ({ rows: [] }),
    getIsAllRowsExpanded: () => false,
    getCanPreviousPage: () => false,
    getCanNextPage: () => false,
    getPageCount: () => 1,
    toggleAllRowsExpanded: vi.fn(),
    getState: () => ({ pagination: { pageIndex: 0 }, columnVisibility: {}, sorting: [], columnFilters: [] }),
  },
  globalFilter: '',
  setGlobalFilter: vi.fn(),
  columnFilters: [],
  setColumnFilters: vi.fn(),
  pagination: { pageIndex: 0, pageSize: 10, hasNextPage: false, hasPreviousPage: false, pageCount: 1, setPageIndex: vi.fn(), setPageSize: vi.fn(), totalItems: 0 },
  virtualizer: { getVirtualItems: () => [], getTotalSize: () => 0 },
  containerRef: { current: null },
  activeView: null,
  setActiveView: vi.fn(),
  saveCurrentView: vi.fn(),
  deleteView: vi.fn(),
  sorting: [],
  setSorting: vi.fn(),
  grouping: { columns: [], setColumns: vi.fn(), isGrouped: false, groups: [], toggleGroup: vi.fn(), expandedGroups: {} },
} as any;

describe('DataViewEngine – dòng "Đang hiển thị X/Y" (Đợt 0A – lô 2)', () => {
  it('khi chạm trần: hiện "Đang hiển thị 2.000/2.350 dòng mới nhất"', () => {
    render(
      <MemoryRouter>
        <DataViewEngine dataView={mockDataView} columns={[]} title="Phiếu thu" groupByOptions={[]} loadInfo={{ loaded: 2000, total: 2350, capped: true }} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Đang hiển thị 2\.000\/2\.350 dòng mới nhất/)).toBeTruthy();
  });

  it('chưa biết tổng (total = null) thì hiện dấu … thay cho Y', () => {
    render(
      <MemoryRouter>
        <DataViewEngine dataView={mockDataView} columns={[]} title="Phiếu thu" groupByOptions={[]} loadInfo={{ loaded: 2000, total: null, capped: true }} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Đang hiển thị 2\.000\/… dòng mới nhất/)).toBeTruthy();
  });

  it('chưa chạm trần hoặc không truyền loadInfo: không có dòng cảnh báo (giữ ảnh chụp cũ)', () => {
    const { rerender } = render(
      <MemoryRouter>
        <DataViewEngine dataView={mockDataView} columns={[]} title="Phiếu thu" groupByOptions={[]} loadInfo={{ loaded: 1500, total: 1500, capped: false }} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Đang hiển thị/)).toBeNull();
    rerender(
      <MemoryRouter>
        <DataViewEngine dataView={mockDataView} columns={[]} title="Phiếu thu" groupByOptions={[]} />
      </MemoryRouter>
    );
    expect(screen.queryByText(/Đang hiển thị/)).toBeNull();
  });
});
