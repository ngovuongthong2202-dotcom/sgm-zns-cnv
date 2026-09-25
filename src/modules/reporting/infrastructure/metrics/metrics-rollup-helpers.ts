import { Customer, Quotation, Payment, Delivery, ZnsMessage } from './metrics-interfaces';
import { parseCurrencyToNumber } from '../../../../shared/utils/textFormatter';
export * from './metrics-interfaces';
export { differenceInDays, buildInsights } from './metrics-insights';

export function buildBreakdown(
  quotes: Quotation[],
  customers: Customer[],
  payments: Payment[],
  deliveries: Delivery[]
) {
  const map = new Map<string, { group: string; quotes: Quotation[]; pays: Payment[]; dels: Delivery[] }>();
  quotes.forEach(q => {
    const c = customers.find(cus => cus.id === q.customerId);
    const groupKey = c?.tinhThanh || 'Chưa xác định';
    if (!map.has(groupKey)) map.set(groupKey, { group: groupKey, quotes: [], pays: [], dels: [] });
    map.get(groupKey)!.quotes.push(q);
  });
  payments.forEach(p => {
    if (p.quotationId) {
      const q = quotes.find(quote => quote.id === p.quotationId);
      if (q) {
        const c = customers.find(cus => cus.id === q.customerId);
        const groupKey = c?.tinhThanh || 'Chưa xác định';
        map.get(groupKey)?.pays.push(p);
      }
    }
  });
  deliveries.forEach(d => {
    if (d.quotationId && d.ngayGiaoThucTe) {
      const q = quotes.find(quote => quote.id === d.quotationId);
      if (q) {
        const c = customers.find(cus => cus.id === q.customerId);
        const groupKey = c?.tinhThanh || 'Chưa xác định';
        map.get(groupKey)?.dels.push(d);
      }
    }
  });
  return Array.from(map.values())
    .map(e => {
      const khbg = new Set(e.quotes.map(q => q.customerId)).size;
      const payMap = new Map<string, Payment[]>();
      e.pays.forEach(p => {
        if (p.customerId) {
          if (!payMap.has(p.customerId)) payMap.set(p.customerId, []);
          payMap.get(p.customerId)!.push(p);
        }
      });
      const khPaid = Array.from(payMap.values()).filter(arr =>
        arr.every(p => p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN')
      ).length;
      const khDel = new Set(e.dels.map(d => d.customerId)).size;
      const rev = e.pays.reduce((acc: number, p) => {
        const valSource = p.totalAmount !== undefined && p.totalAmount !== null ? p.totalAmount : (p.soTien !== undefined && p.soTien !== null ? p.soTien : p.tongTienThanhToan);
        const num = parseCurrencyToNumber(valSource);
        return acc + num;
      }, 0);
      return { group: e.group, khbg, khPaid, khDel, rev, rate: khbg > 0 ? (khPaid / khbg) * 100 : 0 };
    })
    .sort((a, b) => b.rev - a.rev)
    .slice(0, 50);
}

export function buildProducts(quotes: Quotation[]) {
  const map = new Map<string, { name: string; unit: string; qty: number; customers: Set<string>; revenue: number }>();
  quotes.forEach(q => {
    if (!q.products || !q.customerId) return;
    q.products.forEach((p: any) => {
      const key = `${p.productName}|${p.unit || 'Máy'}`;
      if (!map.has(key)) map.set(key, { name: p.productName, unit: p.unit || 'Máy', qty: 0, customers: new Set<string>(), revenue: 0 });
      const entry = map.get(key)!;
      entry.qty += p.quantity || 0;
      entry.customers.add(q.customerId!);
      entry.revenue += (p.quantity || 0) * (p.price || 0);
    });
  });

  return Array.from(map.values())
    .map(e => ({
      name: e.name,
      unit: e.unit,
      qty: e.qty,
      revenue: e.revenue,
      cusCount: e.customers.size,
      customers: Array.from(e.customers),
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 50);
}

export function buildZnsData(zMsgs: ZnsMessage[]) {
  let success = 0;
  let fail = 0;
  const typeCount: Record<string, { total: number; success: number }> = {};
  const failReasons: Record<string, number> = {};
  const trendByKey: Record<string, { date: string; success: number; fail: number }> = {};

  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 3600 * 1000).toISOString().slice(5, 10);
    trendByKey[d] = { date: d, success: 0, fail: 0 };
  }

  zMsgs.forEach(m => {
    const isOk = m.trangThai === 'SUCCESS' || m.status === 'SUCCESS';
    if (isOk) success++;
    else fail++;
    const type = m.tenThaoTac || 'Khác';
    if (!typeCount[type]) typeCount[type] = { total: 0, success: 0 };
    typeCount[type].total++;
    if (isOk) typeCount[type].success++;

    if (!isOk) {
      let reason = m.errorLog || 'Lỗi không xác định';
      if (reason.length > 50) reason = reason.substring(0, 50) + '...';
      failReasons[reason] = (failReasons[reason] || 0) + 1;
    }
    if (m.createdAt) {
      const d = m.createdAt.slice(5, 10);
      if (trendByKey[d]) {
        if (isOk) trendByKey[d].success++;
        else trendByKey[d].fail++;
      }
    }
  });

  const perfByType = Object.entries(typeCount)
    .map(([name, vals]) => ({
      name,
      ...vals,
      rate: vals.total > 0 ? (vals.success / vals.total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  const topFails = Object.entries(failReasons)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const trend = Object.values(trendByKey);

  return {
    trend,
    topFails,
    perfByType,
    metrics: { total: zMsgs.length, success, fail, rate: zMsgs.length > 0 ? (success / zMsgs.length) * 100 : 0 },
  };
}
