import React, { useEffect, useRef } from 'react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import {
  FileText,
  FileSignature,
  Truck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ExternalLink,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  Coins,
  ChevronRight,
  Check,
  Compass,
  ArrowUpRight
} from 'lucide-react';
import { hasActualCashCollected } from '@/src/domain/enums/payment-status';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';

export interface DocumentOmniFlowRibbonProps {
  currentType: 'quotation' | 'contract' | 'payment' | 'delivery';
  currentDoc?: any;
  quotation?: any;
  contracts?: any[];
  payments?: any[];
  deliveries?: any[];
  relatedQuotations?: any[];
  relatedContracts?: any[];
  relatedPayments?: any[];
  relatedDeliveries?: any[];
  focusTarget?: 'quotation' | 'contract' | 'payment' | 'delivery';
  onCreateContract?: () => void;
  onCreatePayment?: () => void;
  onCreateDelivery?: () => void;
  className?: string;
}

export function DocumentOmniFlowRibbon({
  currentType,
  currentDoc,
  quotation: directQuotation,
  contracts: directContracts,
  payments: directPayments,
  deliveries: directDeliveries,
  relatedQuotations = [],
  relatedContracts = [],
  relatedPayments = [],
  relatedDeliveries = [],
  focusTarget,
  onCreateContract,
  onCreatePayment,
  onCreateDelivery,
  className = '',
}: DocumentOmniFlowRibbonProps) {
  const quotation = directQuotation || (currentType === 'quotation' ? currentDoc : relatedQuotations[0]);
  const contracts = directContracts || (currentType === 'contract' && currentDoc ? [currentDoc] : relatedContracts);
  const payments = directPayments || (currentType === 'payment' && currentDoc ? [currentDoc] : relatedPayments);
  const deliveries = directDeliveries || (currentType === 'delivery' && currentDoc ? [currentDoc] : relatedDeliveries);
  const { openDrawer } = useDrawerStack();

  const quotationRef = useRef<HTMLDivElement>(null);
  const contractRef = useRef<HTMLDivElement>(null);
  const deliveryRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  const primaryContract = contracts[0] || null;
  const primaryQuotation = quotation || null;

  const isRetail = primaryQuotation && normalizeLoai(primaryQuotation.loai) !== QUOTATION_LOAI.MAY;
  const isService = primaryQuotation && normalizeLoai(primaryQuotation.loai) === QUOTATION_LOAI.DICH_VU;

  // Calculate financial totals
  const totalContractVal = primaryContract
    ? primaryContract.totalAmount ||
      primaryContract.giaTriHopDong ||
      primaryContract.tongGiaTri ||
      primaryContract.products?.reduce((s: number, p: any) => s + (p.total || 0), 0) ||
      0
    : primaryQuotation?.totalAmount || primaryQuotation?.tongTien || primaryQuotation?.triGiaBaoGia || 0;

  const totalPaid = payments
    .filter((p: any) => !p.deletedAt && !p.isDeleted && hasActualCashCollected(p.tinhTrangThanhToan))
    .reduce((sum: number, p: any) => sum + (Number(p.soTien) || 0), 0);

  const paymentPct =
    totalContractVal > 0 ? Math.min(100, Math.round((totalPaid / totalContractVal) * 100)) : 0;
  const remainingDebt = Math.max(0, totalContractVal - totalPaid);

  // Calculate delivery totals
  const totalMachineQty = primaryContract
    ? primaryContract.products?.reduce((s: number, p: any) => s + (p.quantity || 0), 0) ||
      primaryContract.slMay ||
      0
    : primaryQuotation?.slMay || 0;

  const deliveredQty = deliveries
    .filter((d: any) => !!d.ngayGiaoThucTe)
    .reduce((sum: number, d: any) => {
      const q =
        d.products?.reduce((s: number, p: any) => s + (p.quantity || 0), 0) ||
        d.slMay ||
        d.danhSachMaMay?.length ||
        0;
      return sum + q;
    }, 0);

  const isDacCachGiaoTruoc =
    primaryContract?.dacCachGiaoTruoc ||
    payments.some((p: any) => p.dacCachGiaoTruoc) ||
    deliveries.some((d: any) => d.dacCachGiaoTruoc);

  // Chrono-Anchor Focus Effect
  useEffect(() => {
    if (!focusTarget) return;

    let targetElement: HTMLDivElement | null = null;
    if (focusTarget === 'quotation') targetElement = quotationRef.current;
    if (focusTarget === 'contract') targetElement = contractRef.current;
    if (focusTarget === 'payment') targetElement = paymentRef.current;
    if (focusTarget === 'delivery') targetElement = deliveryRef.current;

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      const timer = setTimeout(() => {
        targetElement?.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [focusTarget]);

  // Stage Meta Dictionary
  const stages = [
    {
      id: 'quotation',
      title: 'Báo Giá',
      sub: primaryQuotation ? primaryQuotation.soPhieuBaoGia : 'Chưa có',
      icon: <FileText size={13} />,
      isCurrent: currentType === 'quotation',
      isCompleted: !!primaryQuotation,
      color: 'blue'
    },
    ...((!isRetail || primaryContract) ? [{
      id: 'contract',
      title: 'Hợp Đồng',
      sub: primaryContract ? primaryContract.soHopDong : 'Chưa ký',
      icon: <FileSignature size={13} />,
      isCurrent: currentType === 'contract',
      isCompleted: !!primaryContract,
      color: 'emerald'
    }] : []),
    {
      id: 'payment',
      title: 'Thanh Toán',
      sub: `${paymentPct}% (${payments.length} phiếu)`,
      icon: <CreditCard size={13} />,
      isCurrent: currentType === 'payment',
      isCompleted: paymentPct === 100,
      color: 'amber'
    },
    {
      id: 'delivery',
      title: isService ? 'Nghiệm Thu' : 'Giao Hàng',
      sub: isService ? (deliveredQty >= totalMachineQty ? 'Đã nghiệm thu' : 'Chờ') : `${deliveredQty}/${totalMachineQty} máy`,
      icon: <Truck size={13} />,
      isCurrent: currentType === 'delivery',
      isCompleted: totalMachineQty > 0 && deliveredQty >= totalMachineQty,
      color: 'cyan'
    }
  ];

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* 1. CHRONO FLIGHT DECK BREADCRUMB & SOVEREIGN ANCHOR */}
      <div className="bg-white rounded-xl border border-slate-300 p-3.5 shadow-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              HÀNH TRÌNH LIÊN THÔNG GIAO DỊCH 360°
            </h3>
          </div>
          <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
            Trạng thái trực tiếp (Realtime)
          </span>
        </div>

        {/* Dynamic Flight-Deck Stepper */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {stages.map((st, sIdx) => {
            const isLast = sIdx === stages.length - 1;
            return (
              <React.Fragment key={st.id}>
                <div
                  onClick={() => {
                    if (st.id === 'quotation' && primaryQuotation) openDrawer('quotation', primaryQuotation.id);
                    if (st.id === 'contract' && primaryContract) openDrawer('contract', primaryContract.id);
                    if (st.id === 'payment' && payments[0]) openDrawer('payment', payments[0].id);
                    if (st.id === 'delivery' && deliveries[0]) openDrawer('delivery', deliveries[0].id);
                  }}
                  className={`flex-1 min-w-[140px] p-2.5 rounded-lg border transition-all cursor-pointer ${
                    st.isCurrent
                      ? 'bg-blue-50/90 border-blue-500 ring-2 ring-blue-500/20 shadow-xs'
                      : st.isCompleted
                      ? 'bg-slate-50 border-slate-300 hover:border-blue-400'
                      : 'bg-white border-dashed border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-2xs font-extrabold uppercase flex items-center gap-1.5 ${
                      st.isCurrent ? 'text-blue-900' : 'text-slate-800'
                    }`}>
                      {st.icon} {st.title}
                    </span>
                    {st.isCurrent && (
                      <span className="text-3xs font-black bg-blue-600 text-white px-1.5 py-0.2 rounded uppercase">
                        Đang xem
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-2xs font-bold text-slate-800 font-mono">
                    <span className="truncate">{st.sub}</span>
                    {st.isCompleted && <span className="text-emerald-700">✓</span>}
                  </div>
                </div>

                {!isLast && (
                  <ArrowRight size={14} className="text-slate-400 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Đặc cách giao trước banner */}
        {isDacCachGiaoTruoc && (
          <div className="mt-2.5 px-3 py-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs font-semibold text-amber-900">
            <span className="flex items-center gap-1.5">
              <span className="text-amber-700 text-sm">⭐</span>
              <strong>Đơn hàng Đặc Cách Ban Giám Đốc:</strong> Bàn giao máy trước theo cam kết, thực hiện thu hồi tất toán công nợ sau.
            </span>
            <span className="text-amber-800 font-black font-mono bg-white px-2 py-0.5 rounded border border-amber-300 text-2xs">
              ĐÃ PHÊ DUYỆT
            </span>
          </div>
        )}
      </div>

      {/* 2. UPSTREAM HERITAGE CARD (Nguồn gốc giao dịch đối với Hợp đồng, Thanh toán, Giao hàng) */}
      {currentType !== 'quotation' && primaryQuotation && (
        <div className="bg-slate-50 rounded-xl border border-slate-300 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <FileText size={16} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-extrabold uppercase text-slate-700">Báo giá nguồn gốc:</span>
                <span className="font-mono text-xs font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-300">
                  {primaryQuotation.soPhieuBaoGia}
                </span>
                <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Lập: {formatDate(primaryQuotation.ngayBaoGia)}
                </span>
              </div>
              <div className="text-2xs text-slate-700 font-medium mt-1 flex items-center gap-2">
                <span>Trị giá: <strong className="font-currency font-black text-slate-900 tabular-nums">{formatMoney(primaryQuotation.totalAmount)}</strong></span>
                <span>• PIC: <strong className="text-slate-900 font-semibold">{primaryQuotation.nguoiPhuTrach || 'Chưa phân công'}</strong></span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openDrawer('quotation', primaryQuotation.id)}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
          >
            Mở Báo Giá Gốc <ExternalLink size={12} />
          </button>
        </div>
      )}

      {/* 3. HERO FOCUS POD: CHẶNG HỢP ĐỒNG (Nếu đang xem Contract hoặc là đơn máy) */}
      {(primaryContract || currentType === 'contract') && (
        <div
          ref={contractRef}
          className={`bg-white rounded-xl p-4 transition-all duration-300 ${
            currentType === 'contract'
              ? 'border-2 border-emerald-500 shadow-md ring-1 ring-emerald-500/20'
              : 'border border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                <FileSignature size={15} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                  HỢP ĐỒNG KINH TẾ: #{primaryContract?.soHopDong || 'ĐANG SOẠN THẢO'}
                  {currentType === 'contract' && (
                    <span className="text-3xs font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded uppercase">
                      TÂM ĐIỂM CHỨNG TỪ ĐANG XEM
                    </span>
                  )}
                </h4>
              </div>
            </div>
            {primaryContract && currentType !== 'contract' && (
              <button
                type="button"
                onClick={() => openDrawer('contract', primaryContract.id)}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
              >
                Xem chi tiết HĐ <ExternalLink size={12} />
              </button>
            )}
          </div>

          {primaryContract ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs mb-3">
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs uppercase font-bold text-slate-700 block mb-1">Giá trị Hợp Đồng</span>
                  <span className="font-currency font-black text-sm text-slate-900 tabular-nums">
                    {formatMoney(totalContractVal)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs uppercase font-bold text-slate-700 block mb-1">Ngày ký kết</span>
                  <span className="text-xs font-semibold text-slate-800 font-mono">
                    {formatDate(primaryContract.ngayKy)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs uppercase font-bold text-slate-700 block mb-1">Hạn bàn giao máy</span>
                  <span className="text-xs font-bold text-blue-700 font-mono">
                    {formatDate(primaryContract.ngayDuKienHoanThanh || primaryContract.completionDate)}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-2xs uppercase font-bold text-slate-700 block mb-1">Đại diện ký</span>
                  <span className="font-semibold text-slate-900 truncate block">
                    {primaryContract.nguoiDaiDien || primaryContract.tenKhachHang || 'N/A'}
                  </span>
                </div>
              </div>

              {/* Financial Safety Gate Check with Sovereign Exception Protocol */}
              <div className={`p-3 rounded-lg border mb-3 flex items-center justify-between gap-3 text-xs font-semibold ${
                isDacCachGiaoTruoc 
                  ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                  : paymentPct >= 30 
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950' 
                    : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className={isDacCachGiaoTruoc ? 'text-amber-700' : paymentPct >= 30 ? 'text-emerald-700' : 'text-amber-700'} />
                  <span>
                    {isDacCachGiaoTruoc ? (
                      <>
                        ⭐ <strong>ĐẶC CÁCH BAN GIÁM ĐỐC:</strong> Cho phép xuất xưởng & chế tạo máy trước dù cọc mới đạt <strong>{paymentPct}%</strong>.
                      </>
                    ) : (
                      <>
                        Điều kiện sản xuất SGM: Đã thu <strong>{paymentPct}%</strong> (Cần tối thiểu <strong>30% Cọc chế tạo</strong>).
                      </>
                    )}
                  </span>
                </div>
                {paymentPct < 30 && !isDacCachGiaoTruoc && onCreatePayment && (
                  <button
                    type="button"
                    onClick={onCreatePayment}
                    className="text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 px-3 py-1 rounded-md border border-amber-300 transition-colors cursor-pointer"
                  >
                    + Thu Cọc 30% Ngay
                  </button>
                )}
                {isDacCachGiaoTruoc && onCreateDelivery && (
                  <button
                    type="button"
                    onClick={onCreateDelivery}
                    className="text-xs font-bold text-emerald-950 bg-emerald-200 hover:bg-emerald-300 px-3 py-1 rounded-md border border-emerald-300 transition-colors cursor-pointer"
                  >
                    + Cấp Lệnh Xuất Kho
                  </button>
                )}
              </div>

              {/* Serial Chips & Status Reconciliation */}
              {primaryContract.danhSachMaMay && primaryContract.danhSachMaMay.length > 0 && (
                <div className="pt-2.5 border-t border-slate-200 flex items-center gap-2 flex-wrap">
                  <span className="text-2xs font-bold text-slate-700 uppercase">Đối soát Serial máy:</span>
                  {primaryContract.danhSachMaMay.map((serial: string, idx: number) => {
                    const isDelivered = deliveries.some(d => 
                      d.ngayGiaoThucTe && Array.isArray(d.danhSachMaMay) && d.danhSachMaMay.includes(serial)
                    );
                    return (
                      <span
                        key={idx}
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                          isDelivered 
                            ? 'bg-emerald-50 text-emerald-900 border-emerald-300' 
                            : 'bg-amber-50 text-amber-900 border-amber-300'
                        }`}
                      >
                        <span>{isDelivered ? '✓' : '⏳'}</span>
                        <span>#{serial}</span>
                        <span className="text-3xs font-normal">({isDelivered ? 'Đã giao' : 'Chờ xuất'})</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-slate-600 text-xs">
              Đang hoàn thiện nội dung hợp đồng kinh tế.
            </div>
          )}
        </div>
      )}

      {/* 4. HERO FOCUS POD: THANH TOÁN & SỔ CÁI DÒNG TIỀN */}
      <div
        ref={paymentRef}
        className={`bg-white rounded-xl p-4 transition-all duration-300 ${
          currentType === 'payment'
            ? 'border-2 border-amber-500 shadow-md ring-1 ring-amber-500/20'
            : 'border border-slate-300 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs">
              <CreditCard size={15} />
            </div>
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
              SỔ CÁI THANH TOÁN & ĐỢT THU THỰC TẾ ({payments.length} phiếu thu)
              {currentType === 'payment' && (
                <span className="text-3xs font-extrabold bg-amber-600 text-white px-2 py-0.5 rounded uppercase">
                  TÂM ĐIỂM CHỨNG TỪ ĐANG XEM
                </span>
              )}
            </h4>
          </div>
          {onCreatePayment && (
            <button
              type="button"
              onClick={onCreatePayment}
              className="text-xs font-bold text-amber-900 hover:text-amber-950 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-300 transition-colors cursor-pointer shadow-2xs"
            >
              + Ghi Thu Đợt Mới
            </button>
          )}
        </div>

        {/* Financial KPI Ledger Summary */}
        <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xs uppercase font-bold text-slate-700 block mb-1">Tổng Trị Giá Phải Thu</span>
            <span className="font-currency font-black text-sm text-slate-900 tabular-nums">
              {formatMoney(totalContractVal)}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-2xs uppercase font-bold text-emerald-800 block mb-1">Đã Thực Thu ({paymentPct}%)</span>
            <span className="font-currency font-black text-sm text-emerald-900 tabular-nums">
              {formatMoney(totalPaid)}
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-2xs uppercase font-bold text-amber-800 block mb-1">Công Nợ Còn Lại</span>
            <span className="font-currency font-black text-sm text-amber-900 tabular-nums">
              {remainingDebt > 0 ? formatMoney(remainingDebt) : '✓ Đã tất toán'}
            </span>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="py-4 text-center text-slate-500 text-xs font-medium italic">
            Chưa phát sinh phiếu thu nào cho hồ sơ giao dịch này.
          </div>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p: any) => {
              const installments = p.cacDotThu && p.cacDotThu.length > 0 ? p.cacDotThu : null;

              return (
                <div
                  key={p.id}
                  onClick={() => openDrawer('payment', p.id)}
                  className="p-3 bg-slate-50 hover:bg-amber-50/40 rounded-lg border border-slate-300 hover:border-amber-400 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-300">
                        {p.soPhieu || p.paymentId || p.id}
                      </span>
                      <span className="text-3xs font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded uppercase border border-emerald-200">
                        {p.tinhTrangThanhToan || 'Tất toán'}
                      </span>
                      <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {formatDate(p.ngayThanhToan || p.createdAt)}
                      </span>
                    </div>
                    <span className="font-currency font-black text-sm text-slate-900 tabular-nums">
                      {formatMoney(p.soTien)}
                    </span>
                  </div>

                  {/* Multi-installment breakdown table if exists */}
                  {installments && installments.length > 0 ? (
                    <div className="mt-1 bg-white rounded border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
                      {installments.map((dot: any, dIdx: number) => (
                        <div key={dIdx} className="px-2.5 py-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">Đợt {dot.lanThu || dIdx + 1}:</span>
                            <span className="text-slate-700 font-mono">{formatDate(dot.ngayThu)}</span>
                            {dot.phuongThucThanhToan && (
                              <span className="text-slate-600 font-medium">({dot.phuongThucThanhToan})</span>
                            )}
                            {dot.soChungTuThamChieu && (
                              <span className="font-mono text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                                UNC: {dot.soChungTuThamChieu}
                              </span>
                            )}
                          </div>
                          <span className="font-currency font-bold text-emerald-900 tabular-nums">
                            {formatMoney(dot.soTien)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-2xs text-slate-700 font-medium">
                      <span>Người nộp: <strong className="text-slate-900">{p.tenNguoiNop || p.tenKhachHang || 'N/A'}</strong></span>
                      <span>Hình thức: <strong className="text-slate-900">{p.phuongThucThanhToan || 'Chuyển khoản'}</strong></span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. HERO FOCUS POD: GIAO HÀNG & BÀN GIAO MÁY */}
      <div
        ref={deliveryRef}
        className={`bg-white rounded-xl p-4 transition-all duration-300 ${
          currentType === 'delivery'
            ? 'border-2 border-cyan-500 shadow-md ring-1 ring-cyan-500/20'
            : 'border border-slate-300 shadow-2xs'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-100 text-cyan-900 flex items-center justify-center font-bold text-xs">
              <Truck size={15} />
            </div>
            <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
              {isService ? 'LỊCH SỬ NGHIỆM THU DỊCH VỤ' : 'LỊCH SỬ XUẤT KHO & BÀN GIAO THỰC TẾ'} ({deliveries.length} phiếu)
              {currentType === 'delivery' && (
                <span className="text-3xs font-extrabold bg-cyan-600 text-white px-2 py-0.5 rounded uppercase">
                  TÂM ĐIỂM CHỨNG TỪ ĐANG XEM
                </span>
              )}
            </h4>
            {totalMachineQty > 0 && (
              <span className={`text-2xs font-extrabold px-2.5 py-0.5 rounded-full ${
                deliveredQty >= totalMachineQty
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}>
                {deliveredQty >= totalMachineQty 
                  ? (isService ? '✓ Đã nghiệm thu' : '✓ Đã bàn giao đủ máy') 
                  : `Đã giao ${deliveredQty}/${totalMachineQty} máy`}
              </span>
            )}
          </div>
          {onCreateDelivery && (
            <button
              type="button"
              onClick={onCreateDelivery}
              className="text-xs font-bold text-cyan-900 hover:text-cyan-950 bg-cyan-100 px-3 py-1.5 rounded-lg border border-cyan-300 transition-colors cursor-pointer shadow-2xs"
            >
              {isService ? '+ Lập Biên Bản Nghiệm Thu' : '+ Lập Phiếu Xuất Kho'}
            </button>
          )}
        </div>

        {deliveries.length === 0 ? (
          <div className="py-4 text-center text-slate-500 text-xs font-medium italic">
            {isService 
              ? 'Chưa phát sinh biên bản nghiệm thu dịch vụ nào cho hồ sơ này.' 
              : 'Chưa phát sinh phiếu xuất kho hoặc bàn giao máy cho hồ sơ này.'}
          </div>
        ) : (
          <div className="space-y-2.5">
            {deliveries.map((del: any) => {
              const isDelivered = !!del.ngayGiaoThucTe;
              return (
                <div
                  key={del.id}
                  onClick={() => openDrawer('delivery', del.id)}
                  className="p-3 bg-slate-50 hover:bg-cyan-50/40 rounded-lg border border-slate-300 hover:border-cyan-400 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold bg-white text-cyan-900 px-2 py-0.5 rounded border border-cyan-300">
                        {del.soPhieuGiaoHang || del.id}
                      </span>
                      <span
                        className={`text-3xs px-2 py-0.5 rounded font-bold uppercase border ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {isDelivered 
                          ? (isService ? '✓ Đã nghiệm thu' : '✓ Đã bàn giao thực tế') 
                          : (isService ? 'Đang triển khai' : 'Đang xử lý xuất kho')}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      {isDelivered
                        ? `${isService ? 'N.Thu:' : 'Bàn giao:'} ${formatDate(del.ngayGiaoThucTe)}`
                        : `Kế hoạch: ${formatDate(del.ngayGiaoMay)}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-2xs text-slate-700 font-medium">
                    <div>
                      <span className="text-slate-500 font-bold">{isService ? 'Đơn vị thực hiện:' : 'Tài xế / Vận chuyển:'}</span>{' '}
                      <strong className="text-slate-900">{del.tenNguoiGiao || del.donViVanChuyen || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">{isService ? 'Đại diện nghiệm thu:' : 'Người nhận máy:'}</span>{' '}
                      <strong className="text-slate-900">{del.tenNguoiNhan || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Kỹ thuật phụ trách:</span>{' '}
                      <strong className="text-slate-900">{del.kyThuatBanGiao || del.nguoiPhuTrach || 'Đội kỹ thuật SGM'}</strong>
                    </div>
                  </div>

                  {/* Serial chips in delivery */}
                  {del.danhSachMaMay && del.danhSachMaMay.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-slate-200">
                      <span className="text-2xs font-bold text-slate-700 uppercase">Mã máy bàn giao:</span>
                      {del.danhSachMaMay.map((m: string, i: number) => (
                        <span
                          key={i}
                          className="font-mono text-xs font-bold bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-300"
                        >
                          #{m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
