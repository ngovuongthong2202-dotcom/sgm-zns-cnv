import React from 'react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import { 
  FileText, 
  FileSignature, 
  Truck, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ChevronRight, 
  Package, 
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface CustomerOmniFlowStreamProps {
  quotations: any[];
  contracts: any[];
  payments: any[];
  deliveries: any[];
  className?: string;
}

export function CustomerOmniFlowStream({
  quotations = [],
  contracts = [],
  payments = [],
  deliveries = [],
  className = '',
}: CustomerOmniFlowStreamProps) {
  const { openDrawer } = useDrawerStack();

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  const getQuotationTypeMeta = (loai?: string) => {
    const norm = (loai || '').toUpperCase();
    if (norm.includes('MÁY') || norm.includes('MAY')) {
      return {
        label: 'BG MÁY',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        badgeBg: 'bg-blue-600',
        accentBorder: 'border-l-blue-600',
        isMachine: true,
      };
    }
    if (norm.includes('VẬT TƯ') || norm.includes('VAT TU') || norm.includes('LINH KIỆN')) {
      return {
        label: 'BG VẬT TƯ',
        color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        badgeBg: 'bg-emerald-600',
        accentBorder: 'border-l-emerald-600',
        isMachine: false,
      };
    }
    if (norm.includes('DỊCH VỤ') || norm.includes('DICH VU') || norm.includes('BẢO TRÌ')) {
      return {
        label: 'BG DỊCH VỤ',
        color: 'bg-amber-50 text-amber-800 border-amber-200',
        badgeBg: 'bg-amber-600',
        accentBorder: 'border-l-amber-600',
        isMachine: false,
      };
    }
    return {
      label: loai || 'BÁO GIÁ',
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      badgeBg: 'bg-slate-600',
      accentBorder: 'border-l-slate-600',
      isMachine: false,
    };
  };

  // Sắp xếp báo giá theo thứ tự mới nhất
  const sortedQuotes = [...quotations].sort((a, b) => {
    const tA = new Date(a.createdAt || a.ngayCapNhat || a.ngayBaoGia || 0).getTime();
    const tB = new Date(b.createdAt || b.ngayCapNhat || b.ngayBaoGia || 0).getTime();
    return tB - tA;
  });

  if (sortedQuotes.length === 0 && contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-xs shadow-2xs space-y-2">
        <Sparkles className="mx-auto text-slate-400" size={24} />
        <p className="font-semibold text-slate-700">Chưa ghi nhận dòng chảy giao dịch nào cho khách hàng này.</p>
        <p className="text-3xs text-slate-400">Các hồ sơ Báo giá, Hợp đồng, Giao hàng và Thanh toán sẽ tự động liên thông tại đây.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-5 select-none ${className}`}>
      {/* Omni-Flow Stream Description Header */}
      <div className="bg-gradient-to-r from-blue-50/60 via-slate-50 to-white p-3.5 rounded-xl border border-blue-150/60 flex items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs shrink-0">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              DÒNG CHẢY GIAO DỊCH 360° (CUSTOMER OMNI-FLOW)
              <span className="text-3xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                {sortedQuotes.length} Luồng Báo Giá
              </span>
            </h3>
            <p className="text-slate-500 text-2xs mt-0.5">
              Tự động gom nhóm toàn diện: [Báo giá] ➔ [Hợp đồng] ➔ [Giao hàng] ➔ [Thanh toán]. Xem trọn vẹn thông tin trực diện mà không cần click mở thêm.
            </p>
          </div>
        </div>
      </div>

      {/* Danh sách từng Pod Báo Giá */}
      {sortedQuotes.map((quote) => {
        const typeMeta = getQuotationTypeMeta(quote.loai);

        // Tìm các hợp đồng liên quan
        const matchedContracts = contracts.filter(
          (c) => (quote.id && c.quotationId === quote.id) || (quote.contractId && c.id === quote.contractId)
        );

        // Tìm các phiếu giao hàng liên quan (qua quotationId hoặc contractId)
        const matchedDeliveries = deliveries.filter(
          (d) => (quote.id && d.quotationId === quote.id) || matchedContracts.some((c) => c.id === d.contractId)
        );

        // Tìm các phiếu thanh toán liên quan (qua quotationId hoặc contractId)
        const matchedPayments = payments.filter(
          (p) => (quote.id && p.quotationId === quote.id) || matchedContracts.some((c) => c.id === p.contractId)
        );

        // Tính toán các chỉ số của Pod này
        const quoteTotal = Number(quote.totalAmount || quote.tongTien || quote.triGiaBaoGia || 0);
        
        // Hợp đồng
        const firstContract = matchedContracts[0];
        const contractTotal = firstContract 
          ? Number(firstContract.giaTriHopDong || firstContract.tongGiaTri || firstContract.totalAmount || 0)
          : 0;

        // Thanh toán
        const totalPaid = matchedPayments.reduce((sum, p) => {
          const isPaid = p.tinhTrangThanhToan?.toLowerCase().includes('tất toán') || p.tinhTrangThanhToan?.toLowerCase().includes('đã thanh toán');
          return sum + (isPaid ? Number(p.soTien || 0) : 0);
        }, 0);
        const effectiveTotal = contractTotal || quoteTotal;
        const paymentPercent = effectiveTotal > 0 ? Math.min(100, Math.round((totalPaid / effectiveTotal) * 100)) : (matchedPayments.length > 0 ? 100 : 0);
        const debtRemaining = Math.max(0, effectiveTotal - totalPaid);

        // Giao hàng
        const hasDelivered = matchedDeliveries.some((d) => !!d.ngayGiaoThucTe);
        const allDeliveriesCount = matchedDeliveries.length;
        const completedDeliveriesCount = matchedDeliveries.filter((d) => !!d.ngayGiaoThucTe).length;

        // Sản phẩm
        const displayProducts = (firstContract?.products && firstContract.products.length > 0)
          ? firstContract.products
          : (quote.sanPham || quote.products || []);

        return (
          <div
            key={quote.id || quote.soPhieuBaoGia}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${typeMeta.accentBorder} shadow-2xs hover:shadow-xs transition-all overflow-hidden`}
          >
            {/* 1. Pod Header: Loại báo giá, Mã BG, Ngày, Tổng tiền */}
            <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className={`text-3xs font-black uppercase px-2.5 py-0.5 rounded-md border ${typeMeta.color}`}>
                  {typeMeta.label}
                </span>
                <button
                  type="button"
                  onClick={() => quote.id && openDrawer('quotation', quote.id)}
                  className="font-mono text-xs font-black text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                >
                  <span>{quote.soPhieuBaoGia || 'Báo giá chưa đặt mã'}</span>
                  <ExternalLink size={12} className="text-slate-400 hover:text-blue-600" />
                </button>
                <span className="text-3xs text-slate-400 font-mono">
                  Ngày lập: {formatDate(quote.createdAt || quote.ngayCapNhat || quote.ngayBaoGia)}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-3xs text-slate-400 uppercase font-bold tracking-wider block">Trị giá Báo Giá</span>
                  <span className="font-currency font-black text-xs text-slate-900 tabular-nums">
                    {formatMoney(quoteTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Visual 4-Stage Ribbon Pipeline */}
            <div className="p-4 bg-slate-50/30 border-b border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {/* Chặng 1: Báo giá */}
                <div 
                  onClick={() => quote.id && openDrawer('quotation', quote.id)}
                  className="bg-white p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs font-bold uppercase text-slate-400 flex items-center gap-1">
                      <FileText size={12} className="text-blue-600" /> 1. Báo Giá
                    </span>
                    <span className="text-3xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                      {quote.tinhTrangBaoGia || quote.trangThai || 'Hoàn tất'}
                    </span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-800 group-hover:text-blue-600 truncate block">
                      {quote.soPhieuBaoGia}
                    </span>
                    <span className="font-currency font-bold text-2xs text-slate-600 tabular-nums mt-0.5 block">
                      {formatMoney(quoteTotal)}
                    </span>
                  </div>
                </div>

                {/* Chặng 2: Hợp đồng */}
                <div 
                  onClick={() => firstContract?.id && openDrawer('contract', firstContract.id)}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between shadow-2xs ${
                    firstContract 
                      ? 'bg-white border-slate-200 hover:border-blue-400 cursor-pointer group' 
                      : 'bg-slate-50/60 border-dashed border-slate-200 cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs font-bold uppercase text-slate-400 flex items-center gap-1">
                      <FileSignature size={12} className={firstContract ? 'text-blue-600' : 'text-slate-400'} /> 2. Hợp Đồng
                    </span>
                    {firstContract ? (
                      <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {firstContract.tinhTrangHopDong || 'Đã ký'}
                      </span>
                    ) : (
                      <span className="text-3xs text-slate-400 font-medium">
                        {typeMeta.isMachine ? 'Chưa lập HĐ' : 'Không cần HĐ'}
                      </span>
                    )}
                  </div>
                  <div>
                    {firstContract ? (
                      <>
                        <span className="font-mono font-bold text-xs text-slate-800 group-hover:text-blue-600 truncate block">
                          {firstContract.soHopDong}
                        </span>
                        <span className="font-currency font-bold text-2xs text-slate-600 tabular-nums mt-0.5 block">
                          {formatMoney(contractTotal)}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xs text-slate-400 italic block">
                        {typeMeta.isMachine ? 'Chờ chốt ký hợp đồng' : 'Xuất kho trực tiếp theo BG'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Chặng 3: Giao hàng */}
                <div 
                  onClick={() => matchedDeliveries[0]?.id && openDrawer('delivery', matchedDeliveries[0].id)}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between shadow-2xs ${
                    matchedDeliveries.length > 0
                      ? 'bg-white border-slate-200 hover:border-cyan-400 cursor-pointer group'
                      : 'bg-slate-50/60 border-dashed border-slate-200 cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs font-bold uppercase text-slate-400 flex items-center gap-1">
                      <Truck size={12} className={matchedDeliveries.length > 0 ? 'text-cyan-600' : 'text-slate-400'} /> 3. Giao Hàng
                    </span>
                    {hasDelivered ? (
                      <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        Đã giao ({completedDeliveriesCount}/{allDeliveriesCount})
                      </span>
                    ) : matchedDeliveries.length > 0 ? (
                      <span className="text-3xs font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        Đang giao ({allDeliveriesCount} phiếu)
                      </span>
                    ) : (
                      <span className="text-3xs text-slate-400 font-medium">Chưa xuất kho</span>
                    )}
                  </div>
                  <div>
                    {matchedDeliveries.length > 0 ? (
                      <>
                        <span className="font-mono font-bold text-xs text-slate-800 group-hover:text-cyan-600 truncate block">
                          {matchedDeliveries[0].soPhieuXuat || matchedDeliveries[0].deliveryId || 'Phiếu xuất kho'}
                        </span>
                        <span className="text-3xs text-slate-500 font-mono mt-0.5 block">
                          {matchedDeliveries[0].ngayGiaoThucTe 
                            ? `Giao: ${formatDate(matchedDeliveries[0].ngayGiaoThucTe)}` 
                            : `Hạn: ${formatDate(matchedDeliveries[0].ngayGiaoMay)}`}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xs text-slate-400 italic block">
                        Chưa lập phiếu xuất kho
                      </span>
                    )}
                  </div>
                </div>

                {/* Chặng 4: Thanh toán */}
                <div 
                  onClick={() => matchedPayments[0]?.id && openDrawer('payment', matchedPayments[0].id)}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between shadow-2xs ${
                    matchedPayments.length > 0
                      ? 'bg-white border-slate-200 hover:border-emerald-400 cursor-pointer group'
                      : 'bg-slate-50/60 border-dashed border-slate-200 cursor-default'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs font-bold uppercase text-slate-400 flex items-center gap-1">
                      <CreditCard size={12} className={matchedPayments.length > 0 ? 'text-emerald-600' : 'text-slate-400'} /> 4. Thanh Toán
                    </span>
                    <span className={`text-3xs font-bold px-1.5 py-0.2 rounded border ${
                      paymentPercent === 100 
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                        : matchedPayments.length > 0 
                        ? 'text-amber-800 bg-amber-50 border-amber-200' 
                        : 'text-slate-500 bg-slate-100 border-slate-200'
                    }`}>
                      {paymentPercent === 100 ? 'Tất toán' : `${paymentPercent}%`}
                    </span>
                  </div>
                  <div>
                    {matchedPayments.length > 0 ? (
                      <>
                        <span className="font-currency font-black text-xs text-emerald-800 truncate block tabular-nums">
                          Đã thu: {formatMoney(totalPaid)}
                        </span>
                        <span className="text-3xs text-slate-500 font-medium mt-0.5 block">
                          {debtRemaining > 0 ? (
                            <span className="text-amber-800 font-bold">Nợ còn: {formatMoney(debtRemaining)}</span>
                          ) : (
                            <span className="text-emerald-700 font-bold">✓ Đã tất toán 100%</span>
                          )}
                        </span>
                      </>
                    ) : (
                      <span className="text-3xs text-slate-400 italic block">
                        Chưa phát sinh phiếu thu
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Operational Dossier (Dữ liệu cốt lõi 100% trực diện) */}
            <div className="p-4 space-y-3">
              {/* Danh sách máy & sản phẩm */}
              {displayProducts.length > 0 && (
                <div className="border border-slate-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                  <div className="bg-slate-50/90 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-3xs font-bold uppercase text-slate-500 tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Package size={12} className="text-slate-400" /> Sản phẩm / Thiết bị theo hợp đồng & báo giá ({displayProducts.length})
                    </span>
                    <span>Đơn giá & Thành tiền</span>
                  </div>
                  <div className="divide-y divide-slate-100 text-2xs">
                    {displayProducts.map((p: any, pIdx: number) => {
                      const qty = Number(p.quantity) || 1;
                      const price = Number(p.unitPrice) || Number(p.donGia) || Number(p.price) || 0;
                      const lineTotal = Number(p.totalPrice) || Number(p.thanhTien) || Number(p.total) || (qty * price);
                      return (
                        <div key={pIdx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-800 block truncate">
                              {p.productName || p.tenSanPham || `Thiết bị #${pIdx + 1}`}
                            </span>
                            {p.productId && (
                              <span className="font-mono text-3xs text-slate-400 block">{p.productId}</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-currency font-bold text-slate-900 tabular-nums">
                              {formatMoney(lineTotal)}
                            </span>
                            <span className="text-3xs text-slate-500 font-medium block">
                              SL: <strong className="font-mono text-slate-700">{qty}</strong> × {formatMoney(price)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tóm tắt Giao hàng & Thanh toán đồng thời nếu có */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Khối Giao hàng */}
                {matchedDeliveries.length > 0 && (
                  <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-3xs font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Truck size={12} className="text-cyan-600" /> Chi tiết giao hàng
                      </span>
                      {matchedDeliveries[0]?.id && (
                        <button
                          type="button"
                          onClick={() => openDrawer('delivery', matchedDeliveries[0].id)}
                          className="text-3xs text-cyan-700 font-bold hover:underline flex items-center gap-0.5 bg-transparent border-0 cursor-pointer p-0"
                        >
                          <span>Mở phiếu</span> <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                    {matchedDeliveries.map((del) => (
                      <div key={del.id} className="text-2xs space-y-0.5 pt-1 border-t border-slate-200/60">
                        <div className="flex justify-between items-center font-mono font-bold text-slate-800">
                          <span>{del.soPhieuXuat || del.deliveryId}</span>
                          <span className={`text-3xs px-1.5 py-0.2 rounded ${del.ngayGiaoThucTe ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {del.ngayGiaoThucTe ? 'Đã giao' : 'Đang giao'}
                          </span>
                        </div>
                        <div className="text-3xs text-slate-500 flex justify-between">
                          <span>Ký nhận: <strong className="text-slate-700">{del.kyNhan || 'Chưa ký'}</strong></span>
                          <span>{del.ngayGiaoThucTe ? formatDate(del.ngayGiaoThucTe) : `Dự kiến: ${formatDate(del.ngayGiaoMay)}`}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Khối Thanh toán */}
                {matchedPayments.length > 0 && (
                  <div className="bg-slate-50/70 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-3xs font-bold uppercase text-slate-500 flex items-center gap-1">
                        <CreditCard size={12} className="text-emerald-600" /> Chi tiết thanh toán
                      </span>
                      {matchedPayments[0]?.id && (
                        <button
                          type="button"
                          onClick={() => openDrawer('payment', matchedPayments[0].id)}
                          className="text-3xs text-emerald-700 font-bold hover:underline flex items-center gap-0.5 bg-transparent border-0 cursor-pointer p-0"
                        >
                          <span>Mở phiếu</span> <ExternalLink size={10} />
                        </button>
                      )}
                    </div>
                    {matchedPayments.map((pay) => (
                      <div key={pay.id} className="text-2xs space-y-0.5 pt-1 border-t border-slate-200/60">
                        <div className="flex justify-between items-center font-mono font-bold text-slate-800">
                          <span>{pay.paymentId || pay.soPhieuThu}</span>
                          <span className="font-currency font-black text-emerald-800 tabular-nums">
                            {formatMoney(pay.soTien)}
                          </span>
                        </div>
                        <div className="text-3xs text-slate-500 flex justify-between">
                          <span>Tình trạng: <strong className="text-slate-700">{pay.tinhTrangThanhToan}</strong></span>
                          <span>{pay.ngayThanhToan ? formatDate(pay.ngayThanhToan) : '—'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
