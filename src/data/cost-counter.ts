class SupabaseOperationMonitor {
  private reads = 0;
  private writes = 0;
  private cacheHits = 0;
  private listeners: Set<() => void> = new Set();

  incrementReads(count: number = 1) {
    if (process.env.NODE_ENV !== 'production' && count > 0) {
      this.reads += count;
      this.notify();
    }
  }

  incrementWrites(count: number = 1) {
    if (process.env.NODE_ENV !== 'production' && count > 0) {
      this.writes += count;
      this.notify();
    }
  }

  incrementCacheHits(count: number = 1) {
    if (process.env.NODE_ENV !== 'production' && count > 0) {
      this.cacheHits += count;
      this.notify();
    }
  }

  getStats() {
    return { reads: this.reads, writes: this.writes, cacheHits: this.cacheHits };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
    console.debug(`[Supabase Operations] Reads: ${this.reads}, Writes: ${this.writes}, CacheHits: ${this.cacheHits}`);
  }
}

export const sessionCostCounter = new SupabaseOperationMonitor();
export const supabaseOperationMonitor = sessionCostCounter;

