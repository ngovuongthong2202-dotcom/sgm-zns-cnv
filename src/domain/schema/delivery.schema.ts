import { z } from 'zod';

import { ProductItemSchema } from './product.schema';

export const DeliverySchema = z.object({
  id: z.string().optional(),
  deliveryId: z.string().min(1, 'Số hiệu giao hàng là bắt buộc'),
  paymentId: z.string().min(1),
  contractId: z.string().optional(),
  quotationId: z.string().optional(),
  customerId: z.string().min(1),
  maKh: z.string().optional().or(z.literal('')),
  
  // Snapshot
  tenKhachHang: z.string().optional().or(z.literal('')),
  sdt: z.string().optional().or(z.literal('')),
  nguoiDaiDien: z.string().optional().or(z.literal('')),
  soHopDong: z.string().optional().or(z.literal('')),
  soDonHang: z.string().optional().or(z.literal('')),
  ngayKy: z.string().optional().or(z.literal('')),
  giaTriHopDong: z.number().optional(),
  tinhTrangThanhToan: z.string().optional(),
  ngayThanhToan: z.string().optional(),
  nguoiPhuTrach: z.string().optional(),
  
  // Financial fields (Inherited snapshot)
  subTotal: z.number().optional(),
  vatRate: z.number().optional().default(0), 
  vatAmount: z.number().optional().default(0),
  discountRate: z.number().optional().default(0),
  discountAmount: z.number().optional().default(0),
  totalAmount: z.number().optional(),

  // Delivery specific (Manual Preserve)
  ngayLapPgh: z.string().optional(),
  soPhieuXuat: z.string().optional(),
  keToanKho: z.string().optional(),
  khoXuat: z.string().optional(),
  ngayTaoPhieuXuat: z.string().optional(),
  ghiChuNoiBo: z.string().optional(),
  donViVanChuyen: z.string().optional(),
  ngayGiaoMay: z.string().optional(),
  ngayGiaoThucTe: z.string().optional(),
  tinhTrangGiaoHang: z.string().optional(),
  kyNhan: z.string().optional(),
  ghiChu: z.string().optional(),
  soDienThoaiDonViVanChuyen: z.string().optional(),
  
  // Product snapshot (Current shipment items)
  products: z.array(ProductItemSchema).optional().default([]),
  danhSachMaMay: z.array(z.string()).optional().default([]),
  slMay: z.number().int().nonnegative().optional(),
  dvt: z.string().optional(),
  loai: z.string().optional(),
  loaiBaoGia: z.string().optional(),
  
  // ZNS & Workflow - not strictly validated
  trangThaiGuiTinThanhToan: z.string().optional().nullable(), // Fast-lane projection
  thongTinGuiZnsGiaoHang: z.record(z.string(), z.unknown()).optional(),
  trangThaiGuiTinGiaoHang: z.string().optional().nullable(),
  logTomTat: z.string().optional(),
}).strip();

export type Delivery = z.infer<typeof DeliverySchema>;
