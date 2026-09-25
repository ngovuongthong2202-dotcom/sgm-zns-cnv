import { z } from 'zod';
import { zProperString, zPhoneString, zSafeString } from '@/src/domain/mapping/zod-transforms';

export const ContactSchema = z.object({
  danhXung: z.string().optional().pipe(zSafeString.optional()),
  nguoiDaiDien: z.string().optional().pipe(zProperString.optional()),
  sdt: z.string().optional().pipe(zPhoneString.optional()),
  chucVu: z.string().optional().pipe(zProperString.optional()),
  chiNhanh: z.string().optional().pipe(zSafeString.optional()),
});
export type ContactItem = z.infer<typeof ContactSchema>;

export const CustomerSchema = z.object({
  id: z.string().optional(), // Internal ID
  stt: z.number().int().optional(),
  maKh: z.string().min(1, 'Mã KH là bắt buộc').pipe(zSafeString), // Business Key
  loaiKh: z.string().optional().or(z.literal('')).pipe(zSafeString.optional().or(z.literal(''))),
  tenKhachHang: z.string().min(1, 'Tên khách hàng là bắt buộc').pipe(zProperString),
  loaiHinhDoanhNghiep: z.string().optional().pipe(zProperString.optional()),
  maSoThue: z.string().optional().pipe(zSafeString.optional()),
  nguoiDaiDien: z.string().optional().pipe(zProperString.optional()),
  gioiTinh: z.string().optional().pipe(zSafeString.optional()),
  ngaySinh: z.string().optional().pipe(zSafeString.optional()), // ISO Date string
  sdt: z.string().optional().pipe(zPhoneString.optional()),
  xaPhuong: z.string().optional().pipe(zProperString.optional()),
  tinhThanh: z.string().optional().or(z.literal('')).pipe(zProperString.optional().or(z.literal(''))),
  diaChi: z.string().optional().or(z.literal('')).pipe(zProperString.optional().or(z.literal(''))),
  nguoiPhuTrach: z.string().optional().or(z.literal('')).pipe(zSafeString.optional().or(z.literal(''))),
  nhuCauKhachHang: z.string().optional().pipe(zSafeString.optional()),
  chiNhanh: z.string().optional().pipe(zSafeString.optional()),
  contacts: z.array(ContactSchema).optional().default([]),
  
  tags: z.array(z.string()).optional().default([]),
  mergedInto: z.string().optional(),
  isArchived: z.boolean().optional().default(false),
  ltv: z.number().optional().default(0),
  totalDebt: z.number().optional().default(0),
  
  // System fields - not strictly validated
  ngayTao: z.string().optional(),
  ngayCapNhat: z.string().optional(),
  trangThaiGuiTinQuangCao: z.string().optional().nullable(),
  thongTinGuiZnsTruocBaoGia: z.record(z.string(), z.unknown()).optional(),
  logTomTat: z.string().optional(),
  computedHealthScore: z.union([z.number(), z.record(z.string(), z.unknown())]).optional(),
  deletedAt: z.union([z.string(), z.null()]).optional(),
  deletedBy: z.union([z.string(), z.null()]).optional(),
}).strip();

export type Customer = z.infer<typeof CustomerSchema>;

export const CustomerNoteSchema = z.object({
  id: z.string().optional(),
  customerId: z.string(),
  content: z.string().min(1, 'Ghi chú không được để trống'),
  tags: z.array(z.string()).optional().default([]),
  mentions: z.array(z.string()).optional().default([]), // array of user emails or IDs
  createdBy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional()
});

export type CustomerNote = z.infer<typeof CustomerNoteSchema>;
