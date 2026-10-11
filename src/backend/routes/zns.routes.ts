import { Router } from 'express';
import { vendorWebhookHandler } from '../services/zns/vendor-webhook.handler';
import { znsPayloadBuilder, sanitizeZnsCustomerName, sanitizeZnsPersonName } from '../services/zns/zns-payload.builder';
import { toPublicZnsConfig, pickZnsConfigUpdate, ZNS_CONFIG_SECRET_FIELDS } from '../services/zns/zns-config.policy';
import { buildPaymentZnsNote, isLegacyAutoSettledNote, PAYMENT_ZNS_NOTE_MAX } from '../../modules/billing/domain/paymentZnsNote';
import { adminDb } from '../config/supabase.admin';
import { ZnsMessage } from '../../domain/schema/workflow.schema';
import { SendZnsMessageUseCase } from '../../modules/messaging/application/use-cases/SendZnsMessage';
import { znsRepository } from '../../modules/messaging/infrastructure/ZnsRepoSupabase';
import { multiProviderZnsVendor as znsVendor } from '../../modules/messaging/infrastructure/MultiProviderZnsVendor';
import { zaloTokenManager } from '../services/zns/zalo-token-manager.service';
import { RETIRED } from './retired.routes';
import '../../modules/messaging/application/handlers/EntityEventsHandler';
import { ZBS_TEMPLATE_REGISTRY } from '../../domain/constants/zbs-template.registry';

const router = Router();
const sendZnsUseCase = new SendZnsMessageUseCase(znsRepository, znsVendor);

import { resilientFetch } from '../lib/resilient-transport';
import { logger } from '../lib/logger';

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
router.use((req, res, next) => {
  if (req.method === 'GET') {
    const p = (req.path || '').toLowerCase();
    if (
      p === '/webhook/zalo-official' ||
      p === '/webhook/zalo-official/' ||
      p === '/webhook/cnv' ||
      p === '/webhook/cnv/' ||
      (p.endsWith('.html') && (p.includes('zalo') || p.includes('verification')))
    ) {
      resolveZaloDomainVerificationCode().then(code => {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(renderZaloVerificationHtml(code));
      }).catch(next);
      return;
    }
  }
  next();
});

// Live ZBS Template Catalog API
router.get('/templates/catalog', (req, res) => {
  return res.json({ success: true, templates: ZBS_TEMPLATE_REGISTRY });
});

// Dedicated Vault API: GET ZNS Configuration
// Đợt 0A (ZNS05/BM-02): không bao giờ trả giá trị bí mật; chỉ trả cờ secrets.<ô> = đã lưu hay chưa.
router.get('/config', async (req, res) => {
  try {
    const doc = await adminDb.collection('settings').doc('zns_config').get();
    const data = doc.exists ? doc.data() || {} : {};
    return res.json({ success: true, config: toPublicZnsConfig(data) });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
});

// Dedicated Vault API: POST ZNS Configuration (Atomic Service Role Merge)
// Đợt 0A (ZNS05/Z0.3): chỉ nhận ô cho phép; không nhận mã truy cập/hạn dùng/data/id (xem zns-config.policy.ts).
router.post('/config', async (req, res) => {
  try {
    const { payload, rejectedKeys } = pickZnsConfigUpdate(req.body || {});
    const docRef = adminDb.collection('settings').doc('zns_config');
    // Đợt 0A (ZNS05): set(merge) của lớp tương thích thành ghi đè cả dòng khi lần đọc bên trong lỗi, và form đã che khóa nên không
    // gửi lại bí mật → đọc trước; không đọc được (hoặc chưa có dòng) mà thân không mang bí mật mới thì KHÔNG ghi (tránh xóa khóa Zalo).
    const current = await docRef.get();
    if (!current.exists && !ZNS_CONFIG_SECRET_FIELDS.some(k => payload[k] !== undefined)) {
      return res.status(503).json({
        success: false,
        code: 'ZNS_CONFIG_UNREADABLE',
        error: 'Không đọc được cấu hình ZNS đang lưu (hoặc chưa có). Chưa lưu để không làm mất khóa Zalo. Nếu đã có cấu hình, thử lại sau giây lát; nếu là lần lưu đầu, hãy nhập đủ khóa Zalo.'
      });
    }
    const updatePayload: Record<string, any> = { ...payload, updatedAt: new Date().toISOString() };
    await docRef.set(updatePayload, { merge: true });
    const saved = await docRef.get();
    const savedData = saved.exists ? saved.data() || {} : updatePayload;
    return res.json({ success: true, message: 'Đã lưu cấu hình ZNS thành công!', config: toPublicZnsConfig(savedData), ignoredKeys: rejectedKeys });
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
    // Đợt 0A (Z0.3): chỉ truyền Refresh Token người dùng vừa gõ; để trống thì refreshTokenDirect đọc mã đang lưu TRONG khóa
    // (mã đọc ở đây có thể vừa bị một lần tự làm mới đang chạy xoay mất).
    const typedRefreshToken = String(req.body?.refreshToken || '').trim();
    const refreshToken = typedRefreshToken || String(creds.refreshToken || '').trim();

    // 1. Nếu có đầy đủ appId, secretKey, refreshToken từ form hoặc DB, thực hiện refresh trực tiếp
    if (appId && secretKey && refreshToken) {
      const refreshResult = await zaloTokenManager.refreshTokenDirect(appId, secretKey, typedRefreshToken, oaId);
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

// Đợt 0A (ZNS01): "ping" chỉ gọi tới địa chỉ CNV ĐÃ LƯU trong cấu hình (bỏ qua mọi địa chỉ gửi lên), chỉ https tới hub.cnvcdp.com,
// không đi theo chuyển hướng, chỉ trả mã trạng thái và thời gian phản hồi (không trả nội dung, không lặp lại địa chỉ).
// Phần "bắt buộc đăng nhập quản trị" của ZNS01 thuộc B2.
const VENDOR_URL_SLOTS: readonly string[] = [
  'vendorUrl_CUSTOMER_PRE_QUOTE', 'vendorUrl_BAOGIA', 'vendorUrl_HOPDONG_SIGN_ZNS', 'vendorUrl_THANH_TOAN_XAC_NHAN',
  'vendorUrl_THANH_TOAN_TAT_TOAN', 'vendorUrl_THANH_TOAN_CONG_NO', 'vendorUrl_GIAOHANG_ZNS', 'vendorUrl_GIAOHANG_HOANTAT', 'vendorUrl_DEFAULT'
];
const ALLOWED_VENDOR_HOSTS: readonly string[] = ['hub.cnvcdp.com'];

export function isAllowedVendorUrl(raw: unknown): boolean {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const u = new URL(raw.trim());
    return u.protocol === 'https:' && ALLOWED_VENDOR_HOSTS.includes(u.hostname)
      && !u.username && !u.password && (u.port === '' || u.port === '443');
  } catch {
    return false;
  }
}

router.post('/test-webhook-dryrun', async (req, res) => {
  try {
    const requestedSlot = typeof req.body?.slot === 'string' ? req.body.slot : '';
    const settingsDoc = await adminDb.collection('settings').doc('zns_config').get();
    const configData: Record<string, unknown> = settingsDoc.exists ? settingsDoc.data() || {} : {};
    const slots = requestedSlot && VENDOR_URL_SLOTS.includes(requestedSlot) ? [requestedSlot] : VENDOR_URL_SLOTS;
    const savedUrl = slots.map(k => String(configData[k] || '').trim()).find(Boolean)
      || String(process.env.CNV_DEFAULT_WEBHOOK_URL || '').trim();

    if (!savedUrl) {
      return res.status(400).json({ success: false, code: 'NO_SAVED_VENDOR_URL', error: 'Chưa lưu địa chỉ Webhook CNV nào trong Cài đặt → Vendor & Webhook.' });
    }
    if (!isAllowedVendorUrl(savedUrl)) {
      return res.status(400).json({ success: false, code: 'VENDOR_URL_NOT_ALLOWED', error: 'Địa chỉ đã lưu không thuộc máy chủ CNV (https://hub.cnvcdp.com) nên không ping.' });
    }

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

    const startedAt = Date.now();
    const pingResponse = await resilientFetch(savedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'SGM-CRM-ZNS-Outbound/1.0' },
      body: JSON.stringify(pingPayload),
      redirect: 'manual'
    });
    const latencyMs = Date.now() - startedAt;
    const status = pingResponse.status;
    await pingResponse.text().catch(() => ''); // đọc để đóng kết nối; KHÔNG trả nội dung về trình duyệt

    if (status >= 200 && status < 300) {
      return res.json({ success: true, status, latencyMs, message: `Kết nối thành công tới Webhook CNV (HTTP ${status}, ${latencyMs} ms).` });
    }
    return res.status(502).json({ success: false, status, latencyMs, error: `Webhook CNV phản hồi mã lỗi HTTP ${status}. Kiểm tra lại trạng thái kịch bản trên CNV.` });
  } catch (err: any) {
    // Thông báo lỗi của undici có thể chứa nguyên địa chỉ đã lưu (ví dụ lỗi "URL that includes credentials: <địa chỉ>"),
    // nên chi tiết chỉ ghi vào nhật ký máy chủ, không trả về trình duyệt.
    const errorDetail = err?.cause?.message || err?.message || String(err);
    logger.error({ err, detail: errorDetail }, '[ZNS01] Ping Webhook CNV thất bại');
    return res.status(500).json({ success: false, code: 'PING_FAILED', error: 'Không gọi được máy chủ CNV. Xem nhật ký máy chủ để biết chi tiết.' });
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
        } catch { /* làm giàu dữ liệu xem trước là tùy chọn — bỏ qua lỗi */ }
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

    // Đợt 0A (TT01/§9.11): tin xác nhận thanh toán — chốt theo TRẠNG THÁI TRONG CSDL, không tin thân gửi lên.
    const isPaymentConfirmation = body.entityType === 'PAYMENT' && String(body.messageType || '').startsWith('THANH_TOAN_');
    let serverPaymentNote: string | null = null;
    if (isPaymentConfirmation) {
      const dbPayment = Object.keys(dbEntity).length > 0 ? dbEntity : null;
      const rawIndex = clientEntity.installmentIndex;
      const requestedIndex = rawIndex === undefined || rawIndex === null || rawIndex === '' ? undefined : Number(rawIndex);
      const note = buildPaymentZnsNote(dbPayment, requestedIndex);
      if (!note.ok) {
        return res.status(note.code === 'INVALID_INSTALLMENT' ? 400 : 409).json({ success: false, code: note.code, error: note.reason });
      }
      const typedNote = typeof clientEntity.ghi_chu === 'string' ? clientEntity.ghi_chu.trim() : '';
      const totalAmount = Number(dbPayment?.totalAmount || 0);
      const fullyCollected = totalAmount > 0 && note.collected >= totalAmount;
      const legacyNoteForOpenReceipt = Boolean(typedNote) && isLegacyAutoSettledNote(typedNote) && !fullyCollected;
      if (legacyNoteForOpenReceipt) {
        // Công tắc PAYMENT_NOTE_GUARD (nguyên tắc 6): mặc định (không đặt) = chặn 409, vì câu "Tất toán" sai gửi tới khách là thiệt hại
        // trực tiếp; đặt 'report' trên Render nếu nghiệm thu thấy dương tính giả → chỉ ghi nhận và thay bằng câu máy chủ dựng.
        if (process.env.PAYMENT_NOTE_GUARD === 'report') {
          console.warn(`[TT01 report-only] phiếu ${String(body.entityId)}: câu "Tất toán" khi mới thu ${note.collected}/${totalAmount} — thay bằng câu máy chủ`);
        } else {
          return res.status(409).json({ success: false, code: 'PAYMENT_NOTE_REJECTED', error: 'Nội dung "Tất toán" chỉ gửi được khi phiếu đã thu đủ. Sửa ô Ghi chú thành câu phù hợp (ví dụ "Thanh toán đợt 2").' });
        }
      }
      // Câu gửi lên chỉ được dùng khi vừa 30 ký tự và không phải câu "Tất toán" bị loại; câu dài (bản cũ: "Thanh toán đợt N (Còn lại: …)") thay bằng câu máy chủ dựng.
      serverPaymentNote = typedNote && typedNote.length <= PAYMENT_ZNS_NOTE_MAX && !legacyNoteForOpenReceipt ? typedNote : note.ghiChu;
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

    // Đợt 0A: không tra khách theo tên nữa — trùng tên là nguồn gửi nhầm khách (ZNS12/KH13).

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
      ...(isPaymentConfirmation ? { ghi_chu: serverPaymentNote } : {}),
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

    if (isPaymentConfirmation) {
      // Không để ghi chú nội bộ của phiếu thu hay của hồ sơ khách (spread parentCustomer đứng trước) lọt vào tin gửi khách.
      delete mergedPayload.ghiChu;
      delete mergedPayload.note;
      delete mergedPayload.ghiChuNoiBo;
      if (Array.isArray(mergedPayload.cacDotThu)) {
        mergedPayload.cacDotThu = (mergedPayload.cacDotThu as unknown[]).map(d =>
          d && typeof d === 'object' ? Object.fromEntries(Object.entries(d as Record<string, unknown>).filter(([k]) => k !== 'ghiChu')) : d
        );
      }
    }

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

    // TẦNG 1: DIRECT BACKEND PERSISTENCE
    // Cập nhật ngay lập tức vào database Supabase để giải quyết triệt để lỗi "Chờ gửi ZNS"
    if (result.status === 'SUCCESS' || result.status === 'SENT_WAITING') {
      try {
        const nowIso = new Date().toISOString();
        const updateDoc: Record<string, any> = {
          trangThaiZns: 'THÀNH CÔNG',
          trangThaiGuiTin: 'THANH_CONG',
          sentAt: nowIso
        };
        if (body.entityType === 'QUOTATION') {
          updateDoc.trangThaiGuiTinBaoGia = 'THÀNH CÔNG';
          updateDoc.thongTinGuiZnsBaoGia = {
            status: 'THÀNH CÔNG',
            ngayGui: nowIso,
            soDienThoaiNhan: normalizedPhone
          };
        } else if (body.entityType === 'CONTRACT') {
          updateDoc.trangThaiGuiTinHopDong = 'THÀNH CÔNG';
        } else if (body.entityType === 'PAYMENT') {
          updateDoc.trangThaiGuiTinThanhToan = 'THÀNH CÔNG';
        } else if (body.entityType === 'DELIVERY') {
          updateDoc.trangThaiGuiTinGiaoHang = 'THÀNH CÔNG';
        } else if (body.entityType === 'CUSTOMER') {
          updateDoc.trangThaiGuiTinQuangCao = 'THÀNH CÔNG';
        }

        const targetTable = collectionMap[body.entityType];
        if (targetTable && body.entityId) {
          await adminDb.collection(targetTable).doc(body.entityId).update(updateDoc);
        }
      } catch (dbErr) {
        console.error('Failed to update entity status in DB after ZNS send:', dbErr);
      }
    }

    res.status(200).json({ success: true, messageId: result.messageId, status: result.status });
  } catch (error: unknown) { 
    const errMsg = error instanceof Error ? error.message : String(error);
    const code = (error as { code?: string })?.code || 'INTERNAL_ERROR';
    console.error('Failed to enqueue ZNS message:', errMsg);
    res.status(500).json({ success: false, error: errMsg, code });
  }
});

// Đợt 0A (Z0.1): gửi hàng loạt và gửi lại hàng loạt tạm khóa. Thân xử lý cũ (ghi 400 tin/lô, gửi lại với payload cũ,
// không xác thực) đã xóa khỏi kho; xem lịch sử git 2b56114. Thiết kế mới nằm ở Đợt 2B.
router.post('/bulk-send', RETIRED.bulkZns);
router.post('/replay-dlq', RETIRED.bulkZns);
router.post('/replay', RETIRED.bulkZns);

export default router;
