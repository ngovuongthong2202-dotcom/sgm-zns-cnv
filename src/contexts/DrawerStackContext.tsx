/* eslint-disable max-lines */
import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { swrDocFetcher, swrColFetcher } from '@/src/data/swr-fetchers';
import type { Customer } from '@/src/domain/schema/customer.schema';
import type { Quotation } from '@/src/domain/schema/quotation.schema';
import type { Contract } from '@/src/domain/schema/contract.schema';
import type { Payment } from '@/src/domain/schema/payment.schema';
import type { Delivery } from '@/src/domain/schema/delivery.schema';
import { UniversalZnsPreviewModal } from '@/src/platform/ui/zns/UniversalZnsPreviewModal';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { calculateMaxWarrantyExpiryDate } from '@/src/modules/fulfillment/ui/utils/handoverDocumentHelper';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { formatZnsDate } from '@/src/shared/utils/formatDate';

// Lazy load detail drawers to prevent circular dependency issues
const CustomerDetailDrawer = React.lazy(() =>
  import('@/src/modules/customers/ui/components/CustomerDetailDrawer').then((m) => ({ default: m.CustomerDetailDrawer }))
);
const QuotationDetailDrawer = React.lazy(() =>
  import('@/src/modules/sales/ui/components/QuotationDetailDrawer').then((m) => ({ default: m.QuotationDetailDrawer }))
);
const ContractDetailDrawer = React.lazy(() =>
  import('@/src/modules/contracts/ui/components/ContractDetailDrawer').then((m) => ({ default: m.ContractDetailDrawer }))
);
const PaymentDetailDrawer = React.lazy(() =>
  import('@/src/modules/billing/ui/components/PaymentDetailDrawer').then((m) => ({ default: m.PaymentDetailDrawer }))
);
const DeliveryDetailDrawer = React.lazy(() =>
  import('@/src/modules/fulfillment/ui/components/DeliveryDetailDrawer').then((m) => ({ default: m.DeliveryDetailDrawer }))
);

export interface DrawerStackItem {
  id: string; // unique stack trace key
  entityType: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery';
  entityId: string;
}

interface DrawerStackContextType {
  stack: DrawerStackItem[];
  openDrawer: (entityType: DrawerStackItem['entityType'], entityId: string) => void;
  closeDrawer: () => void;
  clearStack: () => void;
}

const DrawerStackContext = createContext<DrawerStackContextType | null>(null);

export function DrawerStackProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<DrawerStackItem[]>([]);
  const pushedCountRef = useRef(0);

  // Parse drawer query param robustly
  const getSerializedStackFromUrl = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('drawer') || '';
  };

  const parseDrawerUrlToItems = (serialized: string): Omit<DrawerStackItem, 'id'>[] => {
    if (!serialized) return [];
    return serialized.split(';').map(part => {
      const [entityType, entityId] = part.split(':');
      return { entityType, entityId } as any;
    }).filter(i => i.entityType && (i.entityType === 'customer' || i.entityType === 'quotation' || i.entityType === 'contract' || i.entityType === 'payment' || i.entityType === 'delivery') && i.entityId);
  };

  // Two-Way Sync hook: Listening to popstate events
  useEffect(() => {
    const handlePopState = () => {
      const serialized = getSerializedStackFromUrl();
      const parsed = parseDrawerUrlToItems(serialized);

      setStack(prev => {
        const newStack: DrawerStackItem[] = [];
        parsed.forEach((item, index) => {
          const existing = prev[index];
          if (existing && existing.entityType === item.entityType && existing.entityId === item.entityId) {
            newStack.push(existing);
          } else {
            newStack.push({
              id: `${item.entityType}-${item.entityId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              entityType: item.entityType as any,
              entityId: item.entityId
            });
          }
        });
        return newStack;
      });
    };

    window.addEventListener('popstate', handlePopState);
    handlePopState(); // Init on mount

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const updateUrlWithStack = (nextStack: DrawerStackItem[], isPush: boolean) => {
    const serialized = nextStack.map(i => `${i.entityType}:${i.entityId}`).join(';');
    const params = new URLSearchParams(window.location.search);
    if (serialized) {
      params.set('drawer', serialized);
    } else {
      params.delete('drawer');
    }
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${window.location.pathname}${newSearch}`;

    if (isPush) {
      window.history.pushState({ drawerStack: true }, '', newUrl);
    } else {
      window.history.replaceState({ drawerStack: true }, '', newUrl);
    }
  };

  const openDrawer = useCallback((entityType: DrawerStackItem['entityType'], entityId: string | any) => {
    const rawId = typeof entityId === 'string' ? entityId : (entityId?.id || entityId?._id || String(entityId || ''));
    if (!rawId || rawId === '[object Object]') return;
    setStack((prev) => {
      // Avoid pushing duplicate adjacent drawers to prevent infinite cycles
      const top = prev[prev.length - 1];
      if (top && top.entityType === entityType && top.entityId === rawId) {
        return prev;
      }
      const newItem = {
        id: `${entityType}-${rawId}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        entityType,
        entityId: rawId,
      };
      const nextStack = [...prev, newItem];
      pushedCountRef.current += 1;
      updateUrlWithStack(nextStack, true);
      return nextStack;
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setStack((prev) => {
      if (prev.length === 0) return prev;
      const nextStack = prev.slice(0, -1);
      updateUrlWithStack(nextStack, false);
      return nextStack;
    });
    if (pushedCountRef.current > 0) {
      pushedCountRef.current -= 1;
    }
  }, []);

  const clearStack = useCallback(() => {
    pushedCountRef.current = 0;
    setStack([]);
    const params = new URLSearchParams(window.location.search);
    params.delete('drawer');
    const newSearch = params.toString() ? `?${params.toString()}` : '';
    window.history.pushState(null, '', `${window.location.pathname}${newSearch}`);
  }, []);

  const value = useMemo(
    () => ({
      stack,
      openDrawer,
      closeDrawer,
      clearStack,
    }),
    [stack, openDrawer, closeDrawer, clearStack]
  );

  return (
    <DrawerStackContext.Provider value={value}>
      {children}
      <DrawerHost />
    </DrawerStackContext.Provider>
  );
}

export function useDrawerStack() {
  const context = useContext(DrawerStackContext);
  if (!context) {
    throw new Error('useDrawerStack must be used within a DrawerStackProvider');
  }
  return context;
}

function DrawerHost() {
  const { stack, closeDrawer } = useDrawerStack();
  const [znsPreviewTarget, setZnsPreviewTarget] = useState<{
    entityType: 'CUSTOMER' | 'QUOTATION' | 'CONTRACT' | 'PAYMENT' | 'DELIVERY';
    entityId: string;
    messageType: string;
    subtype?: string;
    documentCode?: string;
    customerName?: string;
    phone?: string;
    payload: Record<string, any>;
    availablePhones?: Array<{ phone: string; label?: string; isPrimary?: boolean }>;
    onSuccessCallback?: () => Promise<void> | void;
  } | null>(null);

  if (stack.length === 0 && !znsPreviewTarget) return null;

  return (
    <>
      <React.Suspense fallback={null}>
        {stack.map((item, index) => {
          const isTop = index === stack.length - 1;
          const commonProps = {
            isOpen: true,
            modal: isTop,
            onClose: closeDrawer,
            entityId: item.entityId,
            onOpenZnsPreview: (target: any) => setZnsPreviewTarget(target),
            // If not top, we slide transition back elegantly under top-most stack
            className: isTop ? '' : 'pointer-events-none opacity-50 shadow-none scale-95 origin-right transition-transform duration-250',
          };

          switch (item.entityType) {
            case 'customer':
              return (
                <CustomerDrawerWrapper
                  key={item.id}
                  {...commonProps}
                />
              );
            case 'quotation':
              return (
                <QuotationDrawerWrapper
                  key={item.id}
                  {...commonProps}
                />
              );
            case 'contract':
              return (
                <ContractDrawerWrapper
                  key={item.id}
                  {...commonProps}
                />
              );
            case 'payment':
              return (
                <PaymentDrawerWrapper
                  key={item.id}
                  {...commonProps}
                />
              );
            case 'delivery':
              return (
                <DeliveryDrawerWrapper
                  key={item.id}
                  {...commonProps}
                />
              );
            default:
              return null;
          }
        })}
      </React.Suspense>

      {znsPreviewTarget && (
        <UniversalZnsPreviewModal
          isOpen={!!znsPreviewTarget}
          onClose={() => setZnsPreviewTarget(null)}
          messageType={znsPreviewTarget.messageType}
          subtype={znsPreviewTarget.subtype}
          entityType={znsPreviewTarget.entityType}
          entityId={znsPreviewTarget.entityId}
          documentCode={znsPreviewTarget.documentCode}
          customerName={znsPreviewTarget.customerName}
          phone={znsPreviewTarget.phone}
          payload={znsPreviewTarget.payload}
          availablePhones={znsPreviewTarget.availablePhones}
          onSuccess={async () => {
            if (znsPreviewTarget.onSuccessCallback) {
              await znsPreviewTarget.onSuccessCallback();
            }
          }}
        />
      )}
    </>
  );
}

// WRAPPERS WITH INDEPENDENT SWR FETCHERS FOR FULL STANDALONE RESILIENCE

function CustomerDrawerWrapper({ isOpen, onClose, entityId, className, modal, onOpenZnsPreview }: any) {
  const { data: customer, isLoading } = useSWR<Customer>(
    isOpen && entityId ? `customers:${entityId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!customer) return null;

  const handleSendZns = (c: Customer) => {
    const rawPhones = [c.sdt, (c as any).sdtPhu, (c as any).soZaloMacDinh, ...((c as any).danhSachSdt || [])].filter(Boolean).join(' ');
    const extracted = extractVietnamesePhones(rawPhones, c.diaChi);
    const targetPhone = c.sdt || extracted.mobilePhones[0]?.cleaned || '';
    onOpenZnsPreview?.({
      entityType: 'CUSTOMER',
      entityId: c.id,
      messageType: 'CUSTOMER_PRE_QUOTE',
      documentCode: c.maKh || c.id,
      customerName: c.tenZns || c.tenKhachHang,
      phone: targetPhone,
      payload: {
        ...c,
        customer_name: c.tenZns || c.tenKhachHang,
        tenZns: c.tenZns || c.tenKhachHang,
        ten_zns: c.tenZns || c.tenKhachHang,
        phone: targetPhone,
        sdt: targetPhone,
      },
      availablePhones: extracted.mobilePhones.map((m, idx) => ({
        phone: m.cleaned,
        label: `${m.formatted} (${m.carrier || 'Di động'})`,
        isPrimary: idx === 0
      }))
    });
  };

  return (
    <CustomerDetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      customer={customer}
      prevCustomer={null}
      nextCustomer={null}
      onNavigatePrev={() => {}}
      onNavigateNext={() => {}}
      onEdit={() => {}}
      onSendZns={handleSendZns}
      onDeleteCustomer={() => {}}
      modal={modal}
      className={className}
    />
  );
}

function QuotationDrawerWrapper({ isOpen, onClose, entityId, className, modal, onOpenZnsPreview }: any) {
  const { data: quotation, isLoading } = useSWR<Quotation>(
    isOpen && entityId ? `quotations:${entityId}` : null,
    swrDocFetcher as any
  );
  const { data: contracts = [] } = useSWR<any[]>(
    isOpen && entityId ? `contracts:500` : null,
    swrColFetcher
  );
  const { data: payments = [] } = useSWR<any[]>(
    isOpen && entityId ? `payments:500` : null,
    swrColFetcher
  );
  const { data: deliveries = [] } = useSWR<any[]>(
    isOpen && entityId ? `deliveries:500` : null,
    swrColFetcher
  );
  const { data: customers = [] } = useSWR<any[]>(
    isOpen && entityId ? `customers:500` : null,
    swrColFetcher
  );

  if (isLoading) return null;
  if (!quotation) return null;

  const handleSendZns = (q: Quotation) => {
    const cust = customers.find((c: any) => c.id === q.customerId);
    const rawPhones = [q.sdt, cust?.sdt, cust?.sdtPhu, cust?.soZaloMacDinh].filter(Boolean).join(' ');
    const extracted = extractVietnamesePhones(rawPhones, q.diaChiGiaoHang || cust?.diaChi);
    const targetPhone = q.sdt || extracted.mobilePhones[0]?.cleaned || '';
    onOpenZnsPreview?.({
      entityType: 'QUOTATION',
      entityId: q.id,
      messageType: 'BAOGIA',
      documentCode: q.soPhieuBaoGia || q.id,
      customerName: cust?.tenZns || q.tenKhachHang,
      phone: targetPhone,
      payload: {
        ...q,
        customer_name: cust?.tenZns || q.tenKhachHang,
        tenZns: cust?.tenZns || q.tenKhachHang,
        ten_zns: cust?.tenZns || q.tenKhachHang,
        so_phieu_bao_gia: q.soPhieuBaoGia || q.id,
        ngay_bao_gia: formatZnsDate(q.ngayBaoGia || (q as any).createdAt),
        ngay_het_han: formatZnsDate(q.ngayHetHan),
        phone: targetPhone,
        sdt: targetPhone,
      },
      availablePhones: extracted.mobilePhones.map((m, idx) => ({
        phone: m.cleaned,
        label: `${m.formatted} (${m.carrier || 'Di động'})`,
        isPrimary: idx === 0
      }))
    });
  };

  return (
    <QuotationDetailDrawer
      quotation={quotation}
      customers={customers}
      owners={[]}
      statuses={[]}
      contracts={contracts}
      payments={payments}
      deliveries={deliveries}
      onClose={onClose}
      onEdit={() => {}}
      onUpdate={async () => {}}
      onSendZns={() => handleSendZns(quotation)}
      onDelete={async () => {}}
      modal={modal}
      className={className}
    />
  );
}

function ContractDrawerWrapper({ isOpen, onClose, entityId, className, modal, onOpenZnsPreview }: any) {
  const { data: contract, isLoading } = useSWR<Contract>(
    isOpen && entityId ? `contracts:${entityId}` : null,
    swrDocFetcher as any
  );
  const { data: payments = [] } = useSWR<any[]>(
    isOpen && entityId ? `payments:500` : null,
    swrColFetcher
  );
  const { data: deliveries = [] } = useSWR<any[]>(
    isOpen && entityId ? `deliveries:500` : null,
    swrColFetcher
  );

  if (isLoading) return null;
  if (!contract) return null;

  const handleSendZns = (c: Contract) => {
    const rawPhones = [c.sdt, (c as any).phone].filter(Boolean).join(' ');
    const extracted = extractVietnamesePhones(rawPhones, (c as any).diaChi);
    const targetPhone = c.sdt || extracted.mobilePhones[0]?.cleaned || '';
    onOpenZnsPreview?.({
      entityType: 'CONTRACT',
      entityId: c.id,
      messageType: 'HOPDONG_SIGN_ZNS',
      documentCode: c.soHopDong || c.id,
      customerName: (c as any).tenZns || c.tenKhachHang,
      phone: targetPhone,
      payload: {
        ...c,
        customer_name: (c as any).tenZns || c.tenKhachHang,
        tenZns: (c as any).tenZns || c.tenKhachHang,
        ten_zns: (c as any).tenZns || c.tenKhachHang,
        order_code: c.soHopDong || c.soDonHang || c.id,
        So_don_hang: c.soDonHang || c.soHopDong || c.id,
        so_hop_dong: c.soHopDong || c.id,
        ngay_ky: formatZnsDate(c.ngayKy || (c as any).createdAt),
        sign_date: formatZnsDate(c.ngayKy || (c as any).createdAt),
        soNgay: c.soNgayDuKienHoanThanh || (c as any).thoiGianThucHien || (c as any).soNgay || 30,
        so_ngay: c.soNgayDuKienHoanThanh || (c as any).thoiGianThucHien || (c as any).soNgay || 30,
        phone: targetPhone,
        sdt: targetPhone,
      },
      availablePhones: extracted.mobilePhones.map((m, idx) => ({
        phone: m.cleaned,
        label: `${m.formatted} (${m.carrier || 'Di động'})`,
        isPrimary: idx === 0
      }))
    });
  };

  return (
    <ContractDetailDrawer
      drawerContract={contract}
      payments={payments}
      deliveries={deliveries}
      customers={[]}
      onClose={onClose}
      onEdit={() => {}}
      onSendZns={handleSendZns}
      modal={modal}
      className={className}
    />
  );
}

function PaymentDrawerWrapper({ isOpen, onClose, entityId, className, modal, onOpenZnsPreview }: any) {
  const { data: payment, isLoading } = useSWR<Payment>(
    isOpen && entityId ? `payments:${entityId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!payment) return null;

  const handleSendZns = (p: Payment, installmentIndex?: number) => {
    const rawPhones = [p.sdt, (p as any).phone].filter(Boolean).join(' ');
    const extracted = extractVietnamesePhones(rawPhones, (p as any).diaChi);
    const targetPhone = p.sdt || extracted.mobilePhones[0]?.cleaned || '';
    const isFullyPaid = p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN' || Number(p.congNoConLai || 0) <= 0;
    const messageType = isFullyPaid ? 'THANH_TOAN_TAT_TOAN' : 'THANH_TOAN_CONG_NO';
    
    const enrichedPayload: any = { ...p };
    if (installmentIndex !== undefined && Array.isArray(p.cacDotThu) && p.cacDotThu[installmentIndex]) {
      const inst = p.cacDotThu[installmentIndex];
      enrichedPayload.soTien = inst.soTien || p.soTien;
      enrichedPayload.ngayThanhToan = inst.ngayThu || p.ngayThanhToan;
      enrichedPayload.phuongThucThanhToan = inst.phuongThucThanhToan || p.phuongThucThanhToan;
      if (inst.nguoiNop) enrichedPayload.tenNguoiNop = inst.nguoiNop;
    }

    onOpenZnsPreview?.({
      entityType: 'PAYMENT',
      entityId: p.id,
      messageType,
      subtype: messageType,
      documentCode: p.paymentId || (p as any).soPhieuThu || p.id,
      customerName: (p as any).tenZns || p.tenKhachHang,
      phone: targetPhone,
      payload: {
        ...enrichedPayload,
        customer_name: (p as any).tenZns || p.tenKhachHang,
        tenZns: (p as any).tenZns || p.tenKhachHang,
        ten_zns: (p as any).tenZns || p.tenKhachHang,
        order_code: p.soHopDong || p.soDonHang || p.paymentId || p.id,
        so_hop_dong: p.soHopDong || p.soDonHang || '',
        so_don_hang: p.soDonHang || p.soHopDong || '',
        ngay_thanh_toan: formatZnsDate(enrichedPayload.ngayThanhToan),
        time: formatZnsDate(enrichedPayload.ngayThanhToan),
        phone: targetPhone,
        sdt: targetPhone,
      },
      availablePhones: extracted.mobilePhones.map((m, idx) => ({
        phone: m.cleaned,
        label: `${m.formatted} (${m.carrier || 'Di động'})`,
        isPrimary: idx === 0
      })),
      onSuccessCallback: async () => {
        if (installmentIndex !== undefined && Array.isArray(p.cacDotThu) && p.cacDotThu[installmentIndex]) {
          const updatedCacDotThu = [...p.cacDotThu];
          updatedCacDotThu[installmentIndex] = {
            ...updatedCacDotThu[installmentIndex],
            trangThaiZns: 'THÀNH CÔNG',
            znsStatus: 'THÀNH CÔNG',
            znsSentAt: new Date().toISOString(),
            znsPhone: targetPhone,
          };
          try {
            await repositoryFactory.get('payments').update(p.id!, {
              cacDotThu: updatedCacDotThu,
              trangThaiGuiTinThanhToan: 'THÀNH CÔNG',
            } as any);
          } catch (e) {
            console.error('Failed to update installment ZNS status in DrawerStack:', e);
          }
        }
      }
    });
  };

  return (
    <PaymentDetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      payment={payment}
      onEdit={() => {}}
      onSendZns={handleSendZns}
      onDelete={() => {}}
      modal={modal}
      className={className}
    />
  );
}

function DeliveryDrawerWrapper({ isOpen, onClose, entityId, className, modal, onOpenZnsPreview }: any) {
  const { data: delivery, isLoading } = useSWR<Delivery>(
    isOpen && entityId ? `deliveries:${entityId}` : null,
    swrDocFetcher as any
  );

  const { data: contract } = useSWR<Contract>(
    delivery?.contractId ? `contracts:${delivery.contractId}` : null,
    swrDocFetcher as any
  );

  const quotationId = delivery?.quotationId || contract?.quotationId;
  const { data: quotation } = useSWR<Quotation>(
    quotationId ? `quotations:${quotationId}` : null,
    swrDocFetcher as any
  );

  if (isLoading) return null;
  if (!delivery) return null;

  const handleSendZns = (d: Delivery, templateCode: 'GIAOHANG_ZNS' | 'GIAOHANG_HOANTAT' | 'GIAOHANG_BAOHANH' = 'GIAOHANG_ZNS') => {
    const rawPhones = [d.sdt, (d as any).phone].filter(Boolean).join(' ');
    const extracted = extractVietnamesePhones(rawPhones, d.diaChiGiaoHang || (d as any).diaChi);
    const targetPhone = d.sdt || extracted.mobilePhones[0]?.cleaned || '';
    const isWarranty = templateCode === 'GIAOHANG_HOANTAT' || templateCode === 'GIAOHANG_BAOHANH';
    const warrantyInfo = calculateMaxWarrantyExpiryDate(d);

    onOpenZnsPreview?.({
      entityType: 'DELIVERY',
      entityId: d.id,
      messageType: templateCode,
      subtype: isWarranty ? 'GIAOHANG_BAOHANH' : 'GIAOHANG_ZNS',
      documentCode: d.deliveryId || d.id,
      customerName: (d as any).tenZns || d.tenKhachHang,
      phone: targetPhone,
      payload: {
        ...d,
        customer_name: (d as any).tenZns || d.tenKhachHang,
        tenZns: (d as any).tenZns || d.tenKhachHang,
        ten_zns: (d as any).tenZns || d.tenKhachHang,
        So_hop_dong: d.soHopDong || '',
        So_don_hang: d.soDonHang || d.soHopDong || '',
        so_phieu_xuat: d.deliveryId || d.id || '',
        ngay_giao_may: formatZnsDate(d.ngayGiaoThucTe || (d as any).ngayGiaoHang),
        danh_sach_ma_may: Array.isArray(d.products) 
          ? d.products.map((p: any) => p.serialNumber || p.maMay || p.serial).filter(Boolean).join(', ')
          : '',
        so_luong: String(d.slMay || (Array.isArray(d.products) ? d.products.length : 1)),
        dvt: d.dvt || 'Máy',
        ma_bao_hanh: isWarranty ? warrantyInfo.primarySerial : (d.deliveryId || d.id || 'BH-SGM'),
        product: isWarranty ? warrantyInfo.contractReference : String((d as any).tenMay || (Array.isArray(d.products) && d.products[0]?.productName) || 'Máy cán tôn SGM').slice(0, 30),
        date: isWarranty ? warrantyInfo.expiryDateFormatted : formatZnsDate(d.ngayGiaoThucTe || (d as any).ngayGiaoHang),
        phone: targetPhone,
        sdt: targetPhone,
      },
      availablePhones: extracted.mobilePhones.map((m, idx) => ({
        phone: m.cleaned,
        label: `${m.formatted} (${m.carrier || 'Di động'})`,
        isPrimary: idx === 0
      }))
    });
  };

  return (
    <DeliveryDetailDrawer
      drawerDelivery={delivery}
      onClose={onClose}
      onEdit={() => {}}
      onMarkDelivered={() => {}}
      onSendZns={handleSendZns}
      onCancelDelivery={async () => {}}
      drawerContract={contract || null}
      drawerQuotation={quotation || null}
      modal={modal}
      className={className}
    />
  );
}
