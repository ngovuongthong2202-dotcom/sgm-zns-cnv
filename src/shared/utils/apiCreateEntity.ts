import { realtimeStore } from '@/src/data/realtime-store';
import { clearSwrColCache } from '@/src/data/swr-fetchers';

export async function apiCreateEntity(entityType: string, data: any) {
  const res = await fetch(`/api/workflow/create/${entityType}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error || `HTTP ${res.status}`);
  }

  const finalId = json.id || data.id;
  const colMap: Record<string, string> = {
    payment: 'payments',
    contract: 'contracts',
    delivery: 'deliveries',
    quotation: 'quotations',
    customer: 'customers'
  };
  const colName = colMap[entityType] || entityType;

  if (finalId) {
    const itemData = { ...data, id: finalId };
    realtimeStore.mutateOptimistic(colName, 'create', itemData);
    try {
      clearSwrColCache(colName);
    } catch {
      // Ignore cache clearing error
    }
    realtimeStore.refresh(colName);
  }

  return json;
}

export async function apiDeleteEntity(entityType: string, id: string, userId?: string) {
  const res = await fetch(`/api/workflow/delete/${entityType}/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: userId || 'system' })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json.error || `HTTP ${res.status}`);
    (err as any).blockingDocuments = json.blockingDocuments;
    (err as any).detailedBlocks = json.detailedBlocks;
    throw err;
  }
  return json;
}

