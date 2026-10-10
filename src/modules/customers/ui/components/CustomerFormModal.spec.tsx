/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MotionGlobalConfig } from 'motion/react';

window.HTMLElement.prototype.scrollIntoView = vi.fn();
window.HTMLElement.prototype.hasPointerCapture = vi.fn();
window.HTMLElement.prototype.releasePointerCapture = vi.fn();
window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as any;
MotionGlobalConfig.skipAnimations = true;

const { repoSpies, listByCollection } = vi.hoisted(() => {
  const repoSpies = {
    update: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue('new-id'),
  };
  // Khách c1 có đúng 1 báo giá liên kết → cổng kiểm tra tác động phải mở hộp thoại
  const listByCollection = vi.fn(async (collection: string) =>
    collection === 'quotations'
      ? [{ id: 'q1', customerId: 'c1', soPhieuBaoGia: 'BG-2026-0001', ngayBaoGia: '2026-09-01', totalAmount: 1000000 }]
      : []
  );
  return { repoSpies, listByCollection };
});

vi.mock('@/src/data/repositories/factory', () => ({
  repositoryFactory: {
    get: (collection: string) => ({
      list: () => listByCollection(collection),
      listAll: async () => ({ items: await listByCollection(collection), total: 0, capped: false }),
      getById: vi.fn().mockResolvedValue(null),
      update: repoSpies.update,
      set: repoSpies.set,
      create: repoSpies.create,
      generateId: () => 'gen-id',
      subscribe: () => () => {},
    }),
  },
}));
global.fetch = vi.fn(() => Promise.resolve({
  json: () => Promise.resolve({ success: true, duplicates: [], maKh: 'KH-123' }),
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
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
  },
  default: {},
}));
vi.mock('swr', () => ({ default: () => ({ data: [], isLoading: false, error: null }), mutate: vi.fn() }));
vi.mock('@/src/data/realtime-store', () => ({
  useRealtimeCollection: () => ({ data: [], loading: false }),
  realtimeStore: { subscribe: vi.fn(), getCollectionState: () => ({ data: [] }) },
}));
vi.mock('@/src/modules/iam/ui/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', displayName: 'Quản trị' },
    userData: { role: 'Administrator', displayName: 'Quản trị' },
    hasRole: () => true,
  }),
}));
vi.mock('@/src/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/src/platform/ui/design-system/Confirm', () => ({
  useConfirm: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
  ConfirmHost: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/src/contexts/DrawerStackContext', () => ({
  useDrawerStack: () => ({ pushDrawer: vi.fn(), popDrawer: vi.fn() }),
  DrawerStackProvider: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/src/hooks/useDraft', () => ({
  useDraft: () => ({ draft: null, saveDraft: vi.fn().mockResolvedValue(undefined), clearDraft: vi.fn().mockResolvedValue(undefined), isRestored: true }),
}));
vi.mock('@/src/hooks/useSharedFields', () => ({
  useSharedFields: () => ({ tinhThanhList: ['TP. Hồ Chí Minh', 'Bình Dương'], nguoiPhuTrachList: ['Ngô Vương Thông'], loaiKhachHangList: ['Doanh nghiệp'] }),
}));

import { CustomerForm } from '@/src/modules/customers';

const existingCustomer: any = {
  id: 'c1',
  maKh: 'KH0001',
  tenKhachHang: 'Công Ty Cổ Phần Thép Hoa Sen',
  sdt: '0902993093',
  nguoiDaiDien: 'Nguyễn Văn Hoa',
  diaChi: '123 Quốc Lộ 1A',
  tinhThanh: 'Bình Dương',
  maSoThue: '0301234567',
  loaiKh: 'Doanh nghiệp',
  nguoiPhuTrach: 'Ngô Vương Thông',
  contacts: [{ nguoiDaiDien: 'Nguyễn Văn Hoa', sdt: '0902993093', chucVu: 'Giám đốc' }],
};

describe('CustomerForm – lưu khách hàng chỉ ghi bảng customers (Đợt 0A)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('đổi tên khách đã có chứng từ: hộp Tác động chỉ còn "Chỉ lưu Khách Hàng"; lưu gọi onSave đúng 1 lần, không cập nhật chứng từ, không gọi trigger-sync', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    let container!: HTMLElement;
    await act(async () => {
      ({ container } = render(
        <MemoryRouter>
          <CustomerForm
            customer={existingCustomer}
            nguoiPhuTrachList={['Ngô Vương Thông']}
            loaiKhachHangList={['Doanh nghiệp']}
            onClose={() => {}}
            onSave={onSave}
          />
        </MemoryRouter>
      ));
    });

    const nameInput = container.querySelector('#tenKhachHang') as HTMLInputElement;
    expect(nameInput).toBeTruthy();
    fireEvent.change(nameInput, { target: { value: 'Tập Đoàn Hoa Sen Group' } });
    await act(async () => {
      fireEvent.submit(container.querySelector('form#customerForm') as HTMLFormElement);
    });

    const saveMasterOnly = await screen.findByRole('button', { name: /Chỉ lưu Khách Hàng/i });
    expect(screen.queryByRole('button', { name: /1-Click Đồng bộ an toàn/i })).toBeNull();
    expect(screen.queryByText(/Sẵn sàng đồng bộ/i)).toBeNull();

    await act(async () => { fireEvent.click(saveMasterOnly); });
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(onSave.mock.calls[0][0].id).toBe('c1');
    expect(String(onSave.mock.calls[0][0].tenKhachHang)).toMatch(/Hoa Sen Group/i);

    expect(repoSpies.update).not.toHaveBeenCalled();
    expect(repoSpies.set).not.toHaveBeenCalled();
    expect(repoSpies.create).not.toHaveBeenCalled();
    const urls = (global.fetch as any).mock.calls.map((call: unknown[]) => String(call[0]));
    expect(urls.some((u: string) => u.includes('/api/customers/trigger-sync'))).toBe(false);
  });
});
