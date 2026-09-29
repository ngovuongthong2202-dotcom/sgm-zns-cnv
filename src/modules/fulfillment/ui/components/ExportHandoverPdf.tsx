import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Button } from '@/src/design-system/Button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

interface ExportHandoverPdfProps {
  delivery: Delivery;
  variant?: 'default' | 'primary' | 'secondary' | 'dark' | 'subtle' | 'ghost' | 'danger' | 'link';
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
    documentTitle: `Bien_Ban_Nghiem_Thu_${delivery.deliveryId || delivery.soPhieuXuat || 'Draft'}`,
  });

  const products = delivery.products || [];

  return (
    <>
      <Button
        aria-label="Export Handover PDF"
        variant={variant as any}
        onClick={() => handlePrint()}
        className={`flex items-center gap-1.5 font-bold text-xs h-9 ${className}`}
      >
        <Printer className="w-3.5 h-3.5" />
        <span>{label}</span>
      </Button>

      {/* Hidden Print Container for A4 Print Engine */}
      <div className="hidden">
        <div
          ref={printRef}
          className="p-10 text-slate-900 bg-white font-sans relative min-h-[1123px] w-[794px] overflow-hidden text-xs leading-relaxed select-none"
        >
          {/* Quốc hiệu & Tiêu ngữ */}
          <div className="text-center mb-4 pb-2 border-b border-slate-200">
            <h3 className="font-black text-xs uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p className="text-2xs font-bold underline underline-offset-4 mt-0.5 text-slate-700">Độc lập - Tự do - Hạnh phúc</p>
          </div>

          {/* Header Doanh nghiệp */}
          <div className="flex justify-between items-start mb-5 pb-3 border-b border-slate-200">
            <div className="flex items-start gap-3.5">
              <img src="/sgm-logo.png" alt="SGM Logo" className="h-12 w-auto object-contain shrink-0 mt-0.5" />
              <div>
                <h1 className="text-xs font-black tracking-tight text-slate-900 uppercase">{SGM_COMPANY_INFO.name}</h1>
                <p className="text-3xs text-slate-600 font-medium mt-0.5 leading-tight max-w-sm">
                  {SGM_COMPANY_INFO.address}<br />
                  MST: <span className="font-mono font-bold text-slate-800">{SGM_COMPANY_INFO.taxCode}</span> | Hotline Kỹ thuật: <span className="font-mono font-bold text-slate-800">{SGM_COMPANY_INFO.hotline}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-2xs font-bold text-blue-900 bg-blue-50 px-2.5 py-1 rounded border border-blue-200 inline-block mb-1">
                Số: {delivery.deliveryId || delivery.soPhieuXuat || 'BBNT-CHUA-LUU'}
              </span>
              <p className="text-3xs text-slate-500 font-semibold">
                Ngày lập: <span className="font-mono text-slate-900">{formatDate(delivery.ngayGiaoThucTe || delivery.ngayGiaoMay || new Date())}</span>
              </p>
            </div>
          </div>

          <div className="text-center my-5">
            <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
              BIÊN BẢN BÀN GIAO & NGHIỆM THU KỸ THUẬT THIẾT BỊ
            </h2>
            <p className="text-3xs text-slate-600 italic font-medium mt-0.5">
              (Căn cứ theo Hợp đồng kinh tế số: <span className="font-bold text-slate-800">{delivery.soHopDong || '---'}</span> {delivery.soDonHang ? `| Đơn hàng: #${delivery.soDonHang}` : ''} và kết quả chạy thử nghiệm thu tại hiện trường)
            </p>
          </div>

          {/* Đại diện các bên tham gia nghiệm thu */}
          <div className="grid grid-cols-2 gap-4 mb-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 text-2xs">
            <div className="space-y-1">
              <h4 className="font-black text-blue-900 uppercase border-b border-slate-200 pb-1">ĐẠI DIỆN BÊN GIAO (SGM):</h4>
              <p><strong className="text-slate-700">Đơn vị:</strong> <span className="font-bold text-slate-900">{SGM_COMPANY_INFO.name}</span></p>
              <p><strong className="text-slate-700">Kỹ thuật viên bàn giao:</strong> <span className="font-bold text-slate-900">{delivery.thoGiaoMay || 'Kỹ thuật viên SGM'}</span></p>
              <p><strong className="text-slate-700">Số điện thoại KTV:</strong> <span className="font-mono font-bold text-slate-800">{delivery.sdtThoGiaoMay || SGM_COMPANY_INFO.hotline}</span></p>
              <p><strong className="text-slate-700">Phiếu xuất kho ERP:</strong> <span className="font-mono font-bold text-slate-800">{delivery.soPhieuXuat || '---'}</span></p>
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-slate-900 uppercase border-b border-slate-200 pb-1">ĐẠI DIỆN BÊN NHẬN (KHÁCH HÀNG):</h4>
              <p><strong className="text-slate-700">Khách hàng:</strong> <span className="font-bold text-slate-900">{delivery.tenKhachHang || 'Khách hàng tiếp nhận'}</span></p>
              <p><strong className="text-slate-700">Người ký nhận nghiệm thu:</strong> <span className="font-bold text-slate-900">{delivery.kyNhan || delivery.nguoiLienHe || 'Người nhận máy'}</span></p>
              <p><strong className="text-slate-700">Số điện thoại:</strong> <span className="font-mono font-bold text-slate-800">{delivery.sdtLienHe || delivery.sdt || '---'}</span></p>
              <p><strong className="text-slate-700">Địa điểm bàn giao:</strong> <span>{delivery.diaChiGiaoHang || 'Tại nhà xưởng / cơ sở khách hàng'}</span></p>
            </div>
          </div>

          {/* Bảng chi tiết danh mục bàn giao & Serial máy */}
          <div className="mb-5 space-y-1.5">
            <h4 className="font-bold text-2xs text-slate-900 uppercase tracking-wide">I. DANH MỤC THIẾT BỊ, DỊCH VỤ BÀN GIAO & TÌNH TRẠNG KỸ THUẬT</h4>
            <div className="border border-slate-300 rounded-lg overflow-hidden">
              <table className="w-full text-left border-collapse text-2xs">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-slate-800 text-3xs">
                  <tr>
                    <th className="p-2 w-8 text-center border-r border-slate-200">STT</th>
                    <th className="p-2 border-r border-slate-200">Tên Hàng Hóa / Model Cấu Hình</th>
                    <th className="p-2 w-14 text-center border-r border-slate-200">ĐVT</th>
                    <th className="p-2 w-14 text-center border-r border-slate-200">SL</th>
                    <th className="p-2 w-48 border-r border-slate-200">Mã Serial / Nhận Dạng</th>
                    <th className="p-2 w-28 text-center">Tình Trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {products.map((item, idx) => {
                    const itemType = item.itemType || detectItemType(item.productName, item.unit || (item as any).dvt);
                    const isMachine = itemType === 'MACHINE';
                    const serials = isMachine 
                      ? (Array.isArray(item.danhSachMaMay) && item.danhSachMaMay.length > 0
                          ? item.danhSachMaMay.join(', ')
                          : (delivery.danhSachMaMay?.length ? delivery.danhSachMaMay.join(', ') : 'Đã dán tem kiểm định SGM'))
                      : `Dịch vụ kỹ thuật${item.soNgayBaoHanh ? ` (BH: ${item.soNgayBaoHanh} ngày)` : ''}`;

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-600 font-mono border-r border-slate-200">{idx + 1}</td>
                        <td className="p-2 font-medium border-r border-slate-200">
                          <span className="font-bold text-slate-900">{item.productName}</span>
                          {item.productId && <span className="font-mono text-3xs text-slate-500 block">Mã: {item.productId}</span>}
                        </td>
                        <td className="p-2 text-center text-slate-600 border-r border-slate-200">{item.unit || (isMachine ? 'Bộ' : 'Gói')}</td>
                        <td className="p-2 text-center font-bold font-mono border-r border-slate-200">{item.quantity}</td>
                        <td className="p-2 font-mono text-slate-800 border-r border-slate-200">{serials}</td>
                        <td className="p-2 text-center font-semibold text-emerald-800 bg-emerald-50/40">
                          {isMachine ? 'Mới 100% Hoạt động tốt' : 'Hoàn thành tiêu chuẩn'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* II. KẾT LUẬN NGHIỆM THU */}
          <div className="mb-5 p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-2xs">
            <h4 className="font-bold text-2xs text-slate-900 uppercase tracking-wide">II. KẾT QUẢ KIỂM TRA & BÀN GIAO HIỆN TRƯỜNG</h4>
            <p>1. Thiết bị, hàng hóa bàn giao đầy đủ số lượng, linh kiện, phụ kiện theo đúng thỏa thuận hợp đồng.</p>
            <p>2. Đã tiến hành chạy thử nghiệm thu kỹ thuật, máy móc vận hành ổn định, êm ái, đạt độ chính xác tiêu chuẩn kỹ thuật SGM.</p>
            <p>3. Kỹ thuật viên SGM đã bàn giao tài liệu hướng dẫn kỹ thuật và hướng dẫn quy trình vận hành an toàn cho nhân sự của Khách hàng.</p>
            <p>4. Hai bên thống nhất ký biên bản nghiệm thu để làm căn cứ thực hiện nghĩa vụ bảo hành và thanh toán theo hợp đồng.</p>
          </div>

          {/* CHỮ KÝ CÁC BÊN */}
          <div className="grid grid-cols-4 gap-3 text-center pt-4 border-t border-slate-300 text-2xs">
            <div>
              <p className="font-bold uppercase text-slate-900 text-3xs">NGƯỜI LẬP BIÊN BẢN</p>
              <p className="text-3xs text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{delivery.nguoiPhuTrach || 'Phụ trách bàn giao'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900 text-3xs">THỦ KHO XUẤT</p>
              <p className="text-3xs text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{delivery.keToanKho || 'Thủ kho phụ trách'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900 text-3xs">KỸ THUẬT BÀN GIAO SGM</p>
              <p className="text-3xs text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{delivery.thoGiaoMay || 'Kỹ thuật viên'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900 text-3xs">ĐẠI DIỆN KHÁCH HÀNG</p>
              <p className="text-3xs text-slate-500 italic mb-14">(Ký, ghi rõ họ tên)</p>
              <p className="font-bold text-slate-900">{delivery.kyNhan || delivery.nguoiLienHe || 'Đại diện bên nhận'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

