import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { Button } from '@/src/design-system/Button';
import { Printer, FileCheck2, FileEdit } from 'lucide-react';
import { 
  formatVietnamLegalDate, 
  formatVietnamLegalTime, 
  resolveMachineSerials,
  resolveAcceptanceProtocolCode,
  SGM_OFFICIAL_TECHNICAL_CHECKLIST,
  SGM_COMPANY_INFO 
} from '../utils/handoverDocumentHelper';
import { DigitalVerificationQr } from '@/src/shared/components/DigitalVerificationQr';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

export interface ExportHandoverPdfProps {
  delivery: Delivery;
  variant?: 'default' | 'primary' | 'secondary' | 'dark' | 'subtle' | 'ghost' | 'danger' | 'link';
  className?: string;
  label?: string;
  initialPrintMode?: 'auto_filled' | 'field_blank';
  renderMode?: 'button' | 'preview_only';
  onModeChange?: (mode: 'auto_filled' | 'field_blank') => void;
}

export function ExportHandoverPdf({
  delivery,
  variant = 'secondary',
  className = '',
  label = 'In BB Nghiệm Thu',
  initialPrintMode = 'auto_filled',
  renderMode = 'button',
  onModeChange
}: ExportHandoverPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [printMode, setPrintMode] = useState<'auto_filled' | 'field_blank'>(initialPrintMode);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Bien_Ban_Nghiem_Thu_${resolveAcceptanceProtocolCode(delivery).replace(/[^a-zA-Z0-9]/g, '_')}`,
  });

  const changeMode = (newMode: 'auto_filled' | 'field_blank') => {
    setPrintMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const isFieldBlank = printMode === 'field_blank';
  const protocolCode = resolveAcceptanceProtocolCode(delivery);
  const products = (delivery.products && delivery.products.length > 0) 
    ? delivery.products 
    : [
        {
          productName: delivery.loai || 'Máy cán tôn SGM công nghiệp',
          quantity: delivery.slMay || 1,
          unit: delivery.dvt || 'Máy'
        } as any
      ];

  const contractCode = delivery.soHopDong || '016/KD1-SGM/TN-CT/26';
  const contractDateText = formatVietnamLegalDate(delivery.ngayKy || (delivery as any).contractDate || (delivery as any).created_at);

  const actualTime = formatVietnamLegalTime(delivery.ngayGiaoThucTe);
  const actualDate = formatVietnamLegalDate(delivery.ngayGiaoThucTe || delivery.ngayGiaoMay);

  const hasMachines = products.some(p => {
    const t = (p as any).itemType || detectItemType(p.productName, p.unit);
    return t === 'MACHINE';
  }) || (Boolean(delivery.slMay) && Number(delivery.slMay) > 0);

  const documentTitle = hasMachines ? 'BIÊN BẢN NGHIỆM THU BÀN GIAO THIẾT BỊ' : 'BIÊN BẢN BÀN GIAO & NGHIỆM THU VẬT TƯ - THIẾT BỊ';
  const nameColumnLabel = hasMachines ? 'TÊN MÁY' : 'TÊN VẬT TƯ / LINH KIỆN';
  const serialColumnLabel = hasMachines ? 'SỐ KH' : 'MÃ SỐ / SERIAL / SỐ LÔ';

  // Nội dung trang in chuẩn A4 (Dùng chung cho cả bản in ẩn lẫn Live Preview)
  const renderA4Sheet = () => (
    <div
      ref={printRef}
      className="p-8 sm:p-10 text-slate-900 bg-white font-serif relative min-h-[1123px] w-[794px] max-w-full mx-auto overflow-hidden text-[11px] leading-relaxed select-none shadow-sm print:shadow-none print:m-0 print:p-8"
      style={{ boxSizing: 'border-box' }}
    >
      {/* 1. HEADER DOANH NGHIỆP BÊN BÁN (SGM) */}
      <div className="flex items-center justify-between pb-3.5 border-b-2 border-slate-950">
        <div className="flex items-center gap-3">
          <div className="w-18 h-18 border border-slate-900 flex flex-col items-center justify-center p-1 bg-white shrink-0">
            <img 
              src="/sgm-logo.png" 
              alt="SGM Logo" 
              className="h-11 w-auto object-contain" 
              onError={(e) => {
                // Fallback nếu ảnh không tải được
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[7.5px] font-sans font-bold tracking-tight text-slate-700 mt-0.5">
              {SGM_COMPANY_INFO.saigonMachineWebsite || 'saigonmachine.vn'}
            </span>
          </div>

          <div className="leading-tight text-left">
            <h1 className="text-sm font-black tracking-tight text-slate-950 uppercase font-sans">
              {SGM_COMPANY_INFO.name}
            </h1>
            <p className="text-[10px] text-slate-800 mt-1 font-sans">
              <strong>Đ/C:</strong> {SGM_COMPANY_INFO.addressCompact || SGM_COMPANY_INFO.address}
            </p>
            <p className="text-[10px] text-slate-900 font-sans mt-0.5 font-bold">
              HOTLINE: <span className="font-mono">{SGM_COMPANY_INFO.hotlineTechnical || '0932.000.999'}</span>
              <span className="mx-2 text-slate-400">|</span>
              KD/CSKH: <span className="font-mono">{SGM_COMPANY_INFO.hotlineSupport || '0901.828.492'}</span>
              <span className="mx-2 text-slate-400">|</span>
              MST: <span className="font-mono">{SGM_COMPANY_INFO.taxCode}</span>
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="italic text-xs font-bold text-slate-900 block font-serif underline">
            Số: {protocolCode}
          </span>
          <span className="text-[9px] font-sans text-slate-500 block mt-1">
            Mã PGH: <strong className="font-mono text-slate-800">{delivery.deliveryId || 'PGH-SGM'}</strong>
          </span>
        </div>
      </div>

      {/* Đường phân cách kép trang trọng */}
      <div className="border-t border-slate-900 mt-0.5 mb-4"></div>

      {/* 2. TIÊU ĐỀ BIÊN BẢN */}
      <div className="text-center my-3.5">
        <h2 className="text-base font-black uppercase tracking-wider text-slate-950 font-serif">
          {documentTitle}
        </h2>
        <p className="text-[11px] text-slate-900 italic font-serif mt-1">
          Căn cứ vào {delivery.soHopDong ? 'Hợp đồng' : 'Báo giá'} : <strong className="font-serif">{contractCode}</strong> {contractDateText} giữa hai bên về việc {hasMachines ? 'lắp đặt máy móc thiết bị' : 'cung cấp vật tư, linh kiện'} :
        </p>
      </div>

      {/* 3. BẢNG MÁY / VẬT TƯ & SỐ KH (SERIAL) */}
      <div className="my-3 border border-slate-950">
        <table className="w-full text-left border-collapse text-[10.5px]">
          <thead className="bg-slate-100/80 border-b border-slate-950 font-black uppercase text-slate-950 text-center">
            <tr>
              <th className="p-1.5 w-10 border-r border-slate-950">STT</th>
              <th className="p-1.5 border-r border-slate-950 text-center">{nameColumnLabel}</th>
              <th className="p-1.5 w-36 border-r border-slate-950 text-center">{serialColumnLabel}</th>
              <th className="p-1.5 w-20 text-center">SỐ LƯỢNG</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-950">
            {products.map((item, idx) => {
              const serials = resolveMachineSerials(item, delivery, idx);
              return (
                <tr key={idx} className="align-middle">
                  <td className="p-2 text-center font-bold border-r border-slate-950">{idx + 1}</td>
                  <td className="p-2 font-bold text-slate-950 border-r border-slate-950 leading-snug">
                    {item.productName}
                    {item.quyCach && (
                      <span className="block text-[9.5px] font-normal text-slate-700 italic mt-0.5">
                        Quy cách: {item.quyCach}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-center font-mono font-bold text-slate-950 border-r border-slate-950 bg-slate-50/50">
                    {serials}
                  </td>
                  <td className="p-2 text-center font-bold font-mono text-slate-950">
                    {item.quantity} {item.unit ? `(${item.unit})` : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. THỜI GIAN & ĐỊA ĐIỂM NGHIỆM THU */}
      <div className="my-2.5 text-[11px] leading-relaxed text-slate-900">
        {isFieldBlank ? (
          <p>
            Hôm nay vào lúc <span className="font-mono">...</span> giờ <span className="inline-block w-16 border-b border-dotted border-slate-900"></span> ngày <span className="font-mono">...</span> tháng <span className="font-mono">...</span> năm <span className="font-mono">{new Date().getFullYear()}</span>, Chúng tôi đến Quý Công ty tại địa chỉ :{' '}
            <strong className="underline underline-offset-2">{delivery.diaChiGiaoHang || '..........................................................................................................................................'}</strong>{' '}
            để nghiệm thu máy móc, thiết bị.
          </p>
        ) : (
          <p>
            Hôm nay vào lúc <strong className="font-bold">{actualTime.formatted}</strong> {actualDate}, Chúng tôi đến Quý Công ty tại địa chỉ :{' '}
            <strong className="underline underline-offset-2">{delivery.diaChiGiaoHang || 'Tại cơ sở xưởng Bên Mua'}</strong>{' '}
            để nghiệm thu máy móc, thiết bị.
          </p>
        )}
      </div>

      {/* 5. MỤC I: THÀNH PHẦN HỘI ĐỒNG */}
      <div className="my-2.5 space-y-1.5 text-[10.5px]">
        <h3 className="font-black text-slate-950 uppercase tracking-wide underline underline-offset-2">
          I./ THÀNH PHẦN HỘI ĐỒNG
        </h3>

        {/* Khối Đại diện Bên A (Bên Bán) */}
        <div className="pl-1 space-y-0.5">
          <p className="font-bold text-slate-950">
            ĐẠI DIỆN BÊN A (Bên Bán) : <span className="uppercase">{SGM_COMPANY_INFO.name}</span>.
          </p>
          <div className="grid grid-cols-2 gap-2 pl-3">
            <p>
              - Ông/Bà : <strong className="uppercase">{SGM_COMPANY_INFO.directorName || 'NGUYỄN PHÚ QUỐC'}</strong>
            </p>
            <p>
              Chức Vụ : <strong>{SGM_COMPANY_INFO.directorTitle || 'Giám Đốc'}</strong> làm đại diện.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-3">
            <p>
              - Ông/Bà : {isFieldBlank ? (
                <span className="inline-block w-40 border-b border-dotted border-slate-900"></span>
              ) : (
                <strong className="uppercase">{delivery.thoGiaoMay || 'Kỹ thuật viên bàn giao SGM'}</strong>
              )}
            </p>
            <p>
              Chức Vụ : <strong>NV Kỹ Thuật</strong> làm đại diện {delivery.sdtThoGiaoMay ? `(SĐT: ${delivery.sdtThoGiaoMay})` : ''}.
            </p>
          </div>
        </div>

        {/* Khối Đại diện Bên B (Bên Mua) */}
        <div className="pl-1 space-y-0.5 pt-1">
          <p className="font-bold text-slate-950">
            ĐẠI DIỆN BÊN B (Bên Mua) : <span className="uppercase">{delivery.tenKhachHang || 'CÔNG TY TNHH TÔN THÉP NGUYỄN TĂNG NGỪNG'}</span>
          </p>
          <div className="grid grid-cols-2 gap-2 pl-3">
            <p>
              - Ông/Bà : <strong className="uppercase">{delivery.nguoiDaiDien || 'NGUYỄN VĂN THANH'}</strong>
            </p>
            <p>
              Chức Vụ : <strong>Giám Đốc</strong> làm đại diện.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 pl-3">
            <p>
              - Ông/Bà : {isFieldBlank ? (
                <span className="inline-block w-40 border-b border-dotted border-slate-900"></span>
              ) : (
                <strong className="uppercase">{delivery.kyNhan || delivery.nguoiLienHe || 'Người nhận máy tại xưởng'}</strong>
              )}
            </p>
            <p>
              Chức Vụ : {isFieldBlank ? (
                <span className="inline-block w-28 border-b border-dotted border-slate-900"></span>
              ) : (
                <strong>Phụ trách tiếp nhận xưởng</strong>
              )} làm đại diện.
            </p>
          </div>
        </div>
      </div>

      {/* 6. MỤC II: THIẾT BỊ / HÀNG HÓA ĐƯỢC XÁC NHẬN & CHECKLIST TIÊU CHUẨN KỸ THUẬT */}
      <div className="my-2.5 space-y-1 text-[10.5px]">
        <h3 className="font-black text-slate-950 uppercase tracking-wide underline underline-offset-2">
          II./ {hasMachines ? 'THIẾT BỊ ĐƯỢC XÁC NHẬN' : 'HÀNG HÓA & VẬT TƯ ĐƯỢC XÁC NHẬN'}
        </h3>
        <p className="italic pl-1">
          {hasMachines 
            ? `${SGM_COMPANY_INFO.name} đã hoàn thành việc chế tạo, lắp đặt và hiệu chỉnh máy móc thiết bị theo Hợp đồng : ` 
            : `${SGM_COMPANY_INFO.name} đã hoàn tất kiểm định chất lượng, đóng gói và bàn giao vật tư linh kiện theo ${delivery.soHopDong ? 'Hợp đồng' : 'Báo giá'} : `
          }<strong>{contractCode}</strong>.
        </p>

        {/* Bảng checklist 5 hạng mục vàng */}
        <div className="border border-slate-900 mt-1">
          <table className="w-full text-left border-collapse text-[9.5px]">
            <thead className="bg-slate-100 border-b border-slate-900 font-bold uppercase text-slate-950">
              <tr>
                <th className="p-1 w-8 text-center border-r border-slate-900">STT</th>
                <th className="p-1 w-44 border-r border-slate-900">Hạng mục kiểm tra</th>
                <th className="p-1 border-r border-slate-900">Tiêu chuẩn kỹ thuật bàn giao SGM</th>
                <th className="p-1 w-20 text-center">Kết quả</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {SGM_OFFICIAL_TECHNICAL_CHECKLIST.map((chk, i) => (
                <tr key={chk.id}>
                  <td className="p-1 text-center font-bold border-r border-slate-900">{i + 1}</td>
                  <td className="p-1 font-bold border-r border-slate-900">{chk.category}</td>
                  <td className="p-1 border-r border-slate-900 text-slate-800 leading-tight">{chk.standard}</td>
                  <td className="p-1 text-center font-bold text-slate-950">
                    {isFieldBlank ? '[  ] ĐẠT' : '✓ ĐẠT CHUẨN'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. MỤC III: NHẬN XÉT CỦA HỘI ĐỒNG */}
      <div className="my-2.5 space-y-1.5 text-[10.5px]">
        <h3 className="font-black text-slate-950 uppercase tracking-wide underline underline-offset-2">
          III./ NHẬN XÉT CỦA HỘI ĐỒNG:
        </h3>
        
        <div className="pl-3 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-slate-950 text-center font-bold leading-none">
              {!isFieldBlank ? '✓' : ''}
            </span>
            <span className="font-bold text-slate-950">
              1. Đồng ý nghiệm thu và đưa vào sử dụng.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-slate-950 text-center font-bold leading-none"></span>
            <span>2. Đồng ý nghiệm thu có điều kiện (khắc phục các điểm nhỏ ghi chú bên dưới).</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-block w-3.5 h-3.5 border border-slate-950 text-center font-bold leading-none"></span>
            <span>3. Không đồng ý nghiệm thu đưa máy vào sử dụng.</span>
          </div>
        </div>

        <p className="italic font-bold pl-1 pt-1 text-slate-900 text-[10px]">
          Quý khách vui lòng cho biết ý kiến, lý do không đồng ý nghiệm thu để chúng tôi khắc phục:
        </p>

        {/* Khung ghi ý kiến */}
        <div className="border border-slate-400 p-2 min-h-[38px] text-[10px] text-slate-800 rounded-sm">
          {!isFieldBlank && delivery.ghiChu ? (
            <p className="italic">{delivery.ghiChu}</p>
          ) : (
            <div className="space-y-2 pt-1 opacity-70">
              <div className="border-b border-dotted border-slate-400"></div>
              <div className="border-b border-dotted border-slate-400"></div>
            </div>
          )}
        </div>
      </div>

      {/* 8. CAM KẾT & SỐ BẢN IN */}
      <div className="my-2 text-[10.5px] italic text-slate-900">
        Biên bản này được lập thành 2 bản, mỗi bên giữ một bản, có giá trị pháp lý như nhau.
      </div>

      {/* 9. CHỮ KÝ VÀ ĐÓNG DẤU CỦA CÁC BÊN (Tránh rớt trang tuyệt đối) */}
      <div className="pt-3 border-t border-slate-950 mt-3" style={{ pageBreakInside: 'avoid' }}>
        <table className="w-full border-none text-center">
          <tbody>
            <tr>
              {/* Bên Mua */}
              <td className="w-1/2 align-top p-1 text-slate-950">
                <p className="font-black uppercase text-[11px] leading-tight">
                  ĐẠI DIỆN BÊN MUA
                </p>
                <p className="font-bold uppercase text-[9.5px] mt-0.5 text-slate-800">
                  {delivery.tenKhachHang || 'CTY TNHH TÔN THÉP NGUYỄN TĂNG NGỪNG'}
                </p>
                <p className="text-[9px] italic text-slate-600 mb-14">
                  (Ký, ghi rõ họ tên & đóng dấu)
                </p>
                <p className="font-black uppercase text-[11px] text-slate-950">
                  {delivery.nguoiDaiDien || 'NGUYỄN VĂN THANH'}
                </p>
                <p className="text-[9px] text-slate-600 italic">
                  Người nhận xưởng: {delivery.kyNhan || delivery.nguoiLienHe || '...........................'}
                </p>
              </td>

              {/* Bên Bán */}
              <td className="w-1/2 align-top p-1 text-slate-950">
                <p className="font-black uppercase text-[11px] leading-tight">
                  ĐẠI DIỆN BÊN BÁN
                </p>
                <p className="font-bold uppercase text-[9.5px] mt-0.5 text-slate-800">
                  CÔNG TY TNHH CK CN SÀI GÒN
                </p>
                <p className="text-[9px] italic text-slate-600 mb-14">
                  (Ký, ghi rõ họ tên & đóng dấu)
                </p>
                <p className="font-black uppercase text-[11px] text-slate-950">
                  {SGM_COMPANY_INFO.directorName || 'NGUYỄN PHÚ QUỐC'}
                </p>
                <p className="text-[9px] text-slate-600 italic">
                  KTV bàn giao: {delivery.thoGiaoMay || '...........................'}
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 10. FOOTER A4: MÃ QR XÁC THỰC BẢO HÀNH ĐIỆN TỬ */}
      <div className="mt-4 pt-2 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-600 font-sans">
        <DigitalVerificationQr 
          code={protocolCode} 
          size={42} 
          label="Xác thực số SGM OS" 
          subLabel="Bảo hành chính hãng 12 tháng"
        />

        <div className="text-right">
          <p className="font-mono font-bold text-slate-800">
            Biên bản số: {protocolCode} | Trang 1 / 1
          </p>
          <p className="text-slate-500 text-[8.5px]">
            Hệ thống quản lý chế tạo & chuyển giao công nghệ Saigon Machine (SGM)
          </p>
        </div>
      </div>
    </div>
  );

  // Chế độ chỉ hiển thị Preview trên màn hình (nhúng vào Modal)
  if (renderMode === 'preview_only') {
    return (
      <div className="space-y-3">
        {/* Nút chuyển đổi nhanh chế độ in */}
        <div className="flex items-center justify-between bg-slate-100 p-2 rounded-xl border border-slate-200">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => changeMode('auto_filled')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                !isFieldBlank 
                  ? 'bg-blue-600 text-white shadow-xs' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileCheck2 size={14} />
              <span>In Bản Điền Đầy Đủ</span>
            </button>

            <button
              type="button"
              onClick={() => changeMode('field_blank')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer ${
                isFieldBlank 
                  ? 'bg-amber-600 text-white shadow-xs' 
                  : 'bg-transparent text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileEdit size={14} />
              <span>In Bản Trắng Đi Hiện Trường</span>
            </button>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={() => handlePrint()}
            className="flex items-center gap-1.5 h-8 px-4 text-xs font-black shadow-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Printer size={14} />
            <span>In Ngay (Print A4)</span>
          </Button>
        </div>

        {/* Khung hiển thị tài liệu A4 preview có thanh cuộn */}
        <div className="bg-slate-200 p-4 rounded-xl overflow-x-auto max-h-[68vh] overflow-y-auto border border-slate-300 flex justify-center">
          <div className="scale-90 sm:scale-100 origin-top shadow-xl">
            {renderA4Sheet()}
          </div>
        </div>
      </div>
    );
  }

  // Chế độ nút bấm thông thường (Modal / Drawer)
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
        {renderA4Sheet()}
      </div>
    </>
  );
}
