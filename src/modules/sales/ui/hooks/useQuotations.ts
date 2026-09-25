import { Customer } from '@/src/domain/schema/customer.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { useMutation } from '@/src/hooks/useMutation';
import { Quotation } from '@/src/domain/schema/quotation.schema';

export function useQuotations(_options?: { loadRelated?: boolean }) {
  const { data: quotations, loading: dataLoading, hasMore, loadMore } = useRealtimeCollection<Quotation>('quotations');
  
  const customers: Customer[] = [];
  const contracts: Contract[] = [];

  const globalLoading = false;

  const { createRecord, updateRecord, deleteRecord, withTransaction } = useMutation<Quotation>({ collection: 'quotations' });

  const refresh = async () => {
    const { realtimeStore } = await import('@/src/data/realtime-store');
    realtimeStore.refresh('quotations');
  };

  return {
    quotations,
    customers,
    contracts,
    loading: dataLoading || globalLoading,
    loadMore,
    hasMore,
    refresh,
    createQuotation: createRecord,
    updateQuotation: updateRecord,
    updateQuotationWithTransaction: withTransaction,
    deleteQuotation: deleteRecord,
  };
}
