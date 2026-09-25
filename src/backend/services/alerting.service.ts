import { logger } from '../lib/logger';
import { adminDb } from '../config/supabase.admin';

export async function sendZaloAlert(message: string) {
   // In a real implementation, we would call the Zalo API here.
   // E.g. axios.post('https://openapi.zalo.me/v2.0/oa/message', ...)
   
   logger.info({ event: 'SYSTEM_ALERT', message });
   
   // Keep a record of recent alerts to avoid spamming
   await adminDb.collection('systemAlerts').add({
      message,
      timestamp: new Date().toISOString()
   });
}
