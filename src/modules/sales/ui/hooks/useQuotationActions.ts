import { useCallback } from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkRecentZnsDoc } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { customerRepo } from '@/src/modules/customers';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';

export function useQuotationActions(
  createQuotation: (data: Quotation) => Promise<any>,
  updateQuotation: (id: string, data: Partial<Quotation>) => Promise<any>,
  deleteQuotation: (id: string) => Promise<void>,
  confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>,
  drawerQuotation: Quotation | null,
  setDrawerQuotation: (q: Quotation | null) => void,
  editingQuotation: Quotation | null,
  setEditingQuotation: (q: Quotation | null) => void,
  setIsFormOpen: (open: boolean) => void,
  drawerCustomer: any,
  allContracts: any[] = [],
  allPayments: any[] = [],
  allDeliveries: any[] = []
) {

  const handleSendQuotationZns = useCallback(async (q: Quotation) => {
    let phone = q.sdt;
    let customerName = q.tenKhachHang;
    if (!phone && q.customerId) {
      const cData = await customerRepo.getById(q.customerId);
      if (cData) {
        phone = cData.sdt;
        customerName = customerName || cData.tenKhachHang;
      }
    }
    if (!q.id || !phone) {
      notify.error('Khách hàng thiếu SĐT');
      return;
    }
    if (!await confirm({ title: 'Gửi ZNS Báo Giá', message: `Gửi ZNS Báo giá đến khách hàng ${customerName}?` })) return;
    await sendZnsAndToast({
      entityId: q.id, entityType: 'QUOTATION', messageType: ZnsMessageType.BAOGIA, phone: phone, payload: { ...q },
      attemptBucket: nextAttempt(q.trangThaiGuiTinBaoGia || undefined)
    });
  }, [confirm]);

  const { blockingModalState, showBlockingModal, closeBlockingModal } = useEntityLifecycle();

  const handleDeleteQuotation = useCallback(async (q: Quotation) => {
    if (!q.id) return;

    // Rule 12: Không xóa bản ghi cha nếu còn bản ghi con
    const { checkQuotationLock } = await import('@/src/domain/policy/lock.policy');
    const lockResult = checkQuotationLock(q, allContracts || [], allPayments || [], allDeliveries || []);

    if (lockResult.locked) {
      showBlockingModal({
        title: 'Không thể xóa báo giá',
        entityName: `Báo giá: ${q.soPhieuBaoGia || q.id}`,
        reason: lockResult.reason,
        blockingDocuments: lockResult.blockingDocuments,
        detailedBlocks: lockResult.detailedBlocks
      });
      return;
    }

    if (await confirm({ title: 'Xóa báo giá', message: 'Bạn có chắc chắn muốn xóa bản ghi báo giá này?' })) {
      try {
        // Single unified call via useMutation deleteRecord (calls backend workflow delete, clears cache, updates optimistic state)
        await deleteQuotation(q.id);
        if (drawerQuotation?.id === q.id) {
          setDrawerQuotation(null);
        }
        notify.success("Đã xóa báo giá thành công");
      } catch (err: any) {
        if (err.blockingDocuments?.length || err.detailedBlocks?.length) {
          showBlockingModal({
            title: 'Không thể xóa báo giá',
            entityName: `Báo giá: ${q.soPhieuBaoGia || q.id}`,
            reason: err.message,
            blockingDocuments: err.blockingDocuments,
            detailedBlocks: err.detailedBlocks
          });
        } else {
          notify.error(err.message || "Lỗi khi xóa báo giá");
        }
      }
    }
  }, [deleteQuotation, confirm, drawerQuotation, setDrawerQuotation, allContracts, allPayments, allDeliveries, showBlockingModal]);

  const handleSaveQuotation = useCallback(async (data: Quotation) => {
    try {
      data.slMay = Number(data.slMay) || 0;
      if (editingQuotation?.id) {
        // Enforce validations upon editing (Rules 2, 3, 4, 10, 11, 13)
        const validation = validateQuotationUpdate(editingQuotation, data, allContracts, allPayments, allDeliveries);
        if (!validation.allowed) {
          notify.error(validation.reason || 'Dữ liệu không hợp lệ!');
          return;
        }

        await updateQuotation(editingQuotation.id, data); 
      } else { 
        await createQuotation(data); 
      }
      notify.success('Cập nhật thành công');
      setIsFormOpen(false); 
      setEditingQuotation(null);
    } catch (e: unknown) {
      notify.error((e as Error)?.message || 'Lỗi cập nhật'); 
      handleDatabaseError(e, OperationType.WRITE, `quotations/${editingQuotation?.id || 'new'}`); 
    }
  }, [createQuotation, updateQuotation, editingQuotation, setIsFormOpen, setEditingQuotation, allContracts, allPayments, allDeliveries]);

  const handleDrawerSendZns = useCallback(async () => {
    if (!drawerQuotation?.id) return;
    const phone = drawerQuotation.sdt || drawerCustomer?.sdt;
    if (!phone) {
       notify.error('Khách hàng thiếu SĐT');
       return;
    }
    const recent = await checkRecentZnsDoc(drawerQuotation.id, ZnsMessageType.BAOGIA);
    if (recent) {
      if (!await confirm({ title: 'Cảnh báo gửi đúp', message: `Tin nhắn này đã được gửi lúc ${new Date(recent.createdAt).toLocaleTimeString()} bởi user khác. Bạn vẫn muốn gửi lại?`, confirmText: 'Vẫn gửi', cancelText: 'Hủy' })) return;
    } else {
      if (!await confirm({ title: 'Gửi ZNS Báo Giá', message: `Gửi ZNS Báo giá đến khách hàng ${drawerQuotation.tenKhachHang || drawerCustomer?.tenKhachHang}?` })) return;
    }
    await sendZnsAndToast({
      entityId: drawerQuotation.id, entityType: 'QUOTATION', messageType: ZnsMessageType.BAOGIA,
      phone: phone, payload: { ...drawerQuotation },
      attemptBucket: nextAttempt(drawerQuotation.trangThaiGuiTinBaoGia || undefined)
    });
  }, [drawerQuotation, drawerCustomer, confirm]);

  return {
    handleSendQuotationZns,
    handleDeleteQuotation,
    handleSaveQuotation,
    handleDrawerSendZns,
    blockingModalState,
    closeBlockingModal
  };
}

export function validateQuotationUpdate(
  oldQ: Quotation,
  newQ: Quotation,
  allContracts: any[],
  allPayments: any[],
  allDeliveries: any[]
): { allowed: boolean; reason?: string } {
  const linkedContracts = (allContracts || []).filter(c => c.quotationId === oldQ.id);
  const linkedPayments = (allPayments || []).filter(p => p.quotationId === oldQ.id);
  const linkedDeliveries = (allDeliveries || []).filter(d => d.quotationId === oldQ.id);
  const hasAnyChild = linkedContracts.length > 0 || linkedPayments.length > 0 || linkedDeliveries.length > 0;

  // Rule 4: Không được đổi loại báo giá nếu đã có dữ liệu con
  if (oldQ.loai !== newQ.loai && hasAnyChild) {
    const details: string[] = [];
    if (linkedContracts.length) details.push(`Hợp đồng: ${linkedContracts.map(c => c.soHopDong).join(', ')}`);
    if (linkedPayments.length) details.push(`Thanh toán: ${linkedPayments.map(p => p.paymentId).join(', ')}`);
    if (linkedDeliveries.length) details.push(`Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}`);
    return { allowed: false, reason: `Cảnh báo: Không thể đổi loại báo giá từ "${oldQ.loai}" sang "${newQ.loai}" vì đã phát sinh dữ liệu con! Các phiếu liên kết: ${details.join('; ')}` };
  }

  // Rule 10: Không đổi khách hàng khi đã phát sinh bước sau
  if (oldQ.customerId !== newQ.customerId && hasAnyChild) {
    const details: string[] = [];
    if (linkedContracts.length) details.push(`Hợp đồng: ${linkedContracts.map(c => c.soHopDong).join(', ')}`);
    if (linkedPayments.length) details.push(`Thanh toán: ${linkedPayments.map(p => p.paymentId).join(', ')}`);
    if (linkedDeliveries.length) details.push(`Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}`);
    return { allowed: false, reason: `Cảnh báo: Không thể thay đổi khách hàng cho Báo giá ${oldQ.soPhieuBaoGia} vì đã phát sinh dữ liệu liên kết phía sau! Các phiếu liên kết: ${details.join('; ')}` };
  }

  // Rule 11: Không sửa mã chứng từ đã được tham chiếu
  if (oldQ.soPhieuBaoGia !== newQ.soPhieuBaoGia && hasAnyChild) {
    const details: string[] = [];
    if (linkedContracts.length) details.push(`Hợp đồng: ${linkedContracts.map(c => c.soHopDong).join(', ')}`);
    if (linkedPayments.length) details.push(`Thanh toán: ${linkedPayments.map(p => p.paymentId).join(', ')}`);
    if (linkedDeliveries.length) details.push(`Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}`);
    return { allowed: false, reason: `Cảnh báo: Không thể thay đổi số hiệu báo giá từ "${oldQ.soPhieuBaoGia}" sang "${newQ.soPhieuBaoGia}" vì đã có các tham chiếu liên kết! Các phiếu liên kết: ${details.join('; ')}` };
  }

  // Rule 2: Áp dụng BG Máy đã có hợp đồng
  if (normalizeLoai(oldQ.loai) === QUOTATION_LOAI.MAY && linkedContracts.length > 0) {
    if (isQuotationMainContentChanged(oldQ, newQ)) {
      return { allowed: false, reason: `Cảnh báo: Báo giá ${oldQ.soPhieuBaoGia} là BG Máy đã có Hợp đồng liên kết: ${linkedContracts.map(c => c.soHopDong).join(', ')}. Không được phép sửa đổi thông tin chính (khách hàng, loại báo giá, số phiếu, sản phẩm, giá trị)!` };
    }
  }

  // Rule 3: Áp dụng BG Vật tư / BG Dịch vụ đã có thanh toán
  const oldQNormalizedLoai = normalizeLoai(oldQ.loai);
  if ((oldQNormalizedLoai === QUOTATION_LOAI.VAT_TU || oldQNormalizedLoai === QUOTATION_LOAI.DICH_VU) && linkedPayments.length > 0) {
    if (isQuotationMainContentChanged(oldQ, newQ)) {
      return { allowed: false, reason: `Cảnh báo: Báo giá ${oldQ.soPhieuBaoGia} là báo giá dịch vụ/vật tư đã phát sinh phiếu Thanh toán liên kết: ${linkedPayments.map(p => p.paymentId).join(', ')}. Không được phép sửa đổi thông tin chính (khách hàng, loại báo giá, số phiếu, sản phẩm, giá trị)!` };
    }
  }

  // Rule 13: Không chuyển trạng thái thủ công vượt luồng
  if (oldQ.tinhTrangBaoGia && newQ.tinhTrangBaoGia && oldQ.tinhTrangBaoGia !== newQ.tinhTrangBaoGia) {
    if (oldQ.tinhTrangBaoGia === 'ĐÃ CHỐT' && newQ.tinhTrangBaoGia === 'MỚI') {
      return { allowed: false, reason: 'Không được phép chuyển tình trạng báo giá từ ĐÃ CHỐT về MỚI!' };
    }
    if (oldQ.tinhTrangBaoGia === 'HỦY' && newQ.tinhTrangBaoGia !== 'HỦY') {
      return { allowed: false, reason: 'Báo giá đã HỦY, không thể đổi trạng thái khác!' };
    }
  }

  return { allowed: true };
}

function isQuotationMainContentChanged(oldQ: Quotation, newQ: Quotation): boolean {
  if (oldQ.loai !== newQ.loai) return true;
  if (oldQ.customerId !== newQ.customerId) return true;
  if (oldQ.soPhieuBaoGia !== newQ.soPhieuBaoGia) return true;
  if (oldQ.totalAmount !== newQ.totalAmount) return true;
  
  const oldProducts = oldQ.products || [];
  const newProducts = newQ.products || [];
  if (oldProducts.length !== newProducts.length) return true;
  
  for (let i = 0; i < oldProducts.length; i++) {
    const oP = oldProducts[i];
    const nP = newProducts[i];
    if (oP.productId !== nP.productId) return true;
    if (oP.quantity !== nP.quantity) return true;
    if (oP.price !== nP.price) return true;
  }
  return false;
}
