import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';
import { startOfMonth, subMonths, format } from 'date-fns';

export class StatsService {
  /**
   * Run nightly to aggregate counts and revenue 
   * so the dashboard doesn't have to fetch 50k docs.
   */
  async buildMaterializedViews() {
    logger.info(`Starting Data Materialization at ${new Date().toISOString()}`);
    let processedMonths = 0;

    try {
      // We will summarize current month and previous month.
      const now = new Date();
      const currentMonth = startOfMonth(now);
      const prevMonth = startOfMonth(subMonths(now, 1));
      const monthsToProcess = [currentMonth, prevMonth];

      for (const mStart of monthsToProcess) {
        const monthKey = format(mStart, 'yyyy-MM');
        
        // Let's aggregate payments within this month
        const nextMonthStart = new Date(mStart);
        nextMonthStart.setMonth(nextMonthStart.getMonth() + 1);

        const paymentsQuery = await adminDb.collection('payments')
            .where('ngayThanhToan', '>=', mStart.toISOString())
            .where('ngayThanhToan', '<', nextMonthStart.toISOString())
            .get();

        let revenue = 0;
        let successfulPayments = 0;
        paymentsQuery.forEach((doc: any) => {
            const data = doc.data();
            if (data.tinhTrangThanhToan === 'Tất toán' || data.tinhTrangThanhToan === 'ĐÃ THANH TOÁN') {
                revenue += (data.soTien || 0);
                successfulPayments++;
            }
        });

        // Quotes
        const quotesQuery = await adminDb.collection('quotations')
            .where('ngayBaoGia', '>=', mStart.toISOString())
            .where('ngayBaoGia', '<', nextMonthStart.toISOString())
            .get();

        // Contracts
        const contractsQuery = await adminDb.collection('contracts')
            .where('ngayKy', '>=', mStart.toISOString())
            .where('ngayKy', '<', nextMonthStart.toISOString())
            .get();
        
        // ZNS
        const znsQuery = await adminDb.collection('znsMessages')
            .where('createdAt', '>=', mStart.toISOString())
            .where('createdAt', '<', nextMonthStart.toISOString())
            .get();
        
        let znsSuccess = 0;
        znsQuery.forEach((doc: any) => {
           if (doc.data().trangThai === 'SUCCESS') znsSuccess++;
        });

        // Upsert view
        await adminDb.collection('dashboard_stats_monthly').doc(monthKey).set({
            month: monthKey,
            totals: {
                revenue,
                successfulPayments,
                quotesCount: quotesQuery.size,
                contractsCount: contractsQuery.size,
                znsTotal: znsQuery.size,
                znsSuccess,
            },
            updatedAt: new Date().toISOString()
        }, { merge: true });

        processedMonths++;
      }
    } catch (e) {
      logger.error({ err: e }, "Failed to build materialized stats");
    }

    return { processedMonths };
  }
}

export const statsService = new StatsService();
