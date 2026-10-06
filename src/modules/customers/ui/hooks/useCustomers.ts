import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { useMutation } from '@/src/hooks/useMutation';
import { Customer } from '../../domain/customer.schema';
import { CreateCustomer } from '../../application/use-cases/CreateCustomer';
import { UpdateCustomer } from '../../application/use-cases/UpdateCustomer';

export function useCustomers(options?: { loadRelated?: boolean }) {
  const loadRelated = options?.loadRelated ?? false;
  
  const { data: customers, loading: customersLoading, hasMore, loadMore } = useRealtimeCollection<Customer>('customers');
  
  // Conditional fetching pattern - only invoke useRealtimeCollection if loadRelated is true
  const qState = useRealtimeCollection<Quotation>(loadRelated ? 'quotations' : 'non-existent-skip');
  const cState = useRealtimeCollection<Contract>(loadRelated ? 'contracts' : 'non-existent-skip');
  const pState = useRealtimeCollection<Payment>(loadRelated ? 'payments' : 'non-existent-skip');
  
  const quotations = loadRelated ? qState.data : [];
  const contracts = loadRelated ? cState.data : [];
  const payments = loadRelated ? pState.data : [];
  
  const loading = customersLoading || (loadRelated && (qState.loading || cState.loading || pState.loading));
  
  const { deleteRecord } = useMutation<Customer>({ collection: 'customers' });

  const createCustomer = async (data: Partial<Customer>) => {
    const saved = await CreateCustomer.execute(data);
    try {
      const { realtimeStore } = await import('@/src/data/realtime-store');
      realtimeStore.mutateOptimistic('customers', 'create', saved);
      const { clearSwrColCache } = await import('@/src/data/swr-fetchers');
      clearSwrColCache('customers');
      const { crossTabSync } = await import('@/src/shared/utils/crossTabSync');
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'customers' });
    } catch (e) {
      // safe fallback
    }
    return saved;
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    await UpdateCustomer.execute(id, updates);
    try {
      const { realtimeStore } = await import('@/src/data/realtime-store');
      realtimeStore.mutateOptimistic('customers', 'update', { id, ...updates });
      const { clearSwrColCache } = await import('@/src/data/swr-fetchers');
      clearSwrColCache('customers');
      const { crossTabSync } = await import('@/src/shared/utils/crossTabSync');
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'customers' });
    } catch (e) {
      // safe fallback
    }
  };

  const refresh = async () => {
    const { realtimeStore } = await import('@/src/data/realtime-store');
    realtimeStore.refresh('customers');
  };

  return {
    customers,
    quotations,
    contracts,
    payments,
    loading: loading,
    loadMore,
    hasMore,
    refresh,
    createCustomer,
    updateCustomer,
    deleteCustomer: deleteRecord,
  };
}

