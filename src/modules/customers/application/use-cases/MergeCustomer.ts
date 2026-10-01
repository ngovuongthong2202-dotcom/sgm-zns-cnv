import { CustomerMerged } from '../../domain/events';
import { eventBus } from '@/src/platform/events/EventBus';

export class MergeCustomer {
  static async execute(targetId: string, sourceIds: string[], userEmail?: string): Promise<{ auditLogId?: string }> {
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

    return { auditLogId: data.auditLogId };
  }

  static async rollback(auditLogId: string, userEmail?: string): Promise<string> {
    const res = await fetch('/api/customers/rollback-merge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auditLogId, userEmail })
    });
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Lỗi hoàn tác gộp khách hàng');
    }
    return data.message || 'Đã hoàn tác thành công';
  }

  static async getMergeHistory(): Promise<any[]> {
    const res = await fetch('/api/customers/merge-history');
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Không thể lấy lịch sử gộp');
    }
    return data.history || [];
  }
}
