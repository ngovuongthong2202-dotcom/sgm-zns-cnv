/**
 * Đợt 0A (BM01): bản tổng hợp `zns.recentZns` từng chứa 10 tin ZNS đầy đủ (SĐT, nội dung payload, hồ sơ khách) và được
 * GET /api/analytics/today trả cho người gọi không đăng nhập. Chiếu về bản tối giản ở cả lúc dựng (metrics-rollup.service)
 * và tại route (để bản tổng hợp cũ đã lưu kèm SĐT cũng không lộ cho tới khi bản mới được dựng).
 */
export interface RecentZnsSummary {
  id: string;
  status: string;
  messageType: string;
  entityType: string;
  entityId: string;
  createdAt: string;
}

const asText = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

export function projectRecentZns(items: unknown, limit = 10): RecentZnsSummary[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((it): it is Record<string, unknown> => Boolean(it) && typeof it === 'object')
    .map(it => ({
      id: asText(it.id),
      status: asText(it.status),
      messageType: asText(it.messageType),
      entityType: asText(it.entityType),
      entityId: asText(it.entityId),
      createdAt: asText(it.createdAt),
    }))
    // Chuỗi ISO so được theo thứ tự từ điển; createdAt rỗng xếp cuối.
    .sort((a, b) => (a.createdAt === b.createdAt ? 0 : b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, limit);
}
