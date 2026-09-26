import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import React, { useState } from 'react';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import useSWR from 'swr';
import { Truck, Receipt, Handshake, FileText, UserCheck, Phone, MapPin } from 'lucide-react';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import { formatDate } from '@/src/shared/utils/formatDate';
import { HoverCardPortal } from '@/src/design-system/HoverCardPortal';
import { HoverCardProductsTab } from '@/src/widgets/HoverCardProductsTab';
import { cn } from '@/src/shared/utils/textFormatter';

interface Props {
  delivery?: Delivery;
  deliveryId?: string;
  children: React.ReactNode;
}

// Separate component to lazily fetch data ONLY when HoverCard is actually opened.
// This boosts performance dramatically and prevents global network bottlenecks.
function DeliveryHoverCardContent({ delivery, deliveryId }: { delivery?: Delivery; deliveryId?: string }) {
  const [activeTab, setActiveTab] = useState<'customer' | 'links' | 'products'>('customer');
  const targetId = deliveryId || delivery?.id;

  const { data: fetchedDelivery } = useSWR<any>(
    targetId ? `deliveries:${targetId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const activeDelivery = fetchedDelivery || delivery;

  const { data: linkedPayment } = useSWR<any>(
    activeTab === 'links' && activeDelivery?.paymentId ? `payments:${activeDelivery.paymentId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const { data: linkedContract } = useSWR<any>(
    activeTab === 'links' && activeDelivery?.contractId ? `contracts:${activeDelivery.contractId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const { data: linkedQuotation } = useSWR<any>(
    activeTab === 'links' && (activeDelivery?.quotationId || linkedContract?.quotationId) ? 
    `quotations:${activeDelivery.quotationId || linkedContract?.quotationId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const { data: customer } = useSWR<any>(
    activeTab === 'customer' && activeDelivery?.customerId ? `customers:${activeDelivery.customerId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  if (!activeDelivery) {
    return (
      <div className="flex flex-col h-full bg-slate-50 p-6 text-center text-xs text-slate-500 w-[420px] animate-pulse">
        Đang tải thông tin giao hàng...
      </div>
    );
  }

  const totalValue = activeDelivery.products?.reduce((acc: number, p: any) => acc + ((p.price || 0) * (p.quantity || 1)), 0) || 0;

  return (
    <div className="flex flex-col h-full bg-slate-50 max-h-[85vh] overflow-hidden w-[420px]" onClick={(e) => e.stopPropagation()}>
      {/* Header section */}
      <div className="bg-white border-b border-slate-200 p-3.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-blue-600 shrink-0" />
            <span className="font-semibold text-sm text-slate-900 line-clamp-1">{activeDelivery.deliveryId || activeDelivery.soPhieuXuat}</span>
          </div>
          <span className="font-medium text-slate-600 bg-slate-200/50 px-1.5 py-0.5 rounded text-2xs uppercase tracking-wide">
            {activeDelivery.donViVanChuyen || 'Chưa định ĐT'}
          </span>
        </div>
        <div className="text-xs text-slate-500 flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
             <UserCheck size={12} className="text-slate-500 shrink-0" />
             <span className="font-medium text-slate-700 truncate max-w-[120px]">{activeDelivery.nguoiPhuTrach || 'Chưa phân công'}</span>
          </div>
          <span className="font-bold text-slate-800 tabular-nums text-sm">
            {new Intl.NumberFormat('vi-VN').format(activeDelivery.totalAmount || totalValue)} ₫
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0 bg-white" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('customer'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'customer' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Khách hàng</button>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('links'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'links' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Liên kết</button>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('products'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'products' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Sản phẩm ({activeDelivery.products?.length || 0})</button>
      </div>

      {/* Tab Contents */}
      <div className="overflow-y-auto scrollbar-thin flex-1 bg-white" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'customer' && (
          <div className="p-3.5 text-2xs text-slate-700 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Tên khách hàng:</span>
                <span className="font-bold text-slate-900 leading-tight block">{customer?.tenKhachHang || activeDelivery.tenKhachHang || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Người đại diện:</span>
                <span className="font-semibold text-slate-800 block">{customer?.nguoiDaiDien || activeDelivery.nguoiDaiDien || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Số điện thoại:</span>
                <span className="font-mono font-semibold text-slate-800 block flex items-center gap-1">
                  <Phone size={10} className="text-slate-400" /> {customer?.sdt || activeDelivery.sdt || '—'}
                </span>
              </div>
              <div className="col-span-2 border-t border-slate-100 pt-3">
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Địa chỉ / Tỉnh thành:</span>
                <span className="font-semibold text-slate-800 leading-normal block flex items-start gap-1">
                  <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" /> {customer?.diaChi || '—'}{customer?.tinhThanh ? ` - ${customer.tinhThanh}` : ''}
                </span>
              </div>
              <div className="col-span-2 border-t border-slate-100 pt-3 flex gap-4">
                 <div>
                    <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Ngày DP Cập nhật:</span>
                    <span className="font-medium text-slate-600 block leading-normal">
                      {formatDate(activeDelivery.ngayGiaoMay || (activeDelivery as any).estimatedDeliveryDate)}
                    </span>
                 </div>
                 <div>
                    <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Ngày GH Thực tế:</span>
                    <span className="font-medium text-slate-600 block leading-normal">
                      {formatDate(activeDelivery.ngayGiaoThucTe || (activeDelivery as any).actualDeliveryDate) || '—'}
                    </span>
                 </div>
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
                  <FileText size={12} className="text-blue-500" /> Báo Giá
                </div>
              </div>
              {linkedQuotation || (activeDelivery as any).maLienKetBaoGia ? (
                <div className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-blue-200 transition-colors group" onClick={(e) => { e.stopPropagation(); if (linkedQuotation?.id) window.location.href = `/quotations?quotationId=${linkedQuotation.id}`; }}>
                   <div className="flex justify-between items-center mb-1">
                     <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{linkedQuotation?.soPhieuBaoGia || (activeDelivery as any).maLienKetBaoGia}</span>
                     <span className="font-mono text-blue-700 font-bold">{new Intl.NumberFormat('vi-VN').format(linkedQuotation?.totalAmount || 0)} ₫</span>
                   </div>
                   <div className="flex justify-between text-slate-500 text-2xs">
                     <span>Ngày báo giá: {formatDate(linkedQuotation?.ngayBaoGia)}</span>
                   </div>
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">Không liên kết báo giá</div>}
            </div>

            {/* Hợp đồng */}
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-emerald-600">
                  <Handshake size={12} className="text-emerald-500" /> Hợp Đồng
                </div>
              </div>
              {linkedContract || activeDelivery.soHopDong ? (
                <div className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-emerald-200 transition-colors group" onClick={(e) => { e.stopPropagation(); if (linkedContract?.id) window.location.href = `/contracts?contractId=${linkedContract.id}`; }}>
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">{linkedContract?.soHopDong || linkedContract?.soDonHang || activeDelivery.soHopDong}</span>
                     <span className="font-mono text-emerald-700 font-bold">{new Intl.NumberFormat('vi-VN').format(linkedContract?.totalAmount || 0)} ₫</span>
                   </div>
                   <div className="grid grid-cols-2 gap-2 text-slate-500 text-2xs leading-tight">
                     <div><span className="font-medium text-slate-400">Ngày ký:</span> <span className="font-medium text-slate-700">{formatDate(linkedContract?.ngayKy) || '-'}</span></div>
                     <div><span className="font-medium text-slate-400">Số ngày TH:</span> <span className="font-medium text-slate-700">{linkedContract?.soNgayThucHien || linkedContract?.soNgayDuKienHoanThanh || '-'} ngày</span></div>
                     <div className="col-span-2"><span className="font-medium text-slate-400">Dự kiến HT:</span> <span className="font-medium text-slate-700">{formatDate(linkedContract?.ngayDuKienHoanThanh) || '-'}</span></div>
                   </div>
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">Không liên kết hợp đồng</div>}
            </div>

             {/* Thanh Toán */}
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-amber-600">
                  <Receipt size={12} className="text-amber-500" /> Thanh Toán
                </div>
              </div>
               {linkedPayment || activeDelivery.paymentId ? (
                <div className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-amber-200 transition-colors group" onClick={(e) => { e.stopPropagation(); if (linkedPayment?.id) window.location.href = `/payments?paymentId=${linkedPayment.id}`; }}>
                   <div className="flex justify-between items-center mb-1.5">
                     <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-amber-700 transition-colors">{getEntityDisplayLabel('payment', linkedPayment) === "Chưa có thông tin" && activeDelivery.paymentId ? `ID: ${activeDelivery.paymentId.slice(-8)}` : getEntityDisplayLabel('payment', linkedPayment)}</span>
                     <span className="font-mono text-amber-700 font-bold">{new Intl.NumberFormat('vi-VN').format(linkedPayment?.amount || linkedPayment?.totalAmount || 0)} ₫</span>
                   </div>
                   <div className="flex justify-between text-slate-500 text-2xs items-center">
                     <div><span className="font-medium text-slate-400">TT:</span> <span className="font-medium text-slate-700">{formatDate(linkedPayment?.paymentDate || linkedPayment?.ngayThanhToan)}</span></div>
                     <span className="font-medium px-1.5 py-0.5 rounded border border-slate-200/60">{linkedPayment?.tinhTrangThanhToan}</span>
                   </div>
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">Không liên kết thanh toán</div>}
            </div>
          </div>
        )}

        {activeTab === 'products' && (
           <HoverCardProductsTab
             products={activeDelivery.products || []}
             subTotal={activeDelivery.subTotal || totalValue}
             discountRate={activeDelivery.discountRate}
             discountAmount={activeDelivery.discountAmount}
             vatRate={activeDelivery.vatRate}
             vatAmount={activeDelivery.vatAmount}
             totalAmount={activeDelivery.totalAmount || totalValue}
             accentColorClass="text-blue-700"
           />
        )}
      </div>
    </div>
  );
}

export function DeliveryHoverCard({ delivery, deliveryId, children }: Props) {
  return (
    <HoverCardPortal
      content={<DeliveryHoverCardContent delivery={delivery} deliveryId={deliveryId} />}
      cardWidth={420}
    >
      {children}
    </HoverCardPortal>
  );
}


