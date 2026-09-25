import { useMemo } from 'react';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { notify } from '@/src/shared/utils/notify';
import { getPaymentColumns } from '../columns.config';
import { repositoryFactory } from '@/src/data/repositories/factory';

export function usePaymentsColumns(
  updatePaymentWithTransaction: (id: string, updateFn: (curr: Payment) => Partial<Payment>) => Promise<void>,
  refresh: () => void,
  confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>,
  handleSendZns: (payment: Payment) => Promise<void>,
  contracts: Contract[] = [],
  quotations: Quotation[] = [],
  deliveries: Delivery[] = [],
  customers: Customer[] = []
) {
  return useMemo(() => getPaymentColumns(
    (_payment, _status) => { },
    async (payment, field, value) => {
       try {
         const updates: Partial<Payment> = { [field]: value } as Partial<Payment>;
         if (!payment.soDonHang || !payment.soHopDong) {
            if (payment.contractId) {
              const contract = await repositoryFactory.get<any>('contracts').getById(payment.contractId);
              if (contract) {
                updates.soDonHang = payment.soDonHang || contract.soDonHang || '';
                updates.soHopDong = payment.soHopDong || contract.soHopDong || '';
              }
            } else if (payment.quotationId) {
              const quotation = await repositoryFactory.get<any>('quotations').getById(payment.quotationId);
              if (quotation) {
                updates.soHopDong = payment.soHopDong || (quotation as import('@/src/domain/schema/quotation.schema').Quotation & { soHopDong?: string }).soHopDong || '';
              }
            }
         }
         await updatePaymentWithTransaction(payment.id!, (_current) => {
           return {
             ...updates,
             _lastUpdatedAt: (payment as Payment & { updatedAt?: string }).updatedAt || (payment as Payment & { ngayCapNhat?: string }).ngayCapNhat
           };
         });
         notify.success('Đã cập nhật!');
         refresh();
       } catch (err: unknown) {
         notify.error((err as Error).message || 'Lỗi khi cập nhật!');
       }
    },
    confirm,
    handleSendZns,
    contracts,
    quotations,
    deliveries,
    customers
  ), [updatePaymentWithTransaction, refresh, confirm, handleSendZns, contracts, quotations, deliveries, customers]);
}
