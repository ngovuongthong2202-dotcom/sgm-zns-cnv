class SessionCostCounter {
  private reads = 0;
  private writes = 0;
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

  getStats() {
    return { reads: this.reads, writes: this.writes };
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
    console.debug(`[Firestore Cost] Reads: ${this.reads}, Writes: ${this.writes}`);
  }
}

export const sessionCostCounter = new SessionCostCounter();
