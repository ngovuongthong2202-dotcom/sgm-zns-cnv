import React, { useMemo } from 'react';
import { FileText, FileSignature, Wallet, Truck, ArrowRight, CheckCircle2, AlertTriangle, ExternalLink, Sparkles } from 'lucide-react';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import { cleanDocCode } from '@/src/shared/utils/vietnamBusinessDays';
import { formatDate } from '@/src/shared/utils/formatDate';

export interface DrawerHeaderCockpitHUDProps {
  currentType: 'quotation' | 'contract' | 'payment' | 'delivery';
  quotation?: any | null;
  contracts?: any[];
  payments?: any[];
  deliveries?: any[];
  onOpenRelatedDoc?: (type: 'quotation' | 'contract' | 'payment' | 'delivery', doc: any) => void;
  className?: string;
}

export function DrawerHeaderCockpitHUD({
  currentType,
  quotation,
  contracts = [],
  payments = [],
  deliveries = [],
  onOpenRelatedDoc,
  className = ''
}: DrawerHeaderCockpitHUDProps) {
  const { openDrawer } = useDrawerStack();

  // 1. Phân giải liên kết dòng chảy (Sovereign Lineage Match)
  const qId = cleanDocCode(quotation?.id);
  const qSo = cleanDocCode(quotation?.soPhieuBaoGia);

  const matchedContract = useMemo(() => {
    if (contracts.length === 1) return contracts[0];
    return contracts.find(c => {
      const cQId = cleanDocCode(c.quotationId);
      const cQSo = cleanDocCode(c.soPhieuBaoGia);
      return (qId && cQId && qId === cQId) || (qSo && cQSo && qSo === cQSo);
    }) || contracts[0] || null;
  }, [contracts, qId, qSo]);

  const matchedPayments = useMemo(() => {
    const cId = cleanDocCode(matchedContract?.id);
    const cSo = cleanDocCode(matchedContract?.soHopDong);
    return payments.filter(p => {
      const pCId = cleanDocCode(p.contractId);
      const pCSo = cleanDocCode(p.soHopDong);
      const pQId = cleanDocCode(p.quotationId);
      const pQSo = cleanDocCode(p.soPhieuBaoGia);
      if (cId && pCId && cId === pCId) return true;
      if (cSo && pCSo && cSo === pCSo) return true;
      if (qId && pQId && qId === pQId) return true;
      if (qSo && pQSo && qSo === pQSo) return true;
      return false;
    });
  }, [payments, matchedContract, qId, qSo]);

  const matchedDeliveries = useMemo(() => {
    const cId = cleanDocCode(matchedContract?.id);
    const cSo = cleanDocCode(matchedContract?.soHopDong);
    return deliveries.filter(d => {
      const dCId = cleanDocCode(d.contractId);
      const dCSo = cleanDocCode(d.soHopDong);
      const dQId = cleanDocCode(d.quotationId);
      const dQSo = cleanDocCode(d.soPhieuBaoGia);
      if (cId && dCId && cId === dCId) return true;
      if (cSo && dCSo && cSo === dCSo) return true;
      if (qId && dQId && qId === dQId) return true;
      if (qSo && dQSo && qSo === dQSo) return true;
      return false;
    });
  }, [deliveries, matchedContract, qId, qSo]);

  // 2. Tính toán tài chính nhanh
  const contractTotal = Number(matchedContract?.totalAmount || quotation?.totalAmount || 0);
  const totalPaid = matchedPayments.reduce((acc, p) => acc + (Number(p.soTien) || 0), 0);
  const paidRatio = contractTotal > 0 ? (totalPaid / contractTotal) * 100 : 0;
  const is30PercentSecured = paidRatio >= 29.5 || matchedPayments.some(p => p.tinhTrangThanhToan?.includes('Tất toán'));
  const isExempted = Boolean(matchedContract?.dacCachGiaoTruoc || matchedDeliveries.some(d => d.dacCachGiaoTruoc));

  // Handler mở drawer
  const handleSelectDoc = (type: 'quotation' | 'contract' | 'payment' | 'delivery', doc: any) => {
    if (!doc) return;
    if (onOpenRelatedDoc) {
      onOpenRelatedDoc(type, doc);
    } else {
      openDrawer(type, doc);
    }
  };

  return (
    <div className={`bg-slate-950 text-slate-100 border-b border-slate-800 px-4 py-2 shrink-0 select-none shadow-inner ${className}`}>
      <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-hide text-xs">
        
        {/* CHẶNG 1: BÁO GIÁ */}
        <div 
          onClick={() => quotation && handleSelectDoc('quotation', quotation)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            currentType === 'quotation'
              ? 'bg-blue-950/80 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/50'
              : quotation
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'bg-slate-900/50 border-slate-800/50 text-slate-600 cursor-not-allowed'
          }`}
          title={quotation ? `Báo giá: ${quotation.soPhieuBaoGia || 'Đã có'}` : 'Chưa có Báo giá gốc'}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center ${currentType === 'quotation' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <FileText size={12} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-3xs uppercase font-extrabold text-slate-400">1. BÁO GIÁ</span>
              {currentType === 'quotation' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              )}
            </div>
            <span className="font-mono text-2xs font-bold truncate max-w-[110px]">
              {quotation?.soPhieuBaoGia || 'BG Gốc'}
            </span>
          </div>
        </div>

        <ArrowRight size={12} className="text-slate-600 shrink-0" />

        {/* CHẶNG 2: HỢP ĐỒNG */}
        <div 
          onClick={() => matchedContract && handleSelectDoc('contract', matchedContract)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            currentType === 'contract'
              ? 'bg-blue-950/80 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/50'
              : matchedContract
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'bg-slate-900/50 border-slate-800/50 text-slate-600 cursor-not-allowed'
          }`}
          title={matchedContract ? `Hợp đồng: ${matchedContract.soHopDong}` : 'Chưa lập Hợp đồng'}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center ${currentType === 'contract' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            <FileSignature size={12} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-3xs uppercase font-extrabold text-slate-400">2. HỢP ĐỒNG</span>
              {currentType === 'contract' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              )}
            </div>
            <span className="font-mono text-2xs font-bold truncate max-w-[110px]">
              {matchedContract?.soHopDong || 'Chưa lập'}
            </span>
          </div>
        </div>

        <ArrowRight size={12} className="text-slate-600 shrink-0" />

        {/* CHẶNG 3: THANH TOÁN (FINANCIAL GATEWAY) */}
        <div 
          onClick={() => matchedPayments[0] && handleSelectDoc('payment', matchedPayments[0])}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            currentType === 'payment'
              ? 'bg-blue-950/80 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/50'
              : matchedPayments.length > 0
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'bg-slate-900/50 border-slate-800/50 text-slate-600 cursor-not-allowed'
          }`}
          title={matchedPayments.length > 0 ? `Đã thu: ${new Intl.NumberFormat('vi-VN').format(totalPaid)}đ (${paidRatio.toFixed(0)}%)` : 'Chưa ghi thu'}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center ${
            is30PercentSecured ? 'bg-emerald-600 text-white' : isExempted ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            <Wallet size={12} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-3xs uppercase font-extrabold text-slate-400">3. DÒNG TIỀN</span>
              <span className={`text-3xs font-black px-1 rounded ${
                is30PercentSecured ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : isExempted ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-400'
              }`}>
                {paidRatio.toFixed(0)}%
              </span>
              {currentType === 'payment' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              )}
            </div>
            <span className="font-mono text-2xs font-bold truncate max-w-[120px]">
              {totalPaid > 0 ? `${new Intl.NumberFormat('vi-VN').format(totalPaid)} đ` : 'Chưa thu cọc'}
            </span>
          </div>
        </div>

        <ArrowRight size={12} className="text-slate-600 shrink-0" />

        {/* CHẶNG 4: GIAO HÀNG / BÀN GIAO */}
        <div 
          onClick={() => matchedDeliveries[0] && handleSelectDoc('delivery', matchedDeliveries[0])}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
            currentType === 'delivery'
              ? 'bg-blue-950/80 border-blue-500 text-white shadow-xs ring-1 ring-blue-500/50'
              : matchedDeliveries.length > 0
                ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                : 'bg-slate-900/50 border-slate-800/50 text-slate-600 cursor-not-allowed'
          }`}
          title={matchedDeliveries[0] ? `Lệnh giao: ${matchedDeliveries[0].deliveryId || 'PGH'}` : 'Chưa lập PGH'}
        >
          <div className={`w-5 h-5 rounded flex items-center justify-center ${
            matchedDeliveries.some(d => d.ngayGiaoThucTe) ? 'bg-cyan-600 text-white' : matchedDeliveries.length > 0 ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            <Truck size={12} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-3xs uppercase font-extrabold text-slate-400">4. GIAO NHẬN</span>
              {matchedDeliveries.some(d => d.ngayGiaoThucTe) && (
                <CheckCircle2 size={10} className="text-emerald-400" />
              )}
              {currentType === 'delivery' && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
              )}
            </div>
            <span className="font-mono text-2xs font-bold truncate max-w-[110px]">
              {matchedDeliveries[0]?.deliveryId || (matchedDeliveries.length > 0 ? 'Đã lập PGH' : 'Chờ xuất xưởng')}
            </span>
          </div>
        </div>

        {/* HUY HIỆU ĐẶC CÁCH HOẶC AN TOÀN TÀI CHÍNH */}
        {isExempted ? (
          <div className="ml-auto hidden xl:flex items-center gap-1.5 bg-amber-950/90 text-amber-200 border border-amber-700/80 px-2.5 py-1 rounded text-3xs font-black uppercase tracking-wider shrink-0 shadow-xs">
            <Sparkles size={11} className="text-amber-400 animate-spin" />
            <span>ĐẶC CÁCH BAN GIÁM ĐỐC</span>
          </div>
        ) : is30PercentSecured ? (
          <div className="ml-auto hidden xl:flex items-center gap-1.5 bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded text-3xs font-black uppercase tracking-wider shrink-0">
            <CheckCircle2 size={11} className="text-emerald-400" />
            <span>ĐỦ ĐIỀU KIỆN SẢN XUẤT (≥30%)</span>
          </div>
        ) : (
          <div className="ml-auto hidden xl:flex items-center gap-1.5 bg-slate-900 text-amber-400 border border-slate-800 px-2.5 py-1 rounded text-3xs font-bold shrink-0">
            <AlertTriangle size={11} className="text-amber-400" />
            <span>CHƯA ĐỦ CỌC 30% SẢN XUẤT</span>
          </div>
        )}

      </div>
    </div>
  );
}
