import { repositoryFactory } from '@/src/data/repositories/factory';

export const prefetchCache = new Map<string, { data: unknown[]; timestamp: number }>();

const ongoingPrefetches = new Set<string>();

export async function prefetchCollection(collectionName: string, pageSize: number = 100): Promise<unknown[]> {
  const cacheKey = `${collectionName}:${pageSize}`;
  
  if (prefetchCache.has(cacheKey)) {
    const cached = prefetchCache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < 120000) { // Valid for 2 minutes
      return cached.data;
    }
  }

  if (ongoingPrefetches.has(cacheKey)) {
    return [];
  }

  ongoingPrefetches.add(cacheKey);
  try {
    const results = await repositoryFactory.get<Record<string, unknown>>(collectionName).list({ limit: pageSize });
    const activeResults = results.filter((d: Record<string, unknown>) => !d.deletedAt);
      
    prefetchCache.set(cacheKey, {
      data: activeResults,
      timestamp: Date.now()
    });
    return activeResults;
  } catch (error) {
    console.error(`[Prefetch] Lỗi tải trước ${collectionName}:`, error);
    return [];
  } finally {
    ongoingPrefetches.delete(cacheKey);
  }
}
