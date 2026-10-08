import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Button } from '@/src/design-system/Button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

interface ExportContractPdfProps {
  contract: Contract;
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  className?: string;
  label?: string;
}

export function ExportContractPdf({
  contract,
  variant = 'secondary',
  className = '',
  label = 'In / Xuất HĐ'
}: ExportContractPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Hop_Dong_${contract.soHopDong || 'Draft'}`,
  });

  const products = contract.products || [];
  const financialSummary = aggregateProducts(products);
  const totalAmount = contract.totalAmount || (contract as any).giaTriHopDong || financialSummary.totalAfterTax || 0;
  const subtotalGross = financialSummary.totalGross || totalAmount;
  const totalDiscount = financialSummary.totalDiscount || 0;
  const totalVat = financialSummary.totalVat || 0;
  const effectiveVatRate = financialSummary.effectiveVatRate || 0;
  const isDraft = contract.tinhTrangHopDong !== 'ĐÃ KÝ';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <>
      <Button
        aria-label="Export Contract PDF"
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
          {/* Watermark for Draft */}
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

          {/* Quốc hiệu & Tiêu ngữ */}
          <div className="text-center mb-6 pb-4 border-b border-slate-200">
            <h3 className="font-black text-xs uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p className="text-2xs font-bold underline underline-offset-4 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
          </div>

          {/* Header Doanh Nghiệp & Tiêu đề Hợp đồng */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-3">
              <img src="/sgm-logo.png" alt="SGM Logo" className="h-14 w-auto object-contain shrink-0" />
              <div>
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">{SGM_COMPANY_INFO.name}</h1>
                <p className="text-3xs text-slate-500 font-medium mt-0.5 leading-tight">
                  {SGM_COMPANY_INFO.address}<br />
                  MST: <span className="font-sans tabular-nums font-bold">{SGM_COMPANY_INFO.taxCode}</span> | Hotline: <span className="font-sans tabular-nums font-bold">{SGM_COMPANY_INFO.hotline}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-sans tabular-nums text-xs font-black text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 block">
                Số: {contract.soHopDong || 'HD-CHUA-LUU'}
              </span>
              <p className="text-3xs text-slate-500 font-semibold mt-1">
                Ngày: <span className="font-sans tabular-nums text-slate-900">{formatDate(contract.ngayKy || (contract as any).ngayTao || new Date())}</span>
              </p>
            </div>
          </div>

          <div className="text-center my-6">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">HỢP ĐỒNG KINH TẾ</h2>
            <p className="text-2xs text-slate-600 italic font-medium mt-0.5">
              (V/v: Chế tạo, cung cấp máy móc thiết bị cơ khí công nghiệp & chuyển giao công nghệ)
            </p>
          </div>

          {/* Các bên tham gia hợp đồng */}
          <div className="grid grid-cols-2 gap-6 mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-2xs">
            {/* BÊN A (BÊN BÁN) */}
            <div className="space-y-1">
              <h4 className="font-black text-blue-900 uppercase border-b border-slate-200 pb-1">BÊN A (BÊN BÁN):</h4>
              <p className="font-bold text-slate-900">{SGM_COMPANY_INFO.name}</p>
              <p><span className="text-slate-500">Địa chỉ:</span> {SGM_COMPANY_INFO.address}</p>
              <p><span className="text-slate-500">MST:</span> <strong className="font-sans tabular-nums">{SGM_COMPANY_INFO.taxCode}</strong></p>
              <p><span className="text-slate-500">Đại diện:</span> <strong>{SGM_COMPANY_INFO.legalRepresentative}</strong> - Chức vụ: {SGM_COMPANY_INFO.position}</p>
              <p><span className="text-slate-500">Tài khoản:</span> <span className="font-sans tabular-nums font-bold">{SGM_COMPANY_INFO.bankAccount.accountNumber}</span> tại {SGM_COMPANY_INFO.bankAccount.bankName}</p>
            </div>

            {/* BÊN B (BÊN MUA) */}
            <div className="space-y-1">
              <h4 className="font-black text-slate-900 uppercase border-b border-slate-200 pb-1">BÊN B (BÊN MUA):</h4>
              <p className="font-bold text-slate-900">{contract.tenKhachHang || 'Chưa cập nhật tên bên mua'}</p>
              <p><span className="text-slate-500">Địa chỉ:</span> {(contract as any).diaChiGiaoHang || (contract as any).diaChi || 'Theo đăng ký kinh doanh'}</p>
              <p><span className="text-slate-500">MST / CCCD:</span> <strong className="font-sans tabular-nums">{(contract as any).maSoThue || (contract as any).cccd || '---'}</strong></p>
              <p><span className="text-slate-500">Đại diện:</span> <strong>{contract.nguoiDaiDien || 'Theo ủy quyền'}</strong> - Chức vụ: {(contract as any).chucVu || 'Đại diện hợp pháp'}</p>
              <p>
                <span className="text-slate-500">Điện thoại:</span>{' '}
                <span className="font-sans tabular-nums font-bold">
                  {(() => {
                    if (!contract.sdt) return '---';
                    const ext = extractVietnamesePhones(contract.sdt);
                    if (ext.phones.length === 0) return contract.sdt;
                    return ext.phones.map(p => `${p.formatted}${p.type === 'LANDLINE' ? ' (Bàn)' : ' (DĐ)'}`).join(' - ');
                  })()}
                </span>
              </p>
            </div>
          </div>

          {/* ĐIỀU 1: DANH MỤC THIẾT BỊ VÀ GIÁ TRỊ HỢP ĐỒNG */}
          <div className="mb-6 space-y-2">
            <h4 className="font-bold text-xs text-slate-900 uppercase">ĐIỀU 1: DANH MỤC HÀNG HÓA & GIÁ TRỊ HỢP ĐỒNG</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-2xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-700">
                  <tr>
                    <th className="p-2 w-8 text-center">STT</th>
                    <th className="p-2">Tên Thiết Bị / Model Cấu Hình</th>
                    <th className="p-2 w-16 text-center">ĐVT</th>
                    <th className="p-2 w-16 text-center">SL</th>
                    <th className="p-2 w-28 text-right">Đơn Giá</th>
                    <th className="p-2 w-32 text-right">Thành Tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {products.map((item, idx) => {
                    const line = computeLineItem(item);
                    const rowPrice = line.price || 0;
                    const lineTotal = line.subtotalAfterDiscount ?? (line.quantity * rowPrice);
                    return (
                      <tr key={idx}>
                        <td className="p-2 text-center text-slate-500 font-sans tabular-nums">{idx + 1}</td>
                        <td className="p-2 font-medium">
                          <span className="font-bold text-slate-900">{line.productName || item.productName}</span>
                          {(item as any).description && <p className="text-3xs text-slate-500 mt-0.5">{(item as any).description}</p>}
                        </td>
                        <td className="p-2 text-center text-slate-600">{line.unit || item.unit || 'Máy'}</td>
                        <td className="p-2 text-center font-bold font-sans tabular-nums">{line.quantity}</td>
                        <td className="p-2 text-right font-sans tabular-nums">{formatCurrency(rowPrice)}</td>
                        <td className="p-2 text-right font-bold font-sans tabular-nums text-slate-900">
                          {formatCurrency(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                  {totalDiscount > 0 && (
                    <tr className="bg-slate-50 text-slate-700 font-medium border-t border-slate-200">
                      <td colSpan={5} className="p-2 text-right">Cộng tiền hàng (Tạm tính):</td>
                      <td className="p-2 text-right font-sans tabular-nums font-medium">{formatCurrency(subtotalGross || 0)}</td>
                    </tr>
                  )}
                  {totalDiscount > 0 && (
                    <tr className="bg-amber-50/50 text-amber-800 font-medium">
                      <td colSpan={5} className="p-2 text-right">Chiết khấu thương mại:</td>
                      <td className="p-2 text-right font-sans tabular-nums font-bold">-{formatCurrency(totalDiscount)}</td>
                    </tr>
                  )}
                  {totalVat > 0 && (
                    <tr className="bg-slate-50 text-slate-700 font-medium">
                      <td colSpan={5} className="p-2 text-right">Thuế giá trị gia tăng ({effectiveVatRate > 0 ? `${effectiveVatRate}%` : 'VAT'}):</td>
                      <td className="p-2 text-right font-sans tabular-nums font-medium">+{formatCurrency(totalVat)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                    <td colSpan={5} className="p-2 text-right uppercase text-slate-900">Tổng Giá Trị Hợp Đồng (Đã bao gồm VAT & Bàn Giao):</td>
                    <td className="p-2 text-right font-black font-sans tabular-nums text-emerald-900 text-xs">
                      {formatCurrency(totalAmount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-2xs text-slate-700 italic font-medium">
              Bằng chữ: <strong>{readVietnameseCurrency(totalAmount)}</strong>
            </p>
          </div>

          {/* ĐIỀU 2 & 3: TIẾN ĐỘ THANH TOÁN & BẢO HÀNH */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-2xs">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-xs text-slate-900 uppercase">ĐIỀU 2: TIẾN ĐỘ THANH TOÁN</h4>
              <p>• <strong>Đợt 1 (Đặt cọc sản xuất):</strong> Thanh toán 30% giá trị ngay sau khi ký hợp đồng để chuẩn bị vật tư và khởi động quy trình gia công.</p>
              <p>• <strong>Đợt 2 (Trước khi xuất xưởng):</strong> Thanh toán tiếp đến 90% khi máy hoàn thiện tại xưởng SGM trước khi vận chuyển.</p>
              <p>• <strong>Đợt 3 (Bàn giao & Nghiệm thu):</strong> Thanh toán 10% còn lại trong vòng 07 ngày kể từ khi ký Biên bản nghiệm thu.</p>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <h4 className="font-bold text-xs text-slate-900 uppercase">ĐIỀU 3: BẢO HÀNH & KỸ THUẬT</h4>
              <p>• <strong>Thời hạn bảo hành:</strong> {(contract as any).thoiGianBaoHanh || SGM_COMPANY_INFO.warrantyStandardMonths} tháng theo tiêu chuẩn chính hãng SGM.</p>
              <p>• <strong>Cam kết hỗ trợ:</strong> Đội ngũ kỹ sư SGM xử lý sự cố trong vòng 24h đối với khu vực Miền Nam và 48h trên toàn quốc.</p>
              <p>• Miễn phí hướng dẫn vận hành, chuyển giao công nghệ và bảo dưỡng định kỳ trong thời gian bảo hành.</p>
            </div>
          </div>

          {/* CHỮ KÝ CÁC BÊN */}
          <div className="grid grid-cols-2 gap-8 text-center pt-6 border-t border-slate-200">
            <div>
              <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN B</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký tên, đóng dấu và ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{contract.nguoiDaiDien || 'Đại diện pháp luật'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN A</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký tên, đóng dấu và ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{SGM_COMPANY_INFO.legalRepresentative}</p>
              <p className="text-3xs text-slate-500 font-semibold">{SGM_COMPANY_INFO.position}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
