import { Button } from '@/src/design-system';
import { PageHeader } from '@/src/design-system/PageHeader';
import React, { useState } from 'react';
import { usePipelineAnalytics } from './hooks/usePipelineAnalytics';
import { useAuth } from '@/src/modules/iam';
import { Users, FileText, Handshake, CreditCard, ChevronRight, AlertCircle, CheckCircle2, Truck, BarChart3, PieChart } from 'lucide-react';
import { t } from '@/src/i18n/vi';

export default function DashboardPage() {
  const { user: _user } = useAuth();
  const { analytics } = usePipelineAnalytics();
  const [activeTab, setActiveTab] = useState<'overview' | 'groups'>('overview');

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden animate-in fade-in pb-24">
      <PageHeader 
        title="Pipeline Analytics" 
        meta="Real-time Conversion Tracking • Workflow Analytics" 
      />

      <div className="flex flex-col gap-8 w-full max-w-[1400px] mx-auto font-sans p-6">
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 h-10 w-fit shrink-0">
          <Button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === 'overview' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <BarChart3 size={14} />
            Dòng phân tích
          </Button>
          <Button
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === 'groups' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <PieChart size={14} />
            Phân bổ danh mục
          </Button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* SECTION 1: KHÁCH HÀNG & BÁO GIÁ GLOBAL CONNECTION */}
          <section className="bg-slate-50 rounded-2xl border border-slate-200/70 p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6 flex items-center gap-2">
              <Users size={16} className="text-blue-500" />
              1. Liên kết Khách hàng & Báo giá
            </h2>
            <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-16">
              <div className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200 w-full max-w-[200px] shadow-sm">
                <span className="text-4xl font-black text-slate-800">{analytics.totalCustomers}</span>
                <span className="text-xs font-semibold text-slate-500 uppercase mt-2">Tổng Khách hàng</span>
              </div>
              <ChevronRight size={32} className="text-slate-300 hidden md:block" />
              <div className="flex flex-col items-center bg-blue-50 p-6 rounded-xl border border-blue-100 w-full max-w-[200px] shadow-sm">
                <span className="text-4xl font-black text-blue-600">{analytics.customersWithQuotesCount}</span>
                <span className="text-xs font-semibold text-blue-500 uppercase mt-2 text-center">Khách có Báo giá</span>
              </div>
              <ChevronRight size={32} className="text-slate-300 hidden md:block" />
              <div className="flex flex-col justify-center gap-2 text-sm text-slate-600 font-medium bg-white p-6 border border-slate-200 rounded-xl w-full max-w-[280px]">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span>Khách có báo giá</span>
                  <span className="font-bold text-slate-800">{analytics.customersWithQuotesCount}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span>Khách trắng (Chưa có BG)</span>
                  <span className="font-bold text-red-500">{analytics.totalCustomers - analytics.customersWithQuotesCount}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* SECTION 2: BÁO GIÁ MÁY -> HỢP ĐỒNG */}
            <section className="bg-slate-50 rounded-2xl border border-slate-200/70 p-6 flex flex-col h-full">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6 flex items-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                2. Pipeline Báo Giá MÁY
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col items-center bg-white border border-slate-200 w-full p-4 rounded-xl shadow-sm text-center">
                  <span className="text-3xl font-black text-slate-800">{analytics.pipelineMay.total}</span>
                  <span className="text-2xs font-bold text-slate-500 tracking-wide uppercase mt-1">Tổng BG Máy</span>
                </div>
                
                <div className="w-0.5 h-6 bg-slate-300"></div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col items-center bg-emerald-50 border border-emerald-100 p-4 rounded-xl shadow-sm">
                    <CheckCircle2 size={24} className="text-emerald-500 mb-2" />
                    <span className="text-2xl font-black text-emerald-700">{analytics.pipelineMay.withContracts}</span>
                    <span className="text-2xs font-bold text-emerald-600 text-center uppercase tracking-tight mt-1">Đã có Hợp đồng</span>
                  </div>
                  <div className="flex flex-col items-center bg-amber-50 border border-amber-100 p-4 rounded-xl shadow-sm">
                    <AlertCircle size={24} className="text-amber-500 mb-2" />
                    <span className="text-2xl font-black text-amber-700">{analytics.pipelineMay.withoutContracts}</span>
                    <span className="text-2xs font-bold text-amber-600 text-center uppercase tracking-tight mt-1">{t('missing.contract')}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: BÁO GIÁ VTY / DỊCH VỤ -> THANH TOÁN */}
            <section className="bg-slate-50 rounded-2xl border border-slate-200/70 p-6 flex flex-col h-full">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-6 flex items-center gap-2">
                <CreditCard size={16} className="text-teal-500" />
                3. Pipeline Báo Giá Vật Tư / Dịch Vụ
              </h2>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="flex flex-col items-center bg-white border border-slate-200 w-full p-4 rounded-xl shadow-sm text-center">
                  <span className="text-3xl font-black text-slate-800">{analytics.pipelineVatTuDv.total}</span>
                  <span className="text-2xs font-bold text-slate-500 tracking-wide uppercase mt-1">Tổng BG Vật Tư / DV</span>
                </div>
                
                <div className="w-0.5 h-6 bg-slate-300"></div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  <div className="flex flex-col items-center bg-teal-50 border border-teal-100 p-4 rounded-xl shadow-sm">
                    <CheckCircle2 size={24} className="text-teal-500 mb-2" />
                    <span className="text-2xl font-black text-teal-700">{analytics.pipelineVatTuDv.withPayments}</span>
                    <span className="text-2xs font-bold text-teal-600 text-center uppercase tracking-tight mt-1">Đã có Thanh toán</span>
                  </div>
                  <div className="flex flex-col items-center bg-red-50 border border-red-100 p-4 rounded-xl shadow-sm">
                    <AlertCircle size={24} className="text-red-500 mb-2" />
                    <span className="text-2xl font-black text-red-700">{analytics.pipelineVatTuDv.withoutPayments}</span>
                    <span className="text-2xs font-bold text-red-600 text-center uppercase tracking-tight mt-1">Chưa Thanh toán</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* SECTION 4: HỢP ĐỒNG FULFILLMENT */}
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-8 flex items-center gap-2 relative z-10">
              <Handshake size={16} className="text-blue-400" />
              4. Mức độ hoàn thành Hợp Đồng
            </h2>
            
            <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
               {/* Total */}
               <div className="flex-1 bg-slate-800/80 backdrop-blur border border-slate-700 p-6 rounded-xl flex items-center justify-between">
                 <div>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Tổng Hợp đồng</p>
                   <p className="text-4xl font-black text-white">{analytics.contractFulfillment.total}</p>
                 </div>
                 <Handshake size={48} className="text-slate-600 opacity-50" />
               </div>

               {/* Paid */}
               <div className="flex-1 bg-emerald-900/40 backdrop-blur border border-emerald-800 p-6 rounded-xl flex items-center justify-between">
                 <div>
                   <p className="text-xs text-emerald-400/80 font-bold uppercase tracking-wider mb-1">Đã Thanh Toán</p>
                   <p className="text-4xl font-black text-emerald-400">{analytics.contractFulfillment.paid}</p>
                 </div>
                 <CreditCard size={48} className="text-emerald-500 opacity-20" />
               </div>

               {/* Delivered */}
               <div className="flex-1 bg-sky-900/40 backdrop-blur border border-sky-800 p-6 rounded-xl flex items-center justify-between">
                 <div>
                   <p className="text-xs text-sky-400/80 font-bold uppercase tracking-wider mb-1">Đã Giao Hàng</p>
                   <p className="text-4xl font-black text-sky-400">{analytics.contractFulfillment.delivered}</p>
                 </div>
                 <Truck size={48} className="text-sky-500 opacity-20" />
               </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <section className="bg-slate-50 border border-slate-200/70 p-6 rounded-2xl">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Top 10 Tỉnh/Thành Mở Báo Giá</h3>
             <ul className="space-y-3">
               {analytics.groupings.byProvince.length > 0 ? analytics.groupings.byProvince.map(([province, count], idx) => (
                 <li key={province} className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-lg">
                   <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <span className="font-semibold text-slate-800">{province}</span>
                   </div>
                   <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs">{count} BG</span>
                 </li>
               )) : <li className="text-sm text-slate-500 italic">{t('empty.noData')}</li>}
             </ul>
           </section>

           <section className="bg-slate-50 border border-slate-200/70 p-6 rounded-2xl">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Top Phụ Trách</h3>
             <ul className="space-y-3">
               {analytics.groupings.bySalesRep.length > 0 ? analytics.groupings.bySalesRep.map(([rep, count], idx) => (
                 <li key={rep} className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-lg">
                   <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-mono font-bold text-slate-400">#{idx + 1}</span>
                      <span className="font-semibold text-slate-800">{rep}</span>
                   </div>
                   <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs">{count} BG</span>
                 </li>
               )) : <li className="text-sm text-slate-500 italic">{t('empty.noData')}</li>}
             </ul>
           </section>
        </div>
      )}
    </div>
  );
}

