export interface CrossTabEvent {
  type: 'ENTITY_MUTATED' | 'ENTITY_DELETED' | 'COLLECTION_REFRESH';
  collectionName: string;
  id?: string;
  senderTabId: string;
  timestamp: number;
}

const currentTabId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
  ? crypto.randomUUID()
  : Math.random().toString(36).substring(2, 15);

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel('sgm_cross_tab_sync');
  }
} catch {
  // Graceful fallback if BroadcastChannel is restricted by browser security policies
  channel = null;
}

export const crossTabSync = {
  getTabId(): string {
    return currentTabId;
  },

  broadcast(event: Omit<CrossTabEvent, 'senderTabId' | 'timestamp'>) {
    if (!channel) return;
    try {
      channel.postMessage({
        ...event,
        senderTabId: currentTabId,
        timestamp: Date.now()
      });
    } catch {
      // Ignore broadcast errors
    }
  },

  subscribe(callback: (event: CrossTabEvent) => void): () => void {
    if (!channel) return () => {};
    const handler = (e: MessageEvent<CrossTabEvent>) => {
      if (e.data && e.data.senderTabId !== currentTabId) {
        callback(e.data);
      }
    };
    channel.addEventListener('message', handler);
    return () => {
      if (channel) channel.removeEventListener('message', handler);
    };
  }
};
