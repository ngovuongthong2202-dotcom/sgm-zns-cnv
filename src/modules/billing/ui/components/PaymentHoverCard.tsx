import React, { useState } from 'react';
import useSWR from 'swr';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { formatDate } from '@/src/shared/utils/formatDate';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import { Handshake, Truck, Phone, MapPin, Calculator, CalendarClock, Receipt } from 'lucide-react';
import { HoverCardPortal } from '@/src/design-system/HoverCardPortal';
import { HoverCardProductsTab } from '@/src/widgets/HoverCardProductsTab';
import { cn } from '@/src/shared/utils/textFormatter';
import { t } from '@/src/i18n/vi';

interface Props {
  payment?: Payment;
  paymentId?: string;
  contracts?: Contract[];
  quotations?: Quotation[];
  deliveries?: Delivery[];
  children: React.ReactNode;
}

function PaymentHoverCardContent({
  payment,
  paymentId,
  contracts = [],
  quotations = [],
  deliveries = []
}: {
  payment?: Payment;
  paymentId?: string;
  contracts?: Contract[];
  quotations?: Quotation[];
  deliveries?: Delivery[];
}) {
  const [activeTab, setActiveTab] = useState<'customer' | 'links' | 'products'>('customer');
  const targetId = paymentId || payment?.id;

  const { data: fetchedPayment } = useSWR<any>(
    targetId ? `payments:${targetId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const activePayment = fetchedPayment || payment;

  const { data: customer } = useSWR<any>(
    activePayment?.customerId ? `customers:${activePayment.customerId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  if (!activePayment) {
    return (
      <div className="flex flex-col h-full bg-slate-50 p-6 text-center text-xs text-slate-500 w-[420px] animate-pulse">
        Đang tải thông tin thanh toán...
      </div>
    );
  }

  const safeContracts = contracts || [];
  const safeQuotations = quotations || [];
  const safeDeliveries = deliveries || [];

  let contract = safeContracts.find(c => 
    (activePayment.contractId && c.id === activePayment.contractId) || 
    ((activePayment as any).soHopDong && c.soHopDong === (activePayment as any).soHopDong)
  );
  if (!contract && (activePayment as any).soHopDong) {
    contract = {
      soHopDong: (activePayment as any).soHopDong,
      ngayKy: (activePayment as any).ngayKy || '',
      customerId: activePayment.customerId,
      tenKhachHang: activePayment.tenKhachHang,
    } as any;
  }

  let quotation = safeQuotations.find(q => 
    (activePayment.quotationId && q.id === activePayment.quotationId) || 
    ((activePayment as any).soPhieuBaoGia && q.soPhieuBaoGia === (activePayment as any).soPhieuBaoGia) ||
    (contract && contract.quotationId && q.id === contract.quotationId) ||
    (contract && contract.soPhieuBaoGia && q.soPhieuBaoGia === contract.soPhieuBaoGia)
  );
  if (!quotation && (activePayment as any).soPhieuBaoGia) {
    quotation = {
      soPhieuBaoGia: (activePayment as any).soPhieuBaoGia,
      ngayBaoGia: (activePayment as any).ngayBaoGia || '',
      customerId: activePayment.customerId,
      tenKhachHang: activePayment.tenKhachHang,
    } as any;
  }

  const pbDeliveries = safeDeliveries.filter(d => {
    if (activePayment.id && d.paymentId === activePayment.id) return true;
    if (activePayment.contractId && d.contractId === activePayment.contractId) return true;
    if (contract?.id && d.contractId === contract.id) return true;
    if ((activePayment as any).soHopDong && d.soHopDong === (activePayment as any).soHopDong) return true;
    if (contract?.soHopDong && d.soHopDong === contract.soHopDong) return true;
    if (activePayment.quotationId && d.quotationId === activePayment.quotationId) return true;
    if (quotation?.id && d.quotationId === quotation.id) return true;
    return false;
  });

  const products = activePayment.products || contract?.products || quotation?.products || [];

  const content = (
    <div className="flex flex-col h-full bg-slate-50 max-h-[85vh] overflow-hidden w-[420px]" onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className="bg-white border-b border-slate-200 p-3.5 flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt size={16} className="text-amber-600 shrink-0" />
              <span className="font-semibold text-sm text-slate-900 line-clamp-1">{activePayment.paymentId}</span>
            </div>
            <span className={cn("px-1.5 py-0.5 rounded text-2xs uppercase font-bold tracking-wide", activePayment.tinhTrangThanhToan === 'Tất toán' ? 'bg-emerald-100 text-emerald-700' : activePayment.tinhTrangThanhToan === 'Công nợ' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600')}>{activePayment.tinhTrangThanhToan}</span>
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between mt-1">
            <span className="font-medium text-slate-600 bg-slate-50 px-2 flex items-center gap-1.5 py-1 rounded">
               <CalendarClock size={12} /> {formatDate((activePayment as any).ngayThanhToan || activePayment.createdAt)}
            </span>
            <span className="font-bold text-slate-800 tabular-nums text-sm">
              {new Intl.NumberFormat('vi-VN').format(activePayment.soTien || activePayment.totalAmount || 0)} ₫
            </span>
          </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0 bg-white" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('customer'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'customer' ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Khách hàng</button>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('links'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'links' ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Liên kết</button>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('products'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'products' ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Sản phẩm ({products.length})</button>
      </div>

      {/* Tab Contents */}
      <div className="overflow-y-auto scrollbar-thin flex-1 bg-white" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'customer' && (
          <div className="p-3.5 text-2xs text-slate-700 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Tên khách hàng:</span>
                <span className="font-bold text-slate-900 leading-tight block">{customer?.tenKhachHang || activePayment.tenKhachHang || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Người đại diện:</span>
                <span className="font-semibold text-slate-800 block">{customer?.nguoiDaiDien || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Số điện thoại:</span>
                <span className="font-mono font-semibold text-slate-800 block flex items-center gap-1">
                  <Phone size={10} className="text-slate-400" /> {customer?.sdt || activePayment.sdt || '—'}
                </span>
              </div>
              <div className="col-span-2 border-t border-slate-100 pt-3">
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Địa chỉ / Tỉnh thành:</span>
                <span className="font-semibold text-slate-800 leading-normal block flex items-start gap-1">
                  <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" /> {customer?.diaChi || '—'}{customer?.tinhThanh ? ` - ${customer.tinhThanh}` : ''}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="p-3.5 space-y-3 bg-slate-50/50 h-full animate-in fade-in zoom-in-95 duration-150">
            {/* Báo giá */}
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-blue-600">
                  <Calculator size={12} className="text-blue-500" /> Báo Giá
                </div>
              </div>
              {quotation ? (
                <div className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-blue-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/quotations?quotationId=${quotation.id}`; }}>
                   <div className="flex justify-between items-center mb-1">
                     <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{quotation.soPhieuBaoGia}</span>
                     <span className="font-mono text-blue-700 font-bold">{new Intl.NumberFormat('vi-VN').format(quotation.totalAmount || 0)} ₫</span>
                   </div>
                   <div className="flex justify-between text-slate-500 text-2xs">
                     <span>Ngày báo giá: {formatDate(quotation.ngayBaoGia)}</span>
                   </div>
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">{t('missing.quote')}</div>}
            </div>

            {/* Hợp đồng */}
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-emerald-600">
                  <Handshake size={12} className="text-emerald-500" /> Hợp Đồng
                </div>
              </div>
              {contract ? (
                <div className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-emerald-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/contracts?contractId=${contract.id}`; }}>
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">{contract.soHopDong || contract.soDonHang}</span>
                     <span className="font-mono text-emerald-700 font-bold">{new Intl.NumberFormat('vi-VN').format(contract.totalAmount || 0)} ₫</span>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-slate-500 text-2xs leading-tight">
                     <div><span className="font-medium text-slate-400">Ngày ký:</span> <span className="font-medium text-slate-700">{formatDate(contract.ngayKy) || '-'}</span></div>
                     <div><span className="font-medium text-slate-400">Số ngày TH:</span> <span className="font-medium text-slate-700">{(contract as any).soNgayDuKienHoanThanh || '-'} ngày</span></div>
                     <div className="col-span-2"><span className="font-medium text-slate-400">Dự kiến HT:</span> <span className="font-medium text-slate-700">{formatDate((contract as any).ngayDuKienHoanThanh) || '-'}</span></div>
                   </div>
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">{t('missing.contract')}</div>}
            </div>

            {/* Giao hàng */}
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-cyan-600">
                  <Truck size={12} className="text-cyan-500" /> Giao Hàng
                </div>
                <span className="bg-cyan-100 text-cyan-700 text-3xs font-bold px-1.5 py-0.5 rounded">{pbDeliveries?.length || 0}</span>
              </div>
               {pbDeliveries && pbDeliveries.length > 0 ? (
                <div className="space-y-2">
                  {pbDeliveries.map(d => (
                    <div key={d.id} className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-cyan-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/deliveries?deliveryId=${d.id}`; }}>
                       <div className="flex justify-between items-center mb-1.5">
                         <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-cyan-700 transition-colors">{d.deliveryId || d.soPhieuXuat}</span>
                       </div>
                       <div className="space-y-1 text-2xs text-slate-500">
                         <div><span className="inline-block w-20 font-medium text-slate-400">Dự kiến GH:</span> <span className="font-medium text-slate-700">{formatDate(d.ngayGiaoMay || (d as any).estimatedDeliveryDate) || '-'}</span></div>
                         <div><span className="inline-block w-20 font-medium text-slate-400">Xác nhận GH:</span> <span className="font-medium text-slate-700">{formatDate(d.ngayGiaoThucTe || (d as any).actualDeliveryDate) || '-'}</span></div>
                       </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">{t('missing.delivery')}</div>}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
           <HoverCardProductsTab
             products={products || []}
             subTotal={contract?.subTotal || quotation?.subTotal}
             discountRate={contract?.discountRate || quotation?.discountRate}
             discountAmount={contract?.discountAmount || quotation?.discountAmount}
             vatRate={contract?.vatRate || quotation?.vatRate}
             vatAmount={contract?.vatAmount || quotation?.vatAmount}
             totalAmount={contract?.totalAmount || quotation?.totalAmount}
             accentColorClass="text-amber-700"
           />
        )}
      </div>
    </div>
  );

  return content;
}

export function PaymentHoverCard({ payment, paymentId, contracts = [], quotations = [], deliveries = [], children }: Props) {
  return (
    <HoverCardPortal
      content={<PaymentHoverCardContent payment={payment} paymentId={paymentId} contracts={contracts} quotations={quotations} deliveries={deliveries} />}
      cardWidth={420}
    >
      {children}
    </HoverCardPortal>
  );
}

