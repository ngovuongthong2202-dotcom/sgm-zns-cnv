/* eslint-disable max-lines */
import React, { useState } from 'react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { MapPin, Briefcase, User, Calendar, DollarSign, Tag, Activity, Flame, Phone, FileText, CheckCircle2, Clock, Copy, Check, ShieldCheck, Info } from 'lucide-react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatDate } from '@/src/shared/utils/formatDate';
import { calculateHealthScore } from '@/src/modules/customers';
import { useSWRConfig } from 'swr';
import { t } from '@/src/i18n/vi';
import { extractAvatarBadge } from '@/src/shared/utils/userProfile';

interface Props {
  customer: Customer;
  onEdit: () => void;
  quotationCount?: number;
  payments?: any[];
  contracts?: any[];
  quotations?: any[];
}

export function CustomerOverviewBento({ 
  customer, 
  onEdit: _onEdit, 
  quotationCount = 0, 
  payments = [], 
  contracts = [], 
  quotations = [] 
}: Props) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const znsStatus = normalizeLegacyStatus(customer.trangThaiGuiTinQuangCao);
  const contactsCount = customer.contacts?.length || (customer.nguoiDaiDien || customer.sdt ? 1 : 0);

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

  // Compute realtime health score
  const { cache } = useSWRConfig();
  const effectiveQuotes = (quotations && quotations.length > 0) 
    ? quotations 
    : (cache.get(`quotations:500:customerId:${customer.id}`)?.data || cache.get(`quotations:100:customerId:${customer.id}`)?.data || []);
  const effectiveContracts = (contracts && contracts.length > 0) 
    ? contracts 
    : (cache.get(`contracts:500:customerId:${customer.id}`)?.data || cache.get(`contracts:100:customerId:${customer.id}`)?.data || []);
  const effectivePayments = (payments && payments.length > 0) 
    ? payments 
    : (cache.get(`payments:500:customerId:${customer.id}`)?.data || cache.get(`payments:100:customerId:${customer.id}`)?.data || []);
  
  const health = calculateHealthScore(customer, effectiveQuotes, effectiveContracts, effectivePayments);

  const handleCopyPhone = (phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 1500);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* ===================== CỘT TRỌNG TÂM (70%): COMMERCIAL VITALITY & DEAL MATRIX ===================== */}
      <div className="lg:col-span-8 space-y-5">
        
        {/* Khối 1: Commercial Vitality Cockpit (4 KPIs Bento Grid) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <DollarSign size={14} className="text-emerald-600" />
              CHỈ SỐ THƯƠNG MẠI & SỨC KHỎE QUAN HỆ (COMMERCIAL VITALITY)
            </h3>
            <span className="font-mono text-3xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              {customer.loaiKh || 'TIÊU CHUẨN'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* LTV */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 rounded-xl border border-emerald-200/80 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-3xs font-bold uppercase tracking-wider text-emerald-800">
                <span>VÒNG ĐỜI (LTV)</span>
                <DollarSign size={13} className="text-emerald-600" />
              </div>
              <div className="font-mono font-black text-base lg:text-lg text-emerald-800 tabular-nums">
                {ltv > 0 ? formatCurrency(ltv) : '0 ₫'}
              </div>
              <span className="text-3xs text-emerald-700 block truncate">
                Thực thu: {formatCurrency(calculatedTotalPaid)}
              </span>
            </div>

            {/* Công nợ */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1 ${
              debt > 0 
                ? 'bg-gradient-to-br from-amber-50/70 to-red-50/40 border-amber-200/80 text-amber-800' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <div className="flex items-center justify-between text-3xs font-bold uppercase tracking-wider">
                <span className={debt > 0 ? 'text-amber-800' : 'text-slate-500'}>CÔNG NỢ HIỆN TẠI</span>
                <Activity size={13} className={debt > 0 ? 'text-red-500' : 'text-slate-400'} />
              </div>
              <div className={`font-mono font-black text-base lg:text-lg tabular-nums ${
                debt > 0 ? 'text-red-600' : 'text-emerald-700'
              }`}>
                {debt > 0 ? formatCurrency(debt) : '0 ₫'}
              </div>
              <span className="text-3xs text-slate-500 block truncate">
                Tổng HĐ: {formatCurrency(totalContractVal)}
              </span>
            </div>

            {/* Sức khỏe quan hệ */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 shadow-2xs space-y-1.5 sm:col-span-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-3xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                  <Flame size={12} className={`text-${health.color}-500`} /> SỨC KHỎE QUAN HỆ
                </span>
                <span className={`text-3xs font-black px-2 py-0.5 rounded border uppercase ${
                  health.score >= 80 
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                    : health.score >= 60 
                    ? 'bg-blue-100 text-blue-800 border-blue-300'
                    : 'bg-amber-100 text-amber-800 border-amber-300'
                }`}>
                  {health.label} ({health.score}/100)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    health.score >= 80 ? 'bg-emerald-500' : health.score >= 60 ? 'bg-blue-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(5, health.score))}%` }}
                />
              </div>

              <div className="flex flex-col gap-0.5 pt-0.5">
                {health.actionPlan.slice(0, 2).map((plan, idx) => (
                  <span key={idx} className="text-2xs text-slate-600 truncate flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                    {plan}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Khối 2: Ma trận Hợp đồng & Đơn hàng gần nhất (Active Engagements Matrix) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-blue-600" />
              HỢP ĐỒNG & ĐƠN HÀNG GẦN ĐÂY
            </h3>
            <span className="font-mono text-3xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
              {contracts.length} Hợp đồng • {quotationCount} Báo giá
            </span>
          </div>

          {contracts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-3xs font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã Hợp Đồng</th>
                    <th className="px-3 py-2.5">Ngày ký</th>
                    <th className="px-3 py-2.5 text-right">Giá trị HĐ</th>
                    <th className="px-3 py-2.5 text-center">Trạng thái HĐ</th>
                    <th className="px-3 py-2.5 text-center">Thanh toán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {contracts.slice(0, 5).map((contract: any, idx: number) => {
                    const isPaid = (contract.tinhTrangThanhToan || '').toLowerCase().includes('đã thanh toán');
                    return (
                      <tr key={contract.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {contract.soHopDong || `HĐ-${idx + 1}`}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-600 text-2xs">
                          {contract.ngayKy ? formatDate(contract.ngayKy) : '---'}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 text-right">
                          {formatCurrency(contract.totalAmount || contract.giaTriHopDong || 0)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold border ${
                            contract.tinhTrangHopDong === 'Đã ký' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {contract.tinhTrangHopDong || 'Mới'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-3xs font-bold border ${
                            isPaid 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {contract.tinhTrangThanhToan || 'Chưa thanh toán'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : quotations.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-3xs font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Mã Báo Giá</th>
                    <th className="px-3 py-2.5">Ngày lập</th>
                    <th className="px-3 py-2.5">Phân loại</th>
                    <th className="px-3 py-2.5 text-right">Tổng tiền</th>
                    <th className="px-3 py-2.5 text-center">Hiệu lực</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {quotations.slice(0, 5).map((quote: any, idx: number) => (
                    <tr key={quote.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                        {quote.soPhieuBaoGia || `BG-${idx + 1}`}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-slate-600 text-2xs">
                        {quote.ngayBaoGia ? formatDate(quote.ngayBaoGia) : '---'}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 text-2xs">
                        {quote.loai || 'Máy may'}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-bold text-slate-900 text-right">
                        {formatCurrency(quote.totalAmount || quote.tongTien || 0)}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className="font-mono text-3xs text-slate-600">
                          {quote.ngayHetHan ? formatDate(quote.ngayHetHan) : 'Hiệu lực mở'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
              Khách hàng mới – Chưa phát sinh hợp đồng hoặc báo giá chính thức.
            </div>
          )}
        </section>

        {/* Khối 3: Nhu cầu & Ghi chú vận hành chiến lược (Strategic Demands & Notes) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Info size={14} className="text-slate-600" />
              NHU CẦU & GHI CHÚ VẬN HÀNH CHIẾN LƯỢC
            </h3>
            <div className="flex items-center gap-1 flex-wrap">
              {tags.map((tag) => (
                <span key={tag} className="text-3xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Tag size={9} /> {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-slate-50/80 rounded-lg border border-slate-150 text-xs leading-relaxed text-slate-700">
            {customer.nhuCauKhachHang ? (
              <p className="whitespace-pre-line font-medium">{customer.nhuCauKhachHang}</p>
            ) : (
              <p className="text-slate-400 italic font-normal">{t('empty.noSpecialNotes')}</p>
            )}
          </div>
        </section>

      </div>

      {/* ===================== CỘT VỆ TINH (30%): INTELLIGENCE INSPECTOR ===================== */}
      <div className="lg:col-span-4 space-y-4">
        
        {/* Thẻ 1: Hồ sơ pháp nhân & Thuế */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
            Hồ sơ pháp nhân
          </h4>

          <div>
            <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Tên khách hàng đầy đủ</span>
            <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={customer.tenKhachHang}>
              {customer.loaiHinhDoanhNghiep ? `${customer.loaiHinhDoanhNghiep} ` : ''}
              {customer.tenKhachHang}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Mã số thuế</span>
              <span className="font-mono font-bold text-slate-800 text-xs block truncate" title={customer.maSoThue}>
                {customer.maSoThue || 'N/A'}
              </span>
            </div>
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Loại hình</span>
              <span className="font-bold text-slate-800 text-xs block truncate" title={customer.loaiHinhDoanhNghiep}>
                {customer.loaiHinhDoanhNghiep || '—'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-3xs uppercase font-bold text-slate-400 block mb-1 flex items-center gap-1">
              <MapPin size={11} className="text-blue-600" /> Trụ sở chính
            </span>
            <p className="font-medium text-slate-800 text-xs leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-150">
              {customer.diaChi}
              {customer.xaPhuong && `, ${customer.xaPhuong}`}
              {customer.tinhThanh && `, ${customer.tinhThanh}`}
            </p>
          </div>

          {customer.ngayTao && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500">
              <span className="flex items-center gap-1">
                <Calendar size={11} className="text-slate-400" /> Ngày tạo hồ sơ:
              </span>
              <span className="font-mono font-semibold text-slate-700">
                {formatDate(customer.ngayTao)}
              </span>
            </div>
          )}
        </section>

        {/* Thẻ 2: Danh bạ liên hệ đa đầu mối (Multi-Contact Directory) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500">
              Danh bạ liên hệ
            </h4>
            <span className="font-mono text-3xs font-bold bg-blue-50 text-blue-750 px-2 py-0.5 rounded border border-blue-100">
              {contactsCount} đầu mối
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
            {customer.contacts?.length ? (
              customer.contacts.map((contact, idx) => {
                const hasSent = contact.trangThaiZns === 'THANH_CONG' || Boolean(contact.ngayGuiZns) || Boolean((customer as any)?.contactsZnsHistory?.[contact.sdt || '']);
                const isCopied = copiedPhone === contact.sdt;
                return (
                  <div key={idx} className="p-3 bg-slate-50/80 rounded-xl border border-slate-150 space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {contact.nguoiDaiDien || `Đầu mối #${idx + 1}`}
                      </div>
                      {hasSent ? (
                        <span className="text-3xs text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-bold shrink-0">
                          ✓ ZNS
                        </span>
                      ) : (
                        <span className="text-3xs text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 shrink-0">
                          Chưa gửi
                        </span>
                      )}
                    </div>

                    {contact.chucVu && (
                      <span className="text-3xs text-slate-500 block truncate font-medium">
                        {contact.chucVu}
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {contact.sdt || '---'}
                      </span>
                      {contact.sdt && (
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(contact.sdt!)}
                          className="text-3xs font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                          title="Sao chép SĐT"
                        >
                          {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                          {isCopied ? 'Đã copy' : 'Sao chép'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-150 space-y-1.5">
                <div className="font-bold text-slate-900 text-xs">
                  {customer.nguoiDaiDien || 'Chưa ghi nhận người đại diện'}
                </div>
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                  <span className="font-mono text-xs font-bold text-slate-800">
                    {customer.sdt || '---'}
                  </span>
                  {customer.sdt && (
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(customer.sdt!)}
                      className="text-3xs font-bold text-blue-700 hover:text-blue-800 bg-white hover:bg-blue-50 px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Sao chép SĐT"
                    >
                      {copiedPhone === customer.sdt ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                      {copiedPhone === customer.sdt ? 'Đã copy' : 'Sao chép'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Thẻ 3: Quản trị & Điều phối phụ trách (PIC Governance) */}
        <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
            Quản trị & Phụ trách
          </h4>

          <div>
            <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Chuyên viên phụ trách</span>
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center font-bold text-2xs shrink-0 font-mono">
                {extractAvatarBadge(customer.nguoiPhuTrach)}
              </span>
              <span className="font-bold text-slate-900 text-xs">
                {customer.nguoiPhuTrach || 'Chưa phân công'}
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Khu vực phân vùng</span>
            <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <MapPin size={12} className="text-slate-400" />
              {customer.tinhThanh || 'Toàn quốc'}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-3xs uppercase font-bold text-slate-400">Trạng thái ZNS SGM</span>
            <StatusPill statusStr={znsStatus} />
          </div>
        </section>

      </div>
    </div>
  );
}
