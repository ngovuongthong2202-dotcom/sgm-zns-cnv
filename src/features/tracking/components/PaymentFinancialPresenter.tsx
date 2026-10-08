import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Copy, 
  ShieldCheck, 
  Download, 
  Building2, 
  AlertCircle, 
  Send, 
  Award,
  Sparkles,
  ExternalLink,
  Info
} from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatDate } from '@/src/shared/utils/formatDate';
import { notify } from '@/src/shared/utils/notify';
import { 
  CompanyBankingConfig, 
  getCompanyBankingConfig, 
  subscribeCompanyBankingConfig,
  DEFAULT_COMPANY_BANKING 
} from '@/src/shared/services/vietqrBankService';

export interface PaymentFinancialPresenterProps {
  payment: any;
  customer?: any;
  contract?: any;
  onSendConfirmPayment?: () => void;
  onDownloadPdf?: () => void;
}

export function PaymentFinancialPresenter({
  payment,
  customer,
  contract,
  onSendConfirmPayment,
  onDownloadPdf,
}: PaymentFinancialPresenterProps) {
  const [bankingConfig, setBankingConfig] = useState<CompanyBankingConfig>(DEFAULT_COMPANY_BANKING);
  const [confirmedSent, setConfirmedSent] = useState<boolean>(false);

  // Load and listen to live corporate banking settings from settingsRepo
  useEffect(() => {
    let mounted = true;
    getCompanyBankingConfig().then((cfg) => {
      if (mounted) setBankingConfig(cfg);
    });

    const unsubscribe = subscribeCompanyBankingConfig((cfg) => {
      if (mounted) setBankingConfig(cfg);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const installments = Array.isArray(payment?.cacDotThu) ? payment.cacDotThu : [];

  const totalContractVal = Number(payment?.tongTien) || Number(payment?.soTien) || Number(contract?.giaTriHopDong) || 0;
  const totalPaid = Number(payment?.daThanhToan) || installments.reduce((s: number, inst: any) => s + (Number(inst.soTien) || 0), 0);
  const remainingDebt = Math.max(0, Number(payment?.conLai) || Number(payment?.congNoConLai) || (totalContractVal - totalPaid));

  const percentPaid = totalContractVal > 0 
    ? Math.min(100, Math.round((totalPaid / totalContractVal) * 100)) 
    : 0;

  // Cú pháp chuyển khoản thực tế
  const transferRefCode = contract?.soHopDong || payment?.soHopDong || payment?.soDonHang || payment?.paymentId || 'SGM';
  const transferPhone = customer?.soDienThoai || customer?.phone || '';
  const transferContent = `TT HD ${transferRefCode.replace(/[^a-zA-Z0-9]/g, '')} ${transferPhone}`.trim();

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    notify.success(`Đã sao chép ${label}!`);
  };

  const handleSendPaymentProof = () => {
    setConfirmedSent(true);
    notify.success('Đã gửi thông báo xác nhận chuyển khoản cho Kế Toán SGM đối soát!');
    if (onSendConfirmPayment) onSendConfirmPayment();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      {/* 1. Hero Header - Financial Emerald & Deep Sky (No Purple, No Pink) */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                Tiến Độ Đơn Hàng & Đối Soát Thanh Toán
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-sans tabular-nums border border-slate-200">
                Mã: {payment?.soDonHang || payment?.paymentId || 'PT-SGM'}
              </span>
              <span className={`text-3xs font-semibold px-2 py-0.5 rounded-full border ${
                remainingDebt === 0 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-50 text-amber-800 border-amber-300'
              }`}>
                {remainingDebt === 0 ? 'Đã Tất Toán 100%' : 'Đang Đối Soát Công Nợ'}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Sổ Đối Soát Kế Toán Đơn Hàng Saigon Machine
            </h1>

            <div className="text-xs text-slate-700 flex items-center gap-3 flex-wrap">
              <span>Đơn vị thanh toán: <strong className="text-slate-900 uppercase font-bold">{customer?.tenKhachHang || customer?.tenPhapLy || 'Quý Khách Hàng'}</strong></span>
              {contract?.soHopDong && (
                <span>• Hợp đồng: <strong className="text-slate-900 font-sans tabular-nums font-semibold">{contract.soHopDong}</strong></span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownloadPdf}
              className="text-xs font-semibold text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Xuất Phiếu Thu / Bảng Kê (PDF)
            </button>
          </div>
        </div>

        {/* Progress Bar of Cashflow */}
        <div className="mt-5 space-y-1.5 pt-4 border-t border-emerald-100">
          <div className="flex justify-between text-xs font-semibold">
            <span className="text-slate-700">Tiến độ thanh toán hợp đồng:</span>
            <span className="text-emerald-800 font-bold font-sans tabular-nums">{percentPaid}% / 100%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-700"
              style={{ width: `${percentPaid}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Three Transparent Financial KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Total Contract Value */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs space-y-1">
          <div className="text-3xs uppercase font-bold tracking-wider text-slate-600 flex items-center justify-between">
            <span>Tổng Giá Trị Hợp Đồng</span>
            <span className="text-blue-700 font-sans tabular-nums">100%</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-slate-900 font-sans tracking-tight tabular-nums">
            {formatCurrency(totalContractVal)}
          </div>
          <div className="text-3xs text-slate-600 leading-snug">
            Đã bao gồm thuế GTGT và các điều khoản phụ lục
          </div>
        </div>

        {/* Total Paid Actually */}
        <div className="bg-white border border-emerald-200/90 rounded-2xl p-4.5 shadow-xs space-y-1 bg-emerald-50/20">
          <div className="text-3xs uppercase font-bold tracking-wider text-emerald-800 flex items-center justify-between">
            <span>Đã Ghi Nhận Thanh Toán</span>
            <span className="text-emerald-700 font-sans tabular-nums font-bold">{percentPaid}%</span>
          </div>
          <div className="text-lg md:text-xl font-bold text-emerald-800 font-sans tracking-tight tabular-nums">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-3xs text-emerald-800 leading-snug">
            {installments.length} đợt tiền đã xác nhận vào tài khoản
          </div>
        </div>

        {/* Remaining Debt */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs space-y-1">
          <div className="text-3xs uppercase font-bold tracking-wider text-slate-600 flex items-center justify-between">
            <span>Công Nợ Còn Lại</span>
            <span className="text-amber-700 font-sans tabular-nums font-semibold">
              {100 - percentPaid}%
            </span>
          </div>
          <div className={`text-lg md:text-xl font-bold font-sans tracking-tight tabular-nums ${
            remainingDebt === 0 ? 'text-emerald-700' : 'text-amber-800'
          }`}>
            {formatCurrency(remainingDebt)}
          </div>
          <div className="text-3xs text-slate-600 leading-snug">
            {payment?.ngayDenHan ? (
              <span>Hạn chót đợt kế tiếp: <strong className="font-sans tabular-nums text-slate-800">{formatDate(payment.ngayDenHan)}</strong></span>
            ) : (
              'Theo thỏa thuận nghiệm thu xuất xưởng'
            )}
          </div>
        </div>
      </div>

      {/* 3. Official Safe Corporate Banking Credentials (ZERO QR RISK) */}
      <div className="bg-white border border-blue-200 rounded-2xl p-5 md:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Thông Tin Chuyển Khoản Ngân Hàng Pháp Nhân Chính Thức SGM
            </h2>
          </div>
          <span className="text-2xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Ủy Nhiệm Chi Doanh Nghiệp Chuẩn Mực
          </span>
        </div>

        {/* Safety Callout Banner */}
        <div className="flex items-start gap-2.5 text-2xs text-slate-700 bg-blue-50/60 p-3 rounded-xl border border-blue-100 leading-relaxed">
          <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <span>
            Nhằm đảm bảo an toàn tài chính tuyệt đối cho các hợp đồng máy công nghiệp có giá trị lớn, Saigon Machine <strong>không áp dụng thanh toán qua mã QR sinh tự động</strong>. Quý Khách vui lòng thực hiện ủy nhiệm chi trực tiếp đến số tài khoản pháp nhân công ty dưới đây.
          </span>
        </div>

        {/* Banking Wire Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Bank & Account Box */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              {bankingConfig.bankLogo ? (
                <img
                  src={bankingConfig.bankLogo}
                  alt={bankingConfig.bankShortName}
                  className="w-12 h-8 object-contain rounded bg-white p-1 border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-8 rounded bg-blue-700 text-white flex items-center justify-center font-bold text-xs">
                  SGM
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 leading-tight">
                  {bankingConfig.bankShortName || 'Vietcombank'}
                </div>
                <div className="text-3xs text-slate-600 truncate">
                  {bankingConfig.branch || 'Chi nhánh Tây Sài Gòn - TP.HCM'}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 space-y-1">
              <div className="text-3xs uppercase font-semibold text-slate-600">
                Số Tài Khoản Thụ Hưởng
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-950 font-sans tracking-tight tabular-nums">
                  {bankingConfig.accountNumber || '0302636521001'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(bankingConfig.accountNumber, 'Số tài khoản')}
                  className="px-2.5 py-1 text-2xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" /> Sao chép STK
                </button>
              </div>
            </div>

            <div className="space-y-0.5">
              <div className="text-3xs uppercase font-semibold text-slate-600">
                Đơn Vị Thụ Hưởng
              </div>
              <div className="text-xs font-bold text-slate-900 font-sans uppercase">
                {bankingConfig.accountHolder || 'CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN'}
              </div>
            </div>
          </div>

          {/* Transfer Memo / Content Box */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="text-3xs uppercase font-semibold text-slate-600">
                Cú Pháp Nội Dung Chuyển Khoản Chuẩn
              </div>
              <div className="p-3 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-blue-900 font-sans tabular-nums break-all">
                  {transferContent}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(transferContent, 'Nội dung chuyển khoản')}
                  className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors shrink-0"
                  title="Sao chép nội dung"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="text-3xs text-slate-600 leading-snug">
                Ghi đúng nội dung trên giúp hệ thống đối soát tự động kích hoạt thông báo qua Zalo trong 15 phút.
              </p>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(`${bankingConfig.bankShortName} - STK: ${bankingConfig.accountNumber} - ${bankingConfig.accountHolder} - ND: ${transferContent}`, 'Toàn bộ thông tin')}
                className="w-full py-2 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5 text-slate-600" />
                Sao Chép Toàn Bộ Thông Tin
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Payment Installment Ledger (Sổ Cái Các Đợt Thu Kế Toán) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Sổ Cái Các Đợt Thu Đã Ghi Sổ Kế Toán ({installments.length} đợt)
            </h2>
          </div>
          <span className="text-2xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Kế Toán Đối Soát Thực Tế
          </span>
        </div>

        {installments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-600 bg-slate-50 rounded-xl border border-slate-200">
            Chưa có đợt thu nào được ghi sổ. Vui lòng thanh toán đợt tạm ứng khởi động hợp đồng theo thông tin phía trên.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {installments.map((inst: any, idx: number) => {
              const amount = Number(inst.soTien) || 0;
              const dateStr = inst.ngayThu || inst.createdAt;
              const method = inst.hinhThuc || inst.phuongThuc || 'Chuyển khoản';
              const refNum = inst.soChungTu || inst.maGiaoDich || inst.unc || `UNC-0${idx + 1}`;

              return (
                <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xs font-bold font-sans tabular-nums">
                        {idx + 1}
                      </span>
                      <h3 className="text-xs font-bold text-slate-900">
                        {inst.tenDot || `Đợt Thu Số ${idx + 1}`}
                      </h3>
                      <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã Ghi Sổ
                      </span>
                    </div>

                    <div className="text-2xs text-slate-600 pl-7 flex items-center gap-3 flex-wrap">
                      <span>Ngày thu: <strong className="text-slate-800 font-sans tabular-nums font-semibold">{formatDate(dateStr)}</strong></span>
                      <span>• Hình thức: <strong>{method}</strong></span>
                      <span>• Mã chứng từ: <strong className="font-sans tabular-nums">{refNum}</strong></span>
                    </div>
                  </div>

                  <div className="text-right pl-7 sm:pl-0 shrink-0">
                    <div className="text-sm font-bold text-emerald-800 font-sans tabular-nums">
                      +{formatCurrency(amount)}
                    </div>
                    <div className="text-3xs text-slate-600">Đã cập nhật công nợ</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Customer Notification Action: I have made a transfer */}
      <div className="bg-gradient-to-r from-emerald-600/10 via-emerald-600/5 to-transparent border border-emerald-300 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Quý Khách Vừa Thực Hiện Chuyển Khoản Qua Ngân Hàng?
            </h3>
          </div>
          <p className="text-xs text-slate-700 max-w-xl">
            Bấm nút gửi thông báo dưới đây để báo cho bộ phận Kế Toán SGM kiểm tra số dư và phát hành chứng từ thu tiền điện tử gửi lại ngay cho Quý Khách.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSendPaymentProof}
            disabled={confirmedSent}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              confirmedSent
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-md'
            }`}
          >
            {confirmedSent ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Đã Báo Kế Toán Đối Soát
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Gửi Xác Nhận Đã Chuyển Khoản
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
