import { z } from 'zod';
import { zProperString, zPhoneString, zSafeString } from '@/src/domain/mapping/zod-transforms';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { sanitizeTaxCode } from '@/src/shared/utils/inputSanitizer';

export const ContactSchema = z.object({
  danhXung: zSafeString.optional(),
  nguoiDaiDien: zProperString.optional(),
  sdt: zPhoneString.optional(),
  chucVu: zProperString.optional(),
  chiNhanh: zSafeString.optional(),
  trangThaiZns: zSafeString.optional(),
  ngayGuiZns: zSafeString.optional(),
  lastZnsTrackingId: zSafeString.optional(),
});
export type ContactItem = z.infer<typeof ContactSchema>;

export const CustomerSchema = z.object({
  id: z.string().optional(), // Internal ID
  stt: z.number().int().optional(),
  maKh: z.string().min(1, 'Mã KH là bắt buộc').transform((val) => (val || '').trim().replace(/[\u200B-\u200D\uFEFF]/g, '')), // Business Key
  loaiKh: zSafeString.optional(),
  tenKhachHang: z.string().min(1, 'Tên khách hàng là bắt buộc').transform((val) => cleanProperVietnameseText(val || '')),
  loaiHinhDoanhNghiep: zSafeString.optional().transform((val) => (val || '').trim().toUpperCase()),
  maSoThue: zSafeString.optional().transform((val) => val ? sanitizeTaxCode(val) : ''),
  nguoiDaiDien: zProperString.optional(),
  gioiTinh: zSafeString.optional(),
  ngaySinh: zSafeString.optional(), // ISO Date string
  sdt: zPhoneString.optional(),
  xaPhuong: zProperString.optional(),
  tinhThanh: zProperString.optional(),
  diaChi: zProperString.optional(),
  nguoiPhuTrach: zSafeString.optional(),
  nhuCauKhachHang: zSafeString.optional(),
  chiNhanh: zSafeString.optional(),
  contacts: z.array(ContactSchema).optional().default([]),
  contactsZnsHistory: z.record(z.string(), z.unknown()).optional().default({}),
  
  tags: z.array(z.string()).optional().default([]),
  mergedInto: z.string().optional().nullable(),
  isArchived: z.boolean().optional().default(false),
  ltv: z.number().optional().default(0),
  totalDebt: z.number().optional().default(0),
  
  // System fields - not strictly validated
  ngayTao: z.string().optional().nullable(),
  ngayCapNhat: z.string().optional().nullable(),
  trangThaiGuiTinQuangCao: z.string().optional().nullable(),
  thongTinGuiZnsTruocBaoGia: z.record(z.string(), z.unknown()).optional().nullable(),
  logTomTat: z.string().optional().nullable(),
  computedHealthScore: z.union([z.number(), z.record(z.string(), z.unknown())]).optional().nullable(),
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
