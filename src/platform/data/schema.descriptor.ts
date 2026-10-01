/**
 * ASUCM 3.0: Holistic Multi-Entity Mesh & Schema Descriptor
 * Centralized Single Source of Truth for Database Table Descriptors,
 * Physical Financial Projections, and Self-Healing Foreign Key Resolvers.
 */

export interface TableDescriptor {
  hasDataJsonb: boolean;
  hasUpdatedAt: boolean;
  hasDeletedBy: boolean;
  hasDeletedAt: boolean;
  physicalColumns: Set<string>;
  fieldMappings?: Record<string, string>; // camelCase/alias -> snake_case physical column
}

export const COLLECTION_TABLE_MAP: Record<string, string> = {
  // Plural collections
  customers: 'customers',
  quotations: 'quotations',
  contracts: 'contracts',
  payments: 'payments',
  deliveries: 'deliveries',
  // Singular aliases
  customer: 'customers',
  quotation: 'quotations',
  contract: 'contracts',
  payment: 'payments',
  delivery: 'deliveries',
  user: 'users',
  notification: 'notifications',
  draft: 'drafts',
  // System collections
  users: 'users',
  userAccounts: 'users',
  user_accounts: 'users',
  settings: 'settings',
  systemSettings: 'settings',
  userNotifications: 'notifications',
  znsMessages: 'zns_messages',
  zns_messages: 'zns_messages',
  znsTemplates: 'zns_templates',
  zns_templates: 'zns_templates',
  znsCallbacks: 'zns_callbacks',
  zns_callbacks: 'zns_callbacks',
  znsDeadLetters: 'zns_dead_letters',
  zns_dead_letters: 'zns_dead_letters',
  workflowEvents: 'workflow_events',
  workflow_events: 'workflow_events',
  auditLogs: 'audit_logs',
  audit_logs: 'audit_logs',
  notifications: 'notifications',
  drafts: 'drafts',
  presence: 'presence',
  telegramSentLog: 'telegram_sent_log',
  telegram_sent_log: 'telegram_sent_log',
  znsUnmappedResults: 'zns_callbacks',
  znsWebhookDebug: 'zns_callbacks',
  systemLocks: 'system_locks',
  system_locks: 'system_locks',
  jobHeartbeats: 'job_heartbeats',
  job_heartbeats: 'job_heartbeats',
  counters: 'counters',
  idempotencyKeys: 'idempotency_keys',
  idempotency_keys: 'idempotency_keys',
  metrics: 'metrics_rollup',
  metricsRollup: 'metrics_rollup',
  metrics_rollup: 'metrics_rollup',
  crossEntitySyncJobs: 'cross_entity_sync_jobs',
  cross_entity_sync_jobs: 'cross_entity_sync_jobs'
};

export function toTableName(collectionName: string): string {
  return COLLECTION_TABLE_MAP[collectionName] || collectionName.toLowerCase();
}

export const TABLE_DESCRIPTORS: Record<string, TableDescriptor> = {
  customers: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: true,
    hasDeletedAt: true,
    physicalColumns: new Set([
      'id', 'ma_kh', 'ten_khach_hang', 'sdt', 'tinh_thanh', 'nguoi_phu_trach', 
      'loai_kh', 'is_archived', 'total_debt', 'ltv', 'deleted_at', 'deleted_by', 
      'created_at', 'updated_at', 'data'
    ]),
    fieldMappings: {
      maKh: 'ma_kh',
      maKH: 'ma_kh',
      tenKhachHang: 'ten_khach_hang',
      sdt: 'sdt',
      tinhThanh: 'tinh_thanh',
      nguoiPhuTrach: 'nguoi_phu_trach',
      loaiKh: 'loai_kh',
      isArchived: 'is_archived',
      totalDebt: 'total_debt',
      ltv: 'ltv',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  quotations: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: true,
    hasDeletedAt: true,
    physicalColumns: new Set([
      'id', 'ma_bao_gia', 'customer_id', 'trang_thai', 'tong_tien', 'nguoi_tao', 
      'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'
    ]),
    fieldMappings: {
      soPhieuBaoGia: 'ma_bao_gia',
      maBaoGia: 'ma_bao_gia',
      customerId: 'customer_id',
      trangThai: 'trang_thai',
      status: 'trang_thai',
      tongTien: 'tong_tien',
      totalAmount: 'tong_tien',
      nguoiTao: 'nguoi_tao',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  contracts: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: true,
    hasDeletedAt: true,
    physicalColumns: new Set([
      'id', 'ma_hop_dong', 'quotation_id', 'customer_id', 'trang_thai', 'gia_tri_hop_dong', 
      'ngay_hoan_thanh', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'
    ]),
    fieldMappings: {
      soHopDong: 'ma_hop_dong',
      maHopDong: 'ma_hop_dong',
      quotationId: 'quotation_id',
      customerId: 'customer_id',
      trangThai: 'trang_thai',
      status: 'trang_thai',
      giaTriHopDong: 'gia_tri_hop_dong',
      totalAmount: 'gia_tri_hop_dong',
      ngayHoanThanh: 'ngay_hoan_thanh',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  payments: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: true,
    hasDeletedAt: true,
    physicalColumns: new Set([
      'id', 'ma_thanh_toan', 'contract_id', 'customer_id', 'quotation_id', 'so_tien', 
      'trang_thai', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'
    ]),
    fieldMappings: {
      paymentId: 'ma_thanh_toan',
      maThanhToan: 'ma_thanh_toan',
      contractId: 'contract_id',
      customerId: 'customer_id',
      quotationId: 'quotation_id',
      soTien: 'so_tien',
      amount: 'so_tien',
      totalAmount: 'so_tien',
      trangThai: 'trang_thai',
      tinhTrangThanhToan: 'trang_thai',
      status: 'trang_thai',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  deliveries: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: true,
    hasDeletedAt: true,
    physicalColumns: new Set([
      'id', 'ma_giao_hang', 'contract_id', 'payment_id', 'quotation_id', 'customer_id', 
      'trang_thai', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'
    ]),
    fieldMappings: {
      deliveryId: 'ma_giao_hang',
      maGiaoHang: 'ma_giao_hang',
      contractId: 'contract_id',
      paymentId: 'payment_id',
      quotationId: 'quotation_id',
      customerId: 'customer_id',
      trangThai: 'trang_thai',
      status: 'trang_thai',
      deletedAt: 'deleted_at',
      deletedBy: 'deleted_by',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  users: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'username', 'display_name', 'role', 'department', 'position', 'email', 'created_at', 'updated_at', 'data']),
    fieldMappings: {
      displayName: 'display_name',
      name: 'display_name',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  settings: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'data', 'updated_at'])
  },
  counters: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'current_value', 'updated_at', 'data']),
    fieldMappings: {
      currentValue: 'current_value',
      updatedAt: 'updated_at'
    }
  },
  zns_messages: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'tracking_id', 'entity_type', 'entity_id', 'status', 'phone', 'created_at', 'updated_at', 'data']),
    fieldMappings: {
      trackingId: 'tracking_id',
      entityType: 'entity_type',
      entityId: 'entity_id',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  zns_templates: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'template_id', 'template_name', 'status', 'created_at', 'updated_at', 'data']),
    fieldMappings: {
      templateId: 'template_id',
      templateName: 'template_name',
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    }
  },
  drafts: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'user_id', 'entity_type', 'updated_at', 'data']),
    fieldMappings: {
      userId: 'user_id',
      entityType: 'entity_type',
      updatedAt: 'updated_at'
    }
  },
  presence: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'user_id', 'current_entity_id', 'current_entity_type', 'updated_at', 'data']),
    fieldMappings: {
      userId: 'user_id',
      currentEntityId: 'current_entity_id',
      currentEntityType: 'current_entity_type',
      updatedAt: 'updated_at'
    }
  },
  metrics_rollup: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'period', 'data', 'created_at', 'updated_at'])
  },
  cross_entity_sync_jobs: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'status', 'attempts', 'data', 'created_at', 'updated_at'])
  },
  workflow_events: {
    hasDataJsonb: false,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'entity_type', 'entity_id', 'event_type', 'actor', 'cid', 'payload', 'timestamp']),
    fieldMappings: {
      entityType: 'entity_type',
      entityId: 'entity_id',
      eventType: 'event_type',
      timestamp: 'timestamp'
    }
  },
  zns_callbacks: {
    hasDataJsonb: false,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'processed_at', 'payload']),
    fieldMappings: {
      processedAt: 'processed_at'
    }
  },
  zns_dead_letters: {
    hasDataJsonb: false,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'error_message', 'payload', 'created_at']),
    fieldMappings: {
      errorMessage: 'error_message',
      createdAt: 'created_at',
      timestamp: 'created_at'
    }
  },
  audit_logs: {
    hasDataJsonb: true,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'entity_type', 'entity_id', 'action', 'user_id', 'user_name', 'created_at', 'data']),
    fieldMappings: {
      entityType: 'entity_type',
      entityId: 'entity_id',
      userId: 'user_id',
      userName: 'user_name',
      createdAt: 'created_at',
      timestamp: 'created_at'
    }
  },
  notifications: {
    hasDataJsonb: true,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'user_id', 'title', 'message', 'is_read', 'created_at', 'data']),
    fieldMappings: {
      userId: 'user_id',
      isRead: 'is_read',
      read: 'is_read',
      createdAt: 'created_at'
    }
  },
  telegram_sent_log: {
    hasDataJsonb: true,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'chat_id', 'message_type', 'sent_at', 'status', 'data']),
    fieldMappings: {
      chatId: 'chat_id',
      messageType: 'message_type',
      sentAt: 'sent_at'
    }
  },
  idempotency_keys: {
    hasDataJsonb: true,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'entity_id', 'response', 'created_at', 'data']),
    fieldMappings: {
      entityId: 'entity_id',
      createdAt: 'created_at'
    }
  },
  system_locks: {
    hasDataJsonb: true,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'locked_by', 'locked_at', 'expires_at', 'data']),
    fieldMappings: {
      lockedBy: 'locked_by',
      lockedAt: 'locked_at',
      expiresAt: 'expires_at'
    }
  },
  job_heartbeats: {
    hasDataJsonb: true,
    hasUpdatedAt: false,
    hasDeletedBy: false,
    hasDeletedAt: false,
    physicalColumns: new Set(['id', 'service_name', 'last_heartbeat', 'status', 'data']),
    fieldMappings: {
      serviceName: 'service_name',
      lastHeartbeat: 'last_heartbeat'
    }
  }
};

/**
 * Self-healing foreign key resolver:
 * Ensures foreign key values (e.g. `customerId`, `contractId`) that might be human codes (like `KH0012`)
 * or UUIDs are properly mapped and sanitized.
 */
export function sanitizeForeignKey(val: unknown): string | null {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '' || s === 'undefined' || s === 'null' || s === 'N/A' || s === '---') return null;
  return s;
}
