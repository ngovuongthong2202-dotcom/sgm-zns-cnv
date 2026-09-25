import { z } from 'zod';

export const ProductItemSchema = z.object({
  id: z.string().optional(), // Stable internal ID for row tracking
  productId: z.string().optional().or(z.literal('')), // Số KH/Mã SP
  productName: z.string().min(1, 'Tên sản phẩm là bắt buộc'),
  quantity: z.number().int().positive('Số lượng phải là số dương'),
  unit: z.string().optional(),
  price: z.number().optional(),
  total: z.number().optional(), // Alias of subtotalAfterTax for backward compat
  soNgayBaoHanh: z.number().optional(),
  ngayHetHanBaoHanh: z.string().optional(),
  // D1: Line-item finance fields
  ghiChu: z.string().optional(),
  discountPct: z.number().optional(),
  discountAmount: z.number().optional(),
  subtotalBeforeTax: z.number().optional(),
  vatPct: z.number().optional(),
  taxAmount: z.number().optional(),
  subtotalAfterTax: z.number().optional()
});

export type ProductItem = z.infer<typeof ProductItemSchema>;
