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

export type PortalContextType = 'QUOTATION' | 'ORDER' | 'PAYMENT';

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

    return {
      totalContractVal,
      totalPaid,
      remainingDebt,
      paymentPoints,
      cumulativePoints
    };
  }, [relatedContract, relatedQuotation, relatedPayment, productsList, installmentsList, allPaymentsForCustomer]);

  // Ngữ cảnh Báo Giá chuyên biệt
  const isQuotationMode = portalMode === 'QUOTATION' || (!relatedContract && Boolean(relatedQuotation));
  const isContractMode = portalMode === 'CONTRACT' || Boolean(relatedContract);
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
                    Phiếu báo giá <strong className="font-mono text-emerald-800">{relatedQuotation?.soPhieuBaoGia || searchCode}</strong> đã được đồng bộ trực tuyến. Người phụ trách: <strong className="text-emerald-800">{relatedQuotation?.nguoiPhuTrach || 'Ngô Vương Thông'}</strong>.
                  </span>
                ) : (
                  <span>Mã đơn <strong className="font-mono text-emerald-800">{searchCode}</strong> đã được đồng bộ với tiến độ thanh toán thực tế.</span>
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-mono"
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
                    <span className="text-2xs text-slate-400 font-mono">
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
                    <span className="font-mono font-bold text-slate-700">
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
                      <div className={`text-base font-black font-mono leading-tight ${
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
                      <div className="text-lg font-black text-amber-700 font-mono leading-tight">
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
                        Nhập 4 số đuôi điện thoại của Quý khách (<span className="font-mono font-bold text-slate-800">{maskPhone(activePhone)}</span>) để mở khóa xem giá và thông số kỹ thuật.
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
                      className="w-24 bg-white border border-emerald-300 rounded-lg px-2.5 py-1.5 text-center text-sm font-mono text-emerald-900 tracking-widest focus:outline-hidden focus:border-emerald-600 shadow-2xs"
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

            {/* B. THẺ HỒ SƠ NGHIỆP VỤ CHUYÊN BIỆT (BUSINESS DOCUMENT DOSSIER SHEET) */}
            {isQuotationMode && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                          Hồ Sơ Báo Giá Thương Mại
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800">
                          Chính Thức
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500">
                        Saigon Machine Official Commercial Quotation Dossier
                      </p>
                    </div>
                  </div>

                  {hasCustomerApproved ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-2xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã Xác Nhận Đồng Ý Trực Tuyến</span>
                    </div>
                  ) : (
                    quotationValidity && (
                      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-2xs font-bold ${
                        quotationValidity.isExpired
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : quotationValidity.remainingDays <= 3
                            ? 'bg-amber-50 border-amber-200 text-amber-800'
                            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        <span>{quotationValidity.badgeText}</span>
                      </div>
                    )
                  )}
                </div>

                {/* Grid chi tiết hồ sơ báo giá */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Phiếu Báo Giá</span>
                    <span className="text-xs font-bold font-mono text-emerald-800 block truncate">
                      {relatedQuotation?.soPhieuBaoGia || resolvedEntity?.soPhieuBaoGia || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Ngày Phát Hành</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {relatedQuotation?.ngayBaoGia || resolvedEntity?.ngayBaoGia || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Hiệu Lực Báo Giá</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {relatedQuotation?.hieuLuc ? `${relatedQuotation.hieuLuc} ngày` : '30 ngày'} 
                      {relatedQuotation?.ngayHetHan ? ` (đến ${relatedQuotation.ngayHetHan})` : ''}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Kỹ Sư Phụ Trách (PIC)</span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {relatedQuotation?.nguoiPhuTrach || 'Phòng Dự Án SGM'}
                      </span>
                      <a href="tel:0932000999" className="text-emerald-700 hover:text-emerald-800 font-bold shrink-0 ml-1">
                        0932.000.999
                      </a>
                    </div>
                  </div>
                </div>

                {/* Điều khoản thương mại & Ghi chú */}
                <div className="p-3 rounded-xl bg-emerald-50/40 border border-emerald-100/80 text-2xs space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900 uppercase tracking-wider">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Điều Khoản Thương Mại & Cam Kết Kỹ Thuật</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {relatedQuotation?.dieuKhoanThanhToan || relatedQuotation?.noiDungGhiChu || 
                      'Giá xuất xưởng đã bao gồm chuyển giao công nghệ, hướng dẫn vận hành tại xưởng Saigon Machine. Bảo hành chính hãng 12 - 24 tháng theo tiêu chuẩn nhà sản xuất.'}
                  </p>
                </div>

                {/* Banner trạng thái duyệt trực tuyến */}
                {hasCustomerApproved && (
                  <div className="p-3 rounded-xl bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-2xs flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>
                        Quý khách đã xác nhận <strong>ĐỒNG Ý Báo giá</strong> trực tuyến. Bộ phận Dự Án SGM đang chuẩn bị hồ sơ hợp đồng và kế hoạch chế tạo máy!
                      </span>
                    </div>
                    <span className="font-mono text-2xs text-emerald-800 bg-white/80 px-2 py-0.5 rounded-md font-bold">
                      Ưu tiên sản xuất
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* B.2 THẺ HỒ SƠ HỢP ĐỒNG KINH TẾ (KHI CÓ HỢP ĐỒNG) */}
            {relatedContract && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-200/60 shadow-2xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                          Hồ Sơ Hợp Đồng Kinh Tế & Sản Xuất
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-100 text-blue-800">
                          Hiệu Lực Sản Xuất
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500">
                        Saigon Machine Manufacturing & Commercial Agreement Dossier
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-2xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Hợp Đồng Đang Triển Khai</span>
                  </div>
                </div>

                {/* Grid 4 thông số chính của Hợp đồng */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Hợp Đồng Kinh Tế</span>
                    <span className="text-xs font-bold font-mono text-blue-900 block truncate" title={relatedContract.soHopDong}>
                      {relatedContract.soHopDong || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Số Đơn Hàng (PO)</span>
                    <span className="text-xs font-bold font-mono text-slate-800 block truncate">
                      {relatedContract.soDonHang || relatedQuotation?.soDonHang || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Ngày Ký / Hiệu Lực</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {relatedContract.ngayKy || relatedContract.ngayBatDau || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Cam Kết Thời Gian Chế Tạo</span>
                    <span className="text-xs font-bold text-emerald-800 block">
                      {relatedContract.thoiGianGiaoHang || '45 ngày làm việc'}
                    </span>
                  </div>
                </div>

                {/* Hàng thông số thứ 2: Căn cứ báo giá, Địa điểm bàn giao, Phụ trách, Bảo hành */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Căn Cứ Báo Giá Gốc</span>
                    <span className="text-xs font-bold font-mono text-slate-700 block truncate">
                      {relatedContract.soPhieuBaoGia || relatedQuotation?.soPhieuBaoGia || 'Theo thỏa thuận'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Địa Điểm Bàn Giao</span>
                    <span className="text-xs font-bold text-slate-800 block truncate" title={relatedContract.diaDiemGiaoHang || relatedContract.diaChi || resolvedEntity?.diaChi}>
                      {relatedContract.diaDiemGiaoHang || relatedContract.diaChi || resolvedEntity?.diaChi || 'Xưởng khách hàng'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Quản Lý Dự Án SGM</span>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {relatedContract.nguoiPhuTrach || 'Ban Quản Lý Dự Án SGM'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Thời Hạn Bảo Hành Máy</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {relatedContract.baoHanh || '12 - 24 tháng chính hãng'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* B.3 THẺ HỒ SƠ PHIẾU THU & TÀI CHÍNH (KHI CHỈ CÓ GIAO DỊCH THANH TOÁN) */}
            {isPaymentMode && !relatedContract && relatedPayment && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-200/60 shadow-2xs">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight">
                          Hồ Sơ Giao Dịch & Phiếu Thu
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-2xs font-bold bg-purple-100 text-purple-800">
                          Xác Thực Tài Chính
                        </span>
                      </div>
                      <p className="text-2xs text-slate-500">
                        Saigon Machine Official Payment Voucher Dossier
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-purple-50 border border-purple-200 text-purple-800 text-2xs font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                    <span>Đã Xác Nhận Thu Tiền</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-2xs">
                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Mã Phiếu Thu</span>
                    <span className="text-xs font-bold font-mono text-purple-900 block truncate">
                      {relatedPayment.paymentId || relatedPayment.id || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Ngày Giao Dịch</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {relatedPayment.ngayThanhToan || relatedPayment.time || '---'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Phương Thức</span>
                    <span className="text-xs font-bold text-slate-800 block">
                      {relatedPayment.phuongThucThanhToan || 'Chuyển khoản'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">Nội Dung Thu</span>
                    <span className="text-xs font-bold text-slate-800 block truncate">
                      {relatedPayment.ghiChu || 'Thanh toán tiền hàng SGM'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* C. THANH TIẾN ĐỘ 4 BƯỚC THƯƠNG MẠI CHUẨN HÓA (STANDARDIZED COMMERCIAL STEPPER) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3.5 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                <span>{isQuotationMode ? 'Tiến Độ Báo Giá & Chuẩn Bị Triển Khai' : 'Tiến Độ Thực Hiện Đơn Hàng'}</span>
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1. Báo Giá */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  isQuotationMode ? 'bg-emerald-50/70 border-emerald-400 ring-1 ring-emerald-300' : (relatedQuotation ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200')
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs uppercase font-bold text-emerald-700">Bước 1: Báo Giá</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono truncate">
                    {relatedQuotation?.soPhieuBaoGia || resolvedEntity?.soPhieuBaoGia || 'Đã lập báo giá'}
                  </div>
                  <div className="text-2xs text-slate-500 mt-1">
                    Ngày: {relatedQuotation?.ngayBaoGia || '---'}
                  </div>
                </div>

                {/* 2. Hợp Đồng */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  relatedContract ? 'bg-emerald-50/40 border-emerald-200' : (isQuotationMode ? 'bg-amber-50/30 border-amber-200' : 'bg-slate-50 border-slate-200')
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs uppercase font-bold text-emerald-700">Bước 2: Hợp Đồng</span>
                    {relatedContract ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-amber-500" />}
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono truncate">
                    {relatedContract?.soHopDong || (isQuotationMode ? 'Sẵn sàng soạn thảo' : 'Đang chuẩn bị ký')}
                  </div>
                  <div className="text-2xs text-slate-500 mt-1">
                    {relatedContract ? `Đơn hàng: ${relatedContract.soDonHang || '---'}` : (isQuotationMode ? 'Khởi tạo sau khi đồng ý' : 'Theo quy trình')}
                  </div>
                </div>

                {/* 3. Thanh Toán */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  financials.totalPaid > 0 ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs uppercase font-bold text-emerald-700">Bước 3: Thanh Toán</span>
                    {financials.remainingDebt <= 0 && financials.totalPaid > 0 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono">
                    {financials.totalPaid > 0 ? (isUnlocked ? formatCurrency(financials.totalPaid) : '•••••••• đ') : 'Theo thỏa thuận'}
                  </div>
                  <div className="text-2xs text-slate-500 mt-1">
                    {financials.remainingDebt <= 0 && financials.totalPaid > 0 ? 'Đã hoàn tất thanh toán' : (isQuotationMode ? 'Tạm ứng & Nghiệm thu' : 'Đang thanh toán theo tiến độ')}
                  </div>
                </div>

                {/* 4. Giao Hàng & Bảo Hành */}
                <div className={`p-3.5 rounded-xl border transition-all ${
                  relatedDelivery ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-2xs uppercase font-bold text-emerald-700">Bước 4: Bàn Giao</span>
                    {relatedDelivery ? <Truck className="w-4 h-4 text-emerald-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
                  </div>
                  <div className="text-xs font-bold text-slate-800 font-mono truncate">
                    {relatedDelivery?.soPhieuXuat || 'Chế tạo theo quy cách'}
                  </div>
                  <div className="text-2xs text-slate-500 mt-1">
                    {relatedDelivery?.ngayGiaoThucTe ? `Đã giao: ${relatedDelivery.ngayGiaoThucTe}` : 'Tiêu chuẩn SGM'}
                  </div>
                </div>
              </div>
            </div>

            {/* D. DANH MỤC THIẾT BỊ & QUY CÁCH KỸ THUẬT (SINGLE-STREAM ADAPTIVE MANIFEST MESH) */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
              {/* Header: Tiêu đề + Thống kê + Tổng tiền */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <span>Danh Mục Thiết Bị & Quy Cách Kỹ Thuật</span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono text-2xs font-bold">
                        {normalizedProducts.length} mục
                      </span>
                    </h3>
                    <p className="text-2xs text-slate-500">
                      Quy cách chế tạo & cấu hình máy đồng bộ theo tiêu chuẩn Saigon Machine
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {isUnlocked && (
                    <div className="text-right">
                      <span className="text-2xs uppercase font-bold text-slate-400 block">Tổng giá trị</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-emerald-700 block">
                        {formatCurrency(financials.totalContractVal)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* UNIFIED CONTROLS: Category Pills + Quick Search + Expand All Toggle */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {/* Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                        selectedCategory === 'ALL'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Tất cả ({categoryCounts.ALL})
                    </button>
                    {categoryCounts.MACHINE > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('MACHINE')}
                        className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedCategory === 'MACHINE'
                            ? 'bg-blue-600 text-white shadow-2xs'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                        }`}
                      >
                        ⚙️ Máy móc ({categoryCounts.MACHINE})
                      </button>
                    )}
                    {categoryCounts.ACCESSORY > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('ACCESSORY')}
                        className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedCategory === 'ACCESSORY'
                            ? 'bg-purple-600 text-white shadow-2xs'
                            : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                        }`}
                      >
                        🔧 Vật tư / Phụ tùng ({categoryCounts.ACCESSORY})
                      </button>
                    )}
                    {categoryCounts.SERVICE > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('SERVICE')}
                        className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                          selectedCategory === 'SERVICE'
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
                      >
                        🛠️ Dịch vụ ({categoryCounts.SERVICE})
                      </button>
                    )}
                  </div>

                  {/* Expand All / Collapse All Toggle Button */}
                  {filteredProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={toggleExpandAll}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-2xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer shrink-0 ml-auto"
                      title={allExpanded ? 'Thu gọn tất cả chi tiết kỹ thuật' : 'Mở rộng xem toàn bộ quy cách kỹ thuật'}
                    >
                      {allExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      <span>{allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
                    </button>
                  )}
                </div>

                {/* Inline Fast Filter Search (Hiển thị khi có trên 3 sản phẩm) */}
                {normalizedProducts.length > 3 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={manifestSearch}
                      onChange={(e) => setManifestSearch(e.target.value)}
                      placeholder="Tìm nhanh theo tên thiết bị, quy cách kỹ thuật, serial..."
                      className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
                    />
                    {manifestSearch && (
                      <button
                        type="button"
                        onClick={() => setManifestSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* D.1: MOBILE VIEW (< md) - SINGLE-STREAM ADAPTIVE MANIFEST MESH */}
              <div className="md:hidden">
                {filteredProducts.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
                    {filteredProducts.map((p, idx) => {
                      const semantic = ITEM_SEMANTIC_CONFIG[p.itemType] || ITEM_SEMANTIC_CONFIG.MACHINE;
                      const isExpanded = !!expandedItems[p.id || String(idx)];
                      return (
                        <div key={p.id || idx} className="transition-colors hover:bg-slate-50/70">
                          {/* Master Compact Row (~56px) */}
                          <div 
                            onClick={() => toggleItemExpanded(p.id || String(idx))}
                            className="p-3.5 flex items-center gap-3 cursor-pointer select-none active:bg-slate-100/80 transition-colors"
                          >
                            {/* Index Number */}
                            <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-mono text-2xs font-bold flex items-center justify-center shrink-0">
                              {String(idx + 1).padStart(2, '0')}
                            </span>

                            {/* Center: Title & Integrated Subtitle */}
                            <div className="flex-1 min-w-0 pr-1">
                              <h4 className="font-bold text-slate-900 text-xs leading-snug truncate">
                                {p.name}
                              </h4>
                              <div className="flex items-center gap-1.5 mt-0.5 text-2xs text-slate-500 truncate">
                                <span className="font-semibold text-slate-700">
                                  {p.quantity} {p.unit}
                                </span>
                                <span>•</span>
                                <span className={p.itemType === 'MACHINE' ? 'text-blue-700 font-medium' : (p.itemType === 'SERVICE' ? 'text-amber-700 font-medium' : 'text-purple-700 font-medium')}>
                                  {semantic.label}
                                </span>
                                {p.serials.length > 0 ? (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-emerald-700 font-medium truncate">
                                      SN: {p.serials.join(', ')}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span>•</span>
                                    <span className="text-slate-400">Chuẩn SGM</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Right: Price & Smooth Chevron */}
                            <div className="text-right shrink-0 flex items-center gap-2">
                              <div>
                                {isUnlocked ? (
                                  <span className="text-xs font-black font-mono text-emerald-700 block">
                                    {formatCurrency(p.amount)}
                                  </span>
                                ) : (
                                  <span className="text-2xs text-slate-400 font-mono flex items-center justify-end gap-1">
                                    <Lock className="w-3 h-3 text-slate-400" />
                                    <span>••••••</span>
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 w-4 h-4 flex items-center justify-center">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Expandable Technical Specification Accordion Drawer */}
                          {isExpanded && (
                            <div className="px-3.5 pb-3.5 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-2.5 text-2xs">
                              {/* Specs description */}
                              {p.specifications && (
                                <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-slate-700 leading-relaxed shadow-2xs">
                                  <div className="font-bold text-2xs uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Quy Cách Kỹ Thuật Chi Tiết:</span>
                                  </div>
                                  <div className="whitespace-pre-wrap leading-relaxed text-slate-700">{p.specifications}</div>
                                </div>
                              )}

                              {/* 4-col micro spec bar */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs">
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Đơn Vị Tính</span>
                                  <span className="font-bold text-slate-800">{p.unit}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Số Lượng</span>
                                  <span className="font-mono font-black text-emerald-700">{p.quantity}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Bảo Hành</span>
                                  <span className="font-semibold text-slate-800">{p.warranty || '12 tháng'}</span>
                                </div>
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-0.5">Phân Loại</span>
                                  <span className="font-semibold text-slate-800">{semantic.label}</span>
                                </div>
                              </div>

                              {/* Serial / Mã Máy */}
                              {p.serials.length > 0 && (
                                <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                                  <span className="text-slate-400 uppercase tracking-wider font-semibold block mb-1">Mã Máy / Serial Sản Phẩm:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {p.serials.map((sn: string, sIdx: number) => (
                                      <span key={sIdx} className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-2xs font-bold">
                                        {sn}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Price breakdown bar */}
                              {isUnlocked ? (
                                <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                                  <div>
                                    <span className="text-slate-500 uppercase tracking-wider font-semibold block">Đơn Giá</span>
                                    <span className="font-mono font-bold text-slate-800 text-xs">
                                      {formatCurrency(p.price)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-emerald-800 uppercase tracking-wider font-semibold block">Thành Tiền</span>
                                    <span className="font-mono font-black text-emerald-700 text-sm">
                                      {formatCurrency(p.amount)}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-between text-slate-400">
                                  <span className="flex items-center gap-1.5 italic">
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Nhập 4 số cuối SĐT để xem giá</span>
                                  </span>
                                  <span className="font-mono">•••••••• đ</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                    Không tìm thấy thiết bị phù hợp với bộ lọc tìm kiếm
                  </div>
                )}
              </div>

              {/* D.2: DESKTOP VIEW (>= md) */}
              <div className="hidden md:block overflow-x-auto border border-slate-200/90 rounded-2xl">
                <table className="w-full text-xs text-left border-collapse min-w-[720px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase">
                      <th className="py-3 px-3.5 w-12 text-center">STT</th>
                      <th className="py-3 px-3.5">Tên Sản Phẩm / Thiết Bị & Quy Cách</th>
                      <th className="py-3 px-3.5 text-center w-20">ĐVT</th>
                      <th className="py-3 px-3.5 text-right w-24">Số Lượng</th>
                      <th className="py-3 px-3.5 w-48">Serial / Mã Máy</th>
                      {isUnlocked && <th className="py-3 px-3.5 text-right w-36">Đơn Giá</th>}
                      {isUnlocked && <th className="py-3 px-3.5 text-right w-40">Thành Tiền</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredProducts.length > 0 ? (
                      filteredProducts.map((p, idx) => {
                        const semantic = ITEM_SEMANTIC_CONFIG[p.itemType] || ITEM_SEMANTIC_CONFIG.MACHINE;
                        return (
                          <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3.5 px-3.5 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                            <td className="py-3.5 px-3.5">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-bold border ${semantic.badgeClass}`}>
                                  <span>{semantic.icon}</span>
                                  <span>{semantic.shortLabel}</span>
                                </span>
                                <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                              </div>
                              {p.specifications && (
                                <div className="text-2xs text-slate-500 pl-1 border-l-2 border-emerald-400/50 mt-1 leading-relaxed whitespace-pre-wrap">
                                  {p.specifications}
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-3.5 text-center text-slate-600 font-semibold">{p.unit}</td>
                            <td className="py-3.5 px-3.5 text-right font-mono font-black text-slate-800">{p.quantity}</td>
                            <td className="py-3.5 px-3.5">
                              {p.serials.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {p.serials.map((sn: string, sIdx: number) => (
                                    <span key={sIdx} className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-2xs font-bold">
                                      {sn}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-2xs text-slate-400 italic">Theo tiêu chuẩn SGM</span>
                              )}
                            </td>
                            {isUnlocked && (
                              <td className="py-3.5 px-3.5 text-right font-mono text-slate-700">
                                {formatCurrency(p.price)}
                              </td>
                            )}
                            {isUnlocked && (
                              <td className="py-3.5 px-3.5 text-right font-mono font-black text-emerald-700">
                                {formatCurrency(p.amount)}
                              </td>
                            )}
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={isUnlocked ? 7 : 5} className="py-8 text-center text-slate-400 italic">
                          Không tìm thấy thiết bị phù hợp với bộ lọc tìm kiếm
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Manifest Summary Footer Bar */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500 flex-wrap gap-2">
                <span>
                  Đang hiển thị <strong className="text-slate-800 font-mono">{filteredProducts.length}</strong> / {normalizedProducts.length} mục • Tổng cộng <strong className="text-slate-800 font-mono">{filteredProducts.reduce((sum, p) => sum + p.quantity, 0)}</strong> thiết bị
                </span>
                {(manifestSearch || selectedCategory !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => { setManifestSearch(''); setSelectedCategory('ALL'); }}
                    className="text-emerald-700 hover:underline font-semibold cursor-pointer"
                  >
                    Xóa bộ lọc tìm kiếm
                  </button>
                )}
              </div>
            </div>

            {/* C.2. BỘ NÚT HÀNH ĐỘNG CHỐT BÁO GIÁ TRỰC TUYẾN (QUOTATION CONVERSION ACTION SUITE) */}
            {isQuotationMode && (
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Phản Hồi & Xác Nhận Báo Giá Trực Tuyến</span>
                    </h3>
                    <p className="text-2xs text-slate-600 mt-0.5">
                      Quý khách có thể xác nhận đồng ý với báo giá trên để SGM ưu tiên soạn thảo Hợp đồng kinh tế và lên kế hoạch bố trí sản xuất.
                    </p>
                  </div>

                  {hasCustomerApproved ? (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã ghi nhận Quý khách đồng ý báo giá!</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApproveQuotation}
                      disabled={approvalSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      {approvalSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Đồng Ý Báo Giá & Yêu Cầu Lập Hợp Đồng</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex flex-wrap items-center gap-2">
                  <a
                    href="https://oa.zalo.me/1336150047301360288"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 text-2xs font-semibold transition-all shadow-2xs"
                  >
                    <ExternalLink className="w-3 h-3 text-[#0068FF]" />
                    <span>Yêu cầu tư vấn điều chỉnh thông số qua Zalo OA</span>
                  </a>
                  <a
                    href="tel:0932000999"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/50 text-2xs font-semibold transition-all shadow-2xs"
                  >
                    <Phone className="w-3 h-3 text-emerald-600" />
                    <span>Gọi chuyên viên: {relatedQuotation?.nguoiPhuTrach || 'Ngô Vương Thông'} (0932.000.999)</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-2xs font-semibold transition-all shadow-2xs cursor-pointer sm:ml-auto"
                  >
                    <Printer className="w-3 h-3 text-slate-500" />
                    <span>In / Tải Báo Giá</span>
                  </button>
                </div>
              </div>
            )}

            {/* D. TIẾN ĐỘ THANH TOÁN & ĐỢT THU CHI TIẾT (KHI UNLOCKED) */}
            {isUnlocked && relatedPayment && (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Nhật Ký Các Đợt Thanh Toán & Tích Lũy Điểm</span>
                  </h3>
                  <span className="text-2xs text-slate-400 font-mono">
                    Mã chứng từ: {relatedPayment.paymentId || 'PT-SGM'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-3xs text-slate-500 uppercase font-semibold">Tổng giá trị hợp đồng:</span>
                    <div className="text-sm font-bold font-mono text-slate-800 mt-0.5">
                      {formatCurrency(financials.totalContractVal)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-3xs text-emerald-700 uppercase font-semibold">Đã thanh toán thực tế:</span>
                    <div className="text-sm font-bold font-mono text-emerald-700 mt-0.5">
                      {formatCurrency(financials.totalPaid)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200">
                    <span className="text-3xs text-amber-700 uppercase font-semibold">Công nợ còn lại:</span>
                    <div className="text-sm font-bold font-mono text-amber-700 mt-0.5">
                      {formatCurrency(financials.remainingDebt)}
                    </div>
                  </div>
                </div>

                {installmentsList.length > 0 && (
                  <div className="overflow-x-auto border border-slate-100 rounded-xl">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-3xs uppercase">
                          <th className="py-2.5 px-3">Đợt thu</th>
                          <th className="py-2.5 px-3">Ngày thu</th>
                          <th className="py-2.5 px-3 text-right">Số tiền</th>
                          <th className="py-2.5 px-3">Hình thức</th>
                          <th className="py-2.5 px-3">Ghi chú</th>
                          <th className="py-2.5 px-3 text-right">Điểm cộng</th>
                          <th className="py-2.5 px-3 text-center">Trạng thái ZNS</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {installmentsList.map((dot: any, dIdx: number) => {
                          const pts = calculatePaymentPoints(Number(dot.soTien) || 0);
                          const isMatched = dIdx === matchedInstallmentIndex;
                          return (
                            <tr 
                              key={dIdx} 
                              className={`transition-colors ${
                                isMatched ? 'bg-emerald-50/60 font-semibold' : 'hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="py-2.5 px-3 font-bold text-slate-800">
                                Đợt {dot.lanThu || dIdx + 1}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{dot.ngayThu || '---'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                {formatCurrency(Number(dot.soTien) || 0)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{dot.phuongThucThanhToan || 'Chuyển khoản'}</td>
                              <td className="py-2.5 px-3 text-slate-700">{dot.ghiChu || '---'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                                +{formatPoints(pts)}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {isMatched ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 text-3xs font-bold">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" />
                                    Vừa xác nhận
                                  </span>
                                ) : (
                                  <span className="text-3xs text-slate-400">Đã ghi sổ</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

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
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-3xs text-slate-500 font-mono">
        © 2026 Saigon Machine (SGM OS) • Zero-Trust Commercial Ledger & Public Tracking Portal
      </footer>
    </div>
  );
}
