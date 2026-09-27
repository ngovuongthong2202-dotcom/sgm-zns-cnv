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
} from 'lucide-react';

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

  // Calculate financial totals
  const totalContractVal = primaryContract
    ? primaryContract.totalAmount ||
      primaryContract.products?.reduce((s: number, p: any) => s + (p.total || 0), 0) ||
      0
    : primaryQuotation?.totalAmount || 0;

  const totalPaid = payments
    .filter((p: any) => !p.deletedAt && !p.isDeleted && p.tinhTrangThanhToan !== 'HỦY')
    .reduce((sum: number, p: any) => sum + (Number(p.soTien) || 0), 0);

  const paymentPct =
    totalContractVal > 0 ? Math.min(100, Math.round((totalPaid / totalContractVal) * 100)) : 0;

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
    if (focusTarget === 'delivery') targetElement = deliveryRef.current;
    if (focusTarget === 'payment') targetElement = paymentRef.current;

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetElement.classList.add('ring-2', 'ring-blue-500', 'ring-offset-2');
      const timer = setTimeout(() => {
        targetElement?.classList.remove('ring-2', 'ring-blue-500', 'ring-offset-2');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [focusTarget]);

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* 1. EXECUTIVE MILESTONES RIBBON */}
      <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <h3 className="text-2xs font-bold uppercase tracking-wider text-slate-700">
              Dòng Chảy Nghiệp Vụ Liên Thông 360°
            </h3>
          </div>
          <span className="text-3xs font-medium text-slate-400">
            Cập nhật thời gian thực theo sự kiện
          </span>
        </div>

        {/* 4 Chặng Tiến Trình */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Chặng 1: Báo giá */}
          <div
            onClick={() => primaryQuotation && openDrawer('quotation', primaryQuotation.id)}
            className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors cursor-pointer ${
              currentType === 'quotation'
                ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/30'
                : primaryQuotation
                ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                : 'bg-slate-50/40 border-dashed border-slate-200 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between text-3xs font-bold">
              <span className="flex items-center gap-1 text-blue-700">
                <FileText size={12} /> BÁO GIÁ
              </span>
              {primaryQuotation && (
                <span className="font-mono text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  {primaryQuotation.soPhieuBaoGia}
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className="font-currency font-black text-xs text-slate-900 tabular-nums">
                {primaryQuotation ? formatMoney(primaryQuotation.totalAmount) : 'Chưa có'}
              </div>
              <div className="text-3xs text-slate-500 font-medium mt-0.5 truncate">
                {primaryQuotation?.ngayBaoGia
                  ? `Lập: ${formatDate(primaryQuotation.ngayBaoGia)}`
                  : 'N/A'}
              </div>
            </div>
          </div>

          {/* Chặng 2: Hợp đồng */}
          <div
            onClick={() => primaryContract && openDrawer('contract', primaryContract.id)}
            className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors cursor-pointer ${
              currentType === 'contract'
                ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/30'
                : primaryContract
                ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                : 'bg-slate-50/40 border-dashed border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-3xs font-bold">
              <span className="flex items-center gap-1 text-emerald-700">
                <FileSignature size={12} /> HỢP ĐỒNG
              </span>
              {primaryContract && (
                <span className="font-mono text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  {primaryContract.soHopDong}
                </span>
              )}
            </div>
            <div className="mt-2">
              <div className="font-currency font-black text-xs text-slate-900 tabular-nums">
                {primaryContract ? formatMoney(totalContractVal) : 'Chưa ký HĐ'}
              </div>
              <div className="text-3xs text-slate-500 font-medium mt-0.5 truncate">
                {primaryContract?.ngayKy ? `Ký: ${formatDate(primaryContract.ngayKy)}` : 'Đang đàm phán'}
              </div>
              {onCreateContract && !primaryContract && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateContract();
                  }}
                  className="mt-1.5 w-full py-0.5 px-1.5 text-3xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors flex items-center justify-center gap-1 border-0 cursor-pointer shadow-2xs"
                >
                  + Tạo Hợp Đồng
                </button>
              )}
            </div>
          </div>

          {/* Chặng 3: Giao hàng */}
          <div
            onClick={() => deliveries.length > 0 && openDrawer('delivery', deliveries[0].id)}
            className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors cursor-pointer ${
              currentType === 'delivery'
                ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/30'
                : deliveries.length > 0
                ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                : 'bg-slate-50/40 border-dashed border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-3xs font-bold">
              <span className="flex items-center gap-1 text-cyan-700">
                <Truck size={12} /> GIAO HÀNG
              </span>
              <span className="font-mono text-cyan-800 bg-cyan-50 px-1.5 py-0.2 rounded border border-cyan-200">
                {deliveries.length} phiếu
              </span>
            </div>
            <div className="mt-2">
              <div className="font-mono font-bold text-xs text-slate-900">
                Đã giao: {deliveredQty}/{totalMachineQty} máy
              </div>
              <div className="text-3xs text-slate-500 font-medium mt-0.5 truncate">
                {deliveries.length > 0
                  ? deliveries[0].ngayGiaoThucTe
                    ? `Bàn giao: ${formatDate(deliveries[0].ngayGiaoThucTe)}`
                    : `Dự kiến: ${formatDate(deliveries[0].ngayGiaoMay)}`
                  : 'Chưa xuất kho'}
              </div>
              {onCreateDelivery && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateDelivery();
                  }}
                  className="mt-1.5 w-full py-0.5 px-1.5 text-3xs font-bold text-cyan-850 bg-cyan-100/90 hover:bg-cyan-200/90 rounded transition-colors flex items-center justify-center gap-1 border-0 cursor-pointer"
                >
                  + Xuất kho
                </button>
              )}
            </div>
          </div>

          {/* Chặng 4: Thanh toán */}
          <div
            onClick={() => payments.length > 0 && openDrawer('payment', payments[0].id)}
            className={`p-2.5 rounded-lg border flex flex-col justify-between transition-colors cursor-pointer ${
              currentType === 'payment'
                ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/30'
                : payments.length > 0
                ? 'bg-slate-50/70 border-slate-200 hover:border-blue-300'
                : 'bg-slate-50/40 border-dashed border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between text-3xs font-bold">
              <span className="flex items-center gap-1 text-amber-700">
                <CreditCard size={12} /> THANH TOÁN
              </span>
              <span className="font-mono text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                {paymentPct}%
              </span>
            </div>
            <div className="mt-2">
              <div className="font-currency font-black text-xs text-slate-900 tabular-nums">
                Đã thu: {formatMoney(totalPaid)}
              </div>
              <div className="text-3xs text-slate-500 font-currency mt-0.5 truncate">
                {totalContractVal - totalPaid > 0
                  ? `Còn nợ: ${formatMoney(totalContractVal - totalPaid)}`
                  : '✓ Tất toán 100%'}
              </div>
              {onCreatePayment && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreatePayment();
                  }}
                  className="mt-1.5 w-full py-0.5 px-1.5 text-3xs font-bold text-amber-900 bg-amber-100/90 hover:bg-amber-200/90 rounded transition-colors flex items-center justify-center gap-1 border-0 cursor-pointer"
                >
                  + Thu tiền
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Đặc cách giao trước banner */}
        {isDacCachGiaoTruoc && (
          <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-3xs font-medium text-amber-900">
            <span className="flex items-center gap-1.5">
              <span>⭐</span>
              <strong>Đơn hàng Đặc Cách:</strong> Bàn giao máy trước theo cam kết Hợp Đồng, thanh toán tất toán sau.
            </span>
            <span className="text-amber-800 font-bold font-mono">Đã kích hoạt</span>
          </div>
        )}
      </div>

      {/* 2. CHẶNG CHI TIẾT: HỢP ĐỒNG (NẾU CÓ) */}
      {primaryContract && (
        <div
          ref={contractRef}
          className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs transition-all duration-300"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                <FileSignature size={14} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-2">
                  HỢP ĐỒNG KINH TẾ: #{primaryContract.soHopDong}
                  {primaryContract.soDonHang && (
                    <span className="font-mono text-3xs bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded">
                      ĐH: #{primaryContract.soDonHang}
                    </span>
                  )}
                </h4>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openDrawer('contract', primaryContract.id)}
              className="text-3xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors border-0 cursor-pointer"
            >
              Xem chi tiết HĐ <ExternalLink size={11} />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-2xs mb-3">
            <div className="p-2 bg-slate-50/80 rounded border border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Giá trị HĐ</span>
              <span className="font-currency font-black text-xs text-slate-900 tabular-nums">
                {formatMoney(totalContractVal)}
              </span>
            </div>
            <div className="p-2 bg-slate-50/80 rounded border border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Ngày ký kết</span>
              <span className="font-mono font-bold text-slate-800">
                {formatDate(primaryContract.ngayKy)}
              </span>
            </div>
            <div className="p-2 bg-slate-50/80 rounded border border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Hạn cam kết</span>
              <span className="font-mono font-bold text-blue-700">
                {formatDate(primaryContract.ngayDuKienHoanThanh || primaryContract.completionDate)}
              </span>
            </div>
            <div className="p-2 bg-slate-50/80 rounded border border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Đại diện ký</span>
              <span className="font-sans font-semibold text-slate-800 truncate block" title={primaryContract.nguoiDaiDien || primaryContract.tenKhachHang}>
                {primaryContract.nguoiDaiDien || primaryContract.tenKhachHang || 'N/A'}
              </span>
            </div>
          </div>

          {/* Serial Chips & Status Reconciliation */}
          {primaryContract.danhSachMaMay && primaryContract.danhSachMaMay.length > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center gap-2 flex-wrap">
              <span className="text-3xs font-bold text-slate-500 uppercase">Đối soát Serial máy:</span>
              {primaryContract.danhSachMaMay.map((serial: string, idx: number) => {
                const isDelivered = deliveries.some(d => 
                  d.ngayGiaoThucTe && Array.isArray(d.danhSachMaMay) && d.danhSachMaMay.includes(serial)
                );
                return (
                  <span
                    key={idx}
                    className={`font-mono text-3xs font-bold px-2 py-0.5 rounded border flex items-center gap-1 ${
                      isDelivered 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                        : 'bg-amber-50 text-amber-800 border-amber-300'
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
        </div>
      )}

      {/* Placeholder nếu chưa có Hợp Đồng */}
      {!primaryContract && (
        <div
          ref={contractRef}
          className="bg-white rounded-xl border border-dashed border-slate-300 p-4 shadow-2xs transition-all duration-300 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
              <FileSignature size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700">Chưa ký kết hợp đồng kinh tế</h4>
              <p className="text-3xs text-slate-500 mt-0.5">Báo giá này chưa được chuyển đổi thành Hợp Đồng chính thức.</p>
            </div>
          </div>
          {onCreateContract && (
            <button
              type="button"
              onClick={onCreateContract}
              className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors border-0 cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
            >
              + Tạo Hợp Đồng Ngay
            </button>
          )}
        </div>
      )}

      {/* 3. CHẶNG CHI TIẾT: GIAO HÀNG (DELIVERIES) */}
      <div
        ref={deliveryRef}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs transition-all duration-300"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-100 text-cyan-800 flex items-center justify-center font-bold text-xs">
              <Truck size={14} />
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              LỊCH SỬ XUẤT KHO & BÀN GIAO THỰC TẾ ({deliveries.length} phiếu)
            </h4>
            {totalMachineQty > 0 && (
              <span className={`text-3xs font-bold px-2 py-0.5 rounded-full ${
                deliveredQty >= totalMachineQty
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {deliveredQty >= totalMachineQty 
                  ? '✓ Đã giao đủ máy' 
                  : `Đã giao ${deliveredQty}/${totalMachineQty} máy (Còn thiếu ${totalMachineQty - deliveredQty})`}
              </span>
            )}
          </div>
          {onCreateDelivery && (
            <button
              type="button"
              onClick={onCreateDelivery}
              className="text-3xs font-semibold text-cyan-700 hover:text-cyan-900 bg-cyan-50 px-2 py-1 rounded hover:bg-cyan-100 transition-colors border-0 cursor-pointer"
            >
              + Lập phiếu giao
            </button>
          )}
        </div>

        {deliveries.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-2xs italic">
            Chưa phát sinh phiếu xuất kho hoặc bàn giao máy cho hồ sơ này.
          </div>
        ) : (
          <div className="space-y-2.5">
            {deliveries.map((del: any) => {
              const isDelivered = !!del.ngayGiaoThucTe;
              return (
                <div
                  key={del.id}
                  onClick={() => openDrawer('delivery', del.id)}
                  className="p-3 bg-slate-50/70 hover:bg-cyan-50/40 rounded-lg border border-slate-200 hover:border-cyan-300 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs font-bold bg-white text-cyan-900 px-2 py-0.5 rounded border border-cyan-200">
                        {del.soPhieuGiaoHang || del.id}
                      </span>
                      <span
                        className={`text-3xs px-2 py-0.5 rounded font-bold uppercase ${
                          isDelivered
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {isDelivered ? '✓ Đã bàn giao' : 'Đang xử lý xuất kho'}
                      </span>
                    </div>
                    <span className="text-3xs font-mono font-semibold text-slate-500">
                      {isDelivered
                        ? `Bàn giao: ${formatDate(del.ngayGiaoThucTe)}`
                        : `Kế hoạch: ${formatDate(del.ngayGiaoMay)}`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-3xs text-slate-600">
                    <div>
                      <span className="text-slate-400">Tài xế / Vận chuyển:</span>{' '}
                      <strong>{del.tenNguoiGiao || del.donViVanChuyen || 'N/A'}</strong>
                      {del.sdtNguoiGiao && <span> ({del.sdtNguoiGiao})</span>}
                    </div>
                    <div>
                      <span className="text-slate-400">Người nhận máy:</span>{' '}
                      <strong>{del.tenNguoiNhan || 'N/A'}</strong>
                      {del.sdtNguoiNhan && <span> ({del.sdtNguoiNhan})</span>}
                    </div>
                    <div>
                      <span className="text-slate-400">Kỹ thuật lắp đặt:</span>{' '}
                      <strong>{del.kyThuatBanGiao || del.nguoiPhuTrach || 'Đội kỹ thuật SGM'}</strong>
                    </div>
                  </div>

                  {/* Serial chips in delivery */}
                  {del.danhSachMaMay && del.danhSachMaMay.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-slate-150">
                      <span className="text-3xs font-semibold text-slate-500">Mã máy bàn giao:</span>
                      {del.danhSachMaMay.map((m: string, i: number) => (
                        <span
                          key={i}
                          className="font-mono text-3xs font-bold bg-white text-slate-800 px-1.5 py-0.2 rounded border border-slate-200"
                        >
                          {m}
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

      {/* 4. CHẶNG CHI TIẾT: THANH TOÁN (PAYMENTS) */}
      <div
        ref={paymentRef}
        className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs transition-all duration-300"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
              <CreditCard size={14} />
            </div>
            <h4 className="text-xs font-bold text-slate-800">
              SỔ CÁI THANH TOÁN & ĐỢT THU THỰC TẾ ({payments.length} phiếu thu)
            </h4>
          </div>
          {onCreatePayment && (
            <button
              type="button"
              onClick={onCreatePayment}
              className="text-3xs font-semibold text-amber-800 hover:text-amber-950 bg-amber-50 px-2 py-1 rounded hover:bg-amber-100 transition-colors border-0 cursor-pointer"
            >
              + Lập phiếu thu
            </button>
          )}
        </div>

        {payments.length === 0 ? (
          <div className="py-4 text-center text-slate-400 text-2xs italic">
            Chưa phát sinh phiếu thu nào cho hồ sơ giao dịch này.
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p: any) => {
              const installments = p.cacDotThu && p.cacDotThu.length > 0 ? p.cacDotThu : null;

              return (
                <div
                  key={p.id}
                  onClick={() => openDrawer('payment', p.id)}
                  className="p-3 bg-slate-50/70 hover:bg-amber-50/30 rounded-lg border border-slate-200 hover:border-amber-300 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xs font-bold bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                        {p.soPhieu || p.paymentId || p.id}
                      </span>
                      <span className="text-3xs font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded uppercase">
                        {p.tinhTrangThanhToan || 'Tất toán'}
                      </span>
                    </div>
                    <span className="font-currency font-black text-sm text-slate-900 tabular-nums">
                      {formatMoney(p.soTien)}
                    </span>
                  </div>

                  {/* Multi-installment breakdown table if exists */}
                  {installments && installments.length > 0 ? (
                    <div className="mt-1 bg-white rounded border border-slate-200 overflow-hidden divide-y divide-slate-100 text-3xs">
                      {installments.map((dot: any, dIdx: number) => (
                        <div key={dIdx} className="px-2.5 py-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">Đợt {dot.lanThu || dIdx + 1}:</span>
                            <span className="text-slate-500 font-mono">{formatDate(dot.ngayThu)}</span>
                            {dot.phuongThucThanhToan && (
                              <span className="text-slate-500">({dot.phuongThucThanhToan})</span>
                            )}
                            {dot.soChungTuThamChieu && (
                              <span className="font-mono text-blue-700 bg-blue-50 px-1 rounded">
                                UNC: {dot.soChungTuThamChieu}
                              </span>
                            )}
                          </div>
                          <span className="font-currency font-bold text-emerald-800 tabular-nums">
                            {formatMoney(dot.soTien)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-3xs text-slate-500">
                      <span>Người nộp: <strong>{p.tenNguoiNop || p.tenKhachHang || 'N/A'}</strong></span>
                      <span>Ngày thu: <strong>{formatDate(p.ngayThanhToan || p.createdAt)}</strong></span>
                      <span>Hình thức: <strong>{p.phuongThucThanhToan || 'Chuyển khoản'}</strong></span>
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
