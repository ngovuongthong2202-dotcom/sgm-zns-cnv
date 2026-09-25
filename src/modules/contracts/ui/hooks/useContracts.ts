import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { useMutation } from '@/src/hooks/useMutation';
import { Contract } from '@/src/domain/schema/contract.schema';

export function useContracts(options?: { loadRelated?: boolean }) {
  const loadRelated = options?.loadRelated ?? false;

  const { data: contracts, loading: contractsLoading, hasMore, loadMore } = useRealtimeCollection<Contract>('contracts');
  
  const qState = useRealtimeCollection<Quotation>(loadRelated ? 'quotations' : 'non-existent-skip');
  const dState = useRealtimeCollection<Delivery>(loadRelated ? 'deliveries' : 'non-existent-skip');
  const pState = useRealtimeCollection<Payment>(loadRelated ? 'payments' : 'non-existent-skip');
  const cState = useRealtimeCollection<Customer>(loadRelated ? 'customers' : 'non-existent-skip');
  
  const quotations = loadRelated ? qState.data : [];
  const deliveries = loadRelated ? dState.data : [];
  const payments = loadRelated ? pState.data : [];
  const customers = loadRelated ? cState.data : [];
  
  const loading = contractsLoading || (loadRelated && (qState.loading || dState.loading || pState.loading || cState.loading));
  
  const { createRecord, updateRecord, deleteRecord, softDeleteRecord, restoreRecord, withTransaction } = useMutation<Contract>({ collection: 'contracts' });

  const dummyRefresh = async () => {};

  return {
    contracts,
    quotations,
    deliveries,
    payments,
    customers,
    loading,
    loadMore,
    hasMore,
    refresh: dummyRefresh,
    createContract: createRecord,
    updateContract: updateRecord,
    updateContractWithTransaction: withTransaction,
    deleteContract: deleteRecord,
    softDeleteContract: softDeleteRecord,
    restoreContract: restoreRecord,
  };
}

