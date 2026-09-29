import { Payment } from '@/src/domain/schema/payment.schema';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { repositoryFactory } from '@/src/data/repositories/factory';

export function usePaymentZns(
  confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>, 
  refresh: () => void,
  userRole?: string
) {
  const handleSendZns = async (payment: Payment) => {
    let phone = payment.sdt;
    let customerName = payment.tenKhachHang;
    
    if (!phone && payment.customerId) {
      const cSnap = await repositoryFactory.get<any>('customers').getById(payment.customerId);
      if (cSnap) {
        phone = cSnap.sdt || cSnap.soDienThoai || cSnap.contacts?.[0]?.sdt;
        customerName = customerName || cSnap.tenKhachHang;
      }
    }
    if (!phone) {
       notify.error("Khách hàng không có số điện thoại hợp lệ");
       return;
    }

    // Kiểm tra gửi lại nếu đã gửi thành công trước đó
    const duplicateCheck = checkZnsResendAllowed(payment as any, phone, userRole);
    const isResend = Boolean(duplicateCheck.isAlreadySent);
    
    if (isResend) {
      const confirmResend = await confirm({
        title: 'Xác nhận gửi lại ZNS Thanh Toán',
        message: `Phiếu thu ${payment.paymentId || payment.id} đã từng được gửi ZNS trước đó. Bạn có chắc chắn muốn gửi lại tin nhắn ZNS cho khách hàng ${customerName || ''} (${phone}) không?`,
        variant: 'info',
        confirmText: 'Gửi lại ZNS',
        cancelText: 'Hủy bỏ'
      });
      if (!confirmResend) return;
    } else {
      if (!await confirm({ title: "Gửi ZNS Thanh Toán", message: `Gửi ZNS Thanh toán đến ${customerName || ''} (${phone})?` })) return;
    }
    
    const enrichedPayment: any = { ...payment };
    
    // 1. Luôn tra cứu Contract nếu có contractId hoặc soHopDong
    if (payment.contractId || (payment.soHopDong && !enrichedPayment.products?.length)) {
      const contract = payment.contractId 
        ? await repositoryFactory.get<any>('contracts').getById(payment.contractId)
        : (await repositoryFactory.get<any>('contracts').list({ limit: 10 })).find((c: any) => c.soHopDong === payment.soHopDong);
      
      if (contract) {
        enrichedPayment.soDonHang = enrichedPayment.soDonHang || contract.soDonHang || '';
        enrichedPayment.soHopDong = enrichedPayment.soHopDong || contract.soHopDong || '';
        if (!enrichedPayment.products || enrichedPayment.products.length === 0) {
          enrichedPayment.products = contract.products || [];
        }
        if (!enrichedPayment.slMay || enrichedPayment.slMay === 0) {
          enrichedPayment.slMay = contract.slMay || 0;
        }
        if (!enrichedPayment.soLuong || enrichedPayment.soLuong === 0) {
          enrichedPayment.soLuong = contract.slMay || contract.soLuong || 0;
        }
        if (!enrichedPayment.dvt) {
          enrichedPayment.dvt = contract.dvt || (contract.products?.[0]?.unit) || 'Máy';
        }
      }
    }

    // 2. Luôn tra cứu Quotation nếu có quotationId hoặc soPhieuBaoGia
    if (payment.quotationId || (payment.soPhieuBaoGia && (!enrichedPayment.products?.length || !enrichedPayment.soLuong))) {
      const quotation = payment.quotationId 
        ? await repositoryFactory.get<any>('quotations').getById(payment.quotationId)
        : (await repositoryFactory.get<any>('quotations').list({ limit: 10 })).find((q: any) => q.soPhieuBaoGia === payment.soPhieuBaoGia);
      
      if (quotation) {
        enrichedPayment.soHopDong = enrichedPayment.soHopDong || quotation.soHopDong || '';
        enrichedPayment.soDonHang = enrichedPayment.soDonHang || quotation.soDonHang || quotation.soPhieuBaoGia || '';
        enrichedPayment.soPhieuBaoGia = enrichedPayment.soPhieuBaoGia || quotation.soPhieuBaoGia || '';
        if (!enrichedPayment.products || enrichedPayment.products.length === 0) {
          enrichedPayment.products = quotation.products || [];
        }
        if (!enrichedPayment.slMay || enrichedPayment.slMay === 0) {
          enrichedPayment.slMay = quotation.slMay || 0;
        }
        if (!enrichedPayment.soLuong || enrichedPayment.soLuong === 0) {
          const prodSum = Array.isArray(quotation.products) 
            ? quotation.products.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0)
            : 0;
          enrichedPayment.soLuong = quotation.slMay || quotation.soLuong || prodSum || 1;
        }
        if (!enrichedPayment.dvt) {
          enrichedPayment.dvt = quotation.dvt || (quotation.products?.[0]?.unit) || (quotation.products?.[0]?.dvt) || 'Cái';
        }
      }
    }

    // 3. Fallback tính tổng số lượng từ chính mảng products của payment nếu có
    if ((!enrichedPayment.soLuong || enrichedPayment.soLuong === 0) && Array.isArray(enrichedPayment.products) && enrichedPayment.products.length > 0) {
      enrichedPayment.soLuong = enrichedPayment.products.reduce((acc: number, p: any) => acc + (Number(p.quantity) || 0), 0);
      if (!enrichedPayment.dvt && enrichedPayment.products[0]?.unit) {
        enrichedPayment.dvt = enrichedPayment.products[0].unit;
      }
    }
    if (!enrichedPayment.soLuong) enrichedPayment.soLuong = enrichedPayment.slMay || 1;
    if (!enrichedPayment.dvt) enrichedPayment.dvt = 'Cái';

    const messageType = payment.tinhTrangThanhToan === 'Tất toán' 
      ? ZnsMessageType.THANH_TOAN_TAT_TOAN 
      : ZnsMessageType.THANH_TOAN_CONG_NO;

    await sendZnsAndToast({
       entityId: payment.id!, entityType: 'PAYMENT', messageType, phone: phone, payload: enrichedPayment as Record<string, unknown>,
       attemptBucket: nextAttempt(payment.trangThaiGuiTinThanhToan as string | undefined),
       userRole,
       forceResend: isResend
    });
    refresh();
  };

  return { handleSendZns };
}
