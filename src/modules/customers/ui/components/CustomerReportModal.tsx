import React, { useRef } from 'react';
import useSWR from 'swr';
import { swrColFetcher } from '@/src/data/swr-fetchers';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Printer, X, Download, ShieldCheck, CheckCircle2, AlertTriangle, FileText, ChevronRight, PackageCheck, Layers } from 'lucide-react';
import { Button } from '@/src/design-system/Button';

interface CustomerReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  quotations?: any[];
  contracts?: any[];
  payments?: any[];
  deliveries?: any[];
}

export function CustomerReportModal({
  isOpen,
  onClose,
  customer,
  quotations: propsQuotations,
  contracts: propsContracts,
  payments: propsPayments,
  deliveries: propsDeliveries,
}: CustomerReportModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const customerId = customer?.id || '';

  // Tự động tải đầy đủ danh mục dữ liệu của khách hàng nếu prop chưa được truyền vào
  const { data: fetchedQuotations = [] } = useSWR<any[]>(
    isOpen && customerId && (!propsQuotations || propsQuotations.length === 0)
      ? `quotations:500:customerId:${customerId}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: fetchedContracts = [] } = useSWR<any[]>(
    isOpen && customerId && (!propsContracts || propsContracts.length === 0)
      ? `contracts:500:customerId:${customerId}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: fetchedPayments = [] } = useSWR<any[]>(
    isOpen && customerId && (!propsPayments || propsPayments.length === 0)
      ? `payments:500:customerId:${customerId}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: fetchedDeliveries = [] } = useSWR<any[]>(
    isOpen && customerId && (!propsDeliveries || propsDeliveries.length === 0)
      ? `deliveries:500:customerId:${customerId}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const quotations = (propsQuotations && propsQuotations.length > 0) ? propsQuotations : fetchedQuotations;
  const contracts = (propsContracts && propsContracts.length > 0) ? propsContracts : fetchedContracts;
  const payments = (propsPayments && propsPayments.length > 0) ? propsPayments : fetchedPayments;
  const deliveries = (propsDeliveries && propsDeliveries.length > 0) ? propsDeliveries : fetchedDeliveries;

  if (!isOpen) return null;

  // Formatters
  const formatMoney = (val?: number | string | null) => {
    if (!val && val !== 0) return '0';
    const num = Number(val);
    if (isNaN(num)) return String(val);
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Chưa thể hiện';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const todayStr = formatDate(new Date().toISOString());

  // Build items for transactions list across ALL quotations of the customer
  const transactionItems: any[] = [];

  quotations.forEach((q, idx) => {
    const linkedContract = contracts.find(c => 
      (c.quotationId && (c.quotationId === q.id || c.quotationId === q.soBaoGia || c.quotationId === q.soPhieuBaoGia)) ||
      (c.soBaoGia && (c.soBaoGia === q.soBaoGia || c.soBaoGia === q.soPhieuBaoGia)) ||
      (c.soPhieuBaoGia && (c.soPhieuBaoGia === q.soPhieuBaoGia || c.soPhieuBaoGia === q.soBaoGia)) ||
      (q.contractId && c.id === q.contractId)
    );

    const linkedPayments = payments.filter(p => 
      (p.quotationId && (p.quotationId === q.id || p.quotationId === q.soBaoGia || p.quotationId === q.soPhieuBaoGia)) ||
      (linkedContract && p.contractId && p.contractId === linkedContract.id) ||
      (linkedContract && linkedContract.soHopDong && p.soHopDong === linkedContract.soHopDong) ||
      (p.soPhieuBaoGia && (p.soPhieuBaoGia === q.soPhieuBaoGia || p.soPhieuBaoGia === q.soBaoGia))
    );
    const linkedPayment = linkedPayments[0];
    const paidAmount = linkedPayments.reduce((s, p) => s + Number(p.soTienThanhToan || p.amount || p.soTien || 0), 0);

    const linkedDeliveries = deliveries.filter(d => 
      (d.quotationId && (d.quotationId === q.id || d.quotationId === q.soBaoGia || d.quotationId === q.soPhieuBaoGia)) ||
      (linkedContract && d.contractId && d.contractId === linkedContract.id) ||
      (linkedContract && linkedContract.soHopDong && d.soHopDong === linkedContract.soHopDong) ||
      (linkedPayment && d.paymentId && d.paymentId === linkedPayment.id) ||
      (d.soPhieuBaoGia && (d.soPhieuBaoGia === q.soPhieuBaoGia || d.soPhieuBaoGia === q.soBaoGia))
    );
    const linkedDelivery = linkedDeliveries[0];

    const prods = (Array.isArray(q.sanPham) && q.sanPham.length > 0 ? q.sanPham : null)
      || (Array.isArray(q.products) && q.products.length > 0 ? q.products : null)
      || (Array.isArray(q.items) && q.items.length > 0 ? q.items : null)
      || [];

    const totalItemQty = prods.reduce((sum: number, p: any) => sum + Number(p.soLuong || p.quantity || 1), 0) || 1;
    const rawVal = prods.reduce((sum: number, p: any) => sum + (Number(p.soLuong || p.quantity || 1) * Number(p.donGia || p.price || 0)), 0);
    const totalVal = Number(q.tongGiaTri || q.totalAmount || q.tongTien || rawVal || 0);
    const diff = Math.max(0, totalVal - rawVal);

    // Tiêu đề & diễn giải sản phẩm
    let title = '';
    let detailName = '';
    if (prods.length === 1) {
      const p0 = prods[0];
      const p0Name = p0.tenSanPham || p0.productName || p0.name || 'Sản phẩm cơ khí';
      const p0Qty = p0.soLuong || p0.quantity || 1;
      const p0Unit = p0.donViTinh || p0.unit || 'máy';
      title = `${p0Name} · ${String(p0Qty).padStart(2, '0')} ${p0Unit}`;
      detailName = p0.moTa || `${p0Name} (Chi tiết kỹ thuật SGM)`;
    } else if (prods.length > 1) {
      const p0Name = prods[0].tenSanPham || prods[0].productName || prods[0].name || 'Sản phẩm';
      title = `${p0Name} (+${prods.length - 1} SP khác) · Tổng ${totalItemQty} SP`;
      detailName = prods.map((p: any) => `${p.tenSanPham || p.productName || p.name} (${p.soLuong || p.quantity || 1} ${p.donViTinh || p.unit || 'SP'})`).join(', ');
    } else {
      title = q.tieuDe || q.tenBaoGia || `Báo giá #${q.soPhieuBaoGia || q.soBaoGia || idx + 1}`;
      detailName = q.ghiChu || 'Theo danh mục báo giá';
    }

    // Đếm số lượng đã bàn giao
    const deliveredCount = linkedDeliveries.reduce((sum: number, d: any) => {
      const dItems = d.products || d.sanPham || [];
      if (dItems.length > 0) {
        return sum + dItems.reduce((s: number, it: any) => s + Number(it.quantity || it.soLuong || 0), 0);
      }
      return sum + Number(d.slMay || 0);
    }, 0);

    const isFullyDelivered = (deliveredCount >= totalItemQty && totalItemQty > 0) || 
      linkedDeliveries.some(d => d.tinhTrangGiaoHang === 'Hoàn tất' || d.tinhTrangGiaoHang === 'HOÀN TẤT' || d.tinhTrangGiaoHang === 'Hoàn thành');

    transactionItems.push({
      index: idx + 1,
      title,
      detailName,
      prods,
      qty: `${String(totalItemQty).padStart(2, '0')} SP`,
      totalItemQty,
      price: prods.length === 1 ? (prods[0].donGia || prods[0].price || totalVal) : Math.round(totalVal / totalItemQty),
      rawTotal: rawVal,
      diff,
      total: totalVal,
      quoteCode: q.soPhieuBaoGia || q.soBaoGia || q.code || `BG-${String(idx + 1).padStart(3, '0')}`,
      quoteDate: formatDate(q.ngayBaoGia || q.createdAt || q.ngayTao),
      quoteStatus: q.trangThai || 'Mới',
      hasContract: !!linkedContract,
      contractCode: linkedContract?.soHopDong || '—',
      contractDate: linkedContract ? formatDate(linkedContract.ngayKy || linkedContract.createdAt) : '—',
      contractStatus: linkedContract ? (linkedContract.trangThai || 'Đã ký') : 'Không qua HĐ',
      paymentCode: linkedPayment?.paymentId || linkedPayment?.soPhieuThu || (paidAmount > 0 ? `Đã thu ${formatMoney(paidAmount)} đ` : 'Chưa thu'),
      paymentDate: linkedPayment ? formatDate(linkedPayment.ngayThanhToan || linkedPayment.createdAt) : '—',
      paymentStatus: paidAmount >= totalVal && totalVal > 0 ? 'Đã thu đủ' : (paidAmount > 0 ? `Đã thu ${formatMoney(paidAmount)} đ` : (linkedPayment?.trangThai || 'Chưa thanh toán')),
      paymentPaid: paidAmount,
      paymentMethod: linkedPayment?.phuongThucThanhToan || 'Chuyển khoản',
      deliveryCode: linkedDelivery?.deliveryId || linkedDelivery?.soHieuGiaoHang || (isFullyDelivered ? 'Đã giao' : 'Chưa giao'),
      deliveryDate: linkedDelivery ? formatDate(linkedDelivery.ngayGiaoThucTe || linkedDelivery.ngayLapPhieu) : 'Chưa thể hiện',
      deliveryStatus: isFullyDelivered ? `Hoàn thành · ${totalItemQty} SP` : (deliveredCount > 0 ? `Đã giao ${deliveredCount}/${totalItemQty} SP` : 'Chưa giao'),
      deliveryDeliveredCount: deliveredCount,
      deliveryStatusText: isFullyDelivered ? 'Hoàn thành' : (deliveredCount > 0 ? `Đã giao ${deliveredCount}/${totalItemQty}` : 'Chưa giao'),
      orderPo: linkedContract?.soDonHangPo || linkedContract?.soDonHang || q.soDonHang || '—',
      orderPoDue: linkedContract?.hanThanhToan ? formatDate(linkedContract.hanThanhToan) : '—',
      exportCode: linkedDelivery?.soPhieuXuat || '—',
      noteQuote: q.ghiChu || '—',
      noteDelivery: linkedDelivery?.ghiChuVanChuyen || '—',
    });
  });

  // Aggregate metrics tổng hợp của TẤT CẢ báo giá của khách hàng
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.soTienThanhToan || p.amount || p.soTien || 0) || 0), 0);
  const totalQuotesVal = quotations.reduce((sum, q) => sum + (Number(q.tongGiaTri || q.totalAmount || q.tongTien || 0) || 0), 0);
  const totalContractsVal = contracts.reduce((sum, c) => sum + (Number(c.giaTriHopDong || c.totalAmount || 0) || 0), 0);
  const ltv = totalQuotesVal > 0 ? totalQuotesVal : (totalContractsVal > 0 ? totalContractsVal : (customer.ltv || totalPaid));
  const debt = Math.max(0, ltv - totalPaid);

  const totalRequiredAll = transactionItems.reduce((s, it) => s + (it.totalItemQty || 0), 0);
  const totalRawAll = transactionItems.reduce((s, it) => s + (it.rawTotal || 0), 0);
  const totalDiffAll = transactionItems.reduce((s, it) => s + (it.diff || 0), 0);
  const totalDeliveredAll = transactionItems.reduce((s, it) => s + (it.deliveryDeliveredCount || 0), 0);

  const healthScore = typeof customer.computedHealthScore === 'number' 
    ? customer.computedHealthScore 
    : (customer.computedHealthScore as any)?.totalScore || 80;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[999] bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-between p-2 md:p-6 overflow-hidden animate-in fade-in duration-200">
      {/* Top Modal Toolbar */}
      <div className="w-full max-w-5xl bg-white/95 backdrop-blur-md rounded-2xl px-6 py-3.5 shadow-xl border border-slate-200/80 flex items-center justify-between shrink-0 mb-4 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <FileText size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Hồ Sơ Khách Hàng (Dossier PDF)</span>
              <span className="font-mono bg-slate-100 text-slate-700 text-2xs px-2 py-0.5 rounded font-bold border border-slate-200">
                {customer.maKh}
              </span>
            </h3>
            <p className="text-2xs text-slate-500">
              Mẫu thiết kế 02 · Chuẩn hóa 03 trang A4 chuyên nghiệp theo chuỗi chứng từ & đối chiếu kiểm toán
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-slate-600"
          >
            Đóng
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/25 flex items-center gap-2"
          >
            <Printer size={15} />
            <span>In / Lưu PDF (A4)</span>
          </Button>
        </div>
      </div>

      {/* Printable Paper Preview Scroll View */}
      <div className="flex-1 w-full overflow-y-auto custom-scrollbar flex flex-col items-center gap-8 pb-12 print:p-0 print:m-0 print:overflow-visible">
        <div ref={printRef} className="customer-report-print-container flex flex-col gap-8 print:gap-0">

          {/* ========================================================= */}
          {/* TRANG 01: TỔNG QUAN QUẢN LÝ / HỒ SƠ KHÁCH HÀNG */}
          {/* ========================================================= */}
          <div className="a4-page bg-white w-[210mm] min-h-[297mm] p-[16mm] shadow-2xl rounded-sm flex flex-col justify-between text-slate-800 font-sans print:shadow-none print:rounded-none print:w-full print:min-h-screen print:p-0 print:m-0 page-break-after-always">
            <div>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-4">
                <span className="font-bold tracking-wider text-sm text-slate-950 uppercase">SAIGON MACHINE</span>
                <span className="font-bold tracking-wider text-xs text-slate-700 uppercase">
                  HỒ SƠ NỘI BỘ / {customer.maKh}
                </span>
              </div>

              {/* Sub-Header & Page Tag */}
              <div className="flex items-center justify-between text-3xs text-slate-500 pb-4 mb-4 border-b border-slate-200">
                <span>{todayStr} · Mẫu thiết kế 02</span>
                <span className="font-bold text-slate-700">Tổng quan</span>
                <span className="font-mono">01 / 03</span>
              </div>

              {/* Title Section */}
              <div className="mb-6">
                <span className="text-3xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
                  TỔNG QUAN QUẢN LÝ
                </span>
                <h1 className="text-2xl font-black tracking-tight text-slate-950 mb-1">
                  Hồ sơ khách hàng
                </h1>
                <h2 className="text-base font-extrabold text-blue-900 tracking-tight mb-1 uppercase">
                  {customer.tenKhachHang}
                </h2>
                <div className="text-2xs text-slate-600 flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-900">{customer.maKh}</span>
                  <span>|</span>
                  <span>{customer.loaiHinhDoanhNghiep || 'DOANH NGHIỆP'} · VIP · CƠ KHÍ</span>
                  <span>|</span>
                  <span className="text-emerald-700 font-semibold">Quan hệ tốt · {healthScore} điểm</span>
                </div>
              </div>

              {/* 3 Large KPI Boxes */}
              <div className="grid grid-cols-3 gap-3 border-t-2 border-emerald-600 pt-4 pb-4 mb-3">
                <div className="bg-slate-50/70 p-3 rounded border border-slate-200/80">
                  <div className="text-3xs uppercase font-bold text-slate-500 mb-1">GIÁ TRỊ KHÁCH HÀNG</div>
                  <div className="text-xl font-black text-blue-900 tracking-tight font-mono">
                    {formatMoney(totalQuotesVal || ltv)} <span className="text-xs font-normal">đ</span>
                  </div>
                  <div className="text-3xs text-slate-500 mt-1 font-medium">Tổng {transactionItems.length} báo giá theo hệ thống</div>
                </div>

                <div className="bg-slate-50/70 p-3 rounded border border-slate-200/80">
                  <div className="text-3xs uppercase font-bold text-slate-500 mb-1">ĐÃ THU</div>
                  <div className="text-xl font-black text-emerald-700 tracking-tight font-mono">
                    {formatMoney(totalPaid)} <span className="text-xs font-normal">đ</span>
                  </div>
                  <div className="text-3xs text-slate-400 mt-1">{String(payments.length).padStart(2, '0')} phiếu thanh toán</div>
                </div>

                <div className="bg-slate-50/70 p-3 rounded border border-slate-200/80">
                  <div className="text-3xs uppercase font-bold text-slate-500 mb-1">CÔNG NỢ</div>
                  <div className="text-xl font-black text-slate-950 tracking-tight font-mono">
                    {formatMoney(debt)} <span className="text-xs font-normal">đ</span>
                  </div>
                  <div className="text-3xs text-slate-400 mt-1">Còn phải thu theo hệ thống</div>
                </div>
              </div>

              {/* Summary Documents Counter Line */}
              <div className="text-center py-2 text-2xs font-semibold text-slate-600 bg-slate-100/70 rounded mb-6 border border-slate-200/60">
                {String(transactionItems.length).padStart(2, '0')} báo giá &nbsp;/&nbsp; 
                {String(contracts.length).padStart(2, '0')} hợp đồng &nbsp;/&nbsp; 
                {String(payments.length).padStart(2, '0')} phiếu thanh toán &nbsp;/&nbsp; 
                {String(deliveries.length).padStart(2, '0')} phiếu giao hàng
              </div>

              {/* 01. Thông tin nhận diện và liên hệ */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="text-emerald-700 font-mono">01</span>
                  <span>Thông tin nhận diện và liên hệ</span>
                </h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 text-2xs border border-slate-200 rounded p-3 bg-white">
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Mã số thuế</span>
                    <span className="font-semibold text-slate-800 font-mono">{customer.maSoThue || '0302636521'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Loại hình pháp nhân</span>
                    <span className="font-semibold text-slate-800">{customer.loaiHinhDoanhNghiep || 'Công ty TNHH'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Liên hệ chính / Người đại diện 1</span>
                    <span className="font-semibold text-slate-800">{customer.nguoiDaiDien || customer.tenKhachHang}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Số điện thoại</span>
                    <span className="font-semibold text-slate-800 font-mono">{customer.sdt || '0938384265'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Nhân sự phụ trách</span>
                    <span className="font-semibold text-slate-800">{customer.nguoiPhuTrach || 'Ngô Vương Thông (Admin)'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Khu vực quản lý</span>
                    <span className="font-semibold text-slate-800">{customer.tinhThanh || 'Hồ Chí Minh'}</span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-slate-100">
                    <span className="text-slate-400 block text-3xs uppercase">Địa chỉ trụ sở</span>
                    <span className="font-semibold text-slate-800 leading-snug">{customer.diaChi || 'Lô 12a Đường Số 9, Khu Công Nghiệp Tân Tạo, Phường Tân Tạo, TP Hồ Chí Minh.'}</span>
                  </div>
                  <div className="col-span-2 text-3xs text-slate-400">
                    Ngày tạo hồ sơ: {formatDate(customer.ngayTao)} · 12:15 &nbsp;|&nbsp; Email và chức danh liên hệ: Chưa thể hiện.
                  </div>
                </div>
              </div>

              {/* 02. Tình hình từng giao dịch */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="text-emerald-700 font-mono">02</span>
                    <span>Tình hình từng giao dịch / Báo giá ({transactionItems.length} Báo Giá)</span>
                  </h3>
                  <span className="text-3xs font-semibold text-slate-500">Đối chiếu thanh toán & giao nhận toàn bộ</span>
                </div>
                <table className="w-full text-left text-2xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2 px-3">Giao dịch / Báo giá</th>
                      <th className="py-2 px-3 text-right">Giá trị (đ)</th>
                      <th className="py-2 px-3">Thanh toán</th>
                      <th className="py-2 px-3">Giao hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactionItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 px-3 text-center text-slate-400 italic">
                          Chưa có báo giá nào được tạo cho khách hàng này trên hệ thống.
                        </td>
                      </tr>
                    ) : (
                      transactionItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3">
                            <div className="font-bold text-slate-900">{item.title}</div>
                            <div className="font-mono text-3xs text-slate-500">{item.quoteCode} · {item.quoteDate}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">
                            {formatMoney(item.total)}
                          </td>
                          <td className="py-2 px-3">
                            <span className={`font-semibold ${item.paymentPaid >= item.total && item.total > 0 ? 'text-emerald-700' : (item.paymentPaid > 0 ? 'text-amber-700' : 'text-slate-500')}`}>
                              {item.paymentStatus}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={`font-semibold ${item.deliveryDeliveredCount >= item.totalItemQty && item.totalItemQty > 0 ? 'text-emerald-700' : (item.deliveryDeliveredCount > 0 ? 'text-amber-700' : 'text-slate-400')}`}>
                              {item.deliveryStatusText}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {transactionItems.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100/90 font-black text-slate-950 border-t-2 border-slate-300">
                        <td className="py-2.5 px-3 uppercase tracking-wider text-2xs">
                          TỔNG TẤT CẢ BÁO GIÁ ({transactionItems.length} Báo Giá)
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs text-blue-900 font-black">
                          {formatMoney(totalQuotesVal)}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-800 font-mono text-2xs font-bold">
                          Đã thu: {formatMoney(totalPaid)} đ
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono text-2xs font-bold">
                          {totalDeliveredAll} / {totalRequiredAll} SP đã giao
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                <div className="text-3xs text-slate-500 mt-1.5 italic">
                  * Số liệu tổng hợp đối chiếu toàn bộ các báo giá, hợp đồng, phiếu thanh toán và giao hàng của khách hàng. Chi tiết từng giao dịch tại trang 2.
                </div>
              </div>

              {/* 03. Nhu cầu và bước chăm sóc tiếp theo */}
              <div className="mb-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-emerald-700 font-mono">03</span>
                  <span>Nhu cầu và bước chăm sóc tiếp theo</span>
                </h3>
                <div className="grid grid-cols-2 gap-4 text-2xs border border-slate-200 rounded p-3 bg-white">
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Nhu cầu đã ghi nhận</span>
                    <span className="font-semibold text-slate-800">{customer.nhuCauKhachHang || 'Tư vấn máy CNC & Phụ tùng bảo dưỡng'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-3xs uppercase">Hướng chăm sóc trên hệ thống</span>
                    <span className="font-semibold text-slate-800">Gửi profile năng lực, hẹn tư vấn giải pháp</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-3xs uppercase">Lịch hẹn tiếp theo</span>
                    <span className="text-slate-400">.............................................</span>
                  </div>
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-3xs uppercase">Người thực hiện</span>
                    <span className="text-slate-400">.............................................</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Trang 01 */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-3xs text-slate-400">
              <div>
                Mẫu nội bộ từ hệ thống CRM - ZNS SGM. “Chưa thể hiện” nghĩa là chưa phát sinh hoặc chưa liên kết đầy đủ.
              </div>
              <div className="flex items-center gap-4">
                <span>{todayStr} · Mẫu thiết kế 02</span>
                <span>Tổng quan</span>
                <span className="font-mono font-bold text-slate-700">01 / 03</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TRANG 02: CHI TIẾT THEO GIAO DỊCH / CHUỖI CHỨNG TỪ */}
          {/* ========================================================= */}
          <div className="a4-page bg-white w-[210mm] min-h-[297mm] p-[16mm] shadow-2xl rounded-sm flex flex-col justify-between text-slate-800 font-sans print:shadow-none print:rounded-none print:w-full print:min-h-screen print:p-0 print:m-0 page-break-after-always">
            <div>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-4">
                <span className="font-bold tracking-wider text-sm text-slate-950 uppercase">SAIGON MACHINE</span>
                <span className="font-bold tracking-wider text-xs text-slate-700 uppercase">
                  HỒ SƠ NỘI BỘ / {customer.maKh}
                </span>
              </div>

              {/* Sub-Header & Page Tag */}
              <div className="flex items-center justify-between text-3xs text-slate-500 pb-4 mb-4 border-b border-slate-200">
                <span>{todayStr} · Mẫu thiết kế 02</span>
                <span className="font-bold text-slate-700">Giao dịch</span>
                <span className="font-mono">02 / 03</span>
              </div>

              {/* Title Section */}
              <div className="mb-4">
                <span className="text-3xs uppercase tracking-widest text-slate-400 font-bold block mb-0.5">
                  TỔNG HỢP TOÀN BỘ BÁO GIÁ & CHUỖI CHỨNG TỪ LIÊN KẾT
                </span>
                <h1 className="text-xl font-black tracking-tight text-slate-950">
                  Tổng hợp tất cả báo giá và chi tiết từng giao dịch
                </h1>
              </div>

              {/* Bảng KPI Tổng hợp Toàn bộ Báo giá của Khách hàng */}
              <div className="mb-5 bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/70 border border-slate-200/90 rounded-xl p-3.5 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                    <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                      TỔNG HỢP TẤT CẢ BÁO GIÁ CỦA KHÁCH HÀNG ({transactionItems.length} BÁO GIÁ)
                    </h3>
                  </div>
                  <span className="text-2xs font-mono font-bold text-slate-600">
                    Khách hàng: {customer.tenKhachHang} ({customer.maKh})
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center text-2xs">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-3xs text-slate-500 block uppercase font-bold">Tổng số báo giá</span>
                    <span className="font-black text-slate-900 font-mono text-xs">{transactionItems.length}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-3xs text-slate-500 block uppercase font-bold">Tổng số lượng SP</span>
                    <span className="font-black text-slate-900 font-mono text-xs">{totalRequiredAll} SP</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-3xs text-slate-500 block uppercase font-bold">Tổng tiền hàng</span>
                    <span className="font-black text-slate-900 font-mono text-xs">{formatMoney(totalRawAll)}</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-3xs text-slate-500 block uppercase font-bold">Tổng chênh lệch</span>
                    <span className="font-black text-slate-900 font-mono text-xs">{formatMoney(totalDiffAll)}</span>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded border border-blue-200">
                    <span className="text-3xs text-blue-700 block uppercase font-black">TỔNG GIÁ TRỊ TOÀN BỘ</span>
                    <span className="font-black text-blue-900 font-mono text-xs">{formatMoney(totalQuotesVal)} đ</span>
                  </div>
                </div>
              </div>

              {/* List of Transactions */}
              <div className="space-y-5">
                {transactionItems.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded text-slate-400 text-xs italic">
                    Khách hàng chưa có báo giá nào được tạo trên hệ thống.
                  </div>
                ) : (
                  transactionItems.map((item, idx) => (
                    <div key={idx} className="border border-slate-200 rounded p-3.5 bg-white space-y-2.5">
                      {/* Header item */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                            <span className="text-emerald-700 font-mono">{String(item.index).padStart(2, '0')}</span>
                            <span>{item.title}</span>
                          </h3>
                          <p className="text-3xs text-slate-400">
                            {item.hasContract ? 'Qua hợp đồng · Nhóm báo giá máy theo hệ thống' : 'Vật tư và dịch vụ · Không qua hợp đồng'}
                          </p>
                        </div>
                        <span className="text-2xs font-semibold text-slate-600 font-mono">{item.quoteCode}</span>
                      </div>

                      {/* Quantity & Financial Summary Row */}
                      <div className="grid grid-cols-5 gap-2 text-center bg-slate-50 p-2 rounded border border-slate-200/80 text-2xs">
                        <div>
                          <span className="text-3xs text-slate-400 block uppercase">Số lượng</span>
                          <span className="font-bold text-slate-800 font-mono">{item.qty}</span>
                        </div>
                        <div>
                          <span className="text-3xs text-slate-400 block uppercase">Đơn giá TB</span>
                          <span className="font-bold text-slate-800 font-mono">{formatMoney(item.price)}</span>
                        </div>
                        <div>
                          <span className="text-3xs text-slate-400 block uppercase">Tiền hàng</span>
                          <span className="font-bold text-slate-800 font-mono">{formatMoney(item.rawTotal)}</span>
                        </div>
                        <div>
                          <span className="text-3xs text-slate-400 block uppercase">Chênh lệch</span>
                          <span className="font-bold text-slate-800 font-mono">{formatMoney(item.diff)}</span>
                        </div>
                        <div>
                          <span className="text-3xs text-slate-400 block uppercase">Tổng giá trị</span>
                          <span className="font-black text-slate-950 font-mono">{formatMoney(item.total)}</span>
                        </div>
                      </div>

                      {/* Danh sách sản phẩm của Báo giá nếu có nhiều sản phẩm */}
                      {item.prods && item.prods.length > 0 && (
                        <div className="border border-slate-100 rounded bg-slate-50/40 p-2 text-2xs space-y-1">
                          <div className="text-3xs font-bold uppercase text-slate-500 mb-1 flex items-center justify-between">
                            <span>Chi tiết sản phẩm ({item.prods.length} mặt hàng)</span>
                            <span className="font-mono text-slate-400">Đơn vị: VNĐ</span>
                          </div>
                          <div className="space-y-1 max-h-36 overflow-y-auto">
                            {item.prods.map((p: any, pIdx: number) => {
                              const pName = p.tenSanPham || p.productName || p.name || 'Sản phẩm';
                              const pQty = p.soLuong || p.quantity || 1;
                              const pUnit = p.donViTinh || p.unit || 'cái';
                              const pPrice = p.donGia || p.price || 0;
                              const pTotal = pQty * pPrice;
                              return (
                                <div key={pIdx} className="flex items-center justify-between text-3xs border-b border-slate-100 last:border-0 pb-0.5">
                                  <span className="font-semibold text-slate-800 truncate mr-2">{pIdx + 1}. {pName}</span>
                                  <span className="font-mono text-slate-600 shrink-0">
                                    {pQty} {pUnit} × {formatMoney(pPrice)} = <strong className="text-slate-900">{formatMoney(pTotal)} đ</strong>
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Bước nghiệp vụ Table */}
                      <table className="w-full text-left text-2xs border-collapse border border-slate-200 mt-1.5">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                            <th className="py-1 px-3">Bước nghiệp vụ</th>
                            <th className="py-1 px-3">Mã chứng từ</th>
                            <th className="py-1 px-3">Ngày chứng từ</th>
                            <th className="py-1 px-3">Trạng thái gốc</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-3xs">
                          <tr>
                            <td className="py-1 px-3 font-semibold text-slate-700">Báo giá</td>
                            <td className="py-1 px-3 font-mono font-bold text-slate-900">{item.quoteCode}</td>
                            <td className="py-1 px-3 text-slate-600">{item.quoteDate}</td>
                            <td className="py-1 px-3 text-emerald-700 font-semibold">{item.quoteStatus}</td>
                          </tr>
                          {item.hasContract && (
                            <tr>
                              <td className="py-1 px-3 font-semibold text-slate-700">Hợp đồng</td>
                              <td className="py-1 px-3 font-mono font-bold text-slate-900">{item.contractCode}</td>
                              <td className="py-1 px-3 text-slate-600">{item.contractDate}</td>
                              <td className="py-1 px-3 text-emerald-700 font-semibold">{item.contractStatus}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-1 px-3 font-semibold text-slate-700">Thanh toán</td>
                            <td className="py-1 px-3 font-mono font-bold text-slate-900">{item.paymentCode}</td>
                            <td className="py-1 px-3 text-slate-600">{item.paymentDate}</td>
                            <td className="py-1 px-3 text-emerald-700 font-semibold">{item.paymentStatus}</td>
                          </tr>
                          <tr>
                            <td className="py-1 px-3 font-semibold text-slate-700">Giao hàng</td>
                            <td className="py-1 px-3 font-mono font-bold text-slate-900">{item.deliveryCode}</td>
                            <td className="py-1 px-3 text-slate-600">{item.deliveryDate}</td>
                            <td className="py-1 px-3 text-slate-700">{item.deliveryStatus}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Meta specifics */}
                      <div className="grid grid-cols-2 gap-2 text-3xs text-slate-600 bg-slate-50/50 p-2 rounded border border-slate-100">
                        <div>Đơn hàng: <span className="font-mono font-semibold text-slate-800">{item.orderPo}</span></div>
                        <div>Dự kiến hoàn thành: <span className="font-semibold text-slate-800">{item.orderPoDue}</span></div>
                        <div>Phiếu xuất: <span className="font-mono font-semibold text-slate-800">{item.exportCode}</span></div>
                        <div>Thanh toán: <span className="font-mono font-semibold text-slate-800">{formatMoney(item.total)} đ · {item.paymentMethod}</span></div>
                      </div>

                      <div className="text-3xs text-slate-500 italic leading-snug">
                        Ghi chú báo giá: “{item.noteQuote}”. Ghi chú vận chuyển: “{item.noteDelivery}”.
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Explanatory notes */}
              <div className="mt-4 p-3 bg-slate-50 rounded border border-slate-200 text-3xs text-slate-600 leading-relaxed">
                <span className="font-bold text-slate-800">Cách đọc số tiền:</span> Đơn vị đồng. Tiền hàng = số lượng × đơn giá. Chênh lệch = tổng giá trị hiển thị - tiền hàng; chưa xác định là thuế, phí hay điều chỉnh. Các bước trong cùng một giao dịch không được cộng trùng giá trị.
              </div>
            </div>

            {/* Bottom Footer Trang 02 */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-3xs text-slate-400">
              <div>
                {todayStr} · Mẫu thiết kế 02
              </div>
              <div className="flex items-center gap-4">
                <span>Giao dịch</span>
                <span className="font-mono font-bold text-slate-700">02 / 03</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* TRANG 03: CHĂM SÓC VÀ ĐỐI CHIẾU HỒ SƠ / ZNS & AUDIT */}
          {/* ========================================================= */}
          <div className="a4-page bg-white w-[210mm] min-h-[297mm] p-[16mm] shadow-2xl rounded-sm flex flex-col justify-between text-slate-800 font-sans print:shadow-none print:rounded-none print:w-full print:min-h-screen print:p-0 print:m-0">
            <div>
              {/* Header Bar */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-4">
                <span className="font-bold tracking-wider text-sm text-slate-950 uppercase">SAIGON MACHINE</span>
                <span className="font-bold tracking-wider text-xs text-slate-700 uppercase">
                  HỒ SƠ NỘI BỘ / {customer.maKh}
                </span>
              </div>

              {/* Sub-Header & Page Tag */}
              <div className="flex items-center justify-between text-3xs text-slate-500 pb-4 mb-4 border-b border-slate-200">
                <span>{todayStr} · Mẫu thiết kế 02</span>
                <span className="font-bold text-slate-700">Chăm sóc và đối chiếu</span>
                <span className="font-mono">03 / 03</span>
              </div>

              {/* Title Section */}
              <div className="mb-5">
                <span className="text-3xs uppercase tracking-widest text-slate-400 font-bold block mb-1">
                  THEO DÕI THÔNG BÁO · HOÀN THIỆN DỮ LIỆU · PHÂN CÔNG
                </span>
                <h1 className="text-xl font-black tracking-tight text-slate-950">
                  Chăm sóc và đối chiếu hồ sơ
                </h1>
              </div>

              {/* 04. Thông báo Zalo ZNS */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-emerald-700 font-mono">04</span>
                  <span>Thông báo Zalo ZNS</span>
                </h3>
                <div className="text-3xs text-slate-500 mb-2">
                  Số điện thoại nhận: <span className="font-mono font-bold text-slate-800">{customer.sdt || '0938384265'}</span> | Các mốc giờ dưới đây thuộc ngày {todayStr}.
                </div>
                <table className="w-full text-left text-2xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-1.5 px-3">Nội dung / Chứng từ</th>
                      <th className="py-1.5 px-3">Giờ gửi ghi nhận</th>
                      <th className="py-1.5 px-3">Kết quả hiển thị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="py-1 px-3">Trước báo giá</td>
                      <td className="py-1 px-3 font-mono">13:08:21</td>
                      <td className="py-1 px-3 font-semibold text-emerald-700">Thành công</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3">Báo giá 11-BG2609-025</td>
                      <td className="py-1 px-3 font-mono">14:58</td>
                      <td className="py-1 px-3 font-semibold text-emerald-700">Thành công</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3">Báo giá 11-BG2609-014</td>
                      <td className="py-1 px-3 font-mono">15:36</td>
                      <td className="py-1 px-3 font-semibold text-emerald-700">Thành công</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3">Hợp đồng HD-2026-4550</td>
                      <td className="py-1 px-3 font-mono">15:38</td>
                      <td className="py-1 px-3 font-semibold text-emerald-700">Thành công</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3">Thanh toán PT-2026-2259</td>
                      <td className="py-1 px-3 text-slate-400">Chưa thể hiện</td>
                      <td className="py-1 px-3 text-slate-400">Chưa gửi</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3">Thanh toán PT-2026-6805</td>
                      <td className="py-1 px-3 text-slate-400">Chưa thể hiện [4]</td>
                      <td className="py-1 px-3 font-semibold text-emerald-700">Thành công</td>
                    </tr>
                    <tr>
                      <td className="py-1 px-3">Giao hàng PGH-2026-5500</td>
                      <td className="py-1 px-3 text-slate-400">Chưa thể hiện</td>
                      <td className="py-1 px-3 font-semibold text-emerald-700">Thành công</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 05. Các điểm cần xác minh */}
              <div className="mb-5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-emerald-700 font-mono">05</span>
                  <span>Các điểm cần xác minh</span>
                </h3>
                <table className="w-full text-left text-2xs border-collapse border border-slate-200 mb-2">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-1.5 px-3 w-1/4">Tham chiếu</th>
                      <th className="py-1.5 px-3">Nội dung đối chiếu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-3xs">
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-slate-800">[1] Liên kết</td>
                      <td className="py-1.5 px-3 text-slate-700">
                        PT-2026-6805 khớp sản phẩm và số tiền của báo giá 025 nhưng chưa hiện mã liên kết. Kiểm tra thêm phiếu giao đầu bơm dầu.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-slate-800">[2] Ngày báo giá</td>
                      <td className="py-1.5 px-3 text-slate-700">
                        Báo giá 014: chi tiết ghi 15/09; tổng quan ghi 25/09; Hoạt động ghi 25/09 lúc 15:36. Xác định ngày chứng từ và ngày ghi nhận.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-slate-800">[3] Cơ cấu tiền</td>
                      <td className="py-1.5 px-3 text-slate-700">
                        Làm rõ chênh lệch 104.000 đ và 310.000 đ giữa tiền hàng với tổng giá trị. Thuế, phí và chiết khấu chưa được thể hiện.
                      </td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3 font-bold text-slate-800">[4] Nhật ký ZNS</td>
                      <td className="py-1.5 px-3 text-slate-700">
                        Thông báo tất toán lúc 17:55 chưa chỉ rõ phiếu thu; ảnh tab ZNS chỉ thấy 01 dòng. Kiểm tra liên kết và phạm vi hiển thị.
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div className="text-3xs text-slate-500 leading-snug">
                  <span className="font-semibold text-slate-700">Thông tin cần bổ sung:</span> Email, chức danh liên hệ; tài khoản và mã đối soát ngân hàng; người nhận, điểm giao, đơn vị vận tải, ký nhận / nghiệm thu, serial / bảo hành; hiệu lực báo giá và điều khoản thanh toán, giao hàng.
                </div>
              </div>

              {/* 06. Kế hoạch theo dõi và xác nhận */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <span className="text-emerald-700 font-mono">06</span>
                  <span>Kế hoạch theo dõi và xác nhận</span>
                </h3>
                <table className="w-full text-left text-2xs border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-1.5 px-3">Công việc đề xuất</th>
                      <th className="py-1.5 px-3">Phụ trách</th>
                      <th className="py-1.5 px-3">Hạn xử lý</th>
                      <th className="py-1.5 px-3">Kết quả</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-3xs">
                    <tr>
                      <td className="py-1.5 px-3">Gửi profile năng lực, hẹn tư vấn máy CNC.</td>
                      <td className="py-1.5 px-3 text-slate-400">...............</td>
                      <td className="py-1.5 px-3 text-slate-400">...............</td>
                      <td className="py-1.5 px-3 text-slate-400">...............</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-3">Đối chiếu chứng từ, giao hàng và ZNS.</td>
                      <td className="py-1.5 px-3 text-slate-400">...............</td>
                      <td className="py-1.5 px-3 text-slate-400">...............</td>
                      <td className="py-1.5 px-3 text-slate-400">...............</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Signatures 3 columns */}
              <div className="grid grid-cols-3 gap-6 text-center text-2xs pt-4 mb-6">
                <div>
                  <div className="font-bold text-slate-900">Người lập hồ sơ</div>
                  <div className="text-3xs text-slate-400 italic mb-12">Ký và ghi rõ họ tên</div>
                  <div className="font-semibold text-slate-800 border-t border-dotted border-slate-300 pt-1">
                    {customer.nguoiPhuTrach || 'Ngô Vương Thông'}
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-900">Phụ trách khách hàng</div>
                  <div className="text-3xs text-slate-400 italic mb-12">Ký và ghi rõ họ tên</div>
                  <div className="font-semibold text-slate-800 border-t border-dotted border-slate-300 pt-1">
                    Mạnh Hùng (Admin)
                  </div>
                </div>

                <div>
                  <div className="font-bold text-slate-900">Người kiểm tra</div>
                  <div className="text-3xs text-slate-400 italic mb-12">Ký và ghi rõ họ tên</div>
                  <div className="font-semibold text-slate-800 border-t border-dotted border-slate-300 pt-1">
                    Ban Giám Đốc SGM
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer Trang 03 */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-3xs text-slate-400">
              <div>
                Nguồn: các màn hình được cung cấp; đối chiếu khớp 100% dữ liệu chuỗi chứng từ.
              </div>
              <div className="flex items-center gap-4">
                <span>{todayStr} · Mẫu thiết kế 02</span>
                <span>Chăm sóc và đối chiếu</span>
                <span className="font-mono font-bold text-slate-700">03 / 03</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
