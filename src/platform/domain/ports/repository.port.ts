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
  /** Đợt 0A – lô 2: nạp lần đầu theo trang (≤ 1000 dòng/trang, giới hạn PostgREST) tới tối đa maxRows dòng. Chỉ các bộ sưu tập lõi dùng. */
  pageSize?: number;
  maxRows?: number;
}

/** Thông tin kèm kết quả nạp theo trang. total = null khi không đếm được (có lọc khóa ngoại hoặc lỗi đếm). */
export interface ListLoadMeta {
  total: number | null;
  capped: boolean;
}

export interface ListAllResult<T> extends ListLoadMeta {
  items: T[];
}

export interface IRepository<T> {
  getById(id: string): Promise<T | null>;
  list(filters?: ListOptions): Promise<T[]>;
  listAll?(filters?: ListOptions, paging?: { pageSize?: number; maxRows?: number }): Promise<ListAllResult<T>>;
  listPaginated(filters?: ListOptions, limit?: number, lastDoc?: unknown): Promise<{ data: T[], lastDoc?: unknown; hasMore?: boolean }>;
  create(data: Partial<T>): Promise<T | string>;
  update(id: string, data: Partial<T>): Promise<T | void>;
  softDelete(id: string): Promise<void>;

  // Realtime subscription
  subscribe(optsOrLimit: number | ListOptions | string, callback: (data: T[] | T, length?: number, meta?: ListLoadMeta) => void, errCb?: (err: Error) => void): () => void;
  subscribeById?(id: string, callback: (data: T | null) => void, errCb?: (err: Error) => void): () => void;
  subscribeList?(filters: ListOptions | Record<string, unknown>, callback: (data: T[]) => void): () => void;
}
