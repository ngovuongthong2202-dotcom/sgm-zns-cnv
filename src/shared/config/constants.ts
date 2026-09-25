export const DATABASE_COLLECTIONS = {
  CUSTOMERS: 'customers',
  QUOTATIONS: 'quotations',
  CONTRACTS: 'contracts',
  PAYMENTS: 'payments',
  DELIVERIES: 'deliveries',
  PRESENCE: 'presence',
  AUDIT_LOGS: 'auditLogs',
  CLIENT_ERRORS: 'clientErrors',
  SETTINGS: 'settings',
  ZNS_TEMPLATES: 'znsTemplates',
  NOTIFICATIONS: 'notifications',
} as const;

export type DatabaseCollection = typeof DATABASE_COLLECTIONS[keyof typeof DATABASE_COLLECTIONS];

/** @deprecated Use DATABASE_COLLECTIONS instead */
export const FIRESTORE_COLLECTIONS = DATABASE_COLLECTIONS;
/** @deprecated Use DatabaseCollection instead */
export type FirestoreCollection = DatabaseCollection;

export const ZNS_TEMPLATE_CODES = {
  CUSTOMER_PRE_QUOTE: 'CUSTOMER_PRE_QUOTE',
  BAOGIA: 'BAOGIA',
  HOPDONG_SIGN_ZNS: 'HOPDONG_SIGN_ZNS',
  THANH_TOAN_TAT_TOAN: 'THANH_TOAN_TAT_TOAN',
  THANH_TOAN_CONG_NO: 'THANH_TOAN_CONG_NO',
  THANH_TOAN_CONG_NO_DEN_HAN: 'THANH_TOAN_CONG_NO_DEN_HAN',
  GIAOHANG_ZNS: 'GIAOHANG_ZNS',
  GIAOHANG_HOANTAT: 'GIAOHANG_HOANTAT',
} as const;

export type ZnsTemplateCode = typeof ZNS_TEMPLATE_CODES[keyof typeof ZNS_TEMPLATE_CODES];
