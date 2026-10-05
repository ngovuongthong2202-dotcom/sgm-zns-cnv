import { useCallback } from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { notify } from '@/src/shared/utils/notify';
import { sendZnsAndToast, nextAttempt, checkZnsResendAllowed } from '@/src/domain/zns-client';
import { EntityZnsStatus, isZnsSuccessStatus, ZnsMessageType } from '@/src/domain/enums/zns-status';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { customerRepo } from '@/src/modules/customers';
import { useEntityLifecycle } from '@/src/hooks/useEntityLifecycle';
import { resolveZnsTargetPhone, extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';

export function detectCommercialCoreDelta(oldQ: Quotation, newQ: Quotation): boolean {
  // 1. Phân loại báo giá
  if (oldQ.loai !== newQ.loai || oldQ.loaiBaoGia !== newQ.loaiBaoGia) return true;
  // 2. Đối tác khách hàng & đầu mối
  if (oldQ.customerId !== newQ.customerId) return true;
  if ((oldQ.sdt || '').trim() !== (newQ.sdt || '').trim()) return true;
  if ((oldQ.nguoiDaiDien || '').trim() !== (newQ.nguoiDaiDien || '').trim()) return true;
  if ((oldQ.diaChi || '').trim() !== (newQ.diaChi || '').trim()) return true;
  // 3. Thời hạn hiệu lực & ngày báo giá
  if (oldQ.ngayBaoGia !== newQ.ngayBaoGia) return true;
  if (oldQ.hieuLuc !== newQ.hieuLuc) return true;
  if (oldQ.ngayHetHan !== newQ.ngayHetHan) return true;
  // 4. Tài chính tổng
  if (Number(oldQ.totalAmount || 0) !== Number(newQ.totalAmount || 0)) return true;
  if (Number(oldQ.subTotal || 0) !== Number(newQ.subTotal || 0)) return true;
  if (Number(oldQ.vatAmount || 0) !== Number(newQ.vatAmount || 0)) return true;
  if (Number(oldQ.discountAmount || 0) !== Number(newQ.discountAmount || 0)) return true;
  // 5. Danh mục sản phẩm
  const oldProds = oldQ.products || [];
  const newProds = newQ.products || [];
  if (oldProds.length !== newProds.length) return true;
  for (let i = 0; i < oldProds.length; i++) {
    const o = oldProds[i];
    const n = newProds[i];
    if (o.productName !== n.productName) return true;
    if (Number(o.quantity || 0) !== Number(n.quantity || 0)) return true;
    if (Number(o.price || 0) !== Number(n.price || 0)) return true;
    if (Number(o.total || o.subtotalAfterTax || 0) !== Number(n.total || n.subtotalAfterTax || 0)) return true;
    if (o.unit !== n.unit) return true;
  }
  return false;
}

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
  allDeliveries: any[] = [],
  userData?: any,
  allCustomers: any[] = []
) {

  const handleSendQuotationZns = useCallback(async (q: Quotation, targetPhoneOverride?: string) => {
    // 1. Ưu tiên tra cứu trực tiếp trong RAM (0ms) từ allCustomers
    const liveCust = allCustomers?.find(c => c.id === q.customerId || (c.maKh && c.maKh === q.customerId)) || null;
    let customerDoc: any = liveCust;
    let customerName = q.tenKhachHang || liveCust?.tenKhachHang;

    // 2. Fallback sang customerRepo nếu chưa nạp trong RAM
    if (!customerDoc && q.customerId) {
      try {
        customerDoc = await customerRepo.getById(q.customerId);
        if (customerDoc) {
          customerName = customerName || customerDoc.tenKhachHang;
        }
      } catch {
        // Fallback im lặng nếu offline
      }
    }

    const resolvedCustName = customerName || q.tenKhachHang || 'Khách hàng';

    // Thu thập tất cả SĐT di động hợp lệ có thể gửi ZNS
    const availableMobiles: Array<{ cleaned: string; formatted: string; carrier?: string }> = [];
    const seenMob = new Set<string>();

    const rawPhonesPool = [
      q.sdt,
      q.sdtPhu,
      q.soZaloMacDinh,
      ...(Array.isArray(q.danhSachSdt) ? q.danhSachSdt : []),
      ...(customerDoc ? [
        customerDoc.sdt,
        customerDoc.sdtPhu,
        customerDoc.soZaloMacDinh,
        ...(Array.isArray(customerDoc.danhSachSdt) ? customerDoc.danhSachSdt : []),
        ...(Array.isArray(customerDoc.contacts) ? customerDoc.contacts.map((ct: any) => ct?.sdt) : [])
      ] : [])
    ].filter(Boolean).join(' ');

    const extracted = extractVietnamesePhones(rawPhonesPool, q.diaChi || customerDoc?.diaChi);
    extracted.mobilePhones.forEach(m => {
      if (!seenMob.has(m.cleaned)) {
        seenMob.add(m.cleaned);
        availableMobiles.push(m);
      }
    });

    let phone: string | null = targetPhoneOverride ? targetPhoneOverride.replace(/\D/g, '') : null;

    if (!phone && availableMobiles.length > 1) {
      const phoneListStr = availableMobiles.map((p, idx) => `• ${p.formatted} (${p.carrier || 'Di động'})${idx === 0 ? ' [Số chính]' : ''}`).join('\n');
      const pickPrimary = await confirm({
        title: 'Lựa chọn số điện thoại nhận ZNS Báo Giá',
        message: `Khách hàng ${resolvedCustName} có ${availableMobiles.length} số điện thoại di động:\n\n${phoneListStr}\n\nBạn muốn gửi tin ZNS đến số nào?`,
        variant: 'info',
        confirmText: `Gửi đến ${availableMobiles[0].formatted}`,
        cancelText: `Gửi đến ${availableMobiles[1].formatted}`
      });
      phone = pickPrimary ? availableMobiles[0].cleaned : availableMobiles[1].cleaned;
    } else if (!phone) {
      const targetPhoneInfo = resolveZnsTargetPhone(q.soZaloMacDinh || q.sdt, q.danhSachSdt, customerDoc);
      phone = targetPhoneInfo.validPhone || (q.sdt ? q.sdt.replace(/\D/g, '') : null);
    }

    if (!q.id || !phone) {
      notify.error('Khách hàng thiếu SĐT di động hợp lệ để gửi tin ZNS');
      return;
    }

    const duplicateCheck = checkZnsResendAllowed(q as any, phone, userData?.role);
    const isResend = Boolean(duplicateCheck.isAlreadySent);
    
    if (isResend) {
      const confirmResend = await confirm({
        title: 'Xác nhận gửi lại ZNS Báo Giá',
        message: `Báo giá ${q.soPhieuBaoGia || q.id} đã từng được gửi ZNS đến số ${phone} trước đó. Bạn có chắc chắn muốn gửi lại tin nhắn ZNS cho khách hàng ${resolvedCustName} (${phone}) không?`,
        variant: 'info',
        confirmText: 'Gửi lại ZNS',
        cancelText: 'Hủy bỏ'
      });
      if (!confirmResend) return;
    } else if (!targetPhoneOverride) {
      if (!await confirm({ title: 'Gửi ZNS Báo Giá', message: `Gửi ZNS Báo giá đến khách hàng ${resolvedCustName} (${phone})?` })) return;
    }

    await sendZnsAndToast({
      entityId: q.id,
      entityType: 'QUOTATION',
      messageType: ZnsMessageType.BAOGIA,
      phone: phone,
      payload: {
        ...q,
        tenKhachHang: resolvedCustName,
        sdt: phone,
        phone: phone,
        soPhieuBaoGia: q.soPhieuBaoGia || q.maBaoGia || q.id
      },
      attemptBucket: nextAttempt(q.trangThaiGuiTinBaoGia || undefined),
      userRole: userData?.role,
      forceResend: isResend
    });
  }, [allCustomers, confirm, userData]);

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

        // Tự động hoàn trả trạng thái "Chờ gửi ZNS" nếu báo giá đã gửi tin thành công và có thay đổi nội dung thương mại cốt lõi
        const wasSentZns = isZnsSuccessStatus(editingQuotation.trangThaiGuiTinBaoGia) || 
          editingQuotation.trangThaiGuiTinBaoGia === EntityZnsStatus.THANH_CONG ||
          (editingQuotation as any).trangThaiZns === EntityZnsStatus.THANH_CONG;

        if (wasSentZns && detectCommercialCoreDelta(editingQuotation, data)) {
          data.trangThaiGuiTinBaoGia = EntityZnsStatus.CHO_GUI;
          const userOfficer = userData?.name || userData?.displayName || userData?.email || 'Chuyên viên';
          const nowStr = new Date().toISOString();
          const reasonNote = `Cập nhật nội dung thương mại báo giá sau khi đã gửi ZNS thành công bởi ${userOfficer}. Tự động chuyển về Chờ gửi ZNS để sẵn sàng gửi bản cập nhật mới nhất cho khách hàng.`;
          data.logTomTat = reasonNote;

          // Ghi nhận nhật ký phiên bản revision
          const revCount = (data.revisions || []).length;
          const resetRevision = {
            id: crypto.randomUUID(),
            name: `Phiên bản chỉnh sửa sau ZNS #${revCount + 1}`,
            note: reasonNote,
            createdAt: nowStr,
            createdBy: userOfficer,
            products: data.products || [],
            subTotal: data.subTotal || 0,
            discountRate: Number(data.discountRate) || 0,
            discountAmount: data.discountAmount || 0,
            vatRate: Number(data.vatRate) || 0,
            vatAmount: data.vatAmount || 0,
            totalAmount: data.totalAmount || 0
          };
          data.revisions = [...(data.revisions || []), resetRevision as any];

          // Đánh dấu cờ cần gửi lại trong thongTinGuiZnsBaoGia
          data.thongTinGuiZnsBaoGia = {
            ...(editingQuotation.thongTinGuiZnsBaoGia || {}),
            needsResendAfterEdit: true,
            lastEditedAt: nowStr,
            lastEditedBy: userOfficer,
            editReason: reasonNote
          };
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
  }, [createQuotation, updateQuotation, editingQuotation, setIsFormOpen, setEditingQuotation, allContracts, allPayments, allDeliveries, userData]);

  const handleDrawerSendZns = useCallback(async (targetPhoneOverride?: string) => {
    if (!drawerQuotation?.id) return;
    const parentCust = drawerCustomer || allCustomers?.find(c => c.id === drawerQuotation.customerId || (c.maKh && c.maKh === drawerQuotation.customerId));
    const custName = drawerQuotation.tenKhachHang || parentCust?.tenKhachHang || 'Khách hàng';

    // Thu thập tất cả SĐT di động hợp lệ
    const availableMobiles: Array<{ cleaned: string; formatted: string; carrier?: string }> = [];
    const seenMob = new Set<string>();

    const rawPhonesPool = [
      drawerQuotation.sdt,
      drawerQuotation.sdtPhu,
      drawerQuotation.soZaloMacDinh,
      ...(Array.isArray(drawerQuotation.danhSachSdt) ? drawerQuotation.danhSachSdt : []),
      ...(parentCust ? [
        parentCust.sdt,
        parentCust.sdtPhu,
        parentCust.soZaloMacDinh,
        ...(Array.isArray(parentCust.danhSachSdt) ? parentCust.danhSachSdt : []),
        ...(Array.isArray(parentCust.contacts) ? parentCust.contacts.map((ct: any) => ct?.sdt) : [])
      ] : [])
    ].filter(Boolean).join(' ');

    const extracted = extractVietnamesePhones(rawPhonesPool, drawerQuotation.diaChi || parentCust?.diaChi);
    extracted.mobilePhones.forEach(m => {
      if (!seenMob.has(m.cleaned)) {
        seenMob.add(m.cleaned);
        availableMobiles.push(m);
      }
    });

    let phone: string | null = targetPhoneOverride ? targetPhoneOverride.replace(/\D/g, '') : null;

    if (!phone && availableMobiles.length > 1) {
      const phoneListStr = availableMobiles.map((p, idx) => `• ${p.formatted} (${p.carrier || 'Di động'})${idx === 0 ? ' [Số chính]' : ''}`).join('\n');
      const pickPrimary = await confirm({
        title: 'Lựa chọn số điện thoại nhận ZNS Báo Giá',
        message: `Khách hàng ${custName} có ${availableMobiles.length} số điện thoại di động:\n\n${phoneListStr}\n\nBạn muốn gửi tin ZNS đến số nào?`,
        variant: 'info',
        confirmText: `Gửi đến ${availableMobiles[0].formatted}`,
        cancelText: `Gửi đến ${availableMobiles[1].formatted}`
      });
      phone = pickPrimary ? availableMobiles[0].cleaned : availableMobiles[1].cleaned;
    } else if (!phone) {
      const targetPhoneInfo = resolveZnsTargetPhone(drawerQuotation.soZaloMacDinh || drawerQuotation.sdt, drawerQuotation.danhSachSdt, parentCust);
      phone = targetPhoneInfo.validPhone || (drawerQuotation.sdt ? drawerQuotation.sdt.replace(/\D/g, '') : null);
    }

    if (!phone) {
       notify.error('Khách hàng thiếu SĐT di động hợp lệ để gửi tin ZNS');
       return;
    }

    const duplicateCheck = checkZnsResendAllowed(drawerQuotation as any, phone, userData?.role);
    const isResend = Boolean(duplicateCheck.isAlreadySent);

    if (isResend) {
      const confirmResend = await confirm({
        title: 'Xác nhận gửi lại ZNS Báo Giá',
        message: `Báo giá ${drawerQuotation.soPhieuBaoGia || drawerQuotation.id} đã từng được gửi ZNS đến số ${phone} trước đó. Bạn có chắc chắn muốn gửi lại tin nhắn ZNS cho khách hàng ${custName} (${phone}) không?`,
        variant: 'info',
        confirmText: 'Gửi lại ZNS',
        cancelText: 'Hủy bỏ'
      });
      if (!confirmResend) return;
    } else if (!targetPhoneOverride) {
      if (!await confirm({ title: 'Gửi ZNS Báo Giá', message: `Gửi ZNS Báo giá đến khách hàng ${custName} (${phone})?` })) return;
    }

    await sendZnsAndToast({
      entityId: drawerQuotation.id,
      entityType: 'QUOTATION',
      messageType: ZnsMessageType.BAOGIA,
      phone: phone,
      payload: {
        ...drawerQuotation,
        tenKhachHang: custName,
        sdt: phone,
        phone: phone,
        soPhieuBaoGia: drawerQuotation.soPhieuBaoGia || drawerQuotation.maBaoGia || drawerQuotation.id
      },
      attemptBucket: nextAttempt(drawerQuotation.trangThaiGuiTinBaoGia || undefined),
      userRole: userData?.role,
      forceResend: isResend
    });
  }, [drawerQuotation, drawerCustomer, allCustomers, confirm, userData]);

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
