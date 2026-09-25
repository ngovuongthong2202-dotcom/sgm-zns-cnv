export class TtlCache<K, V> {
  private cache = new Map<K, { value: V; timestamp: number }>();

  constructor(private ttlMs: number) {}

  get(key: K): V | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() - item.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  set(key: K, value: V): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  invalidate(key?: K): void {
    if (key !== undefined) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  size(): number {
    return this.cache.size;
  }
}

export const sharedFieldsCache = new TtlCache<string, unknown>(10 * 60 * 1000);  // 10 minutes
export const userPrefCache    = new TtlCache<string, unknown>(5 * 60 * 1000);    // 5 minutes
export const templateCache    = new TtlCache<string, unknown>(5 * 60 * 1000);    // 5 minutes
export const settingsCache    = new TtlCache<string, unknown>(2 * 60 * 1000);    // 2 minutes
export const globalDataCache  = new TtlCache<string, unknown>(5 * 60 * 1000);    // 5 minutes
