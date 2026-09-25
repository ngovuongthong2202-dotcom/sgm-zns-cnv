import { Router } from 'express';
import { vendorWebhookHandler } from '../services/zns/vendor-webhook.handler';
import { znsPayloadBuilder } from '../services/zns/zns-payload.builder';
import { adminDb } from '../config/supabase.admin';
import { ZnsMessage } from '../../domain/schema/workflow.schema';
import { SendZnsMessageUseCase } from '../../modules/messaging/application/use-cases/SendZnsMessage';
import { znsRepository } from '../../modules/messaging/infrastructure/ZnsRepoSupabase';
import { znsVendor } from '../../modules/messaging/infrastructure/CnvZnsVendor';
import { bulkEnqueueHelper } from '../services/zns/outbound-helpers';
import '../../modules/messaging/application/handlers/EntityEventsHandler';

const router = Router();
const sendZnsUseCase = new SendZnsMessageUseCase(znsRepository, znsVendor);

// Modern unified endpoint for vendor webhook results
router.post('/vendor-webhook/zns-result', (req, res) => vendorWebhookHandler.handleResult(req, res));
router.post('/webhook/cnv', (req, res) => vendorWebhookHandler.handleResult(req, res));

// Endpoint for testing connection to vendor webhook
router.post('/test-webhook-dryrun', async (req, res) => {
  try {
    const settingsDoc = await adminDb.collection('settings').doc('zns_config').get();
    const configData = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const testUrl = configData.vendorUrl_CUSTOMER_PRE_QUOTE || 
                    configData.vendorUrl_DEFAULT || 
                    process.env.CNV_DEFAULT_WEBHOOK_URL ||
                    configData.vendorUrl_BAOGIA;
    
    if (!testUrl || typeof testUrl !== 'string' || !testUrl.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chưa cấu hình URL Webhook Vendor trong mục Ánh xạ giao thức (Vào Cài đặt → Vendor & Webhook).' 
      });
    }

    const trimmedUrl = testUrl.trim();
    const pingResponse = await fetch(trimmedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        action: 'Ping',
        source: 'SGM_CRM_DRY_RUN',
        timestamp: new Date().toISOString() 
      })
    });

    const status = pingResponse.status;
    const responseText = await pingResponse.text().catch(() => '');

    if (status >= 200 && status < 300) {
      return res.json({ 
        success: true, 
        message: `Kết nối thành công tới Webhook CNV (HTTP ${status}). Hệ thống đã liên kết tốt với CNV.`,
        url: trimmedUrl,
        response: responseText
      });
    } else {
      return res.status(502).json({
        success: false,
        error: `Webhook CNV phản hồi mã lỗi HTTP ${status}. Kiểm tra lại trạng thái kịch bản trên CNV.`,
        url: trimmedUrl,
        response: responseText
      });
    }
  } catch (err: any) {
    return res.status(500).json({ 
      success: false, 
      error: `Không thể kết nối tới Webhook CNV: ${err instanceof Error ? err.message : String(err)}` 
    });
  }
});

function normalizeVNPhone(raw: string): string | null {
  if (!raw) return null;
  // Strip space, dot, dash, parens
  let cleaned = String(raw).replace(/[\s.\-()]/g, '');
  // Convert +84 / 84 prefix -> 0
  if (cleaned.startsWith('+84')) cleaned = '0' + cleaned.slice(3);
  else if (cleaned.startsWith('84') && cleaned.length === 11) cleaned = '0' + cleaned.slice(2);
  // Validate: must be 10 digits starting with 0
  if (!/^0\d{9}$/.test(cleaned)) return null;
  return cleaned;
}

// Endpoint for ZNS Preview
router.post('/preview', async (req, res) => {
  try {
    const { entityId, entityType, messageType } = req.body;
    if (!entityId || !entityType || !messageType) {
      return res.status(400).json({ error: 'Missing entityId, entityType, messageType' });
    }

    const collectionMap: Record<string, string> = {
      'CUSTOMER': 'customers',
      'QUOTATION': 'quotations',
      'CONTRACT': 'contracts',
      'PAYMENT': 'payments',
      'DELIVERY': 'deliveries'
    };
    
    const collectionName = collectionMap[entityType];
    if (!collectionName) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }

    const docSnap = await adminDb.collection(collectionName).doc(entityId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Entity not found' });
    }
    
    const payloadData = docSnap.data() as Record<string, unknown>;
    
    const dummyMessage = {
       entityId,
       entityType,
       messageType,
       phone: (payloadData.phone || payloadData.sdt || payloadData.phoneNumber || '09xxxxxxxx') as string,
       payload: payloadData,
       status: 'INIT' as const,
       retryCount: 0,
       attemptBucket: 0,
       createdAt: new Date().toISOString(),
       updatedAt: new Date().toISOString()
    } as ZnsMessage;

    const payload = await znsPayloadBuilder.buildPayload(
      dummyMessage, 
      'PREVIEW_IDEMPOTENCY_KEY', 
      { strictMode: false }
    );
    
    res.status(200).json({ payload });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // Include missing variables if known from ZnsPayloadBuilder
    const code = (err as any).code;
    const missing = (err as any).missing;
    res.status(500).json({ error: errMsg, code, missing });
  }
});

router.post('/send', async (req, res) => {
  try {
    const body = req.body;
    if (!body || !body.entityId || !body.entityType || !body.messageType) {
      return res.status(400).json({ error: 'Missing required payload: entityId, entityType, messageType' });
    }
    
    // Normalize phone TRƯỚC khi validate
    const rawPhone = body.phone || body.payload?.phone || body.payload?.sdt || (body.payload?.contacts as any)?.[0]?.sdt;
    const normalizedPhone = normalizeVNPhone(rawPhone);
    if (!normalizedPhone) {
      return res.status(400).json({ 
        success: false, 
        error: `Số điện thoại không hợp lệ: "${rawPhone}". Định dạng đúng: 0xxxxxxxxx (10 số bắt đầu 0).`,
        code: 'INVALID_PHONE'
      });
    }

    // Unwrap nested entity payload if sent from client
    const clientEntity = (body.payload && typeof body.payload === 'object') ? body.payload : {};

    // Auto-fetch entity snapshot from database to ensure complete required fields (tenKhachHang, etc.)
    const collectionMap: Record<string, string> = {
      'CUSTOMER': 'customers',
      'QUOTATION': 'quotations',
      'CONTRACT': 'contracts',
      'PAYMENT': 'payments',
      'DELIVERY': 'deliveries'
    };
    let dbEntity: Record<string, unknown> = {};
    const collName = collectionMap[body.entityType];
    if (collName && body.entityId) {
      try {
        const docSnap = await adminDb.collection(collName).doc(body.entityId).get();
        if (docSnap.exists) {
          dbEntity = (docSnap.data() as Record<string, unknown>) || {};
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

    const mergedPayload: Record<string, unknown> = {
      ...dbEntity,
      ...clientEntity,
      phone: normalizedPhone,
      sdt: normalizedPhone,
      tenKhachHang: clientEntity.tenKhachHang || dbEntity.tenKhachHang || clientEntity.customer_name || dbEntity.customer_name || '',
      customerId: body.entityId || clientEntity.customerId || dbEntity.customerId,
      entityId: body.entityId,
      entityType: body.entityType,
      messageType: body.messageType,
      attemptBucket: body.attemptBucket || Date.now()
    };

    const result = await sendZnsUseCase.execute({
      entityId: body.entityId,
      entityType: body.entityType,
      messageType: body.messageType,
      phone: normalizedPhone,
      payload: mergedPayload
    });
    
    res.status(200).json({ success: true, messageId: result.messageId, status: result.status });
  } catch (error: unknown) { 
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string })?.code || 'INTERNAL_ERROR';
    console.error('Failed to enqueue ZNS message:', errMsg);
    res.status(500).json({ success: false, error: errMsg, code });
  }
});

// Endpoint cho Bulk Send (chống treo Frontend khi gửi nhiều ZNS)
router.post('/bulk-send', async (req, res) => {
  try {
    const { requests } = req.body;
    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'Missing or empty requests array' });
    }
    
    // Validate quickly
    for (const p of requests) {
      if (!p.entityId || !p.entityType || !p.messageType) {
        return res.status(400).json({ error: 'Mỗi request phải có entityId, entityType, messageType' });
      }
      if (p.phone) {
         p.phone = normalizeVNPhone(p.phone) || p.phone;
      }
    }

    const { successCount, failCount, errors } = await bulkEnqueueHelper(requests, async (msgId) => {
       const msg = await znsRepository.findById(msgId);
       if (msg) {
         await sendZnsUseCase.execute({
            entityId: msg.props.entityId,
            entityType: msg.props.entityType,
            messageType: msg.props.messageType,
            phone: msg.props.phone,
            payload: msg.props.payload
         });
       }
       return msgId;
    });

    res.status(200).json({ successCount, failCount, errors });
  } catch (error: unknown) { 
    console.error('Failed to bulk enqueue ZNS messages:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Endpoint to retry ALL failed or DLQ messages (for ZNS Hub replay)
router.post('/replay-dlq', async (req, res) => {
  try {
    const { messageIds, filter, dryRun } = req.body;

    let targetIds: string[] = [];

    if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
      targetIds = messageIds;
    } else if (filter) {
      // Query up to 100 DLQ/FAILED
      const query = adminDb.collection('znsMessages')
        .where('status', 'in', ['FAILED', 'DLQ'])
        .limit(100);
      
      const snapshot = await query.get();
      snapshot.forEach((doc) => targetIds.push(doc.id)); 
    }

    if (dryRun) {
      return res.json({ targetIds, count: targetIds.length });
    }

    const replayed: string[] = [];
    const skipped: string[] = [];
    const errors: any[] = [];

    for (const msgId of targetIds) {
      try {
        const docRef = adminDb.collection('znsMessages').doc(msgId);
        await docRef.update({
          status: 'INIT',
          retryCount: 0,
          errorLog: '',
          updatedAt: new Date().toISOString()
        });
        
        // fire-and-forget process
        const msg = await znsRepository.findById(msgId);
        if (msg) {
          sendZnsUseCase.execute({
            entityId: msg.props.entityId,
            entityType: msg.props.entityType,
            messageType: msg.props.messageType,
            phone: msg.props.phone,
            payload: msg.props.payload
          }).catch(console.error);
        }
        replayed.push(msgId);
      } catch (err: unknown) { 
        errors.push({ id: msgId, error: err instanceof Error ? err.message : String(err) });
      }
    }
    return res.json({ replayed, skipped, errors, total: replayed.length });
  } catch (err: unknown) { 
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.post('/replay', async (req, res) => {
  try {
    const { messageId } = req.body;
    if (!messageId) return res.status(400).json({ error: 'Missing messageId' });

    const docRef = adminDb.collection('znsMessages').doc(messageId);
    
    await docRef.update({
      status: 'INIT',
      retryCount: 0,
       errorLog: '',
      updatedAt: new Date().toISOString()
    });
    
    // trigger background process
    const msg = await znsRepository.findById(messageId);
    if (msg) {
      sendZnsUseCase.execute({
        entityId: msg.props.entityId,
        entityType: msg.props.entityType,
        messageType: msg.props.messageType,
        phone: msg.props.phone,
        payload: msg.props.payload
      }).catch(console.error);
    }

    res.status(200).json({ success: true });
  } catch (err: unknown) { 
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
