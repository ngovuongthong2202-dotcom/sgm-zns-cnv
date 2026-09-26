import React from 'react';
import { Customer } from '@/src/domain/schema/customer.schema';
import useSWR from 'swr';
import { Building2, FileText, Receipt, Truck, Calculator, CalendarClock, UserCheck, User, Phone, MapPin } from 'lucide-react';
import { swrApiFetcher, swrColFetcher } from '@/src/data/swr-fetchers';
import { HoverCardPortal } from '@/src/design-system';

interface Props {
  customer: Customer;
  children: React.ReactNode;
}

function CustomerHoverCardContent({ customer }: { customer: Customer }) {
  const { data: summary } = useSWR<any>(
    customer.id ? `/api/metrics/customer-summary?customerId=${customer.id}` : null,
    swrApiFetcher, { dedupingInterval: 60000 }
  );

  const { data: customerDeliveries } = useSWR<any[]>(
    customer.id ? `deliveries:500:customerId:${customer.id}` : null,
    swrColFetcher, { dedupingInterval: 60000 }
  );
  const waiverDelivery = (customerDeliveries || []).find((d: any) => d.dacCachGiaoTruoc || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU');

  const content = (
    <div className="flex flex-col h-full bg-white max-h-[85vh] overflow-y-auto scrollbar-thin">
      <div className="bg-slate-50/80 border-b border-slate-200 p-3.5 flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-blue-600 shrink-0" />
          <span className="font-semibold text-sm text-slate-900 line-clamp-1">{customer.tenKhachHang}</span>
        </div>
        <div className="text-xs text-slate-500 flex items-center gap-2 pl-6">
          <span className="font-mono font-medium text-slate-600 bg-slate-200/50 px-1.5 py-0.5 rounded text-2xs">
            {customer.maKh}
          </span>
          {customer.loaiHinhDoanhNghiep && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="font-medium text-slate-500">{customer.loaiHinhDoanhNghiep}</span>
            </>
          )}
        </div>
        {waiverDelivery && (
          <div className="bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 flex items-center justify-between text-2xs mt-1">
            <span className="font-bold text-amber-800 flex items-center gap-1">
              ⚡ Khách có đơn xuất kho đặc cách (Giao trước TT sau)
            </span>
            <span className="text-3xs font-mono font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
              {waiverDelivery.deliveryId}
            </span>
          </div>
        )}
      </div>

      {/* Contact Details Panel */}
      <div className="p-3.5 bg-slate-50/60 border-b border-slate-100 text-2xs text-slate-700 space-y-2">
        <div className="flex items-center justify-between text-slate-500 uppercase tracking-wider text-2xs font-black">
          <div className="flex items-center gap-1">
            <User size={12} className="text-slate-400" />
            <span>Đầu mối liên hệ ({customer.contacts?.length || 1})</span>
          </div>
        </div>

        {Array.isArray(customer.contacts) && customer.contacts.length > 0 ? (
          <div className="space-y-1.5 divide-y divide-slate-100">
            {customer.contacts.map((ct, idx) => (
              <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800 block truncate">
                    {ct.nguoiDaiDien || `Đầu mối ${idx + 1}`}
                  </span>
                  {ct.chucVu && <span className="text-3xs text-slate-500">{ct.chucVu}</span>}
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono text-2xs font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 block">
                    {ct.sdt || '—'}
                  </span>
                  {ct.trangThaiZns === 'THANH_CONG' && (
                    <span className="text-3xs text-emerald-600 block mt-0.5 font-medium">✓ Đã gửi ZNS</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pb-0.5">
            <div>
              <span className="text-slate-450 block text-2xs uppercase font-bold tracking-wide">Người đại diện:</span>
              <span className="font-semibold text-slate-850 block">{customer.nguoiDaiDien || '—'}</span>
            </div>
            <div>
              <span className="text-slate-450 block text-2xs uppercase font-bold tracking-wide">Số điện thoại:</span>
              <span className="font-mono font-semibold text-slate-855 block flex items-center gap-1">
                <Phone size={10} className="text-slate-400" /> {customer.sdt || '—'}
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-x-4 gap-y-1">
          <div className="col-span-2">
            <span className="text-slate-450 block text-2xs uppercase font-bold tracking-wide">Tỉnh / Thành phố:</span>
            <span className="font-semibold text-slate-850 block">{customer.tinhThanh || '—'}</span>
          </div>
          <div className="col-span-2">
            <span className="text-slate-450 block text-2xs uppercase font-bold tracking-wide">Địa chỉ:</span>
            <span className="font-semibold text-slate-800 leading-normal block flex items-start gap-1">
              <MapPin size={10} className="text-slate-400 mt-0.5 shrink-0" /> {customer.diaChi || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Activities Stats */}
      <div className="p-4 grid grid-cols-2 gap-3.5 bg-white border-b border-slate-100">
        <div className="flex flex-col gap-1 border border-slate-150 bg-slate-50/50 p-2.5 rounded-lg shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calculator size={12} className="text-blue-500" />
            <span className="text-2xs font-bold uppercase tracking-wide">Báo giá</span>
          </div>
          <div className="text-base font-extrabold text-slate-800 font-mono">
            {summary?.countQuotations !== undefined ? summary.countQuotations : '-'}
          </div>
        </div>
        <div className="flex flex-col gap-1 border border-slate-150 bg-slate-50/50 p-2.5 rounded-lg shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <FileText size={12} className="text-emerald-500" />
            <span className="text-2xs font-bold uppercase tracking-wide">Hợp đồng</span>
          </div>
          <div className="text-base font-extrabold text-slate-800 font-mono">
            {summary?.countContracts !== undefined ? summary.countContracts : '-'}
          </div>
        </div>
        <div className="flex flex-col gap-1 border border-slate-150 bg-slate-50/50 p-2.5 rounded-lg shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Receipt size={12} className="text-amber-500" />
            <span className="text-2xs font-bold uppercase tracking-wide">Thanh toán</span>
          </div>
          <div className="text-base font-extrabold text-slate-800 font-mono">
            {summary?.countPayments !== undefined ? summary.countPayments : '-'}
          </div>
        </div>
        <div className="flex flex-col gap-1 border border-slate-150 bg-slate-50/50 p-2.5 rounded-lg shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Truck size={12} className="text-teal-500" />
            <span className="text-2xs font-bold uppercase tracking-wide">Giao hàng</span>
          </div>
          <div className="text-base font-extrabold text-slate-800 font-mono">
            {summary?.countDeliveries !== undefined ? summary.countDeliveries : '-'}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50/80 p-3 flex items-center justify-between text-2xs text-slate-500 shrink-0">
         <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded shadow-sm border border-slate-200/60">
            <UserCheck size={12} className="text-slate-400 animate-pulse" />
            <span className="font-semibold text-slate-700">{customer.nguoiPhuTrach || 'Chưa phân công'}</span>
         </div>
         <div className="flex items-center gap-1.5 font-medium">
            <CalendarClock size={12} className="text-slate-400" />
            <span>{customer.ngayTao ? new Date(customer.ngayTao).toLocaleDateString('vi-VN') : '—'}</span>
         </div>
      </div>
    </div>
  );

  return content;
}

export function CustomerHoverCard({ customer, children }: Props) {
  return (
    <HoverCardPortal
      content={<CustomerHoverCardContent customer={customer} />}
      cardWidth={380}
    >
      {children}
    </HoverCardPortal>
  );
}

