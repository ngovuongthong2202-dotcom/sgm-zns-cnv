import { Delivery } from '@/src/domain/schema/delivery.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

export const deliveryAggregates = {
  totalCustomers: (deliveries: Delivery[]) => {
    const customers = new Set(deliveries.map(d => d.customerId).filter(Boolean));
    return customers.size;
  },
  totalDeliveries: (deliveries: Delivery[]) => deliveries.length,
  inTransitDeliveries: (deliveries: Delivery[]) => deliveries.filter(d => {
    if (d.ngayGiaoThucTe) return false;
    if (!d.ngayGiaoMay) return true;
    const estimated = new Date(d.ngayGiaoMay).getTime();
    const now = new Date().getTime();
    return estimated <= now;
  }).length,
  completedDeliveries: (deliveries: Delivery[]) => deliveries.filter(d => !!d.ngayGiaoThucTe).length,
  znsCompleted: (deliveries: Delivery[]) => deliveries.filter(d => normalizeLegacyStatus(d.trangThaiGuiTinGiaoHang) === EntityZnsStatus.THANH_CONG).length,
};
