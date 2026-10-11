/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { repoGetById, repoUpdate, contractGetById, notifyMock, poolGet, poolSet, poolRemove, auditCreate, loggerMock } = vi.hoisted(() => ({
  repoGetById: vi.fn(),
  repoUpdate: vi.fn(),
  contractGetById: vi.fn(),
  notifyMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  poolGet: vi.fn(),
  poolSet: vi.fn(),
  poolRemove: vi.fn(),
  auditCreate: vi.fn().mockResolvedValue(undefined),
  loggerMock: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
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
vi.mock('@/src/data/repositories/system.repo', () => ({ auditLogsRepo: { create: auditCreate } }));
vi.mock('@/src/platform/data/entity-cache-pool', () => ({ entityCachePool: { get: poolGet, set: poolSet, remove: poolRemove, getAll: vi.fn(() => []) } }));
vi.mock('@/src/shared/utils/apiCreateEntity', () => ({ apiCreateEntity: vi.fn(), apiDeleteEntity: vi.fn(), apiRestoreEntity: vi.fn() }));
vi.mock('@/src/shared/utils/notify', () => ({ notify: notifyMock }));
vi.mock('@/src/shared/lib/logger', () => ({ logger: loggerMock }));

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
  beforeEach(() => { vi.clearAllMocks(); repoGetById.mockResolvedValue(freshDoc); contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'HOAN_TAT' }); poolGet.mockReturnValue(null); });

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

  it('đường ghi thẳng cũ không còn: repositoryFactory.get("deliveries").update không được gọi, và không ghi nhật ký từ trình duyệt (auditLogsRepo.create – HT02)', async () => {
    const { hook } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(repoUpdate).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
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
    // hợp đồng mặc định của spec chỉ có cờ giao hàng HOAN_TAT → chỉ đổi cờ (tình trạng/trạng thái hợp đồng chỉ đổi khi COMPLETED – xem các ca "lùi hợp đồng –")
    expect(a.updateContract).toHaveBeenCalledWith('c1', { tinhTrangGiaoHang: 'DANG_GIAO' });

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
    expect(notifyMock.error).toHaveBeenCalledWith('Phiếu giao vừa được người khác thay đổi. Tải lại trang rồi thử lại.');
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

  it('lùi hợp đồng lỗi → chỉ cảnh báo riêng bằng câu cố định (không lộ lỗi gốc), không báo lỗi, phiếu không bị hoàn tác, ngăn chi tiết vẫn làm mới từ bản đã lưu', async () => {
    const { hook, updateDelivery, updateContract, setDrawerDelivery } = setup();
    updateContract.mockRejectedValue(new Error('422 hợp đồng đã ký'));
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    expect(notifyMock.warning).toHaveBeenCalledTimes(1);
    expect(notifyMock.warning).toHaveBeenCalledWith('Đã hủy xác nhận đợt nhưng chưa cập nhật được trạng thái hợp đồng. Hãy mở hợp đồng để kiểm tra lại.');
    expect(loggerMock.warn).toHaveBeenCalled(); // nguyên nhân chỉ còn trong nhật ký trình duyệt, không hiện cho nhân viên
    expect(notifyMock.error).not.toHaveBeenCalled();
    expect(setDrawerDelivery).toHaveBeenCalledTimes(1);
    expect(setDrawerDelivery.mock.calls[0][0]).toMatchObject({ id: 'd1', updatedAt: 'T-fresh', tinhTrangGiaoHang: 'Đang giao' });
    expect(notifyMock.success).toHaveBeenCalledTimes(1);
  });

  // Quy tắc lùi hợp đồng dùng chung (contractRollbackPatch): hợp đồng đã hủy không bao giờ bị ghi (màn hợp đồng cấm mở lại); cờ giao hàng HOAN_TAT → DANG_GIAO;
  // tình trạng/trạng thái chỉ về DANG_THUC_HIEN/ACTIVE khi hợp đồng đang COMPLETED ở một trong hai trường – cùng nghĩa với máy chủ (entity-status.service.ts, DeliveryDeleted).
  type Doc = Record<string, string>;
  const ROLLBACK_ROWS: [string, Doc | null, Doc | null][] = [
    ['đã hủy (Hủy) → không ghi', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Hủy' }, null],
    ['đã hủy (HỦY) → không ghi', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'HỦY' }, null],
    ['đã hủy (Huỷ) → không ghi', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Huỷ' }, null],
    ['đã hủy ở trường trạng thái (Đã hủy) → không ghi', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Đã ký', status: 'Đã hủy' }, null],
    ['đã hủy dù cũng COMPLETED (CANCELLED thắng) → không ghi', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'COMPLETED', status: 'CANCELLED' }, null],
    ['chỉ cờ giao hàng HOAN_TAT → chỉ đổi cờ', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Đã ký', status: 'ACTIVE' }, { tinhTrangGiaoHang: 'DANG_GIAO' }],
    ['COMPLETED ở tình trạng hợp đồng → đổi cả ba', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'COMPLETED', status: 'COMPLETED' }, { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' }],
    ['COMPLETED chỉ ở trường trạng thái → đổi cả ba', { tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Đã ký', status: 'COMPLETED' }, { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' }],
    ['COMPLETED nhưng cờ giao hàng không phải HOAN_TAT → không đụng cờ', { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'COMPLETED' }, { tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' }],
    ['chưa hoàn tất gì → không ghi', { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'Đã ký', status: 'ACTIVE' }, null],
    ['không đọc được hợp đồng (null) → không ghi, không cảnh báo', null, null],
  ];
  it.each(ROLLBACK_ROWS)('lùi hợp đồng – %s', async (_label, contract, expected) => {
    contractGetById.mockResolvedValue(contract);
    const { hook, updateDelivery, updateContract } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    if (expected) {
      expect(updateContract).toHaveBeenCalledTimes(1);
      expect(updateContract).toHaveBeenCalledWith('c1', expected);
    } else {
      expect(updateContract).not.toHaveBeenCalled();
    }
    expect(notifyMock.warning).not.toHaveBeenCalled();
    expect(notifyMock.success).toHaveBeenCalledTimes(1);
  });

  it('hủy xác nhận cả phiếu (handleRevertDeliveryConfirmation) dùng cùng quy tắc: hợp đồng đã hủy không bị ghi; chỉ cờ HOAN_TAT → chỉ đổi cờ; COMPLETED → đổi cả ba', async () => {
    contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Hủy' });
    const a = setup();
    await act(async () => { await a.hook.result.current.handleRevertDeliveryConfirmation(staleDrawer); });
    expect(a.updateDelivery).toHaveBeenCalledTimes(1);
    expect(a.updateContract).not.toHaveBeenCalled();

    contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'Đã ký', status: 'ACTIVE' });
    const b = setup();
    await act(async () => { await b.hook.result.current.handleRevertDeliveryConfirmation(staleDrawer); });
    expect(b.updateContract).toHaveBeenCalledWith('c1', { tinhTrangGiaoHang: 'DANG_GIAO' });

    contractGetById.mockResolvedValue({ tinhTrangGiaoHang: 'HOAN_TAT', tinhTrangHopDong: 'COMPLETED', status: 'COMPLETED' });
    const c = setup();
    await act(async () => { await c.hook.result.current.handleRevertDeliveryConfirmation(staleDrawer); });
    expect(c.updateContract).toHaveBeenCalledWith('c1', { tinhTrangGiaoHang: 'DANG_GIAO', tinhTrangHopDong: 'DANG_THUC_HIEN', status: 'ACTIVE' });
  });

  // GH03: bộ đệm L1 (entityCachePool) không có hạn dùng và getById trả bản đệm mà không chạm CSDL (có thể cũ hoặc chỉ là phần vừa ghi) → hook bỏ mục đệm rồi mới đọc.
  it('đọc lại từ CSDL: bỏ mục đệm của phiếu TRƯỚC khi đọc; đọc được thì không đặt lại bản đệm cũ và dùng bản vừa đọc', async () => {
    poolGet.mockReturnValue({ ...staleDrawer, cacDotGiao: [done(1), ship(2)], updatedAt: 'T-cache' });
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(poolRemove).toHaveBeenCalledTimes(1);
    expect(poolRemove).toHaveBeenCalledWith('deliveries', 'd1');
    expect(repoGetById).toHaveBeenCalledWith('d1');
    expect(poolRemove.mock.invocationCallOrder[0]).toBeLessThan(repoGetById.mock.invocationCallOrder[0]);
    expect(poolSet).not.toHaveBeenCalled();
    expect(updateDelivery.mock.calls[0][1]._lastUpdatedAt).toBe('T-fresh');
  });

  it('getById trả null (đọc CSDL không được) nhưng bộ đệm từng có bản phiếu → trả bản đó về bộ đệm (xóa dấu "không tìm thấy") rồi dùng nó, không dùng bản sao ở ngăn chi tiết', async () => {
    const cached = { ...freshDoc, updatedAt: 'T-cache' } as unknown as Delivery; // Đợt 2 đã xác nhận trong bản đệm, còn bản ở ngăn chi tiết chưa
    poolGet.mockReturnValue(cached);
    repoGetById.mockResolvedValue(null);
    const { hook, updateDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(poolSet).toHaveBeenCalledTimes(1);
    expect(poolSet).toHaveBeenCalledWith('deliveries', cached);
    expect(poolRemove.mock.invocationCallOrder[0]).toBeLessThan(poolSet.mock.invocationCallOrder[0]);
    expect(updateDelivery).toHaveBeenCalledTimes(1);
    expect(updateDelivery.mock.calls[0][1]._lastUpdatedAt).toBe('T-cache');
    expect(updateDelivery.mock.calls[0][1].cacDotGiao[1]).toMatchObject({ tinhTrangGiaoHang: 'HOAN_TAT', ngayGiaoThucTe: '2026-10-02' });
  });

  // Nhân viên không bao giờ thấy mã kỹ thuật: mã đã biết → câu tiếng Việt thường; thông điệp không có chữ tiếng Việt → câu chung; câu tiếng Việt của máy chủ giữ nguyên.
  it.each<[string, string, string]>([
    ['xung đột ghi (409)', 'CONCURRENCY_CONFLICT', 'Phiếu giao vừa được người khác thay đổi. Tải lại trang rồi thử lại.'],
    ['không ghi đè thay đổi của người khác', 'OPTIMISTIC_CONCURRENCY_ABORTED', 'Đã dừng để không ghi đè thay đổi của người khác. Tải lại trang rồi thử lại.'],
    ['hết phiên đăng nhập', 'Unauthenticated', 'Phiên đăng nhập đã hết. Đăng nhập lại rồi thử lại.'],
    ['không tìm thấy phiếu (404)', 'Not found', 'Không tìm thấy phiếu giao. Tải lại trang rồi thử lại.'],
    ['lỗi máy chủ không có chữ tiếng Việt', 'Internal Server Error', 'Không lưu được việc hủy xác nhận đợt. Thử lại sau giây lát.'],
    ['thông điệp rỗng', '', 'Không lưu được việc hủy xác nhận đợt. Thử lại sau giây lát.'],
    ['lý do tiếng Việt của máy chủ giữ nguyên', 'Phiếu giao đã khóa, không sửa được', 'Phiếu giao đã khóa, không sửa được'],
  ])('updateDelivery lỗi – %s → thông báo tiếng Việt thường', async (_label, raw, shown) => {
    const { hook, updateDelivery } = setup();
    updateDelivery.mockRejectedValue(new Error(raw));
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(notifyMock.error).toHaveBeenCalledTimes(1);
    expect(notifyMock.error).toHaveBeenCalledWith(shown);
  });

  // Hộp thoại (Việc 13) chặn Esc/"Quay lại" trong lúc chờ: mọi đường lỗi phải kết thúc bình thường và báo người dùng.
  it('thiếu mã phiếu → báo lỗi, không đọc, không ghi, vẫn kết thúc bình thường', async () => {
    const { hook, updateDelivery, setDrawerDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation({ ...staleDrawer, id: undefined } as Delivery, done(1), 'Khách chưa nhận hàng'); });
    expect(notifyMock.error).toHaveBeenCalledTimes(1);
    expect(poolRemove).not.toHaveBeenCalled();
    expect(repoGetById).not.toHaveBeenCalled();
    expect(updateDelivery).not.toHaveBeenCalled();
    expect(setDrawerDelivery).not.toHaveBeenCalled();
  });

  // getById thật không ném lỗi (trả null khi đọc hỏng), nên ca này giả lập một lỗi bất ngờ TRƯỚC khi ghi chứ không phải một lần đọc hỏng thông thường.
  it('lỗi bất ngờ trước khi ghi (bước đọc ném lỗi) → báo lỗi, không ghi, không đặt lại ngăn chi tiết, bộ đệm cũ được trả về chỗ cũ, vẫn kết thúc bình thường', async () => {
    const cached = { ...freshDoc, updatedAt: 'T-cache' } as unknown as Delivery;
    poolGet.mockReturnValue(cached);
    repoGetById.mockRejectedValue(new Error('Mất kết nối máy chủ'));
    const { hook, updateDelivery, updateContract, setDrawerDelivery } = setup();
    await act(async () => { await hook.result.current.handleRevertShipmentConfirmation(staleDrawer, done(1), 'Khách chưa nhận hàng'); });
    expect(notifyMock.error).toHaveBeenCalledWith('Mất kết nối máy chủ');
    expect(poolSet).toHaveBeenCalledWith('deliveries', cached);
    expect(updateDelivery).not.toHaveBeenCalled();
    expect(updateContract).not.toHaveBeenCalled();
    expect(setDrawerDelivery).not.toHaveBeenCalled();
    expect(notifyMock.success).not.toHaveBeenCalled();
  });
});
