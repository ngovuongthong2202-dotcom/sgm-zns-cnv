import { Router } from 'express';
import { adminDb } from '../config/supabase.admin';
import { logger } from '../lib/logger';

const router = Router();

/**
 * Real endpoint to generate and download a complete JSON database backup
 * of all crucial CRM tables: customers, quotations, contracts, payments, deliveries.
 */
router.get('/backup-json', async (req, res) => {
    try {
        const collections = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'];
        const backupData: Record<string, any[]> = {};

        await Promise.all(collections.map(async (col) => {
            const snap = await adminDb.collection(col).get();
            backupData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }));

        const result = {
            system: 'ZNS-SGM CRM/ERP',
            exportedAt: new Date().toISOString(),
            version: '1.0.0',
            data: backupData
        };

        const backupInfo = {
            lastBackupAt: result.exportedAt,
            backupType: 'manual_json_snapshot',
            backupSizeStr: `${Math.round(JSON.stringify(result).length / 1024)} KB`
        };
        await adminDb.collection('settings').doc('backupInfo').set(backupInfo, { merge: true });

        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=zns_sgm_backup_${new Date().toISOString().split('T')[0]}.json`);
        return res.json(result);
    } catch (err: unknown) {
        logger.error({ err }, 'Error generating JSON backup');
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
});

/**
 * MOCK: Cloud Run Task / Worker endpoint for deep CSV export.
 * In a real environment, this endpoint would be triggered asynchronously for files > 10,000 rows.
 * It reads from BigQuery or Firestore in chunks, streams to Google Cloud Storage (GCS), 
 * and then writes a download link back to the user's notification/inbox in Firestore.
 */
router.post('/csv/deep-export', async (req, res) => {
    try {
        const { collectionName, filters: _filters, userId } = req.body;
        
        logger.info(`[CSV_WORKER] Started background export for ${collectionName} requested by ${userId}`);
        
        // 1. Acknowledge immediately to free up caller
        res.json({ status: 'queued', message: 'Export is running in background. You will receive a notification when ready.' });
        
        // 2. Background process (mocked)
        setTimeout(async () => {
            try {
                logger.info(`[CSV_WORKER] Generating CSV...`);
                // Simulate deep read
                const _snap = await adminDb.collection(collectionName).limit(10).get(); // We only read 10 to simulate
                
                // MOCK GCS Upload
                const downloadUrl = `https://storage.googleapis.com/mock-bucket/exports/${collectionName}_${Date.now()}.csv`;
                
                // 3. Write notification to User Inbox
                await adminDb.collection('notifications').add({
                    userId,
                    title: 'CSV Export Hoàn tất',
                    message: `File dữ liệu của bạn đã sẵn sàng để tải xuống.`,
                    actionUrl: downloadUrl,
                    createdAt: new Date().toISOString(),
                    isRead: false
                });
                
                logger.info(`[CSV_WORKER] Completed CSV generation. Notification sent.`);
            } catch (err) {
                logger.error({ err }, '[CSV_WORKER] Error in background task');
            }
        }, 5000); // Simulate 5s delay

    } catch (err: unknown) { 
        if (!res.headersSent) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    }
});

export default router;
