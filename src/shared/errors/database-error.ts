import { logger } from '@/src/shared/lib/logger';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface DatabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo?: {
    userId?: string | null;
    email?: string | null;
  };
}

/**
 * Enterprise Database Error Handler (Supabase PostgreSQL / Cloud Infrastructure)
 * Logs structured error and throws clean human-readable error without exposing raw JSON to UI.
 */
export function handleDatabaseError(error: unknown, operationType: OperationType, path: string | null): void {
  const rawMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: DatabaseErrorInfo = {
    error: rawMessage,
    operationType,
    path
  };

  logger.error(`[Database Error] [${operationType.toUpperCase()}] ${path || 'unknown'}: ${rawMessage}`, errInfo);

  if (operationType !== OperationType.LIST && operationType !== OperationType.GET) {
    // Provide clean, friendly error message instead of stringified JSON
    const friendlyPrefix = operationType === OperationType.CREATE ? 'Không thể tạo mới dữ liệu'
      : operationType === OperationType.UPDATE ? 'Không thể cập nhật dữ liệu'
      : operationType === OperationType.DELETE ? 'Không thể xóa dữ liệu'
      : 'Thao tác dữ liệu thất bại';

    throw new Error(`${friendlyPrefix} (${path || ''}): ${rawMessage}`);
  }
}

/**
 * Backward compatibility alias for migration
 * @deprecated Use handleDatabaseError instead
 */
export const handleFirestoreError = handleDatabaseError;
