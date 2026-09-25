import { Contract } from '@/src/domain/schema/contract.schema';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { logger } from '@/src/shared/lib/logger';

/**
 * Builds a Map of customer ID to province (Tỉnh/Thành) using L1 pool + loaded data.
 */
export function extractContractCustomerTinhThanhMap(allCustomers: any[] = []): Map<string, string> {
  const m = new Map<string, string>();
  try {
    const poolCustomers = entityCachePool.getAll('customers');
    if (Array.isArray(poolCustomers)) {
      poolCustomers.forEach(c => {
        if (c && c.id && c.tinhThanh) m.set(c.id, c.tinhThanh);
      });
    }
  } catch (e) {
    logger.debug('Failed to load customers from cache pool in extractContractCustomerTinhThanhMap', e);
  }

  if (Array.isArray(allCustomers)) {
    allCustomers.forEach(c => {
      if (c && c.id && c.tinhThanh) m.set(c.id, c.tinhThanh);
    });
  }
  return m;
}

/**
 * Extracts a unique list of provinces based on current contracts and customer province map.
 */
export function extractContractTinhThanhList(contracts: Contract[], customerProvinceMap: Map<string, string>): string[] {
  const s = new Set<string>();
  if (!contracts || !Array.isArray(contracts)) return [];
  contracts.forEach(c => {
    const prov = (c as any).tinhThanh || customerProvinceMap.get(c.customerId || '') || entityCachePool.get('customers', c.customerId || '')?.tinhThanh || '';
    if (prov && prov !== 'Chưa cập nhật') s.add(prov);
  });
  return Array.from(s);
}
