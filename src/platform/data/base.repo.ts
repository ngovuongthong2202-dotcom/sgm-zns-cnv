import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';
import { mapDocument } from './mapper';
import { sessionCostCounter } from '@/src/data/cost-counter';
import { ListOptions, ListLoadMeta, ListAllResult } from '../domain/ports/repository.port';
import { v4 as uuidv4 } from 'uuid';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { logger } from '@/src/shared/lib/logger';
import { isSameCustomer } from '@/src/shared/utils/customerIdentityResolver';
import { POSTGREST_MAX_ROWS, CORE_PAGE_SIZE } from './list-limits';

export type { ListOptions, ListLoadMeta, ListAllResult };

const collectionTableMap: Record<string, string> = {
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
  userAccounts: 'users',
  user_accounts: 'users',
  settings: 'settings',
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
  productCatalog: 'settings',
  jobHeartbeats: 'settings',
  systemLocks: 'settings',
  counters: 'counters'
};

export function toTableName(collectionName: string): string {
  return collectionTableMap[collectionName] || collectionName.toLowerCase();
}

interface SharedTableChannel {
  channel: any;
  refCount: number;
  listeners: Set<(payload: any) => void>;
  cleanupTimer?: ReturnType<typeof setTimeout> | null;
}

const isTestEnv = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || Boolean(process.env?.VITEST));

const tableChannelPool = new Map<string, SharedTableChannel>();

function getOrCreateTableChannel(tableName: string, onPayload: (payload: any) => void): () => void {
  if (!isSupabaseConfigured || isTestEnv) {
    return () => {};
  }

  let entry = tableChannelPool.get(tableName);
  if (!entry) {
    const listeners = new Set<(payload: any) => void>();
    const channelName = `realtime:table:${tableName}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload: any) => {
          listeners.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              logger.error(`Error in table channel listener for ${tableName}:`, err);
            }
          });
        }
      )
      .subscribe();

    entry = { channel, refCount: 0, listeners, cleanupTimer: null };
    tableChannelPool.set(tableName, entry);
  }

  // Cancel any pending disposal timer if a new subscriber attaches
  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }

  entry.refCount++;
  entry.listeners.add(onPayload);

  return () => {
    const current = tableChannelPool.get(tableName);
    if (!current) return;
    current.listeners.delete(onPayload);
    current.refCount--;
    if (current.refCount <= 0) {
      if (current.cleanupTimer) {
        clearTimeout(current.cleanupTimer);
      }
      // Hold channel open for 30s so rapid tab switching doesn't thrash WebSocket connections
      current.cleanupTimer = setTimeout(() => {
        if (current.refCount <= 0) {
          try {
            supabase.removeChannel(current.channel);
          } catch (err) {
            logger.debug(`Error removing channel for ${tableName}:`, err);
          }
          tableChannelPool.delete(tableName);
        }
      }, 30000);
    }
  };
}

const entityChannelPool = new Map<string, SharedTableChannel>();

function getOrCreateEntityChannel(tableName: string, id: string, onPayload: (payload: any) => void): () => void {
  if (!isSupabaseConfigured || isTestEnv) {
    return () => {};
  }

  const poolKey = `${tableName}:${id}`;
  let entry = entityChannelPool.get(poolKey);
  if (!entry) {
    const listeners = new Set<(payload: any) => void>();
    const channelName = `realtime:entity:${tableName}:${id}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName, filter: `id=eq.${id}` },
        (payload: any) => {
          listeners.forEach((cb) => {
            try {
              cb(payload);
            } catch (err) {
              logger.error(`Error in entity channel listener for ${poolKey}:`, err);
            }
          });
        }
      )
      .subscribe();

    entry = { channel, refCount: 0, listeners, cleanupTimer: null };
    entityChannelPool.set(poolKey, entry);
  }

  if (entry.cleanupTimer) {
    clearTimeout(entry.cleanupTimer);
    entry.cleanupTimer = null;
  }

  entry.refCount++;
  entry.listeners.add(onPayload);

  return () => {
    const current = entityChannelPool.get(poolKey);
    if (!current) return;
    current.listeners.delete(onPayload);
    current.refCount--;
    if (current.refCount <= 0) {
      if (current.cleanupTimer) {
        clearTimeout(current.cleanupTimer);
      }
      // Hold entity channel open for 30s to allow quick transitions/re-renders without thrashing
      current.cleanupTimer = setTimeout(() => {
        if (current.refCount <= 0) {
          try {
            supabase.removeChannel(current.channel);
          } catch (err) {
            logger.debug(`Error removing entity channel for ${poolKey}:`, err);
          }
          entityChannelPool.delete(poolKey);
        }
      }, 30000);
    }
  };
}

/**
 * Enterprise Hybrid Repository: Implements Clean Architecture Repository Port on top of Supabase PostgreSQL
 */
export class BaseRepository<T> {
  public readonly tableName: string;
  private static inFlightGetById = new Map<string, Promise<any>>();

  constructor(public readonly collectionName: string) {
    this.tableName = toTableName(collectionName);
  }

  generateId(): string {
    return uuidv4();
  }

  async getById(id: string): Promise<T | null> {
    if (!id || id === 'undefined' || id === 'null') return null;

    // 1. Check L1 Memory Cache first (including negative cache)
    if (entityCachePool.has(this.collectionName, id)) {
      return entityCachePool.get<T>(this.collectionName, id);
    }

    if (!isSupabaseConfigured) {
      entityCachePool.setNotFound(this.collectionName, id);
      return null;
    }

    // 2. In-flight request deduplication (Single Flight)
    const flightKey = `${this.collectionName}:${id}`;
    const inFlight = BaseRepository.inFlightGetById.get(flightKey);
    if (inFlight) {
      return inFlight;
    }

    const promise = (async () => {
      try {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('id', id)
          .maybeSingle();

        sessionCostCounter.incrementReads(1);

        if (error || !data) {
          entityCachePool.setNotFound(this.collectionName, id);
          return null;
        }

        const entity = mapDocument<T>(data);
        if (entity && typeof entity === 'object' && 'deletedAt' in entity && (entity as any).deletedAt) {
          entityCachePool.setNotFound(this.collectionName, id);
          return null;
        }

        entityCachePool.set(this.collectionName, entity as any);
        return entity;
      } catch (err) {
        logger.error(`Error in getById for ${this.collectionName}/${id}:`, err);
        entityCachePool.setNotFound(this.collectionName, id);
        return null;
      } finally {
        BaseRepository.inFlightGetById.delete(flightKey);
      }
    })();

    BaseRepository.inFlightGetById.set(flightKey, promise);
    return promise;
  }

  async set(id: string, data: Partial<T>): Promise<void> {
    sessionCostCounter.incrementWrites(1);

    const tablesWithoutUpdatedAt = new Set(['notifications', 'telegram_sent_log', 'idempotency_keys']);

    const TABLE_PHYSICAL_COLUMNS: Record<string, string[]> = {
      customers: ['id', 'ma_kh', 'ten_khach_hang', 'sdt', 'tinh_thanh', 'nguoi_phu_trach', 'loai_kh', 'is_archived', 'total_debt', 'ltv', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'],
      quotations: ['id', 'ma_bao_gia', 'customer_id', 'trang_thai', 'tong_tien', 'nguoi_tao', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'],
      contracts: ['id', 'ma_hop_dong', 'quotation_id', 'customer_id', 'trang_thai', 'gia_tri_hop_dong', 'ngay_hoan_thanh', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'],
      payments: ['id', 'ma_thanh_toan', 'contract_id', 'customer_id', 'quotation_id', 'so_tien', 'trang_thai', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'],
      deliveries: ['id', 'ma_giao_hang', 'contract_id', 'payment_id', 'quotation_id', 'customer_id', 'trang_thai', 'deleted_at', 'deleted_by', 'created_at', 'updated_at', 'data'],
      users: ['id', 'username', 'display_name', 'role', 'department', 'position', 'email', 'created_at', 'updated_at', 'data'],
      settings: ['id', 'data', 'updated_at'],
      zns_messages: ['id', 'tracking_id', 'entity_type', 'entity_id', 'status', 'phone', 'created_at', 'updated_at', 'data'],
      zns_templates: ['id', 'template_id', 'template_name', 'status', 'price', 'apply_template_id', 'created_at', 'updated_at', 'data'],
      zns_callbacks: ['id', 'tracking_id', 'status', 'phone', 'error_code', 'received_at', 'data'],
      zns_dead_letters: ['id', 'tracking_id', 'error_message', 'retry_count', 'created_at', 'data'],
      workflow_events: ['id', 'event_name', 'aggregate_id', 'aggregate_type', 'payload', 'created_at'],
      audit_logs: ['id', 'entity_type', 'entity_id', 'action', 'user_id', 'created_at', 'data'],
      notifications: ['id', 'user_id', 'title', 'message', 'is_read', 'created_at', 'data'],
      drafts: ['id', 'user_id', 'entity_type', 'data', 'updated_at'],
      presence: ['id', 'user_id', 'entity_type', 'entity_id', 'user_name', 'last_seen_at'],
      telegram_sent_log: ['id', 'message_id', 'chat_id', 'status', 'created_at', 'data']
    };

    const payload: Record<string, any> = {
      id,
      data: data as Record<string, unknown>
    };

    if (!tablesWithoutUpdatedAt.has(this.tableName)) {
      payload.updated_at = new Date().toISOString();
    }

    const allowedCols = TABLE_PHYSICAL_COLUMNS[this.tableName];
    const setCol = (colName: string, val: any) => {
      if (!allowedCols || allowedCols.includes(colName)) {
        payload[colName] = val;
      }
    };

    // Extract core physical indexed columns for fast PostgreSQL queries & CDC filtering
    const rec = data as Record<string, any>;

    // Sovereign Boundary Guard: Prevent cross-customer foreign key pollution
    if (rec.customerId && (rec.contractId || rec.quotationId || rec.paymentId)) {
      try {
        if (rec.contractId) {
          const ct = entityCachePool.get<any>('contracts', rec.contractId);
          if (ct && ct.customerId && ct.customerId !== rec.customerId && !isSameCustomer(rec, ct)) {
            logger.warn(`[RepoBoundaryGuard] Blocked cross-customer contractId ${rec.contractId} on entity for customer ${rec.customerId}`);
            delete rec.contractId;
            if (payload.data) delete (payload.data as any).contractId;
          }
        }
        if (rec.quotationId) {
          const q = entityCachePool.get<any>('quotations', rec.quotationId);
          if (q && q.customerId && q.customerId !== rec.customerId && !isSameCustomer(rec, q)) {
            logger.warn(`[RepoBoundaryGuard] Blocked cross-customer quotationId ${rec.quotationId} on entity for customer ${rec.customerId}`);
            delete rec.quotationId;
            if (payload.data) delete (payload.data as any).quotationId;
          }
        }
        if (rec.paymentId) {
          const p = entityCachePool.get<any>('payments', rec.paymentId);
          if (p && p.customerId && p.customerId !== rec.customerId && !isSameCustomer(rec, p)) {
            logger.warn(`[RepoBoundaryGuard] Blocked cross-customer paymentId ${rec.paymentId} on entity for customer ${rec.customerId}`);
            delete rec.paymentId;
            if (payload.data) delete (payload.data as any).paymentId;
          }
        }
      } catch {
        // ignore guard error
      }
    }

    const sanitizeFk = (v: any) => (v && typeof v === 'string' && v.trim() !== '') ? v.trim() : null;
    if ('customerId' in rec && rec.customerId) setCol('customer_id', sanitizeFk(rec.customerId));
    if ('quotationId' in rec && rec.quotationId) setCol('quotation_id', sanitizeFk(rec.quotationId));
    if ('contractId' in rec && rec.contractId) setCol('contract_id', sanitizeFk(rec.contractId));
    if ('trackingId' in rec && rec.trackingId) setCol('tracking_id', rec.trackingId);
    if ('entityType' in rec && rec.entityType) setCol('entity_type', rec.entityType);
    if ('entityId' in rec && rec.entityId) setCol('entity_id', rec.entityId);
    const maKhVal = rec.maKh || rec.maKH;
    if (maKhVal) setCol('ma_kh', maKhVal);
    const maBaoGiaVal = rec.maBaoGia || rec.soPhieuBaoGia;
    if (maBaoGiaVal) setCol('ma_bao_gia', maBaoGiaVal);
    const maHopDongVal = rec.maHopDong || rec.soHopDong;
    if (maHopDongVal) setCol('ma_hop_dong', maHopDongVal);
    if ('paymentId' in rec && rec.paymentId) {
      if (this.tableName === 'payments') setCol('ma_thanh_toan', rec.paymentId);
      else setCol('payment_id', sanitizeFk(rec.paymentId));
    }
    if ('maThanhToan' in rec && rec.maThanhToan) setCol('ma_thanh_toan', rec.maThanhToan);
    if ('deliveryId' in rec && rec.deliveryId) setCol('ma_giao_hang', rec.deliveryId);
    if ('maGiaoHang' in rec && rec.maGiaoHang) setCol('ma_giao_hang', rec.maGiaoHang);
    if ('userId' in rec && rec.userId) setCol('user_id', rec.userId);
    if ('status' in rec && rec.status) setCol('status', rec.status);
    if ('trangThai' in rec && rec.trangThai) setCol('trang_thai', rec.trangThai);
    if ('deletedAt' in rec) setCol('deleted_at', rec.deletedAt || null);
    if ('deletedBy' in rec) setCol('deleted_by', rec.deletedBy || null);
    if ('isRead' in rec || 'read' in rec || 'is_read' in rec) {
      const readVal = Boolean(rec.isRead ?? rec.read ?? rec.is_read);
      setCol('is_read', readVal);
      if (payload.data && typeof payload.data === 'object') {
        payload.data.read = readVal;
        payload.data.isRead = readVal;
      }
    }
    if ('sdt' in rec || 'contacts' in rec) {
      const resolvedPhone = rec.sdt || rec.contacts?.[0]?.sdt || null;
      setCol('sdt', resolvedPhone);
    }
    if ('tenKhachHang' in rec && rec.tenKhachHang) setCol('ten_khach_hang', rec.tenKhachHang);
    if ('tinhThanh' in rec && rec.tinhThanh) setCol('tinh_thanh', rec.tinhThanh);
    if ('nguoiPhuTrach' in rec && rec.nguoiPhuTrach) setCol('nguoi_phu_trach', rec.nguoiPhuTrach);
    if ('loaiKh' in rec && rec.loaiKh) setCol('loai_kh', rec.loaiKh);
    if ('title' in rec && rec.title) setCol('title', rec.title);
    if ('message' in rec && rec.message) setCol('message', rec.message);
    if ('type' in rec && this.tableName !== 'notifications' && rec.type) setCol('type', rec.type);

    // ASUCM Financial Physical Projections for Analytics & High-Performance Indexing
    if (this.tableName === 'quotations') {
      const total = rec.tongTien ?? rec.totalAmount;
      if (total !== undefined && total !== null) setCol('tong_tien', Number(total) || 0);
    } else if (this.tableName === 'contracts') {
      const val = rec.giaTriHopDong ?? rec.totalAmount;
      if (val !== undefined && val !== null) setCol('gia_tri_hop_dong', Number(val) || 0);
    } else if (this.tableName === 'payments') {
      const amt = rec.soTien ?? rec.amount ?? rec.totalAmount;
      if (amt !== undefined && amt !== null) setCol('so_tien', Number(amt) || 0);
    } else if (this.tableName === 'customers') {
      if (rec.totalDebt !== undefined && rec.totalDebt !== null) setCol('total_debt', Number(rec.totalDebt) || 0);
      if (rec.ltv !== undefined && rec.ltv !== null) setCol('ltv', Number(rec.ltv) || 0);
    }

    // Update L1 cache
    const merged = { ...data, id } as T;
    entityCachePool.set(this.collectionName, merged as any);

    if (isSupabaseConfigured) {
      const { error } = await supabase.from(this.tableName).upsert(payload);
      if (error) {
        logger.error(`Upsert error on ${this.tableName}:`, error);
        const errMsg = error.message || error.details || error.hint || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        const customErr = new Error(errMsg);
        Object.assign(customErr, error);
        throw customErr;
      }
    }

    if (this.collectionName !== 'presence') {
      try {
        const { clearSwrColCache } = await import('@/src/data/swr-fetchers');
        clearSwrColCache(this.collectionName);
      } catch (e) {
        logger.debug('Failed to clear SWR cache for collection', e);
      }
    }
  }

  async list(opts: ListOptions = {}): Promise<T[]> {
    if (!isSupabaseConfigured) {
      // Return memory cache fallback in offline dev
      let all = entityCachePool.getAll<T>(this.collectionName);
      if (!opts.ignoreDeletedAt) {
        all = all.filter((x: any) => !x?.deletedAt);
      }
      if (opts.fkField && opts.fkId) {
        if (Array.isArray(opts.fkId)) {
          return all.filter((x: any) => opts.fkId?.includes(x[opts.fkField!]));
        }
        return all.filter((x: any) => x[opts.fkField!] === opts.fkId);
      }
      return all;
    }

    try {
      return (await this.listOrThrow(opts)).items;
    } catch (e) {
      // Hợp đồng cũ của list(): lỗi truy vấn → danh sách rỗng (nhiều nơi gọi dựa vào điều này)
      logger.debug(`list(${this.collectionName}) failed`, e);
      return [];
    }
  }

  /**
   * Giống list() nhưng NÉM lỗi thay vì trả [] — listAll() dùng để không nhầm lỗi mạng với "hết dữ liệu".
   * Khi phân trang (offset + limit) thêm khóa phụ order('id') để các dòng cùng created_at không xáo giữa các trang
   * (đợt nhập bù 30/09–02/10/2026 tạo hàng trăm dòng trong vài giây).
   * Trả kèm rawLength = số dòng THÔ PostgREST trả về, trước bộ lọc deletedAt kiểu JSONB cũ phía máy khách:
   * listAll() xét "trang cuối" theo số này, không theo số dòng còn lại sau khi lọc.
   */
  private async listOrThrow(opts: ListOptions = {}): Promise<{ items: T[]; rawLength: number }> {
    let query = supabase.from(this.tableName).select('*');

    // Auto Soft-Delete Interceptor: Push filter down to PostgreSQL database level to save egress bandwidth & compute
    const softDeleteTables = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'];
    if (!opts.ignoreDeletedAt && softDeleteTables.includes(this.tableName) && typeof (query as any).is === 'function') {
      query = query.is('deleted_at', null);
    }

    // Apply foreign key filters on indexed physical columns
    if (opts.fkField && opts.fkId) {
      const colName = opts.fkField === 'customerId' ? 'customer_id'
        : opts.fkField === 'contractId' ? 'contract_id'
        : opts.fkField === 'quotationId' ? 'quotation_id'
        : opts.fkField === 'paymentId' ? 'payment_id'
        : opts.fkField === 'trackingId' ? 'tracking_id'
        : opts.fkField === 'userId' ? 'user_id'
        : opts.fkField === 'currentEntityId' ? 'current_entity_id'
        : opts.fkField === 'currentEntityType' ? 'current_entity_type'
        : opts.fkField === 'entityId' ? 'entity_id'
        : opts.fkField === 'entityType' ? 'entity_type'
        : opts.fkField === 'templateId' ? 'template_id'
        : opts.fkField === 'isRead' ? 'is_read'
        : opts.fkField;

      if (Array.isArray(opts.fkId)) {
        query = query.in(colName, opts.fkId);
      } else {
        query = query.eq(colName, opts.fkId);
      }
    }

    // Apply sorting
    if (this.tableName === 'zns_callbacks') {
      query = query.order('processed_at', { ascending: opts.sortDirection === 'asc' });
    } else if (this.tableName === 'settings') {
      // Table settings in PostgreSQL only has [id, data, updated_at]. Never order by created_at or unindexed columns
      query = query.order('updated_at', { ascending: opts.sortDirection === 'asc' });
    } else if (opts.sortField) {
      const colName = (opts.sortField === 'createdAt' || opts.sortField === 'timestamp' || opts.sortField === 'receivedAt') ? 'created_at'
        : opts.sortField === 'updatedAt' ? 'updated_at'
        : opts.sortField;
      query = query.order(colName, { ascending: opts.sortDirection === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const usesRange = typeof opts.offset === 'number' && opts.offset >= 0 && Boolean(opts.limit);
    if (usesRange) {
      query = query.order('id', { ascending: false });
      query = query.range(opts.offset as number, (opts.offset as number) + (opts.limit as number) - 1);
    } else if (opts.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`[${this.tableName}] ${error.message || 'Lỗi truy vấn danh sách'}`);
    }
    sessionCostCounter.incrementReads((data || []).length);
    if (!data) return { items: [], rawLength: 0 };

    let results = data.map(row => mapDocument<T>(row));

    if (!opts.ignoreDeletedAt) {
      results = results.filter((d: any) => !d?.deletedAt);
    }

    if (this.tableName === 'settings' && opts.sortField && opts.sortField !== 'updatedAt') {
      const field = opts.sortField;
      results.sort((a: any, b: any) => {
        const valA = String(a?.[field] || '');
        const valB = String(b?.[field] || '');
        return opts.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }

    entityCachePool.setBatch(this.collectionName, results as any[]);
    return { items: results, rawLength: data.length };
  }

  /**
   * Nạp theo trang (.range) tới tối đa maxRows dòng, mỗi trang ≤ POSTGREST_MAX_ROWS.
   * "Trang cuối" xét theo số dòng THÔ PostgREST trả về (trước bộ lọc deletedAt kiểu JSONB cũ): trang thô ngắn → dừng, capped=false,
   * total = số dòng đã nạp. capped=true khi dừng vì số dòng thô đã nạp chạm maxRows mà trang thô cuối vẫn đầy; chỉ khi đó mới
   * đếm total (count: exact, một lần). Lỗi ở bất kỳ trang nào → ném lỗi.
   * LƯU Ý: trả về dòng thô đã qua mapDocument — KHÔNG đi qua `list()` ghi đè của các repo module (PaymentRepoSupabase,
   * ContractRepoSupabase, DeliveryRepoSupabase, QuotationRepoSupabase bọc aggregate). Vì vậy chỉ gọi qua
   * `repositoryFactory.get(...)` (BaseRepository thuần) như Việc 3/5 — không gọi trên các lớp repo module.
   */
  async listAll(opts: ListOptions = {}, paging: { pageSize?: number; maxRows?: number } = {}): Promise<ListAllResult<T>> {
    const pageSize = Math.max(1, Math.min(paging.pageSize ?? CORE_PAGE_SIZE, POSTGREST_MAX_ROWS));
    const maxRows = Math.max(pageSize, paging.maxRows ?? pageSize * 2);

    if (!isSupabaseConfigured) {
      const all = await this.list(opts);
      return { items: all, total: all.length, capped: false };
    }

    const items: T[] = [];
    const seen = new Set<string>();
    let offset = 0; // = số dòng thô đã nạp (mọi trang trước đều đầy)
    while (offset < maxRows) {
      const want = Math.min(pageSize, maxRows - offset);
      const { items: page, rawLength } = await this.listOrThrow({ ...opts, limit: want, offset });
      for (const row of page) {
        const id = String((row as { id?: unknown })?.id ?? '');
        if (id && seen.has(id)) continue; // một dòng mới chèn giữa hai lần gọi có thể đẩy dòng cũ sang trang sau
        if (id) seen.add(id);
        items.push(row);
      }
      offset += want;
      if (rawLength < want) {
        return { items, total: items.length, capped: false };
      }
    }

    // Dừng ở trần maxRows trong khi trang thô cuối vẫn đầy → có thể còn dữ liệu ngoài trần
    const total = await this.countActive(opts);
    return { items, total, capped: true };
  }

  /** Đếm dòng đang hoạt động; chỉ gọi khi đã chạm trần. null = không đếm được (có lọc khóa ngoại, hoặc lỗi). */
  private async countActive(opts: ListOptions): Promise<number | null> {
    if (opts.fkField) return null;
    try {
      let q = supabase.from(this.tableName).select('id', { count: 'exact', head: true });
      const softDeleteTables = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'];
      if (!opts.ignoreDeletedAt && softDeleteTables.includes(this.tableName)) {
        q = q.is('deleted_at', null);
      }
      const { count, error } = await q;
      if (error || typeof count !== 'number') return null;
      return count;
    } catch {
      return null;
    }
  }

  async listPaginated(opts?: ListOptions | any, limitOrLastDoc?: any, _lastDocId?: any): Promise<{ data: T[], hasMore: boolean; lastDoc?: any }> {
    const limit = typeof limitOrLastDoc === 'number' ? limitOrLastDoc : (opts?.limit || 50);
    const offset = typeof opts?.offset === 'number' ? opts.offset : 0;
    // Query limit + 1 to reliably detect hasMore
    const items = await this.list({ ...(opts || {}), limit: limit + 1, offset });
    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    return {
      data,
      hasMore,
      lastDoc: data.length > 0 ? (data[data.length - 1] as any)?.id : null
    };
  }

  subscribe(
    optsOrLimit: number | ListOptions,
    cb: (data: T[], length: number, meta?: ListLoadMeta) => void,
    errCb?: (err: Error) => void
  ): () => void {
    const opts: ListOptions = typeof optsOrLimit === 'number' ? { limit: optsOrLimit } : optsOrLimit;
    let isSubscribed = true;
    let currentItems: T[] = [];
    let lastMeta: ListLoadMeta | undefined;
    // Sự kiện realtime đến trong lúc đang nạp (có thể nhiều trang) được giữ lại và áp dụng sau khi nạp xong
    let pendingEvents: unknown[] | null = [];

    const sortField = opts.sortField || (
      ['customers', 'quotations', 'contracts', 'payments', 'deliveries'].includes(this.collectionName)
        ? (this.collectionName === 'customers' ? 'ngayCapNhat' : (this.collectionName === 'contracts' ? 'ngayKy' : (this.collectionName === 'payments' ? 'ngayThanhToan' : (this.collectionName === 'deliveries' ? 'ngayGiaoMay' : 'ngayBaoGia'))))
        : 'createdAt'
    );

    const sortItems = (items: T[]) => {
      return [...items].sort((a: any, b: any) => {
        const valA = String(a?.[sortField] || a?.createdAt || a?.ngayCapNhat || '');
        const valB = String(b?.[sortField] || b?.createdAt || b?.ngayCapNhat || '');
        return opts.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    };

    const emit = () => {
      const meta: ListLoadMeta | undefined = lastMeta
        ? { total: lastMeta.capped ? lastMeta.total : currentItems.length, capped: lastMeta.capped }
        : undefined;
      cb(currentItems, currentItems.length, meta);
    };

    // Realtime CDC with Delta Patching (0 reads!)
    const applyCdc = (payload: any) => {
      const eventType = payload.eventType;
      if (eventType === 'INSERT') {
        const mapped = mapDocument<T>(payload.new);
        if (mapped && !(mapped as any).deletedAt) {
          entityCachePool.set(this.collectionName, mapped as any);
          currentItems = sortItems([mapped, ...currentItems.filter(item => (item as any)?.id !== (mapped as any).id)]);
          if (opts.limit && currentItems.length > opts.limit) {
            currentItems = currentItems.slice(0, opts.limit);
          }
          emit();
        }
      } else if (eventType === 'UPDATE') {
        const mapped = mapDocument<T>(payload.new);
        if (mapped) {
          if ((mapped as any).deletedAt) {
            entityCachePool.remove(this.collectionName, (mapped as any).id);
            currentItems = currentItems.filter(item => (item as any)?.id !== (mapped as any).id);
          } else {
            entityCachePool.set(this.collectionName, mapped as any);
            const exists = currentItems.some(item => (item as any)?.id === (mapped as any).id);
            if (exists) {
              currentItems = currentItems.map(item => (item as any)?.id === (mapped as any).id ? mapped : item);
            } else {
              currentItems = [mapped, ...currentItems];
            }
            currentItems = sortItems(currentItems);
            if (opts.limit && currentItems.length > opts.limit) {
              currentItems = currentItems.slice(0, opts.limit);
            }
          }
          emit();
        }
      } else if (eventType === 'DELETE') {
        const delId = payload.old?.id;
        if (delId) {
          entityCachePool.remove(this.collectionName, delId);
          currentItems = currentItems.filter(item => (item as any)?.id !== delId);
          emit();
        }
      }
    };

    // 1. Initial load: theo trang khi có maxRows (cửa sổ lõi), một lượt list() cho các bộ sưu tập khác
    const usePaging = typeof opts.maxRows === 'number' && opts.maxRows > 0;
    const initialLoad: Promise<void> = usePaging
      ? this.listAll(opts, { pageSize: opts.pageSize, maxRows: opts.maxRows }).then(result => {
          if (!isSubscribed) return;
          currentItems = result.items;
          lastMeta = { total: result.total, capped: result.capped };
        })
      : this.list(opts).then(items => {
          if (!isSubscribed) return;
          currentItems = items;
        });

    initialLoad
      .then(() => {
        if (!isSubscribed) return;
        emit();
        const buffered = pendingEvents || [];
        pendingEvents = null;
        buffered.forEach(applyCdc);
      })
      .catch(err => {
        pendingEvents = null;
        if (isSubscribed && errCb) errCb(err);
      });

    if (!isSupabaseConfigured || isTestEnv) {
      return () => { isSubscribed = false; };
    }

    // 2. Realtime CDC subscription
    const unsubscribeChannel = getOrCreateTableChannel(this.tableName, (payload: unknown) => {
      if (!isSubscribed) return;
      if (pendingEvents) {
        pendingEvents.push(payload);
        return;
      }
      applyCdc(payload);
    });

    return () => {
      isSubscribed = false;
      unsubscribeChannel();
    };
  }

  subscribeById(id: string, cb: (data: T | null) => void, errCb?: (err: Error) => void): () => void {
    if (!id || id === 'undefined' || id === 'null') {
      cb(null);
      return () => {};
    }

    let isSubscribed = true;

    this.getById(id)
      .then(doc => {
        if (isSubscribed) cb(doc);
      })
      .catch(err => {
        if (isSubscribed && errCb) errCb(err);
      });

    if (!isSupabaseConfigured) {
      return () => { isSubscribed = false; };
    }

    const unsubscribeChannel = getOrCreateEntityChannel(this.tableName, id, (payload: any) => {
      if (!isSubscribed) return;
      if (payload.eventType === 'DELETE') {
        entityCachePool.setNotFound(this.collectionName, id);
        cb(null);
      } else {
        const mapped = mapDocument<T>(payload.new);
        if (mapped) {
          entityCachePool.set(this.collectionName, mapped as any);
          cb(mapped);
        }
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribeChannel();
    };
  }

  async create(data: Partial<T>): Promise<any> {
    const id = this.generateId();
    await this.set(id, { ...data, createdAt: new Date().toISOString() } as Partial<T>);
    return id;
  }

  async update(id: string, data: Partial<T>): Promise<any> {
    const existing = await this.getById(id);
    const rawProps = (existing && (existing as any).props && typeof (existing as any).props === 'object' && !Array.isArray((existing as any).props))
      ? { ...(existing as any).props, ...existing }
      : (existing || {});
    const merged = { ...rawProps, ...data };
    if ((merged as any).props) delete (merged as any).props;
    if ((merged as any)._domainEvents) delete (merged as any)._domainEvents;
    await this.set(id, merged as Partial<T>);
  }

  async softDelete(id: string): Promise<void> {
    await this.update(id, { deletedAt: new Date().toISOString() } as unknown as Partial<T>);
  }

  async hardDelete(id: string): Promise<void> {
    sessionCostCounter.incrementWrites(1);
    entityCachePool.remove(this.collectionName, id);

    if (isSupabaseConfigured) {
      await supabase.from(this.tableName).delete().eq('id', id);
    }

    try {
      const { clearSwrColCache } = await import('@/src/data/swr-fetchers');
      clearSwrColCache(this.collectionName);
    } catch (e) {
      logger.debug('Failed to clear SWR cache on delete', e);
    }
  }
}
