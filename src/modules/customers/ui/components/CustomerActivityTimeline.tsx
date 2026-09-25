import { ProductItem } from '@/src/domain/schema/product.schema';
import React, { useState, useEffect } from 'react';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { useNavigate } from 'react-router-dom';

import { FileText, FileSignature, Wallet, Truck, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { ZnsMessage } from '@/src/domain/schema/workflow.schema';
import { t } from '@/src/i18n/vi';

export function CustomerActivityTimeline({ customerId }: { customerId: string }) {
  const navigate = useNavigate();
  
  const [myQuotations, setMyQuotations] = useState<Quotation[]>(() => {
    return entityCachePool.getAll('quotations').filter((q: any) => q.customerId === customerId);
  });
  const [myContracts, setMyContracts] = useState<Contract[]>(() => {
    return entityCachePool.getAll('contracts').filter((c: any) => c.customerId === customerId);
  });
  const [myPayments, setMyPayments] = useState<Payment[]>(() => {
    return entityCachePool.getAll('payments').filter((p: any) => p.customerId === customerId);
  });
  const [myDeliveries, setMyDeliveries] = useState<Delivery[]>(() => {
    return entityCachePool.getAll('deliveries').filter((d: any) => d.customerId === customerId);
  });
  const [myZns, setMyZns] = useState<ZnsMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;
    let isMounted = true;
    setLoading(true);

    // Multi-tier Targeted FK Query: Fetch only records for this specific customer
    Promise.all([
      repositoryFactory.get<Quotation>('quotations').list({ fkField: 'customerId', fkId: customerId, limit: 50 }),
      repositoryFactory.get<Contract>('contracts').list({ fkField: 'customerId', fkId: customerId, limit: 50 }),
      repositoryFactory.get<Payment>('payments').list({ fkField: 'customerId', fkId: customerId, limit: 50 }),
      repositoryFactory.get<Delivery>('deliveries').list({ fkField: 'customerId', fkId: customerId, limit: 50 }),
    ]).then(async ([quotes, contracts, payments, deliveries]) => {
      if (!isMounted) return;
      setMyQuotations(quotes);
      setMyContracts(contracts);
      setMyPayments(payments);
      setMyDeliveries(deliveries);

      // Populate L1 Normalized Entity Pool
      entityCachePool.setBatch('quotations', quotes);
      entityCachePool.setBatch('contracts', contracts);
      entityCachePool.setBatch('payments', payments);
      entityCachePool.setBatch('deliveries', deliveries);

      const entityIds = [
        customerId,
        ...quotes.map(q => q.id),
        ...contracts.map(c => c.id),
        ...payments.map(p => p.id),
        ...deliveries.map(d => d.id)
      ].filter(Boolean).slice(0, 30);

      if (entityIds.length > 0) {
        try {
          const znsRes = await repositoryFactory.get<ZnsMessage>('znsMessages').list({ fkField: 'entityId', fkId: entityIds as string[], limit: 50 });
          if (isMounted) setMyZns(znsRes);
        } catch (e) {
          console.warn('Failed to load ZNS for timeline', e);
        }
      }

      if (isMounted) setLoading(false);
    }).catch(err => {
      console.error('Failed to load customer timeline:', err);
      if (isMounted) setLoading(false);
    });

    return () => { isMounted = false; };
  }, [customerId]);
  
  if (loading && myQuotations.length === 0 && myContracts.length === 0 && myPayments.length === 0 && myDeliveries.length === 0) {
    return <div className="p-6 text-slate-500 text-sm">Đang tải dữ liệu hoạt động...</div>;
  }
  
  const entityIdsSet = new Set([
    customerId,
    ...myQuotations.map(q => q.id),
    ...myContracts.map(c => c.id),
    ...myPayments.map(p => p.id),
    ...myDeliveries.map(d => d.id)
  ].filter(Boolean));

  const filteredZns = myZns.filter(z => z.entityId && entityIdsSet.has(z.entityId));

  const timeline: {id: string, date?: string, type: string, summary: string, route?: string, raw?: any, color?: string, icon?: any, title?: string, timestamp?: number | string, metadata?: any}[] = [];

  myQuotations.forEach((q: Quotation) => {
    timeline.push({
      id: `q-${q.id}`,
      type: 'QUOTATION',
      route: 'quotations',
      icon: <FileText size={16} />,
      color: 'bg-blue-100 text-blue-700',
      title: `Báo giá ${q.soPhieuBaoGia || ''}`,
      summary: `Trị giá: ${new Intl.NumberFormat('vi-VN').format(q.products?.reduce((acc: number, p: ProductItem) => acc + ((p.price || 0) * (p.quantity || 1)), 0) || 0)} ₫ - Trạng thái: ${q.tinhTrangBaoGia}`,
      timestamp: (q as any).createdAt || (q as any).ngayCapNhat || q.ngayBaoGia,
      raw: q
    });
  });

  myContracts.forEach((c: Contract) => {
    timeline.push({
      id: `c-${c.id}`,
      type: 'CONTRACT',
      route: 'contracts',
      icon: <FileSignature size={16} />,
      color: 'bg-emerald-100 text-emerald-700',
      title: `Hợp đồng ${c.soHopDong || ''}`,
      summary: `Đơn hàng: ${c.soDonHang || ''} - Ngày ký: ${c.ngayKy || ''}`,
      timestamp: (c as any).createdAt || (c as any).ngayCapNhat || c.ngayKy,
      raw: c
    });
  });

  myPayments.forEach((p: Payment) => {
    timeline.push({
      id: `p-${p.id}`,
      type: 'PAYMENT',
      route: 'payments',
      icon: <Wallet size={16} />,
      color: 'bg-amber-100 text-amber-700',
      title: `Thanh toán ${p.paymentId || ''}`,
      summary: `Số tiền: ${new Intl.NumberFormat('vi-VN').format(p.soTien || 0)} ₫ - ${p.tinhTrangThanhToan}`,
      timestamp: (p as any).createdAt || (p as any).ngayCapNhat || p.ngayThanhToan,
      raw: p
    });
  });

  myDeliveries.forEach((d: Delivery) => {
    timeline.push({
      id: `d-${d.id}`,
      type: 'DELIVERY',
      route: 'deliveries',
      icon: <Truck size={16} />,
      color: 'bg-orange-100 text-orange-600',
      title: `Giao hàng ${d.deliveryId || ''}`,
      summary: `Ngày giao: ${d.ngayGiaoMay || ''} - ĐVVC: ${d.donViVanChuyen || ''}`,
      timestamp: (d as any).createdAt || (d as any).ngayCapNhat || d.ngayGiaoMay,
      raw: d
    });
  });

  filteredZns.forEach(z => {
    timeline.push({
      id: `z-${z.id}`,
      type: 'ZNS',
      route: 'zns-hub',
      icon: <Bell size={16} />,
      color: 'bg-brand-accent/20 text-brand-accent',
      title: `Gửi ZNS: ${z.messageType}`,
      summary: `SĐT: ${z.phone} - Trạng thái: ${z.status} - Lần thử: ${z.retryCount}`,
      timestamp: z.createdAt,
      raw: z
    });
  });

  timeline.sort((a, b) => {
    const timeA = new Date(a.timestamp || 0).getTime();
    const timeB = new Date(b.timestamp || 0).getTime();
    return timeB - timeA;
  });

  if (timeline.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <p className="text-sm font-medium">{t('empty.noActivity')}</p>
      </div>
    );
  }

  const handleClick = (item: {id: string, date?: string, type: string, summary: string, route?: string, raw?: any, color?: string, icon?: any, title?: string, timestamp?: number | string, metadata?: any}) => {
    if (item.type === 'ZNS') {
      navigate(`/${item.route}`);
    } else {
      navigate(`/${item.route}?id=${item.raw.id}`, { state: { openDrawer: item.raw } });
    }
  };

  return (
    <div className="relative pt-4 pb-8 pr-4">
      <div className="absolute left-8 top-6 bottom-6 w-px bg-slate-200"></div>
      
      <div className="space-y-6">
        {timeline.map((item, _idx) => (
          <div key={item.id} className="relative flex items-start gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-4 ring-white relative z-10 ml-4 ${item.color}`}>
              {item.icon}
            </div>
            
            <div 
              className={`flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm transition-all ${item.type !== 'ZNS' ? 'cursor-pointer hover:border-blue-500 hover:shadow-md group border-l-[3px] border-l-blue-400' : 'border-l-[3px] border-l-slate-300'}`}
              onClick={() => handleClick(item)}
            >
               <div className="flex justify-between items-start mb-1 gap-4">
                 <div className="space-y-1.5">
                   <div className="flex flex-wrap items-center gap-2">
                     <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors flex items-center gap-2">
                       {item.title}
                     </h4>
                     {item.type !== 'ZNS' && (
                       <span className="text-3xs text-blue-700 bg-blue-50/80 border border-blue-150 px-2 py-0.5 rounded-full font-extrabold tracking-wide uppercase inline-flex items-center gap-0.5 whitespace-nowrap shadow-xs">
                         Bấm mở chi tiết ↗
                       </span>
                     )}
                   </div>
                   <p className="text-xs text-slate-600 leading-relaxed font-semibold">{item.summary}</p>
                 </div>
                 <span className="text-2xs font-mono text-slate-500 font-bold bg-slate-50 px-2 py-0.5 rounded border border-slate-100 shrink-0">
                   {item.timestamp ? format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm') : '---'}
                 </span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
