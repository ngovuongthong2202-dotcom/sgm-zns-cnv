import React from 'react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { CustomerHoverCard } from '@/src/modules/customers';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';
import { QuotationLifecycleTracker } from './QuotationLifecycleTracker';
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';
import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';
import { checkQuotationLock } from '@/src/domain/policy/lock.policy';
import { User } from 'lucide-react';
import { SearchableSelect } from '@/src/design-system/primitives/SearchableSelect';

interface QuotationDetailOverviewProps {
  quotation: Quotation;
  customer?: Customer;
  matchingContracts: any[];
  matchingPayments: any[];
  matchingDeliveries: any[];
  owners: string[];
  totalValue: number;
  handleOwnerChange: (newOwner: string) => Promise<void>;
}

export function QuotationDetailOverview({
  quotation,
  customer,
  matchingContracts,
  matchingPayments,
  matchingDeliveries,
  owners,
  totalValue,
  handleOwnerChange
}: QuotationDetailOverviewProps) {
  const lockResult = checkQuotationLock(quotation, matchingContracts, matchingPayments, matchingDeliveries);

  return (
    <div className="flex flex-col gap-6 pb-6 pt-2">
      <QuotationLifecycleTracker 
         quotation={quotation} 
         contracts={matchingContracts}
         payments={matchingPayments}
      />
      <WorkflowTimeline 
         quotation={quotation} 
         contracts={matchingContracts} 
         payments={matchingPayments} 
         deliveries={matchingDeliveries} 
      />
      <EntityBusinessLockWarning {...lockResult} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side Info Card */}
        <div className="lg:col-span-8 space-y-6">
          <section className="bg-white p-6 border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
            <div className="flex items-start justify-between mb-6">
              <div className="min-w-0 flex-1">
                {customer ? (
                  <CustomerHoverCard customer={customer}>
                    <div className="p-4 bg-white border border-slate-150 hover:border-blue-400 transition-colors rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)] group cursor-pointer text-left">
                      <div className="text-2xs text-slate-500 mb-1.5 uppercase font-bold tracking-widest flex items-center justify-between">
                        <span>Tham chiếu khách hàng</span>
                        <span className="text-3xs text-blue-600 lowercase font-medium group-hover:underline">Di chuột xem chi tiết</span>
                      </div>
                      <div className="font-bold text-slate-900 text-sm md:text-base leading-snug truncate max-w-lg" title={customer.tenKhachHang}>
                        {customer.tenKhachHang}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {customer.sdt && <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">{customer.sdt}</span>}
                        <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          {quotation.loai || 'Chưa phân loại'}
                        </span>
                      </div>
                    </div>
                  </CustomerHoverCard>
                ) : (
                  <div>
                    <div className="text-2xs text-slate-600 uppercase font-black tracking-widest flex items-center gap-1 mb-1.5">
                      <User size={12} className="text-blue-600" /> Pháp nhân khách hàng
                    </div>
                    <div className="text-slate-900 font-bold text-base md:text-lg truncate max-w-lg" title={quotation.tenKhachHang}>
                      {quotation.tenKhachHang || 'N/A'}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        {quotation.loai || 'Chưa phân loại'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="text-right flex-shrink-0 ml-4 bg-slate-50 border border-slate-200/60 p-3 rounded-xl min-w-[130px] self-start">
                <div className="text-3xs text-slate-600 uppercase font-black tracking-widest mb-1">Giá trị báo giá</div>
                <div className="font-mono text-slate-900 font-black text-lg leading-none tabular-nums">
                  {new Intl.NumberFormat('vi-VN').format(totalValue)} ₫
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-5 border-t border-slate-100 font-semibold text-xs text-slate-707">
              <div>
                <div className="text-2xs text-slate-600 mb-1.5 uppercase font-black tracking-widest">
                  MÃ CHỨNG TỪ
                </div>
                <div className="text-slate-900 font-bold font-mono text-sm">{quotation.soPhieuBaoGia}</div>
              </div>
              <div>
                <div className="text-2xs text-slate-600 mb-1.5 uppercase font-black tracking-widest">
                  NGÀY LẬP BG
                </div>
                <div className="text-slate-900 font-bold font-mono">{formatDate(quotation.ngayBaoGia)}</div>
              </div>
              <div>
                <div className="text-2xs text-slate-600 mb-1.5 uppercase font-black tracking-widest">
                  HẾT HIỆU LỰC
                </div>
                <div className="text-orange-700 font-black font-mono bg-orange-50 border border-orange-100 w-fit px-1.5 py-0.5 rounded">
                  {formatDate(quotation.ngayHetHan)}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right CRM Side Column */}
        <div className="lg:col-span-4 space-y-4">
          <section className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.02)] p-5">
            <label className="text-2xs text-slate-600 uppercase font-black tracking-widest block mb-2">Người phụ trách</label>
            <div className="relative z-20">
              <SearchableSelect 
                value={quotation.nguoiPhuTrach || ''}
                onChange={handleOwnerChange}
                options={owners.map(o => ({ value: o, label: o }))}
                placeholder="-- Chưa chia --"
              />
            </div>
            {!quotation.nguoiPhuTrach && (
              <p className="text-2xs text-orange-700 mt-2 font-bold flex items-center bg-orange-500/5 p-2 rounded-lg border border-orange-200/30 leading-snug">
                Báo giá chưa được gán PIC phụ trách. Vui lòng phân người thực hiện.
              </p>
            )}
          </section>

          {quotation.noiDungGhiChu && (
            <section className="bg-amber-500/5 border border-amber-250/30 p-5 rounded-xl text-xs font-semibold leading-relaxed">
              <h3 className="text-2xs font-black text-amber-800 mb-2 uppercase tracking-widest border-b border-amber-200/30 pb-1">Ghi chú nội bộ / Phụ lục</h3>
              <p className="text-slate-700 whitespace-pre-wrap font-medium">{quotation.noiDungGhiChu}</p>
            </section>
          )}
        </div>
      </div>

      {/* Embedded Products list directly inside overview tab */}
      <div className="pt-2">
        <section className="border border-slate-200 rounded-2xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] bg-white overflow-hidden">
          <div className="flex items-center justify-between w-full mb-4">
             <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800">DANH MỤC SẢN PHẨM / THIẾT BỊ ĐÃ LẬP</h3>
             <span className="font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-200 tabular-nums text-2xs font-bold">{quotation.products?.reduce((acc, p) => acc + (p.quantity || 1), 0) || 0} Sản phẩm</span>
          </div>
          
          <DrawerProductList 
             products={quotation.products || []}
             subTotal={quotation.subTotal}
             discountRate={quotation.discountRate}
             discountAmount={quotation.discountAmount}
             vatRate={quotation.vatRate}
             vatAmount={quotation.vatAmount}
             totalAmount={quotation.totalAmount}
             deliveredQuantities={quotation.loai !== 'BG Máy' ? quotation.deliveredQuantities : undefined}
             accentColorClass="text-blue-700"
          />
        </section>
      </div>
    </div>
  );
}
