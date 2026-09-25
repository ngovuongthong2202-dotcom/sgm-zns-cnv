import { Router } from 'express';
import { cronService } from '../services/cron/cron.service';
import { adminDb, adminAuth } from '../config/supabase.admin';
import { sendZaloAlert } from '../services/alerting.service';

if (process.env.NODE_ENV === 'production' && !process.env.CRON_SECRET) {
  console.warn('CRON_SECRET environment variable is required in production environment.');
}

const router = Router();

// Helper to authorize either CRON_SECRET or a valid Auth ID Token from UI Admin
async function verifyCronAuth(req: any): Promise<boolean> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7);

  // 1. Check CRON_SECRET if defined
  if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
    return true;
  }

  // Allow bypass in local dev if CRON_SECRET is not configured
  if (!process.env.CRON_SECRET && process.env.NODE_ENV !== 'production') {
    return true;
  }

  // 2. Verify with Admin Auth
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    if (decodedToken && decodedToken.uid) {
      return true;
    }
  } catch (err) {
    // Ignore invalid token or expiredToken errors and return false
  }

  return false;
}

// Endpoint for monitoring
router.get('/heartbeat', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

router.post('/rebuild-metrics', async (req, res) => {
  try {
    const isAuthed = await verifyCronAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { metricsRollupService } = await import('../../modules/reporting/infrastructure/metrics/metrics-rollup.service');
    await metricsRollupService.runRollup();
    return res.json({ status: 'ok' });
  } catch (err: unknown) { 
    console.error('CRON Rebuild metrics error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const isAuthed = await verifyCronAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { jobId } = req.body;


    if (jobId === 'outbox') {
      const previewCategories: any[] = [];
      const now = new Date().toISOString();
      const lockThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // 1. Fail retries
      const retrySnap = await adminDb.collection('znsMessages')
        .where('status', '==', 'FAILED')
        .where('nextRetryAt', '<=', now)
        .limit(50)
        .get();

      const retryItems = retrySnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: `Tin nhắn ZNS (${data.messageType || 'N/A'})`,
          details: `Người nhận: ${data.phone || 'N/A'} | Lần thử lại: ${(data.attemptBucket || 0) + 1} | Lỗi trước đó: ${data.errorLog || 'N/A'}`,
          before: 'Trạng thái: THẤT BẠI (Đang đợi thử lại)',
          after: 'Sẽ gửi lại ngay lập tức'
        };
      });

      // 2. Stale sending / locks
      const lockSnap = await adminDb.collection('znsMessages')
        .where('status', '==', 'SENDING')
        .where('lockedAt', '<', lockThreshold)
        .limit(50)
        .get();

      const lockItems = lockSnap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: `Tin nhắn bị kẹt (${data.messageType || 'N/A'})`,
          details: `Người nhận: ${data.phone || 'N/A'} | Bị kẹt từ lúc: ${data.lockedAt}`,
          before: 'Trạng thái: ĐANG GỬI (Bị kẹt > 5 phút)',
          after: 'Mở khoá & Đặt lịch gửi lại'
        };
      });

      previewCategories.push({
        id: 'outbox_retries',
        name: 'Tin nhắn lỗi sẽ thực hiện thử lại',
        description: 'Các tin nhắn gửi thất bại đã đủ thời gian chờ giãn cách.',
        items: retryItems
      });

      previewCategories.push({
        id: 'outbox_stale_locks',
        name: 'Tin nhắn bị kẹt khoá (Stale Locks)',
        description: 'Các tin nhắn đang ở trạng thái gửi lâu hơn 5 phút (hệ thống sẽ tự động giải phóng khoá để retry).',
        items: lockItems
      });

      return res.json({ status: 'ok', jobId, categories: previewCategories });
    }

    if (jobId === 'sync-snapshots') {
      const previewCategories: any[] = [];
      
      // Look up cross-entity sync jobs
      const jobsSnap = await adminDb
        .collection("crossEntitySyncJobs")
        .where("status", "==", "PENDING")
        .limit(50)
        .get();

      const items: any[] = [];

      for (const d of jobsSnap.docs) {
        const job = d.data();
        
        // Fetch customer current data
        const custDoc = await adminDb.collection("customers").doc(job.customerId).get();
        if (custDoc.exists) {
          const custData = custDoc.data();
          
          const changeDetails = [];
          if (job.tenKhachHang && job.tenKhachHang !== custData?.tenKhachHang) {
            changeDetails.push(`Tên KH: "${job.tenKhachHang}" ➔ "${custData?.tenKhachHang}"`);
          }
          if (job.sdt && job.sdt !== custData?.sdt) {
            changeDetails.push(`SĐT: "${job.sdt}" ➔ "${custData?.sdt}"`);
          }
          if (job.nguoiPhuTrach && job.nguoiPhuTrach !== custData?.nguoiPhuTrach) {
            changeDetails.push(`Người phụ trách: "${job.nguoiPhuTrach}" ➔ "${custData?.nguoiPhuTrach}"`);
          }
          if (job.nguoiDaiDien && job.nguoiDaiDien !== custData?.nguoiDaiDien) {
            changeDetails.push(`Người đại diện: "${job.nguoiDaiDien}" ➔ "${custData?.nguoiDaiDien}"`);
          }
          
          items.push({
            id: d.id,
            title: `Cập nhật hồ sơ khách hàng: ${custData?.tenKhachHang || 'N/A'} (Mã: ${custData?.maKh || 'N/A'})`,
            details: changeDetails.join(' | ') || 'Đồng bộ toàn bộ trường thông tin snapshot',
            before: 'KHÁC BIỆT DỮ LIỆU (Chưa đồng bộ cho Báo giá, Hợp đồng, Thanh toán, Giao hàng)',
            after: 'Cập nhật tự động các bản ghi quan hệ liên quan'
          });
        }
      }

      previewCategories.push({
        id: 'snapshot_sync_jobs',
        name: 'Hồ sơ khách hàng có sửa đổi cần đồng bộ',
        description: 'Danh sách các khách hàng có thông tin profile thay đổi và cần đồng bộ snapshot vào các đề mục quan hệ.',
        items: items
      });

      return res.json({ status: 'ok', jobId, categories: previewCategories });
    }

    return res.status(400).json({ error: 'Invalid Job ID' });
  } catch (err: any) {
    console.error('CRON Preview error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
});


router.post('/process-outbox', async (req, res) => {
  try {
    const isAuthed = await verifyCronAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await cronService.processOutbox();
    
    // Check DLQ limits and alert
    try {
      const dlqQuery = await adminDb.collection('znsMessages').where('status', '==', 'DLQ').count().get();
      const dlqCount = dlqQuery.data().count;
      
      const failedQuery = await adminDb.collection('znsMessages').where('status', '==', 'FAILED').count().get();
      const failedCount = failedQuery.data().count;
      
      const totalErrors = dlqCount + failedCount;
      if (totalErrors >= 50) {
         await sendZaloAlert(`🚨 CẢNH BÁO HỆ THỐNG ZNS: Phát hiện ${totalErrors} tin nhắn bị kẹt ở trạng thái LỖI (DLQ/FAILED). Vui lòng kiểm tra Hub ngay!`);
      }
      
      // Also check client errors spike (Observability)
      const now = new Date();
      const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60000).toISOString();
      const clientErrorsQuery = await adminDb.collection('clientErrors')
        .where('createdAt', '>=', fifteenMinutesAgo)
        .count()
        .get();
      const recentClientErrors = clientErrorsQuery.data().count;

      if (recentClientErrors >= 10) {
        await sendZaloAlert(`🚨 CẢNH BÁO UI/UX: Hệ thống vừa ghi nhận ${recentClientErrors} lỗi Giao diện (Client-side / React) từ người dùng trong 15 phút qua. Vui lòng kiểm tra tab Sức khoẻ hệ thống ngay!`);
      }
    } catch (e) {
      console.error('Error checking system health limits:', e);
    }
    
    return res.json({ status: 'ok', results });
  } catch (err: unknown) { 
    console.error('CRON process-outbox error:', err);
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/sync-snapshots', async (req, res) => {
  try {
    const isAuthed = await verifyCronAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await cronService.syncCustomerSnapshots(true);
    const lockCleanup = await cronService.cleanupExpiredLocks();
    await cronService.logHeartbeat('sync-snapshots');
    return res.json({ status: 'ok', results, lockCleanup });
  } catch (err: unknown) { 
    console.error('CRON sync-snapshots error:', err);
    return res.status(500).json({ error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/cleanup-locks', async (req, res) => {
  try {
    const isAuthed = await verifyCronAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const results = await cronService.cleanupExpiredLocks();
    return res.json({ status: 'ok', results });
  } catch (err: unknown) {
    console.error('CRON cleanup-locks error:', err);
    return res.status(500).json({ error: (err instanceof Error ? err.message : String(err)) });
  }
});

router.post('/cleanup-storage', async (req, res) => {
  try {
    const isAuthed = await verifyCronAuth(req);
    if (!isAuthed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { supabaseAdmin, isSupabaseAdminConfigured } = await import('../config/supabase.admin');
    let rpcResult: any = null;
    if (isSupabaseAdminConfigured) {
      try {
        const { data, error } = await supabaseAdmin.rpc('cleanup_expired_system_data');
        if (!error && data) {
          rpcResult = data;
        }
      } catch (e) {
        // Fallback to manual query cleanup
      }

      if (!rpcResult) {
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
        const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

        await Promise.allSettled([
          supabaseAdmin.from('presence').delete().lt('updated_at', oneHourAgo),
          supabaseAdmin.from('idempotency_keys').delete().lt('created_at', sevenDaysAgo),
          supabaseAdmin.from('job_heartbeats').delete().lt('last_heartbeat', oneDayAgo)
        ]);
        rpcResult = { status: 'manual_cleanup_completed' };
      }
    }

    return res.json({ status: 'ok', cleanup: rpcResult });
  } catch (err: unknown) {
    console.error('CRON cleanup-storage error:', err);
    return res.status(500).json({ error: (err instanceof Error ? err.message : String(err)) });
  }
});

export default router;
