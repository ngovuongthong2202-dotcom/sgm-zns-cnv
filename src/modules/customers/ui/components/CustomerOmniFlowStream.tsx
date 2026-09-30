import React, { useState, useMemo } from 'react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import { 
  FileText, 
  FileSignature, 
  Truck, 
  CreditCard, 
  Package,
  ExternalLink,
  Layers,
  Sparkles,
  Award,
  Search,
  X,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { hasActualCashCollected } from '@/src/domain/enums/payment-status';
import { cleanDocCode } from '@/src/shared/utils/vietnamBusinessDays';
import { normalizeVietnameseString } from '@/src/shared/services/vietnamAddressParser';

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

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MAY' | 'VAT_TU' | 'DICH_VU'>('ALL');
  const [selectedWorkflowStatus, setSelectedWorkflowStatus] = useState<'ALL' | 'CON_NO' | 'TAT_TOAN' | 'DANG_GIAO' | 'DA_GIAO_DU' | 'DAC_CACH'>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN').format(val) + ' ₫';
  };

  const getQuotationTypeMeta = (loai?: string) => {
    const norm = (loai || '').toUpperCase();
    if (norm.includes('MÁY') || norm.includes('MAY')) {
      return {
        key: 'MAY' as const,
        label: 'BG MÁY',
        color: 'bg-blue-50 text-blue-900 border-blue-300',
        badgeBg: 'bg-blue-700',
        accentBorder: 'border-l-blue-600',
        isMachine: true,
      };
    }
    if (norm.includes('VẬT TƯ') || norm.includes('VAT TU') || norm.includes('LINH KIỆN')) {
      return {
        key: 'VAT_TU' as const,
        label: 'BG VẬT TƯ',
        color: 'bg-emerald-50 text-emerald-950 border-emerald-300',
        badgeBg: 'bg-emerald-700',
        accentBorder: 'border-l-emerald-600',
        isMachine: false,
      };
    }
    if (norm.includes('DỊCH VỤ') || norm.includes('DICH VU') || norm.includes('BẢO TRÌ')) {
      return {
        key: 'DICH_VU' as const,
        label: 'BG DỊCH VỤ',
        color: 'bg-amber-50 text-amber-950 border-amber-300',
        badgeBg: 'bg-amber-700',
        accentBorder: 'border-l-amber-600',
        isMachine: false,
      };
    }
    return {
      key: 'MAY' as const,
      label: loai || 'BÁO GIÁ',
      color: 'bg-slate-100 text-slate-900 border-slate-300',
      badgeBg: 'bg-slate-700',
      accentBorder: 'border-l-slate-600',
      isMachine: false,
    };
  };

  // 1. Phân tích liên thông dữ liệu cho từng Báo Giá
  const enrichedFlows = useMemo(() => {
    return quotations.map((quote) => {
      const typeMeta = getQuotationTypeMeta(quote.loai);
      const isService = (quote.loai || '').toUpperCase().includes('DỊCH VỤ') || 
                        (quote.loai || '').toUpperCase().includes('DICH VU') || 
                        (quote.loai || '').toUpperCase().includes('BẢO TRÌ');

      // Tìm các hợp đồng liên quan (2 chiều: ID và Mã số)
      const matchedContracts = contracts.filter((c) => {
        if (c.deletedAt || c.isDeleted) return false;
        const qIdMatch = quote.id && (c.quotationId === quote.id || c.baoGiaId === quote.id);
        const qCodeMatch = quote.soPhieuBaoGia && c.soBaoGia && cleanDocCode(c.soBaoGia) === cleanDocCode(quote.soPhieuBaoGia);
        const cIdMatch = quote.contractId && c.id === quote.contractId;
        const cCodeMatch = quote.soHopDong && c.soHopDong && cleanDocCode(quote.soHopDong) === cleanDocCode(c.soHopDong);
        return qIdMatch || qCodeMatch || cIdMatch || cCodeMatch;
      });

      // Tìm các phiếu thanh toán liên quan
      const matchedPayments = payments.filter((p) => {
        if (p.deletedAt || p.isDeleted) return false;
        const qMatch = (quote.id && (p.quotationId === quote.id || p.baoGiaId === quote.id)) ||
                       (quote.soPhieuBaoGia && p.soBaoGia && cleanDocCode(p.soBaoGia) === cleanDocCode(quote.soPhieuBaoGia));
        const cMatch = matchedContracts.some((c) => 
          (c.id && (p.contractId === c.id || p.hopDongId === c.id)) ||
          (c.soHopDong && p.soHopDong && cleanDocCode(p.soHopDong) === cleanDocCode(c.soHopDong))
        );
        return qMatch || cMatch;
      });

      // Tìm các phiếu giao hàng liên quan
      const matchedDeliveries = deliveries.filter((d) => {
        if (d.deletedAt || d.isDeleted) return false;
        const qMatch = (quote.id && (d.quotationId === quote.id || d.baoGiaId === quote.id)) ||
                       (quote.soPhieuBaoGia && d.soBaoGia && cleanDocCode(d.soBaoGia) === cleanDocCode(quote.soPhieuBaoGia));
        const cMatch = matchedContracts.some((c) => 
          (c.id && (d.contractId === c.id || d.hopDongId === c.id)) ||
          (c.soHopDong && d.soHopDong && cleanDocCode(d.soHopDong) === cleanDocCode(c.soHopDong))
        );
        return qMatch || cMatch;
      });

      // Tính toán tài chính theo Chuẩn Mực Kế Toán Thương Mại:
      // Báo giá đơn thuần (chưa có HĐ và chưa giao hàng/thu tiền) KHÔNG sinh công nợ
      const quoteTotal = Number(quote.totalAmount || quote.tongTien || quote.triGiaBaoGia || 0);
      const firstContract = matchedContracts[0] || null;
      const contractTotal = firstContract 
        ? Number(firstContract.giaTriHopDong || firstContract.tongGiaTri || firstContract.totalAmount || 0)
        : 0;

      const totalPaid = matchedPayments
        .filter((p) => !p.deletedAt && !p.isDeleted && hasActualCashCollected(p.tinhTrangThanhToan))
        .reduce((sum, p) => sum + Number(p.soTien || 0), 0);

      const hasCommercialCommitment = matchedContracts.length > 0 || matchedDeliveries.length > 0 || matchedPayments.length > 0;
      const effectiveTotal = contractTotal > 0 ? contractTotal : quoteTotal;
      const paymentPercent = effectiveTotal > 0 ? Math.min(100, Math.round((totalPaid / effectiveTotal) * 100)) : (matchedPayments.length > 0 ? 100 : 0);
      const debtRemaining = hasCommercialCommitment ? Math.max(0, effectiveTotal - totalPaid) : 0;

      // Giao hàng
      const hasDelivered = matchedDeliveries.some((d) => !!d.ngayGiaoThucTe);
      const allDeliveriesCount = matchedDeliveries.length;
      const completedDeliveriesCount = matchedDeliveries.filter((d) => !!d.ngayGiaoThucTe).length;

      // Đơn đặc cách
      const isDacCach = Boolean(
        quote.dacCachGiaoTruoc ||
        firstContract?.dacCachGiaoTruoc ||
        firstContract?.isPostDeliverySettlement ||
        matchedPayments.some((p) => p.dacCachGiaoTruoc) ||
        matchedDeliveries.some((d) => d.dacCachGiaoTruoc || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU')
      );

      // Sản phẩm
      const displayProducts = (firstContract?.products && firstContract.products.length > 0)
        ? firstContract.products
        : (quote.sanPham || quote.products || []);

      return {
        quote,
        typeMeta,
        isService,
        matchedContracts,
        firstContract,
        matchedPayments,
        matchedDeliveries,
        quoteTotal,
        contractTotal,
        effectiveTotal,
        totalPaid,
        paymentPercent,
        debtRemaining,
        hasCommercialCommitment,
        hasDelivered,
        allDeliveriesCount,
        completedDeliveriesCount,
        isDacCach,
        displayProducts,
      };
    });
  }, [quotations, contracts, payments, deliveries]);

  // 2. Tính toán số liệu thống kê KPI Tổng hợp
  const kpiStats = useMemo(() => {
    const totalQuotes = enrichedFlows.length;
    const machineQuotes = enrichedFlows.filter(f => f.typeMeta.key === 'MAY').length;
    const supplyQuotes = enrichedFlows.filter(f => f.typeMeta.key === 'VAT_TU').length;
    const serviceQuotes = enrichedFlows.filter(f => f.typeMeta.key === 'DICH_VU').length;

    // Doanh số thực tế ký kết / phát sinh
    const committedFlows = enrichedFlows.filter(f => f.hasCommercialCommitment);
    const totalLtv = committedFlows.reduce((sum, f) => sum + f.effectiveTotal, 0);
    const totalCollected = enrichedFlows.reduce((sum, f) => sum + f.totalPaid, 0);
    const totalDebt = enrichedFlows.reduce((sum, f) => sum + f.debtRemaining, 0);
    const collectionRate = totalLtv > 0 ? Math.round((totalCollected / totalLtv) * 100) : (totalCollected > 0 ? 100 : 0);

    return {
      totalQuotes,
      machineQuotes,
      supplyQuotes,
      serviceQuotes,
      totalLtv,
      totalCollected,
      totalDebt,
      collectionRate
    };
  }, [enrichedFlows]);

  // 3. Lọc và tìm kiếm tức thì 10ms (Omni-Filter Engine)
  const filteredFlows = useMemo(() => {
    let result = enrichedFlows;

    // Lọc theo Tab Phân loại
    if (selectedCategory !== 'ALL') {
      result = result.filter(f => f.typeMeta.key === selectedCategory);
    }

    // Lọc theo Tiến độ nghiệp vụ
    if (selectedWorkflowStatus === 'CON_NO') {
      result = result.filter(f => f.debtRemaining > 0);
    } else if (selectedWorkflowStatus === 'TAT_TOAN') {
      result = result.filter(f => f.paymentPercent === 100 && f.effectiveTotal > 0);
    } else if (selectedWorkflowStatus === 'DANG_GIAO') {
      result = result.filter(f => f.allDeliveriesCount > 0 && !f.hasDelivered);
    } else if (selectedWorkflowStatus === 'DA_GIAO_DU') {
      result = result.filter(f => f.hasDelivered);
    } else if (selectedWorkflowStatus === 'DAC_CACH') {
      result = result.filter(f => f.isDacCach);
    }

    // Tìm kiếm đa trường không dấu (Full-Text Omni-Search)
    if (searchTerm.trim()) {
      const qNorm = normalizeVietnameseString(searchTerm);
      result = result.filter((f) => {
        // Mã báo giá
        if (normalizeVietnameseString(f.quote.soPhieuBaoGia || '').includes(qNorm)) return true;
        if (normalizeVietnameseString(f.quote.tenBaoGia || '').includes(qNorm)) return true;
        // Hợp đồng
        if (f.matchedContracts.some(c => 
          normalizeVietnameseString(c.soHopDong || '').includes(qNorm) ||
          normalizeVietnameseString(c.soDonHang || '').includes(qNorm) ||
          (c.danhSachMaMay || []).some((m: string) => normalizeVietnameseString(m).includes(qNorm))
        )) return true;
        // Phiếu thu
        if (f.matchedPayments.some(p => 
          normalizeVietnameseString(p.soPhieu || p.paymentId || '').includes(qNorm) ||
          normalizeVietnameseString(p.soChungTuThamChieu || '').includes(qNorm)
        )) return true;
        // Phiếu giao hàng & serial
        if (f.matchedDeliveries.some(d => 
          normalizeVietnameseString(d.soPhieuGiaoHang || d.soPhieuXuat || d.deliveryId || '').includes(qNorm) ||
          (d.danhSachMaMay || []).some((m: string) => normalizeVietnameseString(m).includes(qNorm))
        )) return true;
        // Tên sản phẩm / model máy
        if (f.displayProducts.some((p: any) => 
          normalizeVietnameseString(p.productName || p.tenSanPham || '').includes(qNorm) ||
          normalizeVietnameseString(p.productId || '').includes(qNorm)
        )) return true;

        return false;
      });
    }

    // Sắp xếp thời gian mới nhất lên đầu
    return [...result].sort((a, b) => {
      const tA = new Date(a.quote.createdAt || a.quote.ngayCapNhat || a.quote.ngayBaoGia || 0).getTime();
      const tB = new Date(b.quote.createdAt || b.quote.ngayCapNhat || b.quote.ngayBaoGia || 0).getTime();
      return tB - tA;
    });
  }, [enrichedFlows, selectedCategory, selectedWorkflowStatus, searchTerm]);

  if (quotations.length === 0 && contracts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-300 p-8 text-center text-slate-600 text-xs shadow-2xs space-y-2">
        <Sparkles className="mx-auto text-blue-600" size={28} />
        <p className="font-bold text-slate-800 text-sm">Chưa ghi nhận dòng chảy giao dịch nào cho khách hàng này.</p>
        <p className="text-xs text-slate-500">Các hồ sơ Báo giá, Hợp đồng, Giao hàng và Thanh toán sẽ tự động liên thông tại đây.</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 select-none ${className}`}>
      {/* 1. OMNI-CONSOLE HEADER & KPI SUMMARY BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-lg shadow-2xs shrink-0">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                DÒNG CHẢY GIAO DỊCH 360° (CUSTOMER OMNI-FLOW)
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-200">
                  {kpiStats.totalQuotes} Luồng Giao Dịch
                </span>
              </h3>
              <p className="text-slate-700 text-xs font-medium mt-0.5">
                Bàn điều khiển trung tâm liên thông Máy ([Báo giá] ➔ [Hợp đồng] ➔ [Thanh toán] ➔ [Giao hàng]) và Vật tư / Dịch vụ.
              </p>
            </div>
          </div>

          {/* Dual-View Switcher Button */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid size={13} />
              Dạng Thẻ Dòng Chảy
            </button>
            <button
              type="button"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TableIcon size={13} />
              Ma Trận Tổng Hợp ({filteredFlows.length})
            </button>
          </div>
        </div>

        {/* 4 Financial Golden Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Tổng Trị Giá Doanh Số
            </span>
            <div className="font-currency font-black text-sm text-slate-900 tabular-nums">
              {formatMoney(kpiStats.totalLtv)}
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800 block mb-1">
              Đã Thực Thu ({kpiStats.collectionRate}%)
            </span>
            <div className="font-currency font-black text-sm text-emerald-900 tabular-nums">
              {formatMoney(kpiStats.totalCollected)}
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <span className="text-2xs font-bold uppercase tracking-wider text-amber-800 block mb-1">
              Công Nợ Hiện Tại
            </span>
            <div className="font-currency font-black text-sm text-amber-900 tabular-nums">
              {kpiStats.totalDebt > 0 ? formatMoney(kpiStats.totalDebt) : '✓ Đã tất toán'}
            </div>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-2xs font-bold uppercase tracking-wider text-blue-800 block mb-1">
              Phân Loại Đơn Hàng
            </span>
            <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
              <span className="font-mono bg-white text-blue-900 px-1.5 py-0.2 rounded border border-blue-200">
                {kpiStats.machineQuotes} Máy
              </span>
              <span className="font-mono bg-white text-emerald-900 px-1.5 py-0.2 rounded border border-emerald-200">
                {kpiStats.supplyQuotes} Vật tư
              </span>
              <span className="font-mono bg-white text-amber-900 px-1.5 py-0.2 rounded border border-amber-200">
                {kpiStats.serviceQuotes} Dịch vụ
              </span>
            </div>
          </div>
        </div>

        {/* 2. UNIVERSAL QUICK-SEARCH & FACET FILTERS */}
        <div className="space-y-2.5 pt-1">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm siêu tốc theo mã BG, số HĐ, số phiếu thu, phiếu giao, tên máy, model, số serial..."
              className="w-full h-10 pl-10 pr-9 border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 bg-slate-50/50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Segmented Type Pills & Status Facets */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: `Tất cả (${kpiStats.totalQuotes})` },
                { id: 'MAY', label: `🏭 Báo giá Máy (${kpiStats.machineQuotes})` },
                { id: 'VAT_TU', label: `🔩 Vật tư (${kpiStats.supplyQuotes})` },
                { id: 'DICH_VU', label: `🔧 Dịch vụ (${kpiStats.serviceQuotes})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id as any)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                    selectedCategory === tab.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Workflow status facets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { id: 'ALL', label: 'Tất cả tiến độ' },
                { id: 'CON_NO', label: '💰 Còn nợ' },
                { id: 'TAT_TOAN', label: '✅ Đã tất toán' },
                { id: 'DANG_GIAO', label: '🚚 Đang giao' },
                { id: 'DA_GIAO_DU', label: '📦 Đã bàn giao' },
                { id: 'DAC_CACH', label: '⭐ Đơn đặc cách' },
              ].map((facet) => (
                <button
                  key={facet.id}
                  type="button"
                  onClick={() => setSelectedWorkflowStatus(facet.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all border cursor-pointer ${
                    selectedWorkflowStatus === facet.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {facet.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Thông báo kết quả tìm kiếm nếu lọc */}
      {(searchTerm || selectedCategory !== 'ALL' || selectedWorkflowStatus !== 'ALL') && (
        <div className="flex items-center justify-between text-xs text-slate-700 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
          <span>
            Đang hiển thị <strong>{filteredFlows.length}</strong> / <strong>{kpiStats.totalQuotes}</strong> luồng giao dịch phù hợp
          </span>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setSelectedWorkflowStatus('ALL');
            }}
            className="text-xs font-bold text-blue-700 hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            Xóa bộ lọc
          </button>
        </div>
      )}

      {/* 3. HIỂN THỊ DỮ LIỆU: VIEW MODE MATRIX TABLE (Dành cho quét nhanh 100 đơn) */}
      {viewMode === 'matrix' ? (
        <div className="bg-white rounded-xl border border-slate-300 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-2xs font-extrabold uppercase text-slate-700 tracking-wider">
                  <th className="py-2.5 px-3">STT</th>
                  <th className="py-2.5 px-3">Loại</th>
                  <th className="py-2.5 px-3">Báo Giá</th>
                  <th className="py-2.5 px-3">Hợp Đồng</th>
                  <th className="py-2.5 px-3">Tiến Độ Thu Tiền</th>
                  <th className="py-2.5 px-3">Giao Hàng</th>
                  <th className="py-2.5 px-3 text-right">Tổng Tiền</th>
                  <th className="py-2.5 px-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredFlows.map((f, idx) => (
                  <tr key={f.quote.id || idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-500">{idx + 1}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-3xs font-extrabold px-2 py-0.5 rounded border ${f.typeMeta.color}`}>
                        {f.typeMeta.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <button
                        type="button"
                        onClick={() => f.quote.id && openDrawer('quotation', f.quote.id)}
                        className="font-mono font-bold text-xs text-blue-700 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                      >
                        {f.quote.soPhieuBaoGia} <ExternalLink size={10} />
                      </button>
                      <span className="text-3xs text-slate-600 block">
                        {formatDate(f.quote.createdAt || f.quote.ngayBaoGia)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      {f.firstContract ? (
                        <button
                          type="button"
                          onClick={() => openDrawer('contract', f.firstContract.id)}
                          className="font-mono font-bold text-xs text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                        >
                          {f.firstContract.soHopDong} <ExternalLink size={10} />
                        </button>
                      ) : (
                        <span className="text-3xs text-slate-500 italic">Chưa lập</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-3xs font-black px-1.5 py-0.2 rounded border font-mono ${
                          f.paymentPercent === 100 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {f.paymentPercent}%
                        </span>
                        <span className="font-currency font-black text-slate-900 tabular-nums">
                          {formatMoney(f.totalPaid)}
                        </span>
                      </div>
                      {f.debtRemaining > 0 ? (
                        <span className="text-3xs text-amber-800 font-semibold block">
                          Nợ: {formatMoney(f.debtRemaining)}
                        </span>
                      ) : !f.hasCommercialCommitment ? (
                        <span className="text-3xs text-blue-700 font-semibold italic block">
                          Dự toán chào hàng
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 px-3">
                      {f.hasDelivered ? (
                        <span className="text-3xs font-bold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                          ✓ Đã giao xong
                        </span>
                      ) : f.allDeliveriesCount > 0 ? (
                        <span className="text-3xs font-bold text-cyan-900 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-300">
                          Đang giao ({f.allDeliveriesCount} phiếu)
                        </span>
                      ) : (
                        <span className="text-3xs text-slate-500">Chưa xuất kho</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-currency font-black text-xs text-slate-900 tabular-nums">
                        {formatMoney(f.effectiveTotal)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => f.quote.id && openDrawer('quotation', f.quote.id)}
                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 4. HIỂN THỊ DỮ LIỆU: VIEW MODE DETAILED CARDS */
        <div className="space-y-4">
          {filteredFlows.map((f) => (
            <div
              key={f.quote.id || f.quote.soPhieuBaoGia}
              className={`bg-white rounded-xl border border-slate-300 border-l-4 ${f.typeMeta.accentBorder} shadow-xs hover:shadow-sm transition-all overflow-hidden`}
            >
              {/* Pod Header: Loại báo giá, Mã BG, Ngày, Tổng tiền */}
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`text-2xs font-black uppercase px-2.5 py-0.5 rounded-md border ${f.typeMeta.color}`}>
                    {f.typeMeta.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => f.quote.id && openDrawer('quotation', f.quote.id)}
                    className="font-mono text-xs font-black text-slate-900 hover:text-blue-700 transition-colors flex items-center gap-1 cursor-pointer bg-transparent border-0 p-0"
                  >
                    <span>{f.quote.soPhieuBaoGia || 'Báo giá'}</span>
                    <ExternalLink size={12} className="text-blue-700" />
                  </button>
                  <span className="text-xs font-semibold text-slate-700 font-mono bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    Ngày lập: {formatDate(f.quote.createdAt || f.quote.ngayCapNhat || f.quote.ngayBaoGia)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-2xs font-bold uppercase tracking-wider text-slate-700 block">Trị giá Báo Giá</span>
                    <span className="font-currency font-black text-xs text-slate-900 tabular-nums">
                      {formatMoney(f.quoteTotal)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Visual Pipeline 4 chặng / 3 chặng */}
              <div className="p-4 bg-slate-50/30 border-b border-slate-200">
                <div className={`grid gap-2.5 ${f.typeMeta.isMachine ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
                  {/* Chặng 1: Báo giá */}
                  <div 
                    onClick={() => f.quote.id && openDrawer('quotation', f.quote.id)}
                    className="bg-white p-3 rounded-lg border border-slate-300 hover:border-blue-500 transition-all cursor-pointer flex flex-col justify-between shadow-2xs group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xs font-bold uppercase text-slate-700 flex items-center gap-1">
                        <FileText size={13} className="text-blue-700" /> 1. Báo Giá
                      </span>
                      <span className="text-3xs font-extrabold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {f.quote.tinhTrangBaoGia || f.quote.trangThai || 'Hoàn tất'}
                      </span>
                    </div>
                    <div>
                      <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-700 truncate block">
                        {f.quote.soPhieuBaoGia}
                      </span>
                      <span className="font-currency font-bold text-xs text-slate-800 tabular-nums mt-0.5 block">
                        {formatMoney(f.quoteTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Chặng 2: Hợp đồng (Chỉ hiện khi là Báo Giá Máy) */}
                  {f.typeMeta.isMachine && (
                    <div 
                      onClick={() => f.firstContract?.id && openDrawer('contract', f.firstContract.id)}
                      className={`p-3 rounded-lg border transition-all flex flex-col justify-between shadow-2xs ${
                        f.firstContract 
                          ? 'bg-white border-slate-300 hover:border-emerald-500 cursor-pointer group' 
                          : 'bg-slate-50 border-dashed border-slate-300 cursor-default'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-2xs font-bold uppercase text-slate-700 flex items-center gap-1">
                          <FileSignature size={13} className={f.firstContract ? 'text-emerald-700' : 'text-slate-500'} /> 2. Hợp Đồng
                        </span>
                        {f.firstContract ? (
                          <span className="text-3xs font-extrabold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                            {f.firstContract.tinhTrangHopDong || 'Đã ký'}
                          </span>
                        ) : (
                          <span className="text-2xs text-slate-600 font-semibold">Chưa lập HĐ</span>
                        )}
                      </div>
                      <div>
                        {f.firstContract ? (
                          <>
                            <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-emerald-700 truncate block">
                              {f.firstContract.soHopDong}
                            </span>
                            <span className="font-currency font-bold text-xs text-slate-800 tabular-nums mt-0.5 block">
                              {formatMoney(f.contractTotal)}
                            </span>
                          </>
                        ) : (
                          <span className="text-2xs text-slate-600 italic block">
                            Chờ ký hợp đồng máy
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chặng 3: Thanh toán */}
                  <div 
                    onClick={() => f.matchedPayments[0]?.id && openDrawer('payment', f.matchedPayments[0].id)}
                    className={`p-3 rounded-lg border transition-all flex flex-col justify-between shadow-2xs ${
                      f.matchedPayments.length > 0
                        ? 'bg-white border-slate-300 hover:border-amber-500 cursor-pointer group'
                        : 'bg-slate-50 border-dashed border-slate-300 cursor-default'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xs font-bold uppercase text-slate-700 flex items-center gap-1">
                        <CreditCard size={13} className={f.matchedPayments.length > 0 ? 'text-amber-800' : 'text-slate-500'} /> {f.typeMeta.isMachine ? '3. Thanh Toán' : '2. Thanh Toán'}
                      </span>
                      <span className={`text-2xs font-bold px-1.5 py-0.2 rounded border font-mono ${
                        f.paymentPercent === 100 
                          ? 'text-emerald-900 bg-emerald-50 border-emerald-300' 
                          : f.matchedPayments.length > 0 
                          ? 'text-amber-950 bg-amber-50 border-amber-300' 
                          : 'text-slate-600 bg-slate-100 border-slate-300'
                      }`}>
                        {f.paymentPercent === 100 ? 'Tất toán' : `${f.paymentPercent}%`}
                      </span>
                    </div>
                    <div>
                      {f.matchedPayments.length > 0 ? (
                        <>
                          <span className="font-currency font-black text-xs text-slate-900 truncate block tabular-nums">
                            Đã thu: {formatMoney(f.totalPaid)}
                          </span>
                          <span className="text-2xs text-slate-700 font-semibold mt-0.5 block">
                            {f.debtRemaining > 0 ? (
                              <span className="text-amber-900 font-bold">Nợ còn: {formatMoney(f.debtRemaining)}</span>
                            ) : (
                              <span className="text-emerald-800 font-bold">✓ Đã tất toán 100%</span>
                            )}
                          </span>
                        </>
                      ) : !f.hasCommercialCommitment ? (
                        <div className="space-y-0.5">
                          <span className="text-2xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-bold block">
                            📋 Dự toán (Chờ ký HĐ)
                          </span>
                          <span className="text-3xs text-slate-500 font-medium italic block">
                            Chưa phát sinh công nợ
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xs text-slate-600 italic block">
                          Chưa phát sinh phiếu thu
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Chặng 4: Giao hàng */}
                  <div 
                    onClick={() => f.matchedDeliveries[0]?.id && openDrawer('delivery', f.matchedDeliveries[0].id)}
                    className={`p-3 rounded-lg border transition-all flex flex-col justify-between shadow-2xs ${
                      f.matchedDeliveries.length > 0
                        ? 'bg-white border-slate-300 hover:border-cyan-500 cursor-pointer group'
                        : 'bg-slate-50 border-dashed border-slate-300 cursor-default'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-2xs font-bold uppercase text-slate-700 flex items-center gap-1">
                        <Truck size={13} className={f.matchedDeliveries.length > 0 ? 'text-cyan-800' : 'text-slate-500'} /> {f.typeMeta.isMachine ? '4. Giao Hàng' : f.isService ? '3. Nghiệm Thu' : '3. Giao Hàng'}
                      </span>
                      {f.hasDelivered ? (
                        <span className="text-2xs font-bold text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-300">
                          {f.isService ? 'Đã nghiệm thu' : `Đã giao (${f.completedDeliveriesCount}/${f.allDeliveriesCount})`}
                        </span>
                      ) : f.matchedDeliveries.length > 0 ? (
                        <span className="text-2xs font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-300">
                          {f.isService ? 'Đang thực hiện' : `Đang giao (${f.allDeliveriesCount} phiếu)`}
                        </span>
                      ) : (
                        <span className="text-2xs text-slate-600 font-semibold">
                          {f.isService ? 'Chờ triển khai' : 'Chưa xuất kho'}
                        </span>
                      )}
                    </div>
                    <div>
                      {f.matchedDeliveries.length > 0 ? (
                        <>
                          <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-cyan-800 truncate block">
                            {f.matchedDeliveries[0].soPhieuGiaoHang || f.matchedDeliveries[0].soPhieuXuat || 'Phiếu xuất kho'}
                          </span>
                          <span className="text-xs font-semibold text-slate-700 font-mono mt-0.5 block">
                            {f.matchedDeliveries[0].ngayGiaoThucTe 
                              ? `${f.isService ? 'N.Thu:' : 'Giao:'} ${formatDate(f.matchedDeliveries[0].ngayGiaoThucTe)}` 
                              : `Hạn: ${formatDate(f.matchedDeliveries[0].ngayGiaoMay)}`}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xs text-slate-600 italic block">
                          {f.isService ? 'Chưa nghiệm thu' : 'Chưa xuất kho'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Banner đặc cách */}
                {f.isDacCach && (
                  <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center justify-between text-xs font-semibold text-amber-950">
                    <span className="flex items-center gap-1.5">
                      <Award size={14} className="text-amber-700 shrink-0" />
                      <strong>Đơn hàng Đặc Cách Ban Giám Đốc:</strong> Bàn giao máy trước theo cam kết, tất toán công nợ sau.
                    </span>
                    <span className="text-amber-900 font-bold font-mono text-2xs bg-white px-2 py-0.5 rounded border border-amber-300">
                      ĐÃ KÍCH HOẠT
                    </span>
                  </div>
                )}
              </div>

              {/* Danh sách máy & thiết bị */}
              {f.displayProducts.length > 0 && (
                <div className="p-4 bg-white space-y-2">
                  <div className="flex items-center justify-between text-2xs font-bold uppercase text-slate-700 tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <Package size={13} className="text-blue-700" /> Sản phẩm / Thiết bị ({f.displayProducts.length})
                    </span>
                    <span>Đơn giá & Thành tiền</span>
                  </div>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100 text-xs">
                    {f.displayProducts.map((prod: any, pIdx: number) => {
                      const qty = Number(prod.quantity) || 1;
                      const price = Number(prod.unitPrice) || Number(prod.donGia) || Number(prod.price) || 0;
                      const lineTotal = Number(prod.totalPrice) || Number(prod.thanhTien) || Number(prod.total) || (qty * price);
                      return (
                        <div key={pIdx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-900 block truncate">
                              {prod.productName || prod.tenSanPham || `Thiết bị #${pIdx + 1}`}
                            </span>
                            {prod.productId && (
                              <span className="font-mono text-xs text-slate-500 block font-semibold">{prod.productId}</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-currency font-black text-slate-900 tabular-nums block">
                              {formatMoney(lineTotal)}
                            </span>
                            <span className="text-2xs text-slate-600 font-medium block">
                              SL: <strong className="font-mono text-slate-900 font-bold">{qty}</strong> × {formatMoney(price)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
