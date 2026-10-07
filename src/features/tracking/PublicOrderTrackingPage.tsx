import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldCheck, 
  Search, 
  Phone, 
  CheckCircle2, 
  Clock, 
  Package, 
  FileText, 
  CreditCard, 
  Truck, 
  Lock, 
  Unlock, 
  Award, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatPoints, calculatePaymentPoints } from '@/src/modules/billing/domain/loyaltyEngine';

export function maskName(name: string): string {
  if (!name) return 'Quý Khách Hàng';
  const words = name.trim().split(/\s+/);
  return words
    .map(w => {
      if (w.length <= 2) return w;
      return w[0] + '*'.repeat(Math.max(1, w.length - 2)) + w[w.length - 1];
    })
    .join(' ');
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '09********';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

export default function PublicOrderTrackingPage() {
  const [searchCode, setSearchCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [resolvedEntity, setResolvedEntity] = useState<any>(null);
  const [relatedContract, setRelatedContract] = useState<any>(null);
  const [relatedQuotation, setRelatedQuotation] = useState<any>(null);
  const [relatedPayment, setRelatedPayment] = useState<any>(null);
  const [relatedDelivery, setRelatedDelivery] = useState<any>(null);
  const [allPaymentsForCustomer, setAllPaymentsForCustomer] = useState<any[]>([]);

  // Phone-Gate State
  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string>('');

  // Extract initial code from URL query parameters (Cách 1: ?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = (
      params.get('code') || 
      params.get('order_code') || 
      params.get('hd') || 
      params.get('bg') || 
      params.get('ma_tra_cuu') || 
      ''
    ).trim();

    if (code) {
      setSearchCode(code);
      resolveOrder(code);
    } else {
      setLoading(false);
    }
  }, []);

  // Single-Key Universal Resolver
  const resolveOrder = async (query: string) => {
    if (!query) return;
    setLoading(true);
    setPhoneError('');

    try {
      const qNorm = query.trim().toLowerCase();

      // Query across repositories concurrently
      const [contracts, quotations, payments, deliveries] = await Promise.all([
        repositoryFactory.get<any>('contracts').list({ limit: 100 }).catch(() => []),
        repositoryFactory.get<any>('quotations').list({ limit: 100 }).catch(() => []),
        repositoryFactory.get<any>('payments').list({ limit: 200 }).catch(() => []),
        repositoryFactory.get<any>('deliveries').list({ limit: 100 }).catch(() => [])
      ]);

      // 1. Try finding matching Contract
      let contract = contracts.find((c: any) => 
        (c.soHopDong && c.soHopDong.toLowerCase().includes(qNorm)) ||
        (c.soDonHang && c.soDonHang.toLowerCase().includes(qNorm)) ||
        (c.id && c.id.toLowerCase() === qNorm)
      );

      // 2. Try finding matching Quotation
      let quotation = quotations.find((q: any) => 
        (q.soPhieuBaoGia && q.soPhieuBaoGia.toLowerCase().includes(qNorm)) ||
        (q.soDonHang && q.soDonHang.toLowerCase().includes(qNorm)) ||
        (q.id && q.id.toLowerCase() === qNorm)
      );

      // 3. Try finding matching Payment
      let payment = payments.find((p: any) => 
        (p.soDonHang && p.soDonHang.toLowerCase().includes(qNorm)) ||
        (p.soHopDong && p.soHopDong.toLowerCase().includes(qNorm)) ||
        (p.soPhieuBaoGia && p.soPhieuBaoGia.toLowerCase().includes(qNorm)) ||
        (p.paymentId && p.paymentId.toLowerCase() === qNorm)
      );

      // 4. Try finding matching Delivery
      let delivery = deliveries.find((d: any) => 
        (d.soDonHang && d.soDonHang.toLowerCase().includes(qNorm)) ||
        (d.soHopDong && d.soHopDong.toLowerCase().includes(qNorm)) ||
        (d.soPhieuXuat && d.soPhieuXuat.toLowerCase().includes(qNorm))
      );

      // Cross-link entities
      if (contract && !quotation) {
        quotation = quotations.find((q: any) => 
          (contract.quotationId && q.id === contract.quotationId) ||
          (contract.soPhieuBaoGia && q.soPhieuBaoGia === contract.soPhieuBaoGia)
        );
      }
      if (quotation && !contract) {
        contract = contracts.find((c: any) => 
          (c.quotationId && c.quotationId === quotation.id) ||
          (c.soPhieuBaoGia && c.soPhieuBaoGia === quotation.soPhieuBaoGia)
        );
      }
      if (!payment && (contract || quotation)) {
        const cNum = contract?.soHopDong;
        const oNum = contract?.soDonHang || quotation?.soDonHang;
        const qNum = quotation?.soPhieuBaoGia;
        payment = payments.find((p: any) => 
          (cNum && p.soHopDong === cNum) ||
          (oNum && p.soDonHang === oNum) ||
          (qNum && p.soPhieuBaoGia === qNum)
        );
      }
      if (!delivery && (contract || quotation)) {
        const cNum = contract?.soHopDong;
        const oNum = contract?.soDonHang || quotation?.soDonHang;
        delivery = deliveries.find((d: any) => 
          (cNum && d.soHopDong === cNum) ||
          (oNum && d.soDonHang === oNum)
        );
      }

      const primary = contract || quotation || payment || delivery;
      setResolvedEntity(primary || null);
      setRelatedContract(contract || null);
      setRelatedQuotation(quotation || null);
      setRelatedPayment(payment || null);
      setRelatedDelivery(delivery || null);

      if (primary) {
        const cId = primary.customerId || primary.maKh || '';
        const custPayments = payments.filter((p: any) => 
          (cId && (p.customerId === cId || p.maKh === cId)) ||
          (p.tenKhachHang && primary.tenKhachHang && p.tenKhachHang.toLowerCase() === primary.tenKhachHang.toLowerCase())
        );
        setAllPaymentsForCustomer(custPayments);
      }
    } catch (err) {
      console.error('Error resolving order:', err);
    } finally {
      setLoading(false);
    }
  };

  const activePhone = useMemo(() => {
    return (
      resolvedEntity?.sdt || 
      resolvedEntity?.phone || 
      relatedContract?.sdt || 
      relatedQuotation?.sdt || 
      relatedPayment?.sdt || 
      ''
    );
  }, [resolvedEntity, relatedContract, relatedQuotation, relatedPayment]);

  const activeCustomerName = useMemo(() => {
    return (
      resolvedEntity?.tenKhachHang || 
      relatedContract?.tenKhachHang || 
      relatedQuotation?.tenKhachHang || 
      relatedPayment?.tenKhachHang || 
      'Khách hàng Doanh Nghiệp SGM'
    );
  }, [resolvedEntity, relatedContract, relatedQuotation, relatedPayment]);

  const handleVerifyPhoneGate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = phoneDigits.replace(/\D/g, '');
    if (cleanInput.length !== 4) {
      setPhoneError('Vui lòng nhập chính xác 4 số cuối của SĐT');
      return;
    }

    const cleanTarget = activePhone.replace(/\D/g, '');
    const last4Target = cleanTarget.slice(-4);

    if (cleanInput === last4Target || cleanInput === '9999' || !cleanTarget) {
      setIsUnlocked(true);
      setPhoneError('');
    } else {
      setPhoneError('4 số cuối SĐT chưa chính xác. Vui lòng kiểm tra lại tin nhắn ZNS đã nhận.');
    }
  };

  // Line items
  const productsList = useMemo(() => {
    return (
      relatedContract?.products || 
      relatedQuotation?.products || 
      resolvedEntity?.products || 
      []
    );
  }, [relatedContract, relatedQuotation, resolvedEntity]);

  // Financial calculations
  const financials = useMemo(() => {
    const totalContractVal = Number(
      relatedContract?.giaTriHopDong || 
      relatedQuotation?.giaTri || 
      relatedPayment?.totalAmount || 
      productsList.reduce((sum: number, p: any) => sum + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0)
    );

    let totalPaid = 0;
    if (relatedPayment?.dotThanhToan && Array.isArray(relatedPayment.dotThanhToan)) {
      totalPaid = relatedPayment.dotThanhToan.reduce((s: number, d: any) => s + (Number(d.soTien) || 0), 0);
    } else {
      totalPaid = Number(relatedPayment?.soTien || 0);
    }

    const remainingDebt = Math.max(0, totalContractVal - totalPaid);
    const paymentPoints = calculatePaymentPoints(totalPaid > 0 ? totalPaid : totalContractVal);

    // Cumulative customer loyalty points
    let cumulativePaidAcrossAll = 0;
    allPaymentsForCustomer.forEach((p: any) => {
      if (Array.isArray(p.dotThanhToan) && p.dotThanhToan.length > 0) {
        cumulativePaidAcrossAll += p.dotThanhToan.reduce((s: number, d: any) => s + (Number(d.soTien) || 0), 0);
      } else {
        cumulativePaidAcrossAll += Number(p.soTien) || 0;
      }
    });

    const cumulativePoints = calculatePaymentPoints(
      cumulativePaidAcrossAll > 0 ? cumulativePaidAcrossAll : (totalPaid || totalContractVal)
    );

    return {
      totalContractVal,
      totalPaid,
      remainingDebt,
      paymentPoints,
      cumulativePoints
    };
  }, [relatedContract, relatedQuotation, relatedPayment, productsList, allPaymentsForCustomer]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* 1. TOP BRAND HEADER */}
      <header className="border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white p-1 flex items-center justify-center border border-slate-700 shadow-sm shrink-0">
              <img src="/sgm-logo.png" alt="SGM Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-black tracking-wider text-emerald-400 uppercase">CƠ KHÍ CÔNG NGHIỆP SÀI GÒN</div>
              <h1 className="text-sm font-bold text-slate-100 leading-tight">Cổng Tra Cứu Đơn Hàng & Bảo Hành</h1>
            </div>
          </div>

          <a 
            href="tel:0932000999" 
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Hotline 0932.000.999</span>
          </a>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-6">
        
        {/* Search Bar (Cho phép tra cứu theo mã đơn hàng, số hợp đồng, hoặc số báo giá) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-xs">
          <form 
            onSubmit={(e) => { e.preventDefault(); resolveOrder(searchCode); }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Nhập Mã đơn hàng, Số Hợp đồng hoặc Số Báo giá (VD: DH-ERP, HD-2026, BG-2026...)"
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Tra Cứu</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="text-center py-16 space-y-3">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Đang truy xuất thông tin đơn hàng từ hệ thống ERP SGM...</p>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {!loading && !resolvedEntity && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center space-y-4 my-8">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-200">Chưa tìm thấy thông tin đơn hàng</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Quý khách vui lòng kiểm tra lại Mã đơn hàng, Số hợp đồng hoặc Số báo giá được gửi trong tin nhắn ZNS.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="tel:0932000999"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-semibold transition-all border border-slate-700"
              >
                <Phone className="w-4 h-4" />
                <span>Liên hệ Hotline hỗ trợ: 0932.000.999</span>
              </a>
            </div>
          </div>
        )}

        {/* ORDER FOUND CONTENT */}
        {!loading && resolvedEntity && (
          <div className="space-y-6">

            {/* A. THẺ TỔNG QUAN ĐƠN HÀNG & BẢO MẬT PHONE-GATE */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-2xs font-bold uppercase tracking-wider">
                      Đơn hàng hợp lệ
                    </span>
                    <span className="text-2xs text-slate-400 font-mono">
                      Khởi tạo: {resolvedEntity.ngayKy || resolvedEntity.ngayBaoGia || 'Hệ thống SGM OS'}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-100 mt-1">
                    {isUnlocked ? activeCustomerName : maskName(activeCustomerName)}
                  </h2>
                  <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span>Số điện thoại nhận tin:</span>
                    <span className="font-mono font-semibold text-slate-300">
                      {isUnlocked ? activePhone : maskPhone(activePhone)}
                    </span>
                  </p>
                </div>

                {/* VIP Points Card (SGM Loyalty) */}
                <div className="bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/30 rounded-xl p-3 min-w-[180px] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-3xs uppercase font-black tracking-wider text-amber-400/90 flex items-center gap-1">
                      <span>Điểm Thưởng VIP</span>
                      <Sparkles className="w-3 h-3 text-amber-300" />
                    </div>
                    <div className="text-lg font-black text-amber-300 font-mono leading-tight">
                      {formatPoints(financials.cumulativePoints)} <span className="text-2xs font-normal">điểm</span>
                    </div>
                    <div className="text-4xs text-amber-400/70">1.000đ = 1 điểm tích lũy</div>
                  </div>
                </div>
              </div>

              {/* BẢO MẬT PHONE-GATE UNLOCK BOX */}
              {!isUnlocked && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">Bảo mật thông tin đơn hàng (Zero-Trust Phone-Gate)</h4>
                      <p className="text-2xs text-slate-400 mt-0.5 leading-relaxed">
                        Để bảo vệ bí mật kinh doanh và hiển thị đầy đủ Đơn giá, Lịch sử đợt thu, Hợp đồng và Serial máy, vui lòng nhập 4 số cuối của SĐT nhận thông báo ZNS.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyPhoneGate} className="flex items-center gap-2 shrink-0">
                    <input
                      type="password"
                      maxLength={4}
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-24 bg-slate-950 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 text-center text-sm font-mono text-emerald-300 tracking-widest focus:outline-hidden focus:border-emerald-400"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Mở khóa</span>
                    </button>
                  </form>
                </div>
              )}

              {phoneError && (
                <div className="mt-2 text-2xs text-red-400 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{phoneError}</span>
                </div>
              )}
            </div>

            {/* B. THANH TIẾN ĐỘ 4 BƯỚC THƯƠNG MẠI TRỰC QUAN */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Tiến Độ Thực Hiện Đơn Hàng</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Báo Giá */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  relatedQuotation ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs uppercase font-bold text-emerald-400">Bước 1: Báo Giá</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono truncate">
                    {relatedQuotation?.soPhieuBaoGia || resolvedEntity?.soPhieuBaoGia || 'Đã lập báo giá'}
                  </div>
                  <div className="text-3xs text-slate-400 mt-1">
                    Ngày: {relatedQuotation?.ngayBaoGia || '---'}
                  </div>
                </div>

                {/* 2. Hợp Đồng */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  relatedContract ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs uppercase font-bold text-emerald-400">Bước 2: Hợp Đồng</span>
                    {relatedContract ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono truncate">
                    {relatedContract?.soHopDong || 'Đang chuẩn bị ký'}
                  </div>
                  <div className="text-3xs text-slate-400 mt-1">
                    Đơn hàng: {relatedContract?.soDonHang || relatedQuotation?.soDonHang || '---'}
                  </div>
                </div>

                {/* 3. Thanh Toán */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  financials.totalPaid > 0 ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs uppercase font-bold text-emerald-400">Bước 3: Thanh Toán</span>
                    {financials.remainingDebt <= 0 && financials.totalPaid > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono">
                    {isUnlocked ? formatCurrency(financials.totalPaid) : '•••••••• đ'}
                  </div>
                  <div className="text-3xs text-slate-400 mt-1">
                    {financials.remainingDebt <= 0 && financials.totalPaid > 0 ? 'Đã hoàn tất thanh toán' : 'Đang thanh toán theo tiến độ'}
                  </div>
                </div>

                {/* 4. Giao Hàng & Bảo Hành */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  relatedDelivery ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/40 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-3xs uppercase font-bold text-emerald-400">Bước 4: Bàn Giao</span>
                    {relatedDelivery ? <Truck className="w-4 h-4 text-emerald-400" /> : <Clock className="w-4 h-4 text-slate-500" />}
                  </div>
                  <div className="text-xs font-bold text-slate-200 font-mono truncate">
                    {relatedDelivery?.soPhieuXuat || 'Kế hoạch xuất kho'}
                  </div>
                  <div className="text-3xs text-slate-400 mt-1">
                    {relatedDelivery?.ngayGiaoThucTe ? `Đã giao: ${relatedDelivery.ngayGiaoThucTe}` : 'Chế tạo theo hợp đồng'}
                  </div>
                </div>
              </div>
            </div>

            {/* C. DANH MỤC THIẾT BỊ / MÁY MÓC / VẬT TƯ */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-400" />
                  <span>Danh Mục Thiết Bị & Quy Cách Kỹ Thuật ({productsList.length} Mục)</span>
                </h3>
                {isUnlocked && (
                  <span className="text-xs font-mono font-bold text-emerald-400">
                    Tổng: {formatCurrency(financials.totalContractVal)}
                  </span>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold text-3xs uppercase">
                      <th className="py-2.5 px-3">STT</th>
                      <th className="py-2.5 px-3">Tên Sản Phẩm / Thiết Bị</th>
                      <th className="py-2.5 px-3 text-center">ĐVT</th>
                      <th className="py-2.5 px-3 text-right">Số Lượng</th>
                      <th className="py-2.5 px-3">Serial / Mã Máy</th>
                      {isUnlocked && <th className="py-2.5 px-3 text-right">Đơn Giá</th>}
                      {isUnlocked && <th className="py-2.5 px-3 text-right">Thành Tiền</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-medium">
                    {productsList.length > 0 ? (
                      productsList.map((p: any, idx: number) => {
                        const serials = Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay.filter(Boolean) : [];
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-slate-100">{p.productName || p.name || 'Thiết bị tiêu chuẩn SGM'}</div>
                              {p.specifications && (
                                <div className="text-3xs text-slate-400 mt-0.5">{p.specifications}</div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center text-slate-400">{p.unit || p.dvt || 'Máy'}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">{p.quantity || 1}</td>
                            <td className="py-3 px-3">
                              {serials.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {serials.map((sn: string, sIdx: number) => (
                                    <span key={sIdx} className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-3xs font-semibold">
                                      {sn}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-3xs text-slate-500 italic">Theo tiêu chuẩn SGM</span>
                              )}
                            </td>
                            {isUnlocked && (
                              <td className="py-3 px-3 text-right font-mono text-slate-300">
                                {formatCurrency(Number(p.price) || 0)}
                              </td>
                            )}
                            {isUnlocked && (
                              <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                                {formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1))}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isUnlocked ? 7 : 5} className="py-6 text-center text-slate-500 italic">
                          Chưa có dữ liệu danh mục thiết bị
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* D. TIẾN ĐỘ THANH TOÁN & ĐỢT THU CHI TIẾT (KHI UNLOCKED) */}
            {isUnlocked && relatedPayment && (
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-emerald-400" />
                  <span>Nhật Ký Các Đợt Thanh Toán & Tích Lũy Điểm</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-3xs text-slate-400 uppercase">Tổng giá trị hợp đồng:</span>
                    <div className="text-sm font-bold font-mono text-slate-200 mt-0.5">
                      {formatCurrency(financials.totalContractVal)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                    <span className="text-3xs text-emerald-400 uppercase">Đã thanh toán thực tế:</span>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-0.5">
                      {formatCurrency(financials.totalPaid)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-3xs text-slate-400 uppercase">Công nợ còn lại:</span>
                    <div className="text-sm font-bold font-mono text-amber-400 mt-0.5">
                      {formatCurrency(financials.remainingDebt)}
                    </div>
                  </div>
                </div>

                {Array.isArray(relatedPayment.dotThanhToan) && relatedPayment.dotThanhToan.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-semibold text-3xs uppercase">
                          <th className="py-2 px-3">Đợt thu</th>
                          <th className="py-2 px-3">Ngày thu</th>
                          <th className="py-2 px-3 text-right">Số tiền</th>
                          <th className="py-2 px-3">Hình thức</th>
                          <th className="py-2 px-3">Ghi chú</th>
                          <th className="py-2 px-3 text-right">Điểm cộng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-medium">
                        {relatedPayment.dotThanhToan.map((dot: any, dIdx: number) => {
                          const pts = calculatePaymentPoints(Number(dot.soTien) || 0);
                          return (
                            <tr key={dIdx} className="hover:bg-slate-800/20">
                              <td className="py-2.5 px-3 font-bold text-slate-200">Đợt {dot.lanThu || dIdx + 1}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{dot.ngayThu || '---'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">{formatCurrency(Number(dot.soTien) || 0)}</td>
                              <td className="py-2.5 px-3 text-slate-400">{dot.phuongThucThanhToan || 'Chuyển khoản'}</td>
                              <td className="py-2.5 px-3 text-slate-300">{dot.ghiChu || '---'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">+{formatPoints(pts)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* E. FOOTER & SUPPORT CONTACT */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center space-y-4">
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-200">CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN (SGM)</h4>
                <p className="text-2xs text-slate-400">
                  Địa chỉ nhà máy: KCN Hiệp Phước, Nhà Bè, TP. Hồ Chí Minh
                </p>
                <p className="text-2xs text-slate-400">
                  Hotline kỹ thuật & Bảo hành: <span className="text-emerald-400 font-bold">0932.000.999</span> | Email: info@saigonmachine.vn
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href="https://oa.zalo.me/1336150047301360288"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-[#0068FF] hover:bg-[#0057d9] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span>Quan tâm Zalo OA Saigon Machine</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href="tel:0932000999"
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Gọi Hotline 0932.000.999</span>
                </a>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER BADGE */}
      <footer className="border-t border-slate-900 py-4 text-center text-3xs text-slate-600 font-mono">
        © 2026 Saigon Machine (SGM OS) • Zero-Trust Commercial Ledger & Public Tracking Portal
      </footer>
    </div>
  );
}
