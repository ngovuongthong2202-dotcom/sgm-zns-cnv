import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Sparkles, 
  Check, 
  HelpCircle, 
  Phone, 
  CheckCircle2, 
  ArrowRight,
  FileText,
  FileCheck,
  CreditCard
} from 'lucide-react';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { calculatePaymentPoints } from '@/src/modules/billing/domain/loyaltyEngine';
import { detectItemType, ItemSemanticType } from '@/src/widgets/product-list-input/useProductItemSemantic';

import { PortalContextType, TrackingProductItem, QuotationValidityInfo } from './types';
import { TrackingHeader } from './components/TrackingHeader';
import { TrackingFooter } from './components/TrackingFooter';
import { QuotationPortalView } from './components/QuotationPortalView';
import { ContractPortalView } from './components/ContractPortalView';
import { PaymentDeliveryPortalView } from './components/PaymentDeliveryPortalView';

export type { PortalContextType };

/**
 * Trích xuất mã tra cứu sạch sẽ từ tham số URL ZNS
 */
export function extractCleanTrackingCode(raw: string): string {
  if (!raw) return '';
  let cleaned = decodeURIComponent(raw).trim();
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
      // Fallback
    }
  }
  return cleaned.replace(/[<>]/g, '').trim();
}

/**
 * Chuẩn hóa che tên khách hàng theo tiêu chuẩn bảo mật ngân hàng B2B
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
  return `${words[0]} *** ${words[words.length - 1]}`;
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return '09********';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

/**
 * Thuật toán nhận diện ngữ cảnh hiển thị cổng tra cứu (Context-Morphing Detection):
 * - Ưu tiên 1: Tuyến đường URL chuyên biệt:
 *     /tra-cuu-hop-dong -> CONTRACT
 *     /tra-cuu-bao-gia  -> QUOTATION
 *     /tra-cuu-thanh-toan -> PAYMENT
 *     /tra-cuu-don-hang -> ORDER
 * - Ưu tiên 2: Tiền tố mã chứng từ:
 *     BG-*, BGM-* -> QUOTATION
 *     HD-*, /KD, CT/ -> CONTRACT
 *     PT-*, TT-* -> PAYMENT
 * - Ưu tiên 3: Thực thể tìm thấy trong cơ sở dữ liệu.
 */
export function detectPortalContext(pathname: string, code?: string, entity?: any): PortalContextType {
  const normPath = (pathname || '').toLowerCase();
  const normCode = (code || '').trim().toUpperCase();

  // 1. Explicit Path Routing
  if (normPath.startsWith('/tra-cuu-hop-dong')) return 'CONTRACT';
  if (normPath.startsWith('/tra-cuu-bao-gia')) return 'QUOTATION';
  if (normPath.startsWith('/tra-cuu-thanh-toan')) return 'PAYMENT';
  if (normPath.startsWith('/tra-cuu-don-hang')) {
    if ((normCode.startsWith('BG-') || normCode.startsWith('BGM-')) && entity && !entity.soHopDong) {
      return 'QUOTATION';
    }
    return 'ORDER';
  }

  // 2. Code prefix heuristics
  if (normCode.startsWith('BG-') || normCode.startsWith('BGM-')) return 'QUOTATION';
  if (normCode.startsWith('PT-') || normCode.startsWith('TT-')) return 'PAYMENT';
  if (normCode.startsWith('HD') || normCode.includes('/KD') || normCode.includes('CT/')) return 'CONTRACT';

  // 3. Entity heuristic
  if (entity) {
    if (entity.soHopDong) return 'CONTRACT';
    if (entity.soPhieuBaoGia && !entity.soHopDong && !entity.paymentId) return 'QUOTATION';
    if (entity.paymentId || entity.soTien) return 'PAYMENT';
  }

  return 'ORDER';
}

/**
 * Tính toán trạng thái hiệu lực của Báo Giá
 */
export function calculateQuotationValidity(
  ngayBaoGia?: string,
  ngayHetHan?: string,
  hieuLucDays = 7,
  referenceDate: Date = new Date()
): QuotationValidityInfo {
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
  const [matchingPayments, setMatchingPayments] = useState<any[]>([]);
  const [allPaymentsForCustomer, setAllPaymentsForCustomer] = useState<any[]>([]);

  // Portal Context
  const [portalMode, setPortalMode] = useState<PortalContextType>(() => {
    if (typeof window !== 'undefined') {
      return detectPortalContext(window.location.pathname, window.location.search);
    }
    return 'ORDER';
  });

  // Quotation Online Approval
  const [hasCustomerApproved, setHasCustomerApproved] = useState<boolean>(false);
  const [approvalSubmitting, setApprovalSubmitting] = useState<boolean>(false);

  // Phone Gate Security
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [phoneError, setPhoneError] = useState<string>('');

  // Auto Recognition from ZNS URL params
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

      resolveOrder(code);
    } else {
      setLoading(false);
    }
  }, []);

  // Universal Resolver & Deep Cross-Linking Mesh
  const resolveOrder = async (query: string) => {
    if (!query) return;
    setLoading(true);
    setPhoneError('');

    try {
      const cleanQ = extractCleanTrackingCode(query);
      const qNorm = cleanQ.trim().toLowerCase();

      // Query core document repositories
      const [contracts, quotations, payments, deliveries] = await Promise.all([
        repositoryFactory.get<any>('contracts').list({ limit: 500 }).catch(() => []),
        repositoryFactory.get<any>('quotations').list({ limit: 500 }).catch(() => []),
        repositoryFactory.get<any>('payments').list({ limit: 500 }).catch(() => []),
        repositoryFactory.get<any>('deliveries').list({ limit: 200 }).catch(() => [])
      ]);

      // 1. Contract Match
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

      // 2. Quotation Match
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

      // 3. Payment Match
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

      // 4. Delivery Match
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

      // Bi-Directional Mesh Linking
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

      if (delivery && !contract) {
        contract = contracts.find((c: any) => 
          (delivery.soHopDong && c.soHopDong && c.soHopDong.toLowerCase() === delivery.soHopDong.toLowerCase()) ||
          (delivery.soDonHang && c.soDonHang && c.soDonHang.toLowerCase() === delivery.soDonHang.toLowerCase())
        );
      }

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

      if (quotation && !contract) {
        contract = contracts.find((c: any) => 
          (c.quotationId && c.quotationId === quotation.id) ||
          (c.soPhieuBaoGia && c.soPhieuBaoGia === quotation.soPhieuBaoGia)
        );
      }

      // Aggregate all payments matching the contract/quotation (Multi-Voucher Aggregation)
      const cNum = contract?.soHopDong;
      const oNum = contract?.soDonHang || quotation?.soDonHang;
      const qNum = quotation?.soPhieuBaoGia;
      const cId = contract?.id;

      const matchedPayments = payments.filter((p: any) => 
        (cId && p.contractId === cId) ||
        (cNum && p.soHopDong === cNum) ||
        (oNum && p.soDonHang === oNum) ||
        (qNum && p.soPhieuBaoGia === qNum)
      );
      setMatchingPayments(matchedPayments);

      if (!payment && matchedPayments.length > 0) {
        payment = matchedPayments[0];
      }

      if (!delivery && (contract || quotation)) {
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
        const customerId = primary.customerId || primary.maKh || '';
        const custName = primary.tenKhachHang?.toLowerCase() || '';

        // Unified Customer Session check for Phone-Gate
        if (customerId && sessionStorage.getItem(`sgm_unlocked_cust_${customerId}`) === 'true') {
          setIsUnlocked(true);
        } else if (sessionStorage.getItem(`sgm_tracking_unlocked_${cleanQ.toLowerCase()}`) === 'true') {
          setIsUnlocked(true);
        }

        const custPayments = payments.filter((p: any) => 
          (customerId && (p.customerId === customerId || p.maKh === customerId)) ||
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

  const handleVerifyPhoneGate = async (digits: string): Promise<boolean> => {
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
      ...(Array.isArray(relatedPayment?.danhSachSdt) ? relatedPayment.danhSachSdt : []),
      relatedDelivery?.sdtNguoiNhan,
      relatedDelivery?.sdt
    ].filter(Boolean).map(p => String(p).replace(/\D/g, ''));

    const isMatch = candidatePhones.some(ph => ph.length >= 4 && ph.endsWith(digits));

    if (isMatch) {
      setIsUnlocked(true);
      const custId = resolvedEntity?.customerId || resolvedEntity?.maKh || '';
      if (custId) {
        sessionStorage.setItem(`sgm_unlocked_cust_${custId}`, 'true');
      }
      if (searchCode) {
        sessionStorage.setItem(`sgm_tracking_unlocked_${searchCode.toLowerCase()}`, 'true');
      }
      return true;
    }
    return false;
  };

  // Products normalization
  const normalizedProducts: TrackingProductItem[] = useMemo(() => {
    const rawList = 
      (Array.isArray(relatedContract?.products) && relatedContract.products.length > 0)
        ? relatedContract.products
        : (Array.isArray(relatedQuotation?.products) && relatedQuotation.products.length > 0)
        ? relatedQuotation.products
        : (Array.isArray(relatedPayment?.products) && relatedPayment.products.length > 0)
        ? relatedPayment.products
        : (Array.isArray(resolvedEntity?.products) ? resolvedEntity.products : []);

    return rawList.map((p: any, idx: number) => {
      const name = String(p.name || p.tenSanPham || p.tenMay || p.productName || `Thiết bị ${idx + 1}`).trim();
      const specifications = String(p.specifications || p.quyCach || p.moTa || p.specs || '').trim();
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
        itemType: (itemType === 'MACHINE' || itemType === 'MATERIAL' || itemType === 'SERVICE') ? itemType : 'MACHINE',
        warranty
      };
    });
  }, [relatedContract, relatedQuotation, relatedPayment, resolvedEntity]);

  // Installments list (Multi-Voucher Aggregation)
  const installmentsList = useMemo(() => {
    const list: any[] = [];
    const vouchers = [relatedPayment, ...matchingPayments.filter(p => p.id !== relatedPayment?.id)].filter(Boolean);

    vouchers.forEach((p: any) => {
      if (Array.isArray(p.cacDotThu) && p.cacDotThu.length > 0) {
        list.push(...p.cacDotThu);
      } else if (Array.isArray(p.dotThanhToan) && p.dotThanhToan.length > 0) {
        list.push(...p.dotThanhToan);
      } else if (Number(p.soTien) > 0) {
        list.push({
          lanThu: list.length + 1,
          soTien: Number(p.soTien),
          ngayThu: p.ngayThanhToan || p.time || p.createdAt,
          phuongThucThanhToan: p.phuongThucThanhToan || 'Chuyển khoản',
          ghiChu: p.ghiChu || 'Thanh toán tiền máy'
        });
      }
    });

    return list;
  }, [relatedPayment, matchingPayments]);

  // Financial aggregates
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
      normalizedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
    );

    let totalPaid = 0;
    if (installmentsList.length > 0) {
      totalPaid = installmentsList.reduce((s, d) => s + (Number(d.soTien) || 0), 0);
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
      normalizedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0)
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
  }, [relatedContract, relatedQuotation, relatedPayment, normalizedProducts, installmentsList, allPaymentsForCustomer]);

  // Quotation Validity calculation
  const quotationValidity = useMemo(() => {
    if (!relatedQuotation) return null;
    return calculateQuotationValidity(
      relatedQuotation.ngayBaoGia,
      relatedQuotation.ngayHetHan,
      relatedQuotation.hieuLuc
    );
  }, [relatedQuotation]);

  // Online Approval Action: Update DB + customerNotes
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
      {/* 1. ADAPTIVE TOP HEADER */}
      <TrackingHeader portalMode={portalMode} />

      {/* 2. MAIN CONTAINER */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 space-y-5">
        {/* BANNER TỰ ĐỘNG NHẬN DIỆN */}
        {isAutoRecognized && resolvedEntity && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-slate-800 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-slate-900">Đã đồng bộ tự động từ Zalo ZNS:</span>{' '}
                {portalMode === 'QUOTATION' ? (
                  <span>
                    Phiếu báo giá <strong className="text-emerald-800">{relatedQuotation?.soPhieuBaoGia || searchCode}</strong> đã được đồng bộ trực tuyến. Người phụ trách: <strong className="text-emerald-800">{relatedQuotation?.nguoiPhuTrach || 'Ngô Vương Thông'}</strong>.
                  </span>
                ) : portalMode === 'CONTRACT' ? (
                  <span>
                    Hợp đồng kinh tế <strong className="text-blue-800">{relatedContract?.soHopDong || searchCode}</strong> đã được đồng bộ với tiến độ chế tạo máy.
                  </span>
                ) : (
                  <span>
                    Chứng từ <strong className="text-emerald-800">{searchCode}</strong> đã được đồng bộ với sổ cái thanh toán và xuất kho.
                  </span>
                )}
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-emerald-50 text-emerald-800 font-bold px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
              <Check className="w-3 h-3" /> Tự động nhận diện
            </span>
          </div>
        )}

        {/* CẦU NỐI ĐIỀU HƯỚNG LIÊN KẾT CHÉO (CROSS-DOCUMENT NAVIGATOR) */}
        {portalMode === 'QUOTATION' && relatedContract && (
          <div className="bg-blue-50/90 border border-blue-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs text-blue-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <span>Báo giá này đã được phát triển thành <strong>Hợp đồng kinh tế {relatedContract.soHopDong}</strong>.</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPortalMode('CONTRACT')}
              className="inline-flex items-center gap-1 text-2xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
            >
              <span>Xem Tiến Độ Hợp Đồng</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {portalMode === 'CONTRACT' && relatedQuotation && (
          <div className="bg-slate-100 border border-slate-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-2xs text-slate-700">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Căn cứ pháp lý khởi tạo: Báo giá gốc <strong>{relatedQuotation.soPhieuBaoGia}</strong></span>
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

        {/* UNIVERSAL SEARCH BAR */}
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
                placeholder={
                  portalMode === 'QUOTATION'
                    ? "Nhập Số Báo giá (VD: 11-BG2609-025, BG-2026-0012) hoặc Mã đơn hàng..."
                    : portalMode === 'CONTRACT'
                    ? "Nhập Số Hợp đồng (VD: HD-2026-0140) hoặc Số Đơn hàng (PO)..."
                    : "Nhập Mã phiếu thu, Số Hợp đồng hoặc Số Báo giá..."
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all font-sans"
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
            <p className="text-xs text-slate-500 font-medium">Đang truy xuất thông tin từ hệ thống SGM OS ERP...</p>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {!loading && !resolvedEntity && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-4 my-6 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
              <HelpCircle className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Chưa tìm thấy thông tin chứng từ</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Quý khách vui lòng kiểm tra lại Số Báo giá, Số Hợp đồng hoặc Mã tra cứu được gửi trong tin nhắn Zalo ZNS.
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

        {/* RESOLVED DOMAIN VIEWS */}
        {!loading && resolvedEntity && (
          <>
            {portalMode === 'QUOTATION' ? (
              <QuotationPortalView
                quotation={relatedQuotation || resolvedEntity}
                customerName={isUnlocked ? activeCustomerName : maskName(activeCustomerName)}
                activePhone={activePhone}
                maskedPhone={isUnlocked ? activePhone : maskPhone(activePhone)}
                isUnlocked={isUnlocked}
                phoneError={phoneError}
                setPhoneError={setPhoneError}
                onVerifyPhone={handleVerifyPhoneGate}
                products={normalizedProducts}
                validity={quotationValidity}
                hasCustomerApproved={hasCustomerApproved}
                onApproveQuotation={handleApproveQuotation}
                approvalSubmitting={approvalSubmitting}
                relatedContract={relatedContract}
              />
            ) : portalMode === 'CONTRACT' ? (
              <ContractPortalView
                contract={relatedContract || resolvedEntity}
                customerName={isUnlocked ? activeCustomerName : maskName(activeCustomerName)}
                activePhone={activePhone}
                maskedPhone={isUnlocked ? activePhone : maskPhone(activePhone)}
                isUnlocked={isUnlocked}
                phoneError={phoneError}
                setPhoneError={setPhoneError}
                onVerifyPhone={handleVerifyPhoneGate}
                products={normalizedProducts}
                relatedPayments={matchingPayments}
                relatedDelivery={relatedDelivery}
                onNavigateToPayment={() => setPortalMode('PAYMENT')}
                onNavigateToDelivery={() => setPortalMode('ORDER')}
              />
            ) : (
              <PaymentDeliveryPortalView
                customerName={isUnlocked ? activeCustomerName : maskName(activeCustomerName)}
                activePhone={activePhone}
                maskedPhone={isUnlocked ? activePhone : maskPhone(activePhone)}
                isUnlocked={isUnlocked}
                phoneError={phoneError}
                setPhoneError={setPhoneError}
                onVerifyPhone={handleVerifyPhoneGate}
                products={normalizedProducts}
                installmentsList={installmentsList}
                matchedInstallmentIndex={0}
                financials={financials}
                relatedDelivery={relatedDelivery}
                relatedContract={relatedContract}
                relatedQuotation={relatedQuotation}
                primaryPaymentCode={relatedPayment?.paymentId || searchCode}
              />
            )}
          </>
        )}

        {/* 5. ENTERPRISE FOOTER */}
        <TrackingFooter />
      </main>
    </div>
  );
}
