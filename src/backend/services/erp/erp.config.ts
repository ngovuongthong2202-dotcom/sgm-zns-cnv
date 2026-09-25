import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';

export interface ErpConfig {
  baseUrl: string;
  itemsUrl: string;
  exportSaleUrl: string;
  quotationUrl: string;
  timeoutSeconds?: number;
  apiKey?: string;
  updatedAt?: string;
}

export const DEFAULT_ERP_CONFIG: ErpConfig = {
  baseUrl: 'https://sgm.vnaisoft.com',
  itemsUrl: 'https://sgm.vnaisoft.com/api/public/items',
  exportSaleUrl: 'https://sgm.vnaisoft.com/api/public/export-sale',
  quotationUrl: 'https://sgm.vnaisoft.com/api/public/bao-gia',
  timeoutSeconds: 20,
};

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
        baseUrl: data.baseUrl?.trim() || DEFAULT_ERP_CONFIG.baseUrl,
        itemsUrl: data.itemsUrl?.trim() || DEFAULT_ERP_CONFIG.itemsUrl,
        exportSaleUrl: data.exportSaleUrl?.trim() || DEFAULT_ERP_CONFIG.exportSaleUrl,
        quotationUrl: data.quotationUrl?.trim() || DEFAULT_ERP_CONFIG.quotationUrl,
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
