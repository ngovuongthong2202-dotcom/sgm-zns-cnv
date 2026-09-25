import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';
import { SendZnsMessageUseCase } from '../../../modules/messaging/application/use-cases/SendZnsMessage';
import { znsRepository } from '../../../modules/messaging/infrastructure/ZnsRepoSupabase';
import { znsVendor } from '../../../modules/messaging/infrastructure/CnvZnsVendor';
import {
  syncCustomerSnapshots,
  cleanupExpiredLocks
} from './cron-helpers';

const sendZnsUseCase = new SendZnsMessageUseCase(znsRepository, znsVendor);

export class CronService {
  async logHeartbeat(jobName: string) {
    try {
      await adminDb.collection('jobHeartbeats').doc(jobName).set({
        lastRun: new Date().toISOString(),
        status: 'ok'
      }, { merge: true });
    } catch(e) {
      console.error(`Failed to log heartbeat for ${jobName}`, e);
    }
  }

  async syncCustomerSnapshots(forceFullSync = false) {
    return syncCustomerSnapshots(forceFullSync);
  }

  async processOutbox() {
    let processed = 0;
    try {
      await this.logHeartbeat('outbox');
      const now = new Date().toISOString();
      const lockThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      // Find locked items that timed out (older than 5 mins)
      const staleLocks = await adminDb.collection('znsMessages')
        .where('status', '==', 'SENDING')
        .where('lockedAt', '<', lockThreshold)
        .limit(50)
        .get();

      if (!staleLocks.empty) {
        const batch = adminDb.batch();
        staleLocks.docs.forEach(doc => {
          // Increment attempts, exponential backoff
          const data = doc.data();
          const attempt = (data.attemptBucket || 0) + 1;
          const nextRetryAt = new Date(Date.now() + Math.pow(2, attempt) * 60 * 1000).toISOString(); // 2m, 4m, 8m...
          const newStatus = attempt > 3 ? 'DEAD_LETTER' : 'FAILED';
          
          if (newStatus === 'DEAD_LETTER') {
            adminDb.collection('notifications').add({
              type: 'danger',
              title: 'ZNS Thất bại (DLQ)',
              message: `Tin nhắn ZNS cho ${doc.data()?.entityType} (ID: ${doc.data()?.entityId}) đã thử lại thất bại và rơi vào hàng đợi lỗi.`,
              read: false,
              createdAt: new Date().toISOString()
            }).catch(() => {});
          }

          batch.update(doc.ref, { status: newStatus, lockedAt: null, attemptBucket: attempt, nextRetryAt });
        });
        await batch.commit();
      }

      const q = adminDb.collection('znsMessages')
        .where('status', '==', 'FAILED')
        .where('nextRetryAt', '<=', now)
        .limit(50);
      
      const querySnapshot = await q.get();
      if (querySnapshot.empty) return { processed: 0 };

      // Process with concurrency = 5
      const docs = querySnapshot.docs;
      const chunks = [];
      for (let i = 0; i < docs.length; i += 5) {
        chunks.push(docs.slice(i, i + 5));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(async (docSnapshot) => {
          // Lock message using transaction
          const locked = await adminDb.runTransaction(async (t) => {
            const docRef = docSnapshot.ref;
            const doc = await t.get(docRef);
            if (doc.data()?.status !== 'FAILED') return false;
            t.update(docRef, { status: 'SENDING', lockedAt: new Date().toISOString() });
            return true;
          });

          if (locked) {
            try {
              const msg = await znsRepository.findById(docSnapshot.id);
              if (msg) {
                  await sendZnsUseCase.execute({
                      entityId: msg.props.entityId,
                      entityType: msg.props.entityType,
                      messageType: msg.props.messageType,
                      phone: msg.props.phone,
                      payload: msg.props.payload
                  });
              }
            } catch (err) {
               // OutboundService should ideally handle its own failure state updates,
               // but as a fallback, we compute backoff here
               const data = docSnapshot.data();
               const attempt = (data.attemptBucket || 0) + 1;
               const nextRetryAt = new Date(Date.now() + Math.pow(2, attempt) * 60 * 1000).toISOString();
               const newStatus = attempt > 3 ? 'DEAD_LETTER' : 'FAILED';
               
               await docSnapshot.ref.update({ 
                  status: newStatus, 
                  lockedAt: null, 
                  attemptBucket: attempt, 
                  nextRetryAt,
                  errorLog: String(err)
               });
            }
            processed++;
          }
        }));
      }

    } catch (e) {
      logger.error({ err: e }, 'Error in processOutbox');
    }
    return { processed };
  }

  async cleanupExpiredLocks() {
    return cleanupExpiredLocks();
  }
}

export const cronService = new CronService();
