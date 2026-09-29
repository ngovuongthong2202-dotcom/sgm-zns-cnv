import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Button } from '@/src/design-system/Button';
import { Printer } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

interface ExportDeliveryPdfProps {
  delivery: Delivery;
  variant?: 'default' | 'primary' | 'secondary' | 'dark' | 'subtle' | 'ghost';
  className?: string;
  label?: string;
}

export function ExportDeliveryPdf({ 
  delivery, 
  variant = 'secondary', 
  className = '', 
  label = 'In / Xuất PDF' 
}: ExportDeliveryPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Phieu_Giao_Hang_${delivery.deliveryId || delivery.soPhieuXuat || 'Draft'}`,
  });

  const isService = delivery.loai === 'Dịch vụ';
  const products = delivery.products || [];
  const totalQuantity = products.reduce((acc, p) => acc + (Number(p.quantity) || 1), 0);

  return (
    <>
      <Button
        aria-label="Export Delivery PDF"
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
          className="p-10 text-slate-900 bg-white font-sans relative min-h-[1123px] w-[794px] overflow-hidden text-sm leading-relaxed select-none"
        >
          {/* Header doanh nghiệp */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
            <div className="flex items-start gap-4">
              <img src="/sgm-logo.png" alt="SGM Logo" className="h-14 w-auto object-contain shrink-0" />
              <div>
                <h1 className="text-sm font-black tracking-tight text-slate-900 uppercase">{SGM_COMPANY_INFO.name}</h1>
                <p className="text-2xs text-slate-600 mt-0.5 font-medium leading-normal max-w-sm">
                  {SGM_COMPANY_INFO.address}<br />
                  MST: <span className="font-mono font-bold">{SGM_COMPANY_INFO.taxCode}</span> | Hotline: <span className="font-mono font-bold">{SGM_COMPANY_INFO.hotline}</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded font-mono font-bold text-xs text-slate-900 mb-1.5">
                {delivery.deliveryId || 'PGH-CHUA-LUU'}
              </span>
              <p className="text-xs text-slate-600 font-semibold">
                Ngày in: <span className="font-mono text-slate-900">{formatDate(new Date())}</span>
              </p>
            </div>
          </div>

          {/* Tiêu đề biểu mẫu */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-black uppercase tracking-wider text-slate-900">
              {isService 
                ? 'BIÊN BẢN BÀN GIAO & NGHIỆM THU DỊCH VỤ KỸ THUẬT' 
                : 'PHIẾU XUẤT KHO KIÊM BIÊN BẢN BÀN GIAO THIẾT BỊ'}
            </h2>
            <p className="text-xs text-slate-600 italic mt-0.5">
              (Căn cứ hợp đồng thương mại / báo giá và điều phối vận tải logistics xuất xưởng SGM)
            </p>
          </div>

          {/* Thông tin chứng từ & Các bên giao nhận */}
          <div className="grid grid-cols-2 gap-6 mb-6 p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-xs">
            {/* Cột Bên A: Bên Giao Hàng (SGM) */}
            <div className="space-y-1.5">
              <h3 className="font-black text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>ĐƠN VỊ GIAO HÀNG (BÊN BÁN):</span>
              </h3>
              <p><strong className="text-slate-700">Đơn vị:</strong> {SGM_COMPANY_INFO.name}</p>
              <p><strong className="text-slate-700">Phiếu xuất ERP:</strong> <span className="font-mono font-bold">{delivery.soPhieuXuat || '---'}</span></p>
              <p><strong className="text-slate-700">Kho xuất hàng:</strong> {delivery.khoXuat || 'Kho tổng SGM Tân Tạo'}</p>
              <p><strong className="text-slate-700">Đơn vị vận chuyển:</strong> {delivery.donViVanChuyen || 'Đội xe chuyên dụng SGM'}</p>
              <p className="bg-amber-100/70 p-1.5 rounded border border-amber-300 font-medium">
                <strong className="text-amber-950 font-bold">Thợ giao máy / KTV:</strong> <span className="font-bold text-slate-900">{delivery.thoGiaoMay || 'Kỹ thuật viên SGM'}</span>
                {delivery.sdtThoGiaoMay && (
                  <span className="block mt-0.5 font-mono text-amber-950 font-bold">Hotline thợ: {delivery.sdtThoGiaoMay}</span>
                )}
              </p>
            </div>

            {/* Cột Bên B: Bên Nhận Hàng (Khách hàng) */}
            <div className="space-y-1.5">
              <h3 className="font-black text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>ĐƠN VỊ TIẾP NHẬN (KHÁCH HÀNG):</span>
              </h3>
              <p><strong className="text-slate-700">Khách hàng:</strong> <span className="font-bold text-slate-950">{delivery.tenKhachHang || '---'}</span></p>
              <p><strong className="text-slate-700">Người nhận máy:</strong> {delivery.kyNhan || delivery.nguoiLienHe || 'Người đại diện'}</p>
              <p><strong className="text-slate-700">Điện thoại liên hệ:</strong> <span className="font-mono font-semibold">{delivery.sdtLienHe || delivery.sdt || '---'}</span></p>
              <p><strong className="text-slate-700">Địa chỉ giao nhận:</strong> {delivery.diaChiGiaoHang || 'Tại xưởng / cơ sở khách hàng'}</p>
              <div className="pt-1 flex items-center gap-3">
                <p><strong className="text-slate-700">Hợp đồng:</strong> <span className="font-mono font-bold text-blue-800">{delivery.soHopDong || '---'}</span></p>
                <p><strong className="text-slate-700">Đơn hàng:</strong> <span className="font-mono font-bold text-blue-800">{delivery.soDonHang || '---'}</span></p>
              </div>
            </div>
          </div>

          {/* Bảng kê chi tiết sản phẩm thiết bị giao (KHÔNG THỂ HIỆN GIÁ TIỀN) */}
          <div className="mb-6">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2">
              DANH MỤC THIẾT BỊ, THÔNG SỐ KỸ THUẬT & PHỤ KIỆN BÀN GIAO ({products.length} MỤC)
            </h3>
            <table className="w-full text-left border-collapse border border-slate-300 text-xs">
              <thead className="bg-slate-100 text-slate-950 font-black uppercase text-2xs tracking-wider">
                <tr>
                  <th className="p-2 border border-slate-300 text-center w-10">STT</th>
                  <th className="p-2 border border-slate-300 min-w-[220px]">Tên Hàng Hóa / Model Cấu Hình</th>
                  <th className="p-2 border border-slate-300 min-w-[130px]">Mã Serial / Số Máy</th>
                  <th className="p-2 border border-slate-300 text-center w-14">ĐVT</th>
                  <th className="p-2 border border-slate-300 text-center w-14">SL</th>
                  <th className="p-2 border border-slate-300 min-w-[160px]">Tình Trạng & Phụ Kiện Bàn Giao</th>
                  <th className="p-2 border border-slate-300 w-28">Ghi Chú</th>
                </tr>
              </thead>
              <tbody>
                {products.length > 0 ? (
                  products.map((item, idx) => {
                    const itemType = item.itemType || detectItemType(item.productName, item.unit || (item as any).dvt);
                    const isMachine = itemType === 'MACHINE';
                    const serials = Array.isArray(item.danhSachMaMay) && item.danhSachMaMay.length > 0 
                      ? item.danhSachMaMay.join(', ') 
                      : (delivery.danhSachMaMay?.length ? delivery.danhSachMaMay.join(', ') : 'Tem kiểm định SGM');

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border border-slate-300 text-center font-bold font-mono">{idx + 1}</td>
                        <td className="p-2 border border-slate-300">
                          <strong className="block text-slate-950">{item.productName}</strong>
                          {item.productId && <span className="font-mono text-3xs text-slate-600 block">Mã SP: {item.productId}</span>}
                          {item.ghiChu && <span className="text-3xs italic text-slate-500 block">{item.ghiChu}</span>}
                        </td>
                        <td className="p-2 border border-slate-300 font-mono text-3xs font-bold text-slate-800">
                          {serials}
                        </td>
                        <td className="p-2 border border-slate-300 text-center">{item.unit || (isMachine ? 'Bộ' : 'Cái')}</td>
                        <td className="p-2 border border-slate-300 text-center font-bold font-mono text-sm">{item.quantity}</td>
                        <td className="p-2 border border-slate-300 text-2xs text-slate-700">
                          <span className="font-semibold text-emerald-800 block">✓ Mới 100%, nguyên kiện KCS</span>
                          <span className="text-3xs text-slate-500 block">Đủ phụ kiện, cáp nguồn, HDSD</span>
                        </td>
                        <td className="p-2 border border-slate-300 text-3xs text-slate-600">
                          {item.ghiChu || 'Theo tiêu chuẩn SGM'}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-slate-400 italic">Không có danh mục sản phẩm</td>
                  </tr>
                )}
              </tbody>
              <tfoot className="font-bold bg-slate-50">
                <tr>
                  <td colSpan={4} className="p-2.5 border border-slate-300 text-right font-black uppercase text-2xs">
                    Tổng số lượng thiết bị bàn giao:
                  </td>
                  <td className="p-2.5 border border-slate-300 text-center font-mono font-black text-sm text-blue-900">
                    {totalQuantity}
                  </td>
                  <td colSpan={2} className="p-2.5 border border-slate-300 text-slate-700 text-2xs italic font-medium">
                    (Thiết bị hoàn tất kiểm tra chất lượng xuất xưởng)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Ghi chú bàn giao, Nghiệm thu & An toàn hiện trường */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-2xs">
            <div className="p-3 rounded-lg border border-slate-300 bg-slate-50/50 space-y-1">
              <strong className="block font-bold uppercase text-slate-800">Tình trạng máy & Ghi chú kỹ thuật:</strong>
              <p className="text-slate-700 italic leading-relaxed">
                {delivery.ghiChu || 'Thiết bị mới 100%, nguyên đai nguyên kiện, đã tiến hành chạy thử xuất xưởng và bàn giao đầy đủ hướng dẫn vận hành kỹ thuật.'}
              </p>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/40 space-y-1">
              <strong className="block font-bold uppercase text-amber-900">Yêu cầu an toàn & Hạ cẩu máy:</strong>
              <p className="text-slate-700 leading-relaxed text-3xs">
                Mặt bằng xưởng bằng phẳng chịu lực; Nguồn điện 3 pha 380V/50Hz sẵn sàng; Khách hàng chuẩn bị xe cẩu 5-10 tấn tiếp nhận hạ máy an toàn theo hướng dẫn của KTV SGM.
              </p>
            </div>
          </div>

          {/* Khối chữ ký 4 bên pháp lý */}
          <div className="grid grid-cols-4 gap-4 text-center text-xs mt-8 pt-4 border-t border-slate-200">
            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-slate-900 text-2xs">NGƯỜI LẬP PHIẾU</p>
              <p className="text-3xs italic text-slate-500">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900">{delivery.nguoiPhuTrach || 'Bộ phận Điều phối'}</p>
            </div>

            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-slate-900 text-2xs">THỦ KHO XUẤT</p>
              <p className="text-3xs italic text-slate-500">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900">{delivery.keToanKho || 'Thủ kho phụ trách'}</p>
            </div>

            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-slate-900 text-2xs">KỸ THUẬT / THỢ GIAO</p>
              <p className="text-3xs italic text-slate-500">(Ký, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900">{delivery.thoGiaoMay || 'Kỹ thuật viên'}</p>
            </div>

            <div className="space-y-1">
              <p className="font-black uppercase tracking-wider text-slate-900 text-2xs">ĐẠI DIỆN KHÁCH HÀNG</p>
              <p className="text-3xs italic text-slate-500">(Ký nhận, ghi rõ họ tên)</p>
              <div className="h-16"></div>
              <p className="font-bold text-slate-900">{delivery.kyNhan || 'Người ký nhận máy'}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
