import { adminDb } from '../../../../backend/config/supabase.admin';
import { logger } from '../../../../backend/lib/logger';
import {
  Customer,
  Quotation,
  Contract,
  Payment,
  Delivery,
  ZnsMessage,
  buildBreakdown,
  buildProducts,
  buildZnsData
} from './metrics-rollup-helpers';
import { MetricsRollupSchema } from './metrics-rollup-schema';
import { QUOTATION_LOAI, normalizeLoai } from '../../../../domain/enums/quotation-loai';

export async function executeCustomRollup(fromDate: string, toDate: string, taskId: string) {
  try {
    logger.info(`Starting custom rollup for ${fromDate} - ${toDate}...`);
    
    const collections = ['customers', 'quotations', 'contracts', 'payments', 'deliveries', 'znsMessages'];
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
    
    for (const coll of collections) {
       const snap = await adminDb.collection(coll).get(); 

       const isWithin = (d: unknown) => {
          if (!d || typeof d !== 'string') return false;
          return d >= fromDate && d <= toDate;
       };
       
       const mappedDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
       if (coll === 'quotations') {
          data.quotations = (mappedDocs as unknown as Quotation[]).filter(d => isWithin(d.ngayBaoGia || d.createdAt));
       } else if (coll === 'contracts') {
          data.contracts = (mappedDocs as unknown as Contract[]).filter(d => isWithin(d.ngayKy || d.createdAt));
       } else if (coll === 'payments') {
          data.payments = (mappedDocs as unknown as Payment[]).filter(d => isWithin(d.ngayThanhToan || d.createdAt));
       } else if (coll === 'deliveries') {
          data.deliveries = (mappedDocs as unknown as Delivery[]).filter(d => isWithin(d.ngayGiaoMay || d.createdAt));
       } else if (coll === 'customers') {
          data.customers = (mappedDocs as unknown as Customer[]).filter(d => isWithin(d.createdAt));
       } else {
          data.znsMessages = (mappedDocs as unknown as ZnsMessage[]).filter(d => isWithin(d.createdAt));
       }
    }

    // 1. Customers
    const byTinhThanh: Record<string, number> = {}; 
    const byNguoiPhuTrach: Record<string, number> = {};

    data.customers.forEach(c => {
       const tt = c.tinhThanh || 'Khác';
       byTinhThanh[tt] = (byTinhThanh[tt] || 0) + 1;
       const nv = c.nguoiPhuTrachId || 'Chưa phân công';
       byNguoiPhuTrach[nv] = (byNguoiPhuTrach[nv] || 0) + 1;
    });

    // 2. Quotations
    const byLoai: Record<string, number> = { 'BG Vật tư': 0, 'BG Máy': 0, 'BG Dịch vụ': 0 }; 
    const byMonth: Record<string, number> = {};
    data.quotations.forEach(q => {
       const t = q.loai || 'Khác';
       byLoai[t] = (byLoai[t] || 0) + 1;
       const mo = q.ngayBaoGia?.slice(0, 7) || 'Unknown';
       byMonth[mo] = (byMonth[mo] || 0) + 1;
    });

    // 3. Contracts
    let pendingDelivery = 0;
    data.contracts.forEach(c => {
       if (!c.ngayBanGiaoThucTe) pendingDelivery++;
    });

    // 4. Payments
    const byTrangThai: Record<string, number> = { 'Tất toán': 0, 'Công nợ': 0, 'Miễn phí': 0, 'Chưa TT': 0 };
    let totalRevenue = 0;
    data.payments.forEach(p => {
       const t = p.tinhTrangThanhToan || 'Chưa TT';
       const l = t.toUpperCase().includes('TẤT TOÁN') || t === 'ĐÃ THANH TOÁN' ? 'Tất toán' : t;
       byTrangThai[l] = (byTrangThai[l] || 0) + 1;
       totalRevenue += p.soTien || 0;
    });

    // 5. Deliveries
    let daGiao = 0, chuaGiao = 0;
    data.deliveries.forEach(d => {
       if (d.ngayGiaoThucTe) daGiao++; else chuaGiao++;
    });

    // 6. ZNS
    let sentToday = 0, failedToday = 0, dlqCount = 0; const totalZns = data.znsMessages.length;
    data.znsMessages.forEach(z => {
       if (z.status === 'SUCCESS') sentToday++;
       else if (z.status === 'FAILED') failedToday++;
       if (z.status === 'DLQ') dlqCount++;
     });
    const successRate = totalZns > 0 ? (data.znsMessages.filter(z => z.status === 'SUCCESS').length / totalZns) * 100 : 0;

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

    const insights = {
      khLauKhongTuongTac: [], khTiemNang: [], khZnsLoi: [], hdTreo: [], nvTop: [], kvTangTruong: []
    };

    const metricsObj = {
      date: `${fromDate}_${toDate}`,
      customers: { total: data.customers.length, newToday: 0, newLast7d: 0, byTinhThanh, byNguoiPhuTrach },
      quotations: { total: data.quotations.length, byLoai, byMonth },
      contracts: { total: data.contracts.length, signed30d: 0, pendingDelivery, overdueDeadline: 0 },
      payments: { total: data.payments.length, byTrangThai, totalRevenue },
      deliveries: { total: data.deliveries.length, daGiao, chuaGiao, daGiaoThucTe30d: 0 },
      zns: { ...znsData.metrics, sentToday, successRate, failedToday, dlqCount, recentZns: [] },
      funnel_vattudv,
      funnel_may,
      stats: { khachCanCham: 0, bgSapHetHan: 0, phieuGiaoCham: 0, doanhThuThang: 0 },
      actionItems: [],
      reportsData: { breakdownVatTu, breakdownMay, productsVatTu, productsMay, zns: znsData },
      insights,
      generatedAt: new Date().toISOString(),
      generatedBy: 'custom-task'
    };

    const validatedMetrics = MetricsRollupSchema.parse(metricsObj);

    await adminDb.collection('metricsRollup').doc(`custom_${taskId}`).set({ ...validatedMetrics, status: 'COMPLETED' });
    logger.info(`Custom metrics rollup completed for task ${taskId}`);
  } catch (err: unknown) { 
    logger.error({ err }, 'Custom metrics rollup failed');
    await adminDb.collection('metricsRollup').doc(`custom_${taskId}`).set(
      { status: 'FAILED', error: (err instanceof Error ? err.message : String(err)), date: `${fromDate}_${toDate}` },
      { merge: true }
    );
  }
}
