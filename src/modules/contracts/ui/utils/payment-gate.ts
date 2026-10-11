import { notify } from '@/src/shared/utils/notify';
import { checkWorkflowGate } from '@/src/domain/workflow-ui';
import { getLinkedPaymentsForContract } from '@/src/domain/services/financial-reconciler';
import type { Payment } from '@/src/domain/schema/payment.schema';

/**
 * Đợt 0A (TT04): một đường duy nhất cho "tạo phiếu thu từ hợp đồng" — ngăn chi tiết và nút trên dòng danh sách
 * đều phải qua luật một phiếu/hợp đồng và chốt quy trình (trước đây nút trên dòng bỏ qua cả hai).
 * `payments` là `Payment[]` thật (financial-reconciler.ts:51-54 nhận `Payment[]`; hai nơi gọi đều truyền `realtimePayments`).
 */
export async function gateCreatePaymentForContract(contract: { id?: string; soHopDong?: string }, payments: Payment[], userEmail?: string): Promise<boolean> {
  const existing = getLinkedPaymentsForContract(contract as any, payments || [])[0];
  if (existing) {
    notify.info(`Hợp đồng ${contract.soHopDong} đã có phiếu thanh toán (${existing.paymentId}). Mỗi hợp đồng chỉ tạo 1 phiếu thu duy nhất!`);
    return false;
  }
  return checkWorkflowGate('PAYMENT', contract.id as string, 'contracts', userEmail || undefined);
}
