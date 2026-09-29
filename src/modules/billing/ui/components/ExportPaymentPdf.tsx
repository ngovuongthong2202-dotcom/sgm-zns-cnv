import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Button } from '@/src/design-system/Button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';

interface ExportPaymentPdfProps {
  payment: Payment;
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  className?: string;
  label?: string;
}

export function ExportPaymentPdf({
  payment,
  variant = 'secondary',
  className = '',
  label = 'In Phiếu Thu'
}: ExportPaymentPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Phieu_Thu_${payment.paymentId || 'Draft'}`,
  });

  const soTien = payment.soTien || 0;
  const totalAmount = payment.totalAmount || payment.giaTriHopDong || 0;
  const remaining = Math.max(0, totalAmount - soTien);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <>
      <Button
        aria-label="Export Payment PDF"
        variant={variant}
        onClick={() => handlePrint()}
        className={`flex items-center gap-2 font-medium text-xs ${className}`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>{label}</span>
      </Button>

      {/* Hidden Print Container for A4 Print Engine */}
      <div className="hidden">
        <div
          ref={printRef}
          className="p-12 text-slate-900 bg-white font-sans relative min-h-[1123px] w-[794px] overflow-hidden text-xs leading-relaxed select-none"
        >
          {/* Header doanh nghiệp */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start gap-3">
              <img src="/sgm-logo.png" alt="SGM Logo" className="h-14 w-auto object-contain shrink-0" />
              <div>
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">{SGM_COMPANY_INFO.name}</h1>
                <p className="text-3xs text-slate-500 font-medium mt-0.5 leading-tight">
                  {SGM_COMPANY_INFO.address}<br />
                  MST: <span className="font-mono font-bold">{SGM_COMPANY_INFO.taxCode}</span> | Hotline: <span className="font-mono font-bold">{SGM_COMPANY_INFO.hotline}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 block">
                Mã PT: {payment.paymentId || 'PT-CHUA-LUU'}
              </span>
              <p className="text-3xs text-slate-500 font-semibold mt-1">
                Ngày thu: <span className="font-mono text-slate-900">{formatDate(payment.ngayThanhToan || payment.createdAt || new Date())}</span>
              </p>
            </div>
          </div>

          {/* Tiêu đề biểu mẫu */}
          <div className="text-center my-6">
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-900">PHIẾU THU TIỀN / BIÊN LAI THANH TOÁN</h2>
            <p className="text-2xs text-slate-600 italic font-medium mt-0.5">
              (Liên 2: Giao khách hàng và lưu trữ hồ sơ tài chính đối soát SGM)
            </p>
          </div>

          {/* Nội dung chi tiết phiếu thu */}
          <div className="space-y-4 mb-8 p-6 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">Đơn vị / Khách hàng nộp:</span>
              <strong className="text-slate-950 font-bold">{payment.tenKhachHang || '---'}</strong>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">Họ và tên người nộp:</span>
              <strong className="text-slate-900">{payment.tenNguoiNop || (payment as any).nguoiDaiDien || 'Theo ủy nhiệm'}</strong>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">Số điện thoại liên hệ:</span>
              <span className="font-mono font-bold text-slate-900">{payment.sdt || '---'}</span>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">Căn cứ chứng từ:</span>
              <div className="text-right">
                {payment.soHopDong && <span className="font-mono font-bold text-blue-900 mr-3">HĐ: {payment.soHopDong}</span>}
                {payment.soDonHang && <span className="font-mono font-bold text-slate-800 mr-3">ĐH: {payment.soDonHang}</span>}
                {payment.soPhieuBaoGia && <span className="font-mono font-bold text-emerald-800">BG: {payment.soPhieuBaoGia}</span>}
              </div>
            </div>

            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-600">Hình thức thanh toán:</span>
              <span className="font-semibold text-slate-900">{payment.phuongThucThanhToan || 'Chuyển khoản'}</span>
            </div>

            {payment.soChungTu && (
              <div className="flex justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-600">Số Ủy Nhiệm Chi / Chứng từ ngân hàng:</span>
                <span className="font-mono font-bold text-blue-800">{payment.soChungTu}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-slate-200 pb-2 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
              <span className="font-bold text-emerald-950 uppercase text-xs">SỐ TIỀN THỰC THU:</span>
              <strong className="font-mono font-black text-emerald-900 text-sm">{formatCurrency(soTien)}</strong>
            </div>

            <p className="text-2xs text-slate-700 italic">
              Bằng chữ: <strong>{readVietnameseCurrency(soTien)}</strong>
            </p>

            {totalAmount > 0 && (
              <div className="pt-2 text-2xs flex justify-between text-slate-600">
                <span>Tổng giá trị đơn hàng: <strong className="font-mono">{formatCurrency(totalAmount)}</strong></span>
                <span>Công nợ còn lại sau đợt này: <strong className="font-mono text-amber-800">{formatCurrency(remaining)}</strong></span>
              </div>
            )}

            {payment.ghiChu && (
              <div className="pt-2 text-2xs text-slate-600">
                <span className="font-bold">Ghi chú nội dung thu:</span> {payment.ghiChu}
              </div>
            )}
          </div>

          {/* Chữ ký các bên */}
          <div className="grid grid-cols-3 gap-6 text-center pt-8 border-t border-slate-200">
            <div>
              <p className="font-bold uppercase text-slate-900">NGƯỜI NỘP TIỀN</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{payment.tenNguoiNop || (payment as any).nguoiDaiDien || 'Người nộp'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">KẾ TOÁN THU TIỀN</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký và ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{payment.nguoiPhuTrach || 'Kế toán SGM'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">THỦ QUỸ / BAN GIÁM ĐỐC</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký tên và đóng dấu)</p>
              <p className="font-bold text-slate-900">{SGM_COMPANY_INFO.legalRepresentative}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
