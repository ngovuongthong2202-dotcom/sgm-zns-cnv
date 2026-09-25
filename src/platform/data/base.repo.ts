import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';
import { mapDocument } from './mapper';
import { sessionCostCounter } from '@/src/data/cost-counter';
import { ListOptions } from '../domain/ports/repository.port';
import { v4 as uuidv4 } from 'uuid';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { logger } from '@/src/shared/lib/logger';

export type { ListOptions };

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
  systemLocks: 'settings'
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

    const payload: Record<string, any> = {
      id,
      data: data as Record<string, unknown>,
      updated_at: new Date().toISOString()
    };

    // Extract core physical indexed columns for fast PostgreSQL queries & CDC filtering
    const rec = data as Record<string, any>;
    if ('customerId' in rec) payload.customer_id = rec.customerId;
    if ('quotationId' in rec) payload.quotation_id = rec.quotationId;
    if ('contractId' in rec) payload.contract_id = rec.contractId;
    if ('trackingId' in rec) payload.tracking_id = rec.trackingId;
    if ('entityType' in rec) payload.entity_type = rec.entityType;
    if ('entityId' in rec) payload.entity_id = rec.entityId;
    if ('maKh' in rec) payload.ma_kh = rec.maKh;
    if ('maBaoGia' in rec) payload.ma_bao_gia = rec.maBaoGia;
    if ('maHopDong' in rec) payload.ma_hop_dong = rec.maHopDong;
    if ('paymentId' in rec) {
      if (this.tableName === 'payments') payload.ma_thanh_toan = rec.paymentId;
      else payload.payment_id = rec.paymentId;
    }
    if ('maThanhToan' in rec && this.tableName === 'payments') payload.ma_thanh_toan = rec.maThanhToan;
    if ('deliveryId' in rec && this.tableName === 'deliveries') payload.ma_giao_hang = rec.deliveryId;
    if ('maGiaoHang' in rec && this.tableName === 'deliveries') payload.ma_giao_hang = rec.maGiaoHang;
    if ('userId' in rec) payload.user_id = rec.userId;
    if ('currentEntityId' in rec) payload.current_entity_id = rec.currentEntityId;
    if ('currentEntityType' in rec) payload.current_entity_type = rec.currentEntityType;
    if ('status' in rec) payload.status = rec.status;
    if ('trangThai' in rec) payload.trang_thai = rec.trangThai;
    if ('deletedAt' in rec) payload.deleted_at = rec.deletedAt;
    if ('isRead' in rec || 'read' in rec || 'is_read' in rec) {
      payload.is_read = rec.isRead ?? rec.read ?? rec.is_read;
    }
    if ('title' in rec) payload.title = rec.title;
    if ('message' in rec) payload.message = rec.message;
    if ('type' in rec) payload.type = rec.type;

    // Update L1 cache
    const merged = { ...data, id } as T;
    entityCachePool.set(this.collectionName, merged as any);

    if (isSupabaseConfigured) {
      await supabase.from(this.tableName).upsert(payload);
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

    if (typeof opts.offset === 'number' && opts.offset >= 0 && opts.limit) {
      query = query.range(opts.offset, opts.offset + opts.limit - 1);
    } else if (opts.limit) {
      query = query.limit(opts.limit);
    }

    const { data, error } = await query;
    sessionCostCounter.incrementReads((data || []).length);

    if (error || !data) return [];

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
    return results;
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
    cb: (data: T[], length: number) => void,
    errCb?: (err: Error) => void
  ): () => void {
    const opts: ListOptions = typeof optsOrLimit === 'number' ? { limit: optsOrLimit } : optsOrLimit;
    let isSubscribed = true;
    let currentItems: T[] = [];

    // 1. Initial load
    this.list(opts)
      .then(items => {
        if (isSubscribed) {
          currentItems = items;
          cb(currentItems, currentItems.length);
        }
      })
      .catch(err => {
        if (isSubscribed && errCb) errCb(err);
      });

    if (!isSupabaseConfigured || isTestEnv) {
      return () => { isSubscribed = false; };
    }

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

    // 2. Realtime CDC subscription with Delta Patching (0 reads!)
    const unsubscribeChannel = getOrCreateTableChannel(this.tableName, (payload: any) => {
      if (!isSubscribed) return;

      const eventType = payload.eventType;
      if (eventType === 'INSERT') {
        const mapped = mapDocument<T>(payload.new);
        if (mapped && !(mapped as any).deletedAt) {
          entityCachePool.set(this.collectionName, mapped as any);
          currentItems = sortItems([mapped, ...currentItems.filter(item => (item as any)?.id !== (mapped as any).id)]);
          if (opts.limit && currentItems.length > opts.limit) {
            currentItems = currentItems.slice(0, opts.limit);
          }
          cb(currentItems, currentItems.length);
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
          cb(currentItems, currentItems.length);
        }
      } else if (eventType === 'DELETE') {
        const delId = payload.old?.id;
        if (delId) {
          entityCachePool.remove(this.collectionName, delId);
          currentItems = currentItems.filter(item => (item as any)?.id !== delId);
          cb(currentItems, currentItems.length);
        }
      }
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

    const channelName = `realtime:${this.tableName}:${id}:${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: this.tableName, filter: `id=eq.${id}` },
        payload => {
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
        }
      )
      .subscribe();

    return () => {
      isSubscribed = false;
      supabase.removeChannel(channel);
    };
  }

  async create(data: Partial<T>): Promise<any> {
    const id = this.generateId();
    await this.set(id, { ...data, createdAt: new Date().toISOString() } as Partial<T>);
    return id;
  }

  async update(id: string, data: Partial<T>): Promise<any> {
    const existing = await this.getById(id);
    const merged = { ...(existing || {}), ...data };
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
