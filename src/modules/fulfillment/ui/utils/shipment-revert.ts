/**
 * Đợt 0A (GH01): hủy xác nhận bàn giao MỘT đợt có lý do, không ghi đè âm thầm (nguyên tắc 3 của kế hoạch tổng thể).
 * Hàm thuần, không chạm CSDL; ngăn chi tiết và hook chỉ gọi hàm này rồi ghi `patch` qua PUT /api/workflow/update.
 * Trạng thái phiếu được SUY từ các đợt còn lại (không ép "Chưa giao"); ngày/người ký cũ nằm trong lichSuHuyXacNhan của đợt.
 */
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { CanonicalDeliveryStatus, DeliveryStatusVO } from '@/src/domain/value-objects/DeliveryStatusVO';
import { reconcileDeliveryShipments } from './delivery-reconciler';

export const REVERT_REASON_MIN = 5;
/** Chữ trạng thái khi phiếu không còn đủ đợt đã giao: cùng chữ với hủy xác nhận cấp phiếu (useDeliveriesActions.ts). GH04 chuẩn hóa mã sau. */
export const PARTIAL_DELIVERY_STATUS = 'Đang giao';
export const COMPLETED_DELIVERY_STATUS = 'Hoàn tất';

export type ShipmentRevertHistoryEntry = NonNullable<DeliveryShipment['lichSuHuyXacNhan']>[number];

export interface ShipmentRevertContext {
  reason: string;
  actorId?: string;
  actorName?: string;
  at: string;
}

export interface MasterDerivation {
  tinhTrangGiaoHang: string;
  ngayGiaoThucTe: string | null;
  kyNhan: string;
  tienDoLuyKe: number;
}

export interface ShipmentRevertPatch extends MasterDerivation {
  cacDotGiao: DeliveryShipment[];
}

export type ShipmentRevertResult =
  | { ok: false; error: string }
  | {
      ok: true;
      patch: ShipmentRevertPatch;
      updatedShipments: DeliveryShipment[];
      historyEntry: ShipmentRevertHistoryEntry;
      wasCompletedBefore: boolean;
      isCompletedAfter: boolean;
    };

export type ShipmentRevertPreview =
  | { ok: false; error: string }
  | { ok: true; master: MasterDerivation; confirmedRemaining: number; shipment: DeliveryShipment };

export function isShipmentConfirmed(s: Pick<DeliveryShipment, 'tinhTrangGiaoHang' | 'ngayGiaoThucTe'>): boolean {
  return DeliveryStatusVO.isCompleted(s.tinhTrangGiaoHang, s.ngayGiaoThucTe);
}

/**
 * Tìm đợt đích trong sổ đợt, so TỪNG CẶP (đợt đang lưu, đích): khi cả hai bên đều có id (không rỗng) thì id phải bằng nhau và
 * KHÔNG bao giờ rơi về số đợt — đợt dựng tạm `DOT-n` của phiếu anh em trong nhóm gộp trùng số đợt với `DOT-n-…` của chính phiếu
 * nhưng không phải đợt đó. Chỉ khi một trong hai bên không có id thì `dotGiaoHang` mới quyết định. Không bao giờ so `undefined === undefined`.
 */
export function findShipmentIndex(shipments: DeliveryShipment[], target: Partial<DeliveryShipment>): number {
  const idOf = (s: Partial<DeliveryShipment>): string => (typeof s.id === 'string' ? s.id.trim() : '');
  const targetId = idOf(target);
  if (targetId) {
    const byId = shipments.findIndex(s => idOf(s) === targetId);
    if (byId !== -1) return byId;
  }
  if (typeof target.dotGiaoHang === 'number') {
    // cặp có id ở cả hai bên đã được so ở trên và không bằng nhau → loại; còn lại (một bên thiếu id) thì số đợt quyết định
    return shipments.findIndex(s => s.dotGiaoHang === target.dotGiaoHang && (!targetId || !idOf(s)));
  }
  return -1;
}

export function deriveMasterFromShipments(delivery: Delivery, shipments: DeliveryShipment[]): MasterDerivation {
  const confirmedOnes = shipments.filter(isShipmentConfirmed);
  const probe = { ...delivery, cacDotGiao: confirmedOnes } as Delivery;
  const recon = reconcileDeliveryShipments(probe);
  const tienDoLuyKe = Math.max(0, Math.min(100, Math.round(recon.tienDoLuyKe)));

  if (shipments.length > 0 && confirmedOnes.length === shipments.length && recon.isFullyDelivered) {
    const latest = confirmedOnes.reduce((a, b) => (String(b.ngayGiaoThucTe || '') > String(a.ngayGiaoThucTe || '') ? b : a));
    return {
      tinhTrangGiaoHang: COMPLETED_DELIVERY_STATUS,
      ngayGiaoThucTe: latest.ngayGiaoThucTe || null,
      kyNhan: latest.kyNhan || '',
      tienDoLuyKe,
    };
  }
  return { tinhTrangGiaoHang: PARTIAL_DELIVERY_STATUS, ngayGiaoThucTe: null, kyNhan: '', tienDoLuyKe };
}

interface Located {
  shipments: DeliveryShipment[];
  index: number;
}

function locate(delivery: Delivery, target: Partial<DeliveryShipment>): Located | { error: string } {
  if (DeliveryStatusVO.fromString(delivery.tinhTrangGiaoHang) === CanonicalDeliveryStatus.DA_HUY) {
    return { error: 'Phiếu đã hủy, không hủy xác nhận đợt được.' };
  }
  let shipments: DeliveryShipment[] = Array.isArray(delivery.cacDotGiao) ? [...delivery.cacDotGiao] : [];
  let index = findShipmentIndex(shipments, target);

  // Phiếu cũ: không có sổ đợt trong CSDL nhưng phiếu đã giao → "Đợt 1" được dựng tạm từ phiếu (migrateLegacyDeliveriesToUnifiedLedger).
  // Chỉ nhận đích mang đúng số phiếu xuất của CHÍNH phiếu này: "Đợt 1" dựng tạm của phiếu anh em trong cùng nhóm gộp có số phiếu xuất khác.
  if (index === -1 && shipments.length === 0 && target.dotGiaoHang === 1
    && String(target.soPhieuXuat ?? '').trim() === String(delivery.soPhieuXuat ?? '').trim()
    && DeliveryStatusVO.isCompleted(delivery.tinhTrangGiaoHang, delivery.ngayGiaoThucTe)) {
    shipments = [{
      ...(target as DeliveryShipment),
      ngayGiaoThucTe: target.ngayGiaoThucTe ?? delivery.ngayGiaoThucTe ?? null,
      kyNhan: target.kyNhan || delivery.kyNhan || '',
      tinhTrangGiaoHang: target.tinhTrangGiaoHang || 'HOAN_TAT',
    }];
    index = 0;
  }
  if (index === -1) return { error: 'Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.' };
  if (!isShipmentConfirmed(shipments[index])) return { error: 'Đợt này chưa được xác nhận bàn giao nên không có gì để hủy.' };
  return { shipments, index };
}

export function previewShipmentRevert(delivery: Delivery, target: Partial<DeliveryShipment>): ShipmentRevertPreview {
  const located = locate(delivery, target);
  if ('error' in located) return { ok: false, error: located.error };
  const current = located.shipments[located.index];
  const after = located.shipments.map((s, i) => (i === located.index ? { ...s, tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' } : s));
  return {
    ok: true,
    master: deriveMasterFromShipments(delivery, after),
    confirmedRemaining: after.filter(isShipmentConfirmed).length,
    shipment: current,
  };
}

export function applyShipmentRevert(delivery: Delivery, target: Partial<DeliveryShipment>, ctx: ShipmentRevertContext): ShipmentRevertResult {
  const reason = (ctx.reason || '').trim();
  if (reason.length < REVERT_REASON_MIN) {
    return { ok: false, error: `Nhập lý do hủy xác nhận (ít nhất ${REVERT_REASON_MIN} ký tự).` };
  }
  const located = locate(delivery, target);
  if ('error' in located) return { ok: false, error: located.error };

  const current = located.shipments[located.index];
  const historyEntry: ShipmentRevertHistoryEntry = {
    thoiDiem: ctx.at,
    userId: ctx.actorId,
    nguoiThucHien: ctx.actorName,
    lyDo: reason,
    ngayGiaoThucTeCu: current.ngayGiaoThucTe ?? null,
    kyNhanCu: current.kyNhan || '',
    tinhTrangGiaoHangCu: current.tinhTrangGiaoHang || '',
    tinhTrangPhieuCu: delivery.tinhTrangGiaoHang || '',
    ngayGiaoThucTePhieuCu: delivery.ngayGiaoThucTe ?? null,
    kyNhanPhieuCu: delivery.kyNhan || '',
  };
  const reverted: DeliveryShipment = {
    ...current,
    tinhTrangGiaoHang: 'CHO_GIAO',
    ngayGiaoThucTe: null,
    kyNhan: '',
    lichSuHuyXacNhan: [...(current.lichSuHuyXacNhan || []), historyEntry],
  };
  const updatedShipments = located.shipments.map((s, i) => (i === located.index ? reverted : s));
  const master = deriveMasterFromShipments(delivery, updatedShipments);
  const patch: ShipmentRevertPatch = {
    cacDotGiao: updatedShipments,
    tinhTrangGiaoHang: master.tinhTrangGiaoHang,
    ngayGiaoThucTe: master.ngayGiaoThucTe,
    kyNhan: master.kyNhan,
    tienDoLuyKe: master.tienDoLuyKe,
  };
  return {
    ok: true,
    patch,
    updatedShipments,
    historyEntry,
    wasCompletedBefore: DeliveryStatusVO.isCompleted(delivery.tinhTrangGiaoHang, delivery.ngayGiaoThucTe),
    isCompletedAfter: master.tinhTrangGiaoHang === COMPLETED_DELIVERY_STATUS,
  };
}
