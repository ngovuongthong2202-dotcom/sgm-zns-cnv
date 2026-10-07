import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Phone, 
  MoreVertical, 
  Sun, 
  Moon, 
  ChevronLeft,
  Menu
} from 'lucide-react';
import { ZbsTemplateInfo } from '@/src/domain/constants/zbs-template.registry';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';

interface Props {
  templateInfo: ZbsTemplateInfo;
  values: Record<string, string>;
  hoveredFieldKey?: string | null;
  targetPhone?: string;
  className?: string;
}

export function ZnsOfficialPhonePreview({
  templateInfo,
  values,
  hoveredFieldKey,
  targetPhone = '',
  className = ''
}: Props) {
  // Mặc định chế độ tối (Dark mode) như giao diện iPhone của người dùng thực tế
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  const isHighlighted = (fieldKey: string) => hoveredFieldKey === fieldKey;

  const renderHighlighted = (fieldKey: string, text: string, fallback: string = '---', isBold: boolean = true) => {
    const val = text || fallback;
    const highlighted = isHighlighted(fieldKey);
    return (
      <span 
        className={`transition-all duration-200 ${isBold ? 'font-bold' : ''} ${
          highlighted 
            ? 'bg-emerald-500/30 text-emerald-300 ring-2 ring-emerald-400 px-1 py-0.5 rounded shadow-sm' 
            : isDarkMode ? 'text-white' : 'text-slate-900'
        }`}
      >
        {val}
      </span>
    );
  };

  const getLogo = () => (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-10 h-10 rounded-full border border-slate-600/40 flex items-center justify-center overflow-hidden bg-white shadow-sm shrink-0 p-1">
        <img src="/sgm-logo.png" alt="SGM Logo" className="w-full h-full object-contain" />
      </div>
      <div>
        <div className="text-3xs font-black tracking-widest uppercase opacity-80">SAIGONMACHINE</div>
        <div className="text-4xs opacity-50 font-mono">Zalo Notification Service</div>
      </div>
    </div>
  );

  const resolvedPhone = values.phone || targetPhone || '0938384265';
  const resolvedCustomer = values.customer_name || 'Cơ Khí Công Nghiệp Sài Gòn';

  // Render nội dung văn bản chuẩn duyệt theo template ID
  const renderMessageContent = () => {
    const tId = templateInfo.templateId;

    // 1. KHÁCH HÀNG (Trước báo giá) - ID 533060
    if (tId === '533060' || templateInfo.messageType === ZnsMessageType.CUSTOMER_PRE_QUOTE) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <p>
            Kính gửi quý khách {renderHighlighted('customer_name', resolvedCustomer)}, mã khách hàng {renderHighlighted('phone', resolvedPhone)}.
          </p>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN trân trọng gửi đến quý khách thông tin về các giải pháp máy công nghiệp trong lĩnh vực cơ khí chế tạo, bao gồm: Các loại máy cán tôn/Sóng ngói/Xà gồ CZ, dây chuyền PU/EPS/Sandwich, Máy dập vòm/Máy chấn... và các thiết bị phục vụ sản xuất kết cấu kim loại.
          </p>
          <p>
            Quý khách vui lòng nhấn nút bên dưới để vào Mini App tham khảo danh mục thiết bị, xem thông số kỹ thuật, lựa chọn phương án phù hợp nhu cầu thực tế.
          </p>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN rất mong được đồng hành cùng quý khách trong việc nâng cao hiệu quả và năng lực sản xuất.
          </p>
        </div>
      );
    }

    // 2. BÁO GIÁ - ID 533064
    if (tId === '533064' || templateInfo.messageType === ZnsMessageType.BAOGIA) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <p>
            Kính chào Quý khách {renderHighlighted('customer_name', resolvedCustomer)},
          </p>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN đã lập báo giá thành công cho Quý khách với thông tin như sau:
          </p>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 opacity-60 w-[125px] align-top">Số phiếu báo giá:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('so_phieu_bao_gia', values.so_phieu_bao_gia || values.soPhieuBaoGia, 'BGM-2026-1149')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Ngày báo giá:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('ngay_bao_gia', values.ngay_bao_gia || values.ngayBaoGia, '06/10/2026')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Hiệu lực đến:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('ngay_het_han', values.ngay_het_han || values.ngayHetHan, '06/11/2026')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">SL máy:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('sl_may', values.sl_may || values.slMay, '1')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Người phụ trách:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('nguoi_phu_trach', values.nguoi_phu_trach || values.nguoiPhuTrach, 'Ngô Vương Thông')}</td>
              </tr>
            </tbody>
          </table>
          <p>
            Trân trọng cảm ơn Quý khách đã quan tâm và hợp tác cùng CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN.
          </p>
        </div>
      );
    }

    // 3. HỢP ĐỒNG - ID 533068 (Chuẩn xác 100% theo ảnh 4 & 5 từ iPhone)
    if (tId === '533068' || templateInfo.messageType === ZnsMessageType.HOPDONG_SIGN_ZNS) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <p>
            Kính gửi Quý khách hàng {renderHighlighted('customer_name', resolvedCustomer)}, số điện thoại {renderHighlighted('phone', resolvedPhone)}.
          </p>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN trân trọng thông báo: Đơn hàng có Mã hợp đồng {renderHighlighted('order_code', values.order_code || values.soHopDong, 'HD-2026-0002')} đã được ký kết thành công.
          </p>
          <div className="pt-1">
            <span className="font-bold opacity-80 block mb-1">Thông tin:</span>
            <table className="w-full text-xs border-collapse">
              <tbody className="divide-y divide-white/5">
                <tr>
                  <td className="py-1.5 opacity-60 w-[140px] align-top">Ngày ký hợp đồng:</td>
                  <td className="py-1.5 text-right font-medium">{renderHighlighted('ngay_ky', values.ngay_ky || values.ngayKy, '06/10/2026')}</td>
                </tr>
                <tr>
                  <td className="py-1.5 opacity-60 align-top">Số ngày dự kiến hoàn thành:</td>
                  <td className="py-1.5 text-right font-medium">{renderHighlighted('so_ngay', values.so_ngay || values.soNgay, '30')}</td>
                </tr>
                <tr>
                  <td className="py-1.5 opacity-60 align-top">Theo số phiếu báo giá:</td>
                  <td className="py-1.5 text-right font-medium">{renderHighlighted('so_phieu', values.so_phieu || values.soPhieuBaoGia, 'BGM-2026-1149')}</td>
                </tr>
                <tr>
                  <td className="py-1.5 opacity-60 align-top">Kinh doanh phụ trách:</td>
                  <td className="py-1.5 text-right font-medium">{renderHighlighted('nhan_vien', values.nhan_vien || values.nguoiPhuTrach, 'Ngô Vương Thông')}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-3xs opacity-80 leading-normal">
            Chúng tôi cam kết đảm bảo chất lượng sản phẩm và dịch vụ theo nội dung đã thỏa thuận trong hợp đồng. Mọi thông tin cần hỗ trợ thêm, kính mong Quý khách vui lòng liên hệ bộ phận phụ trách để được phục vụ kịp thời.
          </p>
          <p className="text-3xs opacity-80 leading-normal">
            Xin chân thành cảm ơn sự tin tưởng và hợp tác của Quý khách đối với.
          </p>
        </div>
      );
    }

    // 4. THANH TOÁN (Tất toán) - ID 552490
    if (tId === '552490' || templateInfo.messageType === ZnsMessageType.THANH_TOAN_TAT_TOAN) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <h4 className="font-bold text-xs uppercase tracking-tight">Xác nhận hoàn tất thanh toán</h4>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN thông báo đến quý khách {renderHighlighted('customer_name', resolvedCustomer)}, số điện thoại {renderHighlighted('phone', resolvedPhone)}. Chúng tôi đã nhận đủ các khoản thanh toán cho đơn hàng theo thông tin như sau:
          </p>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 opacity-60 w-[110px] align-top">Mã đơn hàng:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('so_don_hang', values.so_don_hang || values.soDonHang, 'DH-ERP-001-26')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Mã hợp đồng:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('so_hop_dong', values.so_hop_dong || values.soHopDong, 'HD-2026-0002')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Tại thời điểm:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('ngay_thanh_toan', values.ngay_thanh_toan || values.ngayThanhToan, '06/10/2026')}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-3xs opacity-80 leading-normal">
            Việc thanh toán của Quý khách đã được hoàn tất theo đúng nội dung thỏa thuận trong hợp đồng và được xác nhận trên hệ thống quản lý của công ty. CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN xin ghi nhận sự phối hợp và thiện chí hợp tác của Quý khách trong suốt quá trình thực hiện đơn hàng.
          </p>
        </div>
      );
    }

    // 5. THANH TOÁN (Công nợ) - ID 547381
    if (tId === '547381' || templateInfo.messageType === ZnsMessageType.THANH_TOAN_CONG_NO) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <h4 className="font-bold text-xs uppercase tracking-tight">Xác nhận thanh toán thành công</h4>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN thông báo Quý khách {renderHighlighted('customer_name', resolvedCustomer)}, số điện thoại {renderHighlighted('phone', resolvedPhone)}.
          </p>
          <p>
            Ghi nhận thanh toán của Quý khách cho đơn hàng có thông tin:
          </p>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 opacity-60 w-[110px] align-top">Mã đơn hàng:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('order_code', values.order_code || values.soHopDong, 'HD-2026-0002')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Tại thời điểm:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('time', values.time || values.ngayThanhToan, '06/10/2026')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Số lượng máy:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('so_luong', values.so_luong || values.soLuong, '1')}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-3xs opacity-80 leading-normal">
            Khoản thanh toán đã được cập nhật vào hệ thống quản lý hợp đồng của công ty. Mọi nội dung cần trao đổi thêm, Quý khách vui lòng liên hệ bộ phận phụ trách để được hỗ trợ kịp thời.
          </p>
        </div>
      );
    }

    // 6. GIAO HÀNG (Xác nhận giao hàng) - ID 552545
    if (tId === '552545' || templateInfo.messageType === ZnsMessageType.GIAOHANG_ZNS) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <h4 className="font-bold text-xs uppercase tracking-tight">Thông báo xác nhận giao hàng</h4>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN xin thông báo đến quý khách {renderHighlighted('customer_name', resolvedCustomer)}, số điện thoại {renderHighlighted('phone', resolvedPhone)}.
          </p>
          <p>Theo kế hoạch đã thống nhất, đơn hàng theo thông tin như sau:</p>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 opacity-60 w-[120px] align-top">Mã hợp đồng:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('So_hop_dong', values.So_hop_dong || values.soHopDong, 'HD-2026-0002')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Mã đơn hàng:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('So_don_hang', values.So_don_hang || values.soDonHang, 'DH-ERP-001-26')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Số phiếu xuất:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('so_phieu_xuat', values.so_phieu_xuat || values.deliveryId, 'PX-2026-008')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Giao hàng vào ngày:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('ngay_giao_may', values.ngay_giao_may || values.ngayGiaoHang, '06/10/2026')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Danh sách Serial:</td>
                <td className="py-1.5 text-right font-medium break-all">{renderHighlighted('danh_sach_ma_may', values.danh_sach_ma_may || values.maMay, 'MC-2026-01')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Tổng số lượng:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('so_luong', values.so_luong || values.soLuong, '1')} {values.dvt || 'Máy'}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-3xs opacity-80 leading-normal">
            Kính đề nghị Quý khách bố trí nhân sự tiếp nhận và phối hợp bàn giao trong thời gian nêu trên để việc giao hàng được thực hiện thuận lợi.
          </p>
        </div>
      );
    }

    // 7. KÍCH HOẠT BẢO HÀNH - ID 531052
    if (tId === '531052' || templateInfo.messageType === ZnsMessageType.GIAOHANG_BAOHANH) {
      return (
        <div className="space-y-3 leading-relaxed text-xs">
          {getLogo()}
          <h4 className="font-bold text-xs uppercase tracking-tight">Xác nhận kích hoạt bảo hành thành công</h4>
          <p>
            CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN thông báo Quý khách {renderHighlighted('customer_name', resolvedCustomer)}, số điện thoại {renderHighlighted('phone', resolvedPhone)}.
          </p>
          <p>Thông tin kích hoạt bảo hành thiết bị:</p>
          <table className="w-full text-xs border-collapse">
            <tbody className="divide-y divide-white/5">
              <tr>
                <td className="py-1.5 opacity-60 w-[110px] align-top">Mã bảo hành:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('ma_bao_hanh', values.ma_bao_hanh || values.serial, 'BH-SGM-001')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Sản phẩm / Dòng máy:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('product', values.product || values.tenMay, 'Theo HĐ SGM')}</td>
              </tr>
              <tr>
                <td className="py-1.5 opacity-60 align-top">Ngày kích hoạt:</td>
                <td className="py-1.5 text-right font-medium">{renderHighlighted('date', values.date || values.ngayGiaoHang, '06/10/2026')}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-3xs opacity-80 leading-normal">
            Thiết bị của Quý khách đã được bảo vệ chính sách bảo hành chính hãng. Mọi sự cố kỹ thuật vui lòng liên hệ đường dây nóng dưới đây.
          </p>
        </div>
      );
    }

    // Fallback nếu có mẫu mới
    return (
      <div className="space-y-3 leading-relaxed text-xs">
        {getLogo()}
        <h4 className="font-bold text-xs uppercase tracking-tight">{templateInfo.templateName}</h4>
        <p>Kính gửi quý khách {renderHighlighted('customer_name', resolvedCustomer)}</p>
        <div className="space-y-1 py-1">
          {templateInfo.params.map(p => (
            <div key={p.name} className="flex justify-between items-center text-xs">
              <span className="opacity-60">{p.label}:</span>
              <span className="font-medium">{renderHighlighted(p.name, values[p.name] || '', '---')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full max-w-[360px] rounded-[36px] shadow-2xl border-4 ${
      isDarkMode 
        ? 'bg-[#09090b] border-slate-700 text-slate-100' 
        : 'bg-[#f4f5f8] border-slate-300 text-slate-900'
    } overflow-hidden flex flex-col font-sans transition-colors duration-200 ${className}`}>
      
      {/* 1. TOP PHONE NOTCH & STATUS BAR */}
      <div className={`px-5 pt-2 pb-1.5 flex items-center justify-between text-3xs font-mono select-none ${
        isDarkMode ? 'bg-[#09090b] text-slate-400' : 'bg-[#f4f5f8] text-slate-600'
      }`}>
        <span className="font-bold text-xs">9:41</span>
        <div className="w-20 h-4 bg-black rounded-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-900/60" />
        </div>
        <div className="flex items-center gap-1.5">
          {/* Toggle Light / Dark mode */}
          <button
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-1 rounded-full transition-colors cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-800 text-amber-300' : 'hover:bg-slate-200 text-slate-700'
            }`}
            title={isDarkMode ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối (Dark Mode)'}
            aria-label="Toggle Dark Mode"
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <span>5G 100%</span>
        </div>
      </div>

      {/* 2. ZALO OA APP HEADER BAR (Chuẩn theo ảnh chụp iPhone thật) */}
      <div className={`px-3 py-2 flex items-center justify-between border-b ${
        isDarkMode 
          ? 'bg-[#121214] border-white/5 text-white' 
          : 'bg-[#ffffff] border-slate-200 text-slate-900 shadow-2xs'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <ChevronLeft className="w-5 h-5 shrink-0 opacity-80 cursor-pointer" />
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200/50 flex items-center justify-center overflow-hidden shrink-0 shadow-xs p-0.5">
            <img src="/sgm-logo.png" alt="SGM Avatar" className="w-full h-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-bold text-xs truncate">Cơ Khí Sài Gòn (SGM)</span>
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 fill-amber-400/20" />
            </div>
            <span className="text-4xs opacity-60 block leading-tight">Tài khoản OA chính thức</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-blue-500 shrink-0">
          <Phone className="w-4 h-4 cursor-pointer hover:opacity-80" />
          <Menu className="w-4 h-4 cursor-pointer hover:opacity-80 text-slate-400" />
        </div>
      </div>

      {/* 3. CHAT BODY WITH ZNS NOTIFICATION BUBBLE */}
      <div className={`p-3.5 flex-1 overflow-y-auto space-y-2 select-text ${
        isDarkMode ? 'bg-[#000000]' : 'bg-[#e5e9f0]'
      }`}>
        
        {/* Timestamp */}
        <div className="text-center py-1">
          <span className={`text-4xs px-2 py-0.5 rounded-full ${
            isDarkMode ? 'bg-white/10 text-slate-400' : 'bg-black/10 text-slate-600'
          }`}>
            Hôm nay 19:37
          </span>
        </div>

        {/* ZNS Message Card Bubble */}
        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${
          isDarkMode 
            ? 'bg-[#1c1c1e] border-white/10 text-[#f4f4f5]' 
            : 'bg-[#ffffff] border-slate-200/80 text-[#1e293b]'
        }`}>
          {/* Card Top Header Right Icon */}
          <div className="flex justify-end -mt-1 -mr-1 mb-1">
            <MoreVertical className="w-3.5 h-3.5 opacity-30 cursor-pointer hover:opacity-80" />
          </div>

          {/* Render Full Approved Template Content */}
          {renderMessageContent()}

          {/* Primary CTA Button (Blue #0068FF) */}
          <div className="mt-4 pt-2 border-t border-white/10">
            <button
              type="button"
              className="w-full py-2.5 px-4 bg-[#0068FF] hover:bg-[#0057d9] text-white font-bold rounded-xl text-xs text-center transition-opacity shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{templateInfo.ctaButton?.title || 'Quan tâm OA'}</span>
            </button>
          </div>
        </div>

        {/* Trust badge footer */}
        <div className="text-center pt-2 pb-1">
          <p className="text-4xs opacity-40 font-mono flex items-center justify-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500 inline" />
            Bảo chứng mã hóa bởi Zalo Cloud Security
          </p>
        </div>
      </div>

      {/* 4. BOTTOM HOME BAR (IPHONE STYLE) */}
      <div className={`py-1.5 flex justify-center ${isDarkMode ? 'bg-[#09090b]' : 'bg-[#f4f5f8]'}`}>
        <div className="w-32 h-1 bg-slate-500/40 rounded-full" />
      </div>
    </div>
  );
}
