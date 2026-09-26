import { Button } from '@/src/design-system';
import React, { useState } from 'react';
import { Contract } from '@/src/domain/schema/contract.schema';
import useSWR from 'swr';
import { FileText, Truck, Calculator, CalendarClock, UserCheck, Phone, MapPin, Receipt } from 'lucide-react';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { HoverCardPortal } from '@/src/design-system/HoverCardPortal';
import { formatDate } from '@/src/shared/utils/formatDate';
import { HoverCardProductsTab } from '@/src/widgets/HoverCardProductsTab';

import { cn } from '@/src/shared/utils/textFormatter';
import { t } from '@/src/i18n/vi';

interface Props {
  contract?: Contract;
  contractId?: string;
  children: React.ReactNode;
}

function ContractHoverCardContent({ contract, contractId }: { contract?: Contract; contractId?: string }) {
  const [activeTab, setActiveTab] = useState<'customer' | 'links' | 'products'>('customer');
  const targetId = contractId || contract?.id;

  const { data: fetchedContract } = useSWR<any>(
    targetId ? `contracts:${targetId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const activeContract = fetchedContract || contract;

  const { data: deliveries } = useSWR<any[]>(
    activeTab === 'links' && activeContract?.id ? `deliveries:500:contractId:${activeContract.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );
  
  const { data: payments } = useSWR<any[]>(
    activeTab === 'links' && activeContract?.id ? `payments:500:contractId:${activeContract.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );

  const { data: customer } = useSWR<any>(
    activeContract?.customerId ? `customers:${activeContract.customerId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  const { data: quotation } = useSWR<any>(
    activeContract?.quotationId ? `quotations:${activeContract.quotationId}` : null,
    swrDocFetcher, { dedupingInterval: 60000 }
  );

  if (!activeContract) {
    return (
      <div className="flex flex-col h-full bg-slate-50 p-6 text-center text-xs text-slate-500 w-[420px] animate-pulse">
        Đang tải thông tin hợp đồng...
      </div>
    );
  }

  const totalValue = activeContract.totalAmount || activeContract.products?.reduce((acc: number, p: any) => acc + (p.total != null ? Number(p.total) : ((Number(p.price) || 0) * (Number(p.quantity) || 1))), 0) || 0;

  const { data: contractDeliveries } = useSWR<any[]>(
    activeContract?.id ? `deliveries:500:contractId:${activeContract.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );
  const waiverDelivery = (contractDeliveries || []).find((d: any) => d.dacCachGiaoTruoc || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU');

  const content = (
    <div className="flex flex-col h-full bg-slate-50 max-h-[85vh] overflow-hidden w-[420px]" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white border-b border-slate-200 p-3.5 flex flex-col gap-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-teal-600 shrink-0" />
            <span className="font-semibold text-sm text-slate-900 line-clamp-1">{activeContract.soHopDong || t('empty.noContractNum')}</span>
          </div>
          <span className="font-medium text-slate-600 bg-slate-200/50 px-1.5 py-0.5 rounded text-2xs uppercase tracking-wide flex items-center gap-1.5">
             <CalendarClock size={10} /> {formatDate(activeContract.ngayKy) || '—'}
          </span>
        </div>
        {waiverDelivery && (
          <div className="bg-amber-50 px-2 py-1 rounded border border-amber-200 flex items-center justify-between text-2xs mt-1">
            <span className="font-bold text-amber-800 flex items-center gap-1">
              ⚡ Hợp đồng có đợt xuất kho đặc cách (Giao trước TT sau)
            </span>
            <span className="text-3xs font-mono font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              {waiverDelivery.deliveryId}
            </span>
          </div>
        )}
        <div className="text-xs text-slate-500 flex items-center justify-between mt-1">
          <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
             <UserCheck size={12} className="text-slate-500 shrink-0" />
             <span className="font-medium text-slate-700 truncate max-w-[120px]">{activeContract.nguoiPhuTrach || 'Chưa phân công'}</span>
          </div>
          <span className="font-bold text-slate-800 tabular-nums text-sm">
            {new Intl.NumberFormat('vi-VN').format(activeContract.totalAmount || totalValue)} đ
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 shrink-0 bg-white" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('customer'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'customer' ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Khách hàng</button>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('links'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'links' ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Liên kết</button>
        <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); setActiveTab('products'); }} className={cn("flex-1 py-2 text-2xs font-bold uppercase tracking-wider transition-colors cursor-pointer bg-transparent border-0", activeTab === 'products' ? "text-teal-600 border-b-2 border-teal-600 bg-teal-50/30" : "text-slate-500 hover:bg-slate-50 hover:text-slate-900")}>Sản phẩm ({activeContract.products?.length || 0})</button>
      </div>

      {/* Tab Contents */}
      <div className="overflow-y-auto scrollbar-thin flex-1 bg-white" onClick={(e) => e.stopPropagation()}>
        {activeTab === 'customer' && (
          <div className="p-3.5 text-2xs text-slate-700 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div className="col-span-2">
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Tên khách hàng:</span>
                <span className="font-bold text-slate-900 leading-tight block">{customer?.tenKhachHang || activeContract.tenKhachHang || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Người đại diện:</span>
                <span className="font-semibold text-slate-800 block">{customer?.nguoiDaiDien || activeContract.nguoiDaiDien || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Số điện thoại:</span>
                <span className="font-mono font-semibold text-slate-800 block flex items-center gap-1">
                  <Phone size={10} className="text-slate-400" /> {customer?.sdt || activeContract.sdt || '—'}
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
                    <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Số ngày hiện thực:</span>
                    <span className="font-medium text-slate-600 block leading-normal">
                      {(activeContract as any).soNgayDuKienHoanThanh || '-'} ngày
                    </span>
                 </div>
                 <div>
                    <span className="text-slate-400 block text-3xs uppercase font-bold tracking-wider mb-0.5">Ngày dự kiến hoàn thành:</span>
                    <span className="font-medium text-slate-600 block leading-normal">
                      {formatDate((activeContract as any).ngayDuKienHoanThanh) || '-'}
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
                  <Calculator size={12} className="text-blue-500" /> Báo Giá
                </div>
              </div>
              {activeContract.quotationId || activeContract.soPhieuBaoGia ? (
                <div className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-blue-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/quotations?quotationId=${activeContract.quotationId}`; }}>
                   <div className="flex justify-between items-center mb-1">
                     <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-blue-700 transition-colors">{activeContract.soPhieuBaoGia}</span>
                     <span className="font-mono text-blue-700 font-bold">{new Intl.NumberFormat('vi-VN').format(quotation?.totalAmount || activeContract?.totalAmount || 0)} ₫</span>
                   </div>
                   <div className="flex justify-between text-slate-500 text-2xs">
                     <span>Ngày báo giá: {formatDate(activeContract.ngayBaoGia)}</span>
                   </div>
                </div>
              ) : <div className="text-2xs text-slate-500 italic text-center py-2">Không liên kết báo giá</div>}
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
                <div className="flex items-center gap-1.5 text-2xs font-bold uppercase tracking-wider text-cyan-600">
                  <Truck size={12} className="text-cyan-500" /> Giao Hàng
                </div>
                <span className="bg-cyan-100 text-cyan-700 text-3xs font-bold px-1.5 py-0.5 rounded">{deliveries?.length || 0}</span>
              </div>
               {deliveries && deliveries.length > 0 ? (
                <div className="space-y-2">
                  {deliveries.map((d: any) => (
                    <div key={d.id} className="text-2xs bg-slate-50 p-2.5 rounded border border-slate-150 cursor-pointer hover:bg-slate-100 hover:border-cyan-200 transition-colors group" onClick={(e) => { e.stopPropagation(); window.location.href = `/deliveries?deliveryId=${d.id}`; }}>
                       <div className="flex justify-between items-center mb-1.5">
                         <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-cyan-700 transition-colors">{d.deliveryId || d.soPhieuXuat}</span>
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
             products={activeContract.products || []}
             subTotal={activeContract.subTotal || totalValue}
             discountRate={activeContract.discountRate}
             discountAmount={activeContract.discountAmount}
             vatRate={activeContract.vatRate}
             vatAmount={activeContract.vatAmount}
             totalAmount={activeContract.totalAmount || totalValue}
             accentColorClass="text-teal-700"
           />
        )}
      </div>
    </div>
  );

  return content;
}

export function ContractHoverCard({ contract, contractId, children }: Props) {
  return (
    <HoverCardPortal
      content={<ContractHoverCardContent contract={contract} contractId={contractId} />}
      cardWidth={420}
    >
      {children}
    </HoverCardPortal>
  );
}

