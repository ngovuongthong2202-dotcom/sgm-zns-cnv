import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Button } from '@/src/design-system/Button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';

interface ExportQuotationPdfProps {
  quotation: Quotation;
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  className?: string;
  label?: string;
}

export function ExportQuotationPdf({ quotation, variant = 'secondary', className = '', label = 'In / PDF' }: ExportQuotationPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bao_Gia_${quotation.soPhieuBaoGia || 'Draft'}`,
  });

  // Calculate items locally to ensure exact tabular-nums layout
  const items = quotation.products || [];
  
  const { totalGross: subtotal, totalDiscount: discount, totalVat: vatAmount, totalAfterTax: total } = aggregateProducts(items);
  const vatRate = quotation.vatRate ?? 10;

  const isDraft = quotation.tinhTrangBaoGia !== 'ĐÃ CHỐT';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <>
      <Button
        aria-label="Export PDF"
        variant={variant}
        onClick={() => handlePrint()}
        className={`flex items-center gap-2 font-medium text-xs ${className}`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>{label}</span>
      </Button>

      {/* Hidden Print Area */}
      <div className="hidden">
        <div ref={printRef} className="p-12 text-slate-900 bg-white font-sans relative min-h-[1123px] w-[794px] overflow-hidden text-sm leading-relaxed select-none">
          {/* Watermark for Draft status */}
          {isDraft && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                fontSize: '80px',
                fontWeight: 900,
                color: 'rgba(239, 68, 68, 0.08)',
                pointerEvents: 'none',
                textTransform: 'uppercase',
                letterSpacing: '12px',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                zIndex: 0,
                border: '12px solid rgba(239, 68, 68, 0.08)',
                padding: '20px 40px',
                borderRadius: '24px'
              }}
            >
              BẢN NHÁP
            </div>
          )}

          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 relative z-10">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">SGM VIỆT NAM</h1>
              <p className="text-xs text-slate-500 mt-1 font-semibold max-w-sm">
                Nhà cung cấp máy móc thiết bị và vật tư vận hành B2B hàng đầu.<br />
                Đường số 4, KCN Hòa Khánh, Liên Chiểu, Đà Nẵng. <br />
                Hotline: 1900 6067 | Email: contact@sgm.vn
              </p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wide">BÁO GIÁ THƯƠNG MẠI</h2>
              <div className="mt-2 text-xs space-y-1 font-semibold text-slate-600">
                <p>Số BG: <span className="font-mono text-slate-900 font-bold">{quotation.soPhieuBaoGia || 'DRAFT-XXX'}</span></p>
                <p>Ngày lập: <span className="text-slate-950 font-mono">{formatDate(quotation.ngayBaoGia)}</span></p>
                <p>Hiệu lực: <span className="text-slate-950 font-mono">{quotation.hieuLuc || 30} ngày</span> từ ngày lập</p>
              </div>
            </div>
          </div>

          {/* Party details */}
          <div className="grid grid-cols-2 gap-8 mb-8 relative z-10">
            <div className="space-y-1.5">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">ĐƠN VỊ NHẬN BÁO GIÁ</h3>
              <p className="font-bold text-base text-slate-950">{quotation.tenKhachHang || 'Khách hàng Không tên'}</p>
              {quotation.maKh && <p className="text-xs text-slate-600 font-semibold">Mã KH: <span className="font-mono text-slate-900">{quotation.maKh}</span></p>}
              {quotation.nguoiDaiDien && <p className="text-xs text-slate-600 font-semibold">Người liên hệ: <span className="text-slate-905">{quotation.nguoiDaiDien}</span></p>}
              {quotation.sdt && <p className="text-xs text-slate-600 font-semibold">Điện thoại: <span className="font-mono text-slate-905">{quotation.sdt}</span></p>}
            </div>
            <div className="space-y-1.5 border-l border-slate-100 pl-8">
              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider mb-2">ĐẠI DIỆN THƯƠNG MẠI</h3>
              <p className="font-bold text-slate-950">{quotation.nguoiPhuTrach || 'Đại diện SGM OS'}</p>
              <p className="text-xs text-slate-600 font-semibold">Bộ phận: <span className="text-slate-900">Ban Phát Triển Kinh Doanh B2B</span></p>
              <p className="text-xs text-slate-600 font-semibold">Phân loại báo giá: <span className="text-slate-900 font-bold">{quotation.loai || 'Vật tư'}</span></p>
            </div>
          </div>

          {/* Products Table */}
          <div className="mb-8 relative z-10">
            <table className="w-full border-collapse border-b-2 border-slate-900 text-slate-800">
              <thead>
                <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-900 text-slate-905 font-bold uppercase tracking-wider text-2xs h-10">
                  <th className="px-3 py-1 text-center w-12">STT</th>
                  <th className="px-3 py-1 text-left">Mô tả sản phẩm dịch vụ</th>
                  <th className="px-3 py-1 text-center w-20">ĐVT</th>
                  <th className="px-3 py-1 text-right w-20">SL</th>
                  <th className="px-3 py-1 text-right w-32">Đơn giá</th>
                  <th className="px-3 py-1 text-right w-36">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-xs italic text-slate-500">
                      Không có chi tiết sản phẩm nào được khai báo.
                    </td>
                  </tr>
                ) : (
                  items.map((p, index) => (
                    <tr key={index} className="h-10 text-xs">
                      <td className="px-3 py-1 text-center font-mono text-slate-500">{index + 1}</td>
                      <td className="px-3 py-1 text-slate-900">
                        <p className="font-bold text-slate-950">{p.productName || 'Không có tên'}</p>
                        {p.productId && <span className="text-2xs text-slate-500 font-mono tracking-tight">Mã SP: {p.productId}</span>}
                      </td>
                      <td className="px-3 py-1 text-center text-slate-600">{p.unit || 'Cái'}</td>
                      <td className="px-3 py-1 text-right font-mono text-slate-900 tabular-nums">{p.quantity || 1}</td>
                      <td className="px-3 py-1 text-right font-mono text-slate-900 tabular-nums">{formatCurrency(p.price || 0)}</td>
                      <td className="px-3 py-1 text-right font-mono text-slate-950 tabular-nums font-bold">
                        {formatCurrency((p.price || 0) * (p.quantity || 1))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Financial summary card logic inside the printed shape */}
          <div className="flex justify-end mb-12 relative z-10">
            <div className="w-96 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Cộng tiền hàng (Tạm tính):</span>
                <span className="font-mono text-slate-900 tabular-nums font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Chiết khấu thương mại:</span>
                  <span className="font-mono tabular-nums font-bold">-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-slate-600 border-b border-dashed border-slate-100 pb-2">
                <span>Thuế giá trị gia tăng ({vatRate}%):</span>
                <span className="font-mono text-slate-900 tabular-nums font-bold">+{formatCurrency(vatAmount)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-950 font-black pt-1 border-t-2 border-slate-900">
                <span>TỔNG THANH TOÁN:</span>
                <span className="font-mono text-blue-700 text-base tabular-nums">{formatCurrency(total)}</span>
              </div>
              <div className="text-3xs italic text-slate-600 text-right pt-0.5 leading-tight">
                (Bằng chữ: {readVietnameseCurrency(total)})
              </div>
            </div>
          </div>

          {/* Print note */}
          <div className="text-2xs text-slate-500 font-semibold mb-16 space-y-1 py-4 px-5 bg-slate-50 border border-slate-100 rounded-xl relative z-10 leading-snug">
            <p className="font-bold border-b border-slate-200/60 pb-1 mb-1.5 uppercase text-slate-6 tracking-wide">Điều khoản giao dịch đi kèm:</p>
            <p>1. Thanh toán: Tạm ứng 30% khi đặt hàng, thanh toán 70% còn lại trong vòng 07 ngày làm việc kể từ ngày giao nhận hàng hóa.</p>
            <p>2. Vận chuyển: Miễn phí vận chuyển đến chân công trình trong phạm vi nội thành bán kính 15km.</p>
            <p>3. Bảo hành: Bảo hành chính hãng 12 tháng theo quy định nhà sản xuất áp dụng trên các hạng mục thiết bị cơ học.</p>
          </div>

          {/* Signatures */}
          <table className="w-full relative z-10 font-bold border-none mt-auto pt-8">
            <tbody>
              <tr>
                <td className="text-center w-1/2 align-top">
                  <p className="uppercase text-slate-500 text-2xs tracking-widest mb-1 pb-1">ĐẠI DIỆN KHÁCH HÀNG</p>
                  <p className="text-xs text-slate-500 italic font-medium">Ký, ghi rõ họ tên và đóng dấu</p>
                  <div className="h-28"></div>
                </td>
                <td className="text-center w-1/2 align-top">
                  <p className="uppercase text-slate-500 text-2xs tracking-widest mb-1 pb-1">ĐẠI DIỆN SGM VIỆT NAM</p>
                  <p className="text-xs text-slate-500 italic font-medium">Người lập phiếu ký duyệt</p>
                  <div className="h-28 flex items-center justify-center">
                    {/* Visual signature when NOT a draft for professional presentation */}
                    {!isDraft && (
                      <div className="border border-emerald-500 bg-emerald-500/5 px-4 py-1.5 rounded-lg text-emerald-600 italic text-2xs tracking-tight transform -rotate-3 select-none">
                        <p className="font-black text-center text-xs tracking-wider">SGM OS SIGNED</p>
                        <p className="text-3xs font-mono text-center">Digitally Approved</p>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-900 text-xs font-black">{quotation.nguoiPhuTrach || 'Đỗ Văn Thành'}</p>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Footer of A4 */}
          <div className="absolute bottom-12 left-12 right-12 border-t border-slate-100 pt-6 flex justify-between text-2xs font-mono font-bold text-slate-500">
            <span>Mã tham chiếu: {quotation.soPhieuBaoGia || 'DRAFT'} - {quotation.tenKhachHang || ''}</span>
            <span>Trang 1 / 1</span>
            <span>Powered by SGM OS Enterprise Platform</span>
          </div>
        </div>
      </div>
    </>
  );
}
