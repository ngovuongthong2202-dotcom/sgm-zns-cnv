// Singleton L1 Normalized Entity Pool for 0ms Enterprise Reactive Cache
import { logger } from '@/src/shared/lib/logger';

export const ENTITY_NOT_FOUND = Symbol('ENTITY_NOT_FOUND');

class EntityCachePool {
  private pool = new Map<string, Map<string, any>>();
  private listeners = new Set<() => void>();

  private getCollectionMap(collectionName: string): Map<string, any> {
    let colMap = this.pool.get(collectionName);
    if (!colMap) {
      colMap = new Map<string, any>();
      this.pool.set(collectionName, colMap);
    }
    return colMap;
  }

  has(collectionName: string, id: string): boolean {
    if (!collectionName || !id) return false;
    const colMap = this.pool.get(collectionName);
    return !!colMap && colMap.has(id);
  }

  isNotFound(collectionName: string, id: string): boolean {
    if (!collectionName || !id) return false;
    const colMap = this.pool.get(collectionName);
    return !!colMap && colMap.get(id) === ENTITY_NOT_FOUND;
  }

  get<T = any>(collectionName: string, id: string): T | null {
    if (!collectionName || !id) return null;
    const colMap = this.pool.get(collectionName);
    if (!colMap) return null;
    const val = colMap.get(id);
    if (val === ENTITY_NOT_FOUND) return null;
    return (val as T) || null;
  }

  set<T extends { id?: string }>(collectionName: string, doc: T): void {
    if (!collectionName || !doc || !doc.id) return;
    const colMap = this.getCollectionMap(collectionName);
    colMap.set(doc.id, doc);
    this.notify();
  }

  setNotFound(collectionName: string, id: string): void {
    if (!collectionName || !id) return;
    const colMap = this.getCollectionMap(collectionName);
    colMap.set(id, ENTITY_NOT_FOUND);
  }

  setBatch<T extends { id?: string }>(collectionName: string, docs: T[]): void {
    if (!collectionName || !Array.isArray(docs)) return;
    const colMap = this.getCollectionMap(collectionName);
    let changed = false;
    for (const doc of docs) {
      if (doc && doc.id) {
        colMap.set(doc.id, doc);
        changed = true;
      }
    }
    if (changed) {
      this.notify();
    }
  }

  remove(collectionName: string, id: string): void {
    if (!collectionName || !id) return;
    const colMap = this.pool.get(collectionName);
    if (colMap && colMap.delete(id)) {
      this.notify();
    }
  }

  clear(collectionName?: string): void {
    if (collectionName) {
      this.pool.delete(collectionName);
    } else {
      this.pool.clear();
    }
    this.notify();
  }

  find<T = any>(collectionName: string, predicate: (item: T) => boolean): T | null {
    const colMap = this.pool.get(collectionName);
    if (!colMap) return null;
    for (const item of colMap.values()) {
      if (item === ENTITY_NOT_FOUND) continue;
      try {
        if (predicate(item)) return item;
      } catch (e) {
        logger.debug('Error in entity predicate', e);
      }
    }
    return null;
  }

  filter<T = any>(collectionName: string, predicate: (item: T) => boolean): T[] {
    const colMap = this.pool.get(collectionName);
    if (!colMap) return [];
    const results: T[] = [];
    for (const item of colMap.values()) {
      if (item === ENTITY_NOT_FOUND) continue;
      try {
        if (predicate(item)) results.push(item);
      } catch (e) {
        logger.debug('Error in entity filter predicate', e);
      }
    }
    return results;
  }

  getAll<T = any>(collectionName: string): T[] {
    const colMap = this.pool.get(collectionName);
    if (!colMap) return [];
    return Array.from(colMap.values()).filter(v => v !== ENTITY_NOT_FOUND);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (e) {
        logger.error('Error notifying entity pool listener', e);
      }
    }
  }
}

export const entityCachePool = new EntityCachePool();
