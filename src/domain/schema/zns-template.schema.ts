import { z } from 'zod';

export const TemplateVariableSchema = z.object({
  name: z.string(),                                              // 'customer_name'
  label: z.string(),                                              // 'Tên khách hàng' (hiển thị UI)
  sourceField: z.string(),                                        // 'tenKhachHang' / 'contacts[0].nguoiDaiDien'
  sourceEntity: z.enum(['SELF','CUSTOMER','QUOTATION','CONTRACT','PAYMENT']).default('SELF'),
  format: z.enum(['raw','date','number','currency']).default('raw'),
  fallback: z.string().optional(),
}).strict();

export type TemplateVariable = z.infer<typeof TemplateVariableSchema>;

export const ZnsTemplateSchema = z.object({
  templateKey: z.string(),                                        // CUSTOMER_PRE_QUOTE | BAOGIA | HOPDONG_SIGN_ZNS | THANH_TOAN_TAT_TOAN | THANH_TOAN_CONG_NO | GIAOHANG_ZNS
  label: z.string(),
  description: z.string().optional(),
  previewImage: z.string().optional(),                            // URL ảnh template
  entityType: z.enum(['CUSTOMER','QUOTATION','CONTRACT','PAYMENT','DELIVERY']),
  paymentSubtype: z.enum(['TAT_TOAN','CONG_NO']).optional(),
  variables: z.array(TemplateVariableSchema),
  version: z.number().int().default(1),
  isActive: z.boolean().default(true),
  createdAt: z.string(),
  updatedAt: z.string(),
  updatedBy: z.string(),
}).strict();

export type ZnsTemplate = z.infer<typeof ZnsTemplateSchema>;
