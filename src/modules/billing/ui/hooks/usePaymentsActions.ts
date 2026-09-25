import { useState, useCallback } from 'react';
import { Payment } from '@/src/domain/schema/payment.schema';
import { useConfirm } from '@/src/design-system/Confirm';
import { notify } from '@/src/shared/utils/notify';
import { usePaymentZns } from './usePaymentZns';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';

export function usePaymentsActions(
  deletePayment: (id: string) => Promise<void>,
  refresh: () => void,
  deliveries: any[] = []
) {
  const { confirm } = useConfirm();
  const { blockingModalState, showBlockingModal, closeBlockingModal } = useEntityLifecycle();
  
  const [drawerPayment, setDrawerPayment] = useState<Payment | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDeletePayment = useCallback(async (pm: Payment) => {
    if (!pm.id) return;

    // Rule 7: Thanh toán đã xác nhận/đối soát thì không được xóa
    if (pm.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || pm.tinhTrangThanhToan === 'Tất toán') {
      showBlockingModal({
        title: 'Không thể xóa phiếu thu đã thanh toán',
        entityName: `Phiếu thu: ${pm.paymentId || pm.id}`,
        reason: `Phiếu thanh toán ${pm.paymentId || '(không rõ mã)'} đã xác nhận / đối soát (Đã thanh toán hoặc Tất toán). Để xóa, cần hoàn tác trạng thái hoặc hủy đối soát trước.`
      });
      return;
    }

    // Rule 8 & 12: Thanh toán đã dùng làm điều kiện giao hàng thì không được xóa nếu còn bản ghi con
    const { checkPaymentLock } = await import('@/src/domain/policy/lock.policy');
    const linkedDeliveries = (deliveries || []).filter(d => 
      (d.paymentId && (d.paymentId === pm.id || d.paymentId === pm.paymentId))
    );
    const lockResult = checkPaymentLock(pm, linkedDeliveries);
    if (lockResult.locked) {
      showBlockingModal({
        title: 'Không thể xóa phiếu thu',
        entityName: `Phiếu thu: ${pm.paymentId || pm.id}`,
        reason: lockResult.reason,
        blockingDocuments: lockResult.blockingDocuments,
        detailedBlocks: lockResult.detailedBlocks
      });
      return;
    }

    if (await confirm({ title: "Xóa Thanh Toán", message: `Bạn có chắc chắn muốn xóa phiếu thu ${pm.paymentId}?` })) {
      try {
        // Unified backend delete: checks lock, sets status DELETED, fires PaymentDeleted (recomputes debt and reopens contract if needed)
        await deletePayment(pm.id);
        notify.success("Xóa phiếu thu thành công!");
        if (drawerPayment?.id === pm.id) {
          setDrawerPayment(null);
        }
        refresh();
      } catch (err: any) {
        if (err.blockingDocuments?.length || err.detailedBlocks?.length) {
          showBlockingModal({
            title: 'Không thể xóa phiếu thu',
            entityName: `Phiếu thu: ${pm.paymentId || pm.id}`,
            reason: err.message,
            blockingDocuments: err.blockingDocuments,
            detailedBlocks: err.detailedBlocks
          });
        } else {
          notify.error(err.message || "Lỗi khi xóa!");
        }
      }
    }
  }, [deletePayment, confirm, drawerPayment, refresh, deliveries, showBlockingModal]);

  const { handleSendZns } = usePaymentZns(confirm, refresh);

  const handleCreatePrepaidFinalPayment = useCallback((delivery: Delivery | any) => {
    const code = `PT${Date.now().toString().slice(-6)}`;
    const mockPayment: Partial<Payment> = {
      paymentId: code,
      customerId: delivery.customerId || '',
      maKh: delivery.maKh || '',
      tenKhachHang: delivery.tenKhachHang || '',
      sdt: delivery.sdt || '',
      soHopDong: delivery.soHopDong || '',
      soDonHang: delivery.soDonHang || '',
      contractId: delivery.contractId || '',
      quotationId: delivery.quotationId || '',
      totalAmount: delivery.totalAmount || delivery.giaTriHopDong || 0,
      soTien: delivery.totalAmount || delivery.giaTriHopDong || 0,
      loai: 'Dứt điểm',
      phuongThucThanhToan: 'Chuyển khoản',
      tinhTrangThanhToan: 'Tất toán',
      products: delivery.products || [],
      slMay: delivery.slMay || 0,
      ngayThanhToan: new Date().toISOString().substring(0, 10),
    };
    setEditingPayment(mockPayment as Payment);
    setIsFormOpen(true);
  }, []);

  return {
    drawerPayment,
    setDrawerPayment,
    editingPayment,
    setEditingPayment,
    isFormOpen,
    setIsFormOpen,
    handleDeletePayment,
    handleSendZns,
    handleCreatePrepaidFinalPayment,
    blockingModalState,
    closeBlockingModal,
  };
}
