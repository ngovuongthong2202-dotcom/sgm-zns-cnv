import { z } from 'zod';

import { ProductItemSchema } from './product.schema';

export const QuotationSchema = z.object({
  id: z.string().optional(),
  soPhieuBaoGia: z.string().min(1, 'Số phiếu báo giá là bắt buộc'), // Business Key
  customerId: z.string().min(1, 'Customer ID là bắt buộc'), // FK
  maKh: z.string().optional().or(z.literal('')), // Backward compatibility
  
  // Snapshot data from Customer
  tenKhachHang: z.string().optional().or(z.literal('')),
  nguoiDaiDien: z.string().optional(),
  sdt: z.string().optional().or(z.literal('')),
  
  // Quotation specific
  ngayBaoGia: z.string().optional(),
  hieuLuc: z.number().int().optional().default(7),
  ngayHetHan: z.string().optional(),
  tinhTrangBaoGia: z.string().optional(), // Legacy / Text
  lifecycleStatus: z.enum(['DRAFT', 'SENT', 'VIEWING', 'WON', 'LOST', 'EXPIRED']).optional().default('DRAFT'),
  lostReason: z.string().optional(),
  wonReason: z.string().optional(),
  kenhBaoGia: z.string().optional(),
  nguoiPhuTrach: z.string().optional(),
  
  // Versions
  revisions: z.array(z.object({
    id: z.string(),
    name: z.string().optional(),
    createdAt: z.string(),
    createdBy: z.string(),
    products: z.array(ProductItemSchema),
    note: z.string().optional(),
    subTotal: z.number().optional(),
    vatRate: z.number().optional(), // DEPRECATED
    vatAmount: z.number().optional(),
    discountRate: z.number().optional(), // DEPRECATED
    discountAmount: z.number().optional(),
    totalAmount: z.number().optional(),
  })).optional().default([]),
  
  // Product details
  products: z.array(ProductItemSchema).optional().default([]),
  slMay: z.number().int().nonnegative().optional(), // Total machine count (calculated)
  loai: z.string().optional(),
  loaiBaoGia: z.string().optional(),
  phanLoaiKhach: z.string().optional(),
  noiDungGhiChu: z.string().optional(),
  
  // Financial fields
  subTotal: z.number().optional(), // Represents totalGross
  vatRate: z.number().optional().default(0), // DEPRECATED
  vatAmount: z.number().optional().default(0), // Represents totalVat
  discountRate: z.number().optional().default(0), // DEPRECATED
  discountAmount: z.number().optional().default(0), // Represents totalDiscount
  totalAmount: z.number().optional(), // Represents totalAfterTax
  
  // Delivery Tracking (For direct Quotation -> Payment -> Delivery flow)
  deliveredQuantities: z.record(z.string(), z.number()).optional(),
  
  // ZNS & Workflow - not strictly validated
  trangThaiGuiTinQuangCao: z.string().optional().nullable(),
  thongTinGuiZnsBaoGia: z.record(z.string(), z.unknown()).optional(),
  trangThaiGuiTinBaoGia: z.string().optional().nullable(),
  trangThaiNhacHan: z.string().optional().nullable(),
  logTomTat: z.string().optional(),
}).strip();

export type Quotation = z.infer<typeof QuotationSchema>;
