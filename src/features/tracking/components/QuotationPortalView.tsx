import React from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  Printer, 
  ExternalLink,
  UserCheck,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { TrackingProductItem, QuotationValidityInfo } from '../types';
import { TrackingSpecsManifest } from './TrackingSpecsManifest';
import { TrackingPhoneGate } from './TrackingPhoneGate';

interface QuotationPortalViewProps {
  quotation: any;
  customerName: string;
  activePhone: string;
  maskedPhone: string;
  isUnlocked: boolean;
  phoneError: string;
  setPhoneError: (msg: string) => void;
  onVerifyPhone: (digits: string) => boolean | Promise<boolean>;
  products: TrackingProductItem[];
  validity: QuotationValidityInfo | null;
  hasCustomerApproved: boolean;
  onApproveQuotation: () => Promise<void>;
  approvalSubmitting: boolean;
  relatedContract?: any;
}

export function QuotationPortalView({
  quotation,
  customerName,
  activePhone,
  maskedPhone,
  isUnlocked,
  phoneError,
  setPhoneError,
  onVerifyPhone,
  products,
  validity,
  hasCustomerApproved,
  onApproveQuotation,
  approvalSubmitting,
  relatedContract
}: QuotationPortalViewProps) {
  const quoteNumber = quotation?.soPhieuBaoGia || quotation?.id || '---';
  const issueDate = quotation?.ngayBaoGia || '---';
  const officerName = quotation?.nguoiPhuTrach || 'Kỹ Sư Phòng Dự Án SGM';
  const totalAmount = Number(quotation?.totalAmount || quotation?.subTotal || quotation?.giaTri || 0);
  const vatAmount = Number(quotation?.vatAmount || 0);

  return (
    <div className="space-y-5">
      {/* 1. TOP HERO: CUSTOMER IDENTITY & VALIDITY COUNTDOWN */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold uppercase tracking-wider">
                Báo Giá Thương Mại Chính Thức SGM
              </span>
              <span className="text-2xs text-slate-400">
                Ngày phát hành: <strong className="text-slate-700 tabular-nums">{issueDate}</strong>
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
              {customerName}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Đầu mối nhận tin:</span>
              <span className="tabular-nums font-bold text-slate-700">{maskedPhone}</span>
            </p>
          </div>

          {/* Countdown timer badge */}
          {validity && (
            <div className={`border rounded-xl p-3 min-w-[220px] flex items-center gap-3 shadow-2xs ${
              hasCustomerApproved
                ? 'bg-emerald-50/90 border-emerald-300'
                : validity.isExpired
                ? 'bg-red-50/90 border-red-200'
                : validity.daysLeft <= 3
                ? 'bg-amber-50/90 border-amber-200'
                : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                hasCustomerApproved
                  ? 'bg-emerald-500/20 text-emerald-700 border-emerald-300'
                  : validity.isExpired
                  ? 'bg-red-500/20 text-red-700 border-red-300'
                  : 'bg-emerald-500/15 text-emerald-600 border-emerald-300'
              }`}>
                {hasCustomerApproved ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : validity.isExpired ? (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                ) : (
                  <Calendar className="w-5 h-5 text-emerald-600" />
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-600 flex items-center gap-1">
                  <span>{hasCustomerApproved ? 'Đã Đồng Ý' : validity.isExpired ? 'Hết Hiệu Lực' : 'Hiệu Lực Báo Giá'}</span>
                  <Clock className="w-3 h-3 text-slate-500" />
                </div>
                <div className={`text-base font-bold tabular-nums leading-tight ${
                  hasCustomerApproved 
                    ? 'text-emerald-700' 
                    : validity.isExpired 
                    ? 'text-red-700' 
                    : 'text-emerald-700'
                }`}>
                  {hasCustomerApproved ? (
                    <span>Chờ Lên Hợp Đồng</span>
                  ) : validity.isExpired ? (
                    <span>Đã Hết Hạn</span>
                  ) : (
                    <span>Còn {validity.daysLeft} ngày</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 tabular-nums">
                  Hạn đến: {validity.ngayHetHanStr}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Security Phone Gate */}
        <TrackingPhoneGate
          isUnlocked={isUnlocked}
          activePhone={activePhone}
          maskedPhone={maskedPhone}
          portalMode="QUOTATION"
          onVerify={onVerifyPhone}
          phoneError={phoneError}
          setPhoneError={setPhoneError}
        />
      </div>

      {/* 2. DOSSIER SHEET: HỒ SƠ BÁO GIÁ THƯƠNG MẠI */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                  Hồ Sơ Báo Giá Thương Mại
                </h3>
                <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                  Chính Thức
                </span>
              </div>
              <p className="text-2xs text-slate-500">
                Saigon Machine Commercial Quotation Dossier
              </p>
            </div>
          </div>

          {hasCustomerApproved && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-2xs font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã Xác Nhận Đồng Ý Trực Tuyến</span>
            </div>
          )}
        </div>

        {/* 4-Box Parameter Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Phiếu Báo Giá</span>
            <span className="text-xs font-bold tabular-nums text-emerald-800 block truncate" title={quoteNumber}>
              {quoteNumber}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Ngày Phát Hành</span>
            <span className="text-xs font-bold text-slate-800 block tabular-nums">
              {issueDate}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Hiệu Lực Báo Giá</span>
            <span className="text-xs font-bold text-slate-800 block">
              {quotation?.hieuLuc ? `${quotation.hieuLuc} ngày` : '30 ngày'} 
              {validity ? ` (đến ${validity.ngayHetHanStr})` : ''}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
            <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Kỹ Sư Phụ Trách (PIC)</span>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 truncate" title={officerName}>
                {officerName}
              </span>
              <a href="tel:0932000999" className="text-emerald-700 hover:text-emerald-800 font-bold shrink-0 ml-1 tabular-nums">
                0932.000.999
              </a>
            </div>
          </div>
        </div>

        {/* Commercial & Technical Commitment Notice */}
        <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/80 text-2xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-emerald-900 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Điều Khoản Thương Mại & Cam Kết Chế Tạo Máy</span>
          </div>
          <p className="text-slate-600 leading-relaxed">
            {quotation?.dieuKhoanThanhToan || quotation?.noiDungGhiChu || 
              'Đơn giá xuất xưởng đã bao gồm chuyển giao công nghệ, đào tạo và hướng dẫn vận hành máy tại nhà máy Saigon Machine. Cam kết bảo hành chính hãng 12 - 24 tháng theo tiêu chuẩn nhà sản xuất.'}
          </p>
        </div>

        {/* Existing contract notice */}
        {relatedContract && (
          <div className="p-3 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 text-2xs flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0" />
              <span>
                Báo giá này đã được phát triển thành <strong>Hợp đồng kinh tế {relatedContract.soHopDong}</strong>.
              </span>
            </div>
            <span className="text-2xs text-blue-800 bg-white/90 px-2 py-0.5 rounded-md font-bold">
              Đang triển khai sản xuất
            </span>
          </div>
        )}
      </div>

      {/* 3. TECHNICAL EQUIPMENT SPECIFICATIONS MANIFEST */}
      <TrackingSpecsManifest
        products={products}
        isUnlocked={isUnlocked}
        totalValue={totalAmount}
        subTotal={Number(quotation?.subTotal || 0)}
        vatAmount={vatAmount}
      />

      {/* 4. CALL TO ACTION SUITE: ONLINE APPROVAL & DIRECT CHAT */}
      <div className="bg-white border border-emerald-200/90 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Phản Hồi & Xác Nhận Báo Giá Trực Tuyến</span>
            </h3>
            <p className="text-2xs text-slate-600 mt-0.5">
              Quý khách có thể xác nhận đồng ý với báo giá trên để Saigon Machine ưu tiên soạn thảo Hợp đồng kinh tế và bố trí kế hoạch chế tạo máy.
            </p>
          </div>

          {hasCustomerApproved ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã ghi nhận Quý khách đồng ý báo giá!</span>
            </div>
          ) : relatedContract ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-xs shrink-0">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đã ký Hợp đồng kinh tế</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onApproveQuotation}
              disabled={approvalSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              {approvalSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Đồng Ý Báo Giá & Yêu Cầu Lập Hợp Đồng</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <a
            href="https://oa.zalo.me/1336150047301360288"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-2xs font-semibold transition-all shadow-2xs"
          >
            <ExternalLink className="w-3 h-3 text-[#0068FF]" />
            <span>Yêu cầu tư vấn điều chỉnh thông số qua Zalo OA</span>
          </a>
          <a
            href="tel:0932000999"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-2xs font-semibold transition-all shadow-2xs"
          >
            <Phone className="w-3 h-3 text-emerald-600" />
            <span>Gọi chuyên viên: {officerName} (0932.000.999)</span>
          </a>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-2xs font-semibold transition-all shadow-2xs cursor-pointer sm:ml-auto"
          >
            <Printer className="w-3 h-3 text-slate-500" />
            <span>In / Tải Báo Giá</span>
          </button>
        </div>
      </div>
    </div>
  );
}
