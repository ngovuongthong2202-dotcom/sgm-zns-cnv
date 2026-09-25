import { adminDb } from '../../../../backend/config/supabase.admin';

export class GetPipeline {
  static async execute() {
    const todayString = new Date().toISOString().slice(0, 10);
    const docSnap = await adminDb.collection('metricsRollup').doc(`daily_${todayString}`).get();
    
    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    return {
      funnel_vattudv: data?.funnel_vattudv,
      funnel_may: data?.funnel_may,
      groupings: data?.customers, // Contains geography and sales reps
      contractFulfillment: data?.contracts,
      updateTime: docSnap.updateTime?.toMillis().toString() || Date.now().toString(),
    };
  }
}
