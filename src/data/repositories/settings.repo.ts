import { supabase, isSupabaseConfigured } from '@/src/shared/config/supabase.client';
import { logger } from '@/src/shared/lib/logger';

interface SettingsChannelEntry {
  channel: any;
  refCount: number;
  listeners: Set<(data: any) => void>;
  cachedData?: any;
  cleanupTimer?: ReturnType<typeof setTimeout> | null;
}

const settingsChannelPool = new Map<string, SettingsChannelEntry>();
const memorySettingsCache = new Map<string, any>();

export class SettingsRepository {
  private tableName = 'settings';

  async getSettings<T>(docId: string): Promise<T | null> {
    if (!docId) return null;
    if (memorySettingsCache.has(docId)) {
      return memorySettingsCache.get(docId) as T;
    }
    if (!isSupabaseConfigured) return null;

    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', docId)
        .maybeSingle();

      if (error || !data) return null;
      const res = (data.data || data) as T;
      memorySettingsCache.set(docId, res);
      return res;
    } catch (e) {
      logger.debug(`Error getting settings for ${docId}:`, e);
      return null;
    }
  }

  async setSettings<T>(docId: string, data: Partial<T>, merge = true): Promise<void> {
    if (!docId) return;

    let payloadData = data;
    if (merge) {
      const existing = await this.getSettings<T>(docId);
      payloadData = { ...(existing || {}), ...data };
    }

    memorySettingsCache.set(docId, payloadData);

    // Notify any active pooled listeners immediately (0ms UI feedback)
    const pooled = settingsChannelPool.get(docId);
    if (pooled) {
      pooled.cachedData = payloadData;
      pooled.listeners.forEach(cb => {
        try { cb(payloadData); } catch (e) { logger.debug(e); }
      });
    }

    if (!isSupabaseConfigured) return;

    await supabase.from(this.tableName).upsert({
      id: docId,
      data: payloadData as Record<string, unknown>,
      updated_at: new Date().toISOString()
    });
  }

  subscribeSettings<T>(docId: string, cb: (data: T | null) => void, errCb?: (err: Error) => void): () => void {
    if (!docId) {
      cb(null);
      return () => {};
    }

    let isSubscribed = true;

    // 1. Initial cached or async load
    if (memorySettingsCache.has(docId)) {
      cb(memorySettingsCache.get(docId) as T);
    } else {
      this.getSettings<T>(docId)
        .then(val => {
          if (isSubscribed) cb(val);
        })
        .catch(err => {
          if (isSubscribed && errCb) errCb(err);
        });
    }

    if (!isSupabaseConfigured) {
      return () => { isSubscribed = false; };
    }

    // 2. Shared pooled Realtime Channel (avoids channel churn & WebSocket limits)
    let entry = settingsChannelPool.get(docId);
    if (!entry) {
      const listeners = new Set<(data: any) => void>();
      const channelName = `realtime:settings:${docId}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: this.tableName, filter: `id=eq.${docId}` },
          payload => {
            let nextData: any = null;
            if (payload.eventType !== 'DELETE') {
              const row: any = payload.new;
              nextData = (row?.data || row) as T;
            }
            memorySettingsCache.set(docId, nextData);
            const currentEntry = settingsChannelPool.get(docId);
            if (currentEntry) {
              currentEntry.cachedData = nextData;
              currentEntry.listeners.forEach(fn => {
                try { fn(nextData); } catch (e) { logger.debug(e); }
              });
            }
          }
        )
        .subscribe();

      entry = { channel, refCount: 0, listeners, cleanupTimer: null };
      settingsChannelPool.set(docId, entry);
    }

    if (entry.cleanupTimer) {
      clearTimeout(entry.cleanupTimer);
      entry.cleanupTimer = null;
    }

    entry.refCount++;
    entry.listeners.add(cb);

    return () => {
      isSubscribed = false;
      const cur = settingsChannelPool.get(docId);
      if (!cur) return;
      cur.listeners.delete(cb);
      cur.refCount--;
      if (cur.refCount <= 0) {
        if (cur.cleanupTimer) clearTimeout(cur.cleanupTimer);
        // Hold open for 30s to prevent rapid tab thrashing
        cur.cleanupTimer = setTimeout(() => {
          if (cur.refCount <= 0) {
            try {
              supabase.removeChannel(cur.channel);
            } catch (err) {
              logger.debug(`Error removing settings channel for ${docId}:`, err);
            }
            settingsChannelPool.delete(docId);
          }
        }, 30000);
      }
    };
  }

  async getSystemSettings<T>(docId: string): Promise<T | null> {
    return this.getSettings<T>(docId);
  }

  async setSystemSettings<T>(docId: string, data: Partial<T>, merge = true): Promise<void> {
    return this.setSettings<T>(docId, data, merge);
  }

  subscribeSystemSettings<T>(docId: string, cb: (data: T | null) => void, errCb?: (err: Error) => void): () => void {
    return this.subscribeSettings<T>(docId, cb, errCb);
  }
}

export const settingsRepo = new SettingsRepository();
