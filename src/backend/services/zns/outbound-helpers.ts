import { znsConfig } from '../../config/zns.config';
import { adminDb } from '../../config/supabase.admin';
import { ZnsConfigurationError } from './outbound-error';
import { ZnsMessage } from '../../../domain/schema/workflow.schema';
import { znsPayloadBuilder } from './zns-payload.builder';
import { logger } from '../../lib/logger';

export function resolveVendorUrl(configData: Record<string, unknown>, messageType: string): string | undefined {
  const customUrl = configData[`vendorUrl_${messageType}`] || configData[`vendorUrl_DEFAULT`];
  if (typeof customUrl === 'string' && customUrl.trim()) {
    return customUrl;
  }
  return (znsConfig.webhooks as any)[messageType]
    || znsConfig.webhooks.DEFAULT
    || process.env.CNV_DEFAULT_WEBHOOK_URL;
}

export async function validateAndGetVendorUrl(
  messageData: { messageType: string; entityId: string; entityType: string },
  configData: Record<string, unknown>
): Promise<string> {
  const url = resolveVendorUrl(configData, messageData.messageType);
  if (!url) {
    // await auditLogger.log('ZNS_VENDOR_URL_MISSING', messageData.entityId, messageData.entityType, {
    //   messageType: messageData.messageType,
    //   hint: 'Vào Cài đặt → Vendor & Webhook để cấu hình URL CNV cho loại tin này.'
    // });
    
    await adminDb.collection('notifications').add({
      type: 'error',
      title: 'Chưa cấu hình URL Vendor',
      message: `Không thể gửi ZNS ${messageData.messageType} cho entity ${messageData.entityId}. Vui lòng vào Cài đặt → Vendor & Webhook → cấu hình URL CNV cho loại "${messageData.messageType}".`,
      actionUrl: '/system/settings/vendor',
      createdAt: new Date().toISOString(),
      read: false,
    });
    
    throw new ZnsConfigurationError(`Chưa cấu hình URL Vendor cho loại tin "${messageData.messageType}". Vào Cài đặt → Vendor & Webhook.`);
  }
  return url;
}

export async function handlePreflightBlocked(message: ZnsMessage, reason: string, missing: string[]): Promise<void> {
  if (!message.id) return;
  const docRef = adminDb.collection('znsMessages').doc(message.id);
  await docRef.update({
    status: 'FAILED',
    vendorStatus: 'PRE_FLIGHT_BLOCKED',
    errorLog: reason,
    missingVars: missing,
    updatedAt: new Date().toISOString(),
  });
  
  // await entityStatusService.applyZnsResult({
  //   entityType: message.entityType,
  //   entityId: message.entityId,
  //   internalStatus: 'FAILED',
  //   vendorStatus: `Thiếu biến: ${missing.join(', ')}`,
  //   messageType: message.messageType,
  // });
  
  // await auditLogger.log('ZNS_PRE_FLIGHT_BLOCKED', message.entityId, message.entityType, {
  //   messageId: message.id,
  //   missingVars: missing,
  //   hint: reason,
  // });
  
  await adminDb.collection('notifications').add({
    type: 'error',
    title: `ZNS bị chặn — Thiếu dữ liệu`,
    message: reason,
    entityType: message.entityType,
    entityId: message.entityId,
    messageType: message.messageType,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

export function parseVendorResponse(responseBody: Record<string, unknown> | null, text: string): { internalStatus: string; vendorStatus: string } {
  const responseMap = responseBody || {};
  const statusVal = responseMap.status || 
                    responseMap.vendorStatus || 
                    responseMap.tinh_trang_bao_gia ||
                    (responseMap.isSuccess === true ? 'SUCCESS' : (responseMap.isSuccess === false ? 'FAILED' : null)) ||
                    ((responseMap.response as Record<string, unknown> | undefined)?.isSuccess === true ? 'SUCCESS' : ((responseMap.response as Record<string, unknown> | undefined)?.isSuccess === false ? 'FAILED' : null));

  const vendorStatus = statusVal ? String(statusVal).toUpperCase() : 'SENT';
  let internalStatus = 'SENT_WAITING';
  
  const rawResponseString = responseBody ? JSON.stringify(responseBody).toUpperCase() : text.toUpperCase();
  
  if (rawResponseString.includes('-1472') || rawResponseString.includes('EXCEEDED THE LIMIT') || rawResponseString.includes('LIMIT_EXCEEDED') || rawResponseString.includes('VƯỢT HẠN MỨC')) {
    internalStatus = 'LIMIT_EXCEEDED';
  } else if (vendorStatus.includes('SUCCESS') || vendorStatus.includes('SENT') || vendorStatus.includes('THÀNH CÔNG') || vendorStatus === 'SENT') {
    internalStatus = 'SUCCESS';
  } else if (vendorStatus.includes('FAIL') || vendorStatus.includes('FAILED') || vendorStatus.includes('THẤT BẠI')) {
    internalStatus = 'FAILED';
  }

  return { internalStatus, vendorStatus };
}

export function isLimitErrorText(text: string): boolean {
  const upper = text.toUpperCase();
  return upper.includes('-1472') || upper.includes('EXCEEDED THE LIMIT') || upper.includes('LIMIT_EXCEEDED') || upper.includes('VƯỢT HẠN MỨC');
}

export function extractHtmlError(text: string): string {
  const match = text.match(/<title>(.*?)<\/title>/i);
  return match ? `HTML Error: ${match[1]}` : 'HTML content (potential auth/gateway issue)';
}

export async function bulkEnqueueHelper(
  requests: Array<Omit<ZnsMessage, 'id' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>>,
  processMessageFn: (msgId: string) => Promise<string>
): Promise<{ successCount: number; failCount: number; errors: string[] }> {
  let successCount = 0;
  let failCount = 0;
  const errors: string[] = [];
  
  const chunkSize = 400; 
  for (let i = 0; i < requests.length; i += chunkSize) {
    const chunk = requests.slice(i, i + chunkSize);
    const batch = adminDb.batch();
    
    const businessVersion = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();
    const znsMessagesCollection = adminDb.collection('znsMessages');
    const chunkIds: string[] = [];

    for (const messageData of chunk) {
       const attemptBucket = messageData.attemptBucket || 0;
       const idempotencyKey = znsPayloadBuilder.generateIdempotencyKey(
         messageData.entityType, 
         messageData.entityId, 
         messageData.messageType, 
         businessVersion,
         attemptBucket
       );
       const docRef = znsMessagesCollection.doc(idempotencyKey);
       
       const newZnsMessage: ZnsMessage = {
         id: idempotencyKey,
         ...messageData,
         status: 'INIT',
         retryCount: 0,
         createdAt: now,
         updatedAt: now,
       };
       batch.set(docRef, newZnsMessage, { merge: true });
       chunkIds.push(idempotencyKey);
       successCount++;
    }
    
    try {
      await batch.commit();
      setTimeout(() => {
        for (const msgId of chunkIds) {
          processMessageFn(msgId).catch(e => {
            logger.error({ err: e, messageId: msgId }, 'Background process failed during bulk');
          });
        }
      }, 100);
    } catch (err: unknown) { 
      console.error('Bulk ZNS Batch Commit failed:', err);
      const errMsg = err instanceof Error ? err.message : String(err);
      errors.push(errMsg);
      failCount += chunk.length;
      successCount -= chunk.length;
    }
  }
  
  return { successCount, failCount, errors };
}
