import { Router } from 'express';
import type { Request, Response } from 'express';

/**
 * Đợt 0A (10/2026) – các đường bị khóa (403) hoặc gỡ (410).
 * Mỗi hàm trả lời cố định: không xác thực, không đọc/ghi CSDL, không phụ thuộc nội dung gửi lên,
 * nên kết quả là như nhau với mọi token (nghiệm thu bằng curl). Bảng mã: docs/superpowers/plans/2026-10-09-dot-0a-lo-1-tat-chuc-nang-nguy-hiem.md
 */
export type RetiredCode =
  | 'MERGE_LOCKED'
  | 'RECONCILE_LOCKED'
  | 'SYNC_REMOVED'
  | 'CRON_PREVIEW_REMOVED'
  | 'BULK_ZNS_LOCKED'
  | 'MIGRATION_REMOVED';

export interface RetiredBody {
  success: false;
  code: RetiredCode;
  error: string;
}

export function retired(status: 403 | 410, code: RetiredCode, error: string) {
  return (_req: Request, res: Response) => {
    const body: RetiredBody = { success: false, code, error };
    return res.status(status).json(body);
  };
}

export const RETIRED = {
  merge: retired(403, 'MERGE_LOCKED', 'Chức năng gộp khách hàng đang tạm khóa để nâng cấp an toàn (Đợt 0A).'),
  reconcileDuplicates: retired(403, 'RECONCILE_LOCKED', 'Công cụ tự đánh số lại báo giá trùng đã bị khóa (Đợt 0A).'),
  syncSnapshots: retired(410, 'SYNC_REMOVED', 'Tác vụ đồng bộ hồ sơ khách sang chứng từ đã được gỡ (Đợt 0A).'),
  cronPreview: retired(410, 'CRON_PREVIEW_REMOVED', 'Màn đối soát tác vụ định kỳ đã được gỡ (Đợt 0A).'),
  bulkZns: retired(410, 'BULK_ZNS_LOCKED', 'Gửi ZNS hàng loạt đã tạm khóa (Đợt 0A). Vui lòng gửi từng chứng từ.'),
  migration: retired(410, 'MIGRATION_REMOVED', 'Công cụ chuyển đổi dữ liệu một lần đã được gỡ (Đợt 0A).'),
} as const;

const router = Router();

// Toàn bộ /api/migration và /api/migration/* (mọi phương thức). Router migration cũ đã bị xóa khỏi kho.
router.use('/migration', RETIRED.migration);

export const retiredRoutes = router;
