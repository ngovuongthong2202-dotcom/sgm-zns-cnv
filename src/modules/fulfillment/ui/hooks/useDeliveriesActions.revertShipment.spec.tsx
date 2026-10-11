/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { repoGetById, repoUpdate, contractGetById, notifyMock } = vi.hoisted(() => ({
  repoGetById: vi.fn(),
  repoUpdate: vi.fn(),
  contractGetById: vi.fn(),
  notifyMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

vi.mock('@/src/data/repositories/factory', () => ({
  repositoryFactory: {
    get: vi.fn((name: string) => name === 'contracts'
      ? { getById: contractGetById, update: vi.fn() }
      : { getById: repoGetById, update: repoUpdate, list: vi.fn().mockResolvedValue([]) }),
  },
}));
vi.mock('@/src/modules/iam', () => ({ useAuth: () => ({ user: { uid: 'u1', displayName: 'Thông' }, userData: { displayName: 'Quản trị', role: 'Administrator' } }), can: () => true }));
vi.mock('@/src/modules/customers', () => ({ customerRepo: { getById: vi.fn() } }));
vi.mock('@/src/domain/zns-client', () => ({ sendZnsAndToast: vi.fn(), nextAttempt: vi.fn(() => 1), checkZnsResendAllowed: vi.fn(() => ({ allowed: true })) }));
vi.mock('@/src/data/repositories/system.repo', () => ({ auditLogsRepo: { create: vi.fn().mockResolvedValue(undefined) } }));
vi.mock('@/src/platform/data/entity-cache-pool', () => ({ entityCachePool: { get: vi.fn(), set: vi.fn(), remove: vi.fn(), getAll: vi.fn(() => []) } }));
vi.mock('@/src/shared/utils/apiCreateEntity', () => ({ apiCreateEntity: vi.fn(), apiDeleteEntity: vi.fn(), apiRestoreEntity: vi.fn() }));
vi.mock('@/src/shared/utils/notify', () => ({ notify: notifyMock }));
vi.mock('@/src/shared/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }));

import { useDeliveriesActions } from './useDeliveriesActions';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';

const product = { productName: 'Máy dán cạnh', productId: 'M1', quantity: 1, price: 1, unit: 'Máy' };
const ship = (n: number, over: Partial<DeliveryShipment> = {}): DeliveryShipment => ({
  id: `DOT-${n}`, dotGiaoHang: n, soPhieuXuat: `PXK-${n}`, products: [product], danhSachMaMay: [`SN-${n}`], dvt: 'Máy',
  tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '', tinhTrangNghiemThu: 'DONG_Y', dacCachGiaoTruoc: false, isDotCuoiCung: false, ...over,
} as DeliveryShipment);
const done = (n: number) => ship(n, { tinhTrangGiaoHang: 'HOAN_TAT', ngayGiaoThucTe: `2026-10-0${n}`, kyNhan: `Người ký ${n}` });
const staleDrawer = { id: 'd1', deliveryId: 'PGH-1', contractId: 'c1', products: [{ ...product, quantity: 2 }], tinhTrangGiaoHang: 'Đang giao', ngayGiaoThucTe: null, kyNhan: '', cacDotGiao: [done(1), ship(2)], updatedAt: 'T-stale', __customerInfo: { tenKhachHang: 'X' }, stt: 3 } as unknown as Delivery;
const freshDoc = { ...staleDrawer, cacDotGiao: [done(1), done(2)], tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-10-02', kyNhan: 'Người ký 2', updatedAt: 'T-fresh' } as unknown as Delivery;

function setup(drawer: Delivery | null = staleDrawer) {
  const updateDelivery = vi.fn().mockResolvedValue(undefined);
  const updateContract = vi.fn().mockResolvedValue(undefined);
  const setDrawerDelivery = vi.fn();
  const hook = renderHook(() => useDeliveriesActions(
    vi.fn(), vi.fn(), updateDelivery, updateContract, vi.fn(), vi.fn().mockResolvedValue(true),
    setDrawerDelivery, drawer, null, vi.fn(), vi.fn(), 'Administrator'
  ));
  return { hook, updateDelivery, updateContract, setDrawerDelivery };
}
const hasUndefined = (o: Record<string, unknown>) => Object.values(o).some(v => v === undefined);

describe('useDeliveriesActions.handleRevertShipmentConfirmation – Đợt 0A (GH01/GH03)', () => {
  beforeEach(() => { vi.clearAllMocks(); repoGetById.mockResolvedValue(freshDoc); contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'HOAN_TAT' }); });

  it('ghi qua updateDelivery đúng một lần với phần đã sửa + _lastUpdatedAt của BẢN MỚI NHẤT; Đợt 2 (vừa được người khác xác nhận) giữ nguyên; không undefined', async () => {
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(repoGetById).toHaveBeenCalledWith('d1');
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    const [id, payload] = updateDelivery.mock.calls[0];
    expect(id).toBe('d1');
    expect(payload._lastUpdatedAt).toBe('T-fresh');
    expect(payload.cacDotGiao[0]).toMatchObject({ tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' });
    expect(payload.cacDotGiao[1]).toMatchObject({ tinhTrangGiaoHang: 'HOAN_TAT', ngayGiaoThucTe: '2026-10-02', kyNhan: 'Người ký 2' });
    expect(payload).toMatchObject({ tinhTrangGiaoHang: 'Đang giao', ngayGiaoThucTe: null, kyNhan: '' });
    expect(Object.keys(payload).sort()).toEqual(['_lastUpdatedAt', 'cacDotGiao', 'kyNhan', 'ngayGiaoThucTe', 'tienDoLuyKe', 'tinhTrangGiaoHang']);
    expect(hasUndefined(payload)).toBe(false);
  });

  it('đường ghi thẳng cũ không còn: repositoryFactory.get("deliveries").update không được gọi', async () => {
    const { hook } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(repoUpdate).not.toHaveBeenCalled();
  });

  it('lịch sử trên đợt mang userId "u1", người thực hiện "Quản trị", lý do, ngày và người ký cũ', async () => {
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    const entry = updateDelivery.mock.calls[0][1].cacDotGiao[0].lichSuHuyXacNhan[0];
    expect(entry).toMatchObject({ userId: 'u1', nguoiThucHien: 'Quản trị', lyDo: 'Khách chưa nhận hàng', ngayGiaoThucTeCu: '2026-10-01', kyNhanCu: 'Người ký 1' });
  });

  it('phiếu từng "Hoàn tất" + hợp đồng HOAN_TAT → updateContract về DANG_GIAO; phiếu trước đó "Đang giao" → không gọi; updateContract lỗi → chỉ cảnh báo, phiếu vẫn đã ghi', async () => {
    const a = setup();
    await act(async () => { await a.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(a.updateContract).toHaveBeenCalledWith('c1', { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' });

    repoGetById.mockResolvedValue({ ...freshDoc, tinhTrangGiaoHang: 'Đang giao', ngayGiaoThucTe: null, cacDotGiao: [done(1), ship(2)] });
    const b = setup();
    await act(async () => { await b.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(b.updateContract).not.toHaveBeenCalled();

    repoGetById.mockResolvedValue(freshDoc);
    const c = setup();
    c.updateContract.mockRejectedValue(new Error('422 hợp đồng đã ký'));
    await act(async () => { await c.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(c.updateDelivery).toHaveBeenCalledTimes(1);
    expect(notifyMock.warning).toHaveBeenCalled();
    expect(notifyMock.success).toHaveBeenCalled();
  });

  it('ngăn chi tiết được đặt lại TỪ BẢN ĐÃ LƯU (fresh + patch), không trộn vào bản sao cũ; id khác → không gọi', async () => {
    const a = setup();
    await act(async () => { await a.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(a.setDrawerDelivery).toHaveBeenCalledTimes(1);
    const next = a.setDrawerDelivery.mock.calls[0][0];
    expect(typeof next).toBe('object');
    expect(next.id).toBe('d1');
    expect(next.updatedAt).toBe('T-fresh');
    expect(next.cacDotGiao[1].tinhTrangGiaoHang).toBe('HOAN_TAT');
    expect(next.tinhTrangGiaoHang).toBe('Đang giao');

    const b = setup({ ...staleDrawer, id: 'khac' } as Delivery);
    await act(async () => { await b.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(b.setDrawerDelivery).not.toHaveBeenCalled();
  });

  it('updateDelivery lỗi → notify.error, không đặt lại ngăn chi tiết, không đụng hợp đồng', async () => {
    const { hook, updateDelivery, updateContract, setDrawerDelivery } = setup();
    updateDelivery.mockRejectedValue(new Error('CONCURRENCY_CONFLICT'));
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(notifyMock.error).toHaveBeenCalledWith('CONCURRENCY_CONFLICT');
    expect(setDrawerDelivery).not.toHaveBeenCalled();
    expect(updateContract).not.toHaveBeenCalled();
  });

  it('lý do ngắn hoặc đợt chưa xác nhận (theo BẢN ĐÃ LƯU) → không gọi updateDelivery, notify.error', async () => {
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'ok'); });
    // Đợt 2 chưa xác nhận cả trong bản đã lưu — bản mới nhất quyết định, không phải bản trong ngăn chi tiết
    repoGetById.mockResolvedValue({ ...freshDoc, cacDotGiao: [done(1), ship(2)] });
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, ship(2), 'Khách chưa nhận hàng'); });
    expect(updateDelivery).not.toHaveBeenCalled();
    expect(notifyMock.error).toHaveBeenCalledTimes(2);
  });

  it('đợt còn CHO_GIAO trong ngăn chi tiết nhưng đã HOAN_TAT ở bản đã lưu → vẫn hủy được theo bản đã lưu (GH03)', async () => {
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, ship(2), 'Khách chưa nhận hàng'); });
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    expect(updateDelivery.mock.calls[0][1].cacDotGiao[1]).toMatchObject({ tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' });
    expect(notifyMock.error).not.toHaveBeenCalled();
  });

  it('getById trả null (mất mạng) → dùng bản đang mở, vẫn ghi được', async () => {
    repoGetById.mockResolvedValue(null);
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    expect(updateDelivery.mock.calls[0][1]._lastUpdatedAt).toBe('T-stale');
  });

  it('lùi hợp đồng lỗi → chỉ cảnh báo riêng (không báo lỗi), phiếu không bị hoàn tác, ngăn chi tiết vẫn làm mới từ bản đã lưu', async () => {
    const { hook, updateDelivery, updateContract, setDrawerDelivery } = setup();
    updateContract.mockRejectedValue(new Error('422 hợp đồng đã ký'));
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    expect(notifyMock.warning).toHaveBeenCalledTimes(1);
    expect(notifyMock.warning.mock.calls[0][0]).toContain('422 hợp đồng đã ký');
    expect(notifyMock.error).not.toHaveBeenCalled();
    expect(setDrawerDelivery).toHaveBeenCalledTimes(1);
    expect(setDrawerDelivery.mock.calls[0][0]).toMatchObject({ id: 'd1', updatedAt: 'T-fresh', tinhTrangGiaoHang: 'Đang giao' });
    expect(notifyMock.success).toHaveBeenCalledTimes(1);
  });

  it('chỉ lùi hợp đồng đang ở trạng thái hoàn tất (cờ giao hàng HOAN_TAT hoặc cờ hợp đồng COMPLETED); hợp đồng ở trạng thái khác giữ nguyên', async () => {
    contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' });
    const a = setup();
    await act(async () => { await a.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(a.updateDelivery).toHaveBeenCalledTimes(1);
    expect(a.updateContract).not.toHaveBeenCalled();

    contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'COMPLETED' });
    const b = setup();
    await act(async () => { await b.hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(b.updateContract).toHaveBeenCalledWith('c1', { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' });
  });

  // Hộp thoại (Việc 13) chặn Esc/"Quay lại" trong lúc chờ: mọi đường lỗi phải kết thúc bình thường và báo người dùng.
  it('thiếu mã phiếu → báo lỗi, không đọc, không ghi, vẫn kết thúc bình thường', async () => {
    const { hook, updateDelivery, setDrawerDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation({ ...staleDrawer, id: undefined } as Delivery, done(1), 'Khách chưa nhận hàng'); });
    expect(notifyMock.error).toHaveBeenCalledTimes(1);
    expect(repoGetById).not.toHaveBeenCalled();
    expect(updateDelivery).not.toHaveBeenCalled();
    expect(setDrawerDelivery).not.toHaveBeenCalled();
  });

  it('không đọc được bản mới nhất (getById lỗi) → báo lỗi, không ghi, không đặt lại ngăn chi tiết, vẫn kết thúc bình thường', async () => {
    repoGetById.mockRejectedValue(new Error('Mất kết nối máy chủ'));
    const { hook, updateDelivery, updateContract, setDrawerDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(notifyMock.error).toHaveBeenCalledWith('Mất kết nối máy chủ');
    expect(updateDelivery).not.toHaveBeenCalled();
    expect(updateContract).not.toHaveBeenCalled();
    expect(setDrawerDelivery).not.toHaveBeenCalled();
    expect(notifyMock.success).not.toHaveBeenCalled();
  });
});
