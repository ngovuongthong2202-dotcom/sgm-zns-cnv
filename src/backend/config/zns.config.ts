import dotenv from 'dotenv';
dotenv.config();

export const znsConfig = {
  webhooks: {
    CUSTOMER_PRE_QUOTE: process.env.ZNS_WEBHOOK_CUSTOMER || process.env.CNV_WEBHOOK_CUSTOMER_PRE_QUOTE || '',
    BAOGIA: process.env.ZNS_WEBHOOK_BAOGIA || process.env.CNV_WEBHOOK_BAOGIA || '',
    HOPDONG_SIGN_ZNS: process.env.ZNS_WEBHOOK_HOPDONG || process.env.CNV_WEBHOOK_HOPDONG || '',
    THANH_TOAN_TAT_TOAN: process.env.ZNS_WEBHOOK_THANHTOAN || process.env.CNV_WEBHOOK_THANH_TOAN || '',
    THANH_TOAN_CONG_NO: process.env.ZNS_WEBHOOK_THANHTOAN || process.env.CNV_WEBHOOK_THANH_TOAN || '',
    THANH_TOAN_CONG_NO_DEN_HAN: process.env.ZNS_WEBHOOK_THANHTOAN_DENHAN || '',
    GIAOHANG_ZNS: process.env.ZNS_WEBHOOK_GIAOHANG || process.env.CNV_WEBHOOK_GIAOHANG || '',
    GIAOHANG_HOANTAT: process.env.ZNS_WEBHOOK_GIAOHANG_HT || process.env.CNV_WEBHOOK_GIAOHANG_HT || '',
    DEFAULT: process.env.CNV_DEFAULT_WEBHOOK_URL || '',
  },
  callback: {
    secret: process.env.ZNS_CALLBACK_SECRET || 'default_secret',
    requireSecret: process.env.ZNS_CALLBACK_REQUIRE_SECRET === 'true',
    authSoftMode: process.env.ZNS_CALLBACK_AUTH_SOFT_MODE === 'true',
    dedupWindowMinutes: parseInt(process.env.ZNS_CALLBACK_DEDUP_WINDOW_MINUTES || '60', 10),
  },
  outbound: {
    maxAttempts: parseInt(process.env.ZNS_OUTBOUND_RETRY_MAX_ATTEMPTS || '3', 10),
    backoffMs: parseInt(process.env.ZNS_OUTBOUND_RETRY_BACKOFF_MS || '5000', 10),
    backoffCapMs: parseInt(process.env.ZNS_OUTBOUND_RETRY_BACKOFF_CAP_MS || '60000', 10),
  },
  dlq: {
    maxItems: parseInt(process.env.ZNS_DLQ_MAX_ITEMS || '1000', 10),
  }
};
