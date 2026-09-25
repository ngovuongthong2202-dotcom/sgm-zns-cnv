/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MotionGlobalConfig } from 'motion/react';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;

MotionGlobalConfig.skipAnimations = true;

// Mocks
global.fetch = vi.fn(() => Promise.resolve({
  json: () => Promise.resolve({ success: true, maKh: 'KH-123' }),
  headers: new Headers(),
  status: 200,
  ok: true
})) as any;

vi.mock('@/src/shared/config/supabase.client', () => ({
  isSupabaseConfigured: false,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
    },
  },
  default: {},
}));
vi.mock('swr', () => ({
  default: () => ({ data: [], isLoading: false, error: null }),
}));
vi.mock('@/src/data/realtime-store', () => ({
  useRealtimeCollection: () => ({ data: [], isLoading: false }),
  realtimeStore: {
    subscribe: vi.fn(),
  }
}));
vi.mock('@/src/modules/iam/ui/AuthContext', () => ({
  useAuth: () => ({ user: { uid: '123' }, hasRole: () => true }),
}));
vi.mock('@/src/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/src/platform/ui/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn() }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>
}));
vi.mock('@/src/contexts/DrawerStackContext', () => ({
  useDrawerStack: () => ({ pushDrawer: vi.fn(), popDrawer: vi.fn() }),
  DrawerStackProvider: ({ children }: any) => <div>{children}</div>
}));

// Import Components
import { CustomerForm } from '@/src/modules/customers';
import { QuotationFormModal } from '@/src/modules/sales/ui/components/QuotationFormModal';
import { ContractFormModal } from '@/src/modules/contracts/ui/components/ContractFormModal';
import { PaymentRecordDrawer } from '@/src/modules/billing/ui/components/PaymentRecordDrawer';
import { DeliveryFormModal } from '@/src/modules/fulfillment/ui/components/DeliveryFormModal';
import { EntityLinks } from '@/src/widgets/EntityLinks';
import { DataViewEngine } from '@/src/platform/ui/design-system/dataview/DataViewEngine';

describe('Component Snapshots (Baseline)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-09-23T12:00:00.000Z'));
    vi.spyOn(Math, 'random').mockReturnValue(0.12345);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders CustomerFormModal', async () => {
    let container: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <CustomerForm 
            customer={null}
            nguoiPhuTrachList={[]}
            loaiKhachHangList={[]}
            onClose={() => {}}
            onSave={async () => {}}
          />
        </MemoryRouter>
      );
      container = res.container;
    });
    expect(container).toMatchSnapshot();
  });

  it('renders QuotationFormModal', async () => {
    let container: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <QuotationFormModal 
            quotation={null}
            quotations={[]}
            customers={[]}
            nguoiPhuTrachList={[]}
            loaiKhachHangList={[]}
            loaiBaoGiaList={[]}
            onClose={() => {}}
            onSave={async () => {}}
          />
        </MemoryRouter>
      );
      container = res.container;
    });
    expect(container).toMatchSnapshot();
  });

  it('renders ContractFormModal', async () => {
    let container: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <ContractFormModal 
            contract={null}
            contracts={[]}
            quotations={[]}
            nguoiPhuTrachList={[]}
            onClose={() => {}}
            onSave={async () => {}}
          />
        </MemoryRouter>
      );
      container = res.container;
    });
    expect(container).toMatchSnapshot();
  });

  it('renders PaymentRecordDrawer', async () => {
    let container: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <PaymentRecordDrawer 
            payment={null}
            contracts={[]}
            allDeliveries={[]}
            onClose={() => {}}
            onSave={async () => {}}
          />
        </MemoryRouter>
      );
      container = res.container;
    });
    expect(container).toMatchSnapshot();
  });

  it('renders DeliveryFormModal', async () => {
    let container: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <DeliveryFormModal 
            delivery={null}
            payments={[]}
            contracts={[]}
            quotations={[]}
            deliveries={[]}
            nguoiPhuTrachList={[]}
            onClose={() => {}}
            onSave={async () => {}}
          />
        </MemoryRouter>
      );
      container = res.container;
    });
    expect(container).toMatchSnapshot();
  });

  it('renders EntityLinks', () => {
    const { container } = render(
      <MemoryRouter>
        <EntityLinks entityId="1" entityType="CUSTOMER" />
      </MemoryRouter>
    );
    expect(container).toMatchSnapshot();
  });

  it('renders DataViewEngine', () => {
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
      pagination: {
        pageIndex: 0,
        pageSize: 10,
        hasNextPage: false,
        hasPreviousPage: false,
        pageCount: 1,
        setPageIndex: vi.fn(),
        setPageSize: vi.fn(),
        totalItems: 0
      },
      virtualizer: {
        getVirtualItems: () => [],
        getTotalSize: () => 0
      },
      containerRef: { current: null },
      activeView: null,
      setActiveView: vi.fn(),
      saveCurrentView: vi.fn(),
      deleteView: vi.fn(),
      sorting: [],
      setSorting: vi.fn(),
      grouping: {
        columns: [],
        setColumns: vi.fn(),
        isGrouped: false,
        groups: [],
        toggleGroup: vi.fn(),
        expandedGroups: {}
      },
    } as any;

    const { container } = render(
      <MemoryRouter>
        <DataViewEngine 
          dataView={mockDataView}
          columns={[]}
          title="Test view"
          groupByOptions={[]}
        />
      </MemoryRouter>
    );
    expect(container).toMatchSnapshot();
  });
});

