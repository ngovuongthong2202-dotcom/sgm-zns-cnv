import React from 'react';
import { ZnsTemplate } from '@/src/domain/schema/zns-template.schema';

import { Button } from '@/src/design-system/Button';

interface Props {
  template: ZnsTemplate;
  variablesValueMock?: Record<string, string>;
}

export function TemplatePreview({ template, variablesValueMock = {} }: Props) {
  
  const getLogo = () => (
    <div className="flex flex-col items-start gap-1 mb-4">
      <div className="w-12 h-12 rounded-full border border-slate-300 flex items-center justify-center overflow-hidden bg-white">
         <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-400 to-slate-600">S</span>
      </div>
      <div className="text-3xs font-bold tracking-widest text-slate-800/80">SAIGONMACHINE</div>
    </div>
  );

  const renderMockContent = () => {
    switch (template.templateKey) {
      case 'CUSTOMER_PRE_QUOTE':
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3">
               {getLogo()}
               <p>Kính gửi quý khách <span className="font-semibold">{variablesValueMock.customer_name || '<customer_name>'}</span>, mã khách hàng <span className="font-semibold">{variablesValueMock.phone || '<phone>'}</span>.</p>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN trân trọng gửi đến quý khách thông tin về các giải pháp máy công nghiệp trong lĩnh vực cơ khí chế tạo, bao gồm: Các loại máy cán tôn/Sóng ngói/Xà gồ CZ, dây chuyền PU/EPS/Sandwich, Máy dập vòm/Máy chấn... và các thiết bị phục vụ sản xuất kết cấu kim loại.</p>
               <p>Quý khách vui lòng nhấn nút bên dưới để vào Mini App tham khảo danh mục thiết bị, xem thông số kỹ thuật, lựa chọn phương án phù hợp nhu cầu thực tế.</p>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN rất mong được đồng hành cùng quý khách trong việc nâng cao hiệu quả và năng lực sản xuất.</p>
               <Button aria-label="CTA" className="w-full mt-4 bg-[#0068FF] text-white py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90">Zalo Mini App</Button>
           </div>
        );
      case 'BAOGIA':
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3">
               {getLogo()}
               <p>Kính chào Quý khách <span className="font-semibold">{variablesValueMock.customer_name || '<customer_name>'}</span>,</p>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN đã lập báo giá thành công cho Quý khách với thông tin như sau:</p>
               <table className="w-full mt-2 text-xs">
                  <tbody>
                     <tr><td className="py-1.5 text-slate-500 w-24">Số phiếu báo giá:</td><td className="py-1.5 font-medium">{variablesValueMock.so_phieu_bao_gia || '<so_phieu_bao_gia>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Ngày báo giá:</td><td className="py-1.5 font-medium">{variablesValueMock.ngay_bao_gia || '<ngay_bao_gia>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Hiệu lực đến:</td><td className="py-1.5 font-medium">{variablesValueMock.ngay_het_han || '<ngay_het_han>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">SL máy:</td><td className="py-1.5 font-medium">{variablesValueMock.sl_may || '<sl_may>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Người phụ trách:</td><td className="py-1.5 font-medium">{variablesValueMock.nguoi_phu_trach || '<nguoi_phu_trach>'}</td></tr>
                  </tbody>
               </table>
               <p>Trân trọng cảm ơn Quý khách đã quan tâm và hợp tác cùng CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN.</p>
               <Button aria-label="CTA" className="w-full mt-4 bg-[#0068FF] text-white py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90">Quan tâm OA</Button>
           </div>
        );
      case 'HOPDONG_SIGN_ZNS':
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3">
               {getLogo()}
               <h4 className="font-bold text-sm uppercase tracking-tight text-slate-800">Xác nhận ký kết hợp đồng thành công</h4>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN trân trọng thông báo đến Quý khách <span className="font-semibold">{variablesValueMock.customer_name || '<customer_name>'}</span>, số điện thoại <span className="font-semibold">{variablesValueMock.phone || '<phone>'}</span>.</p>
               <p>Đơn hàng có Mã hợp đồng <span className="font-semibold">{variablesValueMock.order_code || '<order_code>'}</span>, Mã đơn hàng: <span className="font-semibold">{variablesValueMock.So_don_hang || '<So_don_hang>'}</span> đã được ký kết thành công. Thông tin:</p>
               <table className="w-full mt-2 text-xs">
                  <tbody>
                     <tr><td className="py-1.5 text-slate-500 w-[110px] align-top">Ngày ký hợp đồng:</td><td className="py-1.5 font-medium whitespace-pre-wrap">{variablesValueMock.ngay_ky || '<ngay_ky>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Số ngày dự kiến hoàn thành:</td><td className="py-1.5 font-medium">{variablesValueMock.so_ngay || '<so_ngay>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Theo số phiếu báo giá:</td><td className="py-1.5 font-medium">{variablesValueMock.so_phieu || '<so_phieu>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Kinh doanh phụ trách:</td><td className="py-1.5 font-medium">{variablesValueMock.nhan_vien || '<nhan_vien>'}</td></tr>
                  </tbody>
               </table>
               <p>Chúng tôi cam kết đảm bảo chất lượng sản phẩm và dịch vụ theo nội dung đã thỏa thuận trong hợp đồng. Mọi thông tin cần hỗ trợ thêm, kính mong Quý khách vui lòng liên hệ bộ phận phụ trách để được phục vụ kịp thời.</p>
               <p>Xin chân thành cảm ơn sự tin tưởng và hợp tác của Quý khách đối với.</p>
               <Button aria-label="CTA" className="w-full mt-2 bg-[#0068FF] text-white py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90">Quan tâm OA</Button>
           </div>
        );
      case 'THANH_TOAN_TAT_TOAN':
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3">
               {getLogo()}
               <h4 className="font-bold text-sm uppercase tracking-tight text-slate-800">Xác nhận hoàn tất thanh toán</h4>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN thông báo đến quý khách <span className="font-semibold">{variablesValueMock.customer_name || '<customer_name>'}</span>, số điện thoại <span className="font-semibold">{variablesValueMock.phone || '<phone>'}</span>. Chúng tôi đã nhận đủ các khoản thanh toán cho đơn hàng theo thông tin như sau:</p>
               <table className="w-full mt-2 text-xs">
                  <tbody>
                     <tr><td className="py-1.5 text-slate-500 w-[90px]">Mã đơn hàng:</td><td className="py-1.5 font-medium">{variablesValueMock.so_don_hang || '<so_don_hang>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Mã hợp đồng:</td><td className="py-1.5 font-medium">{variablesValueMock.so_hop_dong || '<so_hop_dong>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Tại thời điểm:</td><td className="py-1.5 font-medium">{variablesValueMock.ngay_thanh_toan || '<ngay_thanh_toan>'}</td></tr>
                  </tbody>
               </table>
               <p>Việc thanh toán của Quý khách đã được hoàn tất theo đúng nội dung thỏa thuận trong hợp đồng và được xác nhận trên hệ thống quản lý của công ty. CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN xin ghi nhận sự phối hợp và thiện chí hợp tác của Quý khách trong suốt quá trình thực hiện đơn hàng.</p>
               <p>Mọi nội dung cần trao đổi thêm, Quý khách vui lòng liên hệ bộ phận phụ trách để được hỗ trợ kịp thời.</p>
               <p>Trân trọng cảm ơn Quý khách đã tin tưởng lựa chọn.</p>
               <Button aria-label="CTA" className="w-full mt-2 bg-[#0068FF] text-white py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90">Quan tâm OA</Button>
           </div>
        );
      case 'THANH_TOAN_CONG_NO':
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3">
               {getLogo()}
               <h4 className="font-bold text-sm uppercase tracking-tight text-slate-800">Xác nhận thanh toán thành công</h4>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN thông báo Quý khách <span className="font-semibold">{variablesValueMock.customer_name || '<customer_name>'}</span>, số điện thoại <span className="font-semibold">{variablesValueMock.phone || '<phone>'}</span>.</p>
               <p>Ghi nhận thanh toán của Quý khách cho đơn hàng có thông tin:</p>
               <table className="w-full mt-2 text-xs">
                  <tbody>
                     <tr><td className="py-1.5 text-slate-500 w-[90px]">Mã đơn hàng:</td><td className="py-1.5 font-medium">{variablesValueMock.order_code || '<order_code>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Tại thời điểm:</td><td className="py-1.5 font-medium">{variablesValueMock.time || '<time>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500">Số lượng máy:</td><td className="py-1.5 font-medium">{variablesValueMock.so_luong || '<so_luong>'}</td></tr>
                  </tbody>
               </table>
               <p>Khoản thanh toán đã được cập nhật vào hệ thống quản lý hợp đồng của công ty. Mọi nội dung cần trao đổi thêm, Quý khách vui lòng liên hệ bộ phận phụ trách để được hỗ trợ kịp thời.</p>
               <p>Trân trọng cảm ơn sự hợp tác của Quý khách.</p>
               <Button aria-label="CTA" className="w-full mt-2 bg-[#0068FF] text-white py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90">Quan tâm OA</Button>
           </div>
        );
      case 'GIAOHANG_ZNS':
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans space-y-3">
               {getLogo()}
               <h4 className="font-bold text-sm uppercase tracking-tight text-slate-800">Thông báo xác nhận giao hàng</h4>
               <p>CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN xin thông báo đến quý khách <span className="font-semibold">{variablesValueMock.customer_name || '<customer_name>'}</span>, số điện thoại <span className="font-semibold">{variablesValueMock.phone || '<phone>'}</span>.</p>
               <p>Theo kế hoạch đã thống nhất, đơn hàng theo thông tin như sau:</p>
               <table className="w-full mt-2 text-xs">
                  <tbody>
                     <tr><td className="py-1.5 text-slate-500 w-[120px] align-top">Mã hợp đồng:</td><td className="py-1.5 font-medium">{variablesValueMock.So_hop_dong || '<So_hop_dong>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Mã đơn hàng:</td><td className="py-1.5 font-medium">{variablesValueMock.So_don_hang || '<So_don_hang>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Số phiếu xuất:</td><td className="py-1.5 font-medium">{variablesValueMock.so_phieu_xuat || '<so_phieu_xuat>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Giao hàng vào ngày:</td><td className="py-1.5 font-medium">{variablesValueMock.ngay_giao_may || '<ngay_giao_may>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Danh sách Serial:</td><td className="py-1.5 font-medium">{variablesValueMock.danh_sach_ma_may || '<danh_sach_ma_may>'}</td></tr>
                     <tr><td className="py-1.5 text-slate-500 align-top">Tổng số lượng:</td><td className="py-1.5 font-medium">{variablesValueMock.so_luong || '<so_luong>'} {variablesValueMock.dvt || '<dvt>'}</td></tr>
                  </tbody>
               </table>
               <p>Kính đề nghị Quý khách bố trí nhân sự tiếp nhận và phối hợp bàn giao trong thời gian nêu trên để việc giao hàng được thực hiện thuận lợi. Mọi thông tin cần trao đổi thêm, Quý khách vui lòng liên hệ bộ phận phụ trách để được hỗ trợ kịp thời.</p>
               <p>Trân trọng cảm ơn sự phối hợp của Quý khách.</p>
               <Button aria-label="CTA" className="w-full mt-2 bg-[#0068FF] text-white py-2.5 rounded-lg flex items-center justify-center font-semibold text-sm transition-opacity hover:opacity-90">Quan tâm OA</Button>
           </div>
        );
      default:
        return (
           <div className="text-xs text-slate-800 leading-relaxed font-sans mt-2 space-y-3">
              {getLogo()}
              <div className="font-semibold">{template.label}</div>
              <p>Nội dung tin nhắn mẫu đang được cập nhật. Bạn đang xem với dữ liệu mock:</p>
              <pre className="bg-slate-50 p-2 rounded text-xs overflow-x-auto text-slate-600 font-mono">
                 {JSON.stringify(variablesValueMock, null, 2)}
              </pre>
           </div>
        );
    }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex flex-col">
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider">Preview Tin Nhắn</span>
      </div>
      <div className="p-4 bg-[#f3f4f6] flex-1 w-full flex items-start justify-center">
         <div className="w-[320px] shrink-0 bg-white shadow-sm border border-slate-200 overflow-hidden my-auto rounded-tl-none rounded-tr-2xl rounded-br-2xl rounded-bl-2xl">
            <div className="p-5">
              {renderMockContent()}
            </div>
         </div>
      </div>
    </div>
  );
}

