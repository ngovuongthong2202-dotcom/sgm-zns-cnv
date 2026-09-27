/* eslint-disable max-lines */
import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/src/shared/utils/formatDate';

import useSWR from 'swr';
import { swrColFetcher } from '@/src/data/swr-fetchers';

import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { DocumentOmniFlowRibbon } from '@/src/widgets/DocumentOmniFlowRibbon';
import { UnifiedActivityAuditNexus } from '@/src/widgets/UnifiedActivityAuditNexus';
import { HorizonFlowHUD } from '@/src/widgets/HorizonFlowHUD';
import { DrawerHeaderCockpitHUD } from '@/src/widgets/DrawerHeaderCockpitHUD';
import { normalizeLegacyStatus, EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { QuotationDetailOverview } from './QuotationDetailOverview';
import { QuotationDetailFooter } from './QuotationDetailFooter';

import { QuotationRevisionsPanel } from './QuotationRevisionsPanel';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { QuotationSaveRevisionModal } from './QuotationSaveRevisionModal';

import {
  aggregateProducts
} from '@/src/domain/pricing/quotation-pricing';

import { FileText } from 'lucide-react';

import { entityCachePool } from '@/src/platform/data/entity-cache-pool';

export interface QuotationDetailDrawerProps {
  quotation: Quotation | null;
  customers: Customer[];
  owners: string[];
  statuses: string[];
  contracts: import('@/src/domain/schema/contract.schema').Contract[];
  payments: import('@/src/domain/schema/payment.schema').Payment[];
  deliveries: import('@/src/domain/schema/delivery.schema').Delivery[];
  onClose: () => void;
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<Quotation>) => Promise<void>;
  onSendZns?: () => void;
  modal?: boolean;
  className?: string;
}

export function QuotationDetailDrawer({
  quotation,
  customers,
 
  owners,
  statuses: _statuses,
  contracts,
  payments,
  deliveries,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
  onSendZns,
  modal,
  className
}: QuotationDetailDrawerProps) {
 
  const navigate = useNavigate();
  const [isZnsLocked, setIsZnsLocked] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'nexus' | 'revisions'>('overview');
  const [flowFocusTarget, setFlowFocusTarget] = useState<'quotation' | 'contract' | 'delivery' | 'payment'>('quotation');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    if (quotation?.id) {
      setActiveTab('overview');
      setFlowFocusTarget('quotation');
    }
  }, [quotation?.id]);

  const handleOwnerChange = async (newOwner: string) => {
    if (!quotation?.id) return;
    try {
      await onUpdate(quotation.id, { nguoiPhuTrach: newOwner });
 
      notify.success('Đã cập nhật người phụ trách');
    } catch {
      notify.error('Lỗi cập nhật người phụ trách');
    }
  };

  const handleSendZnsWithLock = () => {
    if (isZnsLocked) return;
    setIsZnsLocked(true);
    setTimeout(() => {
      setIsZnsLocked(false);
    }, 3000);
    if (onSendZns) {
      onSendZns();
    }
  };

  const handleDuplicate = () => {
    if (!quotation) return;
    const duplicated: Quotation = {
      ...quotation,
      id: undefined,
      tinhTrangBaoGia: 'MỚI',
      trangThaiGuiTinBaoGia: 'Chưa gửi',
      soPhieuBaoGia: '', // Trống để form tự sinh hoặc người dùng sửa đổi
    };
    onEdit(duplicated);
    notify.info('Đã sao chép dữ liệu báo giá vào biểu mẫu.');
  };

  useEffect(() => {
    if (quotation?.id) {
      setActiveTab('overview');
    }
  }, [quotation?.id]);

  const isOpen = !!quotation;

  const { data: lazyContracts = [] } = useSWR<any[]>(
    isOpen && quotation?.id && (!contracts || contracts.length === 0)
      ? `contracts:50:quotationId:${quotation?.id}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: lazyPayments = [] } = useSWR<any[]>(
    isOpen && quotation?.id && (!payments || payments.length === 0)
      ? `payments:50:quotationId:${quotation?.id}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: lazyDeliveries = [] } = useSWR<any[]>(
    isOpen && quotation?.id && (!deliveries || deliveries.length === 0)
      ? `deliveries:50:quotationId:${quotation?.id}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  if (!quotation) return null;

  const customer = (customers && customers.find(c => c.id === quotation.customerId)) ||
    (customers && customers.find(c => c.tenKhachHang === quotation.tenKhachHang)) ||
    (quotation.customerId ? entityCachePool.get('customers', quotation.customerId) : null) ||
    (quotation.tenKhachHang ? entityCachePool.find('customers', (c: any) => c.tenKhachHang === quotation.tenKhachHang) : null) ||
    ({
      id: quotation.customerId || '',
      tenKhachHang: quotation.tenKhachHang || 'Khách hàng',
      sdt: quotation.sdt || '',
      diaChi: (quotation as any).diaChiGiaoHang || '',
      tinhThanh: (quotation as any).tinhThanh || ''
    } as any);
  const { totalAfterTax: totalValue } = aggregateProducts(quotation.products || []);

  const safeContracts = (contracts && contracts.length > 0) ? contracts : lazyContracts;
  const safePayments = (payments && payments.length > 0) ? payments : lazyPayments;
  const safeDeliveries = (deliveries && deliveries.length > 0) ? deliveries : lazyDeliveries;

  const matchingContracts = safeContracts.filter(c => 
    c.quotationId === quotation.id || 
    (quotation.soPhieuBaoGia && c.soPhieuBaoGia === quotation.soPhieuBaoGia)
  );
  const matchingContractIds = new Set(matchingContracts.map(c => c.id).filter(Boolean));
  const matchingContractSos = new Set(matchingContracts.map(c => c.soHopDong).filter(Boolean));

  const matchingPayments = safePayments.filter(p => 
    p.quotationId === quotation.id || 
    (quotation.soPhieuBaoGia && p.soPhieuBaoGia === quotation.soPhieuBaoGia) ||
    (p.contractId && matchingContractIds.has(p.contractId)) ||
    (p.soHopDong && matchingContractSos.has(p.soHopDong))
  );

  const matchingDeliveries = safeDeliveries.filter(d => 
    d.quotationId === quotation.id || 
    (quotation.soPhieuBaoGia && d.soPhieuBaoGia === quotation.soPhieuBaoGia) ||
    (d.contractId && matchingContractIds.has(d.contractId)) ||
    (d.soHopDong && matchingContractSos.has(d.soHopDong))
  );

  // CUSTOM TABS CONTROLLERS - Kiến trúc Tam Điểm (The Sovereign Triad)
  const totalFlowDocs = 1 + matchingContracts.length + matchingPayments.length + matchingDeliveries.length;
  const tabsConfig = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'flow', label: 'Dòng chảy 360°', count: totalFlowDocs },
    { id: 'nexus', label: 'Nhật ký & Hoạt động' },
  ];
  if ((quotation.revisions?.length || 0) > 0) {
    tabsConfig.push({ id: 'revisions', label: 'Phiên bản giá', count: quotation.revisions?.length } as any);
  }

  const customTabsList = (
    <div className="flex items-center gap-6 border-b border-slate-100 pb-px -mb-[9px] select-none pl-1 overflow-x-auto scrollbar-hide">
      {tabsConfig.map((tab) => {
        const isTabActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 text-xs font-semibold relative outline-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-0 bg-transparent ${
              isTabActive ? 'text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {'count' in tab && (
              <span className={`text-3xs px-1.5 h-3.5 rounded-full ml-0.5 inline-flex items-center justify-center font-bold ${isTabActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-150 text-slate-700'}`}>
                {tab.count}
              </span>
            )}
            {isTabActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-700 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );

  const overviewPanel = (
    <QuotationDetailOverview
      quotation={quotation}
      customer={customer}
      matchingContracts={matchingContracts}
      matchingPayments={matchingPayments}
      matchingDeliveries={matchingDeliveries}
      owners={owners}
      totalValue={totalValue}
      handleOwnerChange={handleOwnerChange}
      onClose={onClose}
    />
  );

  const horizonHud = (
    <DrawerHeaderCockpitHUD
      currentType="quotation"
      quotation={quotation}
      contracts={matchingContracts}
      deliveries={matchingDeliveries}
      payments={matchingPayments}
    />
  );

  // 2. DÒNG CHẢY 360° PANEL (DocumentOmniFlowRibbon)
  const flowPanel = (
    <DocumentOmniFlowRibbon
      currentType="quotation"
      currentDoc={quotation}
      relatedQuotations={[quotation]}
      relatedContracts={matchingContracts}
      relatedDeliveries={matchingDeliveries}
      relatedPayments={matchingPayments}
      focusTarget={flowFocusTarget}
      onCreateContract={() => navigate(`/contracts/new?fromQuotation=${quotation.id}`)}
      onCreatePayment={() => navigate(`/payments/new?fromQuotation=${quotation.id}`)}
      onCreateDelivery={matchingContracts[0] ? () => navigate(`/deliveries/new?fromContract=${matchingContracts[0].id}`) : undefined}
    />
  );

  // 3. NHẬT KÝ & HOẠT ĐỘNG PANEL (UnifiedActivityAuditNexus)
  const nexusPanel = (
    <UnifiedActivityAuditNexus
      entityId={quotation.id || ""}
      entityType="quotation"
      documentCode={quotation.soPhieuBaoGia}
      documentTypeLabel="phiếu báo giá"
      creatorOrOfficer={quotation.nguoiPhuTrach}
      statusLabel={(quotation as any).trangThaiBaoGia || quotation.tinhTrangBaoGia || 'Mới'}
      statusColor={(quotation as any).trangThaiBaoGia === 'Đã duyệt' ? 'text-emerald-700' : 'text-blue-700'}
      createdAt={(quotation as any).createdAt || quotation.ngayBaoGia}
      updatedAt={(quotation as any).updatedAt || (quotation as any).ngayCapNhat}
      customerName={customer?.tenKhachHang || quotation.tenKhachHang}
    />
  );

  // FOOTER ACTIONS
  const footerContent = (
    <QuotationDetailFooter
      quotation={quotation}
      isZnsLocked={isZnsLocked}
      onEdit={onEdit}
      handleDuplicate={handleDuplicate}
      handleSendZnsWithLock={handleSendZnsWithLock}
      onDelete={onDelete}
    />
  );

  return (
    <>
      <DetailDrawer
        isOpen={!!quotation}
        onClose={onClose}
        modal={modal}
        className={className}
        title={`${quotation?.soPhieuBaoGia || 'Báo giá'}`}
        subTitle={customer?.tenKhachHang || quotation?.tenKhachHang || ''}
        entityId={quotation?.id || ''}
        entityType="quotation"
        icon={<FileText size={16} />}
        size="studio" // Adaptive Studio layout (1400px) with 1-click Viewport Switcher
        horizonHud={horizonHud}
        tabs={customTabsList}
        footer={footerContent}
      >
        <div className="space-y-4">
          {activeTab === 'overview' && overviewPanel}
          {activeTab === 'revisions' && <QuotationRevisionsPanel 
              quotation={quotation} 
              onRestore={(rev) => onUpdate(quotation.id!, { 
                  products: rev.products as any,
                  subTotal: rev.subTotal || quotation.subTotal,
                  vatRate: rev.vatRate || quotation.vatRate,
                  vatAmount: rev.vatAmount || quotation.vatAmount,
                  discountRate: rev.discountRate || quotation.discountRate,
                  discountAmount: rev.discountAmount || quotation.discountAmount,
                  totalAmount: rev.totalAmount || quotation.totalAmount,
              })} 
              onCreateRevision={() => setIsSaveModalOpen(true)}
              onDeleteRevision={async (revId) => {
                  await onUpdate(quotation.id!, {
                      revisions: (quotation.revisions || []).filter(r => r.id !== revId)
                  });
                  notify.success('Đã xóa phiên bản');
              }}
              onDuplicateRevision={(rev) => {
                  const duplicated: Quotation = {
                      ...quotation,
                      id: undefined,
                      tinhTrangBaoGia: 'MỚI',
                      trangThaiGuiTinBaoGia: 'Chưa gửi',
                      soPhieuBaoGia: '',
                      customerId: '', // Clear so they can pick a new customer
                      tenKhachHang: '',
                      ngayBaoGia: new Date().toISOString().split('T')[0],
                      products: rev.products,
                      subTotal: rev.subTotal || quotation.subTotal,
                      vatRate: rev.vatRate || quotation.vatRate,
                      vatAmount: rev.vatAmount || quotation.vatAmount,
                      discountRate: rev.discountRate || quotation.discountRate,
                      discountAmount: rev.discountAmount || quotation.discountAmount,
                      totalAmount: rev.totalAmount || quotation.totalAmount,
                  };
                  onEdit(duplicated);
                  notify.info('Vui lòng chọn khách hàng mới cho báo giá này.');
              }}
          />}
          {activeTab === 'flow' && flowPanel}
          {activeTab === 'nexus' && nexusPanel}
        </div>
      </DetailDrawer>
      {isSaveModalOpen && (
        <QuotationSaveRevisionModal
           isOpen={isSaveModalOpen}
           onClose={() => setIsSaveModalOpen(false)}
           quotation={quotation}
           onSave={async (name, note) => {
              const revProducts = quotation.products || [];
               const { totalGross: subtotal, totalDiscount, totalVat, totalAfterTax: total } = aggregateProducts(revProducts);

               const newRev = {
                   id: crypto.randomUUID(),
                   name,
                   note,
                   createdAt: new Date().toISOString(),
                   createdBy: 'Hệ thống',
                   products: revProducts,
                   subTotal: subtotal,
                   discountRate: Number(quotation.discountRate) || 0,
                   discountAmount: totalDiscount,
                   vatRate: Number(quotation.vatRate) || 0,
                   vatAmount: totalVat,
                   totalAmount: total,
               };
              
              // Remove undefined values since Firestore does not support undefined values
              const cleanRev = Object.fromEntries(Object.entries(newRev).filter(([_, v]) => v !== undefined));

                 try {
                     await onUpdate(quotation.id!, {
                         revisions: [...(quotation.revisions || []), cleanRev as any]
                     });
                     setIsSaveModalOpen(false);
                     notify.success('Đã lưu phiên bản báo giá');
                 } catch (err: any) {
                     console.error("Save revision error:", err);
                     notify.error('Lỗi khi lưu phiên bản: ' + (err.message || 'Lỗi không xác định'));
                 }
              }}
           />
         )}
    </>
  );
}
