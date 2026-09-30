import React, { useState } from 'react';
import useSWR from 'swr';
import { swrColFetcher } from '@/src/data/swr-fetchers';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { Customer } from '@/src/domain/schema/customer.schema';
import { CustomerOverviewBento } from './CustomerOverviewBento';
import { HorizonFlowHUD } from '@/src/widgets/HorizonFlowHUD';
import { reconcileEnterpriseReceivables } from '@/src/domain/services/financial-reconciler';
import { UnifiedActivityAuditNexus } from '@/src/widgets/UnifiedActivityAuditNexus';
import { Button } from '@/src/design-system/Button';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { ArrowLeft, ArrowRight, Trash2, Send, Edit, Printer, RefreshCw } from 'lucide-react';
import { CustomerReportModal } from './CustomerReportModal';
import { CustomerOmniFlowStream } from './CustomerOmniFlowStream';
import { repositoryFactory } from '@/src/data/repositories';
import { clearSwrColCache } from '@/src/data/swr-fetchers';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { notify } from '@/src/shared/utils/notify';

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
  initialTab?: 'overview' | 'flow' | 'nexus';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'flow' | 'nexus'>('overview');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleForceResync = async () => {
    if (!customer) return;
    setIsSyncing(true);
    try {
      const targetKeys = [customer.id, customer.maKh].filter(Boolean) as string[];
      let syncedCount = 0;

      const [matchedQuotes, matchedContracts, matchedPayments, matchedDeliveries] = await Promise.all([
        repositoryFactory.get<any>('quotations').list({ fkField: 'customerId', fkId: targetKeys, limit: 200 }),
        repositoryFactory.get<any>('contracts').list({ fkField: 'customerId', fkId: targetKeys, limit: 200 }),
        repositoryFactory.get<any>('payments').list({ fkField: 'customerId', fkId: targetKeys, limit: 200 }),
        repositoryFactory.get<any>('deliveries').list({ fkField: 'customerId', fkId: targetKeys, limit: 200 }),
      ]);

      const quoteRepo = repositoryFactory.get<any>('quotations');
      for (const q of matchedQuotes) {
        if (q.id) {
          await quoteRepo.update(q.id, {
            tenKhachHang: customer.tenKhachHang,
            sdt: customer.sdt,
            diaChi: customer.diaChi,
            nguoiDaiDien: customer.nguoiDaiDien || customer.contacts?.[0]?.nguoiDaiDien,
            tinhThanh: customer.tinhThanh,
            maSoThue: customer.maSoThue,
            phanLoaiKhach: customer.loaiKh
          });
          syncedCount++;
        }
      }

      const contractRepo = repositoryFactory.get<any>('contracts');
      for (const c of matchedContracts) {
        if (c.id) {
          await contractRepo.update(c.id, {
            tenKhachHang: customer.tenKhachHang,
            sdt: customer.sdt,
            diaChi: customer.diaChi,
            nguoiDaiDien: customer.nguoiDaiDien || customer.contacts?.[0]?.nguoiDaiDien,
            tinhThanh: customer.tinhThanh
          });
          syncedCount++;
        }
      }

      const paymentRepo = repositoryFactory.get<any>('payments');
      for (const p of matchedPayments) {
        if (p.id) {
          await paymentRepo.update(p.id, {
            tenKhachHang: customer.tenKhachHang,
            sdt: customer.sdt,
            tenNguoiNop: customer.nguoiDaiDien || customer.tenKhachHang,
            tinhThanh: customer.tinhThanh
          });
          syncedCount++;
        }
      }

      const deliveryRepo = repositoryFactory.get<any>('deliveries');
      for (const d of matchedDeliveries) {
        if (d.id) {
          await deliveryRepo.update(d.id, {
            tenKhachHang: customer.tenKhachHang,
            sdt: customer.sdt,
            diaChiGiaoHang: customer.diaChi || d.diaChiGiaoHang,
            nguoiDaiDien: customer.nguoiDaiDien || customer.contacts?.[0]?.nguoiDaiDien,
            nguoiLienHe: customer.contacts?.[0]?.nguoiDaiDien || customer.nguoiDaiDien || d.nguoiLienHe,
            sdtLienHe: customer.contacts?.[0]?.sdt || customer.sdt || d.sdtLienHe,
            tinhThanh: customer.tinhThanh
          });
          syncedCount++;
        }
      }

      clearSwrColCache('quotations');
      clearSwrColCache('contracts');
      clearSwrColCache('payments');
      clearSwrColCache('deliveries');
      clearSwrColCache('customers');
      crossTabSync.broadcast({ type: 'ENTITY_MUTATED', collectionName: 'customers', id: customer.id });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'quotations' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'contracts' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'payments' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'deliveries' });

      notify.success(`Đã đồng bộ lại thông tin sang ${syncedCount} chứng từ liên quan!`);
    } catch (error) {
      notify.error('Lỗi khi đồng bộ chứng từ: ' + (error as any)?.message);
    } finally {
      setIsSyncing(false);
    }
  };

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

  const latestQuote = React.useMemo(() => {
    if (!drawerQuotations || drawerQuotations.length === 0) return undefined;
    return [...drawerQuotations].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.ngayCapNhat || 0).getTime();
      const timeB = new Date(b.createdAt || b.ngayCapNhat || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [drawerQuotations]);

  const latestContract = React.useMemo(() => {
    if (!drawerContracts || drawerContracts.length === 0) return undefined;
    return [...drawerContracts].sort((a, b) => {
      const timeA = new Date(a.createdAt || a.ngayCapNhat || a.ngayKy || 0).getTime();
      const timeB = new Date(b.createdAt || b.ngayCapNhat || b.ngayKy || 0).getTime();
      return timeB - timeA;
    })[0];
  }, [drawerContracts]);

  // Compute realtime financial summary for Horizon HUD
  const { ltv, debt } = React.useMemo(() => {
    if (!customer) return { ltv: 0, debt: 0 };
    const reconciled = reconcileEnterpriseReceivables(drawerPayments, drawerContracts, drawerQuotations);
    return {
      ltv: customer.ltv || reconciled.totalPaid || 0,
      debt: (customer.totalDebt !== undefined && customer.totalDebt > 0) ? customer.totalDebt : reconciled.totalDebt,
    };
  }, [customer, drawerPayments, drawerContracts, drawerQuotations]);

  if (!customer) return null;

  // Horizon HUD (Top Status Pulse + HorizonFlowHUD)
  const horizonHud = (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="font-mono font-black text-blue-900 bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
            {customer.maKh || 'KH-NA'}
          </span>
          <span className="text-3xs bg-blue-50 text-blue-750 font-extrabold px-2 py-0.5 rounded border border-blue-100 uppercase tracking-wider">
            {customer.loaiKh || 'CHƯA PHÂN LOẠI'}
          </span>
          {customer.isArchived && (
            <span className="text-3xs bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded border border-slate-200 uppercase">
              ĐÃ LƯU TRỮ
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-3xs text-slate-500 uppercase font-bold">LTV Tích lũy:</span>
            <span className="font-mono font-black text-emerald-800">
              {formatCurrency(ltv)}
            </span>
          </div>
          <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="text-3xs text-slate-500 uppercase font-bold">Công nợ:</span>
            <span className={`font-mono font-bold ${debt > 0 ? 'text-red-700' : 'text-emerald-800'}`}>
              {debt > 0 ? formatCurrency(debt) : '0 ₫ (Không nợ)'}
            </span>
          </div>
        </div>
      </div>
      {(drawerQuotations.length > 0 || drawerContracts.length > 0) && (
        <div className="pt-2 border-t border-slate-100">
          <HorizonFlowHUD
            currentType="customer"
            quotation={latestQuote}
            contract={latestContract}
            deliveries={drawerDeliveries}
            payments={drawerPayments}
            onOpenFlow={() => setActiveTab('flow')}
          />
        </div>
      )}
    </div>
  );

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
      size="studio"
      horizonHud={horizonHud}
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
            {customer && (
              <Button
                aria-label="Đồng bộ lại chứng từ"
                variant="secondary"
                size="sm"
                onClick={handleForceResync}
                disabled={isSyncing}
                className="h-9 font-bold border-slate-200 text-slate-700 bg-white hover:bg-slate-50 flex items-center gap-1.5"
                leftIcon={<RefreshCw size={14} className={isSyncing ? "animate-spin text-blue-600" : "text-slate-500"} />}
              >
                {isSyncing ? "Đang đồng bộ..." : "Đồng bộ chứng từ"}
              </Button>
            )}
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
              { id: 'flow', label: 'Dòng chảy 360°', count: Math.max(drawerQuotations.length, drawerContracts.length) || (drawerPayments.length > 0 ? 1 : (drawerDeliveries.length > 0 ? 1 : 0)), loading: qLoading || cLoading || pLoading || dLoading },
              { id: 'nexus', label: 'Nhật ký & Hoạt động' },
            ] as const
          ).map((tab) => {
            const isTabActive = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 text-xs font-semibold relative outline-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 bg-transparent border-0 ${
                  isTabActive ? 'text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
                {'count' in tab && (
                  <span className={`text-3xs px-1.5 h-3.5 rounded-full ml-0.5 inline-flex items-center justify-center font-bold ${isTabActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-150 text-slate-700'}`}>
                    {tab.loading ? '...' : tab.count}
                  </span>
                )}
                {isTabActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-700 rounded-t-full" />
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

        {/* Customer 360 Omni-Flow Stream Tab */}
        {activeTab === 'flow' && (
          <div className="pt-2">
            <CustomerOmniFlowStream
              quotations={drawerQuotations}
              contracts={drawerContracts}
              payments={drawerPayments}
              deliveries={drawerDeliveries}
            />
          </div>
        )}

        {/* Unified Activity Audit Nexus Tab */}
        {activeTab === 'nexus' && (
          <UnifiedActivityAuditNexus
            entityId={customerId}
            entityType="customer"
            documentCode={customer?.maKh}
            documentTypeLabel="hồ sơ khách hàng"
            creatorOrOfficer={customer?.nguoiPhuTrach}
            statusLabel={customer?.loaiKh || 'Doanh nghiệp'}
            statusColor="text-emerald-700"
            createdAt={(customer as any)?.createdAt}
            updatedAt={(customer as any)?.updatedAt}
            customerName={customer?.tenKhachHang}
          />
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
