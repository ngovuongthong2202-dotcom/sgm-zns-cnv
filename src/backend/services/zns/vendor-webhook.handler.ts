import { Request, Response } from 'express';
import { znsConfig } from '../../config/zns.config';
import { adminDb } from '../../config/supabase.admin';
import { workflowEventService } from '../workflow/workflow-event.service';
import { logger } from '../../lib/logger';
import { normalizeLegacyStatus, EntityZnsStatus } from '../../../domain/enums/zns-status';

export class VendorWebhookHandler {
  async handleResult(req: Request, res: Response) {
    try {
      // Fetch dynamic config
      const settingsDocRef = adminDb.collection('settings').doc('zns_config');
      const settingsDoc = await settingsDocRef.get();
      
      let expectedSecret = znsConfig.callback.secret;
      let requireSecret = znsConfig.callback.requireSecret;
      
      if (settingsDoc.exists) {
        const configData = settingsDoc.data();
        if (configData) {
            if (configData.vendorWebhookSecret) expectedSecret = configData.vendorWebhookSecret;
            if (configData.requireSecret !== undefined) requireSecret = configData.requireSecret;
        }
      }

      // 1. Auth 
      const providedSecret = req.headers['x-api-key'] || req.headers['authorization'] || req.query.secret;
      if (requireSecret && expectedSecret) {
        if (providedSecret !== expectedSecret && !znsConfig.callback.authSoftMode) {
            return res.status(401).json({ error: 'Unauthorized vendor access' });
        }
      }

      const payload = req.body || {};
      
      // LOG DEBUG: Save raw payload for debugging
      try {
        // Sample 1% of successful debug logs to save DB costs, but keep all errors if any
        if (Math.random() < 0.1) {
          const TTL = new Date();
          TTL.setDate(TTL.getDate() + 7);
          await adminDb.collection('znsWebhookDebug').add({
             payload,
             headers: req.headers,
             timestamp: new Date().toISOString(),
             expireAt: TTL // Firestore TTL policy compatible
          });
        }
      } catch (err) {
        // ignore telemetry parse failure
      }

//       // 1. SIGNAL RECEIVED
//       await auditLogger.log('WEBHOOK_SIGNAL_RECEIVED', 'WEBHOOK', 'SYSTEM', { 
//         action: payload.action,
//         requestId: payload.request_id,
//         source: 'ZnsVendor'
//       });

      // Extract tracking ID (priority: request_id from CNV)
      let trackingId: string | undefined = payload.request_id || 
                         payload.stt ||
                         payload.internal_request_id || 
                         payload.vendor_request_id || 
                         payload.tracking_id || 
                         payload.message_id ||
                         payload.id ||
                         payload.newValues?.request_id;
                         
      if (trackingId && typeof trackingId === 'string') trackingId = trackingId.trim();
                          
      // Extract status (with fallbacks to popular status columns/fields)
      let vendorStatus = payload.status || 
                         payload.vendorStatus ||
                         payload.tinh_trang_bao_gia ||
                         (payload.isSuccess === true ? 'SUCCESS' : (payload.isSuccess === false ? 'FAILED' : null)) ||
                         (payload.response?.isSuccess === true ? 'SUCCESS' : (payload.response?.isSuccess === false ? 'FAILED' : null)) ||
                         payload.newValues?.trang_thai_gui_tin_bao_gia ||
                         payload.newValues?.status || 
                         payload.newValues?.row_data?.status ||
                         payload.newValues?.row_data?.['Trạng thái ZNS'] ||
                         payload.newValues?.row_data?.['trang_thai_zns'];

      if (vendorStatus && typeof vendorStatus === 'string') vendorStatus = vendorStatus.trim();

      // Additional Check: Did Zalo hit the rate limit or limit exceeded (-1472)?
      const rawString = JSON.stringify(payload).toLowerCase();
      let isLimitError = false;
      if (rawString.includes('-1472') || rawString.includes('exceeded the limit') || rawString.includes('vượt hạn mức') || rawString.includes('limit_exceeded')) {
        isLimitError = true;
      }
                         
      // If none found, deduce from 'action' or general contents
      if (isLimitError) {
         vendorStatus = 'LIMIT_EXCEEDED';
      } else if (!vendorStatus) {
         if (payload.action === 'SUCCESS' || payload.action === 'FAIL') vendorStatus = payload.action;
         else if (payload.newValues?.hanh_dong_gui_zns_pre_quote) vendorStatus = payload.newValues.hanh_dong_gui_zns_pre_quote;
         else if (payload.newValues?.row_data?.hanh_dong_gui_zns_pre_quote) vendorStatus = payload.newValues.row_data.hanh_dong_gui_zns_pre_quote;
         else if (payload.newValues?.hanh_dong_gui_zns_bao_gia) vendorStatus = payload.newValues.hanh_dong_gui_zns_bao_gia;
         else if (payload.newValues?.row_data?.hanh_dong_gui_zns_bao_gia) vendorStatus = payload.newValues.row_data.hanh_dong_gui_zns_bao_gia;
         else if (payload.newValues?.hanh_dong_gui_zns_ky_hop_dong) vendorStatus = payload.newValues.hanh_dong_gui_zns_ky_hop_dong;
         else if (payload.newValues?.row_data?.hanh_dong_gui_zns_ky_hop_dong) vendorStatus = payload.newValues.row_data.hanh_dong_gui_zns_ky_hop_dong;
         else if (payload.newValues?.hanh_dong_gui_zns_thanh_toan) vendorStatus = payload.newValues.hanh_dong_gui_zns_thanh_toan;
         else if (payload.newValues?.row_data?.hanh_dong_gui_zns_thanh_toan) vendorStatus = payload.newValues.row_data.hanh_dong_gui_zns_thanh_toan;
         else if (payload.newValues?.hanh_dong_gui_zns_giao_hang) vendorStatus = payload.newValues.hanh_dong_gui_zns_giao_hang;
         else if (payload.newValues?.row_data?.hanh_dong_gui_zns_giao_hang) vendorStatus = payload.newValues.row_data.hanh_dong_gui_zns_giao_hang;
         else if (payload.newValues?.row_data?.['Gửi tin ZNS (Trước báo giá)']) {
            const val = payload.newValues.row_data['Gửi tin ZNS (Trước báo giá)'];
            if (normalizeLegacyStatus(val) === EntityZnsStatus.THANH_CONG) vendorStatus = 'SUCCESS';
            else if (normalizeLegacyStatus(val) === EntityZnsStatus.THAT_BAI) vendorStatus = 'FAIL';
            else vendorStatus = val;
         }
         // Assume success if no error field but we have an ID
         else if (trackingId && !payload.error) vendorStatus = 'SUCCESS';
         else vendorStatus = 'UNKNOWN';
      }
      
      // Normalize vendorStatus
      if (typeof vendorStatus === 'string') {
        const norm = normalizeLegacyStatus(vendorStatus);
        if (norm === EntityZnsStatus.THANH_CONG) vendorStatus = 'SUCCESS';
        else if (norm === EntityZnsStatus.THAT_BAI) vendorStatus = 'FAIL';
        else if (norm === EntityZnsStatus.VUOT_HAN_MUC) vendorStatus = 'LIMIT_EXCEEDED';
        else if (norm === EntityZnsStatus.DA_DAY_CHO_KQ) vendorStatus = 'SENT_WAITING';
        else if (norm === EntityZnsStatus.CAN_GUI_LAI) vendorStatus = 'NEED_RESEND';
      }
      
      if (!trackingId) {
         return res.status(400).json({ error: 'Missing internal_request_id or tracking_id' });
      }

      // Query for the message outside transaction (Firestore web SDK limitation)
      const q = adminDb.collection('znsMessages').where('trackingId', '==', trackingId).limit(1);
      let messagesSnap = await q.get();
      let znsMessageDoc = messagesSnap.empty ? null : messagesSnap.docs[0];

      // Fallback search by stt + phone if not found by trackingId
      const incomingPhone = payload.phone || payload.phoneNumber || payload.newValues?.phone || payload.newValues?.phoneNumber || payload.newValues?.so_dien_thoai_raw;
      if (!znsMessageDoc && payload.stt && incomingPhone) {
        const cleanStt = String(payload.stt).trim();
        const cleanPhone = String(incomingPhone).trim();
        
        const q2 = adminDb.collection('znsMessages')
          .where('stt', '==', cleanStt)
          .where('phone', '==', cleanPhone)
          .limit(1);
        messagesSnap = await q2.get();
        znsMessageDoc = messagesSnap.empty ? null : messagesSnap.docs[0];
        
        if (!znsMessageDoc) {
          logger.warn({ trackingId, cleanStt, cleanPhone }, 'Webhook Fallback STT+Phone failed to find ZNS message');
        }
      }

      // Final fallback by just stt (riskier)
      if (!znsMessageDoc && trackingId) {
        const q3 = adminDb.collection('znsMessages').where('stt', '==', String(trackingId).trim()).limit(1);
        messagesSnap = await q3.get();
        znsMessageDoc = messagesSnap.empty ? null : messagesSnap.docs[0];
        if (!znsMessageDoc) {
          logger.warn({ trackingId }, 'Webhook Final Fallback STT only failed to find ZNS message');
        }
      }

      // Dedup logic using Transaction
      const dedupRef = adminDb.collection('znsCallbacks').doc(trackingId);
      
      const entityInfoFromDb = await adminDb.runTransaction(async (t) => {
        const dDoc = await t.get(dedupRef);
        if (dDoc.exists) {
           const existingData = dDoc.data();
           if (existingData && existingData.vendorStatus === vendorStatus) {
              return null; // duplicate
           }
        }
        
        t.set(dedupRef, { 
          payload, 
          vendorStatus,
          processedAt: new Date().toISOString() 
        }, { merge: true });

        if (znsMessageDoc) {
          const znsData = znsMessageDoc.data();
// eslint-disable-next-line no-useless-assignment
          let internalStatus = 'UNKNOWN';
          const norm = normalizeLegacyStatus(vendorStatus);
          
          if (norm === EntityZnsStatus.THANH_CONG) {
            internalStatus = 'SUCCESS';
          } else if (norm === EntityZnsStatus.VUOT_HAN_MUC) {
            internalStatus = 'LIMIT_EXCEEDED';
          } else if (norm === EntityZnsStatus.THAT_BAI) {
            internalStatus = 'FAILED';
          } else if (norm === EntityZnsStatus.DA_DAY_CHO_KQ) {
            internalStatus = 'SENT_WAITING';
          } else if (norm === EntityZnsStatus.CAN_GUI_LAI) {
            internalStatus = 'DLQ';
          } else {
            internalStatus = 'FAILED';
          }
          
          t.update(znsMessageDoc.ref, { 
            status: internalStatus,
            vendorStatus: vendorStatus, 
            updatedAt: new Date().toISOString()
          });
          
          // Phản chiếu (Project) trạng thái ZNS (cả thành công, thất bại, vượt hạn mức) sang thực thể nghiệp vụ nguồn
          if (znsData.entityType && znsData.entityId) {
            const entType = (znsData.entityType || '').toLowerCase();
            const fieldMap: Record<string, string> = {
              customer: 'trangThaiZns',
              customers: 'trangThaiZns',
              quotation: 'trangThaiGuiTinBaoGia',
              quotations: 'trangThaiGuiTinBaoGia',
              contract: 'trangThaiGuiTinHopDong',
              contracts: 'trangThaiGuiTinHopDong',
              payment: 'trangThaiGuiTinThanhToan',
              payments: 'trangThaiGuiTinThanhToan',
              delivery: 'trangThaiGuiTinGiaoHang',
              deliveries: 'trangThaiGuiTinGiaoHang'
            };
            const targetField = fieldMap[entType];
            if (targetField) {
              const targetCol = entType.endsWith('s') ? entType : `${entType}s`;
              const entityRef = adminDb.collection(targetCol).doc(znsData.entityId);
              const updates: Record<string, any> = {
                [targetField]: norm,
                updatedAt: new Date().toISOString()
              };
              if (entType.includes('customer')) {
                updates.trangThaiZns = norm;
              }
              t.update(entityRef, updates);
            }
          }

          return { entityId: znsData.entityId, entityType: znsData.entityType, znsData, internalStatus };
        } else {
           // Put into unmapped
           const unmappedRef = adminDb.collection('znsUnmappedResults').doc(trackingId);
           t.set(unmappedRef, {
              payload,
              vendorStatusCode: vendorStatus,
              error: 'No mapped ZnsMessage found.',
              receivedAt: new Date().toISOString()
           });
        }
        return null;
      });
      
      if (entityInfoFromDb?.znsData) {
        await workflowEventService.emitEvent(
          entityInfoFromDb.znsData.entityId,
          `${entityInfoFromDb.znsData.entityType.toLowerCase()}.zns.vendor_update`,
          { trackingId, vendorStatus, internalStatus: entityInfoFromDb.internalStatus, rawPayload: payload }
        );
      }

      const entityIdForLog = entityInfoFromDb?.entityId || 'none';
      const entityTypeForLog = entityInfoFromDb?.entityType || 'UNKNOWN';
      // await auditLogger.log('VENDOR_WEBHOOK_PROCESSED', entityIdForLog, entityTypeForLog, { trackingId, vendorStatus });

      return res.status(200).json({ success: true, message: 'Vendor webhook mapped successfully' });
    } catch (error) {
      logger.error({ err: error }, 'Error handling Vendor callback');
      try {
        const errMsg = error instanceof Error ? error.message : String(error);
        await adminDb.collection('znsDeadLetters').add({
          payload: req.body,
          error: errMsg,
          error_message: errMsg,
          source: 'vendor-webhook',
          created_at: new Date().toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (dlqError) {
        logger.error({ err: dlqError }, 'Failed to write to DLQ');
      }
      return res.status(200).json({ success: false, error: 'Internal processing error' });
    }
  }
}

export const vendorWebhookHandler = new VendorWebhookHandler();
