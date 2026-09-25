import { useState, useCallback } from 'react';
import { Contract } from '@/src/domain/schema/contract.schema';
import { useConfirm } from '@/src/design-system/Confirm';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { customerRepo } from '@/src/modules/customers';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';

export function useContractsActions(
  deleteContract: (id: string) => Promise<void>,
  realtimePayments: any[] = [],
  realtimeDeliveries: any[] = []
) {
  const { confirm } = useConfirm();
  const { blockingModalState, showBlockingModal, closeBlockingModal } = useEntityLifecycle();

  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [drawerContract, setDrawerContract] = useState<Contract | null>(null);

  // States for prefilled Creations triggered from Drawer
  const [prefillPaymentContract, setPrefillPaymentContract] = useState<Contract | null>(null);
  const [prefillDeliveryContract, setPrefillDeliveryContract] = useState<Contract | null>(null);

  const handleDeleteContract = async (contract: Contract) => {
    if (!contract || !contract.id) return;

    // Rule 12: Không xóa bản ghi cha nếu còn bản ghi con
    const { checkContractLock } = await import('@/src/domain/policy/lock.policy');
    const linkedPayments = (realtimePayments || []).filter(p => p.contractId === contract.id);
    const linkedDeliveries = (realtimeDeliveries || []).filter(d => d.contractId === contract.id);
    
    const lockResult = checkContractLock(contract, linkedPayments, linkedDeliveries);
    if (lockResult.locked) {
      showBlockingModal({
        title: 'Không thể xóa hợp đồng',
        entityName: `Hợp đồng: ${contract.soHopDong || contract.id}`,
        reason: lockResult.reason,
        blockingDocuments: lockResult.blockingDocuments,
        detailedBlocks: lockResult.detailedBlocks
      });
      return;
    }

    if (!await confirm({ title: "Xóa Hợp Đồng", message: `Bạn có chắc chắn muốn xóa hợp đồng ${contract.soHopDong}?` })) {
      return;
    }
    
    try {
      // Unified backend delete: checks lock, sets status DELETED, fires ContractDeleted (sibling-aware reversal on quote)
      await deleteContract(contract.id);
      
      if (drawerContract?.id === contract.id) {
        setDrawerContract(null);
      }

      notify.success(`Đã xóa hợp đồng ${contract.soHopDong}`);
    } catch (err: any) {
      if (err.blockingDocuments?.length || err.detailedBlocks?.length) {
        showBlockingModal({
          title: 'Không thể xóa hợp đồng',
          entityName: `Hợp đồng: ${contract.soHopDong || contract.id}`,
          reason: err.message,
          blockingDocuments: err.blockingDocuments,
          detailedBlocks: err.detailedBlocks
        });
      } else {
        notify.error(err.message || 'Lỗi khi xóa hợp đồng ở backend.');
      }
    }
  };

  const handleSendContractZns = useCallback(async (c: Contract) => {
    let phone = c.sdt;
    let customerName = c.tenKhachHang;
    if (!phone && c.customerId) {
        const cData = await customerRepo.getById(c.customerId);
        if (cData) {
          phone = (cData as any).soDienThoai || cData.sdt || cData.contacts?.[0]?.sdt;
          customerName = customerName || cData.tenKhachHang;
        }
    }
    if (!c.id || !phone) return notify.error("Khách hàng thiếu SĐT");
    if (!await confirm({ title: "Gửi ZNS Hợp Đồng", message: `Gửi ZNS Hợp đồng đến khách hàng ${customerName}?` })) return;
    await sendZnsAndToast({
      entityId: c.id,
      entityType: 'CONTRACT',
      messageType: ZnsMessageType.HOPDONG_SIGN_ZNS,
      phone: phone as string,
      payload: { ...c },
      attemptBucket: nextAttempt(c.trangThaiGuiTinHopDong || undefined)
    });
  }, [confirm]);

  return {
    editingContract,
    setEditingContract,
    isFormOpen,
    setIsFormOpen,
    drawerContract,
    setDrawerContract,
    prefillPaymentContract,
    setPrefillPaymentContract,
    prefillDeliveryContract,
    setPrefillDeliveryContract,
    handleDeleteContract,
    handleSendContractZns,
    blockingModalState,
    closeBlockingModal
  };
}
