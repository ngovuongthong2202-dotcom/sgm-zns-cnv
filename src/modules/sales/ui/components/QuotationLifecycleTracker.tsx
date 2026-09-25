import React from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { Activity, Clock, AlertCircle, CheckCircle2, TrendingUp, DollarSign, Zap } from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';

interface Props {
  quotation: Quotation;
  contracts?: any[];
  payments?: any[];
}

export function QuotationLifecycleTracker({ quotation, contracts = [], payments = [] }: Props) {
   const znsStatus = normalizeLegacyStatus(quotation.trangThaiGuiTinBaoGia);
   const creationDate = (quotation as any).createdAt ? new Date((quotation as any).createdAt) : new Date();
   const isZnsSent = znsStatus === EntityZnsStatus.THANH_CONG;
   const znsDate = (quotation as any).ngayGuiTinBaoGia ? new Date((quotation as any).ngayGuiTinBaoGia) : null;
   
   const hasContract = contracts.length > 0;
   const hasPayment = payments.length > 0;
   const isBgMay = normalizeLoai(quotation.loai) === QUOTATION_LOAI.MAY;

   const totalPaid = payments.reduce((sum, p) => sum + (Number((p as any).soTien || (p as any).amount) || 0), 0);
   const dealValue = aggregateProducts(quotation.products || []).totalAfterTax;
   const isFullyPaid = dealValue > 0 && totalPaid >= dealValue;

   // 1. Calculate Age / Velocity
   const now = new Date();
   const daysSinceCreation = Math.max(0, differenceInDays(now, creationDate));
   
   const { dealHealth, healthLabel } = (() => {
      if (isFullyPaid) {
         return { dealHealth: 'good', healthLabel: 'Hoàn tất an toàn' };
      }
      if (hasContract) {
         return { dealHealth: 'good', healthLabel: 'Đã chốt - Chờ giao dịch' };
      }
      if (quotation.lifecycleStatus === 'LOST') {
         return { dealHealth: 'bad', healthLabel: 'Khách hàng từ chối' };
      }
      if (daysSinceCreation <= 3) {
         return { dealHealth: 'good', healthLabel: 'Khách hàng mới (Nóng)' };
      }
      if (daysSinceCreation <= 7) {
         return { dealHealth: 'warning', healthLabel: 'Cần Follow-up (Ấm)' };
      }
      return { dealHealth: 'bad', healthLabel: `Đã ngâm ${daysSinceCreation} ngày (Lạnh)` };
   })();

   // 2. Velocity ZNS
   const { znsVelocityLabel, znsVelocityIcon } = (() => {
      if (znsDate) {
         const znsHours = Math.max(0, differenceInHours(znsDate, creationDate));
         if (znsHours < 2) {
            return {
               znsVelocityLabel: 'Gửi ngay lập tức (<2h)',
               znsVelocityIcon: <Zap size={14} className="text-amber-500" />
            };
         }
         if (znsHours <= 24) {
            return {
               znsVelocityLabel: `Gửi trong ngày (${znsHours}h)`,
               znsVelocityIcon: <CheckCircle2 size={14} className="text-emerald-500" />
            };
         }
         return {
            znsVelocityLabel: `Độ trễ ZNS: ${Math.floor(znsHours/24)} ngày`,
            znsVelocityIcon: <AlertCircle size={14} className="text-red-500" />
         };
      }
      if (znsStatus === EntityZnsStatus.CHUA_GUI || !znsStatus) {
         return {
            znsVelocityLabel: 'ZNS chưa được kích hoạt',
            znsVelocityIcon: <Clock size={14} className="text-slate-400" />
         };
      }
      if (znsStatus === EntityZnsStatus.THAT_BAI) {
         return {
            znsVelocityLabel: `Tình trạng ZNS: ${znsStatus}`,
            znsVelocityIcon: <AlertCircle size={14} className="text-red-500" />
         };
      }
      return {
         znsVelocityLabel: `Tình trạng ZNS: ${znsStatus}`,
         znsVelocityIcon: <Clock size={14} className="text-slate-400" />
      };
   })();

   const healthBg = {
      'good': 'bg-emerald-50 text-emerald-700 ring-emerald-500/20',
      'warning': 'bg-amber-50 text-amber-700 ring-amber-500/20',
      'bad': 'bg-slate-100 text-slate-700 ring-slate-500/20' // If lost or cold, use slate instead of glaring red
   }[dealHealth as 'good' | 'warning' | 'bad'];

   return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
         <div className="flex items-center justify-between mb-5">
            <h4 className="flex items-center gap-2 text-2xs font-bold text-slate-500 uppercase tracking-widest">
               <Activity size={14} className="text-blue-500" />
               Phân tích Giao dịch
            </h4>
            <span className={`px-2 py-0.5 rounded-full text-2xs font-bold tracking-wide ring-1 ring-inset ${healthBg}`}>
               {healthLabel}
            </span>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tốc độ chốt đơn */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
               <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
                  <TrendingUp size={14} />
                  Tốc độ chốt đơn
               </div>
               <div className="text-lg font-bold text-slate-800 drop-shadow-sm">
                  {isBgMay ? (hasContract ? 'Đã thành HĐ' : `${daysSinceCreation} ngày`) : (hasPayment ? 'Đã thu tiền' : `${daysSinceCreation} ngày`)}
               </div>
               <div className="text-2xs text-slate-500 font-mono mt-1">
                  Tuổi báo giá kể từ {format(creationDate, 'dd/MM/yyyy')}
               </div>
            </div>

            {/* Chỉ số Tương tác ZNS */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
               <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
                  <span className={isZnsSent ? 'text-emerald-500' : 'text-slate-400'}>ZNS</span>
                  Phản hồi ZNS
               </div>
               <div className="text-lg font-bold text-slate-800 drop-shadow-sm truncate">
                  {znsVelocityLabel}
               </div>
               <div className="flex items-center gap-1 text-2xs text-slate-500 font-mono mt-1">
                  {znsVelocityIcon}
                  <span>{znsStatus || 'CHƯA_GỬI'}</span>
               </div>
            </div>

            {/* Giá trị & Thanh toán */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
               <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
                  <DollarSign size={14} className={totalPaid > 0 ? 'text-emerald-500' : 'text-slate-400'} />
                  Giá trị & Thanh toán
               </div>
               <div className="text-lg font-bold text-slate-800 drop-shadow-sm">
                  {formatCurrency(dealValue)}
               </div>
               <div className="text-2xs text-slate-500 font-mono mt-1">
                  Đã thu: <span className="font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
               </div>
            </div>
         </div>

         {/* Won/Lost Contexts (fallback if previously saved) */}
         {quotation.lifecycleStatus === 'LOST' && quotation.lostReason && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100 text-sm flex gap-2">
               <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
               <div>
                  <span className="font-bold text-red-700 block text-2xs uppercase tracking-wide">Nguyên nhân thất bại:</span>
                  <span className="text-red-900 mt-0.5 block">{quotation.lostReason}</span>
               </div>
            </div>
         )}
         {quotation.lifecycleStatus === 'WON' && quotation.wonReason && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-sm flex gap-2">
               <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
               <div>
                  <span className="font-bold text-emerald-700 block text-2xs uppercase tracking-wide">Nhật ký chốt Deal:</span>
                  <span className="text-emerald-950 mt-0.5 block">{quotation.wonReason}</span>
               </div>
            </div>
         )}
      </div>
   );
}
