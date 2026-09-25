import { useState, useRef } from 'react';

import { repositoryFactory } from '@/src/data/repositories';
import { useAuth } from '@/src/modules/iam';
import { useConfirm, OptimisticConflictError } from '@/src/design-system';
import { mutate as globalMutate } from 'swr';
import { clearSwrColCache } from '@/src/data/swr-fetchers';
import { logger } from '@/src/shared/lib/logger';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { realtimeStore } from '@/src/data/realtime-store';

const removeUndefined = <U>(obj: U): U => {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as U;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, removeUndefined(v)])) as U;
  }
  return obj;
};

interface UseMutationOptions<T> {
  collection: string;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export function useMutation<T>({ collection: collectionName, onSuccess, onError }: UseMutationOptions<T>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth(); // getting current user for audit logs
  const { confirm } = useConfirm();
  const isMutatingRef = useRef(false); // Fix duplicate clicks

  const createRecord = async (data: Partial<T>): Promise<T> => { 
    if (isMutatingRef.current) throw new Error('Yêu cầu đang được xử lý, vui lòng chờ.');
    setLoading(true);
    setError(null);
    isMutatingRef.current = true;
    try {
      if (!user) throw new Error('Unauthenticated');
      const repo = repositoryFactory.get<T>(collectionName);
      // Generate ID immediately to support optimistic UI (0ms latency return)
      let finalId = repo.generateId();
      const nowStr = new Date().toISOString();
      const extraPayload: Record<string, unknown> = { createdAt: nowStr, createdBy: user.uid };
      if (collectionName === 'customers') {
        extraPayload.ngayCapNhat = nowStr;
      }
      const payload = removeUndefined({ ...data, ...extraPayload });
      
      // ...

      const response = await fetch(`/api/workflow/create/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { ...payload, id: finalId }, userId: user.uid, requestId: finalId })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Lỗi tạo mới (Backend). HTTP ${response.status}`);
      }
      const b = await response.json();
      if (b.id) finalId = b.id;
      
      const responseData = { id: finalId, ...(payload as object) };

      // Optimistically resolve UI state
      onSuccess?.((responseData as unknown) as T); 
      setLoading(false);
      realtimeStore.mutateOptimistic(collectionName, 'create', responseData);

      try {
        clearSwrColCache(collectionName);
        let customerIdToInvalidate: string | null = null;
        if (collectionName === 'customers') {
          customerIdToInvalidate = finalId;
        } else if (payload && typeof payload === 'object' && 'customerId' in payload) {
          customerIdToInvalidate = (payload as any).customerId;
        }
        if (customerIdToInvalidate) {
          globalMutate(`/api/metrics/customer-summary?customerId=${customerIdToInvalidate}`);
        }
      } catch (e) {
        logger.debug('Failed to invalidate SWR cache in createRecord', e);
      }

      fetch('/api/reports/flush', { method: 'POST' }).finally(() => { globalMutate('/api/analytics/today'); });

      return (responseData as unknown) as T;
    } catch (err: unknown) { 
      // Handle Network Offline Queueing
      if (!navigator.onLine || (err instanceof TypeError && typeof err.message === 'string' && err.message.toLowerCase().includes('fetch'))) {
        const repo = repositoryFactory.get<T>(collectionName);
        const offlineRepo = repositoryFactory.get<Record<string, unknown>>('offlinePendingMutations');
        
        const offlineId = repo.generateId();
        const nowStr = new Date().toISOString();
        const extraPayload: Record<string, unknown> = { createdAt: nowStr, createdBy: user?.uid };
        if (collectionName === 'customers') extraPayload.ngayCapNhat = nowStr;
        const payload = removeUndefined({ ...data, ...extraPayload });
        
        await offlineRepo.set(`create_${collectionName}_${Date.now()}_${Math.random().toString(36).substring(7)}`, {
          operation: 'CREATE',
          collection: collectionName,
          entityId: offlineId,
          payload: removeUndefined({ ...data, ...extraPayload, id: offlineId }),
          userId: user?.uid,
          createdAt: nowStr,
          status: 'PENDING'
        });

        const responseData = { id: offlineId, ...(payload as object) };
        onSuccess?.((responseData as unknown) as T);
        setLoading(false);
        return (responseData as unknown) as T;
      }

      setError(err instanceof Error ? err : new Error(String(err)));
      onError?.(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      throw err;
    } finally {
      isMutatingRef.current = false;
    }
  };

  const updateRecord = async (id: string, data: Partial<T> & { _lastUpdatedAt?: string }, options: { force?: boolean } = {}): Promise<void> => {
    setLoading(true);
    setError(null);
    let beforeUpdatedAt: string | undefined = undefined;
    try {
      if (!user) throw new Error('Unauthenticated');
      const repo = repositoryFactory.get<T>(collectionName);
      const beforeData = await repo.getById(id) as Record<string, unknown>;
      beforeUpdatedAt = (beforeData?.updatedAt as string | undefined) || (beforeData?.ngayCapNhat as string | undefined);

      if (!options.force && data._lastUpdatedAt && beforeUpdatedAt && data._lastUpdatedAt !== beforeUpdatedAt) {
        const doOverwrite = await confirm({
          title: 'Dữ liệu đã thay đổi',
          message: `Bản ghi đã thay đổi bởi user khác lúc ${new Date(beforeUpdatedAt).toLocaleTimeString()}. Bạn có muốn xem và Ghi đè không? (Nếu Hủy, form sẽ không lưu và bạn cần tải lại trang để thấy dữ liệu mới)`,
          confirmText: 'Ghi đè luôn',
          cancelText: 'Hủy'
        });

        if (!doOverwrite) {
          throw new OptimisticConflictError(beforeData);
        }
      }

      const lastKnownVal = options.force ? null : (data._lastUpdatedAt || null);

      const rawUpdatePayload = {
        ...data,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
        lastKnownUpdatedAt: lastKnownVal
      };
      
      if (collectionName === 'customers' || (beforeData && 'ngayCapNhat' in beforeData)) {
        (rawUpdatePayload as Record<string, unknown>).ngayCapNhat = rawUpdatePayload.updatedAt;
      }
      
      delete rawUpdatePayload._lastUpdatedAt;
      
      const updatePayload = removeUndefined(rawUpdatePayload) as Record<string, unknown>;
      
      const response = await fetch(`/api/workflow/update/${collectionName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatePayload, userId: user.uid })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const rawErr = body.error || body.message || `Lỗi cập nhật (Backend). HTTP ${response.status}`;
        const errorMsg = typeof rawErr === 'string' ? rawErr : (rawErr.message || rawErr.details || JSON.stringify(rawErr));
        throw new Error(errorMsg);
      }
      
      if (collectionName === 'customers') {
        const syncJobPayload: Record<string, unknown> = {
           customerId: id,
           status: 'PENDING',
           createdAt: rawUpdatePayload.updatedAt
        };
        if (updatePayload.tenKhachHang !== undefined) syncJobPayload.tenKhachHang = updatePayload.tenKhachHang;
        if (updatePayload.sdt !== undefined) syncJobPayload.sdt = updatePayload.sdt;
        if (updatePayload.nguoiPhuTrach !== undefined) syncJobPayload.nguoiPhuTrach = updatePayload.nguoiPhuTrach;
        if (updatePayload.nguoiDaiDien !== undefined) syncJobPayload.nguoiDaiDien = updatePayload.nguoiDaiDien;
        if (updatePayload.maKh !== undefined) syncJobPayload.maKh = updatePayload.maKh;

        if (Object.keys(syncJobPayload).length > 3) {
           const jobRepo = repositoryFactory.get<Record<string, unknown>>('crossEntitySyncJobs');
           await jobRepo.set(`${id}_${Date.now()}`, syncJobPayload);
           fetch('/api/customers/trigger-sync', { method: 'POST' }).catch((e) => {
             logger.debug('Trigger customer sync failed silently', e);
           });
        }
      }

      // Optimistically resolve UI state
      onSuccess?.((updatePayload as unknown) as T); 
      setLoading(false);
      realtimeStore.mutateOptimistic(collectionName, 'update', { id, ...updatePayload });

      try {
        clearSwrColCache(collectionName);
        let customerIdToInvalidate: string | null = null;
        if (collectionName === 'customers') {
          customerIdToInvalidate = id;
        } else if (updatePayload && typeof updatePayload === 'object' && 'customerId' in updatePayload) {
          customerIdToInvalidate = (updatePayload as any).customerId;
        } else if (beforeData && typeof beforeData === 'object' && 'customerId' in beforeData) {
          customerIdToInvalidate = (beforeData as any).customerId;
        }
        if (customerIdToInvalidate) {
          globalMutate(`/api/metrics/customer-summary?customerId=${customerIdToInvalidate}`);
        }
      } catch (e) {
        logger.debug('Failed to invalidate SWR cache in updateRecord', e);
      }

      fetch('/api/reports/flush', { method: 'POST' }).finally(() => { globalMutate('/api/analytics/today'); });
      
    } catch (err: unknown) { 
      // Handle Network Offline Queueing
      if (!navigator.onLine || (err instanceof TypeError && typeof err.message === 'string' && err.message.toLowerCase().includes('fetch'))) {
        const lastKnownVal = options.force ? null : (data._lastUpdatedAt || beforeUpdatedAt || null);
        const rawUpdatePayload = {
          ...data,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid,
          lastKnownUpdatedAt: lastKnownVal
        };
        if (collectionName === 'customers' || 'ngayCapNhat' in (data as Record<string, unknown>)) {
          (rawUpdatePayload as Record<string, unknown>).ngayCapNhat = rawUpdatePayload.updatedAt;
        }
        delete rawUpdatePayload._lastUpdatedAt;
        const updatePayload = removeUndefined(rawUpdatePayload) as Record<string, unknown>;

        const offlineRepo = repositoryFactory.get<Record<string, unknown>>('offlinePendingMutations');
        await offlineRepo.set(`update_${collectionName}_${id}_${Date.now()}`, {
          operation: 'UPDATE',
          collection: collectionName,
          entityId: id,
          payload: updatePayload,
          userId: user?.uid,
          createdAt: new Date().toISOString(),
          status: 'PENDING'
        });

        onSuccess?.((updatePayload as unknown) as T);
        setLoading(false);
        return;
      }

      setLoading(false);
      const code = (err as {code?: string})?.[`code`];  // Firestore error code
      let friendly = (err as Error).message || String(err);
      
      if (code === 'permission-denied') {
        if (data._lastUpdatedAt && beforeUpdatedAt && data._lastUpdatedAt !== beforeUpdatedAt) {
          friendly = 'XUNG ĐỘT ĐỒNG THỜI (Concurrency Conflict): Dữ liệu này đã thay đổi trên hệ thống bởi một người dùng khác. Vui lòng reload trang để tải phiên bản mới nhất, tránh ghi đè dữ liệu sai lệch.';
        } else {
          friendly = 'Bạn không có quyền thao tác bản ghi này. Có thể do data thiếu trường bắt buộc, hoặc Firestore rules chặn. Liên hệ admin.';
        }
      } else if (code === 'unavailable' || friendly.includes('Failed to fetch')) {
        friendly = 'Mất kết nối mạng hoặc máy chủ không phản hồi. Vui lòng kiểm tra lại đường truyền.';
      } else if (code === 'not-found') {
        friendly = 'Bản ghi không tồn tại (có thể đã bị xóa). Reload để cập nhật.';
      }
      
      const wrappedErr = new Error(friendly);
      (wrappedErr as Error & { originalCode?: string }).originalCode = code;
      setError(wrappedErr);
      onError?.(wrappedErr);
      throw wrappedErr;
    }
  };

  const deleteRecord = async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Unauthenticated');
      
      const response = await fetch(`/api/workflow/delete/${collectionName}/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const err = new Error(body.error || `Lỗi xóa (Backend). HTTP ${response.status}`);
        (err as any).blockingDocuments = body.blockingDocuments;
        (err as any).detailedBlocks = body.detailedBlocks;
        throw err;
      }
      
      // Optimistically resolve UI state
      onSuccess?.(({} as unknown) as T); 
      setLoading(false);
      realtimeStore.mutateOptimistic(collectionName, 'delete', id);
      crossTabSync.broadcast({ type: 'ENTITY_DELETED', collectionName, id });

      try {
        clearSwrColCache(collectionName);
        if (collectionName === 'customers') {
          globalMutate(`/api/metrics/customer-summary?customerId=${id}`);
        } else {
          globalMutate(key => typeof key === 'string' && key.startsWith('/api/metrics/customer-summary'), undefined, { revalidate: true });
        }
      } catch (e) {
        logger.debug('Failed to invalidate SWR cache in deleteRecord', e);
      }

      fetch('/api/reports/flush', { method: 'POST' }).finally(() => { globalMutate('/api/analytics/today'); });

    } catch (err: unknown) { 
      // Handle Network Offline Queueing
      if (!navigator.onLine || (err instanceof TypeError && typeof err.message === 'string' && err.message.toLowerCase().includes('fetch'))) {
        const offlineRepo = repositoryFactory.get<Record<string, unknown>>('offlinePendingMutations');
        await offlineRepo.set(`delete_${collectionName}_${id}_${Date.now()}`, {
          operation: 'DELETE',
          collection: collectionName,
          entityId: id,
          userId: user?.uid,
          createdAt: new Date().toISOString(),
          status: 'PENDING'
        });

        onSuccess?.(({} as unknown) as T);
        setLoading(false);
        return;
      }

      setError(err instanceof Error ? err : new Error(String(err)));
      onError?.(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
      throw err;
    }
  };

  const softDeleteRecord = async (id: string): Promise<void> => {
    return updateRecord(id, { deletedAt: new Date().toISOString(), deletedBy: user?.uid } as unknown as Partial<T>, { force: true });
  };

  const restoreRecord = async (id: string): Promise<void> => {
    return updateRecord(id, { deletedAt: null, deletedBy: null } as unknown as Partial<T>, { force: true });
  };

  const withTransaction = async (id: string, updateFn: (currentData: T | null) => Partial<T> & { _lastUpdatedAt?: string }): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      if (!user) throw new Error('Unauthenticated');
      const repo = repositoryFactory.get<T>(collectionName);

      const currentData = await repo.getById(id);
      const beforeUpdatedAt = (currentData as Record<string, unknown>)?.updatedAt || (currentData as Record<string, unknown>)?.ngayCapNhat;

      const updateData = updateFn(currentData);

      if (updateData._lastUpdatedAt && beforeUpdatedAt && updateData._lastUpdatedAt !== beforeUpdatedAt) {
        throw new OptimisticConflictError(currentData);
      }

      const rawUpdatePayload = {
        ...updateData,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
        lastKnownUpdatedAt: beforeUpdatedAt
      };

      if (collectionName === 'customers' || (currentData && 'ngayCapNhat' in (currentData as Record<string, unknown>))) {
        (rawUpdatePayload as Record<string, unknown>).ngayCapNhat = rawUpdatePayload.updatedAt;
      }

      delete rawUpdatePayload._lastUpdatedAt;
      const updatePayload = removeUndefined(rawUpdatePayload) as Record<string, unknown>;

      const response = await fetch(`/api/workflow/update/${collectionName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatePayload, userId: user.uid })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const rawErr = body.error || body.message || `Lỗi cập nhật (Backend). HTTP ${response.status}`;
        const errorMsg = typeof rawErr === 'string' ? rawErr : (rawErr.message || rawErr.details || JSON.stringify(rawErr));
        throw new Error(errorMsg);
      }
      
      try {
        clearSwrColCache(collectionName);
        let customerIdToInvalidate: string | null = null;
        if (collectionName === 'customers') {
          customerIdToInvalidate = id;
        } else if (updatePayload && typeof updatePayload === 'object' && 'customerId' in updatePayload) {
          customerIdToInvalidate = (updatePayload as any).customerId;
        } else if (currentData && typeof currentData === 'object' && 'customerId' in currentData) {
          customerIdToInvalidate = (currentData as any).customerId;
        }
        if (customerIdToInvalidate) {
          globalMutate(`/api/metrics/customer-summary?customerId=${customerIdToInvalidate}`);
        }
      } catch (e) {
        logger.debug('Failed to invalidate SWR cache in withTransaction', e);
      }

      fetch('/api/reports/flush', { method: 'POST' }).finally(() => { globalMutate('/api/analytics/today'); });
      
      onSuccess?.((updatePayload as unknown) as T);
      setLoading(false);
    } catch (err: unknown) {
      // Handle Network Offline Queueing
      if (!navigator.onLine || (err instanceof TypeError && typeof err.message === 'string' && err.message.toLowerCase().includes('fetch'))) {
        const updateData = updateFn(null); // Assuming worst case no existing data locally available or rely on params if we could
        const updatePayload = removeUndefined({ ...updateData }) as Record<string, unknown>;
        delete updatePayload._lastUpdatedAt;

        const offlineRepo = repositoryFactory.get<Record<string, unknown>>('offlinePendingMutations');
        await offlineRepo.set(`update_tx_${collectionName}_${id}_${Date.now()}`, {
          operation: 'UPDATE',
          collection: collectionName,
          entityId: id,
          payload: updatePayload,
          userId: user?.uid,
          createdAt: new Date().toISOString(),
          status: 'PENDING'
        });

        onSuccess?.((updatePayload as unknown) as T);
        setLoading(false);
        return;
      }

      setLoading(false);
      let friendly = (err as Error).message || String(err);
      if (err instanceof OptimisticConflictError || (err instanceof Error ? err.message : String(err)) === 'CONCURRENCY_CONFLICT') {
        friendly = 'XUNG ĐỘT ĐỒNG THỜI (Concurrency Conflict): Dữ liệu này đã thay đổi trên hệ thống bởi một người dùng khác. Vui lòng reload trang để tải phiên bản mới nhất, tránh ghi đè dữ liệu sai lệch.';
      } else if (err && typeof err === 'object' && 'code' in err && (err as { code: unknown }).code === 'permission-denied') {
        friendly = 'Bạn không có quyền thao tác bản ghi này (Database security rules).';
      } else if (err && typeof err === 'object' && 'code' in err && (err as {code?: string}).code === 'unavailable' || friendly.includes('Failed to fetch')) {
        friendly = 'Mất kết nối mạng hoặc máy chủ không phản hồi. Vui lòng kiểm tra lại đường truyền.';
      }
      const wrappedErr = new Error(friendly);
      setError(wrappedErr);
      onError?.(wrappedErr);
      throw wrappedErr;
    }
  };

  return { createRecord, updateRecord, deleteRecord, softDeleteRecord, restoreRecord, withTransaction, loading, error };
}
