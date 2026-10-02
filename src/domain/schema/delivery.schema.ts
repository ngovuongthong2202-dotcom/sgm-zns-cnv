import { z } from 'zod';

import { ProductItemSchema } from './product.schema';

export const DeliveryShipmentSchema = z.object({
  id: z.string(), // "DOT-1", "DOT-2", UUID...
  dotGiaoHang: z.number().int().positive(), // 1, 2, 3...
  soPhieuXuat: z.string().min(1, 'Số phiếu xuất kho là bắt buộc'), // VD: "PXK-2605-012"
  
  // Thời gian & Trạng thái
  ngayGiaoMay: z.string().optional(), // Ngày hẹn giao (YYYY-MM-DD)
  ngayGiaoThucTe: z.string().optional().nullable(), // Ngày thực tế giao xong
  tinhTrangGiaoHang: z.string().optional().default('CHO_GIAO'), // 'CHO_GIAO' | 'DANG_GIAO' | 'HOAN_TAT'
  
  // Danh mục sản phẩm xuất kho đợt này
  products: z.array(ProductItemSchema).optional().default([]),
  danhSachMaMay: z.array(z.string()).optional().default([]), // Danh sách serial máy của đợt này
  slMay: z.number().nonnegative().optional(), // Tổng SL sản phẩm đợt này (hỗ trợ số thực lẻ)
  dvt: z.string().optional().default('Máy'),
  
  // Vận chuyển & Bàn giao
  thoGiaoMay: z.string().optional().or(z.literal('')),
  sdtThoGiaoMay: z.string().optional().or(z.literal('')),
  donViVanChuyen: z.string().optional(),
  soDienThoaiDonViVanChuyen: z.string().optional(),
  keToanKho: z.string().optional(),
  khoXuat: z.string().optional(),
  
  // Nghiệm thu & Biên bản
  soBienBanNghiemThu: z.string().optional(),
  ngayNghiemThu: z.string().optional(),
  tinhTrangNghiemThu: z.string().optional().default('DONG_Y'),
  yKienNghiemThu: z.string().optional(),
  kyNhan: z.string().optional(),
  ghiChu: z.string().optional(),
  
  // Đặc cách Ban Giám Đốc cho riêng đợt này
  dacCachGiaoTruoc: z.boolean().optional().default(false),
  lyDoDacCach: z.string().optional(),
  nguoiPheDuyetDacCach: z.string().optional(),
  
  // ZNS Giao hàng riêng của đợt này
  thongTinGuiZnsGiaoHang: z.record(z.string(), z.unknown()).optional(),
  trangThaiGuiTinGiaoHang: z.string().optional().nullable(),
  
  isDotCuoiCung: z.boolean().optional().default(false),
  giaTriXuatKhoDotNay: z.number().optional(),
  createdAt: z.string().optional(),
});

export type DeliveryShipment = z.infer<typeof DeliveryShipmentSchema>;

export const DeliverySchema = z.object({
  id: z.string().optional(),
  deliveryId: z.string().min(1, 'Số hiệu giao hàng là bắt buộc'),
  paymentId: z.string().optional().default(''),
  contractId: z.string().optional(),
  quotationId: z.string().optional(),
  customerId: z.string().min(1),
  maKh: z.string().optional().or(z.literal('')),
  
  // Snapshot
  tenKhachHang: z.string().optional().or(z.literal('')),
  sdt: z.string().optional().or(z.literal('')),
  nguoiDaiDien: z.string().optional().or(z.literal('')),
  diaChiGiaoHang: z.string().optional().or(z.literal('')),
  nguoiLienHe: z.string().optional().or(z.literal('')),
  sdtLienHe: z.string().optional().or(z.literal('')),
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
  ngayGiaoThucTe: z.string().optional().nullable(),
  tinhTrangGiaoHang: z.string().optional(),
  kyNhan: z.string().optional(),
  ghiChu: z.string().optional(),
  soDienThoaiDonViVanChuyen: z.string().optional(),
  thoGiaoMay: z.string().optional().or(z.literal('')),
  sdtThoGiaoMay: z.string().optional().or(z.literal('')),
  soBienBanNghiemThu: z.string().optional(),
  ngayNghiemThu: z.string().optional(),
  tinhTrangNghiemThu: z.string().optional().default('DONG_Y'),
  yKienNghiemThu: z.string().optional(),
  
  // Product snapshot (Current shipment items or Scope gốc)
  products: z.array(ProductItemSchema).optional().default([]),
  danhSachMaMay: z.array(z.string()).optional().default([]),
  slMay: z.number().nonnegative().optional(), // Bỏ ràng buộc .int()
  dvt: z.string().optional(),
  loai: z.string().optional(),
  loaiBaoGia: z.string().optional(),
  
  // SỔ CÁI CÁC ĐỢT GIAO THỰC TẾ (SOVEREIGN MULTI-SHIPMENT LEDGER)
  cacDotGiao: z.array(DeliveryShipmentSchema).optional().default([]),

  // Multi-Shipment Milestones (Phân kỳ giao hàng)
  dotGiaoHang: z.number().int().positive().optional().default(1),
  tongSoDotUocTinh: z.number().int().positive().optional(),
  isDotCuoiCung: z.boolean().optional().default(false),
  tienDoLuyKe: z.number().optional().default(100),
  giaTriXuatKhoDotNay: z.number().optional(),
  chenhLechTaiChinh: z.number().optional(),
  
  // Executive Pre-delivery Waiver (Đặc cách Ban Giám Đốc)
  dacCachGiaoTruoc: z.boolean().optional().default(false),
  lyDoDacCach: z.string().optional(),
  nguoiPheDuyetDacCach: z.string().optional(),
  soPhieuBaoGia: z.string().optional(),
  soBaoGia: z.string().optional(),
  ngayBaoGia: z.string().optional(),

  // ZNS & Workflow - not strictly validated
  trangThaiGuiTinThanhToan: z.string().optional().nullable(), // Fast-lane projection
  thongTinGuiZnsGiaoHang: z.record(z.string(), z.unknown()).optional(),
  trangThaiGuiTinGiaoHang: z.string().optional().nullable(),
  logTomTat: z.string().optional(),
}).strip();

export type Delivery = z.infer<typeof DeliverySchema>;
