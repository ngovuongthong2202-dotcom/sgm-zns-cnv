import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { CanonicalDeliveryStatus, DeliveryStatusVO } from '@/src/domain/value-objects/DeliveryStatusVO';
import { Button } from '@/src/design-system/Button';
import { formatDate } from '@/src/shared/utils/formatDate';
import { previewShipmentRevert, REVERT_REASON_MIN } from '../utils/shipment-revert';

interface RevertShipmentConfirmModalProps {
  delivery: Delivery;
  shipment: DeliveryShipment;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
}

/**
 * Trạng thái phiếu đang lưu là chuỗi tự do: có dòng ghi mã (HOAN_TAT, DANG_GIAO, CHO_GIAO), có dòng ghi chữ.
 * Hộp chỉ hiện nhãn tiếng Việt thường (qua DeliveryStatusVO), không bao giờ hiện nguyên chuỗi đã lưu; trống thì "Chưa rõ".
 */
const STATUS_LABEL: Record<CanonicalDeliveryStatus, string> = {
  [CanonicalDeliveryStatus.HOAN_TAT]: 'Hoàn tất',
  [CanonicalDeliveryStatus.DANG_GIAO]: 'Đang giao',
  [CanonicalDeliveryStatus.CHUA_GIAO]: 'Chưa giao',
  [CanonicalDeliveryStatus.DA_HUY]: 'Đã hủy',
};
const storedStatusLabel = (raw?: string | null): string => (raw?.trim() ? STATUS_LABEL[DeliveryStatusVO.fromString(raw)] : 'Chưa rõ');

/**
 * Đợt 0A (GH01): hộp xác nhận cho "Hủy xác nhận đợt" — liệt kê những gì sẽ bị xóa, phiếu sẽ chuyển sang gì,
 * và bắt nhập lý do (không điền sẵn; nguyên tắc 2). Nút cuối màu đỏ (danger), phần còn lại amber.
 * Đang gửi thì Escape/bấm nền không đóng hộp (cùng lý do nút "Quay lại" bị vô hiệu).
 */
export function RevertShipmentConfirmModal({ delivery, shipment, onCancel, onConfirm }: RevertShipmentConfirmModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const preview = useMemo(() => previewShipmentRevert(delivery, shipment), [delivery, shipment]);
  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= REVERT_REASON_MIN && preview.ok && !submitting;
  const n = shipment.dotGiaoHang;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !submitting) onCancel(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 z-[250]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-200 p-3 sm:p-4 z-[260] focus:outline-none"
        >
          <Dialog.Title className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <AlertTriangle size={18} className="text-amber-600" />
            Hủy xác nhận Đợt {n} – {shipment.soPhieuXuat || delivery.deliveryId || ''}
          </Dialog.Title>

          {!preview.ok ? (
            <p className="mt-3 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-3">{preview.error}</p>
          ) : (
            <div className="mt-3 space-y-3 text-sm">
              <section className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-amber-900">Sẽ xóa khỏi đợt này</h3>
                <ul className="mt-1.5 space-y-1 text-amber-950">
                  <li>Ngày giao thực tế: <strong>{preview.shipment.ngayGiaoThucTe ? formatDate(preview.shipment.ngayGiaoThucTe) : '—'}</strong></li>
                  <li>Người ký nhận: <strong>{preview.shipment.kyNhan || '—'}</strong></li>
                  <li>Trạng thái đợt: <strong>Đã giao → Chờ giao</strong></li>
                </ul>
              </section>
              <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">Phiếu sẽ chuyển</h3>
                <p className="mt-1.5 text-slate-800">
                  <strong>{storedStatusLabel(delivery.tinhTrangGiaoHang)} → {preview.master.tinhTrangGiaoHang} (còn {preview.confirmedRemaining} đợt đã giao)</strong>
                </p>
              </section>
              <section className="rounded-xl border border-slate-200 p-3">
                <h3 className="text-xs font-bold uppercase tracking-wide text-slate-700">Giữ nguyên</h3>
                <p className="mt-1.5 text-slate-700">Sản phẩm và serial của đợt, số phiếu xuất kho, biên bản nghiệm thu, và tin Zalo đã gửi (không thu hồi được). Ngày giao và người ký cũ được lưu vào lịch sử của đợt để tra lại.</p>
              </section>
              <div>
                <label htmlFor="revert-shipment-reason" className="block text-xs font-bold uppercase tracking-wide text-slate-700 mb-1">
                  Lý do hủy xác nhận <span className="text-amber-600">*</span>
                </label>
                <textarea
                  id="revert-shipment-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={`Ít nhất ${REVERT_REASON_MIN} ký tự`}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>Quay lại</Button>
            <Button type="button" variant="danger" onClick={handleConfirm} disabled={!canConfirm} leftIcon={<RotateCcw size={14} />}>
              {`Hủy xác nhận đợt ${n}`}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
