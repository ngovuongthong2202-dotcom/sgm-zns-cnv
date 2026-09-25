import { adminDb } from '../../../../backend/config/supabase.admin';
import { logger } from '../../../../backend/lib/logger';
import { EntityZnsStatus, normalizeLegacyStatus } from '../../../../domain/enums/zns-status';
import { QUOTATION_LOAI, normalizeLoai } from '../../../../domain/enums/quotation-loai';
import {
  Customer,
  Quotation,
  Contract,
  Payment,
  Delivery,
  ZnsMessage,
  ActionItem,
  buildBreakdown,
  buildProducts,
  buildZnsData,
  buildInsights
} from './metrics-rollup-helpers';
import { MetricsRollupSchema } from './metrics-rollup-schema';
import { executeCustomRollup } from './custom-rollup-helper';
import {
  rollupCustomers,
  rollupQuotations,
  rollupContracts,
  rollupPayments,
  rollupDeliveries,
  RollupContext
} from './metrics-domain-rollups';

export class MetricsRollupService {
  async runRollup() {
    try {
      logger.info('Starting metrics rollup...');
      const now = Date.now();
      
      const collections = ['customers', 'quotations', 'contracts', 'payments', 'deliveries', 'znsMessages'];
      const grandTotals: Record<string, number> = {};
      
      const data: {
        customers: Customer[];
        quotations: Quotation[];
        contracts: Contract[];
        payments: Payment[];
        deliveries: Delivery[];
        znsMessages: ZnsMessage[];
      } = {
        customers: [],
        quotations: [],
        contracts: [],
        payments: [],
        deliveries: [],
        znsMessages: []
      };

      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const ninetyDaysAgoIso = ninetyDaysAgo.toISOString();

      for (const coll of collections) {
         // Cheap native count aggregation - filtered by deletedAt == null for core entities
         let countQuery: any = adminDb.collection(coll);
         if (coll !== 'znsMessages') {
           countQuery = countQuery.where('deletedAt', '==', null);
         }
         const countSnap = await countQuery.count().get();
         grandTotals[coll] = countSnap.data().count;

         let lastDoc = undefined;
         let hasMore = true;
         // Limit to max 10,000 recent records per collection to prevent quota exhaustion
         let recordsFetched = 0;
         const maxRecords = 10000;

         while(hasMore && recordsFetched < maxRecords) {
           let queryRef: any = adminDb.collection(coll);
           if (coll !== 'znsMessages') {
             queryRef = queryRef.where('deletedAt', '==', null);
           }
           if (coll === 'znsMessages' || coll === 'payments' || coll === 'deliveries') {
              queryRef = queryRef.where('createdAt', '>=', ninetyDaysAgoIso).orderBy('createdAt', 'desc').limit(1000);
           } else {
              queryRef = queryRef.where('updatedAt', '>=', ninetyDaysAgoIso).orderBy('updatedAt', 'desc').limit(1000);
           }
           
           if (lastDoc) {
             queryRef = queryRef.startAfter(lastDoc);
           }
           try {
             const snap = await queryRef.get();
             const docs = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
             recordsFetched += docs.length;
             if (coll === 'customers') data.customers.push(...docs as unknown as Customer[]);
             else if (coll === 'quotations') data.quotations.push(...docs as unknown as Quotation[]);
             else if (coll === 'contracts') data.contracts.push(...docs as unknown as Contract[]);
             else if (coll === 'payments') data.payments.push(...docs as unknown as Payment[]);
             else if (coll === 'deliveries') data.deliveries.push(...docs as unknown as Delivery[]);
             else if (coll === 'znsMessages') data.znsMessages.push(...docs as unknown as ZnsMessage[]);

             if (snap.size < 1000) {
               hasMore = false;
             } else {
               lastDoc = snap.docs[snap.docs.length - 1];
             }
           } catch (err) {
             logger.warn({ err, coll }, 'Error or missing index during metrics rollup query, falling back to name ordering');
             // Fallback query if index is missing, filtered by deletedAt
             let fallbackQuery: any = adminDb.collection(coll);
             if (coll !== 'znsMessages') {
               fallbackQuery = fallbackQuery.where('deletedAt', '==', null);
             }
             fallbackQuery = fallbackQuery.orderBy('__name__').limit(1000);
             if (lastDoc) fallbackQuery = fallbackQuery.startAfter(lastDoc);
             const fallbackSnap = await fallbackQuery.get();
             const docs = fallbackSnap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
             recordsFetched += docs.length;
             if (coll === 'customers') data.customers.push(...docs as unknown as Customer[]);
             else if (coll === 'quotations') data.quotations.push(...docs as unknown as Quotation[]);
             else if (coll === 'contracts') data.contracts.push(...docs as unknown as Contract[]);
             else if (coll === 'payments') data.payments.push(...docs as unknown as Payment[]);
             else if (coll === 'deliveries') data.deliveries.push(...docs as unknown as Delivery[]);
             else if (coll === 'znsMessages') data.znsMessages.push(...docs as unknown as ZnsMessage[]);

             if (fallbackSnap.size < 1000) {
               hasMore = false;
             } else {
               lastDoc = fallbackSnap.docs[fallbackSnap.docs.length - 1];
             }
           }
         }
      }

      const todayString = new Date().toISOString().slice(0, 10);
      const isToday = (d: unknown): boolean => !!(d && typeof d === 'string' && d.startsWith(todayString)); 
      const isLast7d = (d: unknown): boolean => !!(d && typeof d === 'string' && (Date.now() - new Date(d).getTime() <= 7 * 24 * 3600 * 1000)); 
      const isLast30d = (d: unknown): boolean => !!(d && typeof d === 'string' && (Date.now() - new Date(d).getTime() <= 30 * 24 * 3600 * 1000));

      const hasZnsStatus = (obj: Record<string, unknown> | undefined, field: string) => {
         return normalizeLegacyStatus(obj?.[field] as string) === EntityZnsStatus.THANH_CONG;
      };

      const ctx: RollupContext = {
         todayString,
         isToday,
         isLast7d,
         isLast30d,
         hasZnsStatus
      };

      const actionItems: ActionItem[] = [];

      // 1. Customers Rollup
      const customerRollupRes = rollupCustomers(data.customers, ctx);
      actionItems.push(...customerRollupRes.actionItems);

      // 2. Quotations Rollup
      const quotationRollupRes = rollupQuotations(data.quotations, ctx);
      actionItems.push(...quotationRollupRes.actionItems);

      // 3. Contracts Rollup
      const contractRollupRes = rollupContracts(data.contracts, ctx);

      // 4. Payments Rollup
      const paymentRollupRes = rollupPayments(data.payments, ctx);

      // 5. Deliveries Rollup
      const deliveryRollupRes = rollupDeliveries(data.deliveries, ctx);
      actionItems.push(...deliveryRollupRes.actionItems);

      // 6. ZNS
      let sentToday = 0, failedToday = 0, dlqCount = 0; const totalZns = data.znsMessages.length;
      data.znsMessages.forEach(z => {
         if (z.status === 'SUCCESS') sentToday++;
         else if (z.status === 'FAILED') failedToday++;
         if (z.status === 'DLQ') dlqCount++;
      });
      const successRate = totalZns > 0 ? (data.znsMessages.filter(z => z.status === 'SUCCESS').length / totalZns) * 100 : 0;
 
      const recentZns = data.znsMessages
         .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
         .slice(0, 10);

      // 7. Funnels
      const funnel_vattudv = { 
         bg: data.quotations.filter(q => {
            const l = normalizeLoai(q.loai);
            return l === QUOTATION_LOAI.VAT_TU || l === QUOTATION_LOAI.DICH_VU;
         }).length,
         tt: data.payments.length,
         giaohang: data.deliveries.length
      };

      const funnel_may = {
         bg: data.quotations.filter(q => normalizeLoai(q.loai) === QUOTATION_LOAI.MAY).length,
         hd: data.contracts.length,
         tt: data.payments.length,
         giaohang: data.deliveries.length
      };

      const vatTuQuotes = data.quotations.filter(q => {
         const l = normalizeLoai(q.loai);
         return l === QUOTATION_LOAI.VAT_TU || l === QUOTATION_LOAI.DICH_VU;
      });
      const mayQuotes = data.quotations.filter(q => normalizeLoai(q.loai) === QUOTATION_LOAI.MAY);

      const breakdownVatTu = buildBreakdown(vatTuQuotes, data.customers, data.payments, data.deliveries);
      const breakdownMay = buildBreakdown(mayQuotes, data.customers, data.payments, data.deliveries);
      const productsVatTu = buildProducts(vatTuQuotes);
      const productsMay = buildProducts(mayQuotes);
      const znsData = buildZnsData(data.znsMessages);

      const insights = buildInsights(data);

      const metricsObj = {
        date: todayString,
        customers: {
          total: grandTotals['customers'],
          newToday: customerRollupRes.newCusToday,
          newLast7d: customerRollupRes.newCus7d,
          byTinhThanh: customerRollupRes.byTinhThanh,
          byNguoiPhuTrach: customerRollupRes.byNguoiPhuTrach
        },
        quotations: {
          total: grandTotals['quotations'],
          byLoai: quotationRollupRes.byLoai,
          byMonth: quotationRollupRes.byMonth
        },
        contracts: {
          total: grandTotals['contracts'],
          signed30d: contractRollupRes.signed30d,
          pendingDelivery: contractRollupRes.pendingDelivery,
          overdueDeadline: contractRollupRes.overdueDeadline
        },
        payments: {
          total: grandTotals['payments'],
          byTrangThai: paymentRollupRes.byTrangThai,
          totalRevenue: paymentRollupRes.totalRevenue
        },
        deliveries: {
          total: grandTotals['deliveries'],
          daGiao: deliveryRollupRes.daGiao,
          chuaGiao: deliveryRollupRes.chuaGiao,
          daGiaoThucTe30d: deliveryRollupRes.daGiaoThucTe30d
        },
        zns: { ...znsData.metrics, total: grandTotals['znsMessages'], sentToday, successRate, failedToday, dlqCount, recentZns },
        funnel_vattudv,
        funnel_may,
        stats: {
          khachCanCham: customerRollupRes.khachCanCham,
          bgSapHetHan: quotationRollupRes.bgSapHetHan,
          phieuGiaoCham: deliveryRollupRes.phieuGiaoCham,
          doanhThuThang: paymentRollupRes.doanhThuThang
        },
        actionItems: actionItems.sort((a,b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime()).slice(0, 10),
        reportsData: { breakdownVatTu, breakdownMay, productsVatTu, productsMay, zns: znsData },
        insights,
        generatedAt: new Date().toISOString(),
        generatedBy: 'cron'
      };

      const validatedMetrics = MetricsRollupSchema.parse(metricsObj);

      await adminDb.collection('metricsRollup').doc(`daily_${todayString}`).set(validatedMetrics);
      await adminDb.collection('metrics').doc('dashboard_kpis').set(validatedMetrics); // fallback compat
      
      logger.info(`Metrics rollup completed for ${todayString} in ` + (Date.now() - now) + 'ms');

    } catch (err: unknown) {
      logger.error({ err }, 'Metrics rollup failed');
    }
  }

  async runCustomRollup(fromDate: string, toDate: string, taskId: string) {
    return executeCustomRollup(fromDate, toDate, taskId);
  }
}

export const metricsRollupService = new MetricsRollupService();
