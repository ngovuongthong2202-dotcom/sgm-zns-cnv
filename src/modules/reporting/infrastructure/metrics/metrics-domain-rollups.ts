import { Customer, Quotation, Contract, Payment, Delivery, ActionItem } from './metrics-interfaces';
import { parseCurrencyToNumber } from '../../../../shared/utils/textFormatter';
import { QUOTATION_LOAI, normalizeLoai } from '../../../../domain/enums/quotation-loai';
import { isPaymentFullyPaid, isPaymentPartial } from '../../../../domain/enums/payment-status';

export interface RollupContext {
  todayString: string;
  isToday: (d: unknown) => boolean;
  isLast7d: (d: unknown) => boolean;
  isLast30d: (d: unknown) => boolean;
  hasZnsStatus: (obj: Record<string, unknown> | undefined, field: string) => boolean;
}

export function rollupCustomers(customers: Customer[], ctx: RollupContext) {
  const byTinhThanh: Record<string, number> = {}; 
  const byNguoiPhuTrach: Record<string, number> = {};
  let newCusToday = 0;
  let newCus7d = 0;
  let khachCanCham = 0;
  const actionItems: ActionItem[] = [];

  customers.forEach(c => {
    if (ctx.isToday(c.createdAt)) newCusToday++;
    if (ctx.isLast7d(c.createdAt)) newCus7d++;
    const tt = c.tinhThanh || 'Khác';
    byTinhThanh[tt] = (byTinhThanh[tt] || 0) + 1;
    const nv = c.nguoiPhuTrachId || 'Chưa phân công';
    byNguoiPhuTrach[nv] = (byNguoiPhuTrach[nv] || 0) + 1;

    if (!ctx.hasZnsStatus(c as unknown as Record<string, unknown>, 'trangThaiGuiTinLoiChuc') || !ctx.hasZnsStatus(c as unknown as Record<string, unknown>, 'trangThaiGuiTinCSKH')) {
      khachCanCham++;
      actionItems.push({
        type: 'ZNS_PENDING',
        entityName: c.name || c.tenKhachHang || 'Khách hàng',
        status: 'warning',
        time: c.createdAt || ctx.todayString,
        link: `/customers`
      });
    }
  });

  return {
    byTinhThanh,
    byNguoiPhuTrach,
    newCusToday,
    newCus7d,
    khachCanCham,
    actionItems
  };
}

export function rollupQuotations(quotations: Quotation[], ctx: RollupContext) {
  const byLoai: Record<string, number> = { [QUOTATION_LOAI.VAT_TU]: 0, [QUOTATION_LOAI.MAY]: 0, [QUOTATION_LOAI.DICH_VU]: 0 }; 
  const byMonth: Record<string, number> = {};
  let bgSapHetHan = 0;
  const actionItems: ActionItem[] = [];

  quotations.forEach(q => {
    const t = normalizeLoai(q.loai) || 'Khác';
    byLoai[t] = (byLoai[t] || 0) + 1;
    const mo = q.ngayBaoGia?.slice(0, 7) || 'Unknown';
    byMonth[mo] = (byMonth[mo] || 0) + 1;

    const days = q.ngayBaoGia ? Math.floor((Date.now() - new Date(q.ngayBaoGia).getTime())/(1000*3600*24)) : 0;
    if (days >= 15 && !ctx.hasZnsStatus(q as unknown as Record<string, unknown>, 'trangThaiGuiTinBaoGia')) {
      bgSapHetHan++;
      actionItems.push({
        type: 'EXPIRING',
        entityName: `BG: ${q.soBaoGia || '?' }`,
        status: 'urgent',
        time: q.ngayBaoGia || ctx.todayString,
        link: `/quotations`
      });
    }
  });

  return {
    byLoai,
    byMonth,
    bgSapHetHan,
    actionItems
  };
}

export function rollupContracts(contracts: Contract[], ctx: RollupContext) {
  let signed30d = 0;
  let pendingDelivery = 0;
  let overdueDeadline = 0;

  contracts.forEach(c => {
    if (ctx.isLast30d(c.ngayKy)) signed30d++;
    if (!c.ngayBanGiaoThucTe) pendingDelivery++;
    if (c.ngayBanGiaoDuKien && !c.ngayBanGiaoThucTe && new Date(c.ngayBanGiaoDuKien).getTime() < Date.now()) {
      overdueDeadline++;
    }
  });

  return {
    signed30d,
    pendingDelivery,
    overdueDeadline
  };
}

export function rollupPayments(payments: Payment[], ctx: RollupContext) {
  const byTrangThai: Record<string, number> = { 'Tất toán': 0, 'Công nợ': 0, 'Miễn phí': 0, 'Chưa TT': 0 };
  let totalRevenue = 0;
  let doanhThuThang = 0;

  payments.forEach(p => {
    const t = p.tinhTrangThanhToan || 'Chưa TT';
    const l = t.toUpperCase().includes('TẤT TOÁN') || t === 'ĐÃ THANH TOÁN' ? 'Tất toán' : t;
    byTrangThai[l] = (byTrangThai[l] || 0) + 1;
    totalRevenue += p.soTien || 0;

    const isCollected = isPaymentFullyPaid(p.tinhTrangThanhToan) || isPaymentPartial(p.tinhTrangThanhToan) || ctx.hasZnsStatus(p as unknown as Record<string, unknown>, 'trangThaiGuiTinThanhToan');
    if (isCollected) {
      const valSource = p.soTien !== undefined && p.soTien !== null ? p.soTien : (p.totalAmount !== undefined && p.totalAmount !== null ? p.totalAmount : p.tongTienThanhToan);
      const num = parseCurrencyToNumber(valSource);
      doanhThuThang += num;
    }
  });

  return {
    byTrangThai,
    totalRevenue,
    doanhThuThang
  };
}

export function rollupDeliveries(deliveries: Delivery[], ctx: RollupContext) {
  let daGiao = 0;
  let daGiaoThucTe30d = 0;
  let chuaGiao = 0;
  let phieuGiaoCham = 0;
  const actionItems: ActionItem[] = [];

  deliveries.forEach(d => {
    if (d.ngayGiaoThucTe) daGiao++; else chuaGiao++;
    if (d.ngayGiaoThucTe && ctx.isLast30d(d.ngayGiaoThucTe)) daGiaoThucTe30d++;

    if (!ctx.hasZnsStatus(d as unknown as Record<string, unknown>, 'trangThaiGuiTinGiaoHang') && (d.ngayGiaoMay || d.ngayGiaoDuKien)) {
      const timeToCompare = d.ngayGiaoMay || d.ngayGiaoDuKien || '';
      if (Date.now() > new Date(timeToCompare).getTime()) {
        phieuGiaoCham++;
        actionItems.push({
          type: 'DELAYED',
          entityName: `Giao: ${(d as unknown as Record<string, unknown>).soPhieuXuat || (d as unknown as Record<string, unknown>).deliveryId || '?'}`,
          status: 'danger',
          time: timeToCompare,
          link: `/deliveries`
        });
      }
    }
  });

  return {
    daGiao,
    chuaGiao,
    daGiaoThucTe30d,
    phieuGiaoCham,
    actionItems
  };
}
