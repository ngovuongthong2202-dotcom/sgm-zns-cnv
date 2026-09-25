import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(async res => {
  if (res.status === 204 || res.status === 304) return {};
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
});

interface ActionItemRaw {
  id?: string;
  title?: string;
  entityName?: string;
  sub?: string;
  time?: string;
  icon?: string;
  type?: string;
  status?: string;
  bg?: string;
  color?: string;
  priority?: 'high' | 'normal';
  link?: string;
  url?: string;
}

export function useDashboardKpis() {
  const { data, error, isLoading, mutate } = useSWR('/api/analytics/today', fetcher, {
    refreshInterval: 60000,
    dedupingInterval: 60000,
    revalidateOnFocus: true,
  });

  const payload = data?.success ? data.data : null;

  return {
    rawPayload: payload,
    stats: payload?.stats || { khachCanCham: 0, bgSapHetHan: 0, phieuGiaoCham: 0, doanhThuThang: 0 },
    actionItems: (payload?.actionItems || []).map((item: ActionItemRaw, idx: number) => ({
      ...item,
      id: item.id || `action-${idx}`,
      title: item.title || item.entityName || 'Việc cần xử lý',
      sub: item.sub || (item.time ? `Hạn: ${new Date(item.time).toLocaleDateString('vi-VN')}` : ''),
      icon: item.icon || (item.type === 'ZNS_PENDING' ? 'Mail' : item.type === 'EXPIRING' ? 'Flame' : item.type === 'DELAYED' ? 'ShieldAlert' : 'Zap'),
      bg: item.bg || (item.status === 'danger' ? 'bg-red-100' : item.status === 'urgent' ? 'bg-amber-100' : 'bg-slate-100'),
      color: item.color || (item.status === 'danger' ? 'text-red-700' : item.status === 'urgent' ? 'text-amber-700' : 'text-slate-600'),
      priority: item.priority || ((item.status === 'danger' || item.status === 'urgent') ? 'high' : 'normal'),
      url: item.link || item.url || '#'
    })),
    recentZns: payload?.zns?.recentZns || [],
    funnelVatTu: payload?.funnel_vattudv ? [
      { stage: 'Báo giá', count: payload.funnel_vattudv.bg },
      { stage: 'Thanh toán', count: payload.funnel_vattudv.tt },
      { stage: 'Giao hàng', count: payload.funnel_vattudv.giaohang }
    ] : [],
    funnelMay: payload?.funnel_may ? [
      { stage: 'Báo giá', count: payload.funnel_may.bg },
      { stage: 'Hợp đồng', count: payload.funnel_may.hd },
      { stage: 'Thanh toán', count: payload.funnel_may.tt },
      { stage: 'Giao hàng', count: payload.funnel_may.giaohang }
    ] : [],
    loading: isLoading,
    error,
    mutate
  };
}
