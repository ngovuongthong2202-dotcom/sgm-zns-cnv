import { Payment } from '@/src/domain/schema/payment.schema';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { repositoryFactory } from '@/src/data/repositories/factory';

export function usePaymentZns(confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>, refresh: () => void) {
  const handleSendZns = async (payment: Payment) => {
    let phone = payment.sdt;
    let customerName = payment.tenKhachHang;
    
    if (!phone && payment.customerId) {
      const cSnap = await repositoryFactory.get<any>('customers').getById(payment.customerId);
      if (cSnap) {
        phone = cSnap.sdt || cSnap.soDienThoai;
        customerName = customerName || cSnap.tenKhachHang;
      }
    }
    if (!phone) {
       notify.error("Khách hàng không có số điện thoại hợp lệ");
       return;
    }
    if (!await confirm({ title: "Gửi ZNS Thanh Toán", message: `Gửi ZNS Thanh toán đến ${customerName}?` })) return;
    
    const enrichedPayment = { ...payment };
    if (!enrichedPayment.soDonHang || !enrichedPayment.soHopDong) {
      if (payment.contractId) {
        const contract = await repositoryFactory.get<any>('contracts').getById(payment.contractId);
        if (contract) {
          enrichedPayment.soDonHang = enrichedPayment.soDonHang || contract.soDonHang || '';
          enrichedPayment.soHopDong = enrichedPayment.soHopDong || contract.soHopDong || '';
          if (!enrichedPayment.slMay || enrichedPayment.slMay === 0) {
            enrichedPayment.slMay = contract.slMay || 0;
          }
          if (!(enrichedPayment as typeof enrichedPayment & { soLuong?: number }).soLuong || (enrichedPayment as typeof enrichedPayment & { soLuong?: number }).soLuong === 0) {
            (enrichedPayment as typeof enrichedPayment & { soLuong?: number }).soLuong = contract.slMay || (contract as typeof contract & { soLuong?: number }).soLuong || 0;
          }
          if (!(enrichedPayment as typeof enrichedPayment & { dvt?: string }).dvt) {
            (enrichedPayment as typeof enrichedPayment & { dvt?: string }).dvt = contract.dvt || 'Máy';
          }
        }
      } else if (payment.quotationId) {
        const quotation = await repositoryFactory.get<any>('quotations').getById(payment.quotationId);
        if (quotation) {
           enrichedPayment.soHopDong = enrichedPayment.soHopDong || (quotation as typeof quotation & { soHopDong?: string }).soHopDong || '';
           if (!enrichedPayment.slMay || enrichedPayment.slMay === 0) {
               enrichedPayment.slMay = quotation.slMay || 0;
           }
           if (!(enrichedPayment as typeof enrichedPayment & { soLuong?: number }).soLuong || (enrichedPayment as typeof enrichedPayment & { soLuong?: number }).soLuong === 0) {
               (enrichedPayment as typeof enrichedPayment & { soLuong?: number }).soLuong = (quotation as typeof quotation & { slMay?: number }).slMay || (quotation as typeof quotation & { soLuong?: number }).soLuong || 0;
           }
           if (!(enrichedPayment as typeof enrichedPayment & { dvt?: string }).dvt) {
               (enrichedPayment as typeof enrichedPayment & { dvt?: string }).dvt = (quotation as typeof quotation & { dvt?: string }).dvt || 'Máy';
           }
        }
      }
    }

    const messageType = payment.tinhTrangThanhToan === 'Tất toán' 
      ? ZnsMessageType.THANH_TOAN_TAT_TOAN 
      : ZnsMessageType.THANH_TOAN_CONG_NO;

    await sendZnsAndToast({
       entityId: payment.id!, entityType: 'PAYMENT', messageType, phone: phone, payload: enrichedPayment as Record<string, unknown>,
       attemptBucket: nextAttempt(payment.trangThaiGuiTinThanhToan as string | undefined)
    });
    refresh();
  };

  return { handleSendZns };
}
