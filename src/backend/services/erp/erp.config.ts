import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';

export interface ErpConfig {
  baseUrl: string;
  itemsUrl: string;
  exportSaleUrl: string;
  quotationUrl: string;
  salesOrdersUrl: string;
  timeoutSeconds?: number;
  apiKey?: string;
  updatedAt?: string;
}

export const DEFAULT_ERP_CONFIG: ErpConfig = {
  baseUrl: 'https://sgm.vnaisoft.com',
  itemsUrl: 'https://sgm.vnaisoft.com/api/public/items',
  exportSaleUrl: 'https://sgm.vnaisoft.com/api/public/export-sale',
  quotationUrl: 'https://sgm.vnaisoft.com/api/public/bao-gia',
  salesOrdersUrl: 'https://sgm.vnaisoft.com/api/public/sales-orders',
  timeoutSeconds: 20,
};

export function sanitizeErpUrl(url: string | undefined, defaultUrl: string): string {
  if (!url || typeof url !== 'string' || !url.trim()) return defaultUrl;
  let cleaned = url.trim();
  // Self-heal typos in domain (sgn -> sgm) and path (itens -> items)
  cleaned = cleaned.replace(/sgn\.vnaisoft\.com/gi, 'sgm.vnaisoft.com');
  cleaned = cleaned.replace(/\/itens(\/|$|\?)/gi, '/items$1');
  return cleaned;
}

let cachedConfig: { config: ErpConfig; expireAt: number } | null = null;

export async function getErpConfig(): Promise<ErpConfig> {
  const now = Date.now();
  if (cachedConfig && cachedConfig.expireAt > now) {
    return cachedConfig.config;
  }

  try {
    const doc = await adminDb.collection('settings').doc('erp_config').get();
    if (doc.exists && doc.data()) {
      const data = doc.data() as Partial<ErpConfig>;
      const config: ErpConfig = {
        baseUrl: sanitizeErpUrl(data.baseUrl, DEFAULT_ERP_CONFIG.baseUrl),
        itemsUrl: sanitizeErpUrl(data.itemsUrl, DEFAULT_ERP_CONFIG.itemsUrl),
        exportSaleUrl: sanitizeErpUrl(data.exportSaleUrl, DEFAULT_ERP_CONFIG.exportSaleUrl),
        quotationUrl: sanitizeErpUrl(data.quotationUrl, DEFAULT_ERP_CONFIG.quotationUrl),
        salesOrdersUrl: sanitizeErpUrl(data.salesOrdersUrl, DEFAULT_ERP_CONFIG.salesOrdersUrl),
        timeoutSeconds: Number(data.timeoutSeconds) || DEFAULT_ERP_CONFIG.timeoutSeconds,
        apiKey: data.apiKey?.trim() || '',
        updatedAt: data.updatedAt,
      };
      cachedConfig = { config, expireAt: now + 30000 }; // 30s cache
      return config;
    }
  } catch (err) {
    logger.warn({ err }, 'Failed to read erp_config from settings');
  }

  return DEFAULT_ERP_CONFIG;
}

export function invalidateErpConfigCache(): void {
  cachedConfig = null;
}
