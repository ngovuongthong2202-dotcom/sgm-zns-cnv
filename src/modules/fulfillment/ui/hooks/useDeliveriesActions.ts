import React, { useCallback, useState } from 'react';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { customerRepo } from '@/src/modules/customers';
import { logger } from '@/src/shared/lib/logger';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { formatDate } from '@/src/shared/utils/formatDate';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';
import { DeliveryStatusVO } from '@/src/domain/value-objects/DeliveryStatusVO';

import { auditLogsRepo } from '@/src/data/repositories/system.repo';

export function useDeliveriesActions(
  createDelivery: (data: Delivery) => Promise<string>,
  deleteDelivery: (id: string) => Promise<void>,
  updateDelivery: (id: string, data: Partial<Delivery>) => Promise<void>,
  updateContract: (id: string, data: any) => Promise<void>,
  updateQuotation: (id: string, data: any) => Promise<void>,
  confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>,
  setDrawerDelivery: React.Dispatch<React.SetStateAction<Delivery | null>>,
  drawerDelivery: Delivery | null,
  editingDelivery: Delivery | null,
  setEditingDelivery: (del: Delivery | null) => void,
  setIsFormOpen: (open: boolean) => void,
  userRole?: string
) {
  const [completingDelivery, setCompletingDelivery] = useState<Delivery | null>(null);
  const [viewingConfirmationDelivery, setViewingConfirmationDelivery] = useState<Delivery | null>(null);
  const { blockingModalState, showBlockingModal, closeBlockingModal } = useEntityLifecycle();

  const handleRevertDeliveryConfirmation = useCallback(async (del: Delivery) => {
    if (!del.id) return;
    const ok = await confirm({
      title: 'Hủy xác nhận giao hàng',
      message: `Bạn có chắc chắn muốn xóa/hủy thông tin xác nhận giao hàng của phiếu "${del.deliveryId || del.id}"? Phiếu sẽ quay về trạng thái "Đang giao", xóa ngày giao thực tế và cho phép chỉnh sửa hoặc xóa chứng từ.`,
      variant: 'warning',
      confirmText: 'Xác nhận hủy',
      cancelText: 'Quay lại'
    });
    if (!ok) return;

    try {
      await updateDelivery(del.id, {
        ngayGiaoThucTe: null,
        tinhTrangGiaoHang: 'Đang giao',
        kyNhan: '',
      });

      // Nếu hợp đồng liên quan đang có cờ HOAN_TAT / COMPLETED, đưa về DANG_GIAO
      if (del.contractId) {
        const cSnap = await repositoryFactory.get<any>('contracts').getById(del.contractId);
        if (cSnap && (cSnap.tinhTrangGiaoHang === 'HOAN_TAT' || cSnap.tinhTrangHopDong === 'COMPLETED')) {
          await updateContract(del.contractId, {
            tinhTrangGiaoHang: 'DANG_GIAO',
            tinhTrangHopDong: 'DANG_THUC_HIEN',
            status: 'ACTIVE'
          });
        }
      }

      auditLogsRepo.create({
        action: 'UPDATE',
        entityId: del.id,
        entityType: 'delivery',
        userId: userRole || 'user',
        timestamp: new Date().toISOString(),
        details: {
          note: 'Hủy xác nhận giao hàng, đưa về trạng thái Đang giao',
          before: {
            tinhTrangGiaoHang: del.tinhTrangGiaoHang,
            ngayGiaoThucTe: del.ngayGiaoThucTe,
            kyNhan: del.kyNhan
          },
          after: {
            tinhTrangGiaoHang: 'Đang giao',
            ngayGiaoThucTe: null,
            kyNhan: ''
          }
        }
      }).catch(() => {});

      if (drawerDelivery?.id === del.id) {
        setDrawerDelivery(prev => prev ? {
          ...prev,
          ngayGiaoThucTe: undefined,
          tinhTrangGiaoHang: 'Đang giao',
          kyNhan: ''
        } as Delivery : null);
      }

      if (viewingConfirmationDelivery?.id === del.id) {
        setViewingConfirmationDelivery(null);
      }

      notify.success('Đã xóa thông tin xác nhận giao hàng thành công. Phiếu giao hiện ở trạng thái Đang giao.');
    } catch (err: any) {
      logger.error('Revert delivery confirmation error:', err);
      notify.error(err.message || 'Lỗi khi hủy xác nhận giao hàng');
    }
  }, [updateDelivery, updateContract, confirm, drawerDelivery, setDrawerDelivery, viewingConfirmationDelivery, userRole]);

  const handleViewDeliveryConfirmation = useCallback((del: Delivery) => {
    setViewingConfirmationDelivery(del);
  }, []);

  const handleDeleteDelivery = useCallback(async (del: Delivery) => {
    if (!del.id) return;

    const isCompleted = DeliveryStatusVO.isCompleted(del.tinhTrangGiaoHang, del.ngayGiaoThucTe);
    const roleLower = String(userRole || '').toLowerCase();
    const isAdmin = roleLower === 'admin' || roleLower === 'administrator' || roleLower === 'ban_giam_doc';

    let confirmTitle = 'Xóa phiếu giao';
    let confirmMessage = `Bạn có chắc chắn muốn xóa phiếu giao hàng ${del.deliveryId || del.id}?`;

    if (isCompleted) {
      confirmTitle = 'Xóa phiếu giao đã xác nhận thành công';
      confirmMessage = `Phiếu giao hàng ${del.deliveryId || del.id} đã hoàn tất bàn giao thực tế (ngày ${del.ngayGiaoThucTe ? formatDate(del.ngayGiaoThucTe) : '---'}). Bạn có chắc chắn muốn HỦY XÁC NHẬN GIAO HÀNG và XÓA phiếu này không? Số lượng bàn giao sẽ được hoàn lại cho Hợp đồng / Báo giá liên quan.`;
    }

    if (await confirm({ 
      title: confirmTitle, 
      message: confirmMessage,
      variant: isCompleted ? 'danger' : undefined,
      confirmText: isCompleted ? 'Hủy xác nhận & Xóa' : 'Xóa phiếu',
      cancelText: 'Quay lại'
    })) {
      try {
        // Nếu đã hoàn tất, tự động hủy xác nhận trước để gỡ cờ hoàn tất
        if (isCompleted) {
          await updateDelivery(del.id, {
            ngayGiaoThucTe: null,
            tinhTrangGiaoHang: 'Đang giao',
            kyNhan: '',
          });
        }

        // Hoàn lại số lượng đã bàn giao cho Hợp đồng / Báo giá
        let sourceId = del.contractId;
        let collectionName = 'contracts';
        let updateSourceFn: (id: string, data: any) => Promise<void> = updateContract;

        if (!sourceId && del.quotationId) {
          sourceId = del.quotationId;
          collectionName = 'quotations';
          updateSourceFn = updateQuotation;
        }

        if (sourceId && del.tinhTrangGiaoHang !== 'HUY') {
          const sourceSnap = await repositoryFactory.get<any>(collectionName).getById(sourceId);
          if (sourceSnap) {
            const currentDelivered = sourceSnap.deliveredQuantities || {};
            const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };

            for (const [index, p] of (del.products || []).entries()) {
              const itemKey = getProductItemKey(p, index);
              const previousDelivered = currentDelivered[itemKey] || 0;
              newDeliveredQuantities[itemKey] = Math.max(0, previousDelivered - Number((p as any).quantity || 0));
            }
            await updateSourceFn(sourceId, { deliveredQuantities: newDeliveredQuantities });
          }
        }

        await deleteDelivery(del.id);

        // Ghi Audit log xóa
        auditLogsRepo.create({
          action: 'DELETE',
          entityId: del.id,
          entityType: 'delivery',
          userId: userRole || 'Administrator',
          timestamp: new Date().toISOString(),
          details: {
            before: {
              deliveryId: del.deliveryId,
              tinhTrangGiaoHang: del.tinhTrangGiaoHang,
              ngayGiaoThucTe: del.ngayGiaoThucTe,
              tenKhachHang: del.tenKhachHang
            }
          }
        }).catch(() => {});

        if (drawerDelivery?.id === del.id) {
          setDrawerDelivery(null);
        }
        if (viewingConfirmationDelivery?.id === del.id) {
          setViewingConfirmationDelivery(null);
        }
        notify.success("Đã xóa phiếu giao hàng thành công");
      } catch (err: any) {
        if (err.blockingDocuments?.length || err.detailedBlocks?.length) {
          showBlockingModal({
            title: 'Không thể xóa phiếu giao',
            entityName: `Phiếu giao: ${del.deliveryId || del.id}`,
            reason: err.message,
            blockingDocuments: err.blockingDocuments,
            detailedBlocks: err.detailedBlocks
          });
        } else {
          logger.error(err);
          notify.error(err.message || "Lỗi khi xóa phiếu giao hàng");
        }
      }
    }
  }, [deleteDelivery, updateDelivery, confirm, drawerDelivery, setDrawerDelivery, viewingConfirmationDelivery, setViewingConfirmationDelivery, showBlockingModal, userRole, updateContract, updateQuotation]);

  const handleMarkDelivered = useCallback((del: Delivery) => {
    if (del.ngayGiaoThucTe) return; // Already delivered
    setCompletingDelivery(del);
  }, []);

  const onCompleteDeliverySubmit = async (data: Partial<Delivery>) => {
     if (!completingDelivery?.id) return;
     try {
        const updatePayload = {
          ...data,
          tinhTrangGiaoHang: 'Hoàn tất'
        };
        await updateDelivery(completingDelivery.id, updatePayload);
        notify.success(`Đã cập nhật trạng thái giao hàng thành công`);

        // Ghi nhận Audit log hoàn tất
        auditLogsRepo.create({
          action: 'UPDATE',
          entityId: completingDelivery.id,
          entityType: 'delivery',
          userId: userRole || 'user',
          timestamp: new Date().toISOString(),
          details: {
            after: {
              tinhTrangGiaoHang: 'Hoàn tất',
              ngayGiaoThucTe: data.ngayGiaoThucTe,
              kyNhan: data.kyNhan,
              ghiChu: data.ghiChu
            }
          }
        }).catch(() => {});
        
        const freshData = { ...completingDelivery, ...updatePayload, ngayGiaoThucTe: data.ngayGiaoThucTe! };
        
        if (drawerDelivery?.id === completingDelivery.id) {
           setDrawerDelivery(freshData as Delivery);
        }

        setCompletingDelivery(null);
     } catch (error) {
        logger.error('Update delivery error:', error);
        notify.error('Có lỗi xảy ra khi cập nhật.');
     }
  };

  const handleSendZns = useCallback(async (del: Delivery, templateCode: 'GIAOHANG_ZNS' | 'GIAOHANG_HOANTAT' = 'GIAOHANG_ZNS') => {
     let phone = del.sdt;
     let customerName = del.tenKhachHang;
     
     if (!phone && del.customerId) {
       const cSnap = await customerRepo.getById(del.customerId);
       if (cSnap) {
         const cData = cSnap;
         phone = cData.sdt || (cData as any).soDienThoai || cData.contacts?.[0]?.sdt;
         customerName = customerName || cData.tenKhachHang;
       }
     }
     
     if (!phone) { notify.error("Khách hàng thiếu SĐT"); return; }

     // Kiểm tra gửi trùng lặp nếu đã gửi thành công trước đó
     const duplicateCheck = checkZnsResendAllowed(del as any, phone, userRole);
     let forceResend = false;
     if (!duplicateCheck.allowed) {
       if (duplicateCheck.canAdminOverride) {
         const force = await confirm({
           title: 'Xác nhận gửi lại ZNS Giao Hàng (Admin)',
           message: `Phiếu giao hàng này đã được gửi ZNS thành công đến số điện thoại ${phone}. Bạn đang thao tác với quyền Quản trị viên, bạn có chắc chắn muốn buộc gửi lại (Force Resend) tin này không?`,
           variant: 'warning',
           confirmText: 'Buộc gửi lại',
           cancelText: 'Hủy bỏ'
         });
         if (!force) return;
         forceResend = true;
       } else {
         notify.warning(duplicateCheck.reason || 'Phiếu giao hàng này đã được gửi ZNS thành công đến số điện thoại này.');
         return;
       }
     }

     if (!forceResend) {
       const textTemplateLabel = templateCode === ZnsMessageType.GIAOHANG_ZNS ? 'CẬP NHẬT GIAO HÀNG (ZNS)' : 'HOÀN TẤT (GIAOHANG_HOANTAT)';
       if (!await confirm({ title: `Gửi ZNS Giao Hàng`, message: `Gửi tin Zalo ${textTemplateLabel} đến số ${phone} của ${customerName}?` })) return;
     }
     
     await sendZnsAndToast({
        entityId: del.id!, 
        entityType: 'DELIVERY', 
        messageType: templateCode, 
        phone: phone, 
        payload: { ...del } as Record<string, unknown>,
        attemptBucket: nextAttempt(del.trangThaiGuiTinGiaoHang as string | undefined),
        userRole,
        forceResend
     });
  }, [confirm, userRole]);

  // Action cancel delivery with explanation/reason
  const handleCancelDelivery = useCallback(async (del: Delivery, reason: string) => {
    if (!del.id) return;
    try {
      const appendNote = `\n--- Phiếu bị Hủy lúc ${new Date().toLocaleDateString('vi-VN')} ---\nLý do: ${reason}`;
      const noteUpdate = `${del.ghiChu || ''}${appendNote}`.trim();
      
      await updateDelivery(del.id, {
        tinhTrangGiaoHang: 'HUY',
        ghiChu: noteUpdate
      });

      let sourceId = del.contractId;
      let collectionName = 'contracts';
      let updateSourceFn: (id: string, data: any) => Promise<void> = updateContract;

      if (!sourceId && del.quotationId) {
        sourceId = del.quotationId;
        collectionName = 'quotations';
        updateSourceFn = updateQuotation;
      }

      if (sourceId && del.tinhTrangGiaoHang !== 'HUY') {
        const sourceSnap = await repositoryFactory.get<any>(collectionName).getById(sourceId);
        if (sourceSnap) {
          const source = sourceSnap;
          const currentDelivered = source.deliveredQuantities || {};
          const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };

          for (const [index, p] of (del.products || []).entries()) {
            const itemKey = getProductItemKey(p, index);
            const previousDelivered = currentDelivered[itemKey] || 0;
            newDeliveredQuantities[itemKey] = Math.max(0, previousDelivered - (p.quantity || 0));
          }
          await updateSourceFn(sourceId, { deliveredQuantities: newDeliveredQuantities });
        }
      }

      notify.success(`Đã hủy phiếu giao hàng thành công`);
      
      if (drawerDelivery?.id === del.id) {
        setDrawerDelivery(prev => prev ? { ...prev, tinhTrangGiaoHang: 'HUY', ghiChu: noteUpdate } as Delivery : null);
      }
    } catch (error) {
       logger.error('Cancel delivery error:', error);
       notify.error('Có lỗi xảy ra khi hủy phiếu giao.');
    }
  }, [updateDelivery, drawerDelivery, setDrawerDelivery]);

  // Drag-and-drop reschedule action triggered from calendar week view
  const handleReschedule = useCallback(async (id: string, newDate: string) => {
    try {
      await updateDelivery(id, {
        ngayGiaoMay: newDate
      });
 
      notify.success(`Đã dời ngày dự kiến sang ${formatDate(newDate)} thành công`);
    } catch (error) {
      logger.error('Reschedule delivery error:', error);
      notify.error('Lỗi khi cập nhật ngày dự kiến.');
    }
  }, [updateDelivery]);

  // Syncing delivered stock updates back to Contracts/Quotations source references
  const handleSaveDelivery = async (data: Delivery) => {
    try {
      // Rule 9: Giao hàng đã hoàn tất thì không sửa nội dung chính
      if (editingDelivery && (editingDelivery.tinhTrangGiaoHang === 'HOAN TẤT' || editingDelivery.tinhTrangGiaoHang === 'Hoàn tất' || editingDelivery.ngayGiaoThucTe)) {
        if (isDeliveryMainContentChanged(editingDelivery, data)) {
          notify.error(`Cảnh báo: Phiếu giao hàng ${editingDelivery.deliveryId} đã hoàn tất bàn giao. Không được phép chỉnh sửa đổi nội dung chính (khách hàng, sản phẩm, số phiếu giao, thanh toán liên quan)!`);
          return;
        }
      }

      // Rule 13: Không chuyển trạng thái thủ công vượt luồng
      if (editingDelivery && editingDelivery.tinhTrangGiaoHang !== data.tinhTrangGiaoHang) {
        const oldStatus = editingDelivery.tinhTrangGiaoHang;
        const newStatus = data.tinhTrangGiaoHang;
        if ((oldStatus === 'HOAN TẤT' || oldStatus === 'Hoàn tất' || editingDelivery.ngayGiaoThucTe) && (newStatus === 'Chưa giao' || newStatus === 'Đang giao')) {
          notify.error(`Cảnh báo: Phiếu giao hàng ${editingDelivery.deliveryId} đã hoàn tất bàn giao thực tế, không thể tự ý chuyển ngược về trạng thái Chưa giao / Đang giao!`);
          return;
        }
        if (oldStatus === 'HUY' && newStatus !== 'HUY') {
          notify.error(`Cảnh báo: Phiếu giao hàng ${editingDelivery.deliveryId} đã HỦY, không thể đổi trạng thái khác!`);
          return;
        }
      }

      let sourceId = data.contractId;
      let collectionName = 'contracts';
      let updateSourceFn: (id: string, data: any) => Promise<void> = updateContract;

      if (!sourceId && data.quotationId) {
        sourceId = data.quotationId;
        collectionName = 'quotations';
        updateSourceFn = updateQuotation;
      }

      if (!sourceId) throw new Error('Yêu cầu phải có Hợp đồng hoặc Báo giá');

      const sourceSnap = await repositoryFactory.get<any>(collectionName).getById(sourceId);
      if (!sourceSnap) throw new Error('Không tìm thấy nguồn dữ liệu tham chiếu');
      const source = sourceSnap;

      const currentDelivered = source.deliveredQuantities || {};
      const newDeliveredQuantities: Record<string, number> = { ...currentDelivered };
      
      const allItemKeys = new Set<string>();
      (data.products || []).forEach((p, idx) => allItemKeys.add(getProductItemKey(p, idx)));
      if (editingDelivery?.products) {
        editingDelivery.products.forEach((p: any, idx: number) => allItemKeys.add(getProductItemKey(p, idx)));
      }

      for (const itemKey of Array.from(allItemKeys)) {
        let contracted = 0;
        if (source.products) {
          contracted = source.products.filter((cp: any, sourceIndex: number) => getProductItemKey(cp, sourceIndex) === itemKey)
            .reduce((acc: number, cp: any) => acc + (cp.quantity || 0), 0);
        }

        const previousDelivered = currentDelivered[itemKey] || 0;
        
        let currentShipmentPreviousQty = 0;
        if (editingDelivery) {
          currentShipmentPreviousQty = (editingDelivery.products || []).filter((ep: any, epIndex: number) => getProductItemKey(ep, epIndex) === itemKey)
            .reduce((acc: number, ep: any) => acc + (ep.quantity || 0), 0);
        }

        let newShipmentQty = 0;
        if (data.products) {
          newShipmentQty = data.products.filter((np: any, npIndex: number) => getProductItemKey(np, npIndex) === itemKey)
            .reduce((acc: number, np: any) => acc + (np.quantity || 0), 0);
        }

        const remaining = contracted - (previousDelivered - currentShipmentPreviousQty);
        
        if (newShipmentQty > remaining) {
          notify.error(`Sản phẩm ${itemKey} vượt quá số lượng còn lại (${remaining})`);
          return;
        }

        newDeliveredQuantities[itemKey] = Math.max(0, (previousDelivered - currentShipmentPreviousQty) + newShipmentQty);
      }

      if (editingDelivery?.id) {
        await updateDelivery(editingDelivery.id, data);
        auditLogsRepo.create({
          action: 'UPDATE',
          entityId: editingDelivery.id,
          entityType: 'delivery',
          userId: userRole || 'user',
          timestamp: new Date().toISOString(),
          details: {
            before: editingDelivery,
            after: data
          }
        }).catch(() => {});
      } else {
        const createdId = await apiCreateEntity('delivery', data);
        auditLogsRepo.create({
          action: 'CREATE',
          entityId: String((createdId as any)?.id || createdId || data.deliveryId),
          entityType: 'delivery',
          userId: userRole || 'user',
          timestamp: new Date().toISOString(),
          details: {
            after: data
          }
        }).catch(() => {});
      }
      await updateSourceFn(source.id!, { deliveredQuantities: newDeliveredQuantities });

      notify.success('Lưu phiếu giao hàng và cập nhật tiến độ thành công');
      setIsFormOpen(false);
      setEditingDelivery(null);
      
    } catch (e: any) {
      notify.error(e.message || 'Lỗi hệ thống khi lưu');
      handleDatabaseError(e, OperationType.WRITE, `deliveries/${editingDelivery?.id || 'new'}`);
    }
  };

  return {
    handleDeleteDelivery,
    handleMarkDelivered,
    onCompleteDeliverySubmit,
    handleSendZns,
    handleCancelDelivery,
    handleReschedule,
    handleSaveDelivery,
    handleRevertDeliveryConfirmation,
    handleViewDeliveryConfirmation,
    viewingConfirmationDelivery,
    setViewingConfirmationDelivery,
    completingDelivery,
    setCompletingDelivery,
    blockingModalState,
    closeBlockingModal
  };
}

function isDeliveryMainContentChanged(oldD: any, newD: any): boolean {
  if (oldD.customerId !== newD.customerId) return true;
  if (oldD.deliveryId !== newD.deliveryId) return true;
  if (oldD.contractId !== newD.contractId) return true;
  if (oldD.quotationId !== newD.quotationId) return true;
  
  const oldProducts = oldD.products || [];
  const newProducts = newD.products || [];
  if (oldProducts.length !== newProducts.length) return true;
  
  for (let i = 0; i < oldProducts.length; i++) {
    const oP = oldProducts[i];
    const nP = newProducts[i];
    if (oP.productId !== nP.productId && oP.productName !== nP.productName) return true;
    if (oP.quantity !== nP.quantity) return true;
  }
  return false;
}
