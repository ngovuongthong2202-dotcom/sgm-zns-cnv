import { Customer } from '@/src/domain/schema/customer.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { useMutation } from '@/src/hooks/useMutation';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';

const EMPTY_CUSTOMERS: Customer[] = [];
const EMPTY_QUOTATIONS: Quotation[] = [];
const EMPTY_PAYMENTS: Payment[] = [];
const EMPTY_CONTRACTS: Contract[] = [];

export function useDeliveries(options?: { loadRelated?: boolean }) {
  const loadRelated = options?.loadRelated ?? false;

  const { data: deliveries, loading: loadingD, hasMore, loadMore } = useRealtimeCollection<Delivery>('deliveries');
  
  const cusState = useRealtimeCollection<Customer>(loadRelated ? 'customers' : 'non-existent-skip');
  const qState = useRealtimeCollection<Quotation>(loadRelated ? 'quotations' : 'non-existent-skip');
  const pState = useRealtimeCollection<Payment>(loadRelated ? 'payments' : 'non-existent-skip');
  const cState = useRealtimeCollection<Contract>(loadRelated ? 'contracts' : 'non-existent-skip');
  
  const customers = loadRelated ? cusState.data : EMPTY_CUSTOMERS;
  const quotations: Quotation[] = loadRelated ? qState.data : EMPTY_QUOTATIONS;
  const payments: Payment[] = loadRelated ? pState.data : EMPTY_PAYMENTS;
  const contracts: Contract[] = loadRelated ? cState.data : EMPTY_CONTRACTS;
  
  const { createRecord, updateRecord, deleteRecord } = useMutation<Delivery>({ collection: 'deliveries' });
  const { updateRecord: updateContract } = useMutation<Contract>({ collection: 'contracts' });
  const { updateRecord: updateQuotation } = useMutation<Quotation>({ collection: 'quotations' });

  const dummyRefresh = async () => {};

  return {
    deliveries,
    payments,
    contracts,
    quotations,
    customers,
    loading: loadingD || (loadRelated && (cusState.loading || qState.loading || pState.loading || cState.loading)),
    loadMore,
    hasMore,
    refresh: dummyRefresh,
    createDelivery: createRecord,
    updateDelivery: updateRecord,
    deleteDelivery: deleteRecord,
    updateContract,
    updateQuotation,
  };
}
