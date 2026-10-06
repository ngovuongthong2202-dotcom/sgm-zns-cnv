import { Button } from '@/src/design-system';
import { PageHeader } from '@/src/design-system/PageHeader';
import React, { useState } from 'react';
import { usePipelineAnalytics } from './hooks/usePipelineAnalytics';
import { useAuth } from '@/src/modules/iam';
import { 
  Users, 
  FileText, 
  Handshake, 
  CreditCard, 
  ChevronRight, 
  AlertCircle, 
  CheckCircle2, 
  Truck, 
  BarChart3, 
  PieChart,
  MousePointerClick,
  Cpu
} from 'lucide-react';
import { t } from '@/src/i18n/vi';
import { MetricDrilldownDrawer, MetricDrilldownType } from './components/MetricDrilldownDrawer';
import { ProductAnalyticsTab } from './components/ProductAnalyticsTab';
import { CustomerDetailDrawer } from '@/src/modules/customers/ui/components/CustomerDetailDrawer';
import { QuotationDetailDrawer } from '@/src/modules/sales/ui/components/QuotationDetailDrawer';
import { ContractDetailDrawer } from '@/src/modules/contracts/ui/components/ContractDetailDrawer';
import { PaymentDetailDrawer } from '@/src/modules/billing/ui/components/PaymentDetailDrawer';
import { DeliveryDetailDrawer } from '@/src/modules/fulfillment/ui/components/DeliveryDetailDrawer';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { UniversalZnsPreviewModal } from '@/src/platform/ui/zns/UniversalZnsPreviewModal';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { calculateMaxWarrantyExpiryDate } from '@/src/modules/fulfillment/ui/utils/handoverDocumentHelper';
import { formatZnsDate } from '@/src/shared/utils/formatDate';
import { repositoryFactory } from '@/src/data/repositories/factory';

export default function DashboardPage() {
  const { user: _user } = useAuth();
  const { 
    analytics, 
    customers, 
    quotations, 
    contracts, 
    payments, 
    deliveries 
  } = usePipelineAnalytics();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'groups' | 'products'>('overview');
  const [drilldownMetric, setDrilldownMetric] = useState<MetricDrilldownType | null>(null);

  // In-Place Universal Continuum Inspector States
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [znsPreviewTarget, setZnsPreviewTarget] = useState<any | null>(null);

  const handleViewDoc = (type: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery', idOrCode: string) => {
    const clean = (idOrCode || '').toLowerCase().trim();
    if (type === 'customer') {
      const found = customers.find(c => 
        c.id === idOrCode || 
        (c.maKh && c.maKh.toLowerCase() === clean) || 
        (c.tenKhachHang && c.tenKhachHang.toLowerCase() === clean) ||
        ((c as any).name && (c as any).name.toLowerCase() === clean)
      );
      if (found) setSelectedCustomer(found);
    } else if (type === 'quotation') {
      const found = quotations.find(q => 
        q.id === idOrCode || 
        (q.soPhieuBaoGia && q.soPhieuBaoGia.toLowerCase() === clean) ||
        (q.tenKhachHang && q.tenKhachHang.toLowerCase() === clean)
      );
      if (found) setSelectedQuotation(found);
    } else if (type === 'contract') {
      const found = contracts.find(c => 
        c.id === idOrCode || 
        (c.soHopDong && c.soHopDong.toLowerCase() === clean) ||
        (c.tenKhachHang && c.tenKhachHang.toLowerCase() === clean)
      );
      if (found) setSelectedContract(found);
    } else if (type === 'payment') {
      const found = payments.find(p => 
        p.id === idOrCode || 
        ((p as any).soPhieuThu && (p as any).soPhieuThu.toLowerCase() === clean) ||
        (p.soHopDong && p.soHopDong.toLowerCase() === clean) ||
        (p.soPhieuBaoGia && p.soPhieuBaoGia.toLowerCase() === clean)
      );
      if (found) setSelectedPayment(found);
    } else if (type === 'delivery') {
      const found = deliveries.find(d => 
        d.id === idOrCode || 
        ((d as any).soPhieuGiao && (d as any).soPhieuGiao.toLowerCase() === clean) ||
        (d.soHopDong && d.soHopDong.toLowerCase() === clean)
      );
      if (found) setSelectedDelivery(found);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-y-auto min-h-full animate-in fade-in pb-24">
      <PageHeader 
        title="Pipeline Analytics" 
        meta="Real-time Conversion Tracking • Workflow Analytics • Interactive Cockpit" 
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
          <Button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold tracking-tight transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Cpu size={14} />
            Báo cáo Sản phẩm
          </Button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 max-w-[1400px] mx-auto w-full px-6">
          {/* SECTION 1: KHÁCH HÀNG & BÁO GIÁ GLOBAL CONNECTION */}
          <section className="bg-slate-50 rounded-2xl border border-slate-200/70 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                1. Liên kết Khách hàng & Báo giá
              </h2>
              <span className="text-2xs text-slate-400 font-medium flex items-center gap-1">
                <MousePointerClick size={12} /> Bấm vào thẻ chỉ số để xem danh sách chi tiết
              </span>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-center gap-8 lg:gap-16">
              {/* Metric 1: Tổng Khách hàng */}
              <div 
                onClick={() => setDrilldownMetric('totalCustomers')}
                className="flex flex-col items-center bg-white p-6 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer w-full max-w-[220px] group active:scale-[0.99]"
                title="Bấm để xem toàn bộ danh bạ khách hàng"
              >
                <span className="text-4xl font-black text-slate-850 group-hover:text-blue-600 transition-colors">
                  {analytics.totalCustomers}
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase mt-2 group-hover:text-slate-800 transition-colors text-center">
                  Tổng Khách hàng
                </span>
                <span className="text-3xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                  Xem danh sách →
                </span>
              </div>

              <ChevronRight size={32} className="text-slate-300 hidden md:block" />

              {/* Metric 2: Khách có Báo giá */}
              <div 
                onClick={() => setDrilldownMetric('customersWithQuotes')}
                className="flex flex-col items-center bg-blue-50/70 p-6 rounded-xl border border-blue-200 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer w-full max-w-[220px] group active:scale-[0.99]"
                title="Bấm để xem danh sách khách hàng đã có báo giá"
              >
                <span className="text-4xl font-black text-blue-700 group-hover:scale-105 transition-transform">
                  {analytics.customersWithQuotesCount}
                </span>
                <span className="text-xs font-bold text-blue-600 uppercase mt-2 text-center">
                  Khách có Báo giá
                </span>
                <span className="text-3xs text-blue-700 font-medium opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                  Xem danh sách →
                </span>
              </div>

              <ChevronRight size={32} className="text-slate-300 hidden md:block" />

              {/* Metric 3: Tóm tắt Khách có BG & Khách trắng */}
              <div className="flex flex-col justify-center gap-2 text-sm text-slate-600 font-medium bg-white p-6 border border-slate-200 rounded-xl w-full max-w-[300px] shadow-xs">
                <div 
                  onClick={() => setDrilldownMetric('customersWithQuotes')}
                  className="flex justify-between items-center border-b border-slate-100 pb-2.5 cursor-pointer hover:text-blue-700 transition-colors"
                >
                  <span className="text-xs font-semibold">Khách có báo giá:</span>
                  <span className="font-bold text-slate-850 bg-blue-50 px-2 py-0.5 rounded text-blue-700 tabular-nums">
                    {analytics.customersWithQuotesCount}
                  </span>
                </div>
                <div 
                  onClick={() => setDrilldownMetric('customersZeroQuotes')}
                  className="flex justify-between items-center pt-2.5 cursor-pointer hover:text-amber-700 transition-colors"
                >
                  <span className="text-xs font-semibold text-slate-700">Khách trắng (Chưa BG):</span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 tabular-nums">
                    {Math.max(0, analytics.totalCustomers - analytics.customersWithQuotesCount)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* SECTION 2: BÁO GIÁ MÁY -> HỢP ĐỒNG */}
            <section className="bg-slate-50 rounded-2xl border border-slate-200/70 p-6 flex flex-col h-full shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <FileText size={16} className="text-emerald-500" />
                  2. Pipeline Báo Giá MÁY
                </h2>
                <span className="text-2xs text-slate-400 font-medium">Click thẻ để drilldown</span>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {/* Metric 4: Tổng BG Máy */}
                <div 
                  onClick={() => setDrilldownMetric('totalMachineQuotes')}
                  className="flex flex-col items-center bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer w-full p-4 rounded-xl text-center group active:scale-[0.99]"
                >
                  <span className="text-3xl font-black text-slate-850 group-hover:text-blue-600 transition-colors tabular-nums">
                    {analytics.pipelineMay.total}
                  </span>
                  <span className="text-2xs font-bold text-slate-500 tracking-wide uppercase mt-1">
                    Tổng BG Máy (Bấm để xem)
                  </span>
                </div>
                
                <div className="w-0.5 h-6 bg-slate-300"></div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  {/* Metric 5: BG Máy Đã có HĐ */}
                  <div 
                    onClick={() => setDrilldownMetric('machineQuotesWithContract')}
                    className="flex flex-col items-center bg-emerald-50/70 border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer p-4 rounded-xl group active:scale-[0.99]"
                  >
                    <CheckCircle2 size={24} className="text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-2xl font-black text-emerald-700 tabular-nums">{analytics.pipelineMay.withContracts}</span>
                    <span className="text-2xs font-bold text-emerald-700 text-center uppercase tracking-tight mt-1">
                      Đã có Hợp đồng
                    </span>
                  </div>

                  {/* Metric 6: BG Máy Chưa có HĐ */}
                  <div 
                    onClick={() => setDrilldownMetric('machineQuotesWithoutContract')}
                    className="flex flex-col items-center bg-amber-50/70 border border-amber-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer p-4 rounded-xl group active:scale-[0.99]"
                  >
                    <AlertCircle size={24} className="text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-2xl font-black text-amber-700 tabular-nums">{analytics.pipelineMay.withoutContracts}</span>
                    <span className="text-2xs font-bold text-amber-700 text-center uppercase tracking-tight mt-1">
                      {t('missing.contract')}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 3: BÁO GIÁ VTY / DỊCH VỤ -> THANH TOÁN */}
            <section className="bg-slate-50 rounded-2xl border border-slate-200/70 p-6 flex flex-col h-full shadow-xs">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CreditCard size={16} className="text-teal-500" />
                  3. Pipeline Báo Giá Vật Tư / Dịch Vụ
                </h2>
                <span className="text-2xs text-slate-400 font-medium">Click thẻ để drilldown</span>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                {/* Metric 7: Tổng BG Vật tư / DV */}
                <div 
                  onClick={() => setDrilldownMetric('totalSupplyQuotes')}
                  className="flex flex-col items-center bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer w-full p-4 rounded-xl text-center group active:scale-[0.99]"
                >
                  <span className="text-3xl font-black text-slate-850 group-hover:text-teal-600 transition-colors tabular-nums">
                    {analytics.pipelineVatTuDv.total}
                  </span>
                  <span className="text-2xs font-bold text-slate-500 tracking-wide uppercase mt-1">
                    Tổng BG Vật Tư / DV (Bấm để xem)
                  </span>
                </div>
                
                <div className="w-0.5 h-6 bg-slate-300"></div>
                
                <div className="grid grid-cols-2 gap-4 w-full">
                  {/* Metric 8: BG Vật tư Đã có TT */}
                  <div 
                    onClick={() => setDrilldownMetric('supplyQuotesWithPayment')}
                    className="flex flex-col items-center bg-teal-50/70 border border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer p-4 rounded-xl group active:scale-[0.99]"
                  >
                    <CheckCircle2 size={24} className="text-teal-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-2xl font-black text-teal-700 tabular-nums">{analytics.pipelineVatTuDv.withPayments}</span>
                    <span className="text-2xs font-bold text-teal-700 text-center uppercase tracking-tight mt-1">
                      Đã có Thanh toán
                    </span>
                  </div>

                  {/* Metric 9: BG Vật tư Chưa TT */}
                  <div 
                    onClick={() => setDrilldownMetric('supplyQuotesWithoutPayment')}
                    className="flex flex-col items-center bg-red-50/70 border border-red-200 hover:border-red-400 hover:shadow-md transition-all cursor-pointer p-4 rounded-xl group active:scale-[0.99]"
                  >
                    <AlertCircle size={24} className="text-red-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-2xl font-black text-red-700 tabular-nums">{analytics.pipelineVatTuDv.withoutPayments}</span>
                    <span className="text-2xs font-bold text-red-700 text-center uppercase tracking-tight mt-1">
                      Chưa Thanh toán
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* SECTION 4: HỢP ĐỒNG FULFILLMENT */}
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-8 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 mb-8 flex items-center gap-2 relative z-10">
              <Handshake size={16} className="text-blue-400" />
              4. Mức độ hoàn thành Hợp Đồng
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
               {/* Total Contracts */}
               <div 
                 onClick={() => setDrilldownMetric('contractPaid')}
                 className="bg-slate-800/80 backdrop-blur border border-slate-700 hover:border-slate-500 hover:bg-slate-800 p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
               >
                 <div>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Tổng Hợp đồng</p>
                   <p className="text-4xl font-black text-white tabular-nums">{analytics.contractFulfillment.total}</p>
                 </div>
                 <Handshake size={48} className="text-slate-600 opacity-50" />
               </div>

               {/* Paid Contracts */}
               <div 
                 onClick={() => setDrilldownMetric('contractPaid')}
                 className="bg-emerald-950/40 backdrop-blur border border-emerald-800/80 hover:border-emerald-500 p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
               >
                 <div>
                   <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider mb-1">Đã Thanh Toán</p>
                   <p className="text-4xl font-black text-emerald-400 tabular-nums">{analytics.contractFulfillment.paid}</p>
                 </div>
                 <CreditCard size={48} className="text-emerald-500 opacity-25" />
               </div>

               {/* Delivered Contracts */}
               <div 
                 onClick={() => setDrilldownMetric('contractDelivered')}
                 className="bg-sky-950/40 backdrop-blur border border-sky-800/80 hover:border-sky-500 p-6 rounded-xl flex items-center justify-between cursor-pointer transition-all active:scale-[0.99]"
               >
                 <div>
                   <p className="text-xs text-sky-400 font-bold uppercase tracking-wider mb-1">Đã Giao Hàng</p>
                   <p className="text-4xl font-black text-sky-400 tabular-nums">{analytics.contractFulfillment.delivered}</p>
                 </div>
                 <Truck size={48} className="text-sky-500 opacity-25" />
               </div>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1400px] mx-auto w-full px-6">
           <section className="bg-slate-50 border border-slate-200/70 p-6 rounded-2xl">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-6 border-b border-slate-200 pb-4">Top 10 Tỉnh/Thành Mở Báo Giá</h3>
             <ul className="space-y-3">
               {analytics.groupings.byProvince.length > 0 ? analytics.groupings.byProvince.map(([province, count], idx) => (
                 <li key={province} className="flex items-center justify-between bg-white px-4 py-3 border border-slate-200 rounded-lg">
                   <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                      <span className="font-semibold text-slate-800">{province}</span>
                   </div>
                   <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs tabular-nums">{count} BG</span>
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
                      <span className="w-6 text-center text-xs font-bold text-slate-400 tabular-nums">#{idx + 1}</span>
                      <span className="font-semibold text-slate-800">{rep}</span>
                   </div>
                   <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs tabular-nums">{count} BG</span>
                 </li>
               )) : <li className="text-sm text-slate-500 italic">{t('empty.noData')}</li>}
             </ul>
           </section>
        </div>
      )}

      {activeTab === 'products' && (
        <ProductAnalyticsTab
          customers={customers}
          quotations={quotations}
          contracts={contracts}
          payments={payments}
          deliveries={deliveries}
          onViewDoc={handleViewDoc}
        />
      )}

      {/* Slide-over Drilldown Cockpit Drawer */}
      <MetricDrilldownDrawer
        isOpen={Boolean(drilldownMetric)}
        onClose={() => setDrilldownMetric(null)}
        metricType={drilldownMetric}
        data={{
          customers,
          quotations,
          contracts,
          payments,
          deliveries
        }}
        onViewDoc={handleViewDoc}
      />

      {/* In-Place Universal Continuum Inspector Drawers */}
      {selectedCustomer && (
        <CustomerDetailDrawer
          isOpen={Boolean(selectedCustomer)}
          onClose={() => setSelectedCustomer(null)}
          customer={selectedCustomer}
          prevCustomer={null}
          nextCustomer={null}
          onNavigatePrev={() => {}}
          onNavigateNext={() => {}}
          onEdit={() => {}}
          onSendZns={(c: Customer) => {
            const rawPhones = [c.sdt, (c as any).sdtPhu, (c as any).soZaloMacDinh, ...((c as any).danhSachSdt || [])].filter(Boolean).join(' ');
            const extracted = extractVietnamesePhones(rawPhones, c.diaChi);
            const targetPhone = c.sdt || extracted.mobilePhones[0]?.cleaned || '';
            setZnsPreviewTarget({
              entityType: 'CUSTOMER',
              entityId: c.id,
              messageType: 'CUSTOMER_PRE_QUOTE',
              documentCode: c.maKh || c.id,
              customerName: c.tenZns || c.tenKhachHang,
              phone: targetPhone,
              payload: {
                ...c,
                customer_name: c.tenZns || c.tenKhachHang,
                tenZns: c.tenZns || c.tenKhachHang,
                ten_zns: c.tenZns || c.tenKhachHang,
                phone: targetPhone,
                sdt: targetPhone,
              },
              availablePhones: extracted.mobilePhones.map((m, idx) => ({
                phone: m.cleaned,
                label: `${m.formatted} (${m.carrier || 'Di động'})`,
                isPrimary: idx === 0
              }))
            });
          }}
          onDeleteCustomer={() => {}}
          modal={true}
        />
      )}

      {selectedQuotation && (
        <QuotationDetailDrawer
          quotation={selectedQuotation}
          onClose={() => setSelectedQuotation(null)}
          customers={customers}
          owners={[]}
          statuses={[]}
          contracts={contracts}
          payments={payments}
          deliveries={deliveries}
          onEdit={() => {}}
          onDelete={async () => {}}
          onUpdate={async () => {}}
          onSendZns={() => {
            const q = selectedQuotation;
            const cust = customers.find(c => c.id === q.customerId);
            const rawPhones = [q.sdt, cust?.sdt, (cust as any)?.sdtPhu, (cust as any)?.soZaloMacDinh].filter(Boolean).join(' ');
            const extracted = extractVietnamesePhones(rawPhones, q.diaChiGiaoHang || cust?.diaChi);
            const targetPhone = q.sdt || extracted.mobilePhones[0]?.cleaned || '';
            setZnsPreviewTarget({
              entityType: 'QUOTATION',
              entityId: q.id,
              messageType: 'BAOGIA',
              documentCode: q.soPhieuBaoGia || q.id,
              customerName: cust?.tenZns || q.tenKhachHang,
              phone: targetPhone,
              payload: {
                ...q,
                customer_name: cust?.tenZns || q.tenKhachHang,
                tenZns: cust?.tenZns || q.tenKhachHang,
                ten_zns: cust?.tenZns || q.tenKhachHang,
                so_phieu_bao_gia: q.soPhieuBaoGia || q.id,
                ngay_bao_gia: formatZnsDate(q.ngayBaoGia || (q as any).createdAt),
                ngay_het_han: formatZnsDate(q.ngayHetHan),
                phone: targetPhone,
                sdt: targetPhone,
              },
              availablePhones: extracted.mobilePhones.map((m, idx) => ({
                phone: m.cleaned,
                label: `${m.formatted} (${m.carrier || 'Di động'})`,
                isPrimary: idx === 0
              }))
            });
          }}
          modal={true}
        />
      )}

      {selectedContract && (
        <ContractDetailDrawer
          drawerContract={selectedContract}
          onClose={() => setSelectedContract(null)}
          payments={payments}
          deliveries={deliveries}
          customers={customers}
          onEdit={() => {}}
          onSendZns={(c: Contract) => {
            const rawPhones = [c.sdt, (c as any).phone].filter(Boolean).join(' ');
            const extracted = extractVietnamesePhones(rawPhones, (c as any).diaChi);
            const targetPhone = c.sdt || extracted.mobilePhones[0]?.cleaned || '';
            setZnsPreviewTarget({
              entityType: 'CONTRACT',
              entityId: c.id,
              messageType: 'HOPDONG_SIGN_ZNS',
              documentCode: c.soHopDong || c.id,
              customerName: (c as any).tenZns || c.tenKhachHang,
              phone: targetPhone,
              payload: {
                ...c,
                customer_name: (c as any).tenZns || c.tenKhachHang,
                tenZns: (c as any).tenZns || c.tenKhachHang,
                ten_zns: (c as any).tenZns || c.tenKhachHang,
                order_code: c.soHopDong || c.soDonHang || c.id,
                So_don_hang: c.soDonHang || c.soHopDong || c.id,
                so_hop_dong: c.soHopDong || c.id,
                ngay_ky: formatZnsDate(c.ngayKy || (c as any).createdAt),
                sign_date: formatZnsDate(c.ngayKy || (c as any).createdAt),
                so_ngay: c.soNgayDuKienHoanThanh || (c as any).thoiGianThucHien || 30,
                phone: targetPhone,
                sdt: targetPhone,
              },
              availablePhones: extracted.mobilePhones.map((m, idx) => ({
                phone: m.cleaned,
                label: `${m.formatted} (${m.carrier || 'Di động'})`,
                isPrimary: idx === 0
              }))
            });
          }}
          modal={true}
        />
      )}

      {selectedPayment && (
        <PaymentDetailDrawer
          isOpen={Boolean(selectedPayment)}
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
          onSendZns={(p: Payment, installmentIndex?: number) => {
            const rawPhones = [p.sdt, (p as any).phone].filter(Boolean).join(' ');
            const extracted = extractVietnamesePhones(rawPhones, (p as any).diaChi);
            const targetPhone = p.sdt || extracted.mobilePhones[0]?.cleaned || '';
            const isFullyPaid = p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || Number(p.congNoConLai || 0) <= 0;
            const messageType = isFullyPaid ? 'THANH_TOAN_TAT_TOAN' : 'THANH_TOAN_CONG_NO';
            
            const enrichedPayload: any = { ...p };
            if (installmentIndex !== undefined && Array.isArray(p.cacDotThu) && p.cacDotThu[installmentIndex]) {
              const inst = p.cacDotThu[installmentIndex];
              enrichedPayload.soTien = inst.soTien || p.soTien;
              enrichedPayload.ngayThanhToan = inst.ngayThu || p.ngayThanhToan;
              enrichedPayload.phuongThucThanhToan = inst.phuongThucThanhToan || p.phuongThucThanhToan;
              if (inst.nguoiNop) enrichedPayload.tenNguoiNop = inst.nguoiNop;
            }

            setZnsPreviewTarget({
              entityType: 'PAYMENT',
              entityId: p.id,
              messageType,
              subtype: messageType,
              documentCode: p.paymentId || (p as any).soPhieuThu || p.id,
              customerName: (p as any).tenZns || p.tenKhachHang,
              phone: targetPhone,
              payload: {
                ...enrichedPayload,
                customer_name: (p as any).tenZns || p.tenKhachHang,
                tenZns: (p as any).tenZns || p.tenKhachHang,
                ten_zns: (p as any).tenZns || p.tenKhachHang,
                order_code: p.soHopDong || p.soDonHang || p.paymentId || p.id,
                so_hop_dong: p.soHopDong || p.soDonHang || '',
                so_don_hang: p.soDonHang || p.soHopDong || '',
                ngay_thanh_toan: formatZnsDate(enrichedPayload.ngayThanhToan),
                time: formatZnsDate(enrichedPayload.ngayThanhToan),
                phone: targetPhone,
                sdt: targetPhone,
              },
              availablePhones: extracted.mobilePhones.map((m, idx) => ({
                phone: m.cleaned,
                label: `${m.formatted} (${m.carrier || 'Di động'})`,
                isPrimary: idx === 0
              })),
              onSuccessCallback: async () => {
                if (installmentIndex !== undefined && Array.isArray(p.cacDotThu) && p.cacDotThu[installmentIndex]) {
                  const updatedCacDotThu = [...p.cacDotThu];
                  updatedCacDotThu[installmentIndex] = {
                    ...updatedCacDotThu[installmentIndex],
                    trangThaiZns: 'THÀNH CÔNG',
                    znsStatus: 'THÀNH CÔNG',
                    znsSentAt: new Date().toISOString(),
                    znsPhone: targetPhone,
                  };
                  try {
                    await repositoryFactory.get('payments').update(p.id!, {
                      cacDotThu: updatedCacDotThu,
                      trangThaiGuiTinThanhToan: 'THÀNH CÔNG',
                    } as any);
                    setSelectedPayment(prev => prev && prev.id === p.id ? { ...prev, cacDotThu: updatedCacDotThu, trangThaiGuiTinThanhToan: 'THÀNH CÔNG' } : prev);
                  } catch (e) {
                    console.error('Failed to update installment ZNS in dashboard:', e);
                  }
                }
              }
            });
          }}
          modal={true}
        />
      )}

      {selectedDelivery && (
        <DeliveryDetailDrawer
          drawerDelivery={selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          onEdit={() => {}}
          onSendZns={(d: Delivery, templateCode: 'GIAOHANG_ZNS' | 'GIAOHANG_HOANTAT' | 'GIAOHANG_BAOHANH' = 'GIAOHANG_ZNS') => {
            const rawPhones = [d.sdt, (d as any).phone].filter(Boolean).join(' ');
            const extracted = extractVietnamesePhones(rawPhones, d.diaChiGiaoHang || (d as any).diaChi);
            const targetPhone = d.sdt || extracted.mobilePhones[0]?.cleaned || '';
            const isWarranty = templateCode === 'GIAOHANG_HOANTAT' || templateCode === 'GIAOHANG_BAOHANH';
            const warrantyInfo = calculateMaxWarrantyExpiryDate(d);

            setZnsPreviewTarget({
              entityType: 'DELIVERY',
              entityId: d.id,
              messageType: templateCode,
              subtype: isWarranty ? 'GIAOHANG_BAOHANH' : 'GIAOHANG_ZNS',
              documentCode: d.deliveryId || d.id,
              customerName: (d as any).tenZns || d.tenKhachHang,
              phone: targetPhone,
              payload: {
                ...d,
                customer_name: (d as any).tenZns || d.tenKhachHang,
                tenZns: (d as any).tenZns || d.tenKhachHang,
                ten_zns: (d as any).tenZns || d.tenKhachHang,
                So_hop_dong: d.soHopDong || '',
                So_don_hang: d.soDonHang || d.soHopDong || '',
                so_phieu_xuat: d.deliveryId || d.id || '',
                ngay_giao_may: formatZnsDate(d.ngayGiaoThucTe || (d as any).ngayGiaoHang),
                danh_sach_ma_may: Array.isArray(d.products) 
                  ? d.products.map((p: any) => p.serialNumber || p.maMay || p.productName).filter(Boolean).join(', ')
                  : '',
                so_luong: String(d.slMay || (Array.isArray(d.products) ? d.products.length : 1)),
                dvt: d.dvt || 'Máy',
                ma_bao_hanh: isWarranty ? warrantyInfo.primarySerial : (d.deliveryId || d.id || 'BH-SGM'),
                product: isWarranty ? warrantyInfo.contractReference : String((d as any).tenMay || (Array.isArray(d.products) && d.products[0]?.productName) || 'Máy cán tôn SGM').slice(0, 30),
                date: isWarranty ? warrantyInfo.expiryDateFormatted : formatZnsDate(d.ngayGiaoThucTe || (d as any).ngayGiaoHang),
                phone: targetPhone,
                sdt: targetPhone,
              },
              availablePhones: extracted.mobilePhones.map((m, idx) => ({
                phone: m.cleaned,
                label: `${m.formatted} (${m.carrier || 'Di động'})`,
                isPrimary: idx === 0
              }))
            });
          }}
          onCancelDelivery={async () => {}}
          drawerContract={selectedDelivery.contractId ? contracts.find(c => c.id === selectedDelivery.contractId) : null}
          drawerQuotation={null}
          modal={true}
        />
      )}

      {znsPreviewTarget && (
        <UniversalZnsPreviewModal
          isOpen={!!znsPreviewTarget}
          onClose={() => setZnsPreviewTarget(null)}
          messageType={znsPreviewTarget.messageType}
          subtype={znsPreviewTarget.subtype}
          entityType={znsPreviewTarget.entityType}
          entityId={znsPreviewTarget.entityId}
          documentCode={znsPreviewTarget.documentCode}
          customerName={znsPreviewTarget.customerName}
          phone={znsPreviewTarget.phone}
          payload={znsPreviewTarget.payload}
          availablePhones={znsPreviewTarget.availablePhones}
          onSuccess={async () => {
            if (znsPreviewTarget.onSuccessCallback) {
              await znsPreviewTarget.onSuccessCallback();
            }
          }}
        />
      )}
    </div>
  );
}
