import React, { useState } from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import useSWR from 'swr';
import { Receipt, Truck, Calculator, UserCheck, Phone, MapPin, Handshake } from 'lucide-react';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { HoverCardPortal } from '@/src/design-system/HoverCardPortal';
import { HoverCardProductsTab } from '@/src/widgets/HoverCardProductsTab';
import { formatDate } from '@/src/shared/utils/formatDate';
import { cn } from '@/src/shared/utils/textFormatter';
import { t } from '@/src/i18n/vi';

interface Props {
  quotation?: Quotation;
  quotationId?: string;
  children: React.ReactNode;
}

function QuotationHoverCardContent({ quotation, quotationId }: { quotation?: Quotation; quotationId?: string }) {
  const [activeTab, setActiveTab] = useState<'customer' | 'links' | 'products'>('customer');
  const targetId = quotationId || quotation?.id;
  const { data: fetchedQuotation } = useSWR<any>(
    targetId ? `quotations:${targetId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const activeQuotation = fetchedQuotation || quotation;

  const { data: customer } = useSWR<any>(
    activeQuotation?.customerId ? `customers:${activeQuotation.customerId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const { data: contracts } = useSWR<any[]>(
    activeTab === 'links' && activeQuotation?.id ? `contracts:500:quotationId:${activeQuotation.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );
  const { data: payments } = useSWR<any[]>(
    activeTab === 'links' && activeQuotation?.id ? `payments:500:quotationId:${activeQuotation.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );
  const { data: deliveries } = useSWR<any[]>(
    activeTab === 'links' && activeQuotation?.id ? `deliveries:500:quotationId:${activeQuotation.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );

  const content = (
    <div className="flex flex-col h-full bg-slate-50 max-h-[85vh] overflow-hidden w-[420px]" onClick={(e) => e.stopPropagation()}>
      {!activeQuotation ? (
        <div className="p-6 text-center text-xs text-slate-500 animate-pulse">
          Đang tải thông tin báo giá...
        </div>
      ) : (() => {
        const totalValue = activeQuotation.products?.reduce((acc: number, p: any) => acc + ((p.price || 0) * (p.quantity || 1)), 0) || 0;
        const displayCustomerName = customer?.tenKhachHang || activeQuotation.tenKhachHang || '—';
        const displayRepresentative = customer?.nguoiDaiDien || activeQuotation.nguoiDaiDien || '—';
        const displayPhone = customer?.sdt || activeQuotation.sdt || '—';
        const displayProvince = customer?.tinhThanh || '—';
        const displayAddress = customer?.diaChi || '—';

        return (
          <>
            {/* Header section invariant */}
            <div className="bg-white border-b border-slate-200 p-3.5 flex flex-col gap-1.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-blue-600 shrink-0" />
                  <span className="font-semibold text-sm text-slate-900 line-clamp-1">{activeQuotation.soPhieuBaoGia || t('empty.noQuoteNum')}</span>
                </div>
                <span className="font-medium text-slate-600 bg-slate-200/50 px-1.5 py-0.5 rounded text-2xs uppercase tracking-wide">
                  {activeQuotation.loai || 'Chưa phân loại'}
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center justify-between mt-1">
                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                   <UserCheck size={12} className="text-slate-500 shrink-0" />
                   <span className="font-medium text-slate-700 truncate max-w-[120px]">{activeQuotation.nguoiPhuTrach || 'Chưa phân công'}</span>
                </div>
                <span className="font-bold text-slate-800 tabular-nums text-sm">
                  {new Intl.NumberFormat('vi-VN').format(activeQuotation.totalAmount || totalValue)} ₫
                </span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 shrink-0 bg-white" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('customer'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'customer' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Khách hàng</button>
              <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('links'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'links' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Liên kết</button>
              <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('products'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'products' ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Sản phẩm ({activeQuotation.products?.length || 0})</button>
            </div>

            {/* Tab Contents */}
            <div className="overflow-y-auto scrollbar-thin flex-1 bg-white" onClick={(e) => e.stopPropagation()}>
              {activeTab === 'customer' && (
                <div className="p-3.5 text-2xs text-slate-700 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <div className="col-span-2">
                      <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Tên khách hàng:</span>
                      <span className="font-bold text-slate-900 leading-tight block">{displayCustomerName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Người đại diện:</span>
                      <span className="font-semibold text-slate-800 block">{displayRepresentative}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Số điện thoại:</span>
                      <span className="font-mono font-semibold text-slate-800 block flex items-center gap-1">
                        <Phone size={10} className="text-slate-400" /> {displayPhone}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-3">
                      <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Địa chỉ / Tỉnh thành:</span>
                      <span className="font-semibold text-slate-800 leading-normal block flex items-start gap-1">
                        <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" /> {displayAddress}{displayProvince ? ` - ${displayProvince}` : ''}
                      </span>
                    </div>
                    <div className="col-span-2 border-t border-slate-100 pt-3">
                       <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Ghi chú báo giá:</span>
                       <span className="font-medium text-slate-600 block italic leading-normal">
                          {activeQuotation.noiDungGhiChu || 'Không có ghi chú'}
                       </span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'links' && (
                <div className="p-3.5 space-y-3 bg-slate-50/50 h-full animate-in fade-in zoom-in-95 duration-150">
                  {/* Hợp đồng */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-emerald-600">
                        <Handshake size={12} className="text-emerald-500" /> Hợp Đồng
                      </div>
                      <span className="bg-emerald-100 text-emerald-700 text-3xs font-bold px-1.5 py-0.5 rounded">{contracts?.length || 0}</span>
                    </div>
                    {contracts && contracts.length > 0 ? (
                      <div className="space-y-2">
                        {contracts.map((c: any) => (
                          <div key={c.id} className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-emerald-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/contracts?contractId=${c.id}`; }}>
                             <div className="flex justify-between items-center mb-1.5">
                               <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700 transition-colors">{c.soHopDong || c.soDonHang}</span>
                               <span className="font-mono text-emerald-700 font-bold">{new Intl.NumberFormat('vi-VN').format(c.totalAmount || 0)} ₫</span>
                             </div>
                             <div className="grid grid-cols-2 gap-2 text-slate-500 text-2xs leading-tight">
                               <div><span className="font-medium text-slate-400">Ngày ký:</span> <span className="font-medium text-slate-700">{formatDate(c.ngayKy) || '-'}</span></div>
                               <div><span className="font-medium text-slate-400">Số ngày TH:</span> <span className="font-medium text-slate-700">{c.soNgayThucHien || c.soNgayDuKienHoanThanh || '-'} ngày</span></div>
                               <div className="col-span-2"><span className="font-medium text-slate-400">Dự kiến HT:</span> <span className="font-medium text-slate-700">{formatDate(c.ngayDuKienHoanThanh) || '-'}</span></div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-2xs text-slate-500 italic text-center py-2">{t('missing.contract')}</div>}
                  </div>

                   {/* Thanh Toán */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-amber-600">
                        <Receipt size={12} className="text-amber-500" /> Thanh Toán
                      </div>
                      <span className="bg-amber-100 text-amber-700 text-3xs font-bold px-1.5 py-0.5 rounded">{payments?.length || 0}</span>
                    </div>
                     {payments && payments.length > 0 ? (
                      <div className="space-y-2">
                        {payments.map((p: any) => (
                          <div key={p.id} className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-amber-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/payments?paymentId=${p.id}`; }}>
                             <div className="flex justify-between items-center mb-1.5">
                               <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-amber-700 transition-colors">{p.paymentId || p.code}</span>
                               <span className="font-mono text-amber-700 font-bold">{new Intl.NumberFormat('vi-VN').format(p.amount || p.totalAmount || 0)} ₫</span>
                             </div>
                             <div className="flex justify-between text-slate-500 text-2xs items-center">
                               <div><span className="font-medium text-slate-400">TT:</span> <span className="font-medium text-slate-700">{formatDate(p.paymentDate || p.ngayThanhToan)}</span></div>
                               <span className="font-medium px-1.5 py-0.5 rounded border border-slate-200/60">{p.tinhTrangThanhToan}</span>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="text-2xs text-slate-500 italic text-center py-2">{t('missing.payment')}</div>}
                  </div>

                  {/* Giao hàng */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-sm flex flex-col gap-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-blue-600">
                        <Truck size={12} className="text-blue-500" /> Giao Hàng
                      </div>
                      <span className="bg-blue-100 text-blue-700 text-3xs font-bold px-1.5 py-0.5 rounded">{deliveries?.length || 0}</span>
                    </div>
                     {deliveries && deliveries.length > 0 ? (
                      <div className="space-y-2">
                        {deliveries.map((d: any) => (
                          <div key={d.id} className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-blue-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/deliveries?deliveryId=${d.id}`; }}>
                             <div className="flex justify-between items-center mb-1.5">
                               <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{d.deliveryId || d.soPhieuXuat}</span>
                             </div>
                             <div className="space-y-1 text-2xs text-slate-500">
                               <div><span className="inline-block w-20 font-medium text-slate-400">Dự kiến GH:</span> <span className="font-medium text-slate-700">{formatDate(d.ngayGiaoMay || d.estimatedDeliveryDate) || '-'}</span></div>
                               <div><span className="inline-block w-20 font-medium text-slate-400">Xác nhận GH:</span> <span className="font-medium text-slate-700">{formatDate(d.ngayGiaoThucTe || d.actualDeliveryDate) || '-'}</span></div>
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
                   products={activeQuotation.products || []}
                   subTotal={activeQuotation.subTotal || totalValue}
                   discountRate={activeQuotation.discountRate}
                   discountAmount={activeQuotation.discountAmount}
                   vatRate={activeQuotation.vatRate}
                   vatAmount={activeQuotation.vatAmount}
                   totalAmount={activeQuotation.totalAmount || totalValue}
                   accentColorClass="text-blue-700"
                 />
              )}
            </div>
          </>
        );
      })()}
    </div>
  );

  return content;
}

export function QuotationHoverCard({ quotation, quotationId, children }: Props) {
  return (
    <HoverCardPortal
      content={<QuotationHoverCardContent quotation={quotation} quotationId={quotationId} />}
      cardWidth={420}
    >
      {children}
    </HoverCardPortal>
  );
}


