import { describe, it, expect, vi, afterEach } from 'vitest';
import { CompleteSchema, resolveInitialHandoverDate } from './complete-delivery.rules';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';

const delivery = (over: Partial<Delivery> = {}) => ({ id: 'd1', ngayGiaoMay: '2026-12-01', ngayGiaoThucTe: null, products: [], ...over } as unknown as Delivery);
const shipment = (over: Partial<DeliveryShipment> = {}) => ({ id: 'DOT-1', dotGiaoHang: 1, soPhieuXuat: 'PXK-1', ngayGiaoMay: '2026-12-01', ngayGiaoThucTe: null, ...over } as unknown as DeliveryShipment);

describe('complete-delivery.rules – Đợt 0A (GH15)', () => {
  afterEach(() => vi.useRealTimers());

  it('phiếu có ngày hẹn 01/12/2026, chưa có ngày thực tế → ô ngày trống (KHÔNG điền ngày hẹn, KHÔNG điền hôm nay)', () => {
    expect(resolveInitialHandoverDate(delivery(), null)).toBe('');
    expect(resolveInitialHandoverDate(delivery(), shipment())).toBe('');
  });

  it('đợt đã có ngày thực tế (xác nhận lại) → giữ ngày đó; phiếu có ngày thực tế khi xác nhận cả phiếu → giữ', () => {
    expect(resolveInitialHandoverDate(delivery(), shipment({ ngayGiaoThucTe: '2026-10-03' }))).toBe('2026-10-03');
    expect(resolveInitialHandoverDate(delivery({ ngayGiaoThucTe: '2026-10-02' }), null)).toBe('2026-10-02');
    // xác nhận một đợt chưa có ngày thực tế không được mượn ngày của phiếu
    expect(resolveInitialHandoverDate(delivery({ ngayGiaoThucTe: '2026-10-02' }), shipment())).toBe('');
  });

  it('schema: ngày trống → "Vui lòng chọn ngày giao"; ngày sau hôm nay (VN) → "Ngày bàn giao không được sau hôm nay"; hôm nay → hợp lệ', () => {
    vi.useFakeTimers({ now: new Date('2026-10-11T18:30:00Z') }); // 12/10 VN
    const base = { kyNhan: 'Anh Ba' };
    const empty = CompleteSchema.safeParse({ ...base, ngayGiaoThucTe: '' });
    expect(empty.success).toBe(false);
    if (!empty.success) expect(empty.error.issues[0].message).toBe('Vui lòng chọn ngày giao');
    const future = CompleteSchema.safeParse({ ...base, ngayGiaoThucTe: '2026-10-13' });
    expect(future.success).toBe(false);
    if (!future.success) expect(future.error.issues[0].message).toBe('Ngày bàn giao không được sau hôm nay');
    expect(CompleteSchema.safeParse({ ...base, ngayGiaoThucTe: '2026-10-12' }).success).toBe(true);
    expect(CompleteSchema.safeParse({ ...base, ngayGiaoThucTe: '2026-10-01' }).success).toBe(true);
  });

  it('rà soát cuối: ngày không đúng dạng yyyy-MM-dd (năm 5 chữ số "12345-01-01" lọt qua luật "sau hôm nay") → "Ngày bàn giao không đúng định dạng"', () => {
    const r = CompleteSchema.safeParse({ kyNhan: 'Anh Ba', ngayGiaoThucTe: '12345-01-01' });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe('Ngày bàn giao không đúng định dạng');
  });
});
