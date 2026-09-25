import { DocumentKind } from '../types/workflow-document.type';

export interface BlockingDocumentItem {
  type: 'contract' | 'payment' | 'delivery' | 'quotation';
  id: string;
  code: string;
  label: string;
  date?: string;
  amount?: number;
  status?: string;
}

export interface LockResult {
  locked: boolean;
  reason?: string;
  blockingDocuments?: string[];
  detailedBlocks?: BlockingDocumentItem[];
}

export interface DocumentUpdateValidationResult {
  canUpdate: boolean;
  reason?: string;
  forbiddenFieldsChanged?: string[];
}

/**
 * Kiểm tra xem các trường cốt lõi có bị sửa đổi hay không khi chứng từ đã phát sinh dữ liệu liên kết.
 * Cho phép cập nhật thông tin hành chính (ghi chú, người phụ trách, tiến độ, số điện thoại...).
 * CẤM cập nhật khách hàng và giá trị tài chính/sản phẩm cốt lõi.
 */
export function validateDocumentUpdate(
  kind: DocumentKind,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  hasLinkedChildren: boolean
): DocumentUpdateValidationResult {
  if (!hasLinkedChildren) {
    return { canUpdate: true };
  }

  const IMMUTABLE_FIELDS: Record<DocumentKind, string[]> = {
    quotation: ['customerId', 'maKh', 'totalAmount', 'tongTien', 'products', 'loai', 'loaiBaoGia', 'subTotal'],
    contract: ['customerId', 'quotationId', 'totalAmount', 'giaTriHopDong', 'products'],
    payment: ['customerId', 'contractId', 'quotationId', 'soTien', 'totalAmount'],
    delivery: ['customerId', 'paymentId', 'contractId', 'products'],
    customer: ['maKh']
  };

  const restricted = IMMUTABLE_FIELDS[kind] || [];
  const violations: string[] = [];

  for (const field of restricted) {
    if (before[field] !== undefined && after[field] !== undefined) {
      if (JSON.stringify(before[field]) !== JSON.stringify(after[field])) {
        violations.push(field);
      }
    }
  }

  if (violations.length > 0) {
    return {
      canUpdate: false,
      reason: `Chứng từ đã phát sinh liên kết trong chu trình bán hàng. Không được phép chỉnh sửa các trường tài chính/khách hàng cốt lõi (${violations.join(', ')}).`,
      forbiddenFieldsChanged: violations
    };
  }

  return { canUpdate: true };
}
