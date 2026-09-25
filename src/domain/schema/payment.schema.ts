import { z } from 'zod';

import { ProductItemSchema } from './product.schema';

export const PaymentSchema = z.object({
  id: z.string().optional(),
  paymentId: z.string().min(1), // Logic ID
  contractId: z.string().optional(),
  quotationId: z.string().optional(),
  customerId: z.string().min(1),
  maKh: z.string().optional().or(z.literal('')),
  
  // Snapshot
  tenKhachHang: z.string().optional().or(z.literal('')),
  sdt: z.string().optional().or(z.literal('')),
  soHopDong: z.string().optional().or(z.literal('')),
  soDonHang: z.string().optional().or(z.literal('')),
  soPhieuBaoGia: z.string().optional().or(z.literal('')),
  ngayKy: z.string().optional().or(z.literal('')),
  
  // Payment specific (Manual Preserve)
  soChungTu: z.string().optional(),
  tenNguoiNop: z.string().optional(),
  phuongThucThanhToan: z.string().optional().default('Chuyển khoản'),
  ngayDenHan: z.string().optional(),
  tinhTrangThanhToan: z.string().optional(),
  ngayThanhToan: z.string().optional(),
  nguoiPhuTrach: z.string().optional(),
  ghiChu: z.string().optional(),
  
  // Financial fields
  soTien: z.number().optional(), // Legacy and input amount
  subTotal: z.number().optional(),
  vatRate: z.number().optional().default(0), 
  vatAmount: z.number().optional().default(0),
  discountRate: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  totalAmount: z.number().optional(), // Expected total from contract/quotation
  giaTriHopDong: z.number().optional(), // direct alias/sync for delivery mapping
  
  // Product details snapshot
  products: z.array(ProductItemSchema).optional().default([]),
  danhSachMaMay: z.array(z.string()).optional().default([]),
  slMay: z.number().int().nonnegative().optional(),
  dvt: z.string().optional(),
  loai: z.string().optional(),
  loaiBaoGia: z.string().optional(),
  
  // ZNS & Workflow - not strictly validated
  trangThaiGuiTinHopDong: z.string().optional().nullable(), // Fast-lane projection
  thongTinGuiZnsThanhToan: z.record(z.string(), z.unknown()).optional(),
  trangThaiGuiTinThanhToan: z.string().optional().nullable(),
  trangThaiNhacHan: z.string().optional().nullable(),
  nhacHanLan1At: z.string().optional(),
  nhacHanLan2At: z.string().optional(),
  logTomTat: z.string().optional(),
  createdAt: z.string().optional(),
}).strip();

export type Payment = z.infer<typeof PaymentSchema>;
