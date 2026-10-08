import React, { useMemo } from 'react';
import { 
  FileCheck, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  Printer, 
  MapPin,
  ArrowRight,
  AlertCircle,
  Building2,
  Wrench
} from 'lucide-react';
import { TrackingProductItem } from '../types';
import { TrackingSpecsManifest } from './TrackingSpecsManifest';
import { TrackingPhoneGate } from './TrackingPhoneGate';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatDate } from '@/src/shared/utils/formatDate';
import { computeContractCompletionTimeline } from '@/src/shared/utils/vietnamBusinessDays';

interface ContractPortalViewProps {
  contract: any;
  customerName: string;
  activePhone: string;
  maskedPhone: string;
  isUnlocked: boolean;
  phoneError: string;
  setPhoneError: (msg: string) => void;
  onVerifyPhone: (digits: string) => boolean | Promise<boolean>;
  products: TrackingProductItem[];
  relatedPayments?: any[];
  relatedDelivery?: any;
  onNavigateToPayment?: () => void;
  onNavigateToDelivery?: () => void;
}

export function ContractPortalView({
  contract,
  customerName,
  activePhone,
  maskedPhone,
  isUnlocked,
  phoneError,
  setPhoneError,
  onVerifyPhone,
  products,
  relatedPayments = [],
  relatedDelivery,
  onNavigateToPayment,
  onNavigateToDelivery
}: ContractPortalViewProps) {
  const contractNumber = contract?.soHopDong || contract?.id || '---';
  const orderNumber = contract?.soDonHang || '---';
  const quoteRef = contract?.soPhieuBaoGia || 'Theo thỏa thuận';
  const signedDate = contract?.ngayKy || contract?.ngayBatDau || '---';
  const workingDays = Number(contract?.soNgayDuKienHoanThanh || 45);
  const extensionDays = Number(contract?.soNgayGiaHan || 0);
  const extensionReason = contract?.lyDoGiaHan || '';
  const projectOfficer = contract?.nguoiPhuTrach || 'Ban Quản Lý Dự Án SGM';
  const legalSigner = contract?.nguoiDaiDien || customerName;
  const deliveryLocation = contract?.diaDiemGiaoHang || contract?.diaChi || 'Xưởng khách hàng';
  const warrantyTerms = contract?.baoHanh || '12 - 24 tháng chính hãng';
  const totalContractVal = Number(contract?.giaTriHopDong || contract?.totalAmount || contract?.subTotal || 0);

  // Compute Vietnam Business Days Timeline
  const timeline = useMemo(() => {
    return computeContractCompletionTimeline(contract, relatedPayments);
  }, [contract, relatedPayments]);

  // Standard SGM 3-Phase Milestone Milestones (30% - 60% - 10%)
  const milestones = useMemo(() => {
    const p1 = Math.round(totalContractVal * 0.3);
    const p2 = Math.round(totalContractVal * 0.6);
    const p3 = Math.max(0, totalContractVal - p1 - p2);
    return { p1, p2, p3 };
  }, [totalContractVal]);

  return (
    <div className="space-y-5">
      {/* 1. TOP HERO: CONTRACT IDENTITY & FABRICATION SCHEDULE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-2xs font-bold uppercase tracking-wider">
                Hợp Đồng Kinh Tế Chính Thức • Hiệu Lực Sản Xuất
              </span>
              <span className="text-2xs text-slate-400">
                Ký kết: <strong className="text-slate-700 tabular-nums">{signedDate}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {customerName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Đại diện ký kết:</span>
              <strong className="text-slate-700">{legalSigner}</strong>
              <span className="text-slate-300">•</span>
              <span>SĐT nhận tin:</span>
              <span className="tabular-nums font-bold text-slate-700">{maskedPhone}</span>
            </p>
          </div>

          {/* Timeline Completion Target Badge */}
          <div className="bg-gradient-to-br from-blue-50/90 via-sky-50 to-white border border-blue-200 rounded-xl p-3 min-w-[220px] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-blue-600/15 border border-blue-300 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-blue-900 flex items-center gap-1">
                <span>Dự Kiến Bàn Giao</span>
                <span className="text-slate-400">({workingDays} ngày LV)</span>
              </div>
              <div className="text-base font-bold tabular-nums text-blue-700 leading-tight">
                {timeline.completionDateFormatted || 'Đang triển khai'}
              </div>
              <div className="text-[10px] text-slate-500">
                {timeline.isDelayed ? (
                  <span className="text-amber-700 font-bold">Cần đẩy nhanh tiến độ</span>
                ) : (
                  <span>Đúng kế hoạch chế tạo</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Security Phone Gate */}
        <TrackingPhoneGate
          isUnlocked={isUnlocked}
          activePhone={activePhone}
          maskedPhone={maskedPhone}
          portalMode="CONTRACT"
          onVerify={onVerifyPhone}
          phoneError={phoneError}
          setPhoneError={setPhoneError}
        />
      </div>

      {/* 2. MANUFACTURING TIMELINE HUD (Chuẩn ngày làm việc Việt Nam trừ CN & Lễ Tết) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                Tiến Độ Gia Công Chế Tạo Máy
              </h3>
              <p className="text-2xs text-slate-500">
                Tính toán chuẩn xác theo ngày làm việc thực tế (loại trừ Chủ Nhật và Lễ Tết theo Bộ luật Lao động VN)
              </p>
            </div>
          </div>

          <span className="text-2xs font-bold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 self-start sm:self-auto">
            {timeline.executionStageLabel || 'Đang gia công chế tạo'}
          </span>
        </div>

        {/* 4-Phase Stepper */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-blue-700">Giai đoạn 1</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <strong className="text-xs font-bold text-slate-900 block">Ký Kết Hợp Đồng</strong>
            <span className="text-slate-500 block tabular-nums">Ngày: {signedDate}</span>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-blue-700">Giai đoạn 2</span>
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <strong className="text-xs font-bold text-slate-900 block">Tiếp Nhận Sản Xuất</strong>
            <span className="text-slate-500 block">Lên bản vẽ kỹ thuật chi tiết</span>
          </div>

          <div className="p-3 rounded-xl bg-sky-50/80 border border-sky-300 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-sky-800">Giai đoạn 3</span>
              <Clock className="w-4 h-4 text-sky-600" />
            </div>
            <strong className="text-xs font-bold text-slate-900 block">Gia Công & KCS Xưởng</strong>
            <span className="text-slate-500 block">Lắp ráp, chạy thử nghiệm thu</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-slate-500">Giai đoạn 4</span>
              <Truck className="w-4 h-4 text-slate-400" />
            </div>
            <strong className="text-xs font-bold text-slate-700 block">Bàn Giao Lắp Đặt</strong>
            <span className="text-slate-500 block tabular-nums">Dự kiến: {timeline.completionDateFormatted}</span>
          </div>
        </div>

        {/* Extension notification if contract extended */}
        {extensionDays > 0 && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-2xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Phụ lục gia hạn tiến độ chế tạo:</span> +{extensionDays} ngày làm việc.
              {extensionReason && (
                <p className="text-slate-600 mt-0.5">Lý do: {extensionReason}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. LEGAL CONTRACT DOSSIER & PARAMETERS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
              Hồ Sơ Hợp Đồng Kinh Tế & Sản Xuất
            </h3>
            <p className="text-2xs text-slate-500">
              Saigon Machine Manufacturing & Commercial Agreement Dossier
            </p>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Hợp Đồng Kinh Tế</span>
            <span className="text-xs font-bold tabular-nums text-blue-900 block truncate" title={contractNumber}>
              {contractNumber}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Đơn Hàng (PO)</span>
            <span className="text-xs font-bold tabular-nums text-slate-800 block truncate" title={orderNumber}>
              {orderNumber}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Căn Cứ Báo Giá Gốc</span>
            <span className="text-xs font-bold tabular-nums text-slate-700 block truncate" title={quoteRef}>
              {quoteRef}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Thời Hạn Bảo Hành</span>
            <span className="text-xs font-bold text-slate-800 block">
              {warrantyTerms}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Địa Điểm Bàn Giao</span>
            <span className="text-xs font-bold text-slate-800 block truncate" title={deliveryLocation}>
              {deliveryLocation}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Quản Lý Dự Án SGM</span>
            <span className="text-xs font-bold text-slate-800 block truncate" title={projectOfficer}>
              {projectOfficer}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Hotline Kỹ Thuật</span>
            <a href="tel:0932000999" className="text-xs font-bold text-blue-700 hover:underline block tabular-nums">
              0932.000.999
            </a>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Thời Gian Chế Tạo</span>
            <span className="text-xs font-bold text-emerald-800 block">
              {workingDays} ngày làm việc
            </span>
          </div>
        </div>

        {/* 3-Phase Milestone Payment Schedule */}
        {isUnlocked && totalContractVal > 0 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xs uppercase font-bold text-slate-500">Lộ trình mốc thanh toán theo hợp đồng (30% - 60% - 10%)</span>
              <span className="text-2xs text-blue-600 font-semibold">Chuẩn SGM</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-2xs">
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-blue-700 block">Đợt 1: Tạm ứng khi ký HĐ (30%)</span>
                <strong className="text-xs font-bold tabular-nums text-blue-900 block">{formatCurrency(milestones.p1)}</strong>
                <span className="text-[10px] text-slate-500 block">Khởi động mua thép & phôi chế tạo</span>
              </div>
              <div className="p-2.5 rounded-xl bg-sky-50/70 border border-sky-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-sky-800 block">Đợt 2: Nghiệm thu tại xưởng (60%)</span>
                <strong className="text-xs font-bold tabular-nums text-sky-900 block">{formatCurrency(milestones.p2)}</strong>
                <span className="text-[10px] text-slate-500 block">Sau khi chạy thử đạt yêu cầu</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-emerald-800 block">Đợt 3: Bàn giao & quyết toán (10%)</span>
                <strong className="text-xs font-bold tabular-nums text-emerald-900 block">{formatCurrency(milestones.p3)}</strong>
                <span className="text-[10px] text-slate-500 block">Lắp đặt tại xưởng khách & ký biên bản</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MACHINE REGISTRY & TECHNICAL SPECIFICATIONS */}
      <TrackingSpecsManifest
        products={products}
        isUnlocked={isUnlocked}
        totalValue={totalContractVal}
      />

      {/* 5. QUICK NAVIGATION & PRINT SUITE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {relatedPayments && relatedPayments.length > 0 && onNavigateToPayment && (
            <button
              type="button"
              onClick={onNavigateToPayment}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Xem Sổ Cái Thanh Toán ({relatedPayments.length} phiếu thu)</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}

          {relatedDelivery && onNavigateToDelivery && (
            <button
              type="button"
              onClick={onNavigateToDelivery}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Xem Tiến Độ Xuất Kho & Bảo Hành</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer ml-auto"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span>In / Tải Bản Hợp Đồng</span>
        </button>
      </div>
    </div>
  );
}
