import React from 'react';
import { useEntityReference } from '@/src/platform/hooks/useEntityReference';
import { LABEL_FALLBACK } from '@/src/domain/mapping/entity-label';

export function InlineEntityLabel({ 
  entityType, 
  entityId, 
  snapshotData, 
  fallbackId 
}: { 
  entityType: string, 
  entityId: string, 
  snapshotData?: any, 
  fallbackId?: string 
}) {
  const { label, isLoading } = useEntityReference(entityType, entityId, snapshotData);
  
  if (isLoading) {
    return <span className="opacity-50" title={`ID: ${entityId}`}>Đang tải...</span>;
  }
  
  if (!label || label === LABEL_FALLBACK || label.trim() === '') {
    return <span className="opacity-70 italic" title={`ID: ${entityId}`}>Thiếu thông tin nhãn (Cần cập nhật)</span>;
  }
  
  return <span title={`ID: ${entityId}`}>{label}</span>;
}
