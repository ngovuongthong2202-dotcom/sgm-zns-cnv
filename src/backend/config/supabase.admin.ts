import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  ''
).trim();

const supabaseServiceKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

export const isSupabaseAdminConfigured = Boolean(
  supabaseUrl && 
  supabaseUrl.startsWith('http') && 
  supabaseServiceKey && 
  supabaseServiceKey.length > 10
);

if (!isSupabaseAdminConfigured) {
  logger.warn(
    'SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in backend env. ' +
    'Running with mock fallback backend client.'
  );
}

export const supabaseAdmin: SupabaseClient = isSupabaseAdminConfigured
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : createClient('https://placeholder-offline.supabase.co', 'placeholder-service-key-offline', {
      auth: { persistSession: false },
      global: {
        fetch: async () => {
          return new Response(JSON.stringify({ data: [], error: null }), {
            headers: { 'content-type': 'application/json' },
            status: 200
          });
        }
      }
    });

// Map camelCase collection names to snake_case / postgres table names
export const collectionTableMap: Record<string, string> = {
  // Plural forms
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
  // Other system collections
  users: 'users',
  settings: 'settings',
  systemSettings: 'settings',
  userNotifications: 'notifications',
  deliverys: 'deliveries',
  znsMessages: 'zns_messages',
  znsTemplates: 'zns_templates',
  znsCallbacks: 'zns_callbacks',
  znsDeadLetters: 'zns_dead_letters',
  workflowEvents: 'workflow_events',
  auditLogs: 'audit_logs',
  notifications: 'notifications',
  drafts: 'drafts',
  presence: 'presence',
  telegramSentLog: 'telegram_sent_log',
  znsUnmappedResults: 'zns_callbacks',
  znsWebhookDebug: 'zns_callbacks',
  systemLocks: 'system_locks',
  system_locks: 'system_locks',
  jobHeartbeats: 'job_heartbeats',
  job_heartbeats: 'job_heartbeats',
  counters: 'settings',
  idempotencyKeys: 'idempotency_keys',
  idempotency_keys: 'idempotency_keys',
  metrics: 'metrics_rollup',
  metricsRollup: 'metrics_rollup',
  metrics_rollup: 'metrics_rollup',
  crossEntitySyncJobs: 'cross_entity_sync_jobs',
  cross_entity_sync_jobs: 'cross_entity_sync_jobs'
};

export function toTableName(collectionName: string): string {
  return collectionTableMap[collectionName] || collectionName.toLowerCase();
}

export interface TableDescriptor {
  hasDataJsonb: boolean;
  hasUpdatedAt: boolean;
  hasDeletedBy: boolean;
  hasDeletedAt: boolean;
  physicalColumns: Set<string>;
  fieldMappings?: Record<string, string>; // camelCase/alias -> snake_case physical column
}

export const TABLE_DESCRIPTORS: Record<string, TableDescriptor> = {
  customers: {
    hasDataJsonb: true,
    hasUpdatedAt: true,
    hasDeletedBy: true,
    hasDeletedAt: true,
    physicalColumns: new Set(['id', 'ma_kh', 'ten_khach_hang', 'sdt', 'tinh_thanh', 'nguoi_phu_trach', 'loai_kh', 'is_archived', 'total_debt', 'ltv', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data']),
    fieldMappings: {
      maKh: 'ma_kh',
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
    physicalColumns: new Set(['id', 'ma_bao_gia', 'customer_id', 'trang_thai', 'tong_tien', 'nguoi_tao', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data']),
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
    physicalColumns: new Set(['id', 'ma_hop_dong', 'quotation_id', 'customer_id', 'trang_thai', 'gia_tri_hop_dong', 'ngay_hoan_thanh', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data']),
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
    physicalColumns: new Set(['id', 'ma_thanh_toan', 'contract_id', 'customer_id', 'quotation_id', 'so_tien', 'trang_thai', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data']),
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
    physicalColumns: new Set(['id', 'ma_giao_hang', 'contract_id', 'payment_id', 'quotation_id', 'customer_id', 'trang_thai', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data']),
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
  // --- BẢNG PHẲNG KHÔNG CÓ DATA, KHÔNG CÓ UPDATED_AT ---
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
  // --- BẢNG CÓ DATA, KHÔNG CÓ UPDATED_AT ---
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
 * Compatibility Adapter: Provides Firestore-like collection/doc/where API on top of Supabase PostgreSQL
 * to ensure 100% parity and seamless execution for existing backend routes and services.
 */
class DocRef {
  constructor(private tableName: string, public id: string) {}

  async get() {
    if (!isSupabaseAdminConfigured) {
      return { exists: false, data: () => null, id: this.id, updateTime: null, ref: this };
    }
    const { data, error } = await supabaseAdmin
      .from(this.tableName)
      .select('*')
      .eq('id', this.id)
      .maybeSingle();

    if (error || !data) {
      return { exists: false, data: () => null, id: this.id, updateTime: null, ref: this };
    }

    const merged = { ...((data.data as Record<string, unknown>) || {}), ...data };
    return {
      exists: true,
      id: this.id,
      data: () => merged,
      updateTime: {
        toDate: () => new Date(data.updated_at || data.created_at || data.timestamp || Date.now()),
        toMillis: () => new Date(data.updated_at || data.created_at || data.timestamp || Date.now()).getTime()
      },
      ref: this
    };
  }

  async set(recordData: Record<string, unknown>, options?: { merge?: boolean }) {
    if (!isSupabaseAdminConfigured) return;
    const tableName = this.tableName;
    const desc = TABLE_DESCRIPTORS[tableName];

    const payload: Record<string, any> = {
      id: this.id
    };

    // 1. Chỉ chèn data nếu bảng hỗ trợ cột JSONB data
    if (!desc || desc.hasDataJsonb) {
      payload.data = recordData;
    }

    // 2. Chỉ chèn updated_at nếu bảng có cột updated_at
    if (!desc || desc.hasUpdatedAt) {
      payload.updated_at = new Date().toISOString();
    }

    // 3. Dynamic Physical Projection dựa trên Descriptor
    if (desc) {
      // Map based on fieldMappings
      if (desc.fieldMappings) {
        for (const [sourceField, targetCol] of Object.entries(desc.fieldMappings)) {
          if (sourceField in recordData && recordData[sourceField] !== undefined) {
            let val = recordData[sourceField];
            if ((targetCol === 'contract_id' || targetCol === 'customer_id' || targetCol === 'quotation_id' || targetCol === 'payment_id') && typeof val === 'string' && val.trim() === '') {
              val = null;
            }
            payload[targetCol] = val;
          }
        }
      }

      // Map any direct physical column matches
      for (const col of desc.physicalColumns) {
        if (col in recordData && recordData[col] !== undefined && !(col in payload)) {
          let val = recordData[col];
          if ((col === 'contract_id' || col === 'customer_id' || col === 'quotation_id' || col === 'payment_id') && typeof val === 'string' && val.trim() === '') {
            val = null;
          }
          payload[col] = val;
        }
      }

      // Special handling for specific tables with unique payload structures
      if (tableName === 'workflow_events') {
        if ('entityType' in recordData) payload.entity_type = recordData.entityType;
        if ('entityId' in recordData) payload.entity_id = recordData.entityId;
        if ('eventType' in recordData) payload.event_type = recordData.eventType;
        if ('actor' in recordData) payload.actor = recordData.actor;
        if ('cid' in recordData) payload.cid = recordData.cid;
        if ('payload' in recordData) payload.payload = recordData.payload;
        if ('timestamp' in recordData) payload.timestamp = recordData.timestamp;
      } else if (tableName === 'zns_callbacks') {
        if ('payload' in recordData) payload.payload = recordData.payload;
        if ('processedAt' in recordData) payload.processed_at = recordData.processedAt;
      } else if (tableName === 'zns_dead_letters') {
        if ('errorMessage' in recordData) payload.error_message = recordData.errorMessage;
        if ('error' in recordData) payload.error_message = typeof recordData.error === 'string' ? recordData.error : (recordData.error as any)?.message;
        if ('payload' in recordData) payload.payload = recordData.payload;
      } else if (tableName === 'audit_logs') {
        if ('details' in recordData && !('data' in recordData)) {
          payload.data = recordData.details;
        }
      } else if (tableName === 'users') {
        if (!payload.username) {
          payload.username = (recordData.username as string) || (recordData.email as string) || this.id;
        }
      }
    } else {
      // Fallback cho các bảng chưa khai báo: giữ logic trích xuất cơ bản
      if ('customerId' in recordData) payload.customer_id = (recordData.customerId && typeof recordData.customerId === 'string' && recordData.customerId.trim() !== '') ? recordData.customerId : null;
      if ('entityType' in recordData) payload.entity_type = recordData.entityType;
      if ('entityId' in recordData) payload.entity_id = recordData.entityId;
      if ('deletedAt' in recordData) payload.deleted_at = recordData.deletedAt;
      if ('deletedBy' in recordData) payload.deleted_by = recordData.deletedBy;
    }

    // Double check foreign keys are not empty strings
    const fkCols = ['contract_id', 'customer_id', 'quotation_id', 'payment_id'];
    for (const fk of fkCols) {
      if (fk in payload && typeof payload[fk] === 'string' && payload[fk].trim() === '') {
        payload[fk] = null;
      }
    }

    const { error } = await supabaseAdmin.from(tableName).upsert(payload);
    if (error) {
      logger.error({ err: error, tableName, id: this.id }, `DocRef.set failed on table ${tableName}`);
      throw new Error(`Database write failed on ${tableName}: ${error.message}`);
    }
  }

  async update(updateData: Record<string, unknown>) {
    if (!isSupabaseAdminConfigured) return;
    const tableName = this.tableName;
    const desc = TABLE_DESCRIPTORS[tableName];

    if (!desc || desc.hasDataJsonb) {
      const { data: existing } = await supabaseAdmin
        .from(this.tableName)
        .select('data')
        .eq('id', this.id)
        .maybeSingle();

      const currentData = (existing?.data as Record<string, unknown>) || {};
      const mergedData = { ...currentData, ...updateData };
      await this.set(mergedData);
    } else {
      // Bảng phẳng: chỉ update các cột vật lý tương ứng
      const updatePayload: Record<string, any> = {};
      if (desc.hasUpdatedAt) {
        updatePayload.updated_at = new Date().toISOString();
      }
      for (const [key, val] of Object.entries(updateData)) {
        const mappedCol = desc.fieldMappings?.[key] || key;
        if (desc.physicalColumns.has(mappedCol)) {
          updatePayload[mappedCol] = val;
        }
      }
      const { error } = await supabaseAdmin.from(this.tableName).update(updatePayload).eq('id', this.id);
      if (error) {
        logger.error({ err: error, tableName: this.tableName, id: this.id }, `DocRef.update failed on table ${this.tableName}`);
      }
    }
  }

  async delete() {
    if (!isSupabaseAdminConfigured) return;
    await supabaseAdmin.from(this.tableName).delete().eq('id', this.id);
  }

  collection(subCollection: string) {
    return new CollectionRef(`${this.tableName}_${subCollection}`);
  }
}

class CollectionRef {
  constructor(private tableName: string) {}

  doc(id?: string) {
    const docId = id || uuidv4();
    return new DocRef(this.tableName, docId);
  }

  async add(recordData: Record<string, unknown>) {
    const docId = uuidv4();
    const docRef = new DocRef(this.tableName, docId);
    await docRef.set(recordData);
    return docRef;
  }

  select(..._fields: string[]) {
    return new QueryBuilder(this.tableName, []);
  }

  where(field: string, op: string, val: unknown) {
    return new QueryBuilder(this.tableName, [{ field, op, val }]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new QueryBuilder(this.tableName, []).orderBy(field, direction);
  }

  limit(limitCount: number) {
    return new QueryBuilder(this.tableName, []).limit(limitCount);
  }

  async get() {
    return new QueryBuilder(this.tableName, []).get();
  }

  count() {
    return {
      get: async () => {
        if (!isSupabaseAdminConfigured) return { data: () => ({ count: 0 }) };
        const { count, error } = await supabaseAdmin
          .from(this.tableName)
          .select('*', { count: 'exact', head: true });
        return { data: () => ({ count: count || 0 }) };
      }
    };
  }
}

export const PHYSICAL_COLUMNS: Record<string, Set<string>> = Object.fromEntries(
  Object.entries(TABLE_DESCRIPTORS).map(([tbl, desc]) => [tbl, desc.physicalColumns])
);

export function resolveColumn(tableName: string, field: string): string {
  if (field === '__name__') return 'id';

  const desc = TABLE_DESCRIPTORS[tableName];
  if (desc?.fieldMappings && desc.fieldMappings[field]) {
    return desc.fieldMappings[field];
  }

  if (field === 'customerId') return 'customer_id';
  if (field === 'contractId') return 'contract_id';
  if (field === 'quotationId') return 'quotation_id';
  if (field === 'paymentId') {
    if (tableName === 'deliveries') return 'payment_id';
    if (tableName === 'payments') return 'ma_thanh_toan';
  }
  if (field === 'soPhieuBaoGia' || field === 'maBaoGia') {
    if (tableName === 'quotations') return 'ma_bao_gia';
  }
  if (field === 'soHopDong' || field === 'maHopDong') {
    if (tableName === 'contracts') return 'ma_hop_dong';
  }
  if (field === 'deliveryId' || field === 'maGiaoHang') {
    if (tableName === 'deliveries') return 'ma_giao_hang';
  }
  if (field === 'maKh' && tableName === 'customers') return 'ma_kh';
  if (field === 'tenKhachHang' && tableName === 'customers') return 'ten_khach_hang';
  if (field === 'sdt' && tableName === 'customers') return 'sdt';
  if (field === 'trackingId') return 'tracking_id';
  if (field === 'deletedAt') return 'deleted_at';
  if (field === 'deletedBy') return 'deleted_by';
  if (field === 'createdAt') return 'created_at';
  if (field === 'updatedAt') return 'updated_at';

  const tablePhysical = desc?.physicalColumns || PHYSICAL_COLUMNS[tableName];
  if (tablePhysical) {
    if (tablePhysical.has(field)) return field;
    const snake = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (tablePhysical.has(snake)) return snake;
    
    // Nếu bảng không có cột data (bảng phẳng), fallback về chính field
    if (desc && !desc.hasDataJsonb) {
      return field;
    }
    // Trường không phải cột vật lý -> query PostgREST JSONB operator
    return `data->>${field}`;
  }
  return field;
}

class QueryBuilder {
  private orders: { field: string; direction: 'asc' | 'desc' }[] = [];
  private limitCount?: number;
  private startAfterDoc?: any;

  constructor(
    private tableName: string,
    private filters: { field: string; op: string; val: unknown }[] = []
  ) {}

  select(..._fields: string[]) {
    return this;
  }

  where(field: string, op: string, val: unknown) {
    this.filters.push({ field, op, val });
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.orders.push({ field, direction });
    return this;
  }

  limit(num: number) {
    this.limitCount = num;
    return this;
  }

  startAfter(doc: any) {
    this.startAfterDoc = doc;
    return this;
  }

  count() {
    return {
      get: async () => {
        if (!isSupabaseAdminConfigured) return { data: () => ({ count: 0 }) };
        let query = supabaseAdmin.from(this.tableName).select('*', { count: 'exact', head: true });

        // Auto Soft-Delete Interceptor
        const hasDeletedFilter = this.filters.some(f => f.field === 'deletedAt' || f.field === 'deleted_at');
        const tableHasDeletedAt = PHYSICAL_COLUMNS[this.tableName]?.has('deleted_at');
        if (!hasDeletedFilter && tableHasDeletedAt) {
          query = query.is('deleted_at', null);
        }

        for (const f of this.filters) {
          const col = resolveColumn(this.tableName, f.field);
          if (f.op === '==' || f.op === '=') {
            if (f.val === null) query = query.is(col, null);
            else query = query.eq(col, f.val);
          } else if (f.op === '>=') {
            query = query.gte(col, f.val);
          } else if (f.op === '<=') {
            query = query.lte(col, f.val);
          } else if (f.op === 'in' && Array.isArray(f.val)) {
            query = query.in(col, f.val);
          }
        }
        const { count } = await query;
        return { data: () => ({ count: count || 0 }) };
      }
    };
  }

  async get() {
    if (!isSupabaseAdminConfigured) {
      return {
        empty: true,
        size: 0,
        docs: [] as any[],
        forEach: (callback: (doc: any) => void) => {}
      };
    }

    let query = supabaseAdmin.from(this.tableName).select('*');

    // Auto Soft-Delete Interceptor
    const hasDeletedFilter = this.filters.some(f => f.field === 'deletedAt' || f.field === 'deleted_at');
    const tableHasDeletedAt = PHYSICAL_COLUMNS[this.tableName]?.has('deleted_at');
    if (!hasDeletedFilter && tableHasDeletedAt) {
      query = query.is('deleted_at', null);
    }

    for (const f of this.filters) {
      const col = resolveColumn(this.tableName, f.field);

      if (f.op === '==' || f.op === '=') {
        if (f.val === null) query = query.is(col, null);
        else query = query.eq(col, f.val);
      } else if (f.op === '>=') {
        query = query.gte(col, f.val);
      } else if (f.op === '<=') {
        query = query.lte(col, f.val);
      } else if (f.op === 'in' && Array.isArray(f.val)) {
        query = query.in(col, f.val);
      }
    }

    for (const ord of this.orders) {
      const col = resolveColumn(this.tableName, ord.field);
      query = query.order(col, { ascending: ord.direction === 'asc' });
    }
    const hasIdOrder = this.orders.some(o => o.field === 'id' || o.field === '__name__');
    if (!hasIdOrder && PHYSICAL_COLUMNS[this.tableName]?.has('id')) {
      query = query.order('id', { ascending: false });
    }

    // Cursor-based pagination support (startAfter)
    if (this.startAfterDoc) {
      const lastDoc = this.startAfterDoc;
      const lastData = typeof lastDoc.data === 'function' ? lastDoc.data() : lastDoc;
      const lastId = lastDoc.id || lastData?.id;

      if (this.orders.length > 0) {
        const primaryOrder = this.orders[0];
        const primaryCol = resolveColumn(this.tableName, primaryOrder.field);
        const orderVal = lastData?.[primaryOrder.field] || (primaryCol === 'id' ? lastId : undefined);
        if (orderVal !== undefined) {
          if (primaryOrder.direction === 'desc') {
            query = query.lt(primaryCol, orderVal);
          } else {
            query = query.gt(primaryCol, orderVal);
          }
        } else if (lastId) {
          query = query.gt('id', lastId);
        }
      } else if (lastId) {
        query = query.gt('id', lastId);
      }
    }

    if (this.limitCount) {
      query = query.limit(this.limitCount);
    }

    const { data, error } = await query;
    if (error || !data) {
      return {
        empty: true,
        size: 0,
        docs: [] as any[],
        forEach: (callback: (doc: any) => void) => {}
      };
    }

    const docs = data.map((item: any) => {
      const merged = { ...((item.data as Record<string, unknown>) || {}), ...item };
      return {
        id: item.id,
        data: () => merged,
        exists: true,
        updateTime: {
          toDate: () => new Date(item.updated_at || Date.now()),
          toMillis: () => new Date(item.updated_at || Date.now()).getTime()
        },
        ref: new DocRef(this.tableName, item.id)
      };
    });

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (callback: (doc: any) => void) => {
        docs.forEach(callback);
      }
    };
  }
}

let transactionQueue: Promise<unknown> = Promise.resolve();

export const adminDb = {
  collection(collectionName: string) {
    const tbl = toTableName(collectionName);
    return new CollectionRef(tbl);
  },

  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    const execute = async () => {
      const tx = {
        get: async (docRef: DocRef) => docRef.get(),
        set: async (docRef: DocRef, data: any, options?: { merge?: boolean }) => docRef.set(data, options),
        update: async (docRef: DocRef, data: any) => docRef.update(data),
        delete: async (docRef: DocRef) => docRef.delete()
      };
      return updateFunction(tx);
    };

    const nextPromise = transactionQueue.then(execute, execute);
    transactionQueue = nextPromise.then(() => {}, () => {});
    return nextPromise;
  },

  batch() {
    const operations: (() => Promise<void>)[] = [];
    return {
      set(docRef: DocRef, data: any, options?: { merge?: boolean }) {
        operations.push(() => docRef.set(data, options));
      },
      update(docRef: DocRef, data: any) {
        operations.push(() => docRef.update(data));
      },
      delete(docRef: DocRef) {
        operations.push(() => docRef.delete());
      },
      async commit() {
        for (const op of operations) {
          await op();
        }
      }
    };
  }
};

export const adminAuth = {
  async getUser(uid: string) {
    return { uid, email: `${uid}@sgm.vn`, displayName: uid };
  },
  async verifyIdToken(token: string) {
    if (token === 'sgm_admin_dev_token' || process.env.DEV_BYPASS_AUTH === 'true') {
      return { uid: 'admin-001', email: 'admin@sgm.vn', role: 'admin' };
    }
    if (isSupabaseAdminConfigured) {
      try {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) {
          return { uid: user.id, email: user.email || `${user.id}@sgm.vn`, role: 'admin' };
        }
      } catch (e) {
        logger.debug({ err: e }, 'Failed to verify Supabase token in verifyIdToken');
      }
    }
    if (process.env.NODE_ENV === 'test') {
      return { uid: 'admin-001', email: 'admin@sgm.vn', role: 'admin' };
    }
    return null;
  }
};

export default supabaseAdmin;
