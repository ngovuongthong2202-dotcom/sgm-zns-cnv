import { describe, it, expect } from 'vitest';
import { applyShipmentRevert, deriveMasterFromShipments, findShipmentIndex, previewShipmentRevert } from './shipment-revert';
import { DeliverySchema } from '@/src/domain/schema/delivery.schema';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';

const product = (quantity: number) => ({ productName: 'Máy dán cạnh', productId: 'M1', quantity, price: 1_000_000, unit: 'Máy' });
const ship = (n: number, over: Partial<DeliveryShipment> = {}): DeliveryShipment => ({
  id: `DOT-${n}`, dotGiaoHang: n, soPhieuXuat: `PXK-${n}`, products: [product(1)], danhSachMaMay: [`SN-${n}`], dvt: 'Máy',
  tinhTrangGiaoHang: 'CHO_GIAO', tinhTrangNghiemThu: 'DONG_Y', dacCachGiaoTruoc: false, isDotCuoiCung: false,
  soBienBanNghiemThu: `BB-${n}`, ngayNghiemThu: '2026-10-01', trangThaiGuiTinGiaoHang: 'THÀNH CÔNG', giaTriXuatKhoDotNay: 1_000_000,
  ...over,
} as DeliveryShipment);
const confirmed = (n: number, over: Partial<DeliveryShipment> = {}) => ship(n, { tinhTrangGiaoHang: 'HOAN_TAT', ngayGiaoThucTe: `2026-10-0${n}`, kyNhan: `Người ký ${n}`, ...over });
const base = (over: Partial<Delivery> = {}): Delivery => Object.freeze({
  id: 'd1', deliveryId: 'PGH-2026-0001', customerId: 'kh1', products: [product(2)], tinhTrangGiaoHang: 'Đang giao', ngayGiaoThucTe: null, kyNhan: '',
  cacDotGiao: [confirmed(1), ship(2)], updatedAt: '2026-10-05T00:00:00.000Z', ...over,
} as unknown as Delivery) as Delivery;
const ctx = { reason: 'Khách chưa nhận hàng thật', actorId: 'u1', actorName: 'Quản trị', at: '2026-10-11T08:00:00.000Z' };
const hasUndefined = (o: Record<string, unknown>) => Object.values(o).some(v => v === undefined);

describe('shipment-revert – Đợt 0A (GH01)', () => {
  it('hủy đợt duy nhất đã xác nhận (đợt kia chờ): đợt về CHO_GIAO/null/""; phiếu "Đang giao"; lịch sử giữ ngày và người ký cũ cùng giá trị cũ của phiếu', () => {
    const r = applyShipmentRevert(base({ tinhTrangGiaoHang: 'Đang giao' }), confirmed(1), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const d1 = r.patch.cacDotGiao[0];
    expect(d1).toMatchObject({ tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' });
    expect(r.patch).toMatchObject({ tinhTrangGiaoHang: 'Đang giao', ngayGiaoThucTe: null, kyNhan: '' });
    expect(d1.lichSuHuyXacNhan?.[0]).toMatchObject({ thoiDiem: ctx.at, userId: 'u1', nguoiThucHien: 'Quản trị', lyDo: 'Khách chưa nhận hàng thật', ngayGiaoThucTeCu: '2026-10-01', kyNhanCu: 'Người ký 1', tinhTrangGiaoHangCu: 'HOAN_TAT', tinhTrangPhieuCu: 'Đang giao' });
  });

  it('hủy Đợt 1 trong khi Đợt 2 vẫn xác nhận: phiếu KHÔNG về "Chưa giao" (là "Đang giao"), Đợt 2 giữ nguyên từng ô', () => {
    const d2 = confirmed(2);
    const r = applyShipmentRevert(base({ cacDotGiao: [confirmed(1), d2], tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-10-02', kyNhan: 'Người ký 2' }), confirmed(1), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.tinhTrangGiaoHang).toBe('Đang giao');
    expect(r.patch.tinhTrangGiaoHang).not.toMatch(/Chưa giao|CHUA_GIAO/);
    expect(r.patch.ngayGiaoThucTe).toBeNull();
    // so với bản dựng MỚI, không phải chính đối tượng d2 đi qua map (nếu không, sửa d2 tại chỗ vẫn "bằng")
    expect(r.patch.cacDotGiao[1]).toEqual(confirmed(2));
    expect(r.wasCompletedBefore).toBe(true);
    expect(r.isCompletedAfter).toBe(false);
  });

  it('đích là bản sao cũ (ngày/người ký/serial khác đợt đang lưu): lịch sử ghi giá trị ĐANG LƯU, đợt đang lưu là đợt bị xóa, giá trị của bản sao không lọt vào patch', () => {
    const stored = confirmed(1, { ngayGiaoThucTe: '2026-10-05', kyNhan: 'Người ký mới' });
    const stale = confirmed(1, { ngayGiaoThucTe: '2026-09-15', kyNhan: 'Người ký cũ', danhSachMaMay: ['SN-CU'] });
    const delivery = base({ cacDotGiao: [stored, ship(2)] });
    const r = applyShipmentRevert(delivery, stale, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.historyEntry).toMatchObject({ ngayGiaoThucTeCu: '2026-10-05', kyNhanCu: 'Người ký mới' });
    expect(r.patch.cacDotGiao[0]).toMatchObject({ id: 'DOT-1', danhSachMaMay: ['SN-1'], tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' });
    expect(JSON.stringify(r.patch)).not.toMatch(/2026-09-15|Người ký cũ|SN-CU/);
    const p = previewShipmentRevert(delivery, stale);
    expect(p.ok && p.shipment).toMatchObject({ ngayGiaoThucTe: '2026-10-05', kyNhan: 'Người ký mới' });
  });

  it('các đợt còn lại đều xác nhận và vẫn phủ đủ (đợt trùng): suy ra "Hoàn tất" với ngày mới nhất và người ký của đợt đó', () => {
    const m = deriveMasterFromShipments(base({ products: [product(1)] }), [confirmed(2, { ngayGiaoThucTe: '2026-10-09', kyNhan: 'Người ký 2' })]);
    expect(m).toEqual({ tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-10-09', kyNhan: 'Người ký 2', tienDoLuyKe: 100 });
  });

  it('phiếu cũ: cacDotGiao [] nhưng phiếu đã giao; đích là Đợt 1 dựng tạm của CHÍNH phiếu (cùng số phiếu xuất) → ok, phiếu được xóa ngày/người ký, lịch sử có giá trị cũ của phiếu, đúng một đợt', () => {
    const legacy = base({ cacDotGiao: [], soPhieuXuat: 'PXK-1', tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-09-20', kyNhan: 'Anh Ba' });
    const r = applyShipmentRevert(legacy, { id: 'DOT-1', dotGiaoHang: 1, soPhieuXuat: 'PXK-1', ngayGiaoThucTe: '2026-09-20', kyNhan: 'Anh Ba', products: [product(2)] } as DeliveryShipment, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.updatedShipments).toHaveLength(1);
    expect(r.patch).toMatchObject({ tinhTrangGiaoHang: 'Đang giao', ngayGiaoThucTe: null, kyNhan: '' });
    expect(r.updatedShipments[0].lichSuHuyXacNhan?.[0]).toMatchObject({ tinhTrangPhieuCu: 'Hoàn tất', ngayGiaoThucTePhieuCu: '2026-09-20', kyNhanPhieuCu: 'Anh Ba' });
  });

  it('phiếu cũ: đích là "Đợt 1" dựng tạm của PHIẾU ANH EM (số phiếu xuất khác phiếu này) → ok:false, không dựng đợt từ đích; phiếu giữ nguyên ngày/người ký', () => {
    const legacy = base({ cacDotGiao: [], soPhieuXuat: 'PXK-A', tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-09-20', kyNhan: 'Anh Ba' });
    const sibling = { id: 'DOT-1', dotGiaoHang: 1, soPhieuXuat: 'PXK-B', ngayGiaoThucTe: '2026-09-22', kyNhan: 'Chị Tư', danhSachMaMay: ['SN-B'], products: [product(1)] } as DeliveryShipment;
    expect(applyShipmentRevert(legacy, sibling, ctx)).toEqual({ ok: false, error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' });
    expect(previewShipmentRevert(legacy, sibling)).toMatchObject({ ok: false });
    expect(legacy).toMatchObject({ cacDotGiao: [], tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-09-20', kyNhan: 'Anh Ba' });
  });

  it('không tìm thấy đợt (id và dotGiaoHang đều khác) → ok:false, lỗi tiếng Việt; đầu vào không bị sửa', () => {
    const d = base();
    const r = applyShipmentRevert(d, ship(9, { id: 'DOT-9' }), ctx);
    expect(r).toEqual({ ok: false, error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' });
    expect(d.cacDotGiao?.[0].ngayGiaoThucTe).toBe('2026-10-01');
  });

  it('đợt chưa xác nhận → ok:false, không thêm lịch sử', () => {
    const r = applyShipmentRevert(base(), ship(2), ctx);
    expect(r).toEqual({ ok: false, error: 'Đợt này chưa được xác nhận bàn giao nên không có gì để hủy.' });
  });

  it('lý do rỗng / toàn khoảng trắng / ngắn hơn 5 ký tự → ok:false; lý do được lưu đã cắt khoảng trắng', () => {
    for (const reason of ['', '   ', 'ok']) {
      expect(applyShipmentRevert(base(), confirmed(1), { ...ctx, reason }).ok).toBe(false);
    }
    const r = applyShipmentRevert(base(), confirmed(1), { ...ctx, reason: '  Giao nhầm địa chỉ  ' });
    expect(r.ok && r.historyEntry.lyDo).toBe('Giao nhầm địa chỉ');
  });

  it('phiếu đã hủy ("HUY" hoặc "Hủy") → ok:false "Phiếu đã hủy"', () => {
    for (const st of ['HUY', 'Hủy', 'Đã hủy']) {
      const r = applyShipmentRevert(base({ tinhTrangGiaoHang: st }), confirmed(1), ctx);
      expect(r).toEqual({ ok: false, error: 'Phiếu đã hủy, không hủy xác nhận đợt được.' });
    }
  });

  it('hai đợt đều không có id → khớp theo dotGiaoHang 2, không bao giờ khớp đợt đầu vì undefined === undefined', () => {
    const list = [confirmed(1, { id: undefined as unknown as string }), confirmed(2, { id: undefined as unknown as string })];
    expect(findShipmentIndex(list, { dotGiaoHang: 2 } as DeliveryShipment)).toBe(1);
    expect(findShipmentIndex(list, { id: '', dotGiaoHang: 1 } as DeliveryShipment)).toBe(0);
    expect(findShipmentIndex(list, { dotGiaoHang: 3 } as DeliveryShipment)).toBe(-1);
  });

  it('khớp từng cặp: cả hai id không rỗng thì phải bằng nhau, KHÔNG rơi về số đợt (đợt dựng tạm DOT-2 của phiếu anh em không khớp DOT-2-… của chính phiếu)', () => {
    const stored = [confirmed(1, { id: 'DOT-1-1' }), confirmed(2, { id: 'DOT-2-2' })];
    expect(findShipmentIndex(stored, { id: 'DOT-2', dotGiaoHang: 2 })).toBe(-1);
    expect(findShipmentIndex(stored, { id: 'DOT-2-2', dotGiaoHang: 2 })).toBe(1);
    expect(findShipmentIndex(stored, { id: 'DOT-2-2', dotGiaoHang: 1 })).toBe(1);
  });

  it('đích có id nhưng không đợt nào của phiếu trùng id (đợt dựng tạm của phiếu anh em) → ok:false, lỗi không tìm thấy đợt; phiếu không bị sửa', () => {
    const d = base({ cacDotGiao: [confirmed(1, { id: 'DOT-1-1' }), confirmed(2, { id: 'DOT-2-2' })], tinhTrangGiaoHang: 'Hoàn tất' });
    const sibling = confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-B' });
    expect(applyShipmentRevert(d, sibling, ctx)).toEqual({ ok: false, error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' });
    expect(previewShipmentRevert(d, sibling)).toMatchObject({ ok: false });
    expect(d.cacDotGiao?.[1]).toEqual(confirmed(2, { id: 'DOT-2-2' }));
  });

  it('id chỉ quyết định khi CẢ HAI bên có id: đợt đang lưu không có id (thiếu hoặc rỗng) thì khớp theo số đợt; đích không có id (thiếu hoặc toàn khoảng trắng) cũng khớp theo số đợt', () => {
    const noId = [confirmed(1, { id: undefined as unknown as string }), confirmed(2, { id: '' })];
    expect(findShipmentIndex(noId, { id: 'DOT-2', dotGiaoHang: 2 })).toBe(1);
    const withIds = [confirmed(1, { id: 'DOT-1-1' }), confirmed(2, { id: 'DOT-2-2' })];
    expect(findShipmentIndex(withIds, { dotGiaoHang: 2 })).toBe(1);
    expect(findShipmentIndex(withIds, { id: '  ', dotGiaoHang: 1 })).toBe(0);
  });

  it('dòng gộp: đích là đợt của phiếu anh em mang CÙNG id DOT-2 nhưng số phiếu xuất khác → ok:false (lỗi không tìm thấy đợt), xem trước cũng từ chối, sổ đợt của phiếu không bị sửa', () => {
    const d = base({ cacDotGiao: [confirmed(1, { id: 'DOT-1-111', soPhieuXuat: 'PXK-A1' }), confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-A2' })], tinhTrangGiaoHang: 'Hoàn tất' });
    const sibling = confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-B', kyNhan: 'Người ký B' });
    expect(applyShipmentRevert(d, sibling, ctx)).toEqual({ ok: false, error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' });
    expect(previewShipmentRevert(d, sibling)).toEqual({ ok: false, error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' });
    expect(d.cacDotGiao).toEqual([confirmed(1, { id: 'DOT-1-111', soPhieuXuat: 'PXK-A1' }), confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-A2' })]);
  });

  it('dòng gộp: đợt của CHÍNH phiếu (cùng id DOT-2, cùng số phiếu xuất PXK-A2) vẫn hủy được; chỉ đợt ở vị trí 1 bị xóa, đợt ở vị trí 0 giữ nguyên', () => {
    const d = base({ cacDotGiao: [confirmed(1, { id: 'DOT-1-111', soPhieuXuat: 'PXK-A1' }), confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-A2' })], tinhTrangGiaoHang: 'Hoàn tất' });
    const r = applyShipmentRevert(d, confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-A2' }), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.cacDotGiao[1]).toMatchObject({ id: 'DOT-2', soPhieuXuat: 'PXK-A2', tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' });
    expect(r.patch.cacDotGiao[0]).toEqual(confirmed(1, { id: 'DOT-1-111', soPhieuXuat: 'PXK-A1' }));
  });

  it('hủy thành công đợt ở vị trí khác 0, khớp theo id: [DOT-1-1, DOT-2-2] hủy Đợt 2 → vị trí 1 bị xóa kèm 1 mục lịch sử, vị trí 0 bằng bản dựng mới', () => {
    const d = base({ cacDotGiao: [confirmed(1, { id: 'DOT-1-1' }), confirmed(2, { id: 'DOT-2-2' })], tinhTrangGiaoHang: 'Hoàn tất' });
    const r = applyShipmentRevert(d, confirmed(2, { id: 'DOT-2-2' }), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.patch.cacDotGiao).toHaveLength(2);
    expect(r.patch.cacDotGiao[1]).toMatchObject({ id: 'DOT-2-2', tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' });
    expect(r.patch.cacDotGiao[1].lichSuHuyXacNhan).toHaveLength(1);
    expect(r.patch.cacDotGiao[0]).toEqual(confirmed(1, { id: 'DOT-1-1' }));
    expect(r.updatedShipments).toEqual(r.patch.cacDotGiao);
  });

  it('số phiếu xuất rỗng ở đích hoặc ở đợt đang lưu (hoặc chỉ khác khoảng trắng đầu/cuối) → không đủ bằng chứng để chặn: id quyết định như trước', () => {
    const d = base({ cacDotGiao: [confirmed(1, { id: 'DOT-1-111', soPhieuXuat: 'PXK-A1' }), confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-A2' })], tinhTrangGiaoHang: 'Hoàn tất' });
    for (const pxk of [undefined, '', '   ', ' PXK-A2 ']) {
      const r = applyShipmentRevert(d, { id: 'DOT-2', dotGiaoHang: 2, soPhieuXuat: pxk }, ctx);
      expect(r.ok, `đích có soPhieuXuat ${JSON.stringify(pxk)}`).toBe(true);
      if (r.ok) expect(r.patch.cacDotGiao[1]).toMatchObject({ id: 'DOT-2', tinhTrangGiaoHang: 'CHO_GIAO' });
    }
    const storedEmpty = base({ cacDotGiao: [confirmed(1, { id: 'DOT-1-111', soPhieuXuat: 'PXK-A1' }), confirmed(2, { id: 'DOT-2', soPhieuXuat: '  ' })], tinhTrangGiaoHang: 'Hoàn tất' });
    expect(applyShipmentRevert(storedEmpty, confirmed(2, { id: 'DOT-2', soPhieuXuat: 'PXK-B' }), ctx).ok).toBe(true);
  });

  it('khớp theo số đợt (đợt đang lưu không có id) mà số phiếu xuất cùng không rỗng và khác nhau → cũng bị từ chối; cùng số phiếu xuất thì vẫn hủy được', () => {
    const d = base({ cacDotGiao: [confirmed(1, { id: '', soPhieuXuat: 'PXK-A1' }), confirmed(2, { id: '', soPhieuXuat: 'PXK-A2' })], tinhTrangGiaoHang: 'Hoàn tất' });
    expect(applyShipmentRevert(d, { dotGiaoHang: 2, soPhieuXuat: 'PXK-B' }, ctx)).toEqual({ ok: false, error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' });
    expect(applyShipmentRevert(d, { dotGiaoHang: 2, soPhieuXuat: 'PXK-A2' }, ctx).ok).toBe(true);
  });

  it('chuỗi trạng thái cũ: "Hoàn tất" + ngày hoặc "HOAN_TAT" không ngày đều tính là đã xác nhận', () => {
    expect(applyShipmentRevert(base({ cacDotGiao: [ship(1, { tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-10-01' }), ship(2)] }), ship(1), ctx).ok).toBe(true);
    expect(applyShipmentRevert(base({ cacDotGiao: [ship(1, { tinhTrangGiaoHang: 'HOAN_TAT' }), ship(2)] }), ship(1), ctx).ok).toBe(true);
  });

  it('patch không có giá trị undefined và chỉ gồm 5 khóa (không __customerInfo, không stt)', () => {
    const polluted = base({ __customerInfo: { tenKhachHang: 'X' }, stt: 7 } as unknown as Partial<Delivery>);
    const r = applyShipmentRevert(polluted, confirmed(1), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(Object.keys(r.patch).sort()).toEqual(['cacDotGiao', 'kyNhan', 'ngayGiaoThucTe', 'tienDoLuyKe', 'tinhTrangGiaoHang']);
    expect(hasUndefined(r.patch as unknown as Record<string, unknown>)).toBe(false);
  });

  it('áp dụng lại kết quả lên chính đợt vừa hủy → ok:false, lịch sử vẫn 1 mục', () => {
    const r1 = applyShipmentRevert(base(), confirmed(1), ctx);
    if (!r1.ok) throw new Error('lần 1 phải ok');
    const next = base({ cacDotGiao: r1.patch.cacDotGiao, ...(r1.patch as Partial<Delivery>) });
    const r2 = applyShipmentRevert(next, r1.patch.cacDotGiao[0], ctx);
    expect(r2.ok).toBe(false);
    expect(next.cacDotGiao?.[0].lichSuHuyXacNhan).toHaveLength(1);
  });

  it('đợt bị hủy xác nhận giữ nguyên sản phẩm, serial, số phiếu xuất, biên bản, tin đã gửi, giá trị xuất kho', () => {
    const r = applyShipmentRevert(base(), confirmed(1), ctx);
    if (!r.ok) throw new Error('phải ok');
    expect(r.patch.cacDotGiao[0]).toMatchObject({ products: [product(1)], danhSachMaMay: ['SN-1'], soPhieuXuat: 'PXK-1', soBienBanNghiemThu: 'BB-1', ngayNghiemThu: '2026-10-01', trangThaiGuiTinGiaoHang: 'THÀNH CÔNG', giaTriXuatKhoDotNay: 1_000_000 });
  });

  it('tienDoLuyKe sau hủy chỉ đếm đợt đã xác nhận (baseline 2, hai đợt mỗi đợt 1, hủy một → 50)', () => {
    const r = applyShipmentRevert(base({ cacDotGiao: [confirmed(1), confirmed(2)], tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-10-02' }), confirmed(1), ctx);
    expect(r.ok && r.patch.tienDoLuyKe).toBe(50);
  });

  it('previewShipmentRevert cho hộp xác nhận: trả trạng thái phiếu sẽ chuyển và số đợt còn đã giao', () => {
    const p = previewShipmentRevert(base({ cacDotGiao: [confirmed(1), confirmed(2)], tinhTrangGiaoHang: 'Hoàn tất' }), confirmed(1));
    expect(p).toMatchObject({ ok: true, master: { tinhTrangGiaoHang: 'Đang giao' }, confirmedRemaining: 1 });
    expect(previewShipmentRevert(base(), ship(2))).toMatchObject({ ok: false });
  });

  it('DeliverySchema giữ lichSuHuyXacNhan khi parse (schema .strip() sẽ bỏ nếu quên khai báo)', () => {
    const r = applyShipmentRevert(base(), confirmed(1), ctx);
    if (!r.ok) throw new Error('phải ok');
    const parsed = DeliverySchema.safeParse({ ...base(), ...r.patch });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.cacDotGiao?.[0].lichSuHuyXacNhan).toHaveLength(1);
  });
});
