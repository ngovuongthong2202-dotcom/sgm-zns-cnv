/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { notifyMock } = vi.hoisted(() => ({ notifyMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/src/shared/utils/notify', () => ({ notify: notifyMock }));
vi.mock('@/src/modules/iam', () => ({ useAuth: () => ({ user: { uid: 'u1', email: 't@sgm.vn' }, userData: { displayName: 'Thông', role: 'Administrator' } }) }));
vi.mock('@/src/hooks/useDraft', () => ({ useDraft: () => ({ draft: null, saveDraft: vi.fn(), clearDraft: vi.fn(), lastSavedAt: null }) }));
// Giữ mock này dù Bước 3(a) bỏ import useSharedFields khỏi hook: với mã TẠI MỐC nó làm lộ hành vi cũ (tự chọn lãnh đạo đầu danh sách).
vi.mock('@/src/hooks/useSharedFields', () => ({ useSharedFields: () => ({ lanhDaoPheDuyetList: ['Ban Giám Đốc', 'Ông Nguyễn Văn A'] }) }));
vi.mock('@/src/data/repositories/settings.repo', () => ({ settingsRepo: { getSettings: vi.fn().mockResolvedValue(null) } }));
vi.mock('@/src/shared/utils/voucherResolver', () => ({ generateDeterministicNextCode: () => 'PGH-2026-0001' }));

import { useDeliveryForm } from './useDeliveryForm';

const contract = { id: 'c1', soHopDong: 'HD-2026-0002', customerId: 'kh1', tenKhachHang: 'Công ty A', products: [], totalAmount: 100_000_000 };
const contractWithRecordedWaiver = { ...contract, id: 'c2', soHopDong: 'HD-2026-0003', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Ông Nguyễn Văn A', lyDoDacCach: 'Giao theo tiến độ dự án' };
// Đối số của hook giữ nguyên danh tính giữa các lần render: effect tính maxQuantities của hook phụ thuộc
// [payments, delivery, contracts, quotations] và gọi setMaxQuantities({...}) mỗi lần chạy, nên mảng/đối tượng viết thẳng
// trong callback của renderHook tạo vòng render vô hạn (worker vitest hết bộ nhớ). Chỉ đổi cách truyền đối số, không đổi assertion.
const NO_ROWS: unknown[] = [];
const cancelledWithRealWaiver = { id: 'd-huy', paymentId: 'p3', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangGiaoHang: 'HỦY', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Ông Nguyễn Văn A', lyDoDacCach: 'Giao theo tiến độ dự án' };

describe('useDeliveryForm – Đợt 0A (GH02): các lối vào không tự bật đặc cách', () => {
  beforeEach(() => vi.clearAllMocks());

  it('mở "+ Phiếu giao" từ hợp đồng chưa có phiếu thu (effect populateFromContract): đặc cách TẮT, người duyệt và lý do rỗng, không ghi đè "CHƯA THANH TOÁN"', async () => {
    const delivery = { contractId: 'c1' };
    const contracts = [contract];
    const { result } = renderHook(() => useDeliveryForm(delivery, NO_ROWS, contracts, NO_ROWS, NO_ROWS, NO_ROWS));
    await act(async () => {});
    expect(result.current.getValues('soHopDong')).toBe('HD-2026-0002');
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(false);
    expect(result.current.getValues('nguoiPheDuyetDacCach') || '').toBe('');
    expect(result.current.getValues('lyDoDacCach') || '').toBe('');
    expect(result.current.getValues('tinhTrangThanhToan') || '').not.toBe('CHƯA THANH TOÁN');
  });

  it('populateFromPayment với phiếu thu "Chưa TT" không đặc cách: không tự chọn lãnh đạo đầu danh sách, không câu "Kế thừa…"', async () => {
    const payment = { id: 'p1', paymentId: 'PT-2026-0001', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangThanhToan: 'Chưa TT', products: [] };
    const payments = [payment];
    const contracts = [contract];
    const { result } = renderHook(() => useDeliveryForm(null, payments, contracts, NO_ROWS, NO_ROWS, NO_ROWS));
    await act(async () => { result.current.populateFromPayment(payment); });
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(false);
    expect(result.current.getValues('nguoiPheDuyetDacCach') || '').toBe('');
    expect(result.current.getValues('lyDoDacCach') || '').toBe('');
  });

  it('đặc cách ĐÃ GHI NHẬN trên hợp đồng (cờ + người duyệt + lý do) vẫn được chép nguyên văn', async () => {
    const delivery = { contractId: 'c2' };
    const contracts = [contractWithRecordedWaiver];
    const { result } = renderHook(() => useDeliveryForm(delivery, NO_ROWS, contracts, NO_ROWS, NO_ROWS, NO_ROWS));
    await act(async () => {});
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(true);
    expect(result.current.getValues('nguoiPheDuyetDacCach')).toBe('Ông Nguyễn Văn A');
    expect(result.current.getValues('lyDoDacCach')).toBe('Giao theo tiến độ dự án');
  });

  it('populateFromPayment cho phiếu thu neo (chỉ có cờ) mà đợt giao trước mang đặc cách mã cũ tự điền ("Ban Giám Đốc") → đặc cách TẮT, hai ô rỗng', async () => {
    const anchor = { id: 'p2', paymentId: 'PT-2026-0002', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangThanhToan: 'Chưa TT', dacCachGiaoTruoc: true, products: [] };
    const payments = [anchor];
    const contracts = [contract];
    const deliveries = [{ id: 'd1', paymentId: 'p2', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangGiaoHang: 'Đã giao', dacCachGiaoTruoc: true, nguoiPheDuyetDacCach: 'Ban Giám Đốc', lyDoDacCach: 'Đặc cách giao hàng trước khi thanh toán' }];
    const { result } = renderHook(() => useDeliveryForm(null, payments, contracts, NO_ROWS, NO_ROWS, deliveries));
    await act(async () => { result.current.populateFromPayment(anchor); });
    expect(result.current.getValues('paymentId')).toBe('p2');
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(false);
    expect(result.current.getValues('nguoiPheDuyetDacCach') || '').toBe('');
    expect(result.current.getValues('lyDoDacCach') || '').toBe('');
  });

  it('đợt giao trước đã HỦY dù mang đặc cách ghi nhận đủ (tên thật) → không truyền sang phiếu mới (effect populateFromContract)', async () => {
    const delivery = { contractId: 'c1' };
    const contracts = [contract];
    const deliveries = [cancelledWithRealWaiver];
    const { result } = renderHook(() => useDeliveryForm(delivery, NO_ROWS, contracts, NO_ROWS, NO_ROWS, deliveries));
    await act(async () => {});
    expect(result.current.getValues('soHopDong')).toBe('HD-2026-0002');
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(false);
    expect(result.current.getValues('nguoiPheDuyetDacCach') || '').toBe('');
    expect(result.current.getValues('lyDoDacCach') || '').toBe('');
  });

  it('đợt giao trước đã HỦY dù mang đặc cách ghi nhận đủ (tên thật) → không truyền sang phiếu mới (populateFromPayment)', async () => {
    const receipt = { id: 'p3', paymentId: 'PT-2026-0003', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangThanhToan: 'Chưa TT', products: [] };
    const payments = [receipt];
    const contracts = [contract];
    const deliveries = [cancelledWithRealWaiver];
    const { result } = renderHook(() => useDeliveryForm(null, payments, contracts, NO_ROWS, NO_ROWS, deliveries));
    await act(async () => { result.current.populateFromPayment(receipt); });
    expect(result.current.getValues('paymentId')).toBe('p3');
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(false);
    expect(result.current.getValues('nguoiPheDuyetDacCach') || '').toBe('');
    expect(result.current.getValues('lyDoDacCach') || '').toBe('');
  });

  it('đợt giao trước bị hủy bằng nút Hủy của ứng dụng (tinhTrangGiaoHang "HUY") mang đặc cách tên thật → không truyền sang phiếu mới (populateFromPayment)', async () => {
    const receipt = { id: 'p4', paymentId: 'PT-2026-0004', contractId: 'c1', soHopDong: 'HD-2026-0002', tinhTrangThanhToan: 'Chưa TT', products: [] };
    const payments = [receipt];
    const contracts = [contract];
    const deliveries = [{ ...cancelledWithRealWaiver, id: 'd-huy-app', paymentId: 'p4', tinhTrangGiaoHang: 'HUY' }];
    const { result } = renderHook(() => useDeliveryForm(null, payments, contracts, NO_ROWS, NO_ROWS, deliveries));
    await act(async () => { result.current.populateFromPayment(receipt); });
    expect(result.current.getValues('paymentId')).toBe('p4');
    expect(result.current.getValues('dacCachGiaoTruoc')).toBe(false);
    expect(result.current.getValues('nguoiPheDuyetDacCach') || '').toBe('');
    expect(result.current.getValues('lyDoDacCach') || '').toBe('');
  });
});
