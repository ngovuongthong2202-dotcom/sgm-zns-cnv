import React, { useState, useCallback } from 'react';
import { logger } from '@/src/shared/lib/logger';
import { Customer } from '@/src/domain/schema/customer.schema';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkRecentZnsDoc, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { OptimisticConflictError } from '@/src/design-system/OptimisticConflictError';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';
import { realtimeStore } from '@/src/data/realtime-store';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';

interface UseCustomerActionsProps {
  localCustomers: Customer[];
  setLocalCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  updateCustomer: (id: string, data: Partial<import('@/src/domain/schema/customer.schema').Customer>) => Promise<void>;
  createCustomer: (data: Partial<import('@/src/domain/schema/customer.schema').Customer>) => Promise<import('@/src/domain/schema/customer.schema').Customer>;
  refresh: () => Promise<void>;
  canEditCustomer: (customer: Customer) => boolean;
  canDeleteCustomer: () => boolean;
  drawerState: import('./useCustomersPage').DrawerState;
  setDrawerState: (state: import('./useCustomersPage').DrawerState) => void;
  user: { uid?: string, email?: string | null } | null;
  userData?: { role?: string } | null;
  confirm: (opts: import('@/src/design-system/Confirm').ConfirmOptions) => Promise<boolean>;
  allQuotations?: any[];
  allContracts?: any[];
  allPayments?: any[];
  allDeliveries?: any[];
}

export function useCustomerActions({
  localCustomers,
  setLocalCustomers,
  updateCustomer,
  createCustomer,
  refresh,
  canEditCustomer,
  canDeleteCustomer,
  drawerState,
  setDrawerState,
  user,
  userData,
  confirm,
  allQuotations = [],
  allContracts = [],
  allPayments = [],
  allDeliveries = []
}: UseCustomerActionsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);
  const [sendingZnsIds, setSendingZnsIds] = useState<Record<string, boolean>>({});

  const handleUpdateCustomer = useCallback(async (id: string, updatedFields: Partial<Customer>) => {
    const previousLocal = [...localCustomers];
    const originalCustomer = previousLocal.find(c => c.id === id);
    if (!originalCustomer || !canEditCustomer({ ...originalCustomer, ...updatedFields } as Customer)) {
      notify.error('Bạn chỉ có quyền chỉnh sửa khách hàng do bạn phụ trách!');
      return;
    }

    // Rule 11: Không sửa mã chứng từ/mã thực thể đã được tham chiếu
    if (updatedFields.maKh && originalCustomer.maKh !== updatedFields.maKh) {
      let linkedQuotes: any[];
      let linkedContracts: any[];
      let linkedPayments: any[];
      let linkedDeliveries: any[];

      try {
        const [qSnap, cSnap, pSnap, dSnap] = await Promise.all([
          repositoryFactory.get<any>('quotations').list({ limit: 5, fkField: 'customerId', fkId: id }),
          repositoryFactory.get<any>('contracts').list({ limit: 5, fkField: 'customerId', fkId: id }),
          repositoryFactory.get<any>('payments').list({ limit: 5, fkField: 'customerId', fkId: id }),
          repositoryFactory.get<any>('deliveries').list({ limit: 5, fkField: 'customerId', fkId: id })
        ]);
        linkedQuotes = qSnap.filter((d: any) => !d.deletedAt);
        linkedContracts = cSnap.filter((d: any) => !d.deletedAt);
        linkedPayments = pSnap.filter((d: any) => !d.deletedAt);
        linkedDeliveries = dSnap.filter((d: any) => !d.deletedAt);
      } catch (err) {
        linkedQuotes = (allQuotations || []).filter(q => q.customerId === id);
        linkedContracts = (allContracts || []).filter(co => co.customerId === id);
        linkedPayments = (allPayments || []).filter(p => p.customerId === id);
        linkedDeliveries = (allDeliveries || []).filter(d => d.customerId === id);
      }

      if (linkedQuotes.length || linkedContracts.length || linkedPayments.length || linkedDeliveries.length) {
        const details = [];
        if (linkedQuotes.length) details.push(`Báo giá: ${linkedQuotes.map(q => q.soPhieuBaoGia).join(', ')}`);
        if (linkedContracts.length) details.push(`Hợp đồng: ${linkedContracts.map(co => co.soHopDong).join(', ')}`);
        if (linkedPayments.length) details.push(`Thanh toán: ${linkedPayments.map(p => p.paymentId).join(', ')}`);
        if (linkedDeliveries.length) details.push(`Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}`);

        notify.error(`Cảnh báo: Đã phát sinh giao dịch liên kết cho khách hàng này (${details.join('; ')}), không thể thay đổi mã Khách hàng ${originalCustomer.maKh}!`);
        return;
      }
    }

    const lastKnownUpdate = originalCustomer.ngayCapNhat || (originalCustomer as import('@/src/domain/schema/customer.schema').Customer & { updatedAt?: string }).updatedAt;
    setLocalCustomers(prev => prev.map(c => c.id === id ? { ...c, ...updatedFields } : c));

    try {
      if (drawerState.mode === 'view' && drawerState.customer.id === id) {
        setDrawerState({
          ...drawerState,
          customer: { ...drawerState.customer, ...updatedFields }
        });
      }
      await updateCustomer(id, { ...updatedFields, _lastUpdatedAt: lastKnownUpdate as string } as Partial<import('@/src/domain/schema/customer.schema').Customer>);
      if (drawerState.mode === 'edit' && drawerState.customer.id === id) {
        setDrawerState({ mode: 'closed' });
      }
      await refresh();
    } catch (err: unknown) {
      setLocalCustomers(previousLocal);
      if (err instanceof OptimisticConflictError || (err instanceof Error ? err.message : String(err)) === 'OPTIMISTIC_CONCURRENCY_ABORTED') {
        notify.info('Đã hủy cập nhật do xung đột dữ liệu.');
      } else {
        notify.error(`Không thể chỉnh sửa: ${(err instanceof Error ? err.message : String(err))}`);
      }
      throw err;
    }
  }, [localCustomers, updateCustomer, canEditCustomer, drawerState, setDrawerState, refresh, setLocalCustomers]);

  const { blockingModalState, showBlockingModal, closeBlockingModal } = useEntityLifecycle();

  const handleDeleteCustomer = useCallback(async (c: Customer) => {
    if (!canDeleteCustomer() || !c.id) {
       notify.error('Chỉ Quản trị viên (Admin) mới có quyền xóa khách hàng!');
       return;
    }

    setIsSaving(true);
    let results;

    try {
      // Rule 1: Khách hàng đã phát sinh giao dịch thì không được xóa
      // Rule 12: Không xóa bản ghi cha nếu còn bản ghi con
      // Fetch fresh, real-time links directly from Firestore to bypass old/stale SWR cache
      const [quotesSnap, contractsSnap, paymentsSnap, deliveriesSnap] = await Promise.all([
        repositoryFactory.get<any>('quotations').list({ limit: 10, fkField: 'customerId', fkId: c.id }),
        repositoryFactory.get<any>('contracts').list({ limit: 10, fkField: 'customerId', fkId: c.id }),
        repositoryFactory.get<any>('payments').list({ limit: 10, fkField: 'customerId', fkId: c.id }),
        repositoryFactory.get<any>('deliveries').list({ limit: 10, fkField: 'customerId', fkId: c.id })
      ]);

      results = {
        quotes: quotesSnap.filter((d: any) => !d.deletedAt),
        contracts: contractsSnap.filter((d: any) => !d.deletedAt),
        payments: paymentsSnap.filter((d: any) => !d.deletedAt),
        deliveries: deliveriesSnap.filter((d: any) => !d.deletedAt)
      };
    } catch (err: unknown) {
      logger.error('Lỗi khi kiểm tra tài liệu liên kết thời gian thực:', err);
      // fallback to SWR if Firestore query fails (e.g. offline/security issue)
      results = {
        quotes: (allQuotations || []).filter(q => q.customerId === c.id),
        contracts: (allContracts || []).filter(co => co.customerId === c.id),
        payments: (allPayments || []).filter(p => p.customerId === c.id),
        deliveries: (allDeliveries || []).filter(d => d.customerId === c.id)
      };
    } finally {
      setIsSaving(false);
    }

    const { checkCustomerLock } = await import('@/src/domain/policy/lock.policy');
    const lockResult = checkCustomerLock(c, results.quotes, results.contracts, results.payments, results.deliveries);

    if (lockResult.locked) {
      showBlockingModal({
        title: 'Không thể xóa khách hàng',
        entityName: `Khách hàng: ${c.tenKhachHang || c.maKh}`,
        reason: lockResult.reason,
        blockingDocuments: lockResult.blockingDocuments,
        detailedBlocks: lockResult.detailedBlocks
      });
      return;
    }

    try {
      const confirmed = await confirm({
        title: 'Xóa khách hàng',
        message: `Bạn có chắc chắn muốn xóa khách hàng ${c.tenKhachHang} không?`,
        confirmText: 'Xóa',
        cancelText: 'Hủy'
      });
      if (!confirmed) return;

      setIsSaving(true);
      const previousLocal = [...localCustomers];
      setLocalCustomers(prev => prev.filter(item => item.id !== c.id && item.maKh !== c.id && item.id !== c.maKh));
      realtimeStore.mutateOptimistic('customers', 'delete', c.id);
      if (c.maKh) realtimeStore.mutateOptimistic('customers', 'delete', c.maKh);
      if (drawerState.mode !== 'closed' && (drawerState as any).customer?.id === c.id) {
        setDrawerState({ mode: 'closed' });
      }

      const res = await fetch(`/api/customers/${c.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.uid, userEmail: user?.email })
      });
      const data = await res.json();
      if (!res.ok) {
        setLocalCustomers(previousLocal);
        realtimeStore.restoreSnapshot('customers', previousLocal);
        if (data.blockingDocuments?.length || data.detailedBlocks?.length) {
          showBlockingModal({
            title: 'Không thể xóa khách hàng',
            entityName: `Khách hàng: ${c.tenKhachHang || c.maKh}`,
            reason: data.error,
            blockingDocuments: data.blockingDocuments,
            detailedBlocks: data.detailedBlocks
          });
          return;
        }
        throw new Error(data.error || 'Lỗi server khi thực hiện xóa');
      }
      crossTabSync.broadcast({ type: 'ENTITY_DELETED', collectionName: 'customers', id: c.id });
      notify.success(data.message || `Đã xóa thành công khách hàng ${c.tenKhachHang}`);
      await refresh();
    } catch (err: unknown) {
      notify.error(`Lỗi khi xóa khách hàng: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setIsSaving(false);
    }
  }, [localCustomers, confirm, user, refresh, canDeleteCustomer, setLocalCustomers, allQuotations, allContracts, allPayments, allDeliveries, showBlockingModal]);

  const handleCreateCustomer = useCallback(async (data: import('@/src/domain/schema/customer.schema').Customer, continueCreating: boolean = false) => {
    setIsSaving(true);
    const previousLocal = [...localCustomers];
    const generatedId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const payload = {
      ...data,
      ngayTao: nowIso,
      ngayCapNhat: nowIso
    };
    const mockCustomer = {
      id: generatedId,
      maKh: payload.maKh,
      tenKhachHang: payload.tenKhachHang,
      diaChi: payload.diaChi,
      sdt: payload.sdt,
      loaiKh: payload.loaiKh,
      tinhThanh: payload.tinhThanh,
      nguoiDaiDien: payload.contacts?.[0]?.nguoiDaiDien || payload.nguoiDaiDien || '',
      nguoiPhuTrach: payload.nguoiPhuTrach || '',
      contacts: payload.contacts || [],
      ngayTao: nowIso,
      ngayCapNhat: nowIso
    } as Customer;

    setLocalCustomers(prev => [mockCustomer, ...prev]);

    try {
      await createCustomer(payload);
      notify.success(`Đã tạo KH ${data.tenKhachHang} (${data.maKh})`);
      setIsFormDirty(false);
      if (!continueCreating) {
        setDrawerState({ mode: 'closed' });
      }
      await refresh();
    } catch (err: unknown) {
      setLocalCustomers(previousLocal);
      notify.error(`Không thể lưu khách hàng: ${(err instanceof Error ? err.message : String(err))}`);
      handleDatabaseError(err, OperationType.WRITE, `customers/new`);
    } finally {
      setIsSaving(false);
    }
  }, [localCustomers, createCustomer, refresh, setLocalCustomers, setDrawerState]);

  const handleSendZns = useCallback(async (c: Customer) => {
    const customerId = c.id || c.maKh;
    const phone = (c.sdt || c.contacts?.[0]?.sdt || '').trim();

    if (!customerId) {
      return notify.error('Lỗi: Không tìm thấy ID của khách hàng');
    }
    if (!phone) {
      return notify.error(`Khách hàng ${c.tenKhachHang || c.maKh} chưa có Số điện thoại liên hệ.`);
    }
    if (sendingZnsIds[customerId]) return;

    setSendingZnsIds(prev => ({ ...prev, [customerId]: true }));
    try {
      const duplicateCheck = checkZnsResendAllowed(c, phone, userData?.role);
      let forceResend = false;
      if (!duplicateCheck.allowed) {
        if (duplicateCheck.canAdminOverride) {
          const force = await confirm({
            title: 'Xác nhận gửi lại ZNS (Admin)',
            message: `Tin ZNS này đã được gửi thành công đến số điện thoại ${phone}. Bạn đang thao tác với quyền Quản trị viên, bạn có chắc chắn muốn buộc gửi lại (Force Resend) tin này không?`,
            variant: 'warning',
            confirmText: 'Buộc gửi lại',
            cancelText: 'Hủy bỏ'
          });
          if (!force) {
            setSendingZnsIds(prev => ({ ...prev, [customerId]: false }));
            return;
          }
          forceResend = true;
        } else {
          notify.warning(duplicateCheck.reason || 'Tin ZNS đã được gửi thành công đến số điện thoại này.');
          setSendingZnsIds(prev => ({ ...prev, [customerId]: false }));
          return;
        }
      }

      const recent = await checkRecentZnsDoc(customerId, ZnsMessageType.CUSTOMER_PRE_QUOTE);
      if (recent && !forceResend) {
        if (!await confirm({ title: 'Cảnh báo gửi đúp', message: `Tin nhắn này đã được gửi lúc ${new Date(recent.createdAt).toLocaleTimeString()} bởi user khác. Bạn vẫn muốn gửi lại?`, confirmText: 'Vẫn gửi', cancelText: 'Hủy' })) {
          setSendingZnsIds(prev => ({ ...prev, [customerId]: false }));
          return;
        }
      } else if (!forceResend) {
        if (!await confirm({ title: 'Gửi ZNS Khách Hàng', message: `Gửi tin ZNS đến ${c.tenKhachHang} (${phone})?` })) {
          setSendingZnsIds(prev => ({ ...prev, [customerId]: false }));
          return;
        }
      }
      await sendZnsAndToast({
        entityId: customerId, 
        entityType: 'CUSTOMER', 
        messageType: ZnsMessageType.CUSTOMER_PRE_QUOTE,
        phone: phone, 
        payload: { ...c, sdt: phone, phone }, 
        attemptBucket: nextAttempt(c.trangThaiGuiTinQuangCao as string | undefined),
        userRole: userData?.role,
        forceResend
      });
    } catch (err: unknown) {
      notify.error(`Lỗi gửi tin: ${(err instanceof Error ? err.message : String(err))}`);
    } finally {
      setSendingZnsIds(prev => ({ ...prev, [customerId]: false }));
    }
  }, [sendingZnsIds, confirm, userData]);

  return {
    isSaving,
    isFormDirty,
    setIsFormDirty,
    sendingZnsIds,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleCreateCustomer,
    handleSendZns,
    blockingModalState,
    closeBlockingModal
  };
}
