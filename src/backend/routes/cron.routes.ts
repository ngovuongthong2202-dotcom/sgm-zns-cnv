import { Router } from 'express';
import { cronService } from '../services/cron/cron.service';
import { adminDb, adminAuth } from '../config/supabase.admin';
import { sendZaloAlert } from '../services/alerting.service';
import { RETIRED } from './retired.routes';

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

router.post('/preview', RETIRED.cronPreview); // Đợt 0A: màn đối soát CronPage đã xóa; đường này lộ SĐT người nhận cho token dev

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

router.post('/sync-snapshots', RETIRED.syncSnapshots); // Đợt 0A (K1): nhánh ghi đè toàn bộ chứng từ đã gỡ

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
