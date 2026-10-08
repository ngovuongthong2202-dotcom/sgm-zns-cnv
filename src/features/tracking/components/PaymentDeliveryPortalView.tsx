import React from 'react';
import { 
  CreditCard, 
  Sparkles, 
  Award, 
  CheckCircle2, 
  Truck, 
  ShieldCheck, 
  Calendar, 
  Printer, 
  ExternalLink,
  MapPin,
  Clock,
  ArrowRight
} from 'lucide-react';
import { TrackingProductItem } from '../types';
import { TrackingSpecsManifest } from './TrackingSpecsManifest';
import { TrackingPhoneGate } from './TrackingPhoneGate';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatPoints } from '@/src/modules/billing/domain/loyaltyEngine';

interface PaymentDeliveryPortalViewProps {
  customerName: string;
  activePhone: string;
  maskedPhone: string;
  isUnlocked: boolean;
  phoneError: string;
  setPhoneError: (msg: string) => void;
  onVerifyPhone: (digits: string) => boolean | Promise<boolean>;
  products: TrackingProductItem[];
  installmentsList: any[];
  matchedInstallmentIndex: number;
  financials: {
    totalContractVal: number;
    subTotal: number;
    vatAmount: number;
    totalPaid: number;
    remainingDebt: number;
    paymentPoints: number;
    cumulativePoints: number;
  };
  relatedDelivery?: any;
  relatedContract?: any;
  relatedQuotation?: any;
  primaryPaymentCode?: string;
}

export function PaymentDeliveryPortalView({
  customerName,
  activePhone,
  maskedPhone,
  isUnlocked,
  phoneError,
  setPhoneError,
  onVerifyPhone,
  products,
  installmentsList,
  matchedInstallmentIndex,
  financials,
  relatedDelivery,
  relatedContract,
  relatedQuotation,
  primaryPaymentCode
}: PaymentDeliveryPortalViewProps) {
  const paymentPct = financials.totalContractVal > 0 
    ? Math.min(100, Math.round((financials.totalPaid / financials.totalContractVal) * 100))
    : (financials.totalPaid > 0 ? 100 : 0);

  const isFullySettled = financials.remainingDebt <= 0 && financials.totalPaid > 0;

  return (
    <div className="space-y-5">
      {/* 1. TOP HERO: FINANCIAL CLEARANCE & VIP POINTS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full border text-2xs font-bold uppercase tracking-wider ${
                isFullySettled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {isFullySettled ? 'Đã Tất Toán 100%' : 'Tiến Độ Thanh Toán Theo Hợp Đồng'}
              </span>
              {primaryPaymentCode && (
                <span className="text-2xs text-slate-400">
                  Mã chứng từ: <strong className="text-slate-700 tabular-nums">{primaryPaymentCode}</strong>
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {customerName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Số điện thoại xác thực:</span>
              <span className="tabular-nums font-bold text-slate-700">{maskedPhone}</span>
            </p>
          </div>

          {/* VIP Loyalty Reward Card */}
          <div className="bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-white border border-amber-200 rounded-xl p-3 min-w-[210px] flex items-center gap-3 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-amber-800 flex items-center gap-1">
                <span>Điểm Thưởng VIP</span>
                <Sparkles className="w-3 h-3 text-amber-500" />
              </div>
              <div className="text-lg font-bold text-amber-700 tabular-nums leading-tight">
                {formatPoints(financials.cumulativePoints)} <span className="text-xs font-normal">điểm</span>
              </div>
              <div className="text-[10px] text-amber-800/80">
                1.000đ = 1 điểm tích lũy
              </div>
            </div>
          </div>
        </div>

        {/* Security Phone Gate */}
        <TrackingPhoneGate
          isUnlocked={isUnlocked}
          activePhone={activePhone}
          maskedPhone={maskedPhone}
          portalMode="PAYMENT"
          onVerify={onVerifyPhone}
          phoneError={phoneError}
          setPhoneError={setPhoneError}
        />
      </div>

      {/* 2. BANKING-GRADE FINANCIAL BENTO HUD (3 KHỐI SỐ LIỆU TÀI CHÍNH) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200/60 shadow-2xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                Đối Soát Dòng Tiền & Công Nợ
              </h3>
              <p className="text-2xs text-slate-500">
                Bảng cân đối tài chính trực tiếp theo dữ liệu sổ cái SGM OS
              </p>
            </div>
          </div>

          <span className="text-2xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full tabular-nums">
            Hoàn thành {paymentPct}%
          </span>
        </div>

        {/* 3 Bento Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-500 block">
              1. Tổng Giá Trị Giao Dịch
            </span>
            <div className="text-base sm:text-lg font-bold tabular-nums text-slate-900">
              {isUnlocked ? formatCurrency(financials.totalContractVal) : '•••••••• đ'}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {relatedContract ? `Theo HĐ ${relatedContract.soHopDong}` : 'Theo thỏa thuận'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-1">
            <span className="text-[10px] uppercase font-bold text-emerald-800 block">
              2. Đã Thanh Toán Thực Tế
            </span>
            <div className="text-base sm:text-lg font-bold tabular-nums text-emerald-700">
              {isUnlocked ? formatCurrency(financials.totalPaid) : '•••••••• đ'}
            </div>
            <span className="text-[10px] text-emerald-800 block">
              Đã ghi sổ quỹ Saigon Machine
            </span>
          </div>

          <div className={`p-3.5 rounded-xl border space-y-1 ${
            financials.remainingDebt <= 0
              ? 'bg-emerald-50/50 border-emerald-200'
              : 'bg-amber-50/80 border-amber-200'
          }`}>
            <span className={`text-[10px] uppercase font-bold block ${
              financials.remainingDebt <= 0 ? 'text-emerald-800' : 'text-amber-800'
            }`}>
              3. Công Nợ Còn Lại
            </span>
            <div className={`text-base sm:text-lg font-bold tabular-nums ${
              financials.remainingDebt <= 0 ? 'text-emerald-700' : 'text-amber-800'
            }`}>
              {isUnlocked ? formatCurrency(financials.remainingDebt) : '•••••••• đ'}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {financials.remainingDebt <= 0 ? '✓ Đã hoàn tất nghĩa vụ' : 'Thanh toán theo tiến độ'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-2xs text-slate-500 font-medium">
            <span>Tiến độ giải ngân</span>
            <span className="tabular-nums font-bold text-slate-800">{paymentPct}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 rounded-full ${
                paymentPct >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${paymentPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. MULTI-INSTALLMENT PAYMENT LEDGER (SỔ CÁI CÁC ĐỢT THU) */}
      {isUnlocked && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                Nhật Ký Các Đợt Thu Tiền & Xác Thực ZNS
              </h3>
            </div>
            <span className="text-2xs text-slate-500 tabular-nums">
              Tổng cộng {installmentsList.length} đợt
            </span>
          </div>

          {installmentsList.length > 0 ? (
            <div className="overflow-x-auto border border-slate-100 rounded-xl">
              <table className="w-full text-xs text-left border-collapse min-w-[640px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase">
                    <th className="py-2.5 px-3">Đợt Thu</th>
                    <th className="py-2.5 px-3">Ngày Thu</th>
                    <th className="py-2.5 px-3 text-right">Số Tiền (VND)</th>
                    <th className="py-2.5 px-3">Hình Thức</th>
                    <th className="py-2.5 px-3">Nội Dung Ghi Chú</th>
                    <th className="py-2.5 px-3 text-right">Điểm VIP</th>
                    <th className="py-2.5 px-3 text-center">Xác Thực ZNS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {installmentsList.map((dot, dIdx) => {
                    const isMatched = dIdx === matchedInstallmentIndex;
                    const pts = Math.round((Number(dot.soTien) || 0) / 1000);
                    return (
                      <tr 
                        key={dIdx} 
                        className={`transition-colors ${
                          isMatched ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          Đợt {dot.lanThu || dIdx + 1}
                        </td>
                        <td className="py-2.5 px-3 tabular-nums text-slate-600">
                          {dot.ngayThu || '---'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-700">
                          {formatCurrency(Number(dot.soTien) || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {dot.phuongThucThanhToan || 'Chuyển khoản'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]" title={dot.ghiChu}>
                          {dot.ghiChu || 'Thanh toán tiền máy'}
                        </td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold text-amber-700">
                          +{formatPoints(pts)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {isMatched ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-[10px] font-bold">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                              Vừa xác nhận
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-medium">
                              Đã ghi sổ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 italic text-2xs bg-slate-50 rounded-xl">
              Chưa có đợt thu nào được ghi nhận
            </div>
          )}
        </div>
      )}

      {/* 4. EQUIPMENT DELIVERY & WARRANTY DISPATCH LEDGER (NẾU CÓ PHIẾU XUẤT KHO) */}
      {relatedDelivery && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Thông Tin Xuất Kho & Bảo Hành Máy Thực Tế
                </h3>
                <p className="text-2xs text-slate-500">
                  Dữ liệu số máy serial xuất xưởng phục vụ kích hoạt bảo hành điện tử chính hãng
                </p>
              </div>
            </div>

            <span className="text-2xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              {relatedDelivery.trangThai === 'delivered' ? 'Đã bàn giao lắp đặt' : 'Đang xử lý xuất xưởng'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Phiếu Xuất Kho</span>
              <span className="text-xs font-bold tabular-nums text-blue-900 block truncate">
                {relatedDelivery.soPhieuXuat || relatedDelivery.deliveryId || '---'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Ngày Bàn Giao</span>
              <span className="text-xs font-bold text-slate-800 block tabular-nums">
                {relatedDelivery.ngayGiaoThucTe || relatedDelivery.ngayGiaoDuKien || '---'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Người Nhận Hàng</span>
              <span className="text-xs font-bold text-slate-800 block truncate">
                {relatedDelivery.nguoiNhanHang || customerName}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
              <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Địa Điểm Bàn Giao</span>
              <span className="text-xs font-bold text-slate-800 block truncate" title={relatedDelivery.diaDiemGiaoHang}>
                {relatedDelivery.diaDiemGiaoHang || 'Xưởng khách hàng'}
              </span>
            </div>

            {Array.isArray(relatedDelivery.danhSachMaMay) && relatedDelivery.danhSachMaMay.length > 0 && (
              <div className="col-span-2 md:col-span-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <span className="text-emerald-800 font-bold uppercase tracking-wider block mb-1.5 text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Mã Định Danh / Serial Máy Xuất Xưởng (Bảo Hành Chính Hãng SGM)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {relatedDelivery.danhSachMaMay.map((sn: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-bold text-xs tabular-nums shadow-2xs"
                    >
                      {sn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TECHNICAL PRODUCTS SPECIFICATIONS */}
      <TrackingSpecsManifest
        products={products}
        isUnlocked={isUnlocked}
        totalValue={financials.totalContractVal}
      />

      {/* 6. PRINT SUITE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center justify-between gap-3">
        <span className="text-2xs text-slate-500 font-medium">
          Dữ liệu tài chính được kiểm định và xác thực bởi Bộ phận Kế toán Saigon Machine (SGM OS).
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer shrink-0"
        >
          <Printer className="w-3.5 h-3.5 text-slate-600" />
          <span>In / Tải Biên Lai Thu Tiền</span>
        </button>
      </div>
    </div>
  );
}
