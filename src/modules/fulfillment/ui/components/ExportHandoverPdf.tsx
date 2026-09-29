import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Button } from '@/src/design-system/Button';
import { ShieldCheck, Printer } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

interface ExportHandoverPdfProps {
  delivery: Delivery;
  variant?: 'default' | 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  className?: string;
  label?: string;
}

export function ExportHandoverPdf({
  delivery,
  variant = 'secondary',
  className = '',
  label = 'In BB Nghiệm Thu'
}: ExportHandoverPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bien_Ban_Nghiem_Thu_${delivery.deliveryId || 'Draft'}`,
  });

  const products = delivery.products || [];

  return (
    <>
      <Button
        aria-label="Export Handover PDF"
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
          {/* Quốc hiệu & Tiêu ngữ */}
          <div className="text-center mb-5 pb-3 border-b border-slate-200">
            <h3 className="font-black text-xs uppercase tracking-wider">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p className="text-2xs font-bold underline underline-offset-4 mt-0.5">Độc lập - Tự do - Hạnh phúc</p>
          </div>

          {/* Header Doanh nghiệp */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-start gap-3">
              <img src="/sgm-logo.png" alt="SGM Logo" className="h-14 w-auto object-contain shrink-0" />
              <div>
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">{SGM_COMPANY_INFO.name}</h1>
                <p className="text-3xs text-slate-500 font-medium mt-0.5 leading-tight">
                  {SGM_COMPANY_INFO.address}<br />
                  MST: <span className="font-mono font-bold">{SGM_COMPANY_INFO.taxCode}</span> | Hotline Kỹ thuật: <span className="font-mono font-bold">{SGM_COMPANY_INFO.hotline}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-xs font-black text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 block">
                Mã: {delivery.deliveryId || 'BBNT-CHUA-LUU'}
              </span>
              <p className="text-3xs text-slate-500 font-semibold mt-1">
                Ngày lập: <span className="font-mono text-slate-900">{formatDate(delivery.ngayGiaoThucTe || delivery.ngayGiaoMay || new Date())}</span>
              </p>
            </div>
          </div>

          <div className="text-center my-6">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              BIÊN BẢN BÀN GIAO & NGHIỆM THU KỸ THUẬT
            </h2>
            <p className="text-2xs text-slate-600 italic font-medium mt-0.5">
              (Căn cứ Hợp đồng số: {delivery.soHopDong || delivery.soDonHang || 'Thương mại SGM'} và thực tế kiểm tra vận hành tại hiện trường)
            </p>
          </div>

          {/* Đại diện các bên tham gia nghiệm thu */}
          <div className="grid grid-cols-2 gap-6 mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-2xs">
            <div className="space-y-1">
              <h4 className="font-black text-blue-900 uppercase border-b border-slate-200 pb-1">ĐẠI DIỆN BÊN GIAO (SGM):</h4>
              <p><strong className="text-slate-900">{SGM_COMPANY_INFO.name}</strong></p>
              <p>Kỹ thuật viên bàn giao: <strong>{delivery.thoGiaoMay || 'Kỹ thuật viên SGM'}</strong></p>
              <p>Số điện thoại KTV: <span className="font-mono">{delivery.sdtThoGiaoMay || SGM_COMPANY_INFO.hotline}</span></p>
              <p>Phiếu xuất kho ERP: <span className="font-mono">{delivery.soPhieuXuat || '---'}</span></p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-slate-900 uppercase border-b border-slate-200 pb-1">ĐẠI DIỆN BÊN NHẬN (KHÁCH HÀNG):</h4>
              <p><strong className="text-slate-900">{delivery.tenKhachHang || 'Khách hàng tiếp nhận'}</strong></p>
              <p>Đại diện nghiệm thu: <strong>{delivery.kyNhan || delivery.nguoiLienHe || 'Người nhận máy'}</strong></p>
              <p>Số điện thoại: <span className="font-mono">{delivery.sdtLienHe || delivery.sdt || '---'}</span></p>
              <p>Địa điểm bàn giao: <span>{delivery.diaChiGiaoHang || 'Tại nhà xưởng khách hàng'}</span></p>
            </div>
          </div>

          {/* Bảng chi tiết danh mục bàn giao & Serial máy */}
          <div className="mb-6 space-y-2">
            <h4 className="font-bold text-xs text-slate-900 uppercase">I. DANH MỤC THIẾT BỊ BÀN GIAO & TÌNH TRẠNG KỸ THUẬT</h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-2xs">
                <thead className="bg-slate-100 border-b border-slate-200 font-bold uppercase text-slate-700">
                  <tr>
                    <th className="p-2 w-8 text-center">STT</th>
                    <th className="p-2">Tên Thiết Bị / Model Cấu Hình</th>
                    <th className="p-2 w-16 text-center">ĐVT</th>
                    <th className="p-2 w-16 text-center">SL</th>
                    <th className="p-2 w-48">Mã Serial / Nhận Dạng</th>
                    <th className="p-2 w-28 text-center">Tình Trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {products.map((item, idx) => {
                    const itemType = item.itemType || detectItemType(item.productName, item.unit || (item as any).dvt);
                    const isMachine = itemType === 'MACHINE';
                    const serials = Array.isArray(item.danhSachMaMay) && item.danhSachMaMay.length > 0
                      ? item.danhSachMaMay.join(', ')
                      : (isMachine ? 'Đã dán tem kiểm định SGM' : '---');

                    return (
                      <tr key={idx}>
                        <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                        <td className="p-2 font-medium">
                          <span className="font-bold text-slate-900">{item.productName}</span>
                        </td>
                        <td className="p-2 text-center text-slate-600">{item.unit || (itemType === 'SERVICE' ? 'Gói' : 'Cái')}</td>
                        <td className="p-2 text-center font-bold font-mono">{item.quantity}</td>
                        <td className="p-2 font-mono text-slate-800">{serials}</td>
                        <td className="p-2 text-center font-semibold text-emerald-800 bg-emerald-50/50">Mới 100% Hoạt động tốt</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* II. KẾT LUẬN NGHIỆM THU */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-2xs">
            <h4 className="font-bold text-xs text-slate-900 uppercase">II. KẾT QUẢ KIỂM TRA & BÀN GIAO HIỆN TRƯỜNG</h4>
            <p>1. Thiết bị bàn giao đầy đủ số lượng, linh kiện, phụ kiện theo đúng thỏa thuận hợp đồng.</p>
            <p>2. Đã tiến hành chạy thử nghiệm, máy móc hoạt động êm ái, đúng thông số kỹ thuật và độ chính xác tiêu chuẩn.</p>
            <p>3. Kỹ thuật viên SGM đã bàn giao đầy đủ tài liệu hướng dẫn sử dụng, sơ đồ điện và đào tạo nhân viên vận hành an toàn.</p>
            <p>4. Hai bên thống nhất ký biên bản nghiệm thu để làm căn cứ thực hiện nghĩa vụ bảo hành và thanh toán theo quy định.</p>
          </div>

          {/* CHỮ KÝ CÁC BÊN */}
          <div className="grid grid-cols-2 gap-8 text-center pt-6 border-t border-slate-200">
            <div>
              <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN BÊN TIẾP NHẬN</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký tên và ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{delivery.kyNhan || delivery.nguoiLienHe || 'Đại diện bên nhận'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">ĐẠI DIỆN KỸ THUẬT SGM</p>
              <p className="text-3xs text-slate-500 italic mb-16">(Ký tên và ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{delivery.thoGiaoMay || 'Kỹ thuật viên bàn giao'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
