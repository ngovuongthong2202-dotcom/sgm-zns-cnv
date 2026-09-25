import React, { useState } from 'react';
import useSWR from 'swr';
import { swrColFetcher } from '@/src/data/swr-fetchers';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { Customer } from '@/src/domain/schema/customer.schema';
import { CustomerOverviewBento } from './CustomerOverviewBento';
import { CustomerActivityTimeline } from './CustomerActivityTimeline';
import { CustomerNotesPanel } from './CustomerNotesPanel';
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';
import { EntityZnsHistory } from '@/src/widgets/EntityZnsHistory';
import { EntityAuditLogs } from '@/src/widgets/EntityAuditLogs';
import { Button } from '@/src/design-system/Button';
import { ArrowLeft, ArrowRight, Trash2, Send, Edit, Printer } from 'lucide-react';
import { CustomerReportModal } from './CustomerReportModal';
import {
  QuotesTabContent,
  ContractsTabContent,
  PaymentsTabContent,
  DeliveriesTabContent,
} from './CustomerDetailTabsContent';

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: Customer;
  prevCustomer: Customer | null;
  nextCustomer: Customer | null;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onEdit: () => void;
  onSendZns: (customer: Customer) => void;
  onDeleteCustomer: (customer: Customer) => void;
  initialTab?: 'overview' | 'activity' | 'quotes' | 'contracts' | 'payments' | 'zns' | 'audit';
  modal?: boolean;
  className?: string;
}

export function CustomerDetailDrawer({
  isOpen,
  onClose,
  customer,
  prevCustomer,
  nextCustomer,
  onNavigatePrev,
  onNavigateNext,
  onEdit,
  onSendZns,
  onDeleteCustomer,
  initialTab,
  modal,
  className,
}: CustomerDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'quotes' | 'contracts' | 'payments' | 'deliveries' | 'zns' | 'audit'>('overview');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Reset tab to overview or initialTab when drawer opens for a new customer
  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'overview');
    }
  }, [isOpen, customer?.id, initialTab]);

  const customerId = customer?.id || '';

  // Keep tab content loaded by fetching sub-collections when drawer opens
  const { data: drawerQuotations = [], isLoading: qLoading } = useSWR<any[]>(
    isOpen && customerId
       ? `quotations:100:customerId:${customerId}`
       : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: drawerContracts = [], isLoading: cLoading } = useSWR<any[]>(
    isOpen && customerId
       ? `contracts:100:customerId:${customerId}`
       : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: drawerPayments = [], isLoading: pLoading } = useSWR<any[]>(
    isOpen && customerId
       ? `payments:100:customerId:${customerId}`
       : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: drawerDeliveries = [], isLoading: dLoading } = useSWR<any[]>(
    isOpen && customerId
       ? `deliveries:100:customerId:${customerId}`
       : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const [selectedQuotationId, setSelectedQuotationId] = React.useState<string | null>(null);

  // Set the default to the latest quotation when drawerQuotations changes
  React.useEffect(() => {
    if (drawerQuotations.length > 0) {
      const sorted = [...drawerQuotations].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.ngayCapNhat || 0).getTime();
        const timeB = new Date(b.createdAt || b.ngayCapNhat || 0).getTime();
        return timeB - timeA;
      });
      if (!selectedQuotationId || !drawerQuotations.some(q => q.id === selectedQuotationId)) {
        setSelectedQuotationId(sorted[0].id || null);
      }
    } else {
      setSelectedQuotationId(null);
    }
  }, [drawerQuotations, selectedQuotationId]);

  if (!customer) return null;

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      modal={modal}
      className={className}
      title={customer.tenKhachHang}
      subTitle={
        <div className="flex items-center gap-2 mt-1 select-none">
          <span className="font-mono bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded text-2xs font-bold border border-slate-200">
            {customer.maKh}
          </span>
          <span className="text-2xs font-medium text-slate-600">•</span>
          <span className="text-2xs font-medium text-slate-600">
             Người phụ trách: {customer.nguoiPhuTrach || '—'}
          </span>
        </div>
      }
      entityId={customerId}
      entityType="customer"
      size="screen"
      onNavigatePrev={prevCustomer ? onNavigatePrev : undefined}
      onNavigateNext={nextCustomer ? onNavigateNext : undefined}
      topRightControls={
        <div className="flex items-center gap-1 border-r border-slate-200 pr-2 mr-1 select-none">
          <Button
            aria-label="Khách hàng trước"
            onClick={(e) => {
              e.stopPropagation();
              onNavigatePrev();
            }}
            disabled={!prevCustomer}
            variant="ghost"
            className="w-8 h-8 flex justify-center items-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            title="Khách hàng trước (Mũi tên Trái)"
          >
            <ArrowLeft size={16} />
          </Button>
          <Button
            aria-label="Khách hàng tiếp"
            onClick={(e) => {
              e.stopPropagation();
              onNavigateNext();
            }}
            disabled={!nextCustomer}
            variant="ghost"
            className="w-8 h-8 flex justify-center items-center rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 transition-colors"
            title="Khách hàng tiếp (Mũi tên Phải)"
          >
            <ArrowRight size={16} />
          </Button>
          <Button
            aria-label="Xuất PDF Hồ Sơ"
            onClick={(e) => {
              e.stopPropagation();
              setIsReportOpen(true);
            }}
            variant="secondary"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold text-blue-700 bg-blue-50/80 border-blue-200 hover:bg-blue-100 flex items-center gap-1.5 ml-1"
            title="In / Xuất PDF Hồ Sơ Khách Hàng (3 trang chuẩn)"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Xuất PDF</span>
          </Button>
        </div>
      }
      footer={
        <div className="flex w-full select-none items-center justify-between">
          <div>
            {onDeleteCustomer && customer && (
              <Button
                aria-label="Xoá khách hàng"
                variant="danger"
                size="sm"
                className="h-9 font-bold"
                onClick={() => onDeleteCustomer(customer)}
                leftIcon={<Trash2 size={14} />}
              >
                Xóa
              </Button>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              aria-label="Xuất PDF Hồ sơ"
              variant="secondary"
              size="sm"
              onClick={() => setIsReportOpen(true)}
              className="h-9 font-bold border-blue-300 text-blue-700 bg-blue-50/50 hover:bg-blue-100 flex items-center gap-1.5"
              leftIcon={<Printer size={14} />}
            >
              Xuất PDF Hồ sơ
            </Button>
            <Button aria-label="Đóng" variant="secondary" size="sm" onClick={onClose} className="h-9 font-bold">
              Đóng
            </Button>

            {onSendZns && customer && (
              <Button
                aria-label="Gửi tin Zalo"
                variant="subtle"
                size="sm"
                onClick={() => onSendZns(customer)}
                className="h-9 font-bold"
                leftIcon={<Send size={12} />}
              >
                Gửi tin Zalo
              </Button>
            )}

            {onEdit && (
              <Button
                aria-label="Chỉnh sửa"
                variant="dark"
                size="sm"
                onClick={onEdit}
                className="h-9 font-bold"
                leftIcon={<Edit size={12} />}
              >
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>
      }
      tabs={
        <div className="flex items-center gap-6 border-b border-slate-100 pb-px -mb-[9px] select-none pl-1 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: 'overview', label: 'Tổng quan' },
              { id: 'activity', label: 'Hoạt động' },
              { id: 'quotes', label: 'Báo giá', count: drawerQuotations.length, loading: qLoading },
              { id: 'contracts', label: 'Hợp đồng', count: drawerContracts.length, loading: cLoading },
              { id: 'payments', label: 'Thanh toán', count: drawerPayments.length, loading: pLoading },
              { id: 'deliveries', label: 'Giao hàng', count: drawerDeliveries.length, loading: dLoading },
              { id: 'zns', label: 'ZNS' },
              { id: 'audit', label: 'Nhật ký' },
            ] as const
          ).map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 text-xs font-semibold relative outline-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 bg-transparent border-0 ${
                  isTabActive ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {'count' in tab && (
                  <span className={`text-3xs px-1.5 h-3.5 rounded-full ml-0.5 inline-flex items-center justify-center font-bold ${isTabActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                    {tab.loading ? '...' : tab.count}
                  </span>
                )}
                {isTabActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      }
    >
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="pt-2 flex flex-col gap-4">
            {drawerQuotations.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <h4 className="text-2xs uppercase font-black tracking-widest text-slate-500">
                      Tiến trình phiếu ({drawerQuotations.length} Báo Giá)
                    </h4>
                    <p className="text-2xs text-slate-500">Chọn báo giá dưới đây để xem tiến trình tương ứng</p>
                  </div>
                </div>

                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                  {[...drawerQuotations].sort((a, b) => {
                    const timeA = new Date(a.createdAt || a.ngayCapNhat || 0).getTime();
                    const timeB = new Date(b.createdAt || b.ngayCapNhat || 0).getTime();
                    return timeB - timeA;
                  }).map((quote, idx) => {
                    const isSelected = selectedQuotationId === quote.id;
                    const dateStr = quote.createdAt || quote.ngayCapNhat ? new Date(quote.createdAt || quote.ngayCapNhat).toLocaleDateString('vi-VN') : '';
                    return (
                      <button
                        key={quote.id}
                        type="button"
                        onClick={() => setSelectedQuotationId(quote.id || null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border text-left shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <div className="font-bold">{quote.soPhieuBaoGia || `Draft #${idx + 1}`}</div>
                        <div className={`text-2xs mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                          {quote.loai} {dateStr && `• ${dateStr}`}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const activeQuote = drawerQuotations.find(q => q.id === selectedQuotationId) || drawerQuotations[0];
                  if (!activeQuote) return null;
                  return (
                    <React.Fragment key={activeQuote.id}>
                      <WorkflowTimeline 
                        quotation={activeQuote} 
                        contracts={drawerContracts}
                        payments={drawerPayments}
                        deliveries={drawerDeliveries}
                      />
                    </React.Fragment>
                  );
                })()}
              </div>
            )}
            <CustomerOverviewBento
              customer={customer}
              onEdit={onEdit}
              quotationCount={drawerQuotations.length || 0}
              payments={drawerPayments}
              contracts={drawerContracts}
              quotations={drawerQuotations}
            />
          </div>
        )}

        {/* Dynamic Activity Feed Tab */}
        {activeTab === 'activity' && (
          <div className="bg-slate-50/50 rounded-xl p-4 md:p-6 shadow-sm border border-slate-100">
            <CustomerNotesPanel customerId={customerId} />
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-6">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-4">Lịch sử tương tác timeline</h3>
              <CustomerActivityTimeline customerId={customerId} />
            </div>
          </div>
        )}

        {/* Lazy Loaded Proposals Tab */}
        {activeTab === 'quotes' && (
          <QuotesTabContent loading={qLoading} quotations={drawerQuotations} />
        )}

        {/* Lazy Loaded Contracts Tab */}
        {activeTab === 'contracts' && (
          <ContractsTabContent loading={cLoading} contracts={drawerContracts} />
        )}

        {/* Lazy Loaded Payments Transaction Tab */}
        {activeTab === 'payments' && (
          <PaymentsTabContent loading={pLoading} payments={drawerPayments} />
        )}

        {/* Brand New Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <DeliveriesTabContent loading={dLoading} deliveries={drawerDeliveries} />
        )}

        {/* Lazy ZNS History Tab */}
        {activeTab === 'zns' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <EntityZnsHistory entityId={customerId} entityType="customer" />
          </div>
        )}

        {/* Lazy Audit System Tab */}
        {activeTab === 'audit' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
            <EntityAuditLogs entityId={customerId} entityType="customer" />
          </div>
        )}
      </div>

      <CustomerReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        customer={customer}
        quotations={drawerQuotations}
        contracts={drawerContracts}
        payments={drawerPayments}
        deliveries={drawerDeliveries}
      />
    </DetailDrawer>
  );
}
