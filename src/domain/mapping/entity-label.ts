import { Customer } from '../schema/customer.schema';
import { Quotation } from '../schema/quotation.schema';
import { Contract } from '../schema/contract.schema';
import { Payment } from '../schema/payment.schema';
import { Delivery } from '../schema/delivery.schema';
import { ProductItem } from '../schema/product.schema';

export const LABEL_FALLBACK = "Chưa có thông tin";

export function getCustomerDisplayLabel(customer: Partial<Customer> | null | undefined): string {
  if (!customer) return LABEL_FALLBACK;
  return customer.maKh || customer.tenKhachHang || customer.sdt || "Không tìm thấy khách hàng";
}

export function getQuotationDisplayLabel(quotation: Partial<Quotation> | Record<string, unknown> | null | undefined): string {
  if (!quotation) return LABEL_FALLBACK;
  const q = quotation as Record<string, unknown>;
  return (q.soPhieuBaoGia as string) || (q.maBaoGia as string) || (q.ma_bao_gia as string) || (q.code as string) || "Chưa có số phiếu";
}

export function getContractDisplayLabel(contract: Partial<Contract> | Record<string, unknown> | null | undefined): string {
  if (!contract) return LABEL_FALLBACK;
  const c = contract as Record<string, unknown>;
  return (c.soHopDong as string) || (c.maHopDong as string) || (c.ma_hop_dong as string) || (c.soDonHang as string) || "Chưa có số hợp đồng";
}

export function getPaymentDisplayLabel(payment: Partial<Payment> | Record<string, unknown> | null | undefined): string {
  if (!payment) return LABEL_FALLBACK;
  const p = payment as Record<string, unknown>;
  return (p.soChungTu as string) || (p.paymentId as string) || (p.soPhieuThu as string) || (p.maThanhToan as string) || (p.code as string) || (p.maPhieuTH as string) || "Chưa có số chứng từ";
}

export function getDeliveryDisplayLabel(delivery: Partial<Delivery> | Record<string, unknown> | null | undefined): string {
  if (!delivery) return LABEL_FALLBACK;
  const d = delivery as Record<string, unknown>;
  return (d.deliveryId as string) || (d.maGiaoHang as string) || (d.soPhieuXuat as string) || (d.maPhieu as string) || "Chưa có số phiếu xuất";
}

export function getProductDisplayLabel(product: Partial<ProductItem> | Record<string, unknown> | null | undefined): string {
  if (!product) return LABEL_FALLBACK;
  const p = product as Record<string, unknown>;
  return (p.productName as string) || (p.tenMay as string) || (p.productCode as string) || "Chưa có tên máy";
}

export function getEntityDisplayLabel(entityType: string, entity: Record<string, unknown> | null | undefined): string {
  if (!entity) return LABEL_FALLBACK;
  
  const type = entityType.toLowerCase();
  
  switch (type) {
    case 'customer':
    case 'customers':
      return getCustomerDisplayLabel(entity);
    case 'quotation':
    case 'quotations':
      return getQuotationDisplayLabel(entity);
    case 'contract':
    case 'contracts':
      return getContractDisplayLabel(entity);
    case 'payment':
    case 'payments':
      return getPaymentDisplayLabel(entity);
    case 'delivery':
    case 'deliveries':
      return getDeliveryDisplayLabel(entity);
    case 'product':
    case 'products':
      return getProductDisplayLabel(entity);
    default:
      return LABEL_FALLBACK;
  }
}
