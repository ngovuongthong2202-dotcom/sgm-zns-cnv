import React from 'react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { MapPin, Briefcase, User, Info, Calendar, DollarSign, Tag, Activity, Flame } from 'lucide-react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { calculateHealthScore } from '@/src/modules/customers';
import { useSWRConfig } from 'swr';
import { t } from '@/src/i18n/vi';

interface Props {
  customer: Customer;
  onEdit: () => void;
  quotationCount?: number;
  payments?: any[];
  contracts?: any[];
  quotations?: any[];
}

export function CustomerOverviewBento({ customer, onEdit: _onEdit, quotationCount = 0, payments = [], contracts = [], quotations = [] }: Props) {
  const znsStatus = normalizeLegacyStatus(customer.trangThaiGuiTinQuangCao);
  const contactsCount = customer.contacts?.length || 0;

  // Realtime calculated LTV & Debt from actual linked records
  const calculatedTotalPaid = (payments && payments.length > 0)
    ? payments.reduce((sum: number, p: any) => sum + (Number(p.soTien) || 0), 0)
    : 0;

  const totalContractVal = (contracts && contracts.length > 0)
    ? contracts.reduce((sum: number, c: any) => {
        const prodSum = Array.isArray(c.products) ? c.products.reduce((s: number, prod: any) => s + (Number(prod.total) || 0), 0) : 0;
        return sum + (Number(c.totalAmount) || Number(c.giaTriHopDong) || prodSum || 0);
      }, 0)
    : 0;

  const nonMayQuoteVal = (quotations && quotations.length > 0)
    ? quotations
        .filter((q: any) => String(q.loai || '').toUpperCase().includes('VẬT TƯ') || String(q.loai || '').toUpperCase().includes('DỊCH VỤ'))
        .reduce((sum: number, q: any) => {
          const prodSum = Array.isArray(q.products) ? q.products.reduce((s: number, prod: any) => s + (Number(prod.total) || 0), 0) : 0;
          return sum + (Number(q.totalAmount) || Number(q.tongTien) || prodSum || 0);
        }, 0)
    : 0;

  const totalOrderValue = Math.max(totalContractVal + nonMayQuoteVal, calculatedTotalPaid);
  const calculatedDebt = Math.max(0, totalOrderValue - calculatedTotalPaid);

  const ltv = customer.ltv || calculatedTotalPaid || 0;
  const debt = (customer.totalDebt !== undefined && customer.totalDebt > 0) ? customer.totalDebt : calculatedDebt;
  const tags = customer.tags || [];

  // Compute realtime health score utilizing SWR cache (if available) - safe fallback to empty
  const { cache } = useSWRConfig();
  const cachedQuotes = cache.get(`quotations:500:customerId:${customer.id}`)?.data || [];
  const cachedContracts = cache.get(`contracts:500:customerId:${customer.id}`)?.data || [];
  const cachedPayments = cache.get(`payments:500:customerId:${customer.id}`)?.data || [];
  
  const health = calculateHealthScore(customer, cachedQuotes, cachedContracts, cachedPayments);

  return (
    <div className="space-y-4">
      {/* Top Professional Operational Summary Hero Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        {/* Row 1: Identity & Action */}
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-2xs font-bold border border-slate-200 uppercase">
                {customer.maKh}
              </span>
              <span className="text-2xs bg-blue-50 text-blue-750 font-extrabold px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider font-sans">
                {customer.loaiKh || 'CHƯA PHÂN LOẠI'}
              </span>
              {customer.isArchived && (
                <span className="text-2xs bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                  ĐÃ LƯU TRỮ/GỘP
                </span>
              )}
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug truncate" title={customer.tenKhachHang}>
              {customer.loaiHinhDoanhNghiep ? `${customer.loaiHinhDoanhNghiep} ` : ''}
              {customer.tenKhachHang}
            </h3>
          </div>
        </div>

        {/* Row 2: Operational summary metadata grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Người phụ trách</span>
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mt-1 truncate">
              <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-3xs shrink-0 font-mono">
                {customer.nguoiPhuTrach?.substring(0, 2).toUpperCase() || '?'}
              </span>
              <span className="truncate">{customer.nguoiPhuTrach || 'Chưa phân công'}</span>
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">ZNS truyền thông</span>
            <div className="mt-1">
              <StatusPill statusStr={znsStatus} />
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Báo giá đã lập</span>
            <span className="text-xs font-bold text-slate-800 block mt-1.5">
              {quotationCount} báo giá
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider block">Khu vực quản lý</span>
            <span className="text-xs font-medium text-slate-700 block mt-1.5 flex items-center gap-1 truncate" title={customer.tinhThanh || ''}>
              <MapPin size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{customer.tinhThanh || 'Chưa phân vùng'}</span>
            </span>
          </div>
        </div>

        {/* System KPIs: LTV, Debt, Health Score */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
           {/* LTV */}
           <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <DollarSign size={12} className="text-slate-400" /> Vòng đời (LTV)
              </span>
              <span className="text-sm font-extrabold text-emerald-700 block mt-1">
                 {ltv > 0 ? formatCurrency(ltv) : '0 ₫'}
              </span>
           </div>
           
           {/* Debt */}
           <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <Activity size={12} className="text-slate-400" /> Công nợ
              </span>
              <span className={`text-sm font-extrabold block mt-1 ${debt > 0 ? 'text-red-600' : 'text-slate-700'}`}>
                 {debt > 0 ? formatCurrency(debt) : '0 ₫'}
              </span>
           </div>
           
           {/* Health Score */}
           <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Flame size={12} className={`text-${health.color}-500`} /> Sức khoẻ quan hệ
                </span>
                <span className={`text-xs font-bold text-${health.color}-700 bg-${health.color}-100 px-2 rounded`}>
                  {health.label} ({health.score} đ)
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-0.5 max-h-[40px] overflow-y-auto">
                {health.actionPlan.slice(0, 2).map((plan, idx) => (
                  <span key={idx} className="text-2xs font-medium text-slate-600 truncate flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                    {plan}
                  </span>
                ))}
              </div>
           </div>

           {/* Tags */}
           <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 col-span-2 sm:col-span-4">
              <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                 <Tag size={12} className="text-slate-400" /> Phân khúc (Tags)
              </span>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                 {tags.length > 0 ? tags.map(tag => (
                   <span key={tag} className="text-2xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                     {tag}
                   </span>
                 )) : <span className="text-xs text-slate-400 italic">Chưa gắn tag</span>}
              </div>
           </div>
        </div>
      </div>

      {/* Row 2 - Contacts and Profiling details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Contact Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-blue-50 text-blue-700 border border-blue-105 flex items-center justify-center shrink-0">
                <User size={14} />
              </div>
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Liên hệ chính</h4>
            </div>
            {contactsCount > 1 && (
              <span className="text-2xs font-bold text-blue-750 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-mono">
                +{contactsCount - 1} đầu mối khác
              </span>
            )}
          </div>

          <div className="flex items-start gap-4 overflow-x-auto scrollbar-hide pb-1">
            {customer.contacts?.length ? (
              customer.contacts.map((contact, idx) => (
                <div key={idx} className="shrink-0 flex flex-col gap-3.5 min-w-[130px] pr-4 border-r border-slate-100 last:border-0 last:pr-0">
                  <div>
                    <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Người đại diện {idx + 1}</span>
                    <p className="text-sm font-semibold text-slate-900 truncate" title={contact.nguoiDaiDien || ''}>{contact.nguoiDaiDien || '—'}</p>
                  </div>
                  <div>
                    <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Số điện thoại</span>
                    <p className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 w-fit px-2 py-0.5 rounded truncate" title={contact.sdt || ''}>
                      {contact.sdt || '—'}
                    </p>
                  </div>
                </div>
              ))
            ) : (
                <div className="shrink-0 flex flex-col gap-3.5 min-w-[130px]">
                  <div>
                    <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Người đại diện 1</span>
                    <p className="text-sm font-semibold text-slate-900 truncate" title={customer.nguoiDaiDien || ''}>{customer.nguoiDaiDien || '—'}</p>
                  </div>
                  <div>
                    <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Số điện thoại</span>
                    <p className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-200 w-fit px-2 py-0.5 rounded truncate" title={customer.sdt || ''}>
                      {customer.sdt || '—'}
                    </p>
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* Legal Profiling details */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <div className="w-7 h-7 rounded bg-slate-50 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
              <Briefcase size={14} />
            </div>
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Hồ sơ pháp nhân</h4>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Mã số thuế</span>
                <p className="font-mono text-xs font-semibold text-slate-750 bg-slate-50 border border-slate-150 px-2 py-0.5 rounded w-fit">
                  {customer.maSoThue || 'N/A'}
                </p>
              </div>
              <div>
                <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Loại hình</span>
                <p className="text-xs font-medium text-slate-750 truncate" title={customer.loaiHinhDoanhNghiep || ''}>
                  {customer.loaiHinhDoanhNghiep || '—'}
                </p>
              </div>
            </div>

            {customer.ngayTao && (
              <div>
                <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Thời gian tạo hệ thống</span>
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Calendar size={12} className="text-slate-400" />
                  {new Date(customer.ngayTao).toLocaleDateString('vi-VN')} {new Date(customer.ngayTao).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Box 3: Address & Ghi chú vận hành details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Address card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <MapPin size={14} className="text-slate-600 shrink-0" />
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Địa chỉ trụ sở</h4>
          </div>
          <p className="text-xs font-medium text-slate-700 leading-relaxed">{customer.diaChi}</p>
          <p className="text-2xs text-slate-500 font-medium">{customer.xaPhuong ? `${customer.xaPhuong}, ` : ''}{customer.tinhThanh}</p>
        </div>

        {/* Operational Notes */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
            <Info size={14} className="text-slate-600 shrink-0" />
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">Ghi chú vận hành chính</h4>
          </div>
          <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-line block max-h-[80px] overflow-y-auto scrollbar-hide">
            {customer.nhuCauKhachHang || <span className="text-slate-400 italic font-normal">{t('empty.noSpecialNotes')}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}
