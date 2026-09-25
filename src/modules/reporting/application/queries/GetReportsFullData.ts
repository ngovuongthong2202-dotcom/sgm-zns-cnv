import { adminDb } from '../../../../backend/config/supabase.admin';

export class GetReportsFullData {
  static async execute() {
    const todayString = new Date().toISOString().slice(0, 10);
    const docSnap = await adminDb.collection('metricsRollup').doc(`daily_${todayString}`).get();
    
    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    // Instead of raw arrays, we return the grouped data that metricsRollup computed
    return data?.reportsData || {};
  }
}
