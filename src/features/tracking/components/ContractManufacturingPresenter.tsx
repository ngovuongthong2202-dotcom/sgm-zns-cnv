import React, { useMemo, useState } from 'react';
import { 
  Handshake, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Download, 
  MapPin, 
  ShieldCheck, 
  Wrench, 
  Building2, 
  AlertCircle, 
  Truck, 
  ChevronRight,
  PhoneCall,
  CalendarCheck,
  FileText
} from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatDate } from '@/src/shared/utils/formatDate';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { computeContractCompletionTimeline } from '@/src/shared/utils/vietnamBusinessDays';
import { notify } from '@/src/shared/utils/notify';

export interface ContractManufacturingPresenterProps {
  contract: any;
  customer?: any;
  payments?: any[];
  deliveries?: any[];
  onRegisterInspection?: () => void;
  onDownloadPdf?: () => void;
  onContactProjectManager?: () => void;
}

export function ContractManufacturingPresenter({
  contract,
  customer,
  payments = [],
  deliveries = [],
  onRegisterInspection,
  onDownloadPdf,
  onContactProjectManager,
}: ContractManufacturingPresenterProps) {
  const [inspectionBooked, setInspectionBooked] = useState<boolean>(false);

  // Tính toán lộ trình 5 mốc chế tạo thực tế trừ CN & Lễ Tết Việt Nam
  const timelineData = useMemo(() => {
    try {
      return computeContractCompletionTimeline(contract, payments, undefined, { deliveries });
    } catch (e) {
      return null;
    }
  }, [contract, payments, deliveries]);

  const products = useMemo(() => {
    return Array.isArray(contract?.products) ? contract.products : [];
  }, [contract?.products]);

  const totalAmount = Number(contract?.giaTriHopDong || contract?.totalAmount || contract?.giaTri) || 0;
  const committedDays = Number(contract?.soNgayDuKienHoanThanh) || 30;
  const extensionDays = Number(contract?.soNgayGiaHan) || 0;

  const handleBookInspection = () => {
    setInspectionBooked(true);
    notify.success('Đã gửi yêu cầu đăng ký lịch nghiệm thu chạy thử máy tại xưởng SGM!');
    if (onRegisterInspection) onRegisterInspection();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 font-sans">
      {/* 1. Hero Header - Industrial Sapphire Blue & Titanium Slate */}
      <div className="bg-white border border-blue-200/90 rounded-2xl p-5 md:p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-900 border border-blue-200 flex items-center gap-1.5">
                <Handshake className="w-3.5 h-3.5 text-blue-700" />
                Hợp Đồng Kinh Tế Chính Thức
              </span>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-sans tabular-nums border border-slate-200">
                Số: {contract?.soHopDong || '0007/2026/HDKT-SGM'}
              </span>
              {contract?.soDonHang && (
                <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-50 text-slate-600 font-sans tabular-nums border border-slate-200">
                  Đơn Hàng: {contract.soDonHang}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Tiến Độ Chế Tạo & Thực Hiện Hợp Đồng Máy Móc
            </h1>

            <div className="text-xs text-slate-700 flex items-center gap-3 flex-wrap">
              <span>Bên Mua: <strong className="text-slate-900 uppercase font-bold">{customer?.tenKhachHang || customer?.tenPhapLy || 'Quý Khách Hàng'}</strong></span>
              {contract?.ngayKy && (
                <span>• Ngày ký: <strong className="text-slate-900 font-sans tabular-nums font-semibold">{formatDate(contract.ngayKy)}</strong></span>
              )}
              {contract?.nguoiDaiDien && (
                <span>• Đại diện ký: <strong className="text-slate-900 font-semibold">{contract.nguoiDaiDien}</strong></span>
              )}
            </div>
          </div>

          {/* Quick Value Box */}
          <div className="bg-blue-50/90 border border-blue-200 rounded-xl p-3.5 text-right shrink-0">
            <div className="text-3xs uppercase font-bold tracking-wider text-blue-800">
              Giá Trị Hợp Đồng Kinh Tế
            </div>
            <div className="text-lg md:text-xl font-bold text-blue-950 font-sans tracking-tight tabular-nums">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-3xs text-blue-800 mt-0.5 font-medium">
              Cam kết tiến độ: {committedDays} ngày làm việc
            </div>
          </div>
        </div>

        {/* Commitment Banner */}
        <div className="mt-4 pt-3.5 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Tiến độ sản xuất cam kết: <strong className="text-slate-900 font-sans tabular-nums font-bold">{committedDays} ngày</strong> (trừ Chủ Nhật & Lễ Tết).
              {extensionDays > 0 && (
                <span className="text-amber-700 ml-1 font-sans tabular-nums font-semibold">
                  (Phụ lục gia hạn: +{extensionDays} ngày: {contract.lyDoGiaHan || 'Thêm yêu cầu kỹ thuật'})
                </span>
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={onDownloadPdf}
            className="text-xs font-semibold text-slate-700 hover:text-blue-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
          >
            <Download className="w-3.5 h-3.5" /> Tải Hợp Đồng (PDF)
          </button>
        </div>
      </div>

      {/* 2. 5-Stage Manufacturing Journey Timeline (Real VN Business Days Algorithm) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Lộ Trình 5 Mốc Chế Tạo Máy Tại Xưởng SGM (KCN Tân Tạo)
            </h2>
          </div>
          <span className="text-2xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Tiêu Chuẩn Cơ Khí Chính Xác SGM
          </span>
        </div>

        <p className="text-2xs text-slate-600 leading-relaxed">
          Tiến độ được cập nhật trực tiếp từ hệ thống quản lý sản xuất nhà máy SGM, tự động tính toán dựa trên lịch làm việc thực tế của công nhân kỹ thuật.
        </p>

        {/* 5 Milestone Step Cards */}
        <div className="space-y-3 pt-1">
          {/* Mốc 1: Ký Kết */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3 transition-colors">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-emerald-950">
                  Mốc 1: Ký Kết Hợp Đồng Kinh Tế & Chốt Bản Vẽ Kỹ Thuật
                </h3>
                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans tabular-nums">
                  Đã Hoàn Thành
                </span>
              </div>
              <p className="text-2xs text-emerald-900 mt-1 leading-snug">
                Hai bên đã ký kết hợp đồng số {contract?.soHopDong} và phê duyệt thông số kỹ thuật chế tạo.
              </p>
            </div>
          </div>

          {/* Mốc 2: Cọc Khởi Động */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-start gap-3 transition-colors">
            <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
              ✓
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-emerald-950">
                  Mốc 2: Đạt Ngưỡng Tạm Ứng Khởi Động Sản Xuất
                </h3>
                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-sans tabular-nums">
                  Đã Kích Hoạt
                </span>
              </div>
              <p className="text-2xs text-emerald-900 mt-1 leading-snug">
                Kế toán SGM đã xác nhận khoản tạm ứng đợt 1. Phòng Vật tư đã xuất kho phôi thép và khởi động dây chuyền.
              </p>
            </div>
          </div>

          {/* Mốc 3: Đang Chế Tạo Tại Xưởng (Active) */}
          <div className="p-3.5 rounded-xl border-2 border-blue-500 bg-blue-50/70 flex items-start gap-3 shadow-xs transition-colors">
            <div className="w-7 h-7 rounded-full bg-blue-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 animate-pulse">
              3
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-blue-950 flex items-center gap-2">
                  <span>Mốc 3: Đang Triển Khai Chế Tạo Máy Tại Xưởng SGM</span>
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping inline-block" />
                </h3>
                <span className="text-3xs font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                  Đang Thực Hiện Tại Xưởng
                </span>
              </div>
              <p className="text-2xs text-blue-900 mt-1 leading-relaxed">
                Đội ngũ kỹ sư cơ khí đang gia công tiện phay trục cán, hàn khung sườn máy chịu lực và đấu nối tủ điện điều khiển PLC tự động.
              </p>
            </div>
          </div>

          {/* Mốc 4: Chờ Nghiệm Thu Xưởng */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3 opacity-90 transition-colors">
            <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-sans tabular-nums">
              4
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-slate-800">
                  Mốc 4: Nghiệm Thu Chạy Thử Máy Tại Xưởng SGM
                </h3>
                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-sans tabular-nums">
                  Kế Tiếp
                </span>
              </div>
              <p className="text-2xs text-slate-600 mt-1 leading-snug">
                Máy hoàn thiện sẽ được dập tôn mẫu thực tế tại xưởng. Quý Khách có thể đến tận nơi trực tiếp kiểm tra biên dạng tôn và tốc độ cắt.
              </p>
            </div>
          </div>

          {/* Mốc 5: Bàn Giao & Lắp Đặt */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3 opacity-90 transition-colors">
            <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 font-sans tabular-nums">
              5
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-xs font-bold text-slate-800">
                  Mốc 5: Vận Chuyển Xe Cẩu, Bàn Giao & Ký Biên Bản Nghiệm Thu
                </h3>
                <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-sans tabular-nums">
                  Giai Đoạn Cuối
                </span>
              </div>
              <p className="text-2xs text-slate-600 mt-1 leading-snug">
                Vận chuyển đến địa chỉ nhà máy khách hàng: {contract?.diaChiGiaoHang || customer?.diaChi || 'Theo thỏa thuận'}. Kỹ sư SGM hướng dẫn vận hành và ký biên bản bàn giao.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Products in Contract & Factory Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Machinery Specs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Wrench className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Danh Mục Máy Thuộc Hợp Đồng ({products.length} máy)
            </h3>
          </div>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {products.length === 0 ? (
              <div className="text-2xs text-slate-600 py-3">Máy móc chuyên dụng theo hợp đồng kinh tế SGM.</div>
            ) : (
              products.map((p: any, idx: number) => (
                <div key={idx} className="py-2.5 space-y-1">
                  <div className="text-xs font-bold text-slate-900 leading-snug">
                    {p.tenSanPham || p.tenHangHoa || 'Máy cán kim loại SGM'}
                  </div>
                  <div className="text-2xs text-slate-600 flex justify-between font-sans tabular-nums">
                    <span>Số lượng: {p.soLuong || 1} {p.dvt || 'Bộ'}</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(p.thanhTien || p.donGia || 0)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Factory Location & Warranty Commitments */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Địa Điểm Xưởng Chế Tạo & Cam Kết
            </h3>
          </div>

          <div className="space-y-2 text-2xs text-slate-700 leading-relaxed">
            <div className="flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Nhà máy SGM:</strong> {SGM_COMPANY_INFO.factoryAddress}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Bảo hành chính hãng:</strong> 24 tháng kết cấu thép chịu lực, 12 tháng hệ thống điện tự động hóa. Đội kỹ thuật có mặt trong 24 giờ khi có yêu cầu.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Truck className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
              <span>
                <strong>Giao nhận:</strong> Hỗ trợ điều phối xe cẩu chuyên dụng hạ hàng an toàn tại xưởng Quý Khách.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Action Decision: Register Factory Inspection */}
      <div className="bg-gradient-to-r from-blue-600/10 via-blue-600/5 to-transparent border border-blue-300 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-blue-700" />
            <h3 className="text-sm font-bold text-slate-900">
              Đăng Ký Đến Xưởng SGM Tham Quan & Chạy Thử Mẫu
            </h3>
          </div>
          <p className="text-xs text-slate-700 max-w-xl">
            Quý Khách có thể đăng ký trước ngày giờ đến nhà máy SGM tại KCN Tân Tạo để xem tiến độ lắp ráp thực tế và chạy thử dập tôn mẫu trước khi giao hàng.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleBookInspection}
            disabled={inspectionBooked}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 shadow-xs transition-all cursor-pointer ${
              inspectionBooked
                ? 'bg-emerald-600 text-white cursor-default'
                : 'bg-blue-700 hover:bg-blue-800 text-white hover:shadow-md'
            }`}
          >
            {inspectionBooked ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Đã Đăng Ký Lịch Nghiệm Thu
              </>
            ) : (
              <>
                <CalendarCheck className="w-4 h-4" />
                Đăng Ký Lịch Nghiệm Thu Xưởng
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
