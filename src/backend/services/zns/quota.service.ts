import { adminDb } from '../../config/supabase.admin';

interface ZnsQuotaDoc {
  remaining?: number;
  unlimited?: boolean;
  lastUpdated?: string;
}

export class ZnsQuotaService {
  /**
   * Consumes 1 quota unit. Throws if quota is exhausted.
   */
  async consumeQuota(): Promise<number> {
    const quotaRef = adminDb.collection('settings').doc('zns_quota');
    
    try {
      const remaining = await adminDb.runTransaction(async (t) => {
        const doc = await t.get(quotaRef);
        let currentQuota: number;
        
        if (!doc.exists) {
          currentQuota = 999999;
          t.set(quotaRef, { remaining: currentQuota, unlimited: true, lastUpdated: new Date().toISOString() });
        } else {
          const data = doc.data() as ZnsQuotaDoc | undefined;
          if (data?.unlimited === true) return 999999;
          if (data?.remaining === undefined || data?.remaining === null) return 999999;
          currentQuota = data.remaining;
        }

        if (currentQuota <= 0) {
          throw new Error('ZNS Quota Limit Exceeded');
        }

        const nextQuota = currentQuota - 1;
        t.update(quotaRef, {
          remaining: nextQuota,
          lastUpdated: new Date().toISOString()
        });

        // Trigger Notification warning if <= 100
        if (nextQuota === 100) {
          const warningMessage = `CẢNH BÁO: Quỹ ZNS của bạn chỉ còn ${nextQuota} tin nhắn. Hệ thống sẽ tự động ngừng gửi khi chạm 0. Vui lòng nạp thêm.`;
          
          adminDb.collection('notifications').add({
            type: 'warning',
            title: 'Sắp hết Quota ZNS',
            message: warningMessage,
            read: false,
            createdAt: new Date().toISOString()
          }).catch(() => {});
        }

        return nextQuota;
      });

      return remaining;
    } catch (err: unknown) { 
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'ZNS Quota Limit Exceeded') {
// eslint-disable-next-line preserve-caught-error
        throw new Error('ZNS Quota Limit Exceeded: -1472');
      }
      throw err;
    }
  }
}

export const znsQuotaService = new ZnsQuotaService();
