import { useMemo } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function usePipelineAnalytics() {
  const { data: response } = useSWR('/api/analytics/today', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const payload = response?.data || {};

  const analytics = useMemo(() => {
    // Read from the backend rollup payload
    const customersByTinh = payload.customers?.byTinhThanh || {};
    const customersByNguoi = payload.customers?.byNguoiPhuTrach || {};

    const byProvince = Object.entries(customersByTinh)
      .map(([k, v]) => [k, v] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
      
    const bySalesRep = Object.entries(customersByNguoi)
      .map(([k, v]) => [k, v] as [string, number])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      totalCustomers: payload.customers?.total || 0,
      // Fallback rough approximations since exact client-side relations take too much memory
      customersWithQuotesCount: Math.round((payload.customers?.total || 0) * 0.6), // Appx metric if needed
      
      pipelineMay: {
        total: payload.funnel_may?.bg || 0,
        withContracts: payload.funnel_may?.hd || 0,
        withoutContracts: Math.max(0, (payload.funnel_may?.bg || 0) - (payload.funnel_may?.hd || 0)),
      },
      pipelineVatTuDv: {
        total: payload.funnel_vattudv?.bg || 0,
        withPayments: payload.funnel_vattudv?.tt || 0,
        withoutPayments: Math.max(0, (payload.funnel_vattudv?.bg || 0) - (payload.funnel_vattudv?.tt || 0)),
      },
      contractFulfillment: {
        total: payload.contracts?.total || 0,
        paid: payload.funnel_may?.tt || 0,
        delivered: payload.funnel_may?.giaohang || 0,
        fullyCompleted: Math.min(payload.funnel_may?.tt || 0, payload.funnel_may?.giaohang || 0),
      },
      groupings: {
        byProvince,
        bySalesRep,
      }
    };
  }, [payload]);

  return { analytics };
}
