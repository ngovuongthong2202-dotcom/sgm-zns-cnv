import { z } from 'zod';
import { QuotationSchema } from '../../domain/schema/quotation.schema';
import { ContractSchema } from '../../domain/schema/contract.schema';
import { PaymentSchema } from '../../domain/schema/payment.schema';
import { DeliverySchema } from '../../domain/schema/delivery.schema';
import { CustomerSchema } from '../../domain/schema/customer.schema';

type Quotation = z.infer<typeof QuotationSchema>;
type Contract = z.infer<typeof ContractSchema>;
type Payment = z.infer<typeof PaymentSchema>;
type Delivery = z.infer<typeof DeliverySchema>;
type Customer = z.infer<typeof CustomerSchema>;

export interface BlockingDocumentItem {
  type: 'contract' | 'payment' | 'delivery' | 'quotation';
  id: string;
  code: string;
  label: string;
  date?: string;
  amount?: number;
  status?: string;
}

export interface LockResult {
  locked: boolean;
  reason?: string;
  blockingDocuments?: string[];
  detailedBlocks?: BlockingDocumentItem[];
}

export function checkQuotationLock(
  oldQ: Quotation, 
  contracts: Contract[], 
  payments: Payment[], 
  deliveries: Delivery[]
): LockResult {
  const qId = oldQ.id;
  const qCode = oldQ.soPhieuBaoGia;

  // Auto-filter linked children to guarantee accurate checks even if full lists are passed
  const linkedContracts = (contracts || []).filter(c => 
    !(c as any).deletedAt && ((qId && c.quotationId === qId) || (qCode && c.soPhieuBaoGia === qCode))
  );
  const linkedPayments = (payments || []).filter(p => 
    !(p as any).deletedAt && ((qId && p.quotationId === qId) || (qCode && (p as any).soBaoGia === qCode))
  );
  const linkedDeliveries = (deliveries || []).filter(d => 
    !(d as any).deletedAt && ((qId && d.quotationId === qId) || (qCode && (d as any).soBaoGia === qCode))
  );

  const blockingDocs: string[] = [];
  const detailedBlocks: BlockingDocumentItem[] = [];

  linkedContracts.forEach(c => {
    blockingDocs.push(`Hợp đồng: ${c.soHopDong}`);
    detailedBlocks.push({
      type: 'contract',
      id: c.id || c.soHopDong,
      code: c.soHopDong,
      label: `Hợp đồng: ${c.soHopDong}`,
      date: c.ngayKy,
      amount: c.totalAmount,
      status: c.tinhTrangHopDong || (c as any).status
    });
  });

  linkedPayments.forEach(p => {
    blockingDocs.push(`Thanh toán: ${p.paymentId}`);
    detailedBlocks.push({
      type: 'payment',
      id: p.id || p.paymentId,
      code: p.paymentId,
      label: `Thanh toán: ${p.paymentId}`,
      date: p.ngayThanhToan,
      amount: Number((p as any).soTien || (p as any).amount || (p as any).totalAmount || 0),
      status: p.tinhTrangThanhToan
    });
  });

  linkedDeliveries.forEach(d => {
    blockingDocs.push(`Giao hàng: ${d.deliveryId}`);
    detailedBlocks.push({
      type: 'delivery',
      id: d.id || d.deliveryId,
      code: d.deliveryId,
      label: `Giao hàng: ${d.deliveryId}`,
      date: (d as any).ngayGiaoHang || (d as any).ngayGiaoThucTe,
      status: (d as any).tinhTrangGiaoHang
    });
  });

  if (blockingDocs.length > 0) {
    return {
      locked: true,
      reason: `Báo giá đã phát sinh chứng từ liên kết, không thể chỉnh sửa khoá nghiệp vụ hoặc xoá.`,
      blockingDocuments: blockingDocs,
      detailedBlocks
    };
  }
  return { locked: false };
}

export function checkPaymentLock(
  oldPayment: Payment,
  deliveries: Delivery[]
): LockResult {
  const pId = oldPayment.id;
  const pCode = oldPayment.paymentId;

  const linkedDeliveries = (deliveries || []).filter(d => 
    !(d as any).deletedAt && ((pId && d.paymentId === pId) || (pCode && d.paymentId === pCode))
  );

  const blockingDocs: string[] = [];
  const detailedBlocks: BlockingDocumentItem[] = [];

  linkedDeliveries.forEach(d => {
    blockingDocs.push(`Giao hàng: ${d.deliveryId}`);
    detailedBlocks.push({
      type: 'delivery',
      id: d.id || d.deliveryId,
      code: d.deliveryId,
      label: `Giao hàng: ${d.deliveryId}`,
      date: (d as any).ngayGiaoHang || (d as any).ngayGiaoThucTe,
      status: (d as any).tinhTrangGiaoHang
    });
  });

  if (blockingDocs.length > 0) {
    return {
      locked: true,
      reason: `Thanh toán đã có Giao hàng liên kết, không thể xoá.`,
      blockingDocuments: blockingDocs,
      detailedBlocks
    };
  }
  return { locked: false };
}

export function checkCustomerLock(
  customer: Customer,
  quotations: Quotation[],
  contracts: Contract[],
  payments: Payment[],
  deliveries: Delivery[]
): LockResult {
  const cId = customer.id;
  const cCode = (customer as any).maKh || (customer as any).maKhachHang;

  const linkedQuotes = (quotations || []).filter(q => 
    !(q as any).deletedAt && ((cId && q.customerId === cId) || (cCode && q.maKh === cCode))
  );
  const linkedContracts = (contracts || []).filter(c => 
    !(c as any).deletedAt && ((cId && c.customerId === cId) || (cCode && c.maKh === cCode))
  );
  const linkedPayments = (payments || []).filter(p => 
    !(p as any).deletedAt && ((cId && p.customerId === cId) || (cCode && p.maKh === cCode))
  );
  const linkedDeliveries = (deliveries || []).filter(d => 
    !(d as any).deletedAt && ((cId && d.customerId === cId) || (cCode && d.maKh === cCode))
  );

  const blockingDocs: string[] = [];
  const detailedBlocks: BlockingDocumentItem[] = [];

  linkedQuotes.forEach(q => {
    blockingDocs.push(`Báo giá: ${q.soPhieuBaoGia}`);
    detailedBlocks.push({
      type: 'quotation',
      id: q.id || q.soPhieuBaoGia,
      code: q.soPhieuBaoGia,
      label: `Báo giá: ${q.soPhieuBaoGia}`,
      date: (q as any).ngayBaoGia || (q as any).createdAt,
      amount: (q as any).tongTien || (q as any).totalAmount
    });
  });

  linkedContracts.forEach(c => {
    blockingDocs.push(`Hợp đồng: ${c.soHopDong}`);
    detailedBlocks.push({
      type: 'contract',
      id: c.id || c.soHopDong,
      code: c.soHopDong,
      label: `Hợp đồng: ${c.soHopDong}`,
      date: c.ngayKy,
      amount: c.totalAmount
    });
  });

  linkedPayments.forEach(p => {
    blockingDocs.push(`Thanh toán: ${p.paymentId}`);
    detailedBlocks.push({
      type: 'payment',
      id: p.id || p.paymentId,
      code: p.paymentId,
      label: `Thanh toán: ${p.paymentId}`,
      date: p.ngayThanhToan,
      amount: Number((p as any).soTien || (p as any).amount || (p as any).totalAmount || 0)
    });
  });

  linkedDeliveries.forEach(d => {
    blockingDocs.push(`Giao hàng: ${d.deliveryId}`);
    detailedBlocks.push({
      type: 'delivery',
      id: d.id || d.deliveryId,
      code: d.deliveryId,
      label: `Giao hàng: ${d.deliveryId}`,
      date: (d as any).ngayGiaoHang || (d as any).ngayGiaoThucTe
    });
  });

  if (blockingDocs.length > 0) {
    return {
      locked: true,
      reason: `Khách hàng ${customer.tenKhachHang || (customer as any).maKh || (customer as any).maKhachHang} đã phát sinh giao dịch, không thể xoá!`,
      blockingDocuments: blockingDocs,
      detailedBlocks
    };
  }

  return { locked: false };
}

export { checkContractLock } from '@/src/modules/contracts/domain/ContractPolicy';

