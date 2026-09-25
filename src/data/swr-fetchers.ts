import { repositoryFactory } from '@/src/data/repositories';
import { mutate as globalMutate } from 'swr';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { realtimeStore } from '@/src/data/realtime-store';
import { logger } from '@/src/shared/lib/logger';

// Global memory cache and promise cache for extreme performance
export const swrColCacheMap = new Map<string, any>();
export const swrDocCacheMap = new Map<string, any>();
export const swrColPromiseCache = new Map<string, Promise<any>>();
export const swrDocPromiseCache = new Map<string, Promise<any>>();

export const clearSwrColCache = (colName: string) => {
  for (const key of swrColCacheMap.keys()) {
    if (key === colName || key.startsWith(colName + ':')) {
      swrColCacheMap.delete(key);
    }
  }
  for (const key of swrDocCacheMap.keys()) {
    if (key.startsWith(colName + ':')) {
      swrDocCacheMap.delete(key);
    }
  }
  for (const key of swrColPromiseCache.keys()) {
    if (key === colName || key.startsWith(colName + ':')) {
      swrColPromiseCache.delete(key);
    }
  }
  for (const key of swrDocPromiseCache.keys()) {
    if (key.startsWith(colName + ':')) {
      swrDocPromiseCache.delete(key);
    }
  }
  // Explicitly notify SWR to revalidate the active lookups
  try {
    globalMutate(
      (key) => typeof key === 'string' && (key === colName || key.startsWith(colName + ':')),
      undefined,
      { revalidate: true }
    );
  } catch (e) {
    logger.debug('SWR globalMutate error in clearSwrColCache', e);
  }
};

export const swrColFetcher = async <T = unknown>(key: string): Promise<T[]> => {
  if (!key) return [];

  // Check memory cache first for 0ms transition feedback
  if (swrColCacheMap.has(key)) {
    return swrColCacheMap.get(key) as T[];
  }

  // Check parallel pending promise to deduplicate current requests
  if (swrColPromiseCache.has(key)) {
    return swrColPromiseCache.get(key) as Promise<T[]>;
  }

  const parts = key.split(':');
  const colName = parts[0];
  const sizeLimit = parts[1];
  const fkField = parts[2];
  const fkId = parts[3];

  let sortField;
  if (fkField === 'customerId') {
    sortField = 'createdAt';
    if (colName === 'quotations') sortField = 'ngayBaoGia';
    if (colName === 'contracts') sortField = 'ngayKy';
    if (colName === 'payments') sortField = 'ngayThanhToan';
    if (colName === 'deliveries') sortField = 'ngayGiaoMay';
  }

  // Check in-memory Data Mesh first (realtimeStore or entityCachePool) for 0ms, 0-read response
  try {
    const realtimeState = realtimeStore.getCollectionState<any>(colName);
    const inMemoryItems = (realtimeState && Array.isArray(realtimeState.data) && realtimeState.data.length > 0)
      ? realtimeState.data
      : entityCachePool.getAll<any>(colName);

    if (inMemoryItems && inMemoryItems.length > 0) {
      let filtered = inMemoryItems;
      if (fkField && fkId) {
        filtered = inMemoryItems.filter((item: any) => item && String(item[fkField]) === String(fkId));
      }
      swrColCacheMap.set(key, filtered);
      return filtered as T[];
    }
  } catch (e) {
    logger.debug('swrColFetcher in-memory mesh check failed', e);
  }

  const maxLimit = sizeLimit ? parseInt(sizeLimit) : 500;
  const repo = repositoryFactory.get<T>(colName);

  const promise = (async () => {
    try {
      const results = await repo.list({
        limit: maxLimit,
        fkField,
        fkId,
        sortField,
        sortDirection: 'desc'
      });
      // Store resolved data into memory cache and L1 entity pool
      swrColCacheMap.set(key, results);
      entityCachePool.setBatch(colName, results as any[]);
      return results;
    } catch (err) {
      swrColCacheMap.delete(key);
      throw err;
    }
  })();

  swrColPromiseCache.set(key, promise);

  // If the request fails, evict from promise cache so we don't cache failures
  promise.catch(() => {
    swrColPromiseCache.delete(key);
    swrColCacheMap.delete(key);
  });

  // Keep the promise cache clean after completion so we can fetch again if evicted from main cache
  promise.finally(() => {
    swrColPromiseCache.delete(key);
  });

  return promise;
};

export const swrApiFetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error('API request failed');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'API request failed');
  return json.data;
};

export const swrDocFetcher = async <T = unknown>(key: string): Promise<T | null> => {
  if (!key) return null;

  // Self-Healing key normalization: automatically normalize 'collection/id' to 'collection:id'
  const normalizedKey = key.includes('/') ? key.replace('/', ':') : key;
  const parts = normalizedKey.split(':');
  const colName = parts[0];
  const docId = parts[1];
  if (!colName || !docId) return null;

  // L0 Layer: Memory cache check (including negative lookups)
  if (swrDocCacheMap.has(normalizedKey)) {
    return swrDocCacheMap.get(normalizedKey) as T | null;
  }

  // L1 Layer 0: Check negative cache
  if (entityCachePool.isNotFound(colName, docId)) {
    swrDocCacheMap.set(normalizedKey, null);
    return null;
  }

  // L1 Layer 1: Check L1 Entity Pool for 0ms, 0-read instant response
  const cachedFromPool = entityCachePool.get<T>(colName, docId);
  if (cachedFromPool) {
    swrDocCacheMap.set(normalizedKey, cachedFromPool);
    return cachedFromPool;
  }

  // L1 Layer 2: Check Realtime Store in-memory collection state
  try {
    const realtimeState = realtimeStore.getCollectionState<any>(colName);
    if (realtimeState && Array.isArray(realtimeState.data) && realtimeState.data.length > 0) {
      const found = realtimeState.data.find(d => d && d.id === docId);
      if (found) {
        entityCachePool.set(colName, found);
        swrDocCacheMap.set(normalizedKey, found);
        return found as T;
      }
    }
  } catch (e) {
    logger.debug('Failed to get collection state from realtimeStore', e);
  }

  // L2 Layer: Promise deduplication to prevent duplicate getDoc calls
  if (swrDocPromiseCache.has(normalizedKey)) {
    return swrDocPromiseCache.get(normalizedKey) as Promise<T | null>;
  }

  const repo = repositoryFactory.get<T>(colName);
  const promise = (async () => {
    try {
      const doc = await repo.getById(docId);
      swrDocCacheMap.set(normalizedKey, doc);
      if (doc) {
        entityCachePool.set(colName, doc as any);
      } else {
        entityCachePool.setNotFound(colName, docId);
      }
      return doc;
    } catch (err) {
      swrDocCacheMap.delete(normalizedKey);
      throw err;
    }
  })();

  swrDocPromiseCache.set(normalizedKey, promise);
  promise.catch(() => {
    swrDocPromiseCache.delete(normalizedKey);
  });
  promise.finally(() => {
    swrDocPromiseCache.delete(normalizedKey);
  });

  return promise;
};
