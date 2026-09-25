import { z } from 'zod';

export const MetricsRollupSchema = z.object({
  date: z.string(),
  customers: z.object({
    total: z.number(),
    newToday: z.number(),
    newLast7d: z.number(),
    byTinhThanh: z.record(z.string(), z.number()),
    byNguoiPhuTrach: z.record(z.string(), z.number())
  }),
  quotations: z.object({
    total: z.number(),
    byLoai: z.record(z.string(), z.number()),
    byMonth: z.record(z.string(), z.number())
  }),
  contracts: z.object({
    total: z.number(),
    signed30d: z.number(),
    pendingDelivery: z.number(),
    overdueDeadline: z.number()
  }),
  payments: z.object({
    total: z.number(),
    byTrangThai: z.record(z.string(), z.number()),
    totalRevenue: z.number()
  }),
  deliveries: z.object({
    total: z.number(),
    daGiao: z.number(),
    chuaGiao: z.number(),
    daGiaoThucTe30d: z.number()
  }),
  zns: z.object({
    total: z.number(),
    success: z.number(),
    fail: z.number(),
    rate: z.number(),
    sentToday: z.number(),
    successRate: z.number(),
    failedToday: z.number(),
    dlqCount: z.number(),
    recentZns: z.array(z.unknown()).optional()
  }),
  funnel_vattudv: z.object({
    bg: z.number(),
    tt: z.number(),
    giaohang: z.number()
  }),
  funnel_may: z.object({
    bg: z.number(),
    hd: z.number(),
    tt: z.number(),
    giaohang: z.number()
  }),
  stats: z.object({
    khachCanCham: z.number(),
    bgSapHetHan: z.number(),
    phieuGiaoCham: z.number(),
    doanhThuThang: z.number()
  }),
  actionItems: z.array(z.unknown()), // Can be refined
  reportsData: z.object({
    breakdownVatTu: z.array(z.unknown()),
    breakdownMay: z.array(z.unknown()),
    productsVatTu: z.array(z.unknown()),
    productsMay: z.array(z.unknown()),
    zns: z.unknown()
  }),
  insights: z.object({
    khLauKhongTuongTac: z.array(z.unknown()),
    khTiemNang: z.array(z.unknown()),
    khZnsLoi: z.array(z.unknown()),
    hdTreo: z.array(z.unknown()),
    nvTop: z.array(z.unknown()),
    kvTangTruong: z.array(z.unknown())
  }),
  generatedAt: z.string(),
  generatedBy: z.string()
});
