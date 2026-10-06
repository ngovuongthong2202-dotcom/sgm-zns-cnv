import { Router } from 'express';
import { vendorWebhookHandler } from '../services/zns/vendor-webhook.handler';
import { znsPayloadBuilder, sanitizeZnsCustomerName, sanitizeZnsPersonName } from '../services/zns/zns-payload.builder';
import { adminDb } from '../config/supabase.admin';
import { ZnsMessage } from '../../domain/schema/workflow.schema';
import { SendZnsMessageUseCase } from '../../modules/messaging/application/use-cases/SendZnsMessage';
import { znsRepository } from '../../modules/messaging/infrastructure/ZnsRepoSupabase';
import { multiProviderZnsVendor as znsVendor } from '../../modules/messaging/infrastructure/MultiProviderZnsVendor';
import { zaloTokenManager } from '../services/zns/zalo-token-manager.service';
import { bulkEnqueueHelper } from '../services/zns/outbound-helpers';
import '../../modules/messaging/application/handlers/EntityEventsHandler';

const router = Router();
const sendZnsUseCase = new SendZnsMessageUseCase(znsRepository, znsVendor);

import { resilientFetch } from '../lib/resilient-transport';

// Modern unified endpoint for vendor webhook results
router.post('/vendor-webhook/zns-result', (req, res) => vendorWebhookHandler.handleResult(req, res));
router.post('/webhook/cnv', (req, res) => vendorWebhookHandler.handleResult(req, res));
router.post('/webhook/zalo-official', (req, res) => vendorWebhookHandler.handleResult(req, res));

/**
 * Helper trích xuất mã xác thực tên miền Zalo (3 tầng bảo vệ: Render Env -> DB Vault -> Fallback)
 */
async function resolveZaloDomainVerificationCode(): Promise<string> {
  if (process.env.ZALO_DOMAIN_VERIFICATION_CODE) {
    return process.env.ZALO_DOMAIN_VERIFICATION_CODE.trim();
  }
  try {
    const doc = await adminDb.collection('settings').doc('zns_config').get();
    if (doc.exists && doc.data()?.zaloDomainVerificationCode) {
      return String(doc.data().zaloDomainVerificationCode).trim();
    }
  } catch {
    // Fallback gracefully
  }
  return 'NFEp0htcDovC-vigiCqADK7yswojYW5GC3Ot';
}

function renderZaloVerificationHtml(code: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="zalo-platform-site-verification" content="${code}" />
  <title>Zalo Webhook Verification - SGM OS</title>
</head>
<body>
  <p>Zalo Webhook Verification Endpoint Active - SGM OS</p>
</body>
</html>`;
}

// 1. Zalo Domain & Webhook Verification Endpoints (Xác thực quyền sở hữu Webhook URL & Domain)
router.get(['/webhook/zalo-official', '/webhook/zalo-official/'], async (req, res) => {
  const code = await resolveZaloDomainVerificationCode();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderZaloVerificationHtml(code));
});

router.get(['/webhook/cnv', '/webhook/cnv/'], async (req, res) => {
  const code = await resolveZaloDomainVerificationCode();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderZaloVerificationHtml(code));
});

// Universal file verifier: /zalo*.html và /*verification*.html
router.get(['/zalo*.html', '/*zalo*.html', '/*verification*.html'], async (req, res) => {
  const code = await resolveZaloDomainVerificationCode();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(renderZaloVerificationHtml(code));
});

// Dedicated Vault API: GET ZNS Configuration
router.get('/config', async (req, res) => {
  try {
    const doc = await adminDb.collection('settings').doc('zns_config').get();
    const data = doc.exists ? doc.data() || {} : {};
    return res.json({ success: true, config: data });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Dedicated Vault API: POST ZNS Configuration (Atomic Service Role Merge)
router.post('/config', async (req, res) => {
  try {
    const newConfig = req.body || {};
    const docRef = adminDb.collection('settings').doc('zns_config');
    const updatePayload: Record<string, any> = {
      ...newConfig,
      updatedAt: new Date().toISOString()
    };
    await docRef.set(updatePayload, { merge: true });
    return res.json({ success: true, message: 'Đã lưu cấu hình ZNS thành công!', config: updatePayload });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Endpoint for testing connection to Zalo OpenAPI direct
router.post('/test-zalo-direct', async (req, res) => {
  try {
    const creds = await zaloTokenManager.getCredentials();
    const appId = String(req.body?.appId || creds.appId || '').trim();
    const secretKey = String(req.body?.secretKey || creds.secretKey || '').trim();
    const oaId = String(req.body?.oaId || creds.oaId || '').trim();
    const refreshToken = String(req.body?.refreshToken || creds.refreshToken || '').trim();

    // 1. Nếu có đầy đủ appId, secretKey, refreshToken từ form hoặc DB, thực hiện refresh trực tiếp
    if (appId && secretKey && refreshToken) {
      const refreshResult = await zaloTokenManager.refreshTokenDirect(appId, secretKey, refreshToken, oaId);
      if (!refreshResult.success) {
        return res.status(400).json({
          success: false,
          error: `Zalo từ chối cấp Token: ${refreshResult.error}. Vui lòng kiểm tra lại App ID, Secret Key hoặc Refresh Token.`
        });
      }
      return res.json({
        success: true,
        message: 'Kết nối Zalo Cloud OpenAPI thành công! Access Token mới đã được cấp phát và lưu an toàn.',
        oaId: oaId || 'ZBS-OA',
        tokenExpiresAt: refreshResult.expiresAt
      });
    }

    // 2. Nếu thiếu thông tin để refresh mới, kiểm tra xem đã có access token nào đang còn hạn không
    const validToken = await zaloTokenManager.getValidAccessToken();
    if (validToken) {
      return res.json({
        success: true,
        message: 'Kết nối Zalo Cloud OpenAPI thành công! Access Token hiện tại đang còn hiệu lực.',
        oaId: oaId || creds.oaId || 'ZBS-OA',
        tokenExpiresAt: creds.tokenExpiresAt
      });
    }

    return res.status(400).json({
      success: false,
      error: 'Chưa cấu hình đủ App ID, Secret Key và Refresh Token của Zalo trong Cài đặt.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Lỗi kiểm tra kết nối Zalo OpenAPI: ${err.message || String(err)}`
    });
  }
});

// Endpoint for testing connection to vendor webhook
router.post('/test-webhook-dryrun', async (req, res) => {
  try {
    let testUrl = (req.body?.testUrl || req.body?.url || '').trim();

    if (!testUrl) {
      const settingsDoc = await adminDb.collection('settings').doc('zns_config').get();
      const configData = settingsDoc.exists ? settingsDoc.data() || {} : {};
      testUrl = (
        configData.vendorUrl_CUSTOMER_PRE_QUOTE || 
        configData.vendorUrl_BAOGIA || 
        configData.vendorUrl_HOPDONG_SIGN_ZNS || 
        configData.vendorUrl_THANH_TOAN_TAT_TOAN || 
        configData.vendorUrl_GIAOHANG_ZNS || 
        configData.vendorUrl_DEFAULT || 
        process.env.CNV_DEFAULT_WEBHOOK_URL ||
        ''
      ).trim();
    }
    
    if (!testUrl || typeof testUrl !== 'string' || !testUrl.trim()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Chưa cấu hình URL Webhook Vendor trong mục Ánh xạ giao thức (Vào Cài đặt → Vendor & Webhook).' 
      });
    }

    const trimmedUrl = testUrl.trim();
    const pingPayload = {
      action: 'Gửi tin',
      message_type: 'TEST_DRY_RUN',
      request_id: `test_dryrun_${Date.now()}`,
      customer_name: 'Khách Hàng Thử Nghiệm Webhook SGM',
      phone: '0900000000',
      so_dien_thoai: '0900000000',
      source: 'SGM_CRM_DRY_RUN',
      dry_run: true,
      timestamp: new Date().toISOString()
    };

    const pingResponse = await resilientFetch(trimmedUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'User-Agent': 'SGM-CRM-ZNS-Outbound/1.0'
      },
      body: JSON.stringify(pingPayload)
    });

    const status = pingResponse.status;
    const responseText = await pingResponse.text().catch(() => '');
    let parsedBody: any = null;
    try {
      parsedBody = JSON.parse(responseText);
    } catch {
      parsedBody = responseText;
    }

    if (status >= 200 && status < 300) {
      return res.json({ 
        success: true, 
        message: `Kết nối thành công tới Webhook CNV (HTTP ${status}). Hệ thống đã liên kết và nhận phản hồi tốt từ CNV.`,
        url: trimmedUrl,
        response: parsedBody
      });
    } else {
      return res.status(502).json({
        success: false,
        error: `Webhook CNV phản hồi mã lỗi HTTP ${status}. Kiểm tra lại trạng thái kịch bản trên CNV.`,
        url: trimmedUrl,
        response: parsedBody
      });
    }
  } catch (err: any) {
    const errorDetail = err?.cause?.message || err?.message || String(err);
    return res.status(500).json({ 
      success: false, 
      error: `Không thể kết nối tới Webhook CNV: ${errorDetail}` 
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
    
    // Nếu chưa có tenZns và không phải là CUSTOMER, tự động enrich từ hồ sơ khách hàng
    if (entityType !== 'CUSTOMER' && !payloadData.tenZns && !payloadData.ten_zns) {
      const custId = (payloadData.customerId || payloadData.customer_id || payloadData.maKh) as string;
      if (custId) {
        try {
          const cSnap = await adminDb.collection('customers').doc(custId).get();
          if (cSnap.exists) {
            const cData = cSnap.data() as Record<string, unknown>;
            payloadData.tenZns = cData.tenZns || cData.ten_zns;
          }
        } catch {}
      }
    }
    
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


    const targetCustId = (clientEntity.customerId as string) || 
                         (dbEntity.customerId as string) || 
                         (dbEntity.customer_id as string) || 
                         (dbEntity.maKh as string) ||
                         (clientEntity.maKh as string);
    let parentCustomer: Record<string, unknown> = {};
    if (body.entityType === 'CUSTOMER') {
      parentCustomer = dbEntity;
    } else if (targetCustId) {
      try {
        const custSnap = await adminDb.collection('customers').doc(targetCustId).get();
        if (custSnap.exists) {
          parentCustomer = (custSnap.data() as Record<string, unknown>) || {};
        } else {
          // Tra cứu dự phòng theo mã khách hàng maKh (ví dụ: KH0436)
          const querySnap = await adminDb.collection('customers').where('maKh', '==', targetCustId).limit(1).get();
          if (!querySnap.empty) {
            parentCustomer = (querySnap.docs[0].data() as Record<string, unknown>) || {};
          }
        }
      } catch (err) {
        // Fallback gracefully
      }
    }

    // Tra cứu bổ sung theo tên khách hàng nếu chưa tìm thấy parentCustomer
    if (body.entityType !== 'CUSTOMER' && Object.keys(parentCustomer).length === 0) {
      const searchName = (dbEntity.tenKhachHang || clientEntity.tenKhachHang) as string;
      if (searchName) {
        try {
          const nameSnap = await adminDb.collection('customers').where('tenKhachHang', '==', searchName).limit(1).get();
          if (!nameSnap.empty) {
            parentCustomer = (nameSnap.docs[0].data() as Record<string, unknown>) || {};
          }
        } catch {
          // Fallback gracefully
        }
      }
    }

    // Ưu tiên tuyệt đối trường "Chuẩn ZNS" (tenZns / ten_zns) theo yêu cầu Zalo Cloud OpenAPI
    const candidateZns = (
      clientEntity.tenZns || 
      clientEntity.ten_zns || 
      clientEntity.tenKhachHangZns || 
      dbEntity.tenZns || 
      dbEntity.ten_zns || 
      dbEntity.tenKhachHangZns || 
      parentCustomer.tenZns || 
      parentCustomer.ten_zns || 
      parentCustomer.tenKhachHangZns || 
      parentCustomer.tenThuongMai || 
      clientEntity.tenThuongMai
    ) as string | undefined;

    let resolvedZnsName = candidateZns ? String(candidateZns).trim() : '';

    const rawLegalName = String(
      clientEntity.tenKhachHang || 
      dbEntity.tenKhachHang || 
      clientEntity.customer_name || 
      dbEntity.customer_name || 
      parentCustomer.tenKhachHang || 
      parentCustomer.ten_khach_hang || 
      ''
    ).trim();

    // Nếu chưa có Chuẩn ZNS trong hồ sơ, tự động chuẩn hóa từ tên pháp lý / thương mại
    if (!resolvedZnsName && rawLegalName) {
      resolvedZnsName = sanitizeZnsCustomerName(rawLegalName);
    }

    if (resolvedZnsName.length > 30) {
      resolvedZnsName = sanitizeZnsCustomerName(resolvedZnsName);
    }
    if (resolvedZnsName.length > 30) {
      resolvedZnsName = resolvedZnsName.slice(0, 30).trim();
    }

    // Chuẩn hóa tên người phụ trách / nhân viên (bóc tách chức danh trong ngoặc)
    const rawOfficer = String(
      clientEntity.nguoiPhuTrach || 
      dbEntity.nguoiPhuTrach || 
      clientEntity.nhanVien || 
      dbEntity.nhanVien || 
      clientEntity.officer_name || 
      dbEntity.officer_name || 
      'Ngô Vương Thông'
    ).trim();
    const cleanOfficer = sanitizeZnsPersonName(rawOfficer);

    const mergedPayload: Record<string, unknown> = {
      ...parentCustomer,
      ...dbEntity,
      ...clientEntity,
      phone: normalizedPhone,
      sdt: normalizedPhone,
      tenZns: resolvedZnsName,
      ten_zns: resolvedZnsName,
      tenKhachHang: rawLegalName || resolvedZnsName,
      customer_name: resolvedZnsName || rawLegalName.slice(0, 30),
      nguoiPhuTrach: cleanOfficer,
      nguoi_phu_trach: cleanOfficer,
      nhanVien: cleanOfficer,
      nhan_vien: cleanOfficer,
      officer_name: cleanOfficer,
      customerId: clientEntity.customerId || dbEntity.customerId || (body.entityType === 'CUSTOMER' ? body.entityId : targetCustId),
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
      payload: mergedPayload,
      attemptBucket: body.attemptBucket,
      forceResend: Boolean(body.forceResend)
    });
    
    if (result.status === 'FAILED') {
      return res.status(200).json({ 
        success: false, 
        messageId: result.messageId, 
        status: result.status, 
        error: result.error || 'Gửi ZNS thất bại' 
      });
    }

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
