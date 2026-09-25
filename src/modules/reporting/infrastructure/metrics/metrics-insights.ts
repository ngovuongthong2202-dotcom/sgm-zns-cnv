import { Customer, Quotation, Contract, Payment, Delivery, ZnsMessage } from './metrics-interfaces';

export function differenceInDays(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / (1000 * 3600 * 24));
}

export function buildInsights(data: {
  customers: Customer[];
  quotations: Quotation[];
  contracts: Contract[];
  payments: Payment[];
  deliveries: Delivery[];
  znsMessages: ZnsMessage[];
}) {
  const { customers, quotations, contracts, payments, deliveries, znsMessages } = data;
  const now = new Date();

  // 1. KH Lâu chưa tương tác (> 90 ngày không có activity báo giá)
  const khLauKhongTuongTac = (() => {
    const lastActivityMap = new Map<string, Date>();
    customers.forEach(c => {
      if (c.createdAt) lastActivityMap.set(c.id, new Date(c.createdAt));
    });
    quotations.forEach(q => {
      if (q.ngayBaoGia && q.customerId) {
        const d = new Date(q.ngayBaoGia);
        const current = lastActivityMap.get(q.customerId);
        if (!current || d > current) lastActivityMap.set(q.customerId, d);
      }
    });
    const res: Array<{ customer: Customer; days: number }> = [];
    customers.forEach(c => {
      const lastDate = lastActivityMap.get(c.id);
      if (lastDate && differenceInDays(now, lastDate) > 90) {
        res.push({ customer: c, days: differenceInDays(now, lastDate) });
      }
    });
    return res.sort((a, b) => b.days - a.days);
  })();

  // 2. KH Cao Tiềm Năng (>= 3 báo giá nhưng chưa ký HĐ)
  const khTiemNang = (() => {
    const quoteCount = new Map<string, number>();
    quotations.forEach(q => {
      if (q.customerId) {
        quoteCount.set(q.customerId, (quoteCount.get(q.customerId) || 0) + 1);
      }
    });
    const hasContract = new Set(contracts.map(c => c.customerId));
    const res: Array<{ customer: Customer; quotes: number }> = [];
    customers.forEach(c => {
      const qc = quoteCount.get(c.id) || 0;
      if (qc >= 3 && !hasContract.has(c.id)) {
        res.push({ customer: c, quotes: qc });
      }
    });
    return res.sort((a, b) => b.quotes - a.quotes);
  })();

  // 3. KH ZNS Lỗi
  const khZnsLoi = (() => {
    const history = new Map<string, ZnsMessage[]>();
    znsMessages.forEach(m => {
      const key = m.soDienThoai || m.customerId;
      if (!key) return; // Skip if no key to prevent undefined
      if (!history.has(key)) history.set(key, []);
      history.get(key)!.push(m);
    });
    const res: Array<{ key: string; count: number; latestMsg: string }> = [];
    history.forEach((msgs, key) => {
      msgs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const isFailed = (m: ZnsMessage) => m.trangThai !== 'SUCCESS' && m.status !== 'SUCCESS';
      if (msgs.length >= 2 && isFailed(msgs[0]) && isFailed(msgs[1])) {
        res.push({ key, count: msgs.filter(isFailed).length, latestMsg: msgs[0].errorLog || '' });
      }
    });
    return res;
  })();

  // 4. HĐ Treo
  const hdTreo = (() => {
    const res: Array<{ contract: Contract; daysLate: number }> = [];
    contracts.forEach(c => {
      if (!c.ngayKy || !c.soNgayDuKienHoanThanh) return;
      const dl = new Date(c.ngayKy);
      dl.setDate(dl.getDate() + c.soNgayDuKienHoanThanh);

      if (now > dl) {
        const dels = deliveries.filter(d => d.contractId === c.id && d.ngayGiaoThucTe);
        if (dels.length === 0) {
          const pays = payments.filter(p => p.contractId === c.id);
          let lastPayDate = new Date(0);
          pays.forEach(p => {
            if (p.ngayThanhToan && new Date(p.ngayThanhToan) > lastPayDate) lastPayDate = new Date(p.ngayThanhToan);
          });
          if (pays.length === 0 || differenceInDays(now, lastPayDate) > 30) {
            res.push({ contract: c, daysLate: differenceInDays(now, dl) });
          }
        }
      }
    });
    return res.sort((a, b) => b.daysLate - a.daysLate);
  })();

  // 5. NPT Top
  const nvTop = (() => {
    const map = new Map<string, { name: string; quotes: number; contracts: number }>();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000);
    quotations
      .filter(q => q.ngayBaoGia && new Date(q.ngayBaoGia) > ninetyDaysAgo)
      .forEach(q => {
        const pt = q.nguoiPhuTrach || 'Chưa phân công';
        if (!map.has(pt)) map.set(pt, { name: pt, quotes: 0, contracts: 0 });
        map.get(pt)!.quotes++;
      });
    contracts
      .filter(c => c.ngayKy && new Date(c.ngayKy) > ninetyDaysAgo)
      .forEach(c => {
        const pt = c.nguoiPhuTrach || 'Chưa phân công';
        if (!map.has(pt)) map.set(pt, { name: pt, quotes: 0, contracts: 0 });
        map.get(pt)!.contracts++;
      });

    return Array.from(map.values())
      .map(e => ({ ...e, rate: e.quotes > 0 ? (e.contracts / e.quotes) * 100 : e.contracts > 0 ? 100 : 0 }))
      .filter(e => e.quotes >= 5)
      .sort((a, b) => b.rate - a.rate);
  })();

  // 6. Khu vực tăng trưởng
  const kvTangTruong = (() => {
    const sm = new Date(now.getFullYear(), now.getMonth(), 1);
    const pm_start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const calc = new Map<string, { name: string; currentMonth: number; prevMonth: number }>();

    quotations.forEach(q => {
      if (!q.ngayBaoGia) return;
      const d = new Date(q.ngayBaoGia);
      const cus = customers.find(cusDoc => cusDoc.id === q.customerId);
      const kv = cus?.tinhThanh || 'Unknown';
      if (!calc.has(kv)) calc.set(kv, { name: kv, currentMonth: 0, prevMonth: 0 });

      if (d >= sm) calc.get(kv)!.currentMonth++;
      else if (d >= pm_start && d < sm) calc.get(kv)!.prevMonth++;
    });

    return Array.from(calc.values())
      .map(e => ({
        ...e,
        growth: e.prevMonth > 0 ? ((e.currentMonth - e.prevMonth) / e.prevMonth) * 100 : e.currentMonth > 0 ? 100 : 0,
      }))
      .filter(e => e.currentMonth >= 3)
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5);
  })();

  return { khLauKhongTuongTac, khTiemNang, khZnsLoi, hdTreo, nvTop, kvTangTruong };
}
