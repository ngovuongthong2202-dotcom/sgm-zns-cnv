import { Router } from 'express';
import { adminDb } from '../config/supabase.admin';
import { cronService } from '../services/cron/cron.service';
import { normalizePhoneVN } from '../../shared/utils/phone';
import { aiService } from '../../modules/reporting/ai';
import { sequenceGeneratorService } from '../services/workflow/sequence-generator.service';

const router = Router();

router.post('/generate-makh', async (req, res) => {
  try {
    const maKh = await sequenceGeneratorService.getNextCode('customer');
    return res.json({ success: true, maKh });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/check-duplicate', async (req, res) => {
  try {
    const { phone, taxId } = req.body;
    
    if (!phone && !taxId) {
      return res.status(400).json({ success: false, error: 'Phone or Tax ID is required' });
    }

    const normalizedPhone = phone ? normalizePhoneVN(phone) : null;
    const normalizedTaxId = taxId ? String(taxId).trim().replace(/\s+/g, '') : null;
    
    const customersRef = adminDb.collection('customers');
    const duplicateCandidates: any[] = [];
    
    const isCandidateActive = (d: any) => !d.isArchived && !d.deletedAt && !d.mergedInto && !(d.tenKhachHang && String(d.tenKhachHang).startsWith('[ĐÃ GỘP VÀO'));

    // Check by Phone
    if (normalizedPhone) {
      const phoneSnap = await customersRef.where('sdt', '==', normalizedPhone).get();
      phoneSnap.docs.forEach(doc => {
        const d = doc.data();
        if (isCandidateActive(d)) {
          duplicateCandidates.push({ id: doc.id, ...d });
        }
      });
      if (phone !== normalizedPhone) {
        const rawPhoneSnap = await customersRef.where('sdt', '==', phone).get();
        rawPhoneSnap.docs.forEach(doc => {
          const d = doc.data();
          if (isCandidateActive(d) && !duplicateCandidates.find(c => c.id === doc.id)) {
            duplicateCandidates.push({ id: doc.id, ...d });
          }
        });
      }
    }

    if (normalizedTaxId) {
      const taxSnap = await customersRef.where('maSoThue', '==', normalizedTaxId).get();
      taxSnap.docs.forEach(doc => {
        const d = doc.data();
        if (isCandidateActive(d) && !duplicateCandidates.find(c => c.id === doc.id)) {
          duplicateCandidates.push({ id: doc.id, ...d });
        }
      });
    }

    return res.json({ success: true, duplicates: duplicateCandidates });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/merge', async (req, res) => {
  try {
    const { targetCustomerId, sourceCustomerIds, userEmail, mergedContacts, mergedCustomerCodes } = req.body;
    if (!targetCustomerId || !sourceCustomerIds || !sourceCustomerIds.length) {
      return res.status(400).json({ success: false, error: 'Invalid parameters for merge' });
    }

    const batch = adminDb.batch();
    const sourceCustomersSnap = await Promise.all(
      sourceCustomerIds.map((id: string) => adminDb.collection('customers').doc(id).get())
    );

    const sourceCustomersSnapshotsData: Record<string, any> = {};
    const updatedTags: string[] = [];
    
    // Process sources: archive source profiles and capture previous snapshot
    sourceCustomersSnap.forEach(snap => {
      if (snap.exists) {
        const data = snap.data() || {};
        sourceCustomersSnapshotsData[snap.id] = data;
        batch.update(snap.ref, {
          isArchived: true,
          mergedInto: targetCustomerId,
          ngayCapNhat: new Date().toISOString()
        });
        if (data?.tags) {
          updatedTags.push(...data.tags);
        }
      }
    });

    const targetCustomerSnap = await adminDb.collection('customers').doc(targetCustomerId).get();
    if (!targetCustomerSnap.exists) {
      return res.status(404).json({ success: false, error: 'Target customer not found' });
    }
    const tgtData = targetCustomerSnap.data() || {};
    const targetMaKh = tgtData.maKh || '';

    // Track all affected child documents for exact rollback capability
    const affectedQuotations: Array<{ id: string; previousCustomerId: string; previousMaKh: string }> = [];
    const affectedContracts: Array<{ id: string; previousCustomerId: string; previousMaKh: string }> = [];
    const affectedPayments: Array<{ id: string; previousCustomerId: string; previousMaKh: string; installmentsCount?: number }> = [];
    const affectedDeliveries: Array<{ id: string; previousCustomerId: string; previousMaKh: string; shipmentsCount?: number }> = [];

    // Deep Cascading Customer Merge: Reassign active child documents WITHOUT OVERWRITING historic contact/phone snapshots
    for (const srcId of sourceCustomerIds) {
      const srcData = sourceCustomersSnapshotsData[srcId] || {};
      const srcMaKh = srcData.maKh || '';

      const [
        quotesSnap, 
        contractsSnap, 
        paymentsSnap, 
        deliveriesSnap,
        quotesByMaKhSnap,
        contractsByMaKhSnap,
        paymentsByMaKhSnap,
        deliveriesByMaKhSnap,
        quotesByCustMaKhSnap,
        contractsByCustMaKhSnap,
        paymentsByCustMaKhSnap,
        deliveriesByCustMaKhSnap
      ] = await Promise.all([
        adminDb.collection('quotations').where('customerId', '==', srcId).get(),
        adminDb.collection('contracts').where('customerId', '==', srcId).get(),
        adminDb.collection('payments').where('customerId', '==', srcId).get(),
        adminDb.collection('deliveries').where('customerId', '==', srcId).get(),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('quotations').where('maKh', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('contracts').where('maKh', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('payments').where('maKh', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('deliveries').where('maKh', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('quotations').where('customerId', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('contracts').where('customerId', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('payments').where('customerId', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
        srcMaKh && srcMaKh !== srcId ? adminDb.collection('deliveries').where('customerId', '==', srcMaKh).get() : Promise.resolve({ docs: [] }),
      ]);

      const seenDocIds = new Set<string>();

      [...quotesSnap.docs, ...quotesByMaKhSnap.docs, ...quotesByCustMaKhSnap.docs].filter(d => !d.data()?.deletedAt).forEach(d => {
        if (seenDocIds.has(d.id)) return;
        seenDocIds.add(d.id);
        affectedQuotations.push({ id: d.id, previousCustomerId: srcId, previousMaKh: d.data()?.maKh || srcMaKh });
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          legacyCustomerCode: d.data()?.maKh || srcMaKh,
          // BẢO TOÀN 100% SNAPSHOT LỊCH SỬ: Giữ nguyên sdt, tenKhachHang, nguoiDaiDien, danhSachSdt
          updatedAt: new Date().toISOString()
        });
      });

      [...contractsSnap.docs, ...contractsByMaKhSnap.docs, ...contractsByCustMaKhSnap.docs].filter(d => !d.data()?.deletedAt).forEach(d => {
        if (seenDocIds.has(d.id)) return;
        seenDocIds.add(d.id);
        affectedContracts.push({ id: d.id, previousCustomerId: srcId, previousMaKh: d.data()?.maKh || srcMaKh });
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          legacyCustomerCode: d.data()?.maKh || srcMaKh,
          // BẢO TOÀN 100% SNAPSHOT LỊCH SỬ
          updatedAt: new Date().toISOString()
        });
      });

      [...paymentsSnap.docs, ...paymentsByMaKhSnap.docs, ...paymentsByCustMaKhSnap.docs].filter(d => !d.data()?.deletedAt).forEach(d => {
        if (seenDocIds.has(d.id)) return;
        seenDocIds.add(d.id);
        const pInstallments = Array.isArray(d.data()?.cacDotThu) ? d.data().cacDotThu.length : 1;
        affectedPayments.push({ 
          id: d.id, 
          previousCustomerId: srcId, 
          previousMaKh: d.data()?.maKh || srcMaKh,
          installmentsCount: pInstallments
        });
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          legacyCustomerCode: d.data()?.maKh || srcMaKh,
          // BẢO TOÀN 100% SNAPSHOT LỊCH SỬ & ĐỢT THU
          updatedAt: new Date().toISOString()
        });
      });

      [...deliveriesSnap.docs, ...deliveriesByMaKhSnap.docs, ...deliveriesByCustMaKhSnap.docs].filter(d => !d.data()?.deletedAt).forEach(d => {
        if (seenDocIds.has(d.id)) return;
        seenDocIds.add(d.id);
        const dShipments = Array.isArray(d.data()?.cacDotGiao) ? d.data().cacDotGiao.length : 1;
        affectedDeliveries.push({ 
          id: d.id, 
          previousCustomerId: srcId, 
          previousMaKh: d.data()?.maKh || srcMaKh,
          shipmentsCount: dShipments
        });
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          legacyCustomerCode: d.data()?.maKh || srcMaKh,
          // BẢO TOÀN 100% SNAPSHOT LỊCH SỬ & ĐỢT XUẤT KHO PXK
          updatedAt: new Date().toISOString()
        });
      });
    }

    const currentTags = tgtData?.tags || [];
    const finalTags = Array.from(new Set([...currentTags, ...updatedTags, 'MERGED', 'CONSOLIDATED_MASTER']));
    const existingMergedCodes = tgtData?.mergedCustomerCodes || tgtData?.merged_customer_codes || [];
    const secondaryMaKhs = Object.values(sourceCustomersSnapshotsData).map((s: any) => s.maKh).filter(Boolean);
    const secondaryTransitiveCodes: string[] = [];
    Object.values(sourceCustomersSnapshotsData).forEach((s: any) => {
      if (Array.isArray(s.mergedCustomerCodes)) secondaryTransitiveCodes.push(...s.mergedCustomerCodes);
      if (Array.isArray(s.merged_customer_codes)) secondaryTransitiveCodes.push(...s.merged_customer_codes);
    });
    const finalMergedCodes = Array.from(new Set([...existingMergedCodes, ...(mergedCustomerCodes || []), ...secondaryMaKhs, ...secondaryTransitiveCodes]));

    // Deep-merge contactsZnsHistory to preserve 100% ZNS delivery lineage across merged customers
    const mergedContactsZnsHistory: Record<string, any> = {
      ...(tgtData?.contactsZnsHistory || {})
    };
    Object.values(sourceCustomersSnapshotsData).forEach((s: any) => {
      if (s?.contactsZnsHistory && typeof s.contactsZnsHistory === 'object') {
        Object.entries(s.contactsZnsHistory).forEach(([phoneKey, histData]) => {
          if (!mergedContactsZnsHistory[phoneKey]) {
            mergedContactsZnsHistory[phoneKey] = histData;
          } else if (typeof histData === 'object' && (histData as any)?.status === 'SUCCESS') {
            // Ưu tiên bản ghi SUCCESS khi trùng số điện thoại
            mergedContactsZnsHistory[phoneKey] = histData;
          }
        });
      }
    });

    const targetCustomerUpdate: Record<string, any> = {
      tags: finalTags,
      mergedCustomerCodes: finalMergedCodes,
      contactsZnsHistory: mergedContactsZnsHistory,
      ngayCapNhat: new Date().toISOString()
    };
    if (Array.isArray(mergedContacts) && mergedContacts.length > 0) {
      targetCustomerUpdate.contacts = mergedContacts;
    }
    batch.update(targetCustomerSnap.ref, targetCustomerUpdate);

    // Record Permanent Audit Trail to auditLogs Collection
    const auditRef = adminDb.collection('auditLogs').doc();
    const auditData = {
      action: 'MERGE_CUSTOMERS',
      entityId: targetCustomerId,
      entityType: 'customers',
      userId: userEmail || 'system',
      userEmail: userEmail || 'system',
      timestamp: new Date().toISOString(),
      details: {
        masterId: targetCustomerId,
        masterMaKh: targetMaKh,
        masterCustomerSnapshot: tgtData,
        secondaryIds: sourceCustomerIds,
        secondarySnapshots: sourceCustomersSnapshotsData,
        affectedDocuments: {
          quotations: affectedQuotations,
          contracts: affectedContracts,
          payments: affectedPayments,
          deliveries: affectedDeliveries,
        },
        mergedAt: new Date().toISOString(),
      }
    };
    batch.set(auditRef, auditData);

    await batch.commit();

    return res.json({ 
      success: true, 
      message: 'Đã hợp nhất khách hàng và bảo toàn 100% chứng từ lịch sử',
      auditLogId: auditRef.id 
    });
  } catch (err: unknown) {
     return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/rollback-merge', async (req, res) => {
  try {
    const { auditLogId, userEmail } = req.body;
    if (!auditLogId) {
      return res.status(400).json({ success: false, error: 'Thiếu auditLogId để hoàn tác' });
    }

    const auditSnap = await adminDb.collection('auditLogs').doc(auditLogId).get();
    if (!auditSnap.exists) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy bản ghi nhật ký gộp khách hàng' });
    }

    const auditDocData = auditSnap.data() as any;
    if (auditDocData?.action !== 'MERGE_CUSTOMERS') {
      return res.status(400).json({ success: false, error: 'Bản ghi này không phải thao tác gộp khách hàng' });
    }

    const details = auditDocData?.details;
    if (!details) {
      return res.status(400).json({ success: false, error: 'Bản ghi không chứa thông tin chi tiết để hoàn tác' });
    }

    if (details.rolledBackAt) {
      return res.status(400).json({ 
        success: false, 
        error: `Thao tác gộp này đã được hoàn tác trước đó lúc ${details.rolledBackAt} bởi ${details.rolledBackBy || 'người dùng'}` 
      });
    }

    const batch = adminDb.batch();
    const secondarySnapshots = details.secondarySnapshots || {};
    const secondaryIds: string[] = details.secondaryIds || Object.keys(secondarySnapshots);

    // 1. Phục hồi các khách hàng phụ
    secondaryIds.forEach((secId: string) => {
      const originalSec = secondarySnapshots[secId] || {};
      const secRef = adminDb.collection('customers').doc(secId);
      
      let cleanName = originalSec.tenKhachHang || '';
      if (cleanName.startsWith('[ĐÃ GỘP VÀO')) {
        cleanName = cleanName.replace(/^\[ĐÃ GỘP VÀO [^\]]+\]\s*/, '');
      }

      batch.update(secRef, {
        isArchived: false,
        mergedInto: null,
        tenKhachHang: cleanName || undefined,
        ngayCapNhat: new Date().toISOString()
      });
    });

    // 2. Phục hồi chứng từ con về khách hàng phụ ban đầu
    const affectedDocs = details.affectedDocuments || {};
    const quotations = affectedDocs.quotations || [];
    const contracts = affectedDocs.contracts || [];
    const payments = affectedDocs.payments || [];
    const deliveries = affectedDocs.deliveries || [];

    quotations.forEach((q: any) => {
      if (q.id && q.previousCustomerId) {
        batch.update(adminDb.collection('quotations').doc(q.id), {
          customerId: q.previousCustomerId,
          maKh: q.previousMaKh || '',
          updatedAt: new Date().toISOString()
        });
      }
    });

    contracts.forEach((c: any) => {
      if (c.id && c.previousCustomerId) {
        batch.update(adminDb.collection('contracts').doc(c.id), {
          customerId: c.previousCustomerId,
          maKh: c.previousMaKh || '',
          updatedAt: new Date().toISOString()
        });
      }
    });

    payments.forEach((p: any) => {
      if (p.id && p.previousCustomerId) {
        batch.update(adminDb.collection('payments').doc(p.id), {
          customerId: p.previousCustomerId,
          maKh: p.previousMaKh || '',
          updatedAt: new Date().toISOString()
        });
      }
    });

    deliveries.forEach((d: any) => {
      if (d.id && d.previousCustomerId) {
        batch.update(adminDb.collection('deliveries').doc(d.id), {
          customerId: d.previousCustomerId,
          maKh: d.previousMaKh || '',
          updatedAt: new Date().toISOString()
        });
      }
    });

    // 3. Phục hồi trạng thái ban đầu của Master Customer
    if (details.masterId && details.masterCustomerSnapshot) {
      const masterRef = adminDb.collection('customers').doc(details.masterId);
      const masterPrev = details.masterCustomerSnapshot;
      batch.update(masterRef, {
        contacts: masterPrev.contacts || [],
        mergedCustomerCodes: masterPrev.mergedCustomerCodes || masterPrev.merged_customer_codes || [],
        tags: masterPrev.tags || [],
        ngayCapNhat: new Date().toISOString()
      });
    }

    // 4. Đánh dấu bản ghi Audit Log là đã hoàn tác
    batch.update(auditSnap.ref, {
      'details.rolledBackAt': new Date().toISOString(),
      'details.rolledBackBy': userEmail || 'system'
    });

    // 4. Ghi nhận thêm 1 bản ghi ROLLBACK_MERGE
    const rollbackAuditRef = adminDb.collection('auditLogs').doc();
    batch.set(rollbackAuditRef, {
      action: 'ROLLBACK_MERGE',
      entityId: details.masterId,
      entityType: 'customers',
      userId: userEmail || 'system',
      userEmail: userEmail || 'system',
      timestamp: new Date().toISOString(),
      details: {
        originalMergeAuditId: auditLogId,
        masterId: details.masterId,
        masterMaKh: details.masterMaKh,
        restoredSecondaryIds: secondaryIds,
        restoredQuotationsCount: quotations.length,
        restoredContractsCount: contracts.length,
        restoredPaymentsCount: payments.length,
        restoredDeliveriesCount: deliveries.length,
        rolledBackAt: new Date().toISOString()
      }
    });

    await batch.commit();

    return res.json({
      success: true,
      message: `Đã hoàn tác thành công lần gộp! Phục hồi ${secondaryIds.length} khách hàng và chuyển giao lại ${quotations.length + contracts.length + payments.length + deliveries.length} chứng từ về hồ sơ ban đầu.`
    });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.get('/merge-history', async (req, res) => {
  try {
    const snap = await adminDb
      .collection('auditLogs')
      .where('action', '==', 'MERGE_CUSTOMERS')
      .get();

    const history = snap.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .sort((a: any, b: any) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 30);

    return res.json({ success: true, history });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/trigger-sync', async (req, res) => {
  try {
    const results = await cronService.syncCustomerSnapshots();
    return res.json({ success: true, results });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const customerId = req.params.id;
    const effectiveUserId = req.body?.userId || req.body?.userEmail || (req as any).user?.uid;
    const isInternalAuth = Boolean(req.headers['x-internal-admin'] && req.headers['x-internal-admin'] === process.env.CRON_SECRET);
    const isTestEnv = process.env.NODE_ENV === 'test';

    let userId = effectiveUserId;
    if (!userId) {
      if (isTestEnv || isInternalAuth) {
        userId = 'system';
      } else {
        return res.status(401).json({
          success: false,
          error: 'Yêu cầu xác thực danh tính người dùng trước khi thực hiện thao tác xóa khách hàng.',
          unauthorized: true
        });
      }
    }

    // Zero-Trust Backend RBAC Guard: Server-enforced role verification
    if (userId !== 'system') {
      let userDoc = await adminDb.collection('users').doc(userId).get();
      if (!userDoc.exists) {
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
            success: false,
            error: 'Bạn không có quyền xóa khách hàng này. Vui lòng liên hệ Administrator hoặc Ban Giám Đốc.',
            forbidden: true
          });
        }
      }
    }

    // Check if customer exists
    const customerSnap = await adminDb.collection('customers').doc(customerId).get();
    if (!customerSnap.exists) {
      return res.status(404).json({ success: false, error: 'Customer not found' });
    }
    const customerData = customerSnap.data();

    // Query related documents
    const [quotationsSnap, contractsSnap, paymentsSnap, deliveriesSnap] = await Promise.all([
      adminDb.collection('quotations').where('customerId', '==', customerId).get(),
      adminDb.collection('contracts').where('customerId', '==', customerId).get(),
      adminDb.collection('payments').where('customerId', '==', customerId).get(),
      adminDb.collection('deliveries').where('customerId', '==', customerId).get()
    ]);

    const blockingDocuments: string[] = [];
    const detailedBlocks: any[] = [];

    quotationsSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
      const q = d.data() as any;
      const code = q?.soPhieuBaoGia || d.id;
      blockingDocuments.push(`Báo giá: ${code}`);
      detailedBlocks.push({
        type: 'quotation',
        id: d.id,
        code,
        label: `Báo giá: ${code}`,
        date: q?.ngayBaoGia || q?.createdAt,
        amount: q?.totalAmount || q?.tongTien
      });
    });

    contractsSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
      const c = d.data() as any;
      const code = c?.soHopDong || d.id;
      blockingDocuments.push(`Hợp đồng: ${code}`);
      detailedBlocks.push({
        type: 'contract',
        id: d.id,
        code,
        label: `Hợp đồng: ${code}`,
        date: c?.ngayKy,
        amount: c?.totalAmount || c?.giaTriHopDong,
        status: c?.tinhTrangHopDong || c?.status
      });
    });

    paymentsSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
      const p = d.data() as any;
      const code = p?.paymentId || d.id;
      blockingDocuments.push(`Thanh toán: ${code}`);
      detailedBlocks.push({
        type: 'payment',
        id: d.id,
        code,
        label: `Thanh toán: ${code}`,
        date: p?.ngayThanhToan,
        amount: Number(p?.soTien || p?.amount || 0),
        status: p?.tinhTrangThanhToan
      });
    });

    deliveriesSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
      const del = d.data() as any;
      const code = del?.deliveryId || d.id;
      blockingDocuments.push(`Giao hàng: ${code}`);
      detailedBlocks.push({
        type: 'delivery',
        id: d.id,
        code,
        label: `Giao hàng: ${code}`,
        date: del?.ngayGiaoThucTe || del?.ngayGiaoMay,
        status: del?.tinhTrangGiaoHang
      });
    });

    if (blockingDocuments.length > 0) {
      return res.status(422).json({
        success: false,
        error: `Khách hàng ${customerData?.tenKhachHang || customerId} đã phát sinh giao dịch, không thể xóa!`,
        reason: 'Cần xóa các chứng từ liên kết trước khi xóa khách hàng.',
        blockingDocuments,
        detailedBlocks
      });
    }

    const batch = adminDb.batch();
    batch.update(customerSnap.ref, {
      deletedAt: new Date().toISOString(),
      deletedBy: userId,
      isDeleted: true
    });
    const auditRef = adminDb.collection('auditLogs').doc();
    batch.set(auditRef, {
      action: 'DELETE',
      entityId: customerId,
      entityType: 'customers',
      details: { deleted: true, snapshot: customerData },
      userId: userId,
      timestamp: new Date().toISOString()
    });
    await batch.commit();

    return res.json({ success: true, message: `Đã xóa thành công khách hàng ${customerData?.tenKhachHang || customerId}` });
  } catch (err: unknown) {
    return res.status(500).json({ success: false, error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/format-name', async (req, res) => {
  try {
      const { rawName } = req.body;
      if (!rawName) return res.status(400).json({ success: false, error: 'rawName required' });
      
      if (!aiService.isEnabled()) {
          return res.json({ success: false, error: 'AI Service is disabled. GEMINI_API_KEY is not configured.' });
      }
      
      const result = await aiService.formatCustomerName(rawName);
      return res.json({ success: true, ...result });

  } catch (e: any) {
      console.error('Failed to parse name via Gemini:', e);
      return res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
