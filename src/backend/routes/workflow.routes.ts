import { Router } from 'express';
import { adminDb, toTableName } from '../config/supabase.admin';
import { canCreatePayment, canCreateDelivery } from '../../domain/policy/gate.policy';
import { checkQuotationLock, checkPaymentLock, checkCustomerLock } from '../../domain/policy/lock.policy';
import { canCreateContract, checkContractLock } from '../../modules/contracts/domain/ContractPolicy';
import { eventBus } from '../../platform/events/EventBus';
import { validateDocumentUpdate } from '../../domain/policy/document-integrity.policy';
import { sequenceGeneratorService } from '../services/workflow/sequence-generator.service';
import { normalizeLoai } from '../../domain/enums/quotation-loai';
import crypto from 'crypto';

export function normalizeEntityType(entityType: string): string {
  const lower = (entityType || '').toLowerCase().trim();
  if (lower === 'quotations' || lower === 'quotation') return 'quotation';
  if (lower === 'contracts' || lower === 'contract') return 'contract';
  if (lower === 'payments' || lower === 'payment') return 'payment';
  if (lower === 'deliveries' || lower === 'delivery') return 'delivery';
  if (lower === 'customers' || lower === 'customer') return 'customer';
  return lower;
}

const router = Router();

// Universal Sequence Engine (USE) - Atomic sequence code generator (Hỗ trợ cả GET và POST)
router.all('/next-code/:entityType', async (req, res) => {
  try {
    const rawType = req.params.entityType;
    const params = { ...(req.query || {}), ...(req.body || {}) };
    const { loai, year, prefix } = params;
    const code = await sequenceGeneratorService.getNextCode(rawType, {
      loai: loai as string,
      year: year ? Number(year) : undefined,
      prefix: prefix as string
    });
    return res.json({ success: true, code });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || String(error) });
  }
});

// Add hard-gated creation routes

router.post('/create/:entityType', async (req, res) => {
  try {
    const rawType = req.params.entityType;
    const entityType = normalizeEntityType(rawType);
    const { data, requestId } = req.body;
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    
    if (!data) return res.status(400).json({ error: "Missing payload data" });

    let idempotencyRef = null;
    if (requestId) {
      idempotencyRef = adminDb.collection('idempotencyKeys').doc(requestId);
      const idempotencyDoc = await idempotencyRef.get();
      if (idempotencyDoc.exists) {
        return res.json({ 
          success: true, 
          id: idempotencyDoc.data()?.entityId,
          duplicate: true,
          message: "Request already processed"
        });
      }
    }

    if (entityType === 'quotation') {
      if (!data.customerId) return res.status(422).json({ error: "Phải chọn khách hàng trước khi tạo Báo giá." });
      
      const customerDoc = await adminDb.collection('customers').doc(data.customerId).get();
      if (!customerDoc.exists) return res.status(404).json({ error: "Customer not found." });
      
      // Auto snapshot
      const customerData = customerDoc.data();
      data.maKh = customerData?.maKh || '';
      data.tenKhachHang = customerData?.tenKhachHang || '';
      data.sdt = customerData?.sdt || '';
      data.nguoiDaiDien = customerData?.nguoiDaiDien || '';
      
      const newRef = data.id ? adminDb.collection('quotations').doc(data.id) : adminDb.collection('quotations').doc();
      const batch = adminDb.batch();
      batch.set(newRef, { ...data, id: newRef.id, createdAt: new Date().toISOString(), deletedAt: null });
      if (idempotencyRef) batch.set(idempotencyRef, { entityId: newRef.id, timestamp: new Date().toISOString() });
      
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { action: 'CREATE', entityId: newRef.id, entityType: 'quotations', details: data, userId: req.body.userId || 'system', correlationId, timestamp: new Date().toISOString() });
      await batch.commit();
      return res.json({ success: true, id: newRef.id });
    }

    if (entityType === 'contract') {
      if (!data.quotationId) return res.status(422).json({ error: "Thiếu reference quotationId." });
      const quoDoc = await adminDb.collection('quotations').doc(data.quotationId).get();
      if (!quoDoc.exists) return res.status(404).json({ error: "Quotation not found" });
      
      const gateResult = canCreateContract(quoDoc.data() as any);
      if (!gateResult.allowed) return res.status(422).json({ error: gateResult.reason });
      
      if (!data.tinhThanh && data.customerId) {
        const cusDoc = await adminDb.collection('customers').doc(data.customerId).get();
        if (cusDoc.exists) {
          data.tinhThanh = cusDoc.data()?.tinhThanh || '';
        }
      }

      const newRef = data.id ? adminDb.collection('contracts').doc(data.id) : adminDb.collection('contracts').doc();
      const batch = adminDb.batch();
      batch.set(newRef, { ...data, id: newRef.id, createdAt: new Date().toISOString(), deletedAt: null });
      if (idempotencyRef) batch.set(idempotencyRef, { entityId: newRef.id, timestamp: new Date().toISOString() });

      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { action: 'CREATE', entityId: newRef.id, entityType: 'contracts', details: data, userId: req.body.userId || 'system', correlationId, timestamp: new Date().toISOString() });
      await batch.commit();
      return res.json({ success: true, id: newRef.id });
    }

    if (entityType === 'payment') {
      const sourceId = data.quotationId || data.contractId;
      if (!sourceId) return res.status(422).json({ error: "Thiếu reference quotationId hoặc contractId." });
      
      const sourceRef = data.contractId 
        ? adminDb.collection('contracts').doc(data.contractId) 
        : adminDb.collection('quotations').doc(data.quotationId);
        
      const sourceDoc = await sourceRef.get();
      if (!sourceDoc.exists) return res.status(404).json({ error: "Source not found" });
      
      const gateResult = canCreatePayment(sourceDoc.data() as any);
      if (!gateResult.allowed) return res.status(422).json({ error: gateResult.reason });
      
      // Clean up foreign keys and ensure valid snapshot data
      const sourceData: any = sourceDoc.data() || {};
      if (!data.customerId || !String(data.customerId).trim()) {
        data.customerId = sourceData.customerId || sourceData.customer_id || data.customerId;
      }
      if (!data.contractId || !String(data.contractId).trim()) {
        data.contractId = null;
      }
      if (!data.quotationId || !String(data.quotationId).trim()) {
        data.quotationId = null;
      }

      // Ensure classification is properly recorded
      if (data.contractId) {
        data.phanLoai = data.phanLoai || 'BG Máy';
        data.loai = data.loai || 'BG Máy';
      } else if (data.quotationId) {
        const normLoai = normalizeLoai(data.phanLoai || data.loai || sourceData.phanLoai || sourceData.loai || sourceData.loaiBaoGia) || 'BG Vật tư';
        data.phanLoai = normLoai;
        data.loai = normLoai;
      }

      const newRef = data.id ? adminDb.collection('payments').doc(data.id) : adminDb.collection('payments').doc();
      const batch = adminDb.batch();
      batch.set(newRef, { ...data, id: newRef.id, createdAt: new Date().toISOString(), deletedAt: null });
      if (idempotencyRef) batch.set(idempotencyRef, { entityId: newRef.id, timestamp: new Date().toISOString() });

      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { action: 'CREATE', entityId: newRef.id, entityType: 'payments', details: data, userId: req.body.userId || 'system', correlationId, timestamp: new Date().toISOString() });
      await batch.commit();
      return res.json({ success: true, id: newRef.id });
    }

    if (entityType === 'delivery') {
      if (!data.paymentId) return res.status(422).json({ error: "Thiếu reference paymentId." });
      const payDoc = await adminDb.collection('payments').doc(data.paymentId).get();
      if (!payDoc.exists) return res.status(404).json({ error: "Payment not found" });
      
      const payData = payDoc.data() as any;
      const gateResult = canCreateDelivery(payData);
      if (!gateResult.allowed) return res.status(422).json({ error: gateResult.reason });

      // Kiểm tra số lượng giao hàng (Hỗ trợ nhiều đợt giao, ngăn giao vượt số lượng)
      const targetSource = payData.contractId 
        ? await adminDb.collection('contracts').doc(payData.contractId).get()
        : (payData.quotationId ? await adminDb.collection('quotations').doc(payData.quotationId).get() : null);
      
      const sourceObj = (targetSource && targetSource.exists ? targetSource.data() : null) || payData;
      const srcProducts: any[] = sourceObj?.products || payData.products || [];
      
      if (srcProducts.length > 0) {
        const existingDeliveriesSnap = await adminDb.collection('deliveries')
          .where('paymentId', '==', data.paymentId)
          .get();
        
        const existingDeliveries = existingDeliveriesSnap.docs
          .map((d: any) => ({ id: d.id, ...d.data() }))
          .filter((d: any) => !d.deletedAt && d.tinhTrangGiaoHang !== 'HỦY' && d.tinhTrangGiaoHang !== 'Hủy' && d.id !== data.id);

        const currentDeliveredMap: Record<string, number> = {};
        existingDeliveries.forEach((d: any) => {
          (d.products || []).forEach((dp: any, idx: number) => {
            const key = dp.id || dp.productId || dp.productName || String(idx);
            currentDeliveredMap[key] = (currentDeliveredMap[key] || 0) + Number(dp.quantity || 0);
          });
        });

        let totalContracted = 0;
        let totalDelivered = 0;
        let hasOverDelivered = false;
        let overItemName = '';

        const newShipmentItems = Array.isArray(data.products) && data.products.length > 0 ? data.products : [];

        for (const [index, cp] of srcProducts.entries()) {
          const key = cp.id || cp.productId || cp.productName || String(index);
          const cQty = Number(cp.quantity || 0);
          totalContracted += cQty;
          const prevDelivered = currentDeliveredMap[key] || 0;
          totalDelivered += prevDelivered;

          const newQty = (newShipmentItems.find((np: any, nIdx: number) => (np.id || np.productId || np.productName || String(nIdx)) === key)?.quantity) || 0;
          const remaining = Math.max(0, cQty - prevDelivered);
          if (newQty > remaining) {
            hasOverDelivered = true;
            overItemName = `${cp.productName || key} (còn lại: ${remaining}, yêu cầu: ${newQty})`;
            break;
          }
        }

        if (totalDelivered >= totalContracted && totalContracted > 0) {
          return res.status(422).json({ error: "Chứng từ thanh toán này đã được giao đủ 100% số lượng sản phẩm, không thể tạo thêm phiếu giao hàng." });
        }

        if (hasOverDelivered) {
          return res.status(422).json({ error: `Giao vượt số lượng cho phép: ${overItemName}` });
        }
      }
      
      const newRef = data.id ? adminDb.collection('deliveries').doc(data.id) : adminDb.collection('deliveries').doc();
      const batch = adminDb.batch();
      batch.set(newRef, { ...data, id: newRef.id, createdAt: new Date().toISOString(), deletedAt: null });
      if (idempotencyRef) batch.set(idempotencyRef, { entityId: newRef.id, timestamp: new Date().toISOString() });

      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { action: 'CREATE', entityId: newRef.id, entityType: 'deliveries', details: data, userId: req.body.userId || 'system', correlationId, timestamp: new Date().toISOString() });
      await batch.commit();
      return res.json({ success: true, id: newRef.id });
    }

    // Default fallback with plural table mapping
    const targetTable = toTableName(entityType);
    const newRef = data.id ? adminDb.collection(targetTable).doc(data.id) : adminDb.collection(targetTable).doc();
    const batch = adminDb.batch();
    batch.set(newRef, { ...data, id: newRef.id, createdAt: new Date().toISOString(), deletedAt: null });
    if (idempotencyRef) batch.set(idempotencyRef, { entityId: newRef.id, timestamp: new Date().toISOString() });
    
    const auditRef = adminDb.collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'CREATE',
      entityId: newRef.id,
      entityType: targetTable,
      details: data,
      userId: req.body.userId || 'system',
      correlationId,
      timestamp: new Date().toISOString(),
    });
    
    await batch.commit();
    return res.json({ success: true, id: newRef.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

router.put('/update/:entityType/:id', async (req, res) => {
  try {
    const rawType = req.params.entityType;
    const entityType = normalizeEntityType(rawType);
    const targetTable = toTableName(entityType);
    const { id } = req.params;
    const { data } = req.body;
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
    if (!id || !data) return res.status(400).json({ error: "Missing ID or data" });

    // Fetch before updating for auditing and optimistic control
    const docSnap = await adminDb.collection(targetTable).doc(id).get();
    if (!docSnap.exists) return res.status(404).json({ error: "Not found" });
    const oldDoc: any = docSnap.data();

    // Check Optimistic Concurrency if requested
    const beforeUpdatedAt = oldDoc.updatedAt || oldDoc.ngayCapNhat || oldDoc.updated_at;
    if (data.lastKnownUpdatedAt && beforeUpdatedAt) {
      const tClient = new Date(data.lastKnownUpdatedAt).getTime();
      const tServer = new Date(beforeUpdatedAt).getTime();
      // Chỉ xung đột nếu cả 2 timestamp hợp lệ, chênh lệch trên 3 giây và người sửa gần nhất khác người dùng hiện tại
      const isDifferentUser = oldDoc.updatedBy && req.body.userId && oldDoc.updatedBy !== req.body.userId;
      if (!isNaN(tClient) && !isNaN(tServer) && Math.abs(tClient - tServer) > 3000 && isDifferentUser) {
        return res.status(409).json({ error: "CONCURRENCY_CONFLICT", message: "Concurrent modification detected." });
      }
    }

    // Validate locks only for specific entities before update
    if (entityType === 'quotation') {
      const linkedContractsSnap = await adminDb.collection('contracts').where('quotationId', '==', id).get();
      const linkedPaymentsSnap = await adminDb.collection('payments').where('quotationId', '==', id).get();
      const linkedDeliveriesSnap = await adminDb.collection('deliveries').where('quotationId', '==', id).get();
      
      const hasLinkedChildren = linkedContractsSnap.docs.length > 0 || linkedPaymentsSnap.docs.length > 0 || linkedDeliveriesSnap.docs.length > 0;
      const validation = validateDocumentUpdate('quotation', oldDoc, data, hasLinkedChildren);
      if (!validation.canUpdate) {
        return res.status(422).json({ error: validation.reason, forbiddenFieldsChanged: validation.forbiddenFieldsChanged });
      }
    } else if (entityType === 'contract') {
      const linkedPaymentsSnap = await adminDb.collection('payments').where('contractId', '==', id).get();
      const linkedDeliveriesSnap = await adminDb.collection('deliveries').where('contractId', '==', id).get();
      
      const hasLinkedChildren = linkedPaymentsSnap.docs.length > 0 || linkedDeliveriesSnap.docs.length > 0;
      const validation = validateDocumentUpdate('contract', oldDoc, data, hasLinkedChildren);
      if (!validation.canUpdate) {
        return res.status(422).json({ error: validation.reason, forbiddenFieldsChanged: validation.forbiddenFieldsChanged });
      }
    } else if (entityType === 'payment') {
      const linkedDeliveriesSnap = await adminDb.collection('deliveries').where('paymentId', '==', id).get();
      
      const hasLinkedChildren = linkedDeliveriesSnap.docs.length > 0;
      const validation = validateDocumentUpdate('payment', oldDoc, data, hasLinkedChildren);
      if (!validation.canUpdate) {
        return res.status(422).json({ error: validation.reason, forbiddenFieldsChanged: validation.forbiddenFieldsChanged });
      }
    }

    // Process Update
    const batch = adminDb.batch();
    batch.update(adminDb.collection(targetTable).doc(id), data);
    
    // Custom audit log structure bypasses normal auditLogger.log to use the same batch
    const auditRef = adminDb.collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'UPDATE',
      entityId: id,
      entityType: targetTable,
      details: { before: oldDoc, after: data },
      userId: req.body.userId || 'system',
      correlationId,
      timestamp: new Date().toISOString(),
    });

    await batch.commit();
    return res.json({ success: true });
    
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

function emitDomainEvent(eventName: string, payload: Record<string, any>) {
  eventBus.publish({
    eventId: crypto.randomUUID(),
    eventName,
    occurredOn: new Date(),
    ...payload
  });
}

router.delete('/delete/:entityType/:id', async (req, res) => {
  try {
    const rawType = req.params.entityType;
    const entityType = normalizeEntityType(rawType);
    const id = req.params.id;
    const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();

    const effectiveUserId = req.body?.userId || (req as any).user?.uid;
    const isInternalAuth = Boolean(req.headers['x-internal-admin'] && req.headers['x-internal-admin'] === process.env.CRON_SECRET);
    const isTestEnv = process.env.NODE_ENV === 'test';

    let userId = effectiveUserId;
    if (!userId) {
      if (isTestEnv || isInternalAuth) {
        userId = 'system';
      } else {
        return res.status(401).json({
          error: 'Yêu cầu xác thực danh tính người dùng trước khi thực hiện thao tác xóa.',
          unauthorized: true
        });
      }
    }

    // Zero-Trust Backend RBAC Guard: Server-enforced role verification
    if (userId !== 'system') {
      let userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        // Fallback kiểm tra qua username hoặc email
        const userByUsername = await adminDb.collection('users').where('username', '==', userId).get();
        if (!userByUsername.empty) {
          userDoc = userByUsername.docs[0];
        } else {
          const userByEmail = await adminDb.collection('users').where('email', '==', userId).get();
          if (!userByEmail.empty) {
            userDoc = userByEmail.docs[0];
          }
        }
      }

      if (userDoc.exists) {
        const uData = userDoc.data();
        if (uData?.role === 'Chuyên viên') {
          return res.status(403).json({
            error: 'Bạn không có quyền xóa chứng từ này. Vui lòng liên hệ Administrator hoặc Ban Giám Đốc.',
            forbidden: true
          });
        }
      }
    }

    if (entityType === 'quotation') {
      const docSnap = await adminDb.collection('quotations').doc(id).get();
      if (!docSnap.exists) return res.json({ success: true });
      const oldQ: any = docSnap.data();

      const linkedContractsSnap = await adminDb.collection('contracts').where('quotationId', '==', id).get();
      const linkedPaymentsSnap = await adminDb.collection('payments').where('quotationId', '==', id).get();
      const linkedDeliveriesSnap = await adminDb.collection('deliveries').where('quotationId', '==', id).get();
      
      const lock = checkQuotationLock(
        oldQ,
        linkedContractsSnap.docs.map(d => d.data() as any),
        linkedPaymentsSnap.docs.map(d => d.data() as any),
        linkedDeliveriesSnap.docs.map(d => d.data() as any)
      );

      if (lock.locked) {
        return res.status(422).json({ 
          error: lock.reason, 
          reason: lock.reason,
          blockingDocuments: lock.blockingDocuments,
          detailedBlocks: lock.detailedBlocks
        });
      }

      const batch = adminDb.batch();
      batch.update(adminDb.collection('quotations').doc(id), {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        isDeleted: true
      });
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { 
        action: 'DELETE', 
        entityId: id, 
        entityType: 'quotations', 
        details: { deleted: true, snapshot: oldQ }, 
        userId, 
        timestamp: new Date().toISOString() 
      });
      await batch.commit();

      emitDomainEvent('QuotationDeleted', { quotationId: id, userId });
      return res.json({ success: true });
    }

    if (entityType === 'contract') {
      const docSnap = await adminDb.collection('contracts').doc(id).get();
      if (!docSnap.exists) return res.json({ success: true });
      const oldContract: any = docSnap.data();

      const linkedPaymentsSnap = await adminDb.collection('payments').where('contractId', '==', id).get();
      const linkedDeliveriesSnap = await adminDb.collection('deliveries').where('contractId', '==', id).get();
      
      const lock = checkContractLock(
        oldContract,
        linkedPaymentsSnap.docs.map(d => d.data() as any),
        linkedDeliveriesSnap.docs.map(d => d.data() as any)
      );

      if (lock.locked) {
        return res.status(422).json({ 
          error: lock.reason, 
          reason: lock.reason,
          blockingDocuments: lock.blockingDocuments,
          detailedBlocks: lock.detailedBlocks
        });
      }

      const batch = adminDb.batch();
      batch.update(adminDb.collection('contracts').doc(id), {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        isDeleted: true
      });
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { 
        action: 'DELETE', 
        entityId: id, 
        entityType: 'contracts', 
        details: { deleted: true, snapshot: oldContract }, 
        userId, 
        timestamp: new Date().toISOString() 
      });
      await batch.commit();

      emitDomainEvent('ContractDeleted', { 
        contractId: id, 
        quotationId: oldContract.quotationId, 
        soHopDong: oldContract.soHopDong,
        userId 
      });
      return res.json({ success: true });
    }

    if (entityType === 'payment') {
      const docSnap = await adminDb.collection('payments').doc(id).get();
      if (!docSnap.exists) return res.json({ success: true });
      const oldPayment: any = docSnap.data();

      const linkedDeliveriesSnap = await adminDb.collection('deliveries').where('paymentId', '==', id).get();
      
      const lock = checkPaymentLock(
        oldPayment,
        linkedDeliveriesSnap.docs.map(d => d.data() as any)
      );

      if (lock.locked) {
        return res.status(422).json({ 
          error: lock.reason, 
          reason: lock.reason,
          blockingDocuments: lock.blockingDocuments,
          detailedBlocks: lock.detailedBlocks
        });
      }

      const batch = adminDb.batch();
      batch.update(adminDb.collection('payments').doc(id), {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        isDeleted: true
      });
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { 
        action: 'DELETE', 
        entityId: id, 
        entityType: 'payments', 
        details: { deleted: true, snapshot: oldPayment }, 
        userId, 
        timestamp: new Date().toISOString() 
      });
      await batch.commit();

      emitDomainEvent('PaymentDeleted', { 
        paymentId: id, 
        contractId: oldPayment.contractId, 
        quotationId: oldPayment.quotationId,
        amount: Number(oldPayment.soTien || oldPayment.amount || 0),
        userId 
      });
      return res.json({ success: true });
    }

    if (entityType === 'delivery') {
      const docSnap = await adminDb.collection('deliveries').doc(id).get();
      if (!docSnap.exists) return res.json({ success: true });
      const oldDelivery: any = docSnap.data();

      // Rule 9: Giao hàng đã hoàn tất thì không được xóa
      if (oldDelivery.tinhTrangGiaoHang === 'HOAN_TAT' || oldDelivery.tinhTrangGiaoHang === 'Hoàn tất' || oldDelivery.ngayGiaoThucTe) {
        return res.status(422).json({
          error: `Phiếu giao hàng ${oldDelivery.deliveryId || id} đã hoàn tất hoặc đã có ngày giao thực tế, không thể xóa!`,
          reason: 'Kho hàng đã thực xuất và khách đã ký nhận, không được xóa để tránh thất thoát kho.',
          blockingDocuments: [`Giao hàng: ${oldDelivery.deliveryId || id}`]
        });
      }

      const batch = adminDb.batch();
      batch.update(adminDb.collection('deliveries').doc(id), {
        deletedAt: new Date().toISOString(),
        deletedBy: userId,
        isDeleted: true
      });
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { 
        action: 'DELETE', 
        entityId: id, 
        entityType: 'deliveries', 
        details: { deleted: true, snapshot: oldDelivery }, 
        userId, 
        timestamp: new Date().toISOString() 
      });
      await batch.commit();

      emitDomainEvent('DeliveryDeleted', { 
        deliveryId: id, 
        contractId: oldDelivery.contractId, 
        quotationId: oldDelivery.quotationId,
        products: oldDelivery.products || [],
        userId 
      });
      return res.json({ success: true });
    }

    if (entityType === 'customer') {
      const docSnap = await adminDb.collection('customers').doc(id).get();
      if (!docSnap.exists) return res.json({ success: true });
      const oldCustomer: any = docSnap.data();

      const [quotesSnap, contractsSnap, paymentsSnap, deliveriesSnap] = await Promise.all([
        adminDb.collection('quotations').where('customerId', '==', id).get(),
        adminDb.collection('contracts').where('customerId', '==', id).get(),
        adminDb.collection('payments').where('customerId', '==', id).get(),
        adminDb.collection('deliveries').where('customerId', '==', id).get(),
      ]);

      const lock = checkCustomerLock(
        oldCustomer,
        quotesSnap.docs.map(d => d.data() as any),
        contractsSnap.docs.map(d => d.data() as any),
        paymentsSnap.docs.map(d => d.data() as any),
        deliveriesSnap.docs.map(d => d.data() as any)
      );

      if (lock.locked) {
        return res.status(422).json({ 
          error: lock.reason, 
          reason: lock.reason,
          blockingDocuments: lock.blockingDocuments,
          detailedBlocks: lock.detailedBlocks
        });
      }

      const batch = adminDb.batch();
      batch.delete(adminDb.collection('customers').doc(id));
      const auditRef = adminDb.collection('auditLogs').doc();
      batch.set(auditRef, { 
        action: 'DELETE', 
        entityId: id, 
        entityType: 'customers', 
        details: { deleted: true, snapshot: oldCustomer }, 
        userId, 
        timestamp: new Date().toISOString() 
      });
      await batch.commit();

      emitDomainEvent('CustomerDeleted', { customerId: id, userId });
      return res.json({ success: true });
    }

    // Default cleanup for other collections
    const targetTable = toTableName(entityType);
    const docSnap = await adminDb.collection(targetTable).doc(id).get();
    if (!docSnap.exists) return res.json({ success: true });
    
    const batch = adminDb.batch();
    batch.delete(adminDb.collection(targetTable).doc(id));
    
    const auditRef = adminDb.collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'DELETE',
      entityId: id,
      entityType: targetTable,
      details: { deleted: true },
      userId,
      correlationId,
      timestamp: new Date().toISOString(),
    });
    
    await batch.commit();
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

router.post('/check-gate', async (req, res) => {
  try {
    const { targetEntity, parentId, parentDocType: requestedParentDocType } = req.body;
    if (!targetEntity || !parentId) {
      return res.status(400).json({ error: "Missing TargetEntity or parentId" });
    }

    let parentDocType = requestedParentDocType;
    let validatorFunc: ((data: unknown) => { allowed: boolean; reason?: string }) | null = null; 

    if (targetEntity === 'CONTRACT') {
      parentDocType = 'quotations';
      validatorFunc = canCreateContract as unknown as (data: unknown) => { allowed: boolean; reason?: string };
    } else if (targetEntity === 'PAYMENT') {
      parentDocType = parentDocType || 'contracts';
      validatorFunc = canCreatePayment as unknown as (data: unknown) => { allowed: boolean; reason?: string };
    } else if (targetEntity === 'DELIVERY') {
      if (requestedParentDocType === 'contracts' || requestedParentDocType === 'quotations') {
         const filterField = requestedParentDocType === 'contracts' ? 'contractId' : 'quotationId';
         const paymentsSnap = await adminDb.collection('payments').where(filterField, '==', parentId).get();
         let isAllowed = false;
         for (const d of paymentsSnap.docs) {
            if (canCreateDelivery(d.data() as any).allowed) {
               isAllowed = true; break;
            }
         }
         
         const checkResult = {
            allowed: isAllowed,
            reason: paymentsSnap.empty ? `Không có phiếu thanh toán liên kết.` : `Phải có ít nhất 1 ZNS Thanh toán THÀNH CÔNG trước khi tạo Giao hàng.`
         };
         
         if (checkResult.allowed) return res.json({ action: 'ALLOW' });
         
         const settingsSnap = await adminDb.collection('settings').doc('gate_policy').get();
         const settings = settingsSnap.exists ? settingsSnap.data() : {};
         const level = settings?.['DELIVERY'] || 'STRICT';
         let action = 'BLOCK';
         if (level === 'WARNING') action = 'WARN';
         if (level === 'BYPASS') action = 'ASK_REASON';
         return res.json({ action, reason: checkResult.reason });
      }

      parentDocType = 'payments';
      validatorFunc = canCreateDelivery as unknown as (data: unknown) => { allowed: boolean; reason?: string };
    } else {
       return res.status(400).json({ error: "Unsupported target entity" });
    }

    const docSnapshot = await adminDb.collection(parentDocType).doc(parentId).get();
    if (!docSnapshot.exists) {
      return res.status(404).json({ error: "Parent entity not found" });
    }

    const parentData = docSnapshot.data();
    const checkResult = validatorFunc(parentData);

    if (checkResult.allowed) {
      return res.json({ action: 'ALLOW' });
    }

    // If not allowed, check policy level
    const settingsSnap = await adminDb.collection('settings').doc('gate_policy').get();
    const settings = settingsSnap.exists ? settingsSnap.data() : {};
    
    // Default to STRICT
    const level = settings?.[targetEntity] || 'STRICT'; // 'STRICT' | 'WARNING' | 'BYPASS'

    let action = 'BLOCK';
    if (level === 'WARNING') action = 'WARN';
    if (level === 'BYPASS') action = 'ASK_REASON';

    return res.json({ action, reason: checkResult.reason });

  } catch (error: unknown) { 
    console.error("Gate check error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/log-bypass', async (req, res) => {
  try {
    const { targetEntity, parentId, reason, userEmail } = req.body;
    await adminDb.collection('gateBypasses').add({
      targetEntity,
      parentId,
      reason,
      userEmail,
      timestamp: new Date().toISOString()
    });
    return res.json({ success: true });
  } catch (error: unknown) { 
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/notifications/mark-read', async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "Missing notification id" });
    await adminDb.collection('notifications').doc(id).set({
      is_read: true,
      read: true,
      isRead: true
    }, { merge: true });
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

router.post('/notifications/mark-all-read', async (req, res) => {
  try {
    const { ids } = req.body;
    if (Array.isArray(ids) && ids.length > 0) {
      const batch = adminDb.batch();
      for (const id of ids) {
        const ref = adminDb.collection('notifications').doc(id);
        batch.set(ref, { is_read: true, read: true, isRead: true }, { merge: true });
      }
      await batch.commit();
    } else {
      const snap = await adminDb.collection('notifications').where('is_read', '==', false).get();
      const batch = adminDb.batch();
      snap.docs.forEach((d: any) => {
        batch.set(d.ref, { is_read: true, read: true, isRead: true }, { merge: true });
      });
      await batch.commit();
    }
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || String(error) });
  }
});

export default router;
