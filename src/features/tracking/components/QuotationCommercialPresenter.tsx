import React, { useMemo, useState } from 'react';
import { 
  FileText, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  PhoneCall, 
  Download, 
  User, 
  ShieldCheck, 
  Wrench, 
  Layers, 
  FileCheck, 
  MessageSquare,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatDate } from '@/src/shared/utils/formatDate';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { notify } from '@/src/shared/utils/notify';

export interface QuotationCommercialPresenterProps {
  quotation: any;
  customer?: any;
  onAgreeQuotation?: () => void;
  onContactZalo?: () => void;
  onDownloadPdf?: () => void;
}

export function QuotationCommercialPresenter({
  quotation,
  customer,
  onAgreeQuotation,
  onContactZalo,
  onDownloadPdf,
}: QuotationCommercialPresenterProps) {
  const [agreed, setAgreed] = useState<boolean>(false);

  // Tính số ngày còn lại của báo giá
  const validityStats = useMemo(() => {
    const quoteDateStr = quotation?.ngayBaoGia || quotation?.createdAt;
    const validityDays = Number(quotation?.hieuLuc) || 15;
    if (!quoteDateStr) return { daysLeft: validityDays, isExpired: false, deadlineStr: '' };

    const startDate = new Date(quoteDateStr);
    const deadline = new Date(startDate.getTime() + validityDays * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000));

    return {
      daysLeft: Math.max(0, daysLeft),
      isExpired: daysLeft <= 0,
      deadlineStr: deadline.toLocaleDateString('vi-VN'),
    };
  }, [quotation?.ngayBaoGia, quotation?.createdAt, quotation?.hieuLuc]);

  const products = useMemo(() => {
    return Array.isArray(quotation?.products) ? quotation.products : [];
  }, [quotation?.products]);

  const subTotal = Number(quotation?.subTotal) || products.reduce((s: number, p: any) => s + (Number(p.thanhTien) || Number(p.soLuong || 1) * Number(p.donGia || 0)), 0);
  const vatAmount = Number(quotation?.vatAmount) || 0;
  const totalAmount = Number(quotation?.totalAmount) || (subTotal + vatAmount);

  const handleAgreeClick = () => {
    setAgreed(true);
    notify.success('Cảm ơn Quý Khách! SGM đã ghi nhận yêu cầu lập Hợp Đồng Kinh Tế.');
    if (onAgreeQuotation) onAgreeQuotation();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      {/* 1. Hero Header - Warm Industrial Amber & Crisp White */}
      <div className="bg-white border border-amber-200/90 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-700" />
                Báo Giá Thương Mại Chính Thức
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-sans tabular-nums border border-slate-200">
                Số: {quotation?.soPhieuBaoGia || 'BG-SGM'}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Dự Toán Cung Cấp Thiết Bị & Chế Tạo Máy SGM
            </h1>

            <p className="text-xs text-slate-700 flex items-center gap-2 flex-wrap">
              <span>Đơn vị nhận báo giá:</span>
              <span className="font-bold text-slate-900 uppercase">
                {customer?.tenKhachHang || customer?.tenPhapLy || 'Quý Khách Hàng Doanh Nghiệp'}
              </span>
              {customer?.maSoThue && (
                <span className="text-slate-600 font-sans tabular-nums">
                  (MST: {customer.maSoThue})
                </span>
              )}
            </p>
          </div>

          {/* Quick Total Tag */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-3.5 text-right shrink-0">
            <div className="text-3xs uppercase font-bold tracking-wider text-amber-800">
              Tổng Giá Trị Dự Toán
            </div>
            <div className="text-lg md:text-xl font-bold text-amber-900 font-sans tracking-tight tabular-nums">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-3xs text-amber-700 mt-0.5 font-medium">
              Đã bao gồm điều khoản xuất xưởng SGM
            </div>
          </div>
        </div>

        {/* Realtime Countdown Banner */}
        <div className="mt-4 pt-3.5 border-t border-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <Clock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {validityStats.isExpired ? (
                <span className="font-bold text-red-600">
                  Báo giá này đã hết thời hạn bảo lưu đơn giá. Vui lòng liên hệ lại để cập nhật giá thép.
                </span>
              ) : (
                <span>
                  Thời hạn hiệu lực đơn giá: <strong className="font-bold text-amber-950 font-sans tabular-nums">Còn {validityStats.daysLeft} ngày</strong> (Hạn chót: <span className="font-sans tabular-nums">{validityStats.deadlineStr}</span>)
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onDownloadPdf}
              className="text-xs font-semibold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Tải PDF Báo Giá
            </button>
          </div>
        </div>
      </div>

      {/* 2. Commercial Funnel (4-Step Progress) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            Lộ Trình Triển Khai Đầu Tư Máy Móc (4 Bước)
          </h2>
          <span className="text-2xs font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
            Đang ở Bước 1: Xem Xét Dự Toán
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
          <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-bold text-amber-800 bg-amber-200/60 px-1.5 py-0.5 rounded">
                BƯỚC 1
              </span>
              <CheckCircle2 className="w-4 h-4 text-amber-700" />
            </div>
            <div className="text-xs font-bold text-amber-950">Báo Giá Thương Mại</div>
            <div className="text-3xs text-amber-800 leading-snug">
              Thống nhất cấu hình máy & mức ngân sách đầu tư
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 opacity-80">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                BƯỚC 2
              </span>
              <FileCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xs font-bold text-slate-800">Ký Hợp Đồng Kinh Tế</div>
            <div className="text-3xs text-slate-600 leading-snug">
              Xác lập điều khoản pháp lý, tiến độ & cọc khởi động
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 opacity-80">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                BƯỚC 3
              </span>
              <Wrench className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xs font-bold text-slate-800">Chế Tạo Tại Xưởng SGM</div>
            <div className="text-3xs text-slate-600 leading-snug">
              Gia công khung sườn, trục cán, ráp tủ điện PLC
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 opacity-80">
            <div className="flex items-center justify-between">
              <span className="text-3xs font-bold text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                BƯỚC 4
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xs font-bold text-slate-800">Bàn Giao Vận Hành</div>
            <div className="text-3xs text-slate-600 leading-snug">
              Xe cẩu giao xưởng, dập tôn mẫu & chuyển giao công nghệ
            </div>
          </div>
        </div>
      </div>

      {/* 3. Product Specification Table - High Density Spec Strip 34px & Full Names */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">Danh Mục Thiết Bị & Quy Cách Kỹ Thuật</h2>
          </div>
          <span className="text-2xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-sans tabular-nums">
            {products.length} hạng mục
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {products.map((item: any, idx: number) => {
            const qty = Number(item.soLuong) || 1;
            const price = Number(item.donGia) || 0;
            const lineTotal = Number(item.thanhTien) || qty * price;
            const productName = item.tenSanPham || item.tenHangHoa || item.name || 'Thiết bị cơ khí SGM';
            const classification = item.loai || item.phanLoai || 'Máy móc/Thiết bị';
            const unit = item.dvt || item.donViTinh || 'Bộ';
            const warranty = item.baoHanh || `${SGM_COMPANY_INFO.warrantyStandardMonths} tháng`;

            return (
              <div key={idx} className="py-3.5 space-y-2">
                {/* Full, un-truncated product name */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-3xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-sans tabular-nums">
                        #{idx + 1}
                      </span>
                      <h3 className="text-xs md:text-sm font-bold text-slate-900 leading-snug break-words">
                        {productName}
                      </h3>
                    </div>
                    {item.quyCach && (
                      <p className="text-2xs text-slate-700 pl-6 leading-relaxed">
                        {item.quyCach}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0 pl-6 sm:pl-0">
                    <div className="text-xs md:text-sm font-bold text-slate-900 font-sans tabular-nums">
                      {formatCurrency(lineTotal)}
                    </div>
                    <div className="text-3xs text-slate-600 font-sans tabular-nums">
                      Đơn giá: {formatCurrency(price)}
                    </div>
                  </div>
                </div>

                {/* High-Density Spec Strip (34px compact height, mobile-optimized) */}
                <div className="h-[34px] bg-slate-50/80 border border-slate-200/80 rounded-lg px-3 flex items-center justify-between text-2xs text-slate-700 font-medium">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="text-3xs text-slate-600">Phân loại:</span>
                      <strong className="text-blue-800 font-semibold">{classification}</strong>
                    </span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center gap-1">
                      <span className="text-3xs text-slate-600">Bảo hành:</span>
                      <strong className="text-emerald-800 font-semibold">{warranty}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-sans tabular-nums">
                    <span className="text-3xs text-slate-600">Số lượng:</span>
                    <strong className="text-slate-900 font-bold">{qty} {unit}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pricing Subtotal Breakdown */}
        <div className="bg-slate-50/90 rounded-xl p-4 space-y-2 border border-slate-200/80">
          <div className="flex justify-between text-xs text-slate-700">
            <span>Tiền hàng (chưa VAT):</span>
            <span className="font-semibold text-slate-900 font-sans tabular-nums">{formatCurrency(subTotal)}</span>
          </div>
          {vatAmount > 0 && (
            <div className="flex justify-between text-xs text-slate-700">
              <span>Thuế GTGT (VAT):</span>
              <span className="font-semibold text-slate-900 font-sans tabular-nums">{formatCurrency(vatAmount)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
            <span className="font-bold text-slate-900">Tổng thanh toán dự toán:</span>
            <span className="text-base font-bold text-amber-800 font-sans tabular-nums">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* 4. Commercial Terms & PIC (Kỹ Sư Phụ Trách) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* PIC Profile */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <User className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Kỹ Sư Phụ Trách Tư Vấn Dự Án
            </h3>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              {quotation?.nguoiPhuTrach ? quotation.nguoiPhuTrach.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900">
                {quotation?.nguoiPhuTrach || 'Phòng Kỹ Thuật Công Nghệ SGM'}
              </div>
              <div className="text-2xs text-slate-600">
                Chuyên viên tư vấn giải pháp máy cán & gia công kim loại
              </div>
            </div>
          </div>

          <div className="pt-1 flex items-center gap-2">
            <a
              href={`tel:${SGM_COMPANY_INFO.hotlineSupport || SGM_COMPANY_INFO.hotline}`}
              className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
              <span>Hotline {SGM_COMPANY_INFO.hotlineSupport || SGM_COMPANY_INFO.hotline}</span>
            </a>
            <button
              type="button"
              onClick={onContactZalo}
              className="py-2 px-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Zalo OA</span>
            </button>
          </div>
        </div>

        {/* Commercial Terms from noiDungGhiChu */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Điều Khoản Kỹ Thuật & Xuất Xưởng
            </h3>
          </div>

          <div className="text-2xs text-slate-700 space-y-1.5 leading-relaxed">
            {quotation?.noiDungGhiChu ? (
              <p className="whitespace-pre-line">{quotation.noiDungGhiChu}</p>
            ) : (
              <>
                <p>• <strong>Bảo hành:</strong> 24 tháng kết cấu máy, 12 tháng hệ thống điều khiển PLC & động cơ.</p>
                <p>• <strong>Địa điểm giao:</strong> Xuất xưởng tại Nhà máy SGM (KCN Tân Tạo, TP.HCM) hoặc hỗ trợ cẩu giao tận xưởng khách hàng.</p>
                <p>• <strong>Chuyển giao:</strong> Kỹ sư SGM trực tiếp hướng dẫn chạy máy, cân chỉnh dao cắt và bàn giao công nghệ hoàn chỉnh.</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5. Primary Decision Action Card (Chốt Deal) */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Quý Khách Hài Lòng Với Dự Toán & Muốn Triển Khai?
            </h3>
          </div>
          <p className="text-xs text-slate-700 max-w-xl">
            Nhấn nút bên dưới để xác nhận chấp thuận dự toán. Bộ phận pháp chế SGM sẽ tiến hành soạn thảo dự thảo Hợp Đồng Kinh Tế chính thức gửi đến Quý Khách trong vòng 2 giờ làm việc.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAgreeClick}
            disabled={agreed}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              agreed
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-amber-600 hover:bg-amber-700 text-white hover:shadow-md'
            }`}
          >
            {agreed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Đã Gửi Yêu Cầu Thành Công
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Đồng Ý Báo Giá & Yêu Cầu Lập HĐ
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
