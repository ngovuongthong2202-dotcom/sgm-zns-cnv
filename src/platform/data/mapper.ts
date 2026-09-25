/**
 * Maps Supabase PostgreSQL Hybrid Row (physical columns + JSONB data) to Domain Entity T.
 * Provides Bi-Directional Symmetrical Parity and Defensive Schema Quarantine against corrupt data.
 */
export const mapDocument = <T>(row: Record<string, unknown> | null | undefined): T => {
  if (!row || typeof row !== 'object') return {} as T;

  const rawData = row.data;
  const jsonb = (rawData && typeof rawData === 'object' && !Array.isArray(rawData))
    ? (rawData as Record<string, unknown>)
    : {};
  
  // Exclude raw JSONB column from leaked entity fields
  const { data: _ignored, ...cleanRow } = row;

  return {
    ...jsonb,
    ...cleanRow,
    id: (row.id as string) || (jsonb.id as string) || '',
    customerId: (row.customer_id as string) || (row.customerId as string) || (jsonb.customerId as string) || undefined,
    quotationId: (row.quotation_id as string) || (row.quotationId as string) || (jsonb.quotationId as string) || undefined,
    contractId: (row.contract_id as string) || (row.contractId as string) || (jsonb.contractId as string) || undefined,
    trackingId: (row.tracking_id as string) || (row.trackingId as string) || (jsonb.trackingId as string) || undefined,
    entityType: (row.entity_type as string) || (row.entityType as string) || (jsonb.entityType as string) || undefined,
    entityId: (row.entity_id as string) || (row.entityId as string) || (jsonb.entityId as string) || undefined,
    maKh: (row.ma_kh as string) || (row.maKh as string) || (jsonb.maKh as string) || undefined,
    maBaoGia: (row.ma_bao_gia as string) || (row.maBaoGia as string) || (jsonb.maBaoGia as string) || undefined,
    maHopDong: (row.ma_hop_dong as string) || (row.maHopDong as string) || (jsonb.maHopDong as string) || undefined,
    maThanhToan: (row.ma_thanh_toan as string) || (row.maThanhToan as string) || (jsonb.maThanhToan as string) || (jsonb.paymentId as string) || undefined,
    paymentId: (row.ma_thanh_toan as string) || (row.payment_id as string) || (row.paymentId as string) || (jsonb.paymentId as string) || undefined,
    maGiaoHang: (row.ma_giao_hang as string) || (row.maGiaoHang as string) || (jsonb.maGiaoHang as string) || (jsonb.deliveryId as string) || undefined,
    deliveryId: (row.ma_giao_hang as string) || (row.delivery_id as string) || (row.deliveryId as string) || (jsonb.deliveryId as string) || undefined,
    read: row.is_read !== undefined ? Boolean(row.is_read) : (jsonb.read !== undefined ? Boolean(jsonb.read) : (jsonb.isRead !== undefined ? Boolean(jsonb.isRead) : false)),
    isRead: row.is_read !== undefined ? Boolean(row.is_read) : (jsonb.isRead !== undefined ? Boolean(jsonb.isRead) : (jsonb.read !== undefined ? Boolean(jsonb.read) : false)),
    trangThai: (row.trang_thai as string) || (row.trangThai as string) || (jsonb.trangThai as string) || undefined,
    status: (row.status as string) || (jsonb.status as string) || undefined,
    deletedAt: (row.deleted_at as string) || (row.deletedAt as string) || (jsonb.deletedAt as string) || null,
    createdAt: (row.created_at as string) || (row.createdAt as string) || (jsonb.createdAt as string) || (row.processed_at as string) || (row.timestamp as string) || (jsonb.timestamp as string) || undefined,
    updatedAt: (row.updated_at as string) || (row.updatedAt as string) || (jsonb.updatedAt as string) || undefined,
    processedAt: (row.processed_at as string) || (row.processedAt as string) || undefined,
    timestamp: (row.timestamp as string) || (jsonb.timestamp as string) || (row.created_at as string) || (row.createdAt as string) || (jsonb.createdAt as string) || (row.processed_at as string) || undefined,
    userId: (row.user_id as string) || (row.userId as string) || (jsonb.userId as string) || undefined,
    userName: (row.user_name as string) || (row.userName as string) || (jsonb.userName as string) || undefined
  } as unknown as T;
};
