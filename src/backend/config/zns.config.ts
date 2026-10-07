import dotenv from 'dotenv';
dotenv.config();

export const znsConfig = {
  webhooks: {
    CUSTOMER_PRE_QUOTE: process.env.ZNS_WEBHOOK_CUSTOMER || process.env.CNV_WEBHOOK_CUSTOMER_PRE_QUOTE || 'https://hub.cnvcdp.com/webhook/e2c1c68e-8075-424b-9bf0-c9061c51ce18-7409-678568754e04-a6dee0cb4',
    BAOGIA: process.env.ZNS_WEBHOOK_BAOGIA || process.env.CNV_WEBHOOK_BAOGIA || 'https://hub.cnvcdp.com/webhook/5bf3fd76-9e8f-4008-b825-c4639fd43116-73ff-88325a7b35ed-e30f03fad',
    HOPDONG_SIGN_ZNS: process.env.ZNS_WEBHOOK_HOPDONG || process.env.CNV_WEBHOOK_HOPDONG || 'https://hub.cnvcdp.com/webhook/70742289-f67f-4892-a3b9-b4eb28167d35-7bb9-b0be94c9a782-218e51587',
    THANH_TOAN_TAT_TOAN: process.env.ZNS_WEBHOOK_THANHTOAN || process.env.CNV_WEBHOOK_THANH_TOAN || 'https://hub.cnvcdp.com/webhook/d7e6345c-d732-4104-92d8-0e1930a12b6f-7cb1-6118d544b450-fc775af3d',
    THANH_TOAN_CONG_NO: process.env.ZNS_WEBHOOK_THANHTOAN || process.env.CNV_WEBHOOK_THANH_TOAN || 'https://hub.cnvcdp.com/webhook/d7e6345c-d732-4104-92d8-0e1930a12b6f-7cb1-6118d544b450-fc775af3d',
    THANH_TOAN_CONG_NO_DEN_HAN: process.env.ZNS_WEBHOOK_THANHTOAN_DENHAN || 'https://hub.cnvcdp.com/webhook/d7e6345c-d732-4104-92d8-0e1930a12b6f-7cb1-6118d544b450-fc775af3d',
    THANH_TOAN_XAC_NHAN: process.env.ZNS_WEBHOOK_THANHTOAN || process.env.CNV_WEBHOOK_THANH_TOAN || 'https://hub.cnvcdp.com/webhook/d7e6345c-d732-4104-92d8-0e1930a12b6f-7cb1-6118d544b450-fc775af3d',
    GIAOHANG_ZNS: process.env.ZNS_WEBHOOK_GIAOHANG || process.env.CNV_WEBHOOK_GIAOHANG || 'https://hub.cnvcdp.com/webhook/f795ffef-5d21-425d-8af9-b2361116961f-7362-d99b4e61a2a4-c5074e61b',
    GIAOHANG_HOANTAT: process.env.ZNS_WEBHOOK_GIAOHANG_HT || process.env.CNV_WEBHOOK_GIAOHANG_HT || 'https://hub.cnvcdp.com/webhook/f795ffef-5d21-425d-8af9-b2361116961f-7362-d99b4e61a2a4-c5074e61b',
    DEFAULT: process.env.CNV_DEFAULT_WEBHOOK_URL || 'https://hub.cnvcdp.com/webhook/5bf3fd76-9e8f-4008-b825-c4639fd43116-73ff-88325a7b35ed-e30f03fad',
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
