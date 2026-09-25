import { Quotation } from '../schema/quotation.schema';
import { Contract } from '../schema/contract.schema';
import { Payment } from '../schema/payment.schema';
import { Delivery } from '../schema/delivery.schema';
import { Customer } from '../schema/customer.schema';

export type DocumentKind = 'quotation' | 'contract' | 'payment' | 'delivery' | 'customer';

export interface TaggedQuotation {
  readonly kind: 'quotation';
  readonly data: Quotation;
}

export interface TaggedContract {
  readonly kind: 'contract';
  readonly data: Contract;
}

export interface TaggedPayment {
  readonly kind: 'payment';
  readonly data: Payment;
}

export interface TaggedDelivery {
  readonly kind: 'delivery';
  readonly data: Delivery;
}

export interface TaggedCustomer {
  readonly kind: 'customer';
  readonly data: Customer;
}

export type WorkflowDocument =
  | TaggedQuotation
  | TaggedContract
  | TaggedPayment
  | TaggedDelivery
  | TaggedCustomer;

/**
 * Universal Document Identifier
 * Đảm bảo phân loại chính xác dựa trên Business Primary Key thay vì phụ thuộc duck-typing vào các trường snapshot
 */
export function identifyDocument(doc: unknown): WorkflowDocument | null {
  if (!doc || typeof doc !== 'object') return null;
  const rec = doc as Record<string, unknown>;

  // Đã có gắn nhãn tường minh
  if (rec.kind === 'quotation' && rec.data) return doc as TaggedQuotation;
  if (rec.kind === 'contract' && rec.data) return doc as TaggedContract;
  if (rec.kind === 'payment' && rec.data) return doc as TaggedPayment;
  if (rec.kind === 'delivery' && rec.data) return doc as TaggedDelivery;
  if (rec.kind === 'customer' && rec.data) return doc as TaggedCustomer;

  // 1. Delivery có deliveryId (hoặc maGiaoHang, hoặc trangThaiGuiTinGiaoHang)
  if (typeof rec.deliveryId === 'string' && rec.deliveryId.trim().length > 0) {
    return { kind: 'delivery', data: doc as Delivery };
  }
  if (typeof rec.maGiaoHang === 'string' && rec.maGiaoHang.trim().length > 0) {
    return { kind: 'delivery', data: doc as Delivery };
  }
  if (rec.trangThaiGuiTinGiaoHang !== undefined && !rec.paymentId && !rec.soHopDong && !rec.soPhieuBaoGia) {
    return { kind: 'delivery', data: doc as Delivery };
  }

  // 2. Payment có paymentId (hoặc maThanhToan, hoặc trangThaiGuiTinThanhToan) mà không phải delivery
  if (typeof rec.paymentId === 'string' && rec.paymentId.trim().length > 0) {
    return { kind: 'payment', data: doc as Payment };
  }
  if (typeof rec.maThanhToan === 'string' && rec.maThanhToan.trim().length > 0) {
    return { kind: 'payment', data: doc as Payment };
  }
  if (rec.trangThaiGuiTinThanhToan !== undefined && !rec.deliveryId && !rec.soHopDong && !rec.soPhieuBaoGia) {
    return { kind: 'payment', data: doc as Payment };
  }

  // 3. Contract có soHopDong (hoặc maHopDong, hoặc trangThaiGuiTinHopDong) mà không phải payment/delivery
  if (typeof rec.soHopDong === 'string' && rec.soHopDong.trim().length > 0 && !rec.paymentId && !rec.deliveryId) {
    return { kind: 'contract', data: doc as Contract };
  }
  if (typeof rec.maHopDong === 'string' && rec.maHopDong.trim().length > 0 && !rec.paymentId && !rec.deliveryId) {
    return { kind: 'contract', data: doc as Contract };
  }
  if (rec.trangThaiGuiTinHopDong !== undefined && !rec.paymentId && !rec.deliveryId && !rec.soPhieuBaoGia) {
    return { kind: 'contract', data: doc as Contract };
  }

  // 4. Quotation có soPhieuBaoGia (hoặc maBaoGia, hoặc trangThaiGuiTinBaoGia) mà không có soHopDong/paymentId/deliveryId
  if (typeof rec.soPhieuBaoGia === 'string' && rec.soPhieuBaoGia.trim().length > 0 && !rec.soHopDong && !rec.paymentId && !rec.deliveryId) {
    return { kind: 'quotation', data: doc as Quotation };
  }
  if (typeof rec.maBaoGia === 'string' && rec.maBaoGia.trim().length > 0 && !rec.soHopDong && !rec.paymentId && !rec.deliveryId) {
    return { kind: 'quotation', data: doc as Quotation };
  }
  if (rec.trangThaiGuiTinBaoGia !== undefined && !rec.soHopDong && !rec.paymentId && !rec.deliveryId) {
    return { kind: 'quotation', data: doc as Quotation };
  }

  // 5. Customer có tenKhachHang / maKh mà không có soPhieuBaoGia, soHopDong, paymentId, deliveryId
  if ((rec.maKh || rec.tenKhachHang || rec.sdt) && !rec.soPhieuBaoGia && !rec.soHopDong && !rec.paymentId && !rec.deliveryId) {
    return { kind: 'customer', data: doc as Customer };
  }

  return null;
}
