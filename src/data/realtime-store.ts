import { useState, useEffect } from 'react';
import { repositoryFactory } from '@/src/data/repositories';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { notify } from '@/src/shared/utils/notify';
import { logger } from '@/src/shared/lib/logger';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { CORE_ABSOLUTE_CEILING, CORE_HARD_CAP, CORE_PAGE_SIZE, DEFAULT_WINDOW_LIMIT, isCoreCollection } from '@/src/platform/data/list-limits';
import type { ListLoadMeta } from '@/src/platform/domain/ports/repository.port';

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  /** true khi còn dữ liệu có thể tải thêm (bộ sưu tập lõi: đã chạm trần và chưa tới trần tuyệt đối) */
  hasMore: boolean;
  /** Tải thêm (lõi: +CORE_PAGE_SIZE tới CORE_ABSOLUTE_CEILING; khác: +500); khi đang có lỗi thì thử lại đúng cỡ đã nạp. Cùng một hàm qua mọi lần thông báo. */
  loadMore: () => void;
  /** Số dòng đang có trong bộ nhớ */
  loaded: number;
  /** Tổng số dòng đang hoạt động trong CSDL (chỉ được đếm khi chạm trần); null khi chưa biết */
  total: number | null;
  /** true khi cửa sổ lõi đã chạm trần nạp (CORE_HARD_CAP hoặc trần hiện tại sau loadMore) */
  capped: boolean;
}

type SubscriberCallback<T> = (state: CollectionState<T>) => void;

interface ListenerEntry {
  unsubscribe: (() => void) | null;
  subscribers: Set<SubscriberCallback<any>>;
  data: any[];
  loading: boolean;
  error: Error | null;
  /** Ngưỡng cho bộ sưu tập ngoài nhóm lõi (hành vi cũ: 500, +500 mỗi lần tải thêm) */
  currentLimit: number;
  /** Ngưỡng ngoài nhóm lõi của lượt nạp thành công gần nhất (lùi về đây khi lượt nâng ngưỡng bị lỗi) */
  committedLimit: number;
  /** Trần nạp cho bộ sưu tập lõi (CORE_HARD_CAP, +CORE_PAGE_SIZE mỗi lần tải thêm, tối đa CORE_ABSOLUTE_CEILING) */
  maxRows: number;
  /** Trần nạp lõi của lượt nạp thành công gần nhất (lùi về đây khi lượt nâng trần bị lỗi) */
  committedMaxRows: number;
  hasMore: boolean;
  total: number | null;
  capped: boolean;
  /** Đang có một lượt nạp chưa trả kết quả → loadMore bị bỏ qua */
  inFlight: boolean;
  /** Tạo MỘT lần cùng mục, giữ nguyên danh tính qua mọi lần thông báo (DataView gọi lại fetchMore mỗi khi prop này đổi danh tính) */
  loadMore: () => void;
  cleanupTimeout: ReturnType<typeof setTimeout> | null;
}

const EMPTY_COLLECTION_DATA: never[] = [];
const EMPTY_COLLECTION_STATE: CollectionState<any> = Object.freeze({
  data: EMPTY_COLLECTION_DATA,
  loading: false,
  error: null,
  hasMore: false,
  loadMore: () => {},
  loaded: 0,
  total: null,
  capped: false,
});

class RealtimeStore {
  private isAuthReady = true;
  private listeners = new Map<string, ListenerEntry>();

  constructor() {
    this.isAuthReady = true;

    if (typeof window !== 'undefined') {
      crossTabSync.subscribe((event) => {
        if (event.type === 'ENTITY_DELETED' && event.id) {
          this.mutateOptimistic(event.collectionName, 'delete', event.id);
        } else if (event.type === 'COLLECTION_REFRESH') {
          const entry = this.listeners.get(event.collectionName);
          if (entry) {
            this.subscribeInternal(event.collectionName);
          }
        }
      });
    }
  }

  private toState<T>(collectionName: string, entry: ListenerEntry): CollectionState<T> {
    return {
      data: entry.data,
      loading: entry.loading,
      error: entry.error,
      hasMore: entry.hasMore,
      loadMore: entry.loadMore,
      loaded: entry.data.length,
      total: entry.total,
      capped: entry.capped,
    };
  }

  getCollectionState<T>(collectionName: string): CollectionState<T> {
    if (!collectionName || collectionName === 'non-existent-skip') {
      return EMPTY_COLLECTION_STATE;
    }
    const entry = this.listeners.get(collectionName);
    if (entry) {
      return this.toState<T>(collectionName, entry);
    }
    return {
      data: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: () => this.loadMore(collectionName),
      loaded: 0,
      total: null,
      capped: false,
    };
  }

  loadMore(collectionName: string) {
    const entry = this.listeners.get(collectionName);
    if (!entry || entry.loading || entry.inFlight) return;
    // Lượt trước lỗi: thử lại đúng cỡ đã nạp thành công, không nâng trần (tránh vòng lặp thử lại khi mất mạng)
    if (entry.error) {
      entry.error = null;
      this.subscribeInternal(collectionName);
      return;
    }
    if (!entry.hasMore) return;

    if (isCoreCollection(collectionName)) {
      if (entry.maxRows >= CORE_ABSOLUTE_CEILING) return;
      entry.maxRows = Math.min(entry.maxRows + CORE_PAGE_SIZE, CORE_ABSOLUTE_CEILING);
    } else {
      entry.currentLimit += DEFAULT_WINDOW_LIMIT;
    }
    // We don't set loading = true to keep showing existing data without spinner while fetching more
    this.subscribeInternal(collectionName);
  }

  refresh(collectionName: string) {
    const entry = this.listeners.get(collectionName);
    if (entry) {
      this.subscribeInternal(collectionName);
    }
  }

  private subscribeInternal<T>(collectionName: string) {
    const entry = this.listeners.get(collectionName);
    if (!entry) return;

    if (entry.unsubscribe) {
      entry.unsubscribe();
      entry.unsubscribe = null;
    }

    if (!this.isAuthReady) {
      // Delay subscribing until Auth is ready
      return;
    }

    const sortField = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'].includes(collectionName)
        ? (collectionName === 'customers' ? 'ngayCapNhat' : (collectionName === 'contracts' ? 'ngayKy' : (collectionName === 'payments' ? 'ngayThanhToan' : (collectionName === 'deliveries' ? 'ngayGiaoMay' : 'ngayBaoGia'))))
        : 'createdAt';

    const repo = repositoryFactory.get<T>(collectionName);
    const isCore = isCoreCollection(collectionName);
    // Cửa sổ lõi: nạp theo trang tới trần (DL01). Bộ sưu tập khác: ngưỡng số như cũ.
    const subscribeArg = isCore
      ? { limit: entry.maxRows, pageSize: CORE_PAGE_SIZE, maxRows: entry.maxRows }
      : entry.currentLimit;

    entry.inFlight = true;

    const snapUnsub = repo.subscribe(
      subscribeArg,
      (results: T[], originalLength: number, meta?: ListLoadMeta) => {
        results.sort((a, b) => {
        const getCompareString = (val: any): string => {
          if (!val) return '';
          if (typeof val === 'string') return val;
          if (typeof val.toDate === 'function') {
            try { return val.toDate().toISOString(); } catch { return ''; }
          }
          if (val instanceof Date) return val.toISOString();
          if (typeof val === 'object' && typeof val.seconds === 'number') return new Date(val.seconds * 1000).toISOString();
          return String(val);
        };
        const dateA = getCompareString((a as any)[sortField] || (a as any).createdAt || (a as any).ngayCapNhat);
        const dateB = getCompareString((b as any)[sortField] || (b as any).createdAt || (b as any).ngayCapNhat);
        return dateB.localeCompare(dateA);
      });

      entry.data = results;
      entry.loading = false;
      entry.inFlight = false;
      entry.error = null;
      if (isCore) {
        entry.capped = Boolean(meta?.capped);
        entry.total = meta ? meta.total : results.length;
        entry.hasMore = entry.capped && entry.maxRows < CORE_ABSOLUTE_CEILING;
      } else {
        entry.capped = false;
        entry.total = null;
        entry.hasMore = originalLength === entry.currentLimit;
      }
      entry.committedMaxRows = entry.maxRows;
      entry.committedLimit = entry.currentLimit;
      entityCachePool.setBatch(collectionName, results as any[]);
      this.notify(collectionName);
    }, (err) => {
      if (entry.unsubscribe) {
        try { entry.unsubscribe(); } catch (e) {
          logger.debug('Error unsubscribing listener on error', e);
        }
        entry.unsubscribe = null;
      }
      notify.error('Không tải được dữ liệu, thử lại');
      entry.error = err as Error;
      entry.loading = false;
      entry.inFlight = false;
      // Lùi về cỡ đã nạp thành công gần nhất và tắt tải thêm: không tự thử lại (thử lại qua loadMore)
      entry.maxRows = entry.committedMaxRows;
      entry.currentLimit = entry.committedLimit;
      entry.hasMore = false;
      this.notify(collectionName);
      handleDatabaseError(err, OperationType.LIST, collectionName);
    });

    entry.unsubscribe = snapUnsub;
  }

  subscribe<T>(collectionName: string, callback: SubscriberCallback<T>): () => void {
    if (collectionName === 'non-existent-skip') {
      callback(EMPTY_COLLECTION_STATE);
      return () => {};
    }

    let entry = this.listeners.get(collectionName);

    if (entry && entry.cleanupTimeout) {
      clearTimeout(entry.cleanupTimeout);
      entry.cleanupTimeout = null;
    }

    if (!entry) {
      const cachedDocs = entityCachePool.getAll<T>(collectionName);
      entry = {
        unsubscribe: null,
        subscribers: new Set(),
        data: cachedDocs,
        loading: cachedDocs.length === 0,
        error: null,
        currentLimit: DEFAULT_WINDOW_LIMIT,
        committedLimit: DEFAULT_WINDOW_LIMIT,
        maxRows: CORE_HARD_CAP,
        committedMaxRows: CORE_HARD_CAP,
        hasMore: false,
        total: null,
        capped: false,
        inFlight: false,
        loadMore: () => this.loadMore(collectionName),
        cleanupTimeout: null,
      };

      this.listeners.set(collectionName, entry);
      this.subscribeInternal(collectionName);
    }

    entry.subscribers.add(callback);

    // Call back immediately with current state
    callback(this.toState<T>(collectionName, entry));

    return () => {
      const currentEntry = this.listeners.get(collectionName);
      if (!currentEntry) return;

      currentEntry.subscribers.delete(callback);

      if (currentEntry.subscribers.size === 0) {
        // Core enterprise collections are kept warm indefinitely to guarantee 0ms transitions and 0 reads
        if (isCoreCollection(collectionName)) {
          return;
        }

        currentEntry.cleanupTimeout = setTimeout(() => {
          const entryToCleanup = this.listeners.get(collectionName);
          if (entryToCleanup && entryToCleanup.subscribers.size === 0) {
            if (entryToCleanup.unsubscribe) {
              entryToCleanup.unsubscribe();
            }
            this.listeners.delete(collectionName);
          }
        }, 5 * 60 * 1000); // 5 minutes
      }
    };
  }

  // Notify all subscribers of a collection
  private notify(collectionName: string) {
    const entry = this.listeners.get(collectionName);
    if (!entry) return;
    const state = this.toState<any>(collectionName, entry);
    entry.subscribers.forEach((cb) => {
      try {
        cb(state);
      } catch (err) {
        logger.error(`Error notifying subscriber for ${collectionName}:`, err);
      }
    });
  }

  // Mutate local state optimistically
  mutateOptimistic<T extends { id?: string }>(
    collectionName: string,
    operation: 'create' | 'update' | 'delete',
    data: T | string
  ) {
    const entry = this.listeners.get(collectionName);
    if (!entry) return; // If no active listener is mounted, the snapshot will handle it automatically upon mount

    let updatedData = [...entry.data];
    const id = data && typeof data === 'object' && 'id' in data ? (data as T).id : (typeof data === 'string' ? data : undefined);

    if (operation === 'create') {
      if (id && !updatedData.some((item) => item.id === id)) {
        // Prepend optimistic item
        updatedData = [data, ...updatedData];
      }
    } else if (operation === 'update') {
      if (id && typeof data === 'object') {
        updatedData = updatedData.map((item) => item.id === id ? { ...item, ...data } : item);
      }
    } else if (operation === 'delete') {
      if (id) {
        updatedData = updatedData.filter((item) => {
          if (!item) return false;
          if (item.id === id) return false;
          const anyItem = item as any;
          if (anyItem.maKh && anyItem.maKh === id) return false;
          if (anyItem.soPhieuBaoGia && anyItem.soPhieuBaoGia === id) return false;
          if (anyItem.soHopDong && anyItem.soHopDong === id) return false;
          if (anyItem.paymentId && anyItem.paymentId === id) return false;
          if (anyItem.deliveryId && anyItem.deliveryId === id) return false;
          return true;
        });
      }
    }

    entry.data = updatedData;
    if (operation === 'delete' && id) {
      entityCachePool.remove(collectionName, id);
    } else if (data && typeof data === 'object' && 'id' in data) {
      entityCachePool.set(collectionName, data as any);
    }
    this.notify(collectionName);
  }

  // Get current snapshot for transactional rollback
  getSnapshot(collectionName: string): any[] {
    const entry = this.listeners.get(collectionName);
    return entry ? [...entry.data] : [];
  }

  // Restore snapshot on server error / mutation rollback
  restoreSnapshot(collectionName: string, snapshot: any[]) {
    const entry = this.listeners.get(collectionName);
    if (!entry) return;
    entry.data = [...snapshot];
    entityCachePool.setBatch(collectionName, entry.data);
    this.notify(collectionName);
  }
}

export const realtimeStore = new RealtimeStore();

export function useRealtimeCollection<T>(collectionName: string): CollectionState<T> {
  const [state, setState] = useState<CollectionState<T>>(() => realtimeStore.getCollectionState<T>(collectionName));

  useEffect(() => {
    return realtimeStore.subscribe<T>(collectionName, (newState) => {
      setState(newState);
    });
  }, [collectionName]);

  return state;
}
