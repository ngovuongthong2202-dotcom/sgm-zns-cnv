import { Quotation } from '@/src/domain/schema/quotation.schema';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { logger } from '@/src/shared/lib/logger';

/**
 * Builds a Map of customer ID to province (Tỉnh/Thành) using L1 Entity pool + loaded customers.
 */
export function extractCustomerTinhThanhMap(allCustomers: any[] = []): Map<string, string> {
  const m = new Map<string, string>();
  
  // 1. Load from L1 Normalized Entity Pool
  try {
    const poolCustomers = entityCachePool.getAll('customers');
    if (Array.isArray(poolCustomers)) {
      poolCustomers.forEach(c => {
        if (c && c.id && c.tinhThanh) m.set(c.id, c.tinhThanh);
      });
    }
  } catch (e) {
    logger.debug('Failed to load customers from cache pool in extractCustomerTinhThanhMap', e);
  }

  // 2. Load from passed array if available
  if (Array.isArray(allCustomers)) {
    allCustomers.forEach(c => {
      if (c && c.id && c.tinhThanh) m.set(c.id, c.tinhThanh);
    });
  }

  return m;
}

/**
 * Extracts a unique list of provinces based on current quotations and customer province map.
 */
export function extractTinhThanhList(quotations: Quotation[], customerProvinceMap: Map<string, string>): string[] {
  const s = new Set<string>();
  if (!quotations || !Array.isArray(quotations)) return [];
  quotations.forEach(q => {
    const prov = (q as any).tinhThanh || customerProvinceMap.get(q.customerId || '') || entityCachePool.get('customers', q.customerId || '')?.tinhThanh || '';
    if (prov && prov !== 'Chưa cập nhật') s.add(prov);
  });
  return Array.from(s);
}

/**
 * Enhances a list of quotations by attaching the province field from the customer map or L1 cache.
 */
export function enhanceQuotationsWithProvince(quotations: Quotation[], customerProvinceMap: Map<string, string>): (Quotation & { tinhThanh: string })[] {
  if (!quotations || !Array.isArray(quotations)) return [];
  return quotations.map(q => {
    const prov = (q as any).tinhThanh || customerProvinceMap.get(q.customerId || '') || entityCachePool.get('customers', q.customerId || '')?.tinhThanh || 'Chưa cập nhật';
    return {
      ...q,
      tinhThanh: prov
    };
  });
}
