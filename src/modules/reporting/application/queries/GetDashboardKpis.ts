import { adminDb } from '../../../../backend/config/supabase.admin';

export class GetDashboardKpis {
  static async execute() {
    const todayString = new Date().toISOString().slice(0, 10);
    const docSnap = await adminDb.collection('metricsRollup').doc(`daily_${todayString}`).get();
    
    if (!docSnap.exists) {
      return null;
    }

    const data = docSnap.data();
    return {
      stats: data?.stats,
      actionItems: data?.actionItems,
      zns: data?.zns,
      funnel_vattudv: data?.funnel_vattudv,
      funnel_may: data?.funnel_may,
      customers: data?.customers,
      contracts: data?.contracts,
      generatedAt: data?.generatedAt,
      updateTime: docSnap.updateTime?.toMillis().toString() || Date.now().toString(),
    };
  }
}
