/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { notifyMock } = vi.hoisted(() => ({ notifyMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock('@/src/shared/utils/notify', () => ({ notify: notifyMock }));
vi.mock('@/src/data/repositories/factory', () => ({
  repositoryFactory: { get: vi.fn(() => ({ getById: vi.fn().mockResolvedValue(null), listAll: vi.fn().mockResolvedValue({ items: [], total: 0, capped: false }), list: vi.fn().mockResolvedValue([]) })) },
}));
vi.mock('@/src/data/realtime-store', () => ({
  realtimeStore: { getCollectionState: vi.fn(() => ({ data: [], loading: false, error: null, hasMore: false, loadMore: () => {}, loaded: 0, total: null, capped: false })) },
}));

import { usePaymentZns } from './usePaymentZns';
import type { Payment } from '@/src/domain/schema/payment.schema';

const paid30 = {
  id: 'p1', paymentId: 'PT-2026-0001', tenKhachHang: 'Công ty A', sdt: '0912345678', soHopDong: 'HD-2026-0002', totalAmount: 100_000_000,
  tinhTrangThanhToan: 'Công nợ', ghiChu: 'FT26161873245 link chứng từ', congNoConLai: 70_000_000,
  cacDotThu: [{ lanThu: 1, soTien: 30_000_000, ngayThu: '2026-10-01', ghiChu: 'Thu tiền đợt 1 - HĐ 004' }],
} as unknown as Payment;
const unpaid = { id: 'p2', paymentId: 'PT-2026-0002', tenKhachHang: 'Công ty B', sdt: '0912345678', tinhTrangThanhToan: 'Chưa TT', soTien: 0, cacDotThu: [] } as unknown as Payment;

describe('usePaymentZns – Đợt 0A (TT01): câu ghi chú từ hàm chung, chặn phiếu chưa thu', () => {
  beforeEach(() => vi.clearAllMocks());

  it('phiếu thu 30 %: màn xem trước mở với ghi_chu "Thanh toán đợt 1", installmentIndex 0, không còn khóa ghiChu nội bộ', async () => {
    const { result } = renderHook(() => usePaymentZns(vi.fn().mockResolvedValue(true), vi.fn(), 'Administrator'));
    await act(async () => { await result.current.handleSendZns(paid30, 0); });
    const preview = result.current.znsPreviewPayment;
    expect(preview).not.toBeNull();
    expect(preview?.messageType).toBe('THANH_TOAN_XAC_NHAN');
    expect(preview?.installmentIndex).toBe(0);
    const p = preview?.payment as unknown as Record<string, unknown>;
    expect(p.ghi_chu).toBe('Thanh toán đợt 1');
    expect(p).not.toHaveProperty('ghiChu');
    expect(JSON.stringify(p)).not.toMatch(/FT2616|Tất toán|Còn lại/);
    expect(notifyMock.error).not.toHaveBeenCalled();
  });

  it('gửi ở cấp phiếu (không chọn đợt) → N là đợt có tiền mới nhất và installmentIndex được suy ra', async () => {
    const twoInstallments = { ...paid30, cacDotThu: [...(paid30.cacDotThu || []), { lanThu: 2, soTien: 20_000_000, ngayThu: '2026-10-05' }] } as unknown as Payment;
    const { result } = renderHook(() => usePaymentZns(vi.fn().mockResolvedValue(true), vi.fn()));
    await act(async () => { await result.current.handleSendZns(twoInstallments); });
    expect((result.current.znsPreviewPayment?.payment as unknown as Record<string, unknown>).ghi_chu).toBe('Thanh toán đợt 2');
    expect(result.current.znsPreviewPayment?.installmentIndex).toBe(1);
  });

  it('phiếu "Chưa TT" chưa thu đồng nào → notify.error với hướng dẫn, không mở màn xem trước', async () => {
    const { result } = renderHook(() => usePaymentZns(vi.fn().mockResolvedValue(true), vi.fn()));
    await act(async () => { await result.current.handleSendZns(unpaid); });
    expect(result.current.znsPreviewPayment).toBeNull();
    expect(notifyMock.error).toHaveBeenCalledWith('Phiếu thu chưa ghi nhận khoản thu nào nên không gửi được tin xác nhận thanh toán. Ghi nhận đợt thu trước.');
  });

  it('nhãn "Tất toán" + congNoConLai 0 nhưng không có tiền → vẫn chặn; có tiền → câu vẫn "Thanh toán đợt N"', async () => {
    const { result } = renderHook(() => usePaymentZns(vi.fn().mockResolvedValue(true), vi.fn()));
    await act(async () => { await result.current.handleSendZns({ ...unpaid, tinhTrangThanhToan: 'Tất toán', congNoConLai: 0 } as unknown as Payment); });
    expect(result.current.znsPreviewPayment).toBeNull();
    await act(async () => { await result.current.handleSendZns({ ...paid30, tinhTrangThanhToan: 'Tất toán', congNoConLai: 0 } as unknown as Payment, 0); });
    expect((result.current.znsPreviewPayment?.payment as unknown as Record<string, unknown>).ghi_chu).toBe('Thanh toán đợt 1');
  });
});
