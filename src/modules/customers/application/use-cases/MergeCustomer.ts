import { CustomerMerged } from '../../domain/events';
import { eventBus } from '@/src/platform/events/EventBus';

export class MergeCustomer {
  static async execute(targetId: string, sourceIds: string[], userEmail?: string): Promise<void> {
    const res = await fetch('/api/customers/merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCustomerId: targetId, sourceCustomerIds: sourceIds, userEmail })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Lỗi gộp khách hàng');
    }

    sourceIds.forEach(sourceId => {
      eventBus.publish(new CustomerMerged(sourceId, targetId));
    });
  }
}
