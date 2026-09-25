export enum CanonicalDeliveryStatus {
  CHUA_GIAO = 'CHUA_GIAO',
  DANG_GIAO = 'DANG_GIAO',
  HOAN_TAT = 'HOAN_TAT',
  DA_HUY = 'DA_HUY'
}

export class DeliveryStatusVO {
  public static fromString(raw?: string | null): CanonicalDeliveryStatus {
    if (!raw) return CanonicalDeliveryStatus.CHUA_GIAO;
    const lower = raw.toLowerCase().trim();
    const normalized = lower
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '_');

    // 1. Completed
    if (
      normalized.includes('hoan_tat') ||
      normalized.includes('da_giao') ||
      normalized === 'completed' ||
      normalized === 'delivered' ||
      normalized === 'done' ||
      lower.includes('hoàn tất') ||
      lower.includes('đã giao')
    ) {
      return CanonicalDeliveryStatus.HOAN_TAT;
    }

    // 2. In progress
    if (
      normalized.includes('dang_giao') ||
      normalized === 'shipping' ||
      normalized === 'in_transit' ||
      lower.includes('đang giao')
    ) {
      return CanonicalDeliveryStatus.DANG_GIAO;
    }

    // 3. Cancelled
    if (
      normalized.includes('da_huy') ||
      normalized.includes('huy') ||
      normalized === 'cancelled' ||
      normalized === 'canceled' ||
      lower.includes('đã hủy') ||
      lower.includes('hủy')
    ) {
      return CanonicalDeliveryStatus.DA_HUY;
    }

    return CanonicalDeliveryStatus.CHUA_GIAO;
  }

  /**
   * Một phiếu giao được coi là hoàn tất nếu:
   * - Có ngày giao thực tế (ngayGiaoThucTe)
   * - Hoặc trạng thái giao hàng là HOÀN TẤT / ĐÃ GIAO (bất kể định dạng viết)
   */
  public static isCompleted(raw?: string | null, ngayGiaoThucTe?: string | null): boolean {
    if (typeof ngayGiaoThucTe === 'string' && ngayGiaoThucTe.trim().length > 0) {
      return true;
    }
    return this.fromString(raw) === CanonicalDeliveryStatus.HOAN_TAT;
  }
}
