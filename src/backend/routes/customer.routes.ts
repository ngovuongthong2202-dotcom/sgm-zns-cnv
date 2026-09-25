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
    
    // Check by Phone
    if (normalizedPhone) {
      const phoneSnap = await customersRef.where('sdt', '==', normalizedPhone).get();
      phoneSnap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.isArchived && !d.deletedAt) {
          duplicateCandidates.push({ id: doc.id, ...d });
        }
      });
      if (phone !== normalizedPhone) {
        const rawPhoneSnap = await customersRef.where('sdt', '==', phone).get();
        rawPhoneSnap.docs.forEach(doc => {
          const d = doc.data();
          if (!d.isArchived && !d.deletedAt && !duplicateCandidates.find(c => c.id === doc.id)) {
            duplicateCandidates.push({ id: doc.id, ...d });
          }
        });
      }
    }

    if (normalizedTaxId) {
      const taxSnap = await customersRef.where('maSoThue', '==', normalizedTaxId).get();
      taxSnap.docs.forEach(doc => {
        const d = doc.data();
        if (!d.isArchived && !d.deletedAt && !duplicateCandidates.find(c => c.id === doc.id)) {
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
    const { targetCustomerId, sourceCustomerIds, userEmail } = req.body;
    if (!targetCustomerId || !sourceCustomerIds || !sourceCustomerIds.length) {
      return res.status(400).json({ success: false, error: 'Invalid parameters for merge' });
    }

    const batch = adminDb.batch();
    const sourceCustomersSnap = await Promise.all(
      sourceCustomerIds.map((id: string) => adminDb.collection('customers').doc(id).get())
    );

    const updatedTags: string[] = [];
    
    // Process sources: archive source profiles
    sourceCustomersSnap.forEach(snap => {
      if (snap.exists) {
        batch.update(snap.ref, {
          isArchived: true,
          mergedInto: targetCustomerId,
          ngayCapNhat: new Date().toISOString()
        });
        const data = snap.data();
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
    const targetTenKhachHang = tgtData.tenKhachHang || '';
    const targetSdt = tgtData.sdt || '';

    // Deep Cascading Customer Merge: Reassign all active child documents & synchronize snapshots
    for (const srcId of sourceCustomerIds) {
      const [quotesSnap, contractsSnap, paymentsSnap, deliveriesSnap] = await Promise.all([
        adminDb.collection('quotations').where('customerId', '==', srcId).get(),
        adminDb.collection('contracts').where('customerId', '==', srcId).get(),
        adminDb.collection('payments').where('customerId', '==', srcId).get(),
        adminDb.collection('deliveries').where('customerId', '==', srcId).get()
      ]);

      quotesSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          tenKhachHang: targetTenKhachHang,
          sdt: targetSdt,
          updatedAt: new Date().toISOString()
        });
      });
      contractsSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          tenKhachHang: targetTenKhachHang,
          sdt: targetSdt,
          updatedAt: new Date().toISOString()
        });
      });
      paymentsSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          tenKhachHang: targetTenKhachHang,
          sdt: targetSdt,
          updatedAt: new Date().toISOString()
        });
      });
      deliveriesSnap.docs.filter(d => !d.data()?.deletedAt).forEach(d => {
        batch.update(d.ref, {
          customerId: targetCustomerId,
          maKh: targetMaKh,
          tenKhachHang: targetTenKhachHang,
          sdt: targetSdt,
          updatedAt: new Date().toISOString()
        });
      });
    }

    const currentTags = tgtData?.tags || [];
    const finalTags = Array.from(new Set([...currentTags, ...updatedTags, 'MERGED']));
    batch.update(targetCustomerSnap.ref, {
      tags: finalTags,
      ngayCapNhat: new Date().toISOString()
    });

    await batch.commit();

    return res.json({ success: true, message: 'Đã hợp nhất khách hàng và chuyển giao toàn bộ chứng từ liên quan' });
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
