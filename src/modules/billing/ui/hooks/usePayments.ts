import { Customer } from '@/src/domain/schema/customer.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { useMutation } from '@/src/hooks/useMutation';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';

const EMPTY_CONTRACTS: Contract[] = [];
const EMPTY_QUOTATIONS: Quotation[] = [];
const EMPTY_CUSTOMERS: Customer[] = [];
const EMPTY_DELIVERIES: Delivery[] = [];

export function usePayments(options?: { loadRelated?: boolean }) {
  const loadRelated = options?.loadRelated ?? false;

  const { data: payments, loading: loadingP, hasMore, loadMore } = useRealtimeCollection<Payment>('payments');
  
  const cState = useRealtimeCollection<Contract>(loadRelated ? 'contracts' : 'non-existent-skip');
  const qState = useRealtimeCollection<Quotation>(loadRelated ? 'quotations' : 'non-existent-skip');
  const cusState = useRealtimeCollection<Customer>(loadRelated ? 'customers' : 'non-existent-skip');
  const dState = useRealtimeCollection<Delivery>(loadRelated ? 'deliveries' : 'non-existent-skip');
  
  const contracts = loadRelated ? cState.data : EMPTY_CONTRACTS;
  const quotations = loadRelated ? qState.data : EMPTY_QUOTATIONS;
  const customers = loadRelated ? cusState.data : EMPTY_CUSTOMERS;
  const deliveries = loadRelated ? dState.data : EMPTY_DELIVERIES;
  
  const loading = loadingP || (loadRelated && (cState.loading || qState.loading || cusState.loading || dState.loading));

  const { createRecord, updateRecord, deleteRecord, withTransaction } = useMutation<Payment>({ collection: 'payments' });

  const refresh = async () => {
    const { realtimeStore } = await import('@/src/data/realtime-store');
    realtimeStore.refresh('payments');
  };

  return {
    payments,
    contracts,
    quotations,
    customers,
    deliveries,
    loading,
    loadMore,
    hasMore,
    refresh,
    createPayment: createRecord,
    updatePayment: updateRecord,
    updatePaymentWithTransaction: withTransaction,
    deletePayment: deleteRecord,
  };
}
