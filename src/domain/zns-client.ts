import { sendZnsMessage } from './zns';
import { notify } from '@/src/shared/utils/notify';
import { auditLogsRepo, znsMessagesRepo } from '@/src/data/repositories/system.repo';
import { normalizeLegacyStatus, EntityZnsStatus } from './enums/zns-status';

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
  DELIVERY: ['tenKhachHang', 'sdt'], // Cho phép giao hàng từ báo giá dịch vụ/vật tư không có hợp đồng (fallback số hợp đồng)
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

/**
 * Kiểm tra trạng thái có phải là thành công hay không (hỗ trợ mọi biến thể có dấu, không dấu, uppercase, v.v.)
 */
export function isZnsSuccessStatus(status?: string | null): boolean {
  if (!status) return false;
  const normalized = normalizeLegacyStatus(status);
  if (normalized === EntityZnsStatus.THANH_CONG) return true;
  const s = String(status).toLowerCase().trim();
  return (
    s === 'success' ||
    s === 'sent' ||
    s === 'ok' ||
    s === 'true' ||
    s.includes('thành công') ||
    s.includes('thanh_cong') ||
    s.includes('thanh cong') ||
    s.includes('đã gửi') ||
    s.includes('da_gui')
  );
}

export interface RecipientZnsCheckParams {
  entity: Record<string, any>;
  entityType: 'CUSTOMER' | 'QUOTATION' | 'CONTRACT' | 'PAYMENT' | 'DELIVERY';
  contact?: Record<string, any>;
  phone?: string;
  znsMessages?: Array<Record<string, any>>;
}

/**
 * Universal 5-Tier Scoped ZNS Resolution Engine (v50):
 * 1. Entity Scoped History (`contactsZnsHistory` cho Customer, `thongTinGuiZnsBaoGia` cho Quotation)
 * 2. Scoped Realtime Messages (`znsMessages` lọc chính xác theo `entityType`, `entityId`, hoặc mã chứng từ)
 * 3. Contact Object Level (`contact.trangThaiZns`, `contact.ngayGuiZns`)
 * 4. Entity Level Status Flags (`trangThaiGuiTinQuangCao`, `trangThaiGuiTinBaoGia`, `trangThaiGuiTinHopDong`...)
 * 5. Transitive Lineage & Merged History (`mergedCustomerCodes`)
 */
export function isRecipientZnsAlreadySent({
  entity,
  entityType,
  contact,
  phone,
  znsMessages = []
}: RecipientZnsCheckParams): boolean {
  if (!entity) return false;

  const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

  // 1. Phân nhánh QUOTATION: Kiểm tra chính xác theo chứng từ Báo giá
  if (entityType === 'QUOTATION') {
    // 1a. Cờ trạng thái trực tiếp trên Báo giá
    if (isZnsSuccessStatus(entity.trangThaiGuiTinBaoGia)) return true;
    if (isZnsSuccessStatus(entity.trangThaiZns) && (entity.sentAt || entity.thongTinGuiZnsBaoGia)) return true;
    if (entity.sentAt && isZnsSuccessStatus(entity.trangThaiGuiTinBaoGia)) return true;
    if (entity.thongTinGuiZnsBaoGia && typeof entity.thongTinGuiZnsBaoGia === 'object') {
      if (isZnsSuccessStatus((entity.thongTinGuiZnsBaoGia as any).status)) return true;
    }

    // 1b. Tra cứu trong collection znsMessages BẮT BUỘC PHẢI KHỚP ID HOẶC MÃ BÁO GIÁ
    if (Array.isArray(znsMessages) && znsMessages.length > 0) {
      const qId = entity.id;
      const qCode = entity.soPhieuBaoGia;
      const hasQuotationSuccess = znsMessages.some(m => {
        if (!m) return false;
        if (cleanPhone) {
          const mPhone = (m.phone || m.sdt || '').replace(/\D/g, '');
          if (mPhone !== cleanPhone) return false;
        }
        const matchesType = m.entityType === 'QUOTATION' || m.messageType === 'BAOGIA';
        const matchesEntityId = qId && (m.entityId === qId || m.data?.entityId === qId || m.data?.id === qId);
        const matchesCode = qCode && (m.data?.soPhieuBaoGia === qCode || m.soPhieuBaoGia === qCode);
        return matchesType && (matchesEntityId || matchesCode) && isZnsSuccessStatus(m.status);
      });
      if (hasQuotationSuccess) return true;
    }
    return false;
  }

  // 2. Phân nhánh CUSTOMER: Kiểm tra contactsZnsHistory và tin nhắn tiếp thị khách hàng
  if (entityType === 'CUSTOMER') {
    // 2a. Tra cứu theo số điện thoại trong contactsZnsHistory của khách hàng
    if (cleanPhone && entity.contactsZnsHistory && typeof entity.contactsZnsHistory === 'object') {
      const historyEntry = entity.contactsZnsHistory[cleanPhone] || entity.contactsZnsHistory[phone || ''];
      if (historyEntry) {
        if (typeof historyEntry === 'string' && isZnsSuccessStatus(historyEntry)) return true;
        if (typeof historyEntry === 'object' && isZnsSuccessStatus((historyEntry as any).status || (historyEntry as any).trangThai)) {
          return true;
        }
      }
    }

    // 2b. Tra cứu trong collection znsMessages (chỉ khớp tin tiếp thị / khách hàng này)
    if (cleanPhone && Array.isArray(znsMessages) && znsMessages.length > 0) {
      const custId = entity.id || entity.maKh;
      const custCode = entity.maKh;
      const mergedCodes = Array.isArray(entity.mergedCustomerCodes) ? entity.mergedCustomerCodes : [];

      const hasCustomerSuccess = znsMessages.some(m => {
        if (!m) return false;
        const mPhone = (m.phone || m.sdt || '').replace(/\D/g, '');
        if (mPhone !== cleanPhone) return false;

        const isCustomerScope = m.entityType === 'CUSTOMER' || m.messageType === 'CUSTOMER_PRE_QUOTE';
        const matchesCustId = custId && (m.entityId === custId || m.data?.entityId === custId);
        const matchesCustCode = custCode && (m.data?.maKh === custCode || m.maKh === custCode);
        const matchesMerged = mergedCodes.some((code: string) => m.data?.maKh === code || m.maKh === code);

        return (isCustomerScope || matchesCustId || matchesCustCode || matchesMerged) && isZnsSuccessStatus(m.status);
      });
      if (hasCustomerSuccess) return true;
    }

    // 2c. Tra cứu trên Contact Object (đầu mối cụ thể)
    if (contact) {
      if (isZnsSuccessStatus(contact.trangThaiZns)) return true;
      if (contact.ngayGuiZns && !String(contact.trangThaiZns || '').toUpperCase().includes('FAIL')) {
        return true;
      }
    }

    // 2d. Tra cứu trên Entity Level
    if (isZnsSuccessStatus(entity.trangThaiGuiTinQuangCao)) return true;
    if (isZnsSuccessStatus(entity.trangThaiZns)) return true;
    if (entity.thongTinGuiZnsTruocBaoGia && typeof entity.thongTinGuiZnsTruocBaoGia === 'object') {
      if (isZnsSuccessStatus((entity.thongTinGuiZnsTruocBaoGia as any).status)) return true;
    }
    return false;
  }

  // 3. Phân nhánh CONTRACT: Kiểm tra chứng từ Hợp đồng
  if (entityType === 'CONTRACT') {
    if (isZnsSuccessStatus(entity.trangThaiGuiTinHopDong)) return true;
    if (isZnsSuccessStatus(entity.trangThaiZns) && entity.sentAt) return true;
    if (cleanPhone && Array.isArray(znsMessages) && znsMessages.length > 0) {
      const cId = entity.id;
      const cCode = entity.soHopDong;
      return znsMessages.some(m => {
        if (!m) return false;
        const mPhone = (m.phone || m.sdt || '').replace(/\D/g, '');
        if (mPhone !== cleanPhone) return false;
        const matchesType = m.entityType === 'CONTRACT' || m.messageType === 'HOPDONG';
        const matchesId = cId && (m.entityId === cId || m.data?.entityId === cId);
        const matchesCode = cCode && (m.data?.soHopDong === cCode || m.soHopDong === cCode);
        return matchesType && (matchesId || matchesCode) && isZnsSuccessStatus(m.status);
      });
    }
    return false;
  }

  // 4. Phân nhánh PAYMENT: Kiểm tra chứng từ Thanh toán
  if (entityType === 'PAYMENT') {
    if (isZnsSuccessStatus(entity.trangThaiGuiTinThanhToan)) return true;
    if (isZnsSuccessStatus(entity.trangThaiZns) && entity.sentAt) return true;
    if (cleanPhone && Array.isArray(znsMessages) && znsMessages.length > 0) {
      const pId = entity.id;
      const pCode = entity.soPhieuThu;
      return znsMessages.some(m => {
        if (!m) return false;
        const mPhone = (m.phone || m.sdt || '').replace(/\D/g, '');
        if (mPhone !== cleanPhone) return false;
        const matchesType = m.entityType === 'PAYMENT' || m.messageType === 'THANHTOAN';
        const matchesId = pId && (m.entityId === pId || m.data?.entityId === pId);
        const matchesCode = pCode && (m.data?.soPhieuThu === pCode || m.soPhieuThu === pCode);
        return matchesType && (matchesId || matchesCode) && isZnsSuccessStatus(m.status);
      });
    }
    return false;
  }

  // 5. Phân nhánh DELIVERY: Kiểm tra chứng từ Giao hàng
  if (entityType === 'DELIVERY') {
    if (isZnsSuccessStatus(entity.trangThaiGuiTinGiaoHang)) return true;
    if (isZnsSuccessStatus(entity.trangThaiZns) && entity.sentAt) return true;
    if (cleanPhone && Array.isArray(znsMessages) && znsMessages.length > 0) {
      const dId = entity.id || entity.deliveryId;
      const dCode = entity.soPhieuXuat || entity.deliveryId;
      return znsMessages.some(m => {
        if (!m) return false;
        const mPhone = (m.phone || m.sdt || '').replace(/\D/g, '');
        if (mPhone !== cleanPhone) return false;
        const matchesType = m.entityType === 'DELIVERY' || m.messageType === 'GIAOHANG';
        const matchesId = dId && (m.entityId === dId || m.data?.entityId === dId);
        const matchesCode = dCode && (m.data?.soPhieuXuat === dCode || m.soPhieuXuat === dCode);
        return matchesType && (matchesId || matchesCode) && isZnsSuccessStatus(m.status);
      });
    }
    return false;
  }

  return isZnsAlreadySent(entity);
}

export function isZnsAlreadySent(entity: Record<string, unknown>, entityType?: string): boolean {
  if (!entity) return false;
  if (entityType === 'QUOTATION') {
    return isZnsSuccessStatus(entity.trangThaiGuiTinBaoGia as string) || (isZnsSuccessStatus(entity.trangThaiZns as string) && Boolean(entity.sentAt));
  }
  if (entityType === 'CUSTOMER') {
    return isZnsSuccessStatus(entity.trangThaiGuiTinQuangCao as string);
  }
  if (entityType === 'CONTRACT') {
    return isZnsSuccessStatus(entity.trangThaiGuiTinHopDong as string);
  }
  if (entityType === 'PAYMENT') {
    return isZnsSuccessStatus(entity.trangThaiGuiTinThanhToan as string);
  }
  if (entityType === 'DELIVERY') {
    return isZnsSuccessStatus(entity.trangThaiGuiTinGiaoHang as string);
  }

  const rawStatus = (
    entity.trangThaiGuiTinQuangCao ||
    entity.trangThaiGuiTinBaoGia ||
    entity.trangThaiGuiTinHopDong ||
    entity.trangThaiGuiTinThanhToan ||
    entity.trangThaiGuiTinGiaoHang ||
    entity.trangThaiZns
  ) as string | undefined;

  return isZnsSuccessStatus(rawStatus);
}

export function checkZnsResendAllowed(
  entity: Record<string, unknown>,
  targetPhone: string,
  userRole?: string
): { allowed: boolean; reason?: string; isAlreadySent?: boolean; canAdminOverride?: boolean } {
  const isSent = Boolean(entity && isZnsAlreadySent(entity));
  return {
    allowed: true,
    isAlreadySent: isSent,
    canAdminOverride: true,
    reason: isSent ? `Tin nhắn ZNS đã được gửi trước đó đến số ${targetPhone}.` : undefined
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
