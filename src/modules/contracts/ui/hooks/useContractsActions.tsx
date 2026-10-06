import { useState, useCallback } from 'react';
import { Contract } from '@/src/domain/schema/contract.schema';
import { useConfirm } from '@/src/design-system/Confirm';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { customerRepo } from '@/src/modules/customers';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';
import { resolveZnsTargetPhone, extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';

export function useContractsActions(
  deleteContract: (id: string) => Promise<void>,
  realtimePayments: any[] = [],
  realtimeDeliveries: any[] = [],
  userRole?: string
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

  const [znsPreviewContract, setZnsPreviewContract] = useState<{
    contract: Contract;
    customer?: any;
    phone?: string;
    availablePhones?: Array<{ phone: string; label?: string; isPrimary?: boolean }>;
  } | null>(null);

  const handleSendContractZns = useCallback(async (c: Contract) => {
    try {
      let customerDoc: any = null;
      let customerName = c.tenKhachHang;
      if (c.customerId) {
          customerDoc = await customerRepo.getById(c.customerId);
          if (customerDoc) {
            customerName = customerName || customerDoc.tenKhachHang;
          }
      }
      const targetPhoneInfo = resolveZnsTargetPhone(c.soZaloMacDinh || c.sdt, c.danhSachSdt, customerDoc);
      const phone = targetPhoneInfo.validPhone || (c.sdt ? c.sdt.replace(/\D/g, '') : null);

      if (!c.id) return notify.error("Hợp đồng không hợp lệ để gửi tin ZNS");

      const rawPhonesPool = [
        c.sdt,
        c.sdtPhu,
        c.soZaloMacDinh,
        ...(Array.isArray(c.danhSachSdt) ? c.danhSachSdt : []),
        ...(customerDoc ? [
          customerDoc.sdt,
          customerDoc.sdtPhu,
          customerDoc.soZaloMacDinh,
          ...(Array.isArray(customerDoc.danhSachSdt) ? customerDoc.danhSachSdt : []),
          ...(Array.isArray(customerDoc.contacts) ? customerDoc.contacts.map((ct: any) => ct?.sdt) : [])
        ] : [])
      ].filter(Boolean).join(' ');

      const extracted = extractVietnamesePhones(rawPhonesPool, (c as any).diaChi || customerDoc?.diaChi);
      const availableMobiles: Array<{ cleaned: string; formatted: string; carrier?: string }> = [];
      const seenMob = new Set<string>();
      extracted.mobilePhones.forEach(m => {
        if (!seenMob.has(m.cleaned)) {
          seenMob.add(m.cleaned);
          availableMobiles.push(m);
        }
      });

      setZnsPreviewContract({
        contract: c,
        customer: customerDoc,
        phone: phone || availableMobiles[0]?.cleaned || '',
        availablePhones: availableMobiles.map((m, idx) => ({
          phone: m.cleaned,
          label: `${m.formatted} (${m.carrier || 'Di động'})`,
          isPrimary: idx === 0
        }))
      });
    } catch (err: any) {
      console.error('Error preparing contract ZNS preview:', err);
      notify.error("Lỗi khi mở xem trước tin ZNS Hợp đồng: " + (err.message || String(err)));
    }
  }, []);

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
    znsPreviewContract,
    setZnsPreviewContract,
    blockingModalState,
    closeBlockingModal
  };
}
