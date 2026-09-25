import { useMemo } from 'react';
import useSWR from 'swr';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { normalizeLoai, QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';

const fetcher = (url: string) => fetch(url).then(res => res.json()).catch(() => null);

export function usePipelineAnalytics() {
  // 1. Backend rollup fallback
  const { data: response } = useSWR('/api/analytics/today', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30000,
  });

  // 2. Realtime collections from live client store
  const { data: customers = [] } = useRealtimeCollection<Customer>('customers');
  const { data: quotations = [] } = useRealtimeCollection<Quotation>('quotations');
  const { data: contracts = [] } = useRealtimeCollection<Contract>('contracts');
  const { data: payments = [] } = useRealtimeCollection<Payment>('payments');
  const { data: deliveries = [] } = useRealtimeCollection<Delivery>('deliveries');

  const payload = response?.data || {};

  const analytics = useMemo(() => {
    const hasLiveClients = customers.length > 0 || quotations.length > 0 || contracts.length > 0;

    // Use live calculation when data exists in client memory
    if (hasLiveClients) {
      // 1. Khách hàng có báo giá
      const customerIdsWithQuotes = new Set<string>();
      quotations.forEach(q => {
        if (q.customerId) customerIdsWithQuotes.add(q.customerId);
        if (q.tenKhachHang) customerIdsWithQuotes.add(q.tenKhachHang.trim().toLowerCase());
      });

      const customersWithQuotesCount = customers.filter(c => 
        (c.id && customerIdsWithQuotes.has(c.id)) || (c.tenKhachHang && customerIdsWithQuotes.has(c.tenKhachHang.trim().toLowerCase()))
      ).length;

      // 2. Pipeline Báo giá MÁY -> Hợp đồng
      const mayQuotations = quotations.filter(q => normalizeLoai(q.loai) === QUOTATION_LOAI.MAY);
      const quoteIdsWithContract = new Set<string>();
      contracts.forEach(c => {
        if (c.quotationId) quoteIdsWithContract.add(c.quotationId);
        if (c.soPhieuBaoGia) quoteIdsWithContract.add(c.soPhieuBaoGia);
      });
      const mayWithContracts = mayQuotations.filter(q => 
        (q.id && quoteIdsWithContract.has(q.id)) || (q.soPhieuBaoGia && quoteIdsWithContract.has(q.soPhieuBaoGia))
      ).length;

      // 3. Pipeline Báo giá VẬT TƯ / DỊCH VỤ -> Thanh toán
      const vatTuDvQuotations = quotations.filter(q => normalizeLoai(q.loai) !== QUOTATION_LOAI.MAY);
      const quoteIdsWithPayment = new Set<string>();
      payments.forEach(p => {
        if (p.quotationId) quoteIdsWithPayment.add(p.quotationId);
        if (p.soPhieuBaoGia) quoteIdsWithPayment.add(p.soPhieuBaoGia);
      });
      const vatTuWithPayments = vatTuDvQuotations.filter(q => 
        (q.id && quoteIdsWithPayment.has(q.id)) || (q.soPhieuBaoGia && quoteIdsWithPayment.has(q.soPhieuBaoGia))
      ).length;

      // 4. Hợp đồng fulfillment
      const contractIdsWithPayment = new Set<string>();
      payments.forEach(p => {
        if (p.contractId) contractIdsWithPayment.add(p.contractId);
        if (p.soHopDong) contractIdsWithPayment.add(p.soHopDong);
      });
      const contractPaidCount = contracts.filter(c => 
        (c.id && contractIdsWithPayment.has(c.id)) || (c.soHopDong && contractIdsWithPayment.has(c.soHopDong))
      ).length;

      const contractIdsWithDelivery = new Set<string>();
      deliveries.forEach(d => {
        if (d.contractId) contractIdsWithDelivery.add(d.contractId);
        if (d.soHopDong) contractIdsWithDelivery.add(d.soHopDong);
      });
      const contractDeliveredCount = contracts.filter(c => 
        (c.id && contractIdsWithDelivery.has(c.id)) || (c.soHopDong && contractIdsWithDelivery.has(c.soHopDong))
      ).length;

      // 5. Groupings
      const provMap: Record<string, number> = {};
      quotations.forEach(q => {
        const prov = (q as any).tinhThanh || customers.find(c => c.id === q.customerId)?.tinhThanh;
        if (prov && prov.trim()) {
          provMap[prov.trim()] = (provMap[prov.trim()] || 0) + 1;
        }
      });
      const byProvince = Object.entries(provMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const repMap: Record<string, number> = {};
      quotations.forEach(q => {
        const rep = q.nguoiPhuTrach || customers.find(c => c.id === q.customerId)?.nguoiPhuTrach;
        if (rep && rep.trim()) {
          repMap[rep.trim()] = (repMap[rep.trim()] || 0) + 1;
        }
      });
      const bySalesRep = Object.entries(repMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      return {
        totalCustomers: customers.length,
        customersWithQuotesCount,
        pipelineMay: {
          total: mayQuotations.length,
          withContracts: mayWithContracts,
          withoutContracts: Math.max(0, mayQuotations.length - mayWithContracts),
        },
        pipelineVatTuDv: {
          total: vatTuDvQuotations.length,
          withPayments: vatTuWithPayments,
          withoutPayments: Math.max(0, vatTuDvQuotations.length - vatTuWithPayments),
        },
        contractFulfillment: {
          total: contracts.length,
          paid: contractPaidCount,
          delivered: contractDeliveredCount,
          fullyCompleted: Math.min(contractPaidCount, contractDeliveredCount),
        },
        groupings: {
          byProvince,
          bySalesRep,
        }
      };
    }

    // Fallback: Read from backend rollup payload if realtime is empty
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
      customersWithQuotesCount: Math.round((payload.customers?.total || 0) * 0.6),
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
  }, [customers, quotations, contracts, payments, deliveries, payload]);

  return { analytics };
}
