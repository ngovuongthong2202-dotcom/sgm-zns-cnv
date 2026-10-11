/**
 * Đợt 0A (BM01/K-SEC-4; kế hoạch tổng thể dòng 207): /api/search và /api/workflow/* chỉ nhận 5 bảng nghiệp vụ.
 * Rào đứng TRƯỚC mọi truy cập CSDL: users, settings, zns_messages, auditLogs, znsTemplates, idempotencyKeys … đều bị 400.
 * Không chuẩn hóa ngầm (hoa/thường, khoảng trắng) để không mở rộng bề mặt; chỉ normalizeEntityType của workflow.routes.ts
 * được dùng cho dạng số ít/số nhiều của 5 bảng.
 */
export const BUSINESS_TABLES = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'] as const;
export type BusinessTable = (typeof BUSINESS_TABLES)[number];

/** Dạng số ít mà normalizeEntityType() trả về cho 5 bảng. */
export const BUSINESS_ENTITIES = ['customer', 'quotation', 'contract', 'payment', 'delivery'] as const;
export type BusinessEntity = (typeof BUSINESS_ENTITIES)[number];

/** Chứng từ cha được phép tra ở POST /api/workflow/check-gate. */
export const GATE_PARENT_TABLES = ['contracts', 'quotations', 'payments'] as const;

export function isBusinessTable(name: unknown): name is BusinessTable {
  return typeof name === 'string' && (BUSINESS_TABLES as readonly string[]).includes(name);
}

export function isBusinessEntity(name: unknown): name is BusinessEntity {
  return typeof name === 'string' && (BUSINESS_ENTITIES as readonly string[]).includes(name);
}

export function isGateParentTable(name: unknown): boolean {
  return typeof name === 'string' && (GATE_PARENT_TABLES as readonly string[]).includes(name);
}

export const INVALID_COLLECTION_BODY = {
  success: false as const,
  code: 'INVALID_COLLECTION' as const,
  error: 'Chỉ tra cứu được 5 bảng nghiệp vụ: khách hàng, báo giá, hợp đồng, phiếu thu, phiếu giao.',
};

export const INVALID_ENTITY_BODY = {
  success: false as const,
  code: 'INVALID_ENTITY' as const,
  error: 'Chỉ ghi được 5 bảng nghiệp vụ qua đường quy trình: khách hàng, báo giá, hợp đồng, phiếu thu, phiếu giao.',
};
