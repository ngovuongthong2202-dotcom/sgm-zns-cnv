import { z } from 'zod';

export const WorkflowEventSchema = z.object({
  id: z.string().optional(),
  entityType: z.enum(['CUSTOMER', 'QUOTATION', 'CONTRACT', 'PAYMENT', 'DELIVERY']),
  entityId: z.string(),
  eventType: z.string(), // e.g., 'quotation.zns.sent', 'contract.created'
  payload: z.record(z.string(), z.unknown()),
  timestamp: z.string().datetime(),
  triggeredBy: z.string(), // userId or 'system'
}).strict();

export type WorkflowEvent = z.infer<typeof WorkflowEventSchema>;

export const ZnsMessageSchema = z.object({
  id: z.string().optional(),
  messageType: z.enum([
    'CUSTOMER_PRE_QUOTE', 'BAOGIA', 'HOPDONG_SIGN_ZNS', 
    'THANH_TOAN_TAT_TOAN', 'THANH_TOAN_CONG_NO', 'THANH_TOAN_CONG_NO_DEN_HAN',
    'GIAOHANG_ZNS', 'GIAOHANG_HOANTAT'
  ]),
  entityId: z.string(),
  entityType: z.string(),
  phone: z.string(),
  trackingId: z.string().optional(),
  businessVersion: z.union([z.string(), z.number()]).optional(),
  attemptBucket: z.number().int().default(0),
  maxRetries: z.number().int().optional(),
  lastVendorResponse: z.record(z.string(), z.unknown()).optional(),
  vendorStatus: z.record(z.string(), z.unknown()).optional(),
  payload: z.record(z.string(), z.unknown()),
  status: z.enum(['INIT', 'PENDING', 'SENDING', 'SENT_WAITING', 'SUCCESS', 'FAILED', 'DLQ']),
  retryCount: z.number().int().default(0),
  nextRetryAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  errorLog: z.string().optional(),
}).strict();

export type ZnsMessage = z.infer<typeof ZnsMessageSchema>;
