/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { MotionGlobalConfig } from 'motion/react';
import { PaymentRecordDrawer } from '@/src/modules/billing/ui/components/PaymentRecordDrawer';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;

MotionGlobalConfig.skipAnimations = true;

// Mock dependencies
global.fetch = vi.fn(() => Promise.resolve({
  json: () => Promise.resolve({ success: true, code: 'PT-2026-0001' }),
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

describe('PaymentRecordDrawer - Zero-Effect Financial Orchestrator (APW-ZFO)', () => {
  it('initializes from a service quotation with line items and VAT without infinite loop', async () => {
    const mockQuotation = {
      id: 'QUO-BGDV-0151',
      soPhieuBaoGia: 'BGDV-2026-0151',
      soBaoGia: 'BGDV-2026-0151',
      loai: 'Dịch vụ',
      phanLoai: 'Dịch vụ',
      customerId: 'CUST-001',
      maKh: 'KH-001',
      tenKhachHang: 'Cửa Hàng Minh Ánh',
      sdt: '0901234567',
      diaChi: '123 Nguyễn Trãi, Q5, TP.HCM',
      subTotal: 2623000,
      vatRate: 8,
      vatAmount: 209840,
      discountRate: 0,
      discountAmount: 0,
      totalAmount: 2832840,
      products: [
        {
          id: 'p1',
          productName: 'Dịch vụ bảo dưỡng máy CNC',
          unit: 'Gói',
          quantity: 1,
          price: 2623000,
          vatRate: 8,
          vatAmount: 209840,
          discountRate: 0,
          discountAmount: 0,
          total: 2832840
        }
      ]
    };

    let savedData: any = null;
    const handleSave = vi.fn(async (data: any) => {
      savedData = data;
    });

    let rootContainer: any;
    await act(async () => {
      const res = render(
        <MemoryRouter>
          <PaymentRecordDrawer
            isOpen={true}
            payment={null}
            prefillQuotation={mockQuotation as any}
            contracts={[]}
            allDeliveries={[]}
            onClose={() => {}}
            onSave={handleSave}
          />
        </MemoryRouter>
      );
      rootContainer = res.container;
    });

    // 1. Verify UI rendered customer and quotation lineage
    expect(rootContainer.textContent).toContain('Cửa Hàng Minh Ánh');
    expect(rootContainer.textContent).toContain('BGDV-2026-0151');
    expect(rootContainer.textContent).toContain('Bán lẻ / Dịch vụ trực tiếp (Không qua HĐ)');

    // 2. Verify total reference matches quotation total with VAT
    expect(rootContainer.textContent).toContain('2.832.840');

    // 3. Verify status initialized as "Tất toán" because 100% amount was prefilled
    const statusInputs = rootContainer.querySelectorAll('input[name="tinhTrangThanhToan"], select[name="tinhTrangThanhToan"]');
    // Drawer uses select or radio or input for status
    expect(rootContainer.innerHTML).toContain('Tất toán');
  });
});
