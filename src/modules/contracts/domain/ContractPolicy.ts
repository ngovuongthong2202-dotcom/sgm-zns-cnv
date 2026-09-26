import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

export function canCreateContract(quotation: Quotation | undefined | null): { allowed: boolean; reason?: string } {
  if (!quotation) return { allowed: false, reason: "Không tìm thấy báo giá." };
  return { allowed: true };
}

export interface ContractBlockingDocumentItem {
  type: 'quotation' | 'contract' | 'payment' | 'delivery';
  id: string;
  code: string;
  label: string;
  date?: string;
  amount?: number;
  status?: string;
}

export function checkContractLock(
  oldContract: Contract,
  payments: Payment[],
  deliveries: Delivery[]
): { locked: boolean; reason?: string; blockingDocuments?: string[]; detailedBlocks?: ContractBlockingDocumentItem[] } {
  const cId = oldContract.id;
  const cCode = oldContract.soHopDong;

  const linkedPayments = (payments || []).filter(p => {
    const pRec = p as unknown as Record<string, unknown>;
    return !pRec.deletedAt && ((cId && p.contractId === cId) || (cCode && pRec.soHopDong === cCode));
  });
  const linkedDeliveries = (deliveries || []).filter(d => {
    const dRec = d as unknown as Record<string, unknown>;
    return !dRec.deletedAt && ((cId && d.contractId === cId) || (cCode && dRec.soHopDong === cCode));
  });

  const blockingDocs: string[] = [];
  const detailedBlocks: ContractBlockingDocumentItem[] = [];

  linkedPayments.forEach(p => {
    const pRec = p as unknown as Record<string, unknown>;
    blockingDocs.push(`Thanh toán: ${p.paymentId}`);
    detailedBlocks.push({
      type: 'payment',
      id: p.id || p.paymentId,
      code: p.paymentId,
      label: `Thanh toán: ${p.paymentId}`,
      date: p.ngayThanhToan as string | undefined,
      amount: Number(pRec.soTien || pRec.amount || pRec.totalAmount || 0),
      status: p.tinhTrangThanhToan as string | undefined
    });
  });

  linkedDeliveries.forEach(d => {
    const dRec = d as unknown as Record<string, unknown>;
    blockingDocs.push(`Giao hàng: ${d.deliveryId}`);
    detailedBlocks.push({
      type: 'delivery',
      id: d.id || d.deliveryId,
      code: d.deliveryId,
      label: `Giao hàng: ${d.deliveryId}`,
      date: (dRec.ngayGiaoHang || dRec.ngayGiaoThucTe) as string | undefined,
      status: dRec.tinhTrangGiaoHang as string | undefined
    });
  });

  if (blockingDocs.length > 0) {
    return {
      locked: true,
      reason: `Hợp đồng đã phát sinh chứng từ liên kết, không thể xoá.`,
      blockingDocuments: blockingDocs,
      detailedBlocks
    };
  }
  return { locked: false };
}

