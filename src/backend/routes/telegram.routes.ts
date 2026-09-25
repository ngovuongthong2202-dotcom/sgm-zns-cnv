import { Router, Request, Response } from 'express';
import { adminDb } from '../config/supabase.admin';
import { logger } from '../lib/logger';
import { telegramService } from '../services/telegram/telegram.service';
import { reportBuilderService } from '../services/telegram/report-builder.service';


const router = Router();

// Test Bot Connection
router.post('/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, chatId } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }
    
    const result = await telegramService.testBot(token, chatId);
    if (!result.ok) {
       res.status(400).json({ error: result.error });
       return;
    }
    res.status(200).json({ success: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

router.post('/test-send', async (req: Request, res: Response): Promise<void> => {
  try {
    const { chatId } = req.body;
    const text = 'This is a test message.';
    // Just a simple test, real implementation uses templates
    const result = await telegramService.sendMessage(chatId, text);
    if (result.ok) {
        await telegramService.logSentMessage(chatId, 'MANUAL', text, 'SUCCESS');
        res.status(200).json({ success: true });
        return;
    }
    await telegramService.logSentMessage(chatId, 'MANUAL', text, 'FAILED', result.error);
    res.status(400).json({ error: result.error });
  } catch (err: unknown) {
     const errorMsg = err instanceof Error ? err.message : 'Unknown error';
     res.status(500).json({ error: errorMsg });
  }
});

// Manual trigger 
router.post('/send-now', async (req: Request, res: Response): Promise<void> => {
  try {
    const { period, filters, chatIds } = req.body; 
    // Basic rate limit should be handled...
    const msg = await reportBuilderService.buildManualReport(period || 'day', filters);
    
    let sent = 0;
    let failed = 0;

    if (chatIds && Array.isArray(chatIds)) {
      for (const chatId of chatIds) {
        const result = await telegramService.sendMessage(chatId, msg);
        if (result.ok) {
           sent++;
           telegramService.logSentMessage(chatId, 'MANUAL', msg, 'SUCCESS');
        } else {
           failed++;
           telegramService.logSentMessage(chatId, 'MANUAL', msg, 'FAILED', result.error);
        }
      }
    } else {
       const result = await telegramService.sendToAllEnabled(msg, 'manual');
       sent = result.sent;
       failed = result.failed;
    }

    res.json({ success: true, sent, failed });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// Cron Daily Digest
router.post('/cron/daily-digest', async (req: Request, res: Response): Promise<void> => {
  try {
    const msg = await reportBuilderService.buildDailyDigest(new Date());
    const result = await telegramService.sendToAllEnabled(msg, 'digest');
    res.json({ success: true, ...result });
  } catch (err: unknown) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Failed to send daily digest via cron');
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// Cron Alerts
router.post('/cron/check-alerts', async (req: Request, res: Response): Promise<void> => {
  try {
    // Check DLQ ...
    // Basic check for MVP: just examples
    const sent = 0;
    // ...
    res.json({ success: true, sent });
  } catch (err: unknown) {
    logger.error({ error: err instanceof Error ? err.message : String(err) }, 'Failed to check alerts via cron');
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: errorMsg });
  }
});

// Recent sent logs
router.get('/recent-sent', async (req: Request, res: Response): Promise<void> => {
  try {
     const snap = await adminDb.collection('telegramSentLog').orderBy('sentAt', 'desc').limit(50).get();
     res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err: unknown) {
     const errorMsg = err instanceof Error ? err.message : 'Unknown error';
     res.status(500).json({ error: errorMsg });
  }
});

// Endpoint for receiving webhooks from Telegram Bot API
// e.g. POST /api/telegram/webhook
router.post('/webhook', async (req, res) => {
  try {
    const update = req.body;
    
    // Xử lý callback query (khi user bấm inline button)
    if (update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data; // ex: "approve_quota_5000"
      
      if (data && data.startsWith('approve_quota_')) {
        const amount = parseInt(data.replace('approve_quota_', ''), 10);
        
        if (!isNaN(amount)) {
          const quotaRef = adminDb.collection('settings').doc('zns_quota');
          // Idempotent/Atomic transaction
          await adminDb.runTransaction(async (t) => {
            const doc = await t.get(quotaRef);
            const current = doc.exists ? (doc.data()?.remaining || 0) : 0;
            const updateData = { 
              remaining: current + amount, 
              lastUpdated: new Date().toISOString() 
            };
            t.set(quotaRef, updateData, { merge: true });
          });

          logger.info(`Telegram Bot approved quota addition: +${amount} by user ${callbackQuery.from?.username || 'unknown'}`);
          
          // Telegram Bot API hỗ trợ trả về payload dạng AnswerCallbackQuery trực tiếp qua webhook response
          return res.status(200).json({
            method: 'answerCallbackQuery',
            callback_query_id: callbackQuery.id,
            text: `✅ Đã cấp thêm ${amount} ZNS vào hệ thống!`,
            show_alert: true
          });
        }
      }
    }

    // Default OK để Telegram không retry
    res.status(200).send('OK');
  } catch (error) {
    logger.error({err: error}, 'Telegram webhook processing error');
    res.status(500).send('Webhook server error');
  }
});

export default router;
