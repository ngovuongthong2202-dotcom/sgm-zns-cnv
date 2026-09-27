import React from 'react';
import { 
  FileText, 
  FileSignature, 
  Truck, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  Compass
} from 'lucide-react';
import { cleanDocCode } from '@/src/shared/utils/vietnamBusinessDays';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { hasActualCashCollected } from '@/src/domain/enums/payment-status';

export interface HorizonFlowHUDProps {
  currentType: 'quotation' | 'contract' | 'delivery' | 'payment' | 'customer';
  quotation?: any;
  contract?: any;
  deliveries?: any[];
  payments?: any[];
  onOpenFlow?: () => void;
  className?: string;
}

export function HorizonFlowHUD({
  currentType,
  quotation,
  contract,
  deliveries = [],
  payments = [],
  onOpenFlow,
  className = ''
}: HorizonFlowHUDProps) {
  // Determine whether this flow requires a Contract (Machines) or can skip (Retail / Services)
  const isRetail = quotation && normalizeLoai(quotation.loai) !== QUOTATION_LOAI.MAY;
  const isService = quotation && normalizeLoai(quotation.loai) === QUOTATION_LOAI.DICH_VU;
  const isDacCach = Boolean(contract?.dacCachGiaoTruoc || contract?.isPostDeliverySettlement || quotation?.dacCachGiaoTruoc);

  // 1. Stage Quotation
  const hasQuote = Boolean(quotation?.id || quotation?.soPhieuBaoGia);
  const quoteNumber = quotation?.soPhieuBaoGia || '---';

  // 2. Stage Contract
  const hasContract = Boolean(contract?.id || contract?.soHopDong);
  const contractNumber = contract?.soHopDong || '---';

  // 3. Stage Payment (Thu tiền cọc / đợt 1 / tất toán)
  const targetTotal = Number(contract?.totalAmount || contract?.giaTriHopDong || quotation?.totalAmount || 0);
  const totalPaid = (payments || [])
    .filter((p: any) => !p.deletedAt && !p.isDeleted && hasActualCashCollected(p.tinhTrangThanhToan))
    .reduce((sum: number, p: any) => sum + (Number(p.soTien) || 0), 0);
  const isPaidFull = targetTotal > 0 && totalPaid >= targetTotal;
  const isPaidPartial = totalPaid > 0 && totalPaid < targetTotal;
  const hasPayments = payments.length > 0;

  // 4. Stage Delivery / Acceptance (Xuất kho bàn giao hoặc Nghiệm thu dịch vụ)
  const totalContractQty = contract?.slMay || contract?.products?.reduce((s: number, p: any) => s + (Number(p.quantity) || 0), 0) || quotation?.slMay || 1;
  const deliveredQty = (deliveries || []).reduce((acc: number, d: any) => {
    if (d.trangThai === 'DA_GIAO' || d.trangThai === 'HOAN_TAT' || d.ngayGiaoThucTe) {
      return acc + (Number(d.soLuong) || Number(d.slGiao) || d.products?.reduce((ps: number, p: any) => ps + (Number(p.quantity) || 0), 0) || 1);
    }
    return acc;
  }, 0);
  const isDeliveryDone = deliveries.length > 0 && deliveredQty >= totalContractQty;
  const isDeliveryPartial = deliveredQty > 0 && deliveredQty < totalContractQty;
  const hasDeliveries = deliveries.length > 0;

  // Compute Overall Progress & Health Label
  let progressPct = 0;
  let statusSummary = '';

  if (isRetail) {
    let score = 0;
    if (hasQuote) score += 34;
    if (isPaidFull) score += 33; else if (isPaidPartial) score += 15;
    if (isDeliveryDone) score += 33; else if (hasDeliveries) score += 15;
    progressPct = Math.min(100, score);
  } else {
    let score = 0;
    if (hasQuote) score += 25;
    if (hasContract) score += 25;
    if (isPaidFull) score += 25; else if (isPaidPartial) score += 15;
    if (isDeliveryDone) score += 25; else if (hasDeliveries) score += 12;
    progressPct = Math.min(100, score);
  }

  if (progressPct >= 100) {
    statusSummary = 'Giao dịch hoàn tất 100%';
  } else if (isDacCach) {
    statusSummary = '⭐ Đặc cách BGĐ (Giao trước trả sau)';
  } else if (isDeliveryDone && isPaidPartial) {
    statusSummary = 'Đã giao máy - Chờ quyết toán nợ';
  } else if (isPaidFull && !isDeliveryDone) {
    statusSummary = isService ? 'Đã tất toán - Chờ nghiệm thu' : 'Đã tất toán - Chờ xuất xưởng';
  } else if (hasContract && isPaidPartial && !isDeliveryDone) {
    statusSummary = 'Đã cọc - Đang chuẩn bị xuất xưởng';
  } else if (hasContract && !hasPayments) {
    statusSummary = 'Đã ký HĐ - Chờ khách cọc';
  } else if (hasQuote && !hasContract && !isRetail) {
    statusSummary = 'Đang đàm phán hợp đồng';
  } else {
    statusSummary = 'Đang xử lý nghiệp vụ';
  }

  return (
    <div className={`flex items-center justify-between gap-3 text-xs select-none ${className}`}>
      {/* LEFT: Overall Progress & Pulse */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white shadow-2xs font-mono font-bold text-2xs">
          <span className="relative flex h-1.5 w-1.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${progressPct >= 100 ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${progressPct >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} />
          </span>
          <span>{progressPct}%</span>
        </div>
        <span className="text-2xs font-bold text-slate-700 hidden sm:inline-block tracking-tight">
          {statusSummary}
        </span>
      </div>

      {/* CENTER: Micro-Station Pills (Thu trước Giao hàng) */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-0.5 max-w-full">
        {/* 1. Báo Giá */}
        <div 
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-medium transition-colors ${
            hasQuote 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={hasQuote ? `Báo giá: ${quoteNumber}` : 'Chưa có Báo giá'}
        >
          <FileText className="w-3 h-3 text-emerald-600" />
          <span className="font-semibold">BG:</span>
          <span className="font-mono">{hasQuote ? quoteNumber : '---'}</span>
        </div>

        <span className="text-slate-300 font-bold text-2xs select-none">→</span>

        {/* 2. Hợp Đồng (ẩn nếu là Bán lẻ / Dịch vụ không qua HĐ) */}
        {!isRetail && (
          <>
            <div 
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-medium transition-colors ${
                hasContract 
                  ? 'bg-blue-50 text-blue-800 border-blue-200' 
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
              title={hasContract ? `Hợp đồng: ${contractNumber}` : 'Chưa ký Hợp đồng'}
            >
              <FileSignature className="w-3 h-3 text-blue-600" />
              <span className="font-semibold">HĐ:</span>
              <span className="font-mono">{hasContract ? contractNumber : 'Chưa ký'}</span>
            </div>
            <span className="text-slate-300 font-bold text-2xs select-none">→</span>
          </>
        )}

        {/* 3. Thanh Toán (Thu tiền cọc / đợt 1 / thanh toán) */}
        <div 
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-medium transition-colors ${
            isPaidFull 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : isPaidPartial
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={hasPayments ? `Đã thu: ${formatCurrency(totalPaid)} / ${formatCurrency(targetTotal)}` : 'Chưa có phiếu thu'}
        >
          <Wallet className="w-3 h-3 text-emerald-600" />
          <span className="font-semibold">Thu:</span>
          <span className="font-mono">
            {isPaidFull ? 'Tất toán' : isPaidPartial ? `${Math.round((totalPaid / (targetTotal || 1)) * 100)}%` : '0%'}
          </span>
        </div>

        <span className="text-slate-300 font-bold text-2xs select-none">→</span>

        {/* 4. Giao Hàng / Nghiệm Thu */}
        <div 
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-2xs font-medium transition-colors ${
            isDeliveryDone 
              ? 'bg-teal-50 text-teal-800 border-teal-200'
              : isDeliveryPartial
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
          title={hasDeliveries ? `Đã giao: ${deliveredQty}/${totalContractQty} máy` : isService ? 'Chưa nghiệm thu' : 'Chưa giao máy'}
        >
          {isService ? <CheckCircle2 className="w-3 h-3 text-teal-600" /> : <Truck className="w-3 h-3 text-teal-600" />}
          <span className="font-semibold">{isService ? 'N.Thu:' : 'Giao:'}</span>
          <span className="font-mono">
            {hasDeliveries 
              ? (isService ? (isDeliveryDone ? 'Đã NT' : 'Đang NT') : `${deliveredQty}/${totalContractQty}`) 
              : (isService ? 'Chờ NT' : 'Chờ giao')}
          </span>
        </div>
      </div>

      {/* RIGHT: Quick Jump to 360° Flow */}
      {onOpenFlow && (
        <button
          type="button"
          onClick={onOpenFlow}
          className="shrink-0 flex items-center gap-1 text-2xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50/80 hover:bg-blue-100/80 border border-blue-200/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer shadow-2xs group"
          title="Mở tab Dòng Chảy 360° chi tiết"
        >
          <Compass className="w-3.5 h-3.5 text-blue-600 group-hover:rotate-45 transition-transform" />
          <span className="hidden md:inline">Dòng Chảy 360°</span>
          <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}
    </div>
  );
}
