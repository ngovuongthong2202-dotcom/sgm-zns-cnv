import { sendZnsMessage } from './zns';
import { notify } from '@/src/shared/utils/notify';
import { auditLogsRepo, znsMessagesRepo } from '@/src/data/repositories/system.repo';
import { normalizeLegacyStatus, EntityZnsStatus } from './enums/zns-status';
import { normalizePhoneVN } from '@/src/shared/utils/phone';

export type SendZnsArgs = Parameters<typeof sendZnsMessage>[0] & { 
  attemptBucket?: number;
  userRole?: string;
  forceResend?: boolean;
};

export async function checkRecentZnsDoc(entityId: string, messageType: string) {
  try {
    const snap = await auditLogsRepo.list({
      limit: 10,
      fkField: 'entityId',
      fkId: entityId,
      sortField: 'timestamp',
      sortDirection: 'desc'
    });
    
    if (!snap || snap.length === 0) return null;
    const docData = snap.find((s: Record<string, unknown>) => s.action === 'ZNS_SEND') as (Record<string, unknown> & { timestamp: string, details?: { messageType?: string } }) | undefined;
    if (!docData) return null;
    
    // Assuming backend logs payload.messageType in details
    if (docData.details?.messageType && docData.details.messageType !== messageType) return null;
    
    const createdMs = new Date(docData.timestamp).getTime();
    if (Date.now() - createdMs < 60000) {
      return {
        ...docData,
        createdAt: docData.timestamp
      };
    }
    return null;
  } catch (e) {
    // If index is missing or any other error, fallback safely
    return null;
  }
}

const ENTITY_REQUIRED_SNAPSHOT: Record<string, string[]> = {
  CUSTOMER: ['tenKhachHang', 'sdt'],
  QUOTATION: ['tenKhachHang', 'sdt', 'soPhieuBaoGia'],
  CONTRACT: ['tenKhachHang', 'sdt', 'soHopDong'], // It might not have DonHang
  PAYMENT: ['tenKhachHang', 'sdt'], // Cho phép thanh toán từ báo giá dịch vụ/vật tư không có hợp đồng
  DELIVERY: ['tenKhachHang', 'sdt', 'soHopDong'],
};

export function preCheckEntitySnapshot(entityType: string, entity: Record<string, unknown>): { ok: boolean; missing: string[] } {
  const resolved = { ...entity };
  if (!resolved.sdt && Array.isArray(resolved.contacts) && resolved.contacts.length > 0 && resolved.contacts[0]?.sdt) {
    resolved.sdt = resolved.contacts[0].sdt;
  }
  const required = ENTITY_REQUIRED_SNAPSHOT[entityType] || [];
  const missing = required.filter((f: string) => {
    const v = resolved[f];
    return v === undefined || v === null || v === '';
  });
  return { ok: missing.length === 0, missing };
}

export function isZnsAlreadySent(entity: Record<string, unknown>): boolean {
  if (!entity) return false;
  const rawStatus = (
    entity.trangThaiGuiTinQuangCao ||
    entity.trangThaiGuiTinBaoGia ||
    entity.trangThaiGuiTinHopDong ||
    entity.trangThaiGuiTinThanhToan ||
    entity.trangThaiGuiTinGiaoHang ||
    entity.trangThaiZns
  ) as string | undefined;

  return normalizeLegacyStatus(rawStatus) === EntityZnsStatus.THANH_CONG;
}

export function checkZnsResendAllowed(
  entity: Record<string, unknown>,
  targetPhone: string,
  userRole?: string
): { allowed: boolean; reason?: string; isAlreadySent?: boolean; canAdminOverride?: boolean } {
  if (!entity || !isZnsAlreadySent(entity)) {
    return { allowed: true };
  }

  const cleanTarget = normalizePhoneVN(targetPhone);
  const cleanOriginal = normalizePhoneVN((entity.znsLastSentPhone || entity.sdt || entity.phone) as string);

  // If phone changed, allow sending to new phone!
  if (cleanTarget && cleanOriginal && cleanTarget !== cleanOriginal) {
    return { allowed: true };
  }

  const isAdmin = userRole === 'Administrator' || userRole === 'Ban Giám Đốc';
  return {
    allowed: false,
    isAlreadySent: true,
    canAdminOverride: isAdmin,
    reason: `Tin nhắn ZNS đã được gửi thành công đến số điện thoại ${targetPhone}. Hệ thống đã chặn gửi trùng để bảo vệ chi phí và tránh làm phiền khách hàng. (Nếu khách hàng đổi số, vui lòng cập nhật SĐT mới trước khi gửi).`
  };
}

const ERROR_MESSAGES: Record<string, string> = {
  MISSING_REQUIRED_FIELDS: 'Thiếu thông tin bắt buộc để gửi ZNS',
  INVALID_PHONE: 'Số điện thoại không đúng định dạng (phải bắt đầu 0 + 9-10 số)',
  QUOTA_EXCEEDED: 'Đã hết quota ZNS — vui lòng nạp thêm trong Cài đặt',
  VENDOR_NOT_CONFIGURED: 'Chưa cấu hình URL Vendor — vào Cài đặt → Vendor & Webhook',
  ZALO_LIMIT: 'Zalo đã vượt hạn mức ngày — vui lòng thử lại ngày mai',
  INTERNAL_ERROR: 'Lỗi hệ thống — xem chi tiết trong ZNS Hub',
  DUPLICATE_SENT: 'Tin ZNS đã được gửi thành công đến số điện thoại này. Hệ thống chặn gửi trùng để bảo vệ chi phí.',
};

const STATUS_MESSAGES: Record<string, string> = {
  SENT_WAITING: 'Đã xếp hàng — đang chờ kết quả từ Zalo',
  SUCCESS: 'Đã gửi thành công',
  FAILED: 'Gửi thất bại — vào ZNS Hub để retry',
  LIMIT_EXCEEDED: 'Vượt hạn mức',
  DLQ: 'Đã chuyển vào hàng đợi lỗi',
};

export async function sendZnsAndToast(args: SendZnsArgs, label?: string) {
  // Pre-check duplicate send if already successful to the same phone
  if (args.payload && !args.forceResend) {
    const duplicateCheck = checkZnsResendAllowed(args.payload, args.phone, args.userRole);
    if (!duplicateCheck.allowed) {
      notify.warning(duplicateCheck.reason || 'Tin ZNS đã gửi thành công đến số điện thoại này.');
      throw new Error(`DUPLICATE_SENT: ${duplicateCheck.reason}`);
    }
  }
  // Pre-check snapshot — block sớm để UX tốt hơn
  if (args.payload) {
    const check = preCheckEntitySnapshot(args.entityType, args.payload);
    if (!check.ok) {
      const tipMap: Record<string, string> = {
        tenKhachHang: 'Tên khách hàng',
        sdt: 'Số điện thoại',
        soPhieuBaoGia: 'Số phiếu báo giá',
        soHopDong: 'Số hợp đồng',
        soDonHang: 'Số đơn hàng',
      };
      const missingLabels = check.missing.map((f: string) => tipMap[f] || f).join(', ');
      notify.error(`Chưa thể gửi ZNS — Thiếu: ${missingLabels}. Cập nhật trong bản ghi rồi gửi lại.`);
      throw new Error(`SNAPSHOT_MISSING:${check.missing.join(',')}`);
    }
  }

  const loadingId = notify.loading(label || 'Đang gửi ZNS…');
  try {
    const res = await sendZnsMessage(args);
    notify.dismiss(loadingId);
    
    const statusMsg = STATUS_MESSAGES[res.status || ''] || `Trạng thái: ${res.status}`;
    notify.info(statusMsg);
    
    // POLL background status update sau 3-10s
    if (res.messageId && (res.status === 'SENT_WAITING' || res.status === 'INIT')) {
      const unsub = znsMessagesRepo.subscribeById(res.messageId, (data) => {
        if (!data) return;
        if (data.status === 'SUCCESS') {
          notify.success('ZNS gửi thành công ✓');
          unsub();
        } else if (data.status === 'FAILED' || data.status === 'LIMIT_EXCEEDED' || data.status === 'DLQ') {
          notify.error(`ZNS thất bại: ${data.errorLog || data.status}`);
          unsub();
        }
      });
      // Timeout 30s — không poll mãi
      setTimeout(() => unsub(), 30000);
    }
    
    return res;
  } catch (err: unknown) {
    notify.dismiss(loadingId);
    const code = (err as Error & { code?: string })?.code || '';
    const friendly = ERROR_MESSAGES[code] || (err instanceof Error ? err.message : String(err));
    notify.error(`Lỗi gửi ZNS: ${friendly}`);
    throw err;
  }
}

/** Trả về attemptBucket tiếp theo dựa trên trạng thái hiện tại */
export function nextAttempt(currentStatus?: string, currentBucket?: number): number {
  // Always return a unique bucket for manual explicit clicks to prevent backend idempotency 
  // from silently swallowing subsequent intended sends.
  return Date.now();
}
