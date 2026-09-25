/**
 * Enterprise Repository Port (Clean Architecture)
 * Unified interface for Supabase PostgreSQL & Cloud Repositories.
 */
export interface ListOptions {
  limit?: number;
  offset?: number;
  fkField?: string;
  fkId?: string | string[];
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  ignoreDeletedAt?: boolean;
}

export interface IRepository<T> {
  getById(id: string): Promise<T | null>;
  list(filters?: ListOptions): Promise<T[]>;
  listPaginated(filters?: ListOptions, limit?: number, lastDoc?: unknown): Promise<{ data: T[], lastDoc?: unknown; hasMore?: boolean }>;
  create(data: Partial<T>): Promise<T | string>;
  update(id: string, data: Partial<T>): Promise<T | void>;
  softDelete(id: string): Promise<void>;
  
  // Realtime subscription
  subscribe(optsOrLimit: number | ListOptions | string, callback: (data: T[] | T, length?: number) => void, errCb?: (err: Error) => void): () => void;
  subscribeById?(id: string, callback: (data: T | null) => void, errCb?: (err: Error) => void): () => void;
  subscribeList?(filters: ListOptions | Record<string, unknown>, callback: (data: T[]) => void): () => void;
}
