import { Customer } from '@/src/domain/schema/customer.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

export const customerAggregates = {
  totalCustomers: (customers: Customer[]) => customers.length,
  totalRegions: (customers: Customer[]) => {
    const regions = new Set(customers.map(c => c.tinhThanh).filter(Boolean));
    return regions.size;
  },
  totalZnsSent: (customers: Customer[]) => {
    return customers.filter(c => normalizeLegacyStatus(c.trangThaiGuiTinQuangCao) === EntityZnsStatus.THANH_CONG).length;
  }
};
