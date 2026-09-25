import { z } from 'zod';

import { ProductItemSchema } from './product.schema';

export const ContractSchema = z.object({
  id: z.string().optional(),
  soHopDong: z.string().min(1, 'Số hợp đồng là bắt buộc'), // Business Key
  soDonHang: z.string().optional().or(z.literal('')),
  customerId: z.string().min(1),
  quotationId: z.string().min(1),
  maKh: z.string().optional().or(z.literal('')),
  
  // Snapshot
  tenKhachHang: z.string().optional().or(z.literal('')),
  nguoiDaiDien: z.string().optional(),
  sdt: z.string().optional().or(z.literal('')),
  soPhieuBaoGia: z.string().optional().or(z.literal('')),
  ngayBaoGia: z.string().optional().or(z.literal('')),
  
  // Contract specific (Manual Preserve Fields)
  ngayKy: z.string().optional(),
  nguoiPhuTrach: z.string().optional(),
  products: z.array(ProductItemSchema).optional().default([]),
  deliveredQuantities: z.record(z.string(), z.number()).optional(), // productId -> total delivered quantity
  danhSachMaMay: z.array(z.string()).optional().default([]),
  slMay: z.number().int().nonnegative().optional(),
  dvt: z.string().optional(),
  loai: z.string().optional(),
  loaiSanPham: z.string().optional(),
  loaiBaoGia: z.string().optional(),
  soNgayDuKienHoanThanh: z.number().int().optional(),
  
  // Financial fields
  subTotal: z.number().optional(),
  vatRate: z.number().optional().default(0), 
  vatAmount: z.number().optional().default(0),
  discountRate: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  totalAmount: z.number().optional(),
  
  // ZNS & Workflow - not strictly validated
  trangThaiGuiTinBaoGia: z.string().optional().nullable(), // Fast-lane projection
  thongTinGuiZnsKyHopDong: z.record(z.string(), z.unknown()).optional(),
  trangThaiGuiTinHopDong: z.string().optional().nullable(),
  tinhTrangHopDong: z.string().optional(),
  logTomTat: z.string().optional(),
}).strip();

export type Contract = z.infer<typeof ContractSchema>;
