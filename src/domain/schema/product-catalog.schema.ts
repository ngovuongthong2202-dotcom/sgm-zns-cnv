import { z } from 'zod';

export const ProductCatalogSchema = z.object({
  id: z.string().optional(),
  productCode: z.string().min(1, 'Mã sản phẩm không được trống'),
  productName: z.string().min(1, 'Tên sản phẩm không được trống'),
  category: z.enum(['Máy', 'Vật tư', 'Dịch vụ']).default('Máy'),
  basePrice: z.number().optional().default(0),
  unit: z.string().optional().default('Cái'),
  description: z.string().optional(),
  warrantyDays: z.number().int().optional(),
  isActive: z.boolean().optional().default(true),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}).strict();

export type ProductCatalog = z.infer<typeof ProductCatalogSchema>;
