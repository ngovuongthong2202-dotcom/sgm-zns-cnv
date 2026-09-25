import { useState, useEffect } from 'react';
import { repositoryFactory } from '@/src/data/repositories';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { notify } from '@/src/shared/utils/notify';
import { logger } from '@/src/shared/lib/logger';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';

export interface CollectionState<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
}

type SubscriberCallback<T> = (state: CollectionState<T>) => void;

const EMPTY_COLLECTION_DATA: never[] = [];
const EMPTY_COLLECTION_STATE: CollectionState<any> = Object.freeze({
  data: EMPTY_COLLECTION_DATA,
  loading: false,
  error: null,
  hasMore: false,
  loadMore: () => {},
});

class RealtimeStore {
  private isAuthReady = true;
  private listeners = new Map<string, {
    unsubscribe: (() => void) | null;
    subscribers: Set<SubscriberCallback<any>>;
    data: any[];
    loading: boolean;
    error: Error | null;
    currentLimit: number;
    hasMore: boolean;
    cleanupTimeout: ReturnType<typeof setTimeout> | null;
  }>();

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

  getCollectionState<T>(collectionName: string): CollectionState<T> {
    if (!collectionName || collectionName === 'non-existent-skip') {
      return EMPTY_COLLECTION_STATE;
    }
    const entry = this.listeners.get(collectionName);
    if (entry) {
      return {
        data: entry.data,
        loading: entry.loading,
        error: entry.error,
        hasMore: entry.hasMore,
        loadMore: () => this.loadMore(collectionName),
      };
    }
    return {
      data: [],
      loading: true,
      error: null,
      hasMore: false,
      loadMore: () => this.loadMore(collectionName),
    };
  }

  loadMore(collectionName: string) {
    const entry = this.listeners.get(collectionName);
    if (!entry || !entry.hasMore || entry.loading) return;

    entry.currentLimit += 500;
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

    const snapUnsub = repo.subscribe(
      entry.currentLimit,
      (results, originalLength) => {
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
      entry.error = null;
      entry.hasMore = originalLength === entry.currentLimit;
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
        currentLimit: 500,
        hasMore: false,
        cleanupTimeout: null,
      };
      
      this.listeners.set(collectionName, entry);
      this.subscribeInternal(collectionName);
    }

    entry.subscribers.add(callback);
    
    // Call back immediately with current state
    callback({
      data: entry.data,
      loading: entry.loading,
      error: entry.error,
      hasMore: entry.hasMore,
      loadMore: () => this.loadMore(collectionName),
    });

    return () => {
      const currentEntry = this.listeners.get(collectionName);
      if (!currentEntry) return;

      currentEntry.subscribers.delete(callback);

      if (currentEntry.subscribers.size === 0) {
        // Core enterprise collections are kept warm indefinitely to guarantee 0ms transitions and 0 reads
        const isCore = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'].includes(collectionName);
        if (isCore) {
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
    const state = {
      data: entry.data,
      loading: entry.loading,
      error: entry.error,
      hasMore: entry.hasMore,
      loadMore: () => this.loadMore(collectionName),
    };
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
