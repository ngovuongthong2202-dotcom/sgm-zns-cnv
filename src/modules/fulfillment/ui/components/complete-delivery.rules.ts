import { z } from 'zod';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { isAfterVietnamToday } from '@/src/shared/utils/vietnamDate';

/** Đợt 0A (GH15): luật của hộp "Xác nhận hoàn tất" tách khỏi component để kiểm thử trong node. */
export const CompleteSchema = z.object({
  // Rà soát cuối: kiểm dạng yyyy-MM-dd trước luật "sau hôm nay" (isAfterVietnamToday trả false cho chuỗi sai dạng, ví dụ năm 5 chữ số).
  ngayGiaoThucTe: z.string().min(1, 'Vui lòng chọn ngày giao').regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày bàn giao không đúng định dạng').refine(d => !isAfterVietnamToday(d), 'Ngày bàn giao không được sau hôm nay'),
  kyNhan: z.string().min(1, 'Vui lòng nhập tên/sđt người nhận'),
  soPhieuXuat: z.string().optional(),
  keToanKho: z.string().optional(),
  khoXuat: z.string().optional(),
  donViVanChuyen: z.string().optional(),
  thoGiaoMay: z.string().optional(),
  sdtThoGiaoMay: z.string().optional(),
  ghiChu: z.string().optional(),
});

export type CompleteFormValues = z.infer<typeof CompleteSchema>;

/**
 * Ngày bàn giao thực tế ban đầu: chỉ ngày ĐÃ GHI (xác nhận lại), không bao giờ là ngày hẹn hay hôm nay.
 * 14/14 phiếu hoàn tất từng có ngày thực tế trùng ngày hẹn vì giá trị điền sẵn (GH15).
 */
export function resolveInitialHandoverDate(delivery: Pick<Delivery, 'ngayGiaoThucTe'>, targetShipment?: Pick<DeliveryShipment, 'ngayGiaoThucTe'> | null): string {
  if (targetShipment) return targetShipment.ngayGiaoThucTe || '';
  return delivery.ngayGiaoThucTe || '';
}
