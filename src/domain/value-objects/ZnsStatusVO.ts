import { EntityZnsStatus } from '../enums/zns-status';

export class ZnsStatusVO {
  public static fromString(raw?: string | null): EntityZnsStatus {
    if (!raw) return EntityZnsStatus.CHUA_GUI;
    const lower = raw.toLowerCase().trim();

    // 1. Success variants
    if (
      lower.includes('thành công') ||
      lower.includes('thanh_cong') ||
      lower.includes('thanh cong') ||
      lower === 'success' ||
      lower === 'sent' ||
      lower === 'true' ||
      lower === 'ok'
    ) {
      return EntityZnsStatus.THANH_CONG;
    }

    // 2. Waiting variants
    if (
      lower.includes('chờ') ||
      lower.includes('cho_kq') ||
      lower.includes('da_day_cho_kq') ||
      lower.includes('sent_waiting')
    ) {
      return EntityZnsStatus.DA_DAY_CHO_KQ;
    }

    // 3. Sending variants
    if (
      lower.includes('đang đẩy') ||
      lower.includes('dang_day') ||
      lower.includes('sending')
    ) {
      return EntityZnsStatus.DANG_DAY;
    }

    // 4. Limit exceeded variants
    if (
      lower.includes('vượt hạn mức') ||
      lower.includes('vuot_han_muc') ||
      lower.includes('limit_exceeded') ||
      lower.includes('-1472') ||
      lower.includes('exceeded the limit')
    ) {
      return EntityZnsStatus.VUOT_HAN_MUC;
    }

    // 5. Failed variants
    if (
      lower.includes('thất bại') ||
      lower.includes('that_bai') ||
      lower.includes('failed') ||
      lower.includes('dlq') ||
      lower === 'false' ||
      lower.includes('lỗi') ||
      lower.includes('fail')
    ) {
      return EntityZnsStatus.THAT_BAI;
    }

    // 6. Retry variants
    if (
      lower.includes('lại') ||
      lower.includes('can_gui_lai') ||
      lower.includes('repair') ||
      lower.includes('retry')
    ) {
      return EntityZnsStatus.CAN_GUI_LAI;
    }

    // 7. Not sent variants
    if (
      lower.includes('chưa gửi') ||
      lower.includes('chua_gui') ||
      lower.includes('init') ||
      lower.includes('pending')
    ) {
      return EntityZnsStatus.CHUA_GUI;
    }

    // Fallback if exactly matches any enum value
    if (Object.values(EntityZnsStatus).includes(raw as EntityZnsStatus)) {
      return raw as EntityZnsStatus;
    }

    return EntityZnsStatus.CHUA_GUI;
  }

  public static isSuccess(raw?: string | null): boolean {
    return this.fromString(raw) === EntityZnsStatus.THANH_CONG;
  }
}
