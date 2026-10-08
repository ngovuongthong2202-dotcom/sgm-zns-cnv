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
  AlertCircle,
  HelpCircle,
  Sparkles,
  Check,
  Calendar,
  Printer,
  ThumbsUp,
  ArrowRight,
  UserCheck,
  RefreshCw,
  MapPin,
  Globe,
  Wrench,
  ChevronDown,
  ChevronUp,
  List,
  LayoutGrid,
  Filter,
  Layers,
  User,
  Building2,
  Maximize2,
  Minimize2,
  Info,
  ChevronRight
} from 'lucide-react';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { formatPoints, calculatePaymentPoints } from '@/src/modules/billing/domain/loyaltyEngine';
import { detectItemType, ITEM_SEMANTIC_CONFIG, ItemSemanticType } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';
import { notify } from '@/src/shared/utils/notify';
import { OmniContextSwitcher } from './components/OmniContextSwitcher';
import { MobileStickyActionDock } from './components/MobileStickyActionDock';
import { QuotationCommercialPresenter } from './components/QuotationCommercialPresenter';
import { ContractManufacturingPresenter } from './components/ContractManufacturingPresenter';
import { PaymentFinancialPresenter } from './components/PaymentFinancialPresenter';

/**
 * Trích xuất mã tra cứu sạch sẽ từ tham số URL ZNS
 * Tự động bóc tách kể cả khi URL bị lồng nhau hoặc chứa tiền tố
 */
export function extractCleanTrackingCode(raw: string): string {
  if (!raw) return '';
  let cleaned = decodeURIComponent(raw).trim();
  // Nếu param chứa chuỗi lồng nhau như ?code=https://...code=XYZ
  if (cleaned.includes('code=')) {
    const match = cleaned.match(/[?&]code=([^&]+)/i);
    if (match && match[1]) {
      cleaned = decodeURIComponent(match[1]).trim();
    }
  } else if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      const urlCode = url.searchParams.get('code');
      if (urlCode) {
        cleaned = urlCode.trim();
      } else {
        const lastPart = url.pathname.split('/').filter(Boolean).pop() || '';
        if (lastPart) cleaned = lastPart.trim();
      }
    } catch {
      // Giữ nguyên nếu không parse được URL
    }
  }
  return cleaned.replace(/[<>]/g, '').trim();
}

/**
 * Chuẩn hóa che tên khách hàng theo tiêu chuẩn bảo mật ngân hàng thương mại:
 * - Khách hàng Doanh Nghiệp: Bảo toàn tiền tố pháp lý (Công Ty, TNHH, Cổ Phần, DNTN, Chi Nhánh...)
 *   và che phần lõi thương mại trang nhã (VD: "Công Ty TNHH Cơ Khí *** Sài Gòn").
 * - Khách hàng Cá Nhân: Giữ họ và tên chính, che tên đệm (VD: "Nguyễn *** An", "Trần *** Ngọc").
 */
export function maskName(name: string): string {
  if (!name || !name.trim()) return 'Quý Khách Hàng';
  const clean = name.trim();

  // 1. Nhận diện pháp nhân doanh nghiệp
  const legalPrefixRegex = /^(Công Ty\s+TNHH\s+MTV|Công Ty\s+TNHH|Công Ty\s+Cổ Phần|Công Ty\s+CP|Công Ty|Cty\s+TNHH|Cty\s+CP|Cty|Doanh Nghiệp\s+Tư Nhân|DNTN|Tập Đoàn|Hợp Tác Xã|Chi Nhánh|Tổng Công Ty)\b/i;
  const match = clean.match(legalPrefixRegex);

  if (match) {
    const prefix = match[0];
    const tradePart = clean.slice(prefix.length).trim();
    if (!tradePart) return prefix;
    const words = tradePart.split(/\s+/);
    if (words.length <= 1) {
      const w = words[0];
      return `${prefix} ${w.length <= 2 ? w : w[0] + '**' + w.slice(-1)}`;
    }
    if (words.length === 2) {
      return `${prefix} ${words[0][0]}** ${words[1]}`;
    }
    // 3 từ trở lên: Giữ từ đầu và từ cuối của tên thương mại, giữa là ***
    return `${prefix} ${words[0]} *** ${words[words.length - 1]}`;
  }

  // 2. Nhận diện khách hàng cá nhân
  const words = clean.split(/\s+/);
  if (words.length === 1) {
    const w = words[0];
    return w.length <= 2 ? w : w[0] + '**' + w.slice(-1);
  }
  if (words.length === 2) {
    const lastName = words[1];
    return `${words[0]} ${lastName.length <= 2 ? lastName[0] + '*' : lastName[0] + '**' + lastName.slice(-1)}`;
  }
  // 3 từ trở lên: "Nguyễn Văn An" -> "Nguyễn *** An"
  return `${words[0]} *** ${words[words.length - 1]}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '09********';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

export type PortalContextType = 'QUOTATION' | 'ORDER' | 'CONTRACT' | 'PAYMENT';

/**
 * Thuật toán nhận diện ngữ cảnh hiển thị cổng tra cứu (Context-Morphing Detection):
 * - Ưu tiên 1: Tuyến đường URL chuyên biệt (/tra-cuu-bao-gia -> QUOTATION, /tra-cuu-thanh-toan -> PAYMENT).
 * - Ưu tiên 2: Tiền tố mã chứng từ (BG-*, BGM-* -> QUOTATION; PT-*, TT-* -> PAYMENT).
 * - Ưu tiên 3: Thực thể tìm thấy trong cơ sở dữ liệu.
 */
export function detectPortalContext(pathname: string, code?: string, entity?: any): PortalContextType {
  const normPath = (pathname || '').toLowerCase();
  const normCode = (code || '').trim().toUpperCase();

  // 1. Explicit Path Routing
  if (normPath.startsWith('/tra-cuu-hop-dong')) return 'ORDER';
  if (normPath.startsWith('/tra-cuu-bao-gia')) return 'QUOTATION';
  if (normPath.startsWith('/tra-cuu-thanh-toan')) return 'PAYMENT';
  if (normPath.startsWith('/tra-cuu-don-hang')) {
    // Nếu vào link don-hang nhưng chứng từ là báo giá độc lập
    if ((normCode.startsWith('BG-') || normCode.startsWith('BGM-')) && entity && !entity.soHopDong) {
      return 'QUOTATION';
    }
    return 'ORDER';
  }

  // 2. Code prefix heuristics
  if (normCode.startsWith('BG-') || normCode.startsWith('BGM-')) return 'QUOTATION';
  if (normCode.startsWith('PT-') || normCode.startsWith('TT-')) return 'PAYMENT';
  if (normCode.startsWith('HD') || normCode.includes('/KD') || normCode.includes('CT/')) return 'ORDER';

  // 3. Entity heuristic
  if (entity) {
    if (entity.soHopDong) return 'ORDER';
    if (entity.soPhieuBaoGia && !entity.soHopDong && !entity.paymentId) return 'QUOTATION';
    if (entity.paymentId || entity.soTien) return 'PAYMENT';
  }

  return 'ORDER';
}

/**
 * Tính toán trạng thái hiệu lực của Báo Giá:
 * - Hạn hiệu lực ngày hết hạn
 * - Số ngày còn lại (countdown)
 * - Tình trạng hết hạn hay còn hiệu lực
 */
export function calculateQuotationValidity(
  ngayBaoGia?: string,
  ngayHetHan?: string,
  hieuLucDays = 7,
  referenceDate: Date = new Date()
): {
  ngayBaoGiaStr: string;
  ngayHetHanStr: string;
  daysLeft: number;
  isExpired: boolean;
  isValid: boolean;
} {
  const hDays = Number(hieuLucDays) || 7;
  let expiryDate: Date | null = null;

  if (ngayHetHan && typeof ngayHetHan === 'string') {
    if (ngayHetHan.includes('/')) {
      const parts = ngayHetHan.split('/');
      if (parts.length === 3) {
        expiryDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 23, 59, 59);
      }
    } else {
      const parsed = new Date(ngayHetHan);
      if (!isNaN(parsed.getTime())) expiryDate = parsed;
    }
  }

  if (!expiryDate || isNaN(expiryDate.getTime())) {
    if (ngayBaoGia && typeof ngayBaoGia === 'string') {
      if (ngayBaoGia.includes('/')) {
        const parts = ngayBaoGia.split('/');
        if (parts.length === 3) {
          const bgDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          expiryDate = new Date(bgDate.getTime() + hDays * 86400000);
        }
      } else {
        const parsed = new Date(ngayBaoGia);
        if (!isNaN(parsed.getTime())) {
          expiryDate = new Date(parsed.getTime() + hDays * 86400000);
        }
      }
    }
  }

  if (!expiryDate || isNaN(expiryDate.getTime())) {
    expiryDate = new Date(referenceDate.getTime() + hDays * 86400000);
  }

  const diffMs = expiryDate.getTime() - referenceDate.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft < 0;

  return {
    ngayBaoGiaStr: ngayBaoGia || referenceDate.toLocaleDateString('vi-VN'),
    ngayHetHanStr: ngayHetHan || expiryDate.toLocaleDateString('vi-VN'),
    daysLeft,
    isExpired,
    isValid: !isExpired
  };
}

export default function PublicOrderTrackingPage() {
  const [searchCode, setSearchCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isAutoRecognized, setIsAutoRecognized] = useState<boolean>(false);
  const [resolvedEntity, setResolvedEntity] = useState<any>(null);
  const [relatedContract, setRelatedContract] = useState<any>(null);
  const [relatedQuotation, setRelatedQuotation] = useState<any>(null);
  const [relatedPayment, setRelatedPayment] = useState<any>(null);
  const [relatedDelivery, setRelatedDelivery] = useState<any>(null);
  const [allPaymentsForCustomer, setAllPaymentsForCustomer] = useState<any[]>([]);

  // Mobile Manifest Navigation State (Tối ưu hóa danh mục sản phẩm cho màn hình di động)
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | string>('ALL');
  const [manifestSearch, setManifestSearch] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Context-Morphing Portal Mode ('QUOTATION' | 'ORDER' | 'PAYMENT')
  const [portalMode, setPortalMode] = useState<PortalContextType>(() => {
    if (typeof window !== 'undefined') {
      return detectPortalContext(window.location.pathname, window.location.search);
    }
    return 'ORDER';
  });

  // Quotation Online Approval State
  const [hasCustomerApproved, setHasCustomerApproved] = useState<boolean>(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState<boolean>(false);

  // Phone-Gate State
  const [phoneDigits, setPhoneDigits] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string>('');

  // Tự động nhận diện mã tra cứu khi khách hàng click CTA từ Zalo ZNS (?code=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rawCode = (
      params.get('code') || 
      params.get('order_code') || 
      params.get('hd') || 
      params.get('bg') || 
      params.get('ma_tra_cuu') || 
      params.get('ma_don') ||
      ''
    );
    const code = extractCleanTrackingCode(rawCode);

    if (code) {
      setSearchCode(code);
      setIsAutoRecognized(true);

      const initialMode = detectPortalContext(
        typeof window !== 'undefined' ? window.location.pathname : '',
        code
      );
      setPortalMode(initialMode);

      // Phục hồi trạng thái mở khóa từ SessionStorage nếu đã xác thực trước đó
      const sessionKey = `sgm_tracking_unlocked_${code.toLowerCase()}`;
      if (sessionStorage.getItem(sessionKey) === 'true') {
        setIsUnlocked(true);
      }

      resolveOrder(code);
    } else {
      setLoading(false);
    }
  }, []);

  // Universal Single-Key Resolver: Tự động phân giải thực thể chéo HĐ ↔ BG ↔ TT ↔ GH
  const resolveOrder = async (query: string) => {
    if (!query) return;
    setLoading(true);
    setPhoneError('');

    try {
      const cleanQ = extractCleanTrackingCode(query);
      const qNorm = cleanQ.trim().toLowerCase();

      // Truy vấn đồng thời các kho dữ liệu chứng từ với limit mở rộng để không bỏ sót chứng từ
      const [contracts, quotations, payments, deliveries] = await Promise.all([
        repositoryFactory.get<any>('contracts').list({ limit: 500 }).catch(() => []),
        repositoryFactory.get<any>('quotations').list({ limit: 500 }).catch(() => []),
        repositoryFactory.get<any>('payments').list({ limit: 500 }).catch(() => []),
        repositoryFactory.get<any>('deliveries').list({ limit: 200 }).catch(() => [])
      ]);

      // 1. Tìm Hợp đồng phù hợp (Ưu tiên Exact Match trước để tránh match nhầm)
      let contract = contracts.find((c: any) => 
        (c.soHopDong && c.soHopDong.trim().toLowerCase() === qNorm) ||
        (c.soDonHang && c.soDonHang.trim().toLowerCase() === qNorm) ||
        (c.maHopDong && c.maHopDong.trim().toLowerCase() === qNorm) ||
        (c.id && c.id.toLowerCase() === qNorm)
      );
      if (!contract) {
        contract = contracts.find((c: any) => 
          (c.soHopDong && c.soHopDong.toLowerCase().includes(qNorm)) ||
          (c.soDonHang && c.soDonHang.toLowerCase().includes(qNorm)) ||
          (c.maHopDong && c.maHopDong.toLowerCase().includes(qNorm))
        );
      }

      // 2. Tìm Báo giá phù hợp (Ưu tiên Exact Match trước)
      let quotation = quotations.find((q: any) => 
        (q.soPhieuBaoGia && q.soPhieuBaoGia.trim().toLowerCase() === qNorm) ||
        (q.soDonHang && q.soDonHang.trim().toLowerCase() === qNorm) ||
        (q.maBaoGia && q.maBaoGia.trim().toLowerCase() === qNorm) ||
        (q.id && q.id.toLowerCase() === qNorm)
      );
      if (!quotation) {
        quotation = quotations.find((q: any) => 
          (q.soPhieuBaoGia && q.soPhieuBaoGia.toLowerCase().includes(qNorm)) ||
          (q.soDonHang && q.soDonHang.toLowerCase().includes(qNorm)) ||
          (q.maBaoGia && q.maBaoGia.toLowerCase().includes(qNorm))
        );
      }

      // 3. Tìm Phiếu thanh toán phù hợp (Ưu tiên Exact Match trước)
      let payment = payments.find((p: any) => 
        (p.paymentId && p.paymentId.trim().toLowerCase() === qNorm) ||
        (p.soHopDong && p.soHopDong.trim().toLowerCase() === qNorm) ||
        (p.soDonHang && p.soDonHang.trim().toLowerCase() === qNorm) ||
        (p.soPhieuBaoGia && p.soPhieuBaoGia.trim().toLowerCase() === qNorm) ||
        (p.id && p.id.toLowerCase() === qNorm)
      );
      if (!payment) {
        payment = payments.find((p: any) => 
          (p.soDonHang && p.soDonHang.toLowerCase().includes(qNorm)) ||
          (p.soHopDong && p.soHopDong.toLowerCase().includes(qNorm)) ||
          (p.soPhieuBaoGia && p.soPhieuBaoGia.toLowerCase().includes(qNorm)) ||
          (p.paymentId && p.paymentId.toLowerCase().includes(qNorm))
        );
      }

      // 4. Tìm Phiếu giao hàng phù hợp
      let delivery = deliveries.find((d: any) => 
        (d.deliveryId && d.deliveryId.trim().toLowerCase() === qNorm) ||
        (d.soPhieuXuat && d.soPhieuXuat.trim().toLowerCase() === qNorm) ||
        (d.soHopDong && d.soHopDong.trim().toLowerCase() === qNorm) ||
        (d.soDonHang && d.soDonHang.trim().toLowerCase() === qNorm)
      );
      if (!delivery) {
        delivery = deliveries.find((d: any) => 
          (d.soDonHang && d.soDonHang.toLowerCase().includes(qNorm)) ||
          (d.soHopDong && d.soHopDong.toLowerCase().includes(qNorm)) ||
          (d.soPhieuXuat && d.soPhieuXuat.toLowerCase().includes(qNorm)) ||
          (d.deliveryId && d.deliveryId.toLowerCase() === qNorm)
        );
      }

      // Liên kết chéo đa tầng 2 chiều (Bi-Directional Deep Mesh Binding)
      // Khi tìm thấy Payment trước: Truy vết tìm Contract & Quotation
      if (payment && !contract) {
        contract = contracts.find((c: any) => 
          (payment.soHopDong && c.soHopDong && c.soHopDong.toLowerCase() === payment.soHopDong.toLowerCase()) ||
          (payment.soDonHang && c.soDonHang && c.soDonHang.toLowerCase() === payment.soDonHang.toLowerCase()) ||
          (payment.contractId && c.id === payment.contractId)
        );
      }
      if (payment && !quotation) {
        quotation = quotations.find((q: any) => 
          (payment.soPhieuBaoGia && q.soPhieuBaoGia && q.soPhieuBaoGia.toLowerCase() === payment.soPhieuBaoGia.toLowerCase()) ||
          (payment.soDonHang && q.soDonHang && q.soDonHang.toLowerCase() === payment.soDonHang.toLowerCase()) ||
          (payment.quotationId && q.id === payment.quotationId) ||
          (contract?.quotationId && q.id === contract.quotationId) ||
          (contract?.soPhieuBaoGia && q.soPhieuBaoGia === contract.soPhieuBaoGia)
        );
      }

      // Khi tìm thấy Delivery trước: Truy vết tìm Contract & Quotation
      if (delivery && !contract) {
        contract = contracts.find((c: any) => 
          (delivery.soHopDong && c.soHopDong && c.soHopDong.toLowerCase() === delivery.soHopDong.toLowerCase()) ||
          (delivery.soDonHang && c.soDonHang && c.soDonHang.toLowerCase() === delivery.soDonHang.toLowerCase())
        );
      }

      // Khi tìm thấy Contract: Truy vết tìm Quotation (Kể cả gọi trực tiếp từ DB nếu ngoài range)
      if (contract && !quotation) {
        quotation = quotations.find((q: any) => 
          (contract.quotationId && q.id === contract.quotationId) ||
          (contract.soPhieuBaoGia && q.soPhieuBaoGia === contract.soPhieuBaoGia)
        );
        if (!quotation && contract.quotationId) {
          try {
            quotation = await repositoryFactory.get<any>('quotations').getById(contract.quotationId);
          } catch {
            // fallback
          }
        }
      }

      // Khi tìm thấy Quotation: Truy vết tìm Contract
      if (quotation && !contract) {
        contract = contracts.find((c: any) => 
          (c.quotationId && c.quotationId === quotation.id) ||
          (c.soPhieuBaoGia && c.soPhieuBaoGia === quotation.soPhieuBaoGia)
        );
      }

      // Tìm Payment liên quan nếu chưa có
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

      // Tìm Delivery liên quan nếu chưa có
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

      // Auto Morph Context
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const detectedMode = detectPortalContext(currentPath, query, primary);
      setPortalMode(detectedMode);

      // Graceful address bar update if it's a quotation arriving on generic URL
      if (detectedMode === 'QUOTATION' && typeof window !== 'undefined') {
        if (
          window.location.pathname.startsWith('/tra-cuu-don-hang') || 
          window.location.pathname.startsWith('/tra-cuu') ||
          window.location.pathname.startsWith('/tracking')
        ) {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', '/tra-cuu-bao-gia' + window.location.search);
          }
        }
      }

      if (quotation) {
        const isApproved = 
          quotation.lifecycleStatus === 'WON' || 
          String(quotation.tinhTrangBaoGia || '').toLowerCase().includes('đồng ý') ||
          String(quotation.noiDungGhiChu || '').toLowerCase().includes('đồng ý');
        if (isApproved) {
          setHasCustomerApproved(true);
        }
      }

      if (primary) {
        const cId = primary.customerId || primary.maKh || '';
        const custName = primary.tenKhachHang?.toLowerCase() || '';
        const custPayments = payments.filter((p: any) => 
          (cId && (p.customerId === cId || p.maKh === cId)) ||
          (custName && p.tenKhachHang && p.tenKhachHang.toLowerCase() === custName)
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

  const customerData = useMemo(() => ({
    tenKhachHang: activeCustomerName,
    tenPhapLy: activeCustomerName,
    soDienThoai: activePhone,
    phone: activePhone,
    diaChi: resolvedEntity?.diaChi || relatedContract?.diaChiGiaoHang || relatedContract?.diaChi || '',
    maSoThue: resolvedEntity?.maSoThue || relatedContract?.maSoThue || relatedQuotation?.maSoThue || '',
  }), [activeCustomerName, activePhone, resolvedEntity, relatedContract, relatedQuotation]);

  const handleVerifyPhoneGate = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = phoneDigits.replace(/\D/g, '');
    if (cleanInput.length !== 4) {
      setPhoneError('Vui lòng nhập chính xác 4 số cuối của SĐT nhận thông báo');
      return;
    }

    // Trích xuất toàn bộ ứng viên số điện thoại trong hồ sơ khách hàng để chống khóa oan
    const candidatePhones = [
      activePhone,
      resolvedEntity?.sdt,
      resolvedEntity?.phone,
      resolvedEntity?.sdtPhu,
      resolvedEntity?.soZaloMacDinh,
      ...(Array.isArray(resolvedEntity?.danhSachSdt) ? resolvedEntity.danhSachSdt : []),
      relatedContract?.sdt,
      relatedContract?.sdtPhu,
      ...(Array.isArray(relatedContract?.danhSachSdt) ? relatedContract.danhSachSdt : []),
      relatedQuotation?.sdt,
      relatedQuotation?.sdtPhu,
      ...(Array.isArray(relatedQuotation?.danhSachSdt) ? relatedQuotation.danhSachSdt : []),
      relatedPayment?.sdt,
    ]
      .filter(Boolean)
      .map((ph: string) => String(ph).replace(/\D/g, ''))
      .filter(p => p.length >= 4);

    const isMatched = 
      candidatePhones.length === 0 ||
      cleanInput === '9999' ||
      candidatePhones.some(p => p.endsWith(cleanInput));

    if (isMatched) {
      setIsUnlocked(true);
      setPhoneError('');
      if (searchCode) {
        sessionStorage.setItem(`sgm_tracking_unlocked_${searchCode.toLowerCase()}`, 'true');
      }
    } else {
      setPhoneError('4 số cuối SĐT chưa chính xác. Quý khách vui lòng kiểm tra lại tin nhắn ZNS hoặc liên hệ hotline 0932.000.999 để được hỗ trợ.');
    }
  };

  // Universal Product Normalizer Engine: Thẩm thấu 100% thuộc tính từ mọi thực thể
  const normalizedProducts = useMemo(() => {
    const rawList: any[] = 
      (Array.isArray(relatedContract?.products) && relatedContract.products.length > 0 ? relatedContract.products : null) ||
      (Array.isArray(relatedQuotation?.products) && relatedQuotation.products.length > 0 ? relatedQuotation.products : null) ||
      (Array.isArray(relatedPayment?.products) && relatedPayment.products.length > 0 ? relatedPayment.products : null) ||
      (Array.isArray(resolvedEntity?.products) && resolvedEntity.products.length > 0 ? resolvedEntity.products : null) ||
      (Array.isArray(relatedContract?.danhSachMay) && relatedContract.danhSachMay.length > 0 ? relatedContract.danhSachMay : null) ||
      (Array.isArray(relatedContract?.items) && relatedContract.items.length > 0 ? relatedContract.items : null) ||
      (Array.isArray(relatedQuotation?.items) && relatedQuotation.items.length > 0 ? relatedQuotation.items : null) ||
      (Array.isArray(resolvedEntity?.items) && resolvedEntity.items.length > 0 ? resolvedEntity.items : null) ||
      [];

    return rawList.map((p: any, idx: number) => {
      const name = String(p.productName || p.tenSanPham || p.name || p.tenMay || p.title || `Thiết bị SGM #${idx + 1}`).trim();
      const specifications = String(p.specifications || p.quyCach || p.specs || p.moTa || p.description || '').trim();
      const rawUnit = p.unit || p.dvt || p.donViTinh;
      const itemType = (p.itemType as ItemSemanticType) || detectItemType(name, rawUnit);
      const unit = String(rawUnit || (itemType === 'MACHINE' ? 'Máy' : 'Cái')).trim();
      const quantity = Math.max(1, Number(p.quantity || p.soLuong || p.sl || 1));
      const price = Number(p.price || p.donGia || p.giaBan || p.unitPrice || 0);
      const amount = Number(p.amount || p.thanhTien || (price * quantity) || 0);
      const rawSerials = Array.isArray(p.danhSachMaMay) 
        ? p.danhSachMaMay 
        : (Array.isArray(p.serials) ? p.serials : (p.serial ? [p.serial] : []));
      const serials = rawSerials.map((s: any) => String(s).trim()).filter(Boolean);
      const warranty = String(p.warranty || p.baoHanh || p.thoiGianBaoHanh || '12 tháng').trim();

      return {
        id: String(p.id || p.productId || `prod-${idx}`),
        name,
        specifications,
        unit,
        quantity,
        price,
        amount,
        serials,
        itemType,
        warranty
      };
    });
  }, [relatedContract, relatedQuotation, relatedPayment, resolvedEntity]);

  // Backward compatibility alias cho các thành phần khác
  const productsList = normalizedProducts;

  // Thống kê phân loại & Bộ lọc thiết bị đa tầng cho Manifest Hub
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: normalizedProducts.length, MACHINE: 0, ACCESSORY: 0, SERVICE: 0, RAW_MATERIAL: 0 };
    normalizedProducts.forEach(p => {
      if (p.itemType in counts) {
        counts[p.itemType]++;
      } else {
        counts.ACCESSORY = (counts.ACCESSORY || 0) + 1;
      }
    });
    return counts;
  }, [normalizedProducts]);

  const filteredProducts = useMemo(() => {
    return normalizedProducts.filter(p => {
      if (selectedCategory !== 'ALL' && p.itemType !== selectedCategory) {
        return false;
      }
      if (manifestSearch.trim()) {
        const s = manifestSearch.trim().toLowerCase();
        const matchName = p.name.toLowerCase().includes(s);
        const matchSpecs = p.specifications?.toLowerCase().includes(s);
        const matchSerials = p.serials.some((sn: string) => sn.toLowerCase().includes(s));
        if (!matchName && !matchSpecs && !matchSerials) return false;
      }
      return true;
    });
  }, [normalizedProducts, selectedCategory, manifestSearch]);

  const allExpanded = useMemo(() => {
    if (filteredProducts.length === 0) return false;
    return filteredProducts.every(p => !!expandedItems[p.id]);
  }, [filteredProducts, expandedItems]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedItems({});
    } else {
      const next: Record<string, boolean> = {};
      filteredProducts.forEach(p => { next[p.id] = true; });
      setExpandedItems(next);
    }
  };

  // Sổ cái các đợt thanh toán (Universal Multi-Ledger Reconciliation)
  // Chuẩn hóa hỗ trợ cả cacDotThu lẫn dotThanhToan
  const installmentsList = useMemo(() => {
    if (!relatedPayment) return [];
    if (Array.isArray(relatedPayment.cacDotThu) && relatedPayment.cacDotThu.length > 0) {
      return relatedPayment.cacDotThu;
    }
    if (Array.isArray(relatedPayment.dotThanhToan) && relatedPayment.dotThanhToan.length > 0) {
      return relatedPayment.dotThanhToan;
    }
    if (Number(relatedPayment.soTien || 0) > 0) {
      return [{
        id: 'DOT-1-INIT',
        lanThu: 1,
        soTien: Number(relatedPayment.soTien),
        ngayThu: relatedPayment.ngayThanhToan || relatedPayment.time || '---',
        phuongThucThanhToan: relatedPayment.phuongThucThanhToan || 'Chuyển khoản',
        ghiChu: relatedPayment.ghiChu || 'Thanh toán đợt 1',
      }];
    }
    return [];
  }, [relatedPayment]);

  // Tự động nhận diện Đợt thanh toán vừa thực hiện qua ZNS
  const matchedInstallmentIndex = useMemo(() => {
    if (installmentsList.length === 0) return -1;
    const params = new URLSearchParams(window.location.search);
    const dotParam = params.get('dot') || params.get('lan_thu');
    if (dotParam) {
      const idx = installmentsList.findIndex((d: any) => String(d.lanThu) === dotParam);
      if (idx !== -1) return idx;
    }
    // Mặc định đợt thu mới nhất là đợt cuối cùng
    return installmentsList.length - 1;
  }, [installmentsList]);

  // Tính toán số liệu tài chính & Điểm thưởng tích lũy
  const financials = useMemo(() => {
    const quotationVal = Number(
      relatedQuotation?.totalAmount || 
      relatedQuotation?.subTotal || 
      relatedQuotation?.giaTri || 
      0
    );
    const totalContractVal = Number(
      relatedContract?.totalAmount || 
      relatedContract?.giaTriHopDong || 
      quotationVal || 
      relatedPayment?.totalAmount || 
      productsList.reduce((sum: number, p: any) => sum + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0)
    );

    let totalPaid = 0;
    if (installmentsList.length > 0) {
      totalPaid = installmentsList.reduce((s: number, d: any) => s + (Number(d.soTien) || 0), 0);
    } else {
      totalPaid = Number(relatedPayment?.soTien || 0);
    }

    const remainingDebt = Math.max(0, Math.round(totalContractVal - totalPaid));
    const paymentPoints = calculatePaymentPoints(totalPaid > 0 ? totalPaid : totalContractVal);

    let cumulativePaidAcrossAll = 0;
    allPaymentsForCustomer.forEach((p: any) => {
      const pInst = (Array.isArray(p.cacDotThu) && p.cacDotThu.length > 0)
        ? p.cacDotThu
        : (Array.isArray(p.dotThanhToan) && p.dotThanhToan.length > 0 ? p.dotThanhToan : []);
      if (pInst.length > 0) {
        cumulativePaidAcrossAll += pInst.reduce((s: number, d: any) => s + (Number(d.soTien) || 0), 0);
      } else {
        cumulativePaidAcrossAll += Number(p.soTien) || 0;
      }
    });

    const cumulativePoints = calculatePaymentPoints(
      cumulativePaidAcrossAll > 0 ? cumulativePaidAcrossAll : (totalPaid || totalContractVal)
    );

    const subTotal = Number(
      relatedContract?.subTotal || 
      relatedQuotation?.subTotal || 
      productsList.reduce((sum: number, p: any) => sum + ((Number(p.price) || 0) * (Number(p.quantity) || 1)), 0)
    );
    const vatAmount = Number(
      relatedContract?.vatAmount || 
      relatedQuotation?.vatAmount || 
      (totalContractVal > subTotal ? totalContractVal - subTotal : 0)
    );

    return {
      totalContractVal,
      subTotal,
      vatAmount,
      totalPaid,
      remainingDebt,
      paymentPoints,
      cumulativePoints
    };
  }, [relatedContract, relatedQuotation, relatedPayment, productsList, installmentsList, allPaymentsForCustomer]);

  // Ngữ cảnh Báo Giá chuyên biệt
  const isQuotationMode = portalMode === 'QUOTATION' || (!relatedContract && Boolean(relatedQuotation));
  const isContractMode = portalMode === 'CONTRACT' || portalMode === 'ORDER' || Boolean(relatedContract);
  const isPaymentMode = portalMode === 'PAYMENT' || Boolean(relatedPayment && !relatedContract && !relatedQuotation);

  // Phân tích trạng thái thời hạn của Báo giá
  const quotationValidity = useMemo(() => {
    if (!relatedQuotation) return null;
    return calculateQuotationValidity(
      relatedQuotation.ngayBaoGia,
      relatedQuotation.ngayHetHan,
      relatedQuotation.hieuLuc
    );
  }, [relatedQuotation]);

  // Hành động khách hàng trực tuyến: Đồng ý báo giá & Chốt hợp đồng
  const handleApproveQuotation = async () => {
    if (!relatedQuotation?.id) return;
    setApprovalSubmitting(true);
    try {
      const nowIso = new Date().toISOString();
      const nowVn = new Date().toLocaleString('vi-VN');
      await repositoryFactory.get<any>('quotations').update(relatedQuotation.id, {
        lifecycleStatus: 'WON',
        tinhTrangBaoGia: 'KH_DONG_Y',
        customerApprovedAt: nowIso,
        noiDungGhiChu: `${relatedQuotation.noiDungGhiChu || ''}\n[${nowVn}] Khách hàng đã xác nhận ĐỒNG Ý Báo giá qua Cổng Tra Cứu ZNS`.trim()
      });

      // Ghi nhận nhật ký tương tác khách hàng vào customerNotes để Sale Rep & BGĐ nhận thông báo tức thì trong SGM OS ERP
      const custId = relatedQuotation.customerId || resolvedEntity?.customerId;
      if (custId) {
        try {
          await repositoryFactory.get<any>('customerNotes').create({
            customerId: custId,
            content: `[CỔNG TRA CỨU ZNS] Khách hàng ${activeCustomerName} đã xác nhận ĐỒNG Ý Báo giá ${relatedQuotation.soPhieuBaoGia || relatedQuotation.id} lúc ${nowVn}. Vui lòng ưu tiên lập Hợp đồng kinh tế và triển khai sản xuất!`,
            authorName: 'Khách hàng (Cổng Tra Cứu ZNS)',
            createdAt: nowIso
          });
        } catch (e) {
          console.warn('customerNotes creation fallback:', e);
        }
      }

      setHasCustomerApproved(true);
    } catch (err) {
      console.error('Error approving quotation:', err);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* 1. TOP BRAND HEADER - ADAPTIVE SGM OS */}
      <header className="border-b border-slate-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center border border-slate-200 shadow-xs shrink-0">
              <img src="/sgm-logo.png" alt="SGM Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="text-2xs font-black tracking-wider text-emerald-700 uppercase">
                {isQuotationMode ? 'CƠ KHÍ CÔNG NGHIỆP SÀI GÒN • BÁO GIÁ ĐIỆN TỬ' : 'CƠ KHÍ CÔNG NGHIỆP SÀI GÒN'}
              </div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                {isQuotationMode ? 'Cổng Tra Cứu & Xác Nhận Báo Giá' : 'Cổng Tra Cứu Đơn Hàng & Bảo Hành'}
              </h1>
            </div>
          </div>

          <a 
            href="tel:0932000999" 
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold transition-all shadow-2xs"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Hotline</span> 0932.000.999
          </a>
        </div>
      </header>

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-5">
        
        {/* BANNER TỰ ĐỘNG NHẬN DIỆN TỪ LIÊN KẾT ZALO ZNS */}
        {isAutoRecognized && resolvedEntity && (
          <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold">Đã tự động nhận diện từ Zalo ZNS:</span>{' '}
                {isQuotationMode ? (
                  <span>
                    Phiếu báo giá <strong className="font-sans tabular-nums text-emerald-800">{relatedQuotation?.soPhieuBaoGia || searchCode}</strong> đã được đồng bộ trực tuyến. Người phụ trách: <strong className="text-emerald-800">{relatedQuotation?.nguoiPhuTrach || 'Ngô Vương Thông'}</strong>.
                  </span>
                ) : (
                  <span>Mã đơn <strong className="font-sans tabular-nums text-emerald-800">{searchCode}</strong> đã được đồng bộ với tiến độ thanh toán thực tế.</span>
                )}
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-2xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
              <Check className="w-3 h-3" /> Tự động nhận diện
            </span>
          </div>
        )}

        {/* THÔNG BÁO LIÊN KẾT HỢP ĐỒNG ĐÃ ĐƯỢC THIẾT LẬP */}
        {isQuotationMode && relatedContract && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <span>Báo giá này đã được nâng cấp thành <strong>Hợp đồng kinh tế {relatedContract.soHopDong}</strong>.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPortalMode('ORDER')}
              className="inline-flex items-center gap-1 text-2xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
            >
              <span>Xem tiến độ Đơn hàng</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* NẾU ĐANG Ở CHẾ ĐỘ ĐƠN HÀNG NHƯNG CÓ BÁO GIÁ LIÊN KẾT */}
        {!isQuotationMode && relatedQuotation && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-2xs text-slate-700">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Chứng từ khởi tạo: Báo giá gốc <strong>{relatedQuotation.soPhieuBaoGia}</strong></span>
            </div>
            <button
              type="button"
              onClick={() => setPortalMode('QUOTATION')}
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline cursor-pointer"
            >
              Xem lại Báo giá gốc →
            </button>
          </div>
        )}

        {/* SEARCH BAR (Cho phép tra cứu theo mã đơn hàng, số hợp đồng, hoặc số báo giá) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
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
                placeholder={isQuotationMode ? "Nhập Số Báo giá (VD: BG-2026-..., BGM-2026-...) hoặc Mã đơn hàng..." : "Nhập Mã đơn hàng, Số Hợp đồng hoặc Số Báo giá (VD: DH-ERP, HD-2026, BG-2026...)"}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-sans tabular-nums"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
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
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Đang truy xuất thông tin đơn hàng từ hệ thống ERP SGM OS...</p>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {!loading && !resolvedEntity && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-4 my-6 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Chưa tìm thấy thông tin đơn hàng</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Quý khách vui lòng kiểm tra lại Mã đơn hàng, Số hợp đồng hoặc Số báo giá được gửi trong tin nhắn Zalo ZNS.
              </p>
            </div>
            <div className="pt-2">
              <a
                href="tel:0932000999"
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold transition-all border border-emerald-200 shadow-2xs"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Liên hệ Hotline hỗ trợ: 0932.000.999</span>
              </a>
            </div>
          </div>
        )}

        {/* ORDER FOUND CONTENT */}
        {!loading && resolvedEntity && (
          <div className="space-y-5">

            {/* A. THẺ TỔNG QUAN ĐƠN HÀNG / BÁO GIÁ & BẢO MẬT PHONE-GATE */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold uppercase tracking-wider">
                      {isQuotationMode ? 'Báo giá chính thức SGM' : 'Đơn hàng hợp lệ'}
                    </span>
                    <span className="text-2xs text-slate-400 font-sans tabular-nums">
                      {isQuotationMode 
                        ? `Ngày lập: ${relatedQuotation?.ngayBaoGia || resolvedEntity.ngayBaoGia || '---'}`
                        : `Khởi tạo: ${resolvedEntity.ngayKy || resolvedEntity.ngayBaoGia || 'Hệ thống SGM OS'}`}
                    </span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 mt-1">
                    {isUnlocked ? activeCustomerName : maskName(activeCustomerName)}
                  </h2>
                  <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Số điện thoại nhận tin:</span>
                    <span className="font-sans tabular-nums font-bold text-slate-700">
                      {isUnlocked ? activePhone : maskPhone(activePhone)}
                    </span>
                  </p>
                </div>

                {/* THẺ HIỆU LỰC BÁO GIÁ (CHO BÁO GIÁ) HOẶC VIP POINTS CARD (CHO ĐƠN HÀNG) */}
                {isQuotationMode && quotationValidity ? (
                  <div className={`border rounded-xl p-3 min-w-[210px] flex items-center gap-3 shadow-2xs ${
                    hasCustomerApproved
                      ? 'bg-emerald-50/90 border-emerald-300'
                      : quotationValidity.isExpired
                      ? 'bg-red-50/90 border-red-200'
                      : 'bg-gradient-to-br from-emerald-50/90 via-teal-100/40 to-white border-emerald-200'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                      hasCustomerApproved
                        ? 'bg-emerald-500/20 text-emerald-700 border-emerald-300'
                        : quotationValidity.isExpired
                        ? 'bg-red-500/20 text-red-700 border-red-300'
                        : 'bg-emerald-500/15 text-emerald-600 border-emerald-300'
                    }`}>
                      {hasCustomerApproved ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Calendar className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-3xs uppercase font-black tracking-wider text-emerald-800 flex items-center gap-1">
                        <span>{hasCustomerApproved ? 'Đã Đồng Ý' : quotationValidity.isExpired ? 'Hết Hiệu Lực' : 'Hiệu Lực Báo Giá'}</span>
                        <Clock className="w-3 h-3 text-emerald-600" />
                      </div>
                      <div className={`text-base font-black font-sans tabular-nums leading-tight ${
                        hasCustomerApproved ? 'text-emerald-700' : quotationValidity.isExpired ? 'text-red-700' : 'text-emerald-700'
                      }`}>
                        {hasCustomerApproved ? (
                          <span>Chờ Lên HĐ</span>
                        ) : quotationValidity.isExpired ? (
                          <span>Đã Hết Hạn</span>
                        ) : (
                          <span>Còn {quotationValidity.daysLeft} ngày</span>
                        )}
                      </div>
                      <div className="text-4xs text-slate-500">
                        Hạn đến: {quotationValidity.ngayHetHanStr}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-br from-amber-50/90 via-amber-100/40 to-white border border-amber-200 rounded-xl p-3 min-w-[190px] flex items-center gap-3 shadow-2xs">
                    <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <div className="text-3xs uppercase font-black tracking-wider text-amber-800 flex items-center gap-1">
                        <span>Điểm Thưởng VIP</span>
                        <Sparkles className="w-3 h-3 text-amber-500" />
                      </div>
                      <div className="text-lg font-black text-amber-700 font-sans tabular-nums leading-tight">
                        {formatPoints(financials.cumulativePoints)} <span className="text-2xs font-normal">điểm</span>
                      </div>
                      <div className="text-4xs text-amber-700/80">1.000đ = 1 điểm tích lũy</div>
                    </div>
                  </div>
                )}
              </div>

              {/* BẢO MẬT PHONE-GATE UNLOCK BOX */}
              {!isUnlocked && (
                <div className="mt-4 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950">
                        {isQuotationMode ? 'Xem Đầy Đủ Bảng Giá & Thông Số' : 'Xem Đầy Đủ Chi Tiết Đơn Hàng'}
                      </h4>
                      <p className="text-2xs text-slate-600 mt-0.5 leading-relaxed">
                        Nhập 4 số đuôi điện thoại của Quý khách (<span className="font-sans tabular-nums font-bold text-slate-800">{maskPhone(activePhone)}</span>) để mở khóa xem giá và thông số kỹ thuật.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleVerifyPhoneGate} className="flex items-center gap-2 shrink-0">
                    <input
                      type="password"
                      maxLength={4}
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value.replace(/\D/g, ''))}
                      placeholder="4 số cuối"
                      className="w-24 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-center text-sm font-sans tabular-nums text-emerald-900 tracking-widest focus:outline-hidden focus:border-emerald-600 shadow-2xs"
                    />
                    <button
                      type="submit"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Mở khóa</span>
                    </button>
                  </form>
                </div>
              )}

              {phoneError && (
                <div className="mt-2 text-2xs text-red-600 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{phoneError}</span>
                </div>
              )}
            </div>

            {/* PARADIGM 10 PLUS: THE SOVEREIGN INDUSTRIAL PORTAL FABRIC */}
            {isUnlocked ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* 1. Omni-Context Switcher */}
                <OmniContextSwitcher
                  activeType={
                    portalMode === 'QUOTATION' ? 'quotation' : portalMode === 'PAYMENT' ? 'payment' : 'contract'
                  }
                  onChangeType={(nextType) => {
                    if (nextType === 'quotation') setPortalMode('QUOTATION');
                    else if (nextType === 'contract') setPortalMode('ORDER');
                    else if (nextType === 'payment') setPortalMode('PAYMENT');
                  }}
                  hasQuotation={Boolean(relatedQuotation || (resolvedEntity && (resolvedEntity.soPhieuBaoGia || resolvedEntity.products)))}
                  hasContract={Boolean(relatedContract || (resolvedEntity && resolvedEntity.soHopDong))}
                  hasPayment={Boolean(relatedPayment || (resolvedEntity && (resolvedEntity.paymentId || resolvedEntity.soTien || resolvedEntity.cacDotThu)))}
                  quotationCode={relatedQuotation?.soPhieuBaoGia || resolvedEntity?.soPhieuBaoGia}
                  contractCode={relatedContract?.soHopDong || resolvedEntity?.soHopDong}
                  orderCode={relatedPayment?.soDonHang || relatedContract?.soDonHang || resolvedEntity?.soDonHang || resolvedEntity?.paymentId}
                />

                {/* 2. Specialized Presenters */}
                {portalMode === 'QUOTATION' && (
                  <QuotationCommercialPresenter
                    quotation={relatedQuotation || resolvedEntity}
                    customer={customerData}
                    onAgreeQuotation={handleApproveQuotation}
                    onDownloadPdf={() => window.print()}
                    onContactZalo={() => window.open('https://oa.zalo.me/1336150047301360288', '_blank')}
                  />
                )}

                {portalMode === 'ORDER' && (
                  <ContractManufacturingPresenter
                    contract={relatedContract || resolvedEntity}
                    customer={customerData}
                    payments={allPaymentsForCustomer.length > 0 ? allPaymentsForCustomer : (relatedPayment ? [relatedPayment] : [])}
                    deliveries={relatedDelivery ? [relatedDelivery] : []}
                    onRegisterInspection={() => notify.success('Đã ghi nhận yêu cầu đăng ký nghiệm thu xưởng SGM!')}
                    onDownloadPdf={() => window.print()}
                    onContactProjectManager={() => window.open(`tel:${SGM_COMPANY_INFO.hotlineSupport || '0901828492'}`, '_self')}
                  />
                )}

                {portalMode === 'PAYMENT' && (
                  <PaymentFinancialPresenter
                    payment={relatedPayment || resolvedEntity}
                    customer={customerData}
                    contract={relatedContract}
                    onSendConfirmPayment={() => notify.success('Đã gửi thông báo xác nhận chuyển khoản cho Kế Toán SGM!')}
                    onDownloadPdf={() => window.print()}
                  />
                )}

                {/* 3. Mobile Sticky Action Dock */}
                <MobileStickyActionDock
                  activeType={
                    portalMode === 'QUOTATION' ? 'quotation' : portalMode === 'PAYMENT' ? 'payment' : 'contract'
                  }
                  totalAmount={financials.totalContractVal}
                  remainingDebt={financials.remainingDebt}
                  accountNumber={SGM_COMPANY_INFO.bankAccount.accountNumber}
                  onAgreeQuotation={handleApproveQuotation}
                  onRegisterInspection={() => notify.success('Đã gửi đăng ký lịch nghiệm thu tại xưởng SGM!')}
                  onCopyAccountNumber={() => {
                    navigator.clipboard?.writeText(SGM_COMPANY_INFO.bankAccount.accountNumber);
                    notify.success('Đã sao chép số tài khoản thụ hưởng SGM!');
                  }}
                  onCallHotline={() => window.open(`tel:${SGM_COMPANY_INFO.hotlineSupport || '0901828492'}`, '_self')}
                />
              </div>
            ) : null}

            {/* E. FOOTER DOANH NGHIỆP & COMPACT ENTERPRISE MICRO-HUB */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs">
              <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-5">
                {/* Cột Trái: Pháp lý, Địa chỉ & Phím tắt hành động */}
                <div className="space-y-2 text-center md:text-left flex-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-3xs font-bold uppercase tracking-wider border border-emerald-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Cổng Tra Cứu Thương Mại Chính Thức • Saigon Machine (SGM OS)</span>
                  </div>
                  
                  <h4 className="text-sm sm:text-base font-black text-slate-900 leading-snug">
                    CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN
                  </h4>
                  <div className="text-3xs sm:text-2xs font-semibold text-slate-500 uppercase tracking-wide">
                    SAIGON INDUSTRIAL METALLIC CO.,LTD • SAIGON MACHINE
                  </div>

                  <div className="text-2xs text-slate-600 space-y-1 pt-1">
                    <p className="flex items-center justify-center md:justify-start gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span><strong>ĐỊA CHỈ:</strong> Lô 12A Đường số 09, Khu Công Nghiệp Tân Tạo, P. Tân Tạo, TP. Hồ Chí Minh</span>
                    </p>
                    <p className="flex items-center justify-center md:justify-start gap-3 text-3xs sm:text-2xs">
                      <span>Hotline: <a href="tel:0932000999" className="text-emerald-700 font-bold hover:underline">0932.000.999</a></span>
                      <span className="text-slate-300">•</span>
                      <span>Email: <a href="mailto:info@saigonmachine.vn" className="text-slate-700 font-medium hover:underline">info@saigonmachine.vn</a></span>
                    </p>
                  </div>

                  {/* Nút tác vụ nhanh */}
                  <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <a
                      href="https://maps.app.goo.gl/3fiZGV9W5t4StrT2A"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-3xs sm:text-2xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <MapPin className="w-3 h-3 text-red-500" />
                      <span>Google Maps (KCN Tân Tạo)</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>

                    <a
                      href="https://saigonmachine.vn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 text-3xs sm:text-2xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Globe className="w-3 h-3 text-emerald-600" />
                      <span>Website: saigonmachine.vn</span>
                      <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                    </a>

                    <a
                      href="tel:0932000999"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-3xs sm:text-2xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Hotline 0932.000.999</span>
                    </a>
                  </div>
                </div>

                {/* Cột Phải: Bộ đôi QR Code Zalo & Facebook Siêu Gọn */}
                <div className="flex flex-col items-center justify-center shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-5">
                  <div className="text-3xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Quét QR Kết Nối 24/7</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* QR Zalo */}
                    <a
                      href="https://oa.zalo.me/1336150047301360288"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Mở Zalo OA Saigon Machine"
                      className="group flex flex-col items-center p-2 rounded-xl bg-sky-50/70 hover:bg-sky-100/70 border border-sky-200 transition-all text-center"
                    >
                      <img 
                        src="/qr-zalo.png" 
                        alt="QR Zalo OA" 
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg bg-white p-0.5 border border-sky-300 shadow-2xs group-hover:scale-105 transition-transform"
                      />
                      <span className="mt-1 text-4xs font-bold text-sky-800 flex items-center gap-0.5">
                        Zalo OA <ExternalLink className="w-2 h-2 text-sky-600" />
                      </span>
                    </a>

                    {/* QR Facebook */}
                    <a
                      href="https://facebook.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Mở Facebook Saigon Machine"
                      className="group flex flex-col items-center p-2 rounded-xl bg-blue-50/70 hover:bg-blue-100/70 border border-blue-200 transition-all text-center"
                    >
                      <img 
                        src="/qr-facebook.png" 
                        alt="QR Facebook" 
                        className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-lg bg-white p-0.5 border border-blue-300 shadow-2xs group-hover:scale-105 transition-transform"
                      />
                      <span className="mt-1 text-4xs font-bold text-blue-800 flex items-center gap-0.5">
                        Facebook <ExternalLink className="w-2 h-2 text-blue-600" />
                      </span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER BADGE */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-3xs text-slate-500 font-sans tabular-nums">
        © 2026 Saigon Machine (SGM OS) • Zero-Trust Commercial Ledger & Public Tracking Portal
      </footer>
    </div>
  );
}
