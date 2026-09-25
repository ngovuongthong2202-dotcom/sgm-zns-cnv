export interface SendZnsResponse {
  success: boolean;
  messageId?: string;
  status?: 'INIT'|'PENDING'|'SENDING'|'SENT_WAITING'|'SUCCESS'|'FAILED'|'DLQ'|'LIMIT_EXCEEDED';
  error?: string;
  code?: 'MISSING_REQUIRED_FIELDS'|'INVALID_PHONE'|'QUOTA_EXCEEDED'|'VENDOR_NOT_CONFIGURED'|'ZALO_LIMIT'|'INTERNAL_ERROR'|'DUPLICATE_SENT';
}

export async function sendZnsMessage(payload: {
  entityId: string;
  entityType: 'CUSTOMER' | 'QUOTATION' | 'CONTRACT' | 'PAYMENT' | 'DELIVERY';
  messageType: string;
  phone: string;
  payload: Record<string, unknown>; 
  attemptBucket?: number;
  forceResend?: boolean;
}): Promise<SendZnsResponse> {
  const response = await fetch('/api/zns/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.success) {
    const error = data?.error || `Lỗi HTTP: ${response.status}`;
    const err = new Error(error) as Error & { code?: string };
    err.code = data?.code;
    throw err;
  }

  return data as SendZnsResponse;
}
