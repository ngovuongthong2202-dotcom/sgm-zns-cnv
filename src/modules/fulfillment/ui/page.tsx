import { Button } from '@/src/design-system';
 
import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { can } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';

import { useDeliveries } from './hooks/useDeliveries';
 
import { Delivery } from '@/src/domain/schema/delivery.schema';
import useSWR, { preload } from 'swr';
import { swrDocFetcher } from '@/src/data/swr-fetchers';


import { DataViewEngine } from '@/src/design-system/dataview/DataViewEngine';
import { useDataView } from '@/src/design-system/dataview/useDataView';
import { getDeliveryColumns } from './columns.config';
import { useDeliveriesKpis } from './hooks/useDeliveriesKpis';
import { useDeliveriesFilters } from './hooks/useDeliveriesFilters';
import { useDeliveriesActions } from './hooks/useDeliveriesActions';
import { DeliveryFormModal } from './components/DeliveryFormModal';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { useConfirm } from '@/src/design-system/Confirm';
import { DeliveryDetailDrawer } from './components/DeliveryDetailDrawer';
import { extractDeliveryTinhThanhList } from './utils/extractors';
import { enrichWithStt } from '@/src/shared/utils/enrichWithStt';
import { DeliveryFilterBar } from './components/DeliveryFilterBar';

import { DeliveryKPIs } from './components/DeliveryKPIs';
import { CollapsibleStatsBanner } from '@/src/platform/ui/design-system/stats/CollapsibleStatsBanner';
import { BlockingDocumentsModal } from '@/src/widgets/BlockingDocumentsModal';
import { CompleteDeliveryModal } from './components/CompleteDeliveryModal';
import { DeliveryConfirmationModal } from './components/DeliveryConfirmationModal';
import { RecordShipmentModal } from './components/RecordShipmentModal';
import { migrateLegacyDeliveriesToUnifiedLedger, reconcileDeliveryShipments } from './utils/delivery-reconciler';
import { DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { notify } from '@/src/shared/utils/notify';
import { CheckCircle2 } from 'lucide-react';
const DeliveryDrawerRouteListener = React.memo(function DeliveryDrawerRouteListener({
  hasDrawer,
  onOpenDrawer,
}: {
  hasDrawer: boolean;
  onOpenDrawer: (delivery: any) => void;
}) {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/deliveries') && location.state?.openDrawer && !hasDrawer) {
      onOpenDrawer(location.state.openDrawer);
      window.history.replaceState({}, document.title);
    }
  }, [location.pathname, location.state, hasDrawer, onOpenDrawer]);
  return null;
});

const EMPTY_PROCESSED_DELIVERIES: any[] = [];

export default function DeliveriesFeature() {
  const { userData } = useAuth();
  const location = useLocation();
  const { deliveries, payments, customers, quotations, contracts, loading, loadMore, createDelivery, updateDelivery, deleteDelivery, updateContract, updateQuotation } = useDeliveries({ loadRelated: true });
  const { nguoiPhuTrachList } = useSharedFields();
  const { confirm } = useConfirm();

  // View mode selection
  const [viewMode, setViewMode] = useState<'table'>('table');

  const [editingDelivery, setEditingDelivery] = useState<Delivery | null>(null);
  const [recordingShipmentDelivery, setRecordingShipmentDelivery] = useState<Delivery | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [drawerDelivery, setDrawerDelivery] = useState<Delivery | null>(null);

  // Tự động mở Modal lập phiếu giao hàng khi điều hướng từ Phiếu thu (Payment) hoặc Báo giá (Quotation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    // Ưu tiên đón từ Hợp đồng (fromContract / contractId)
    const fromContract = params.get('fromContract') || params.get('contractId') || (location.state as any)?.createFromContract;
    const targetContractId = typeof fromContract === 'string' ? fromContract : fromContract?.id || fromContract?.contractId;
    if (targetContractId && !isFormOpen) {
      const fromPaymentParam = params.get('fromPayment') || params.get('paymentId');
      setEditingDelivery({ 
        contractId: targetContractId,
        paymentId: fromPaymentParam || undefined
      } as any);
      setIsFormOpen(true);
      window.history.replaceState({}, document.title, location.pathname);
      return;
    }

    const fromPayment = params.get('fromPayment') || params.get('paymentId') || (location.state as any)?.createFromPayment;
    const targetPaymentId = typeof fromPayment === 'string' ? fromPayment : fromPayment?.id || fromPayment?.paymentId;
    if (targetPaymentId && !isFormOpen) {
      setEditingDelivery({ paymentId: targetPaymentId } as any);
      setIsFormOpen(true);
      window.history.replaceState({}, document.title, location.pathname);
      return;
    }

    const fromQuotation = params.get('fromQuotation') || params.get('quotationId') || (location.state as any)?.createFromQuotation;
    const targetQuotationId = typeof fromQuotation === 'string' ? fromQuotation : fromQuotation?.id || fromQuotation?.quotationId;
    if (targetQuotationId && !isFormOpen) {
      setEditingDelivery({ quotationId: targetQuotationId } as any);
      setIsFormOpen(true);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location, isFormOpen]);
  
  const customerTinhThanhMap = useMemo(() => {
    const map = new Map<string, string>();
    customers.forEach(c => {
      if (c.id && c.tinhThanh) map.set(c.id, c.tinhThanh);
    });
    return map;
  }, [customers]);

  const unifiedDeliveries = useMemo(() => {
    return migrateLegacyDeliveriesToUnifiedLedger(deliveries);
  }, [deliveries]);

  const activeTab: string = 'all';
  const {
    selectedStatus, setSelectedStatus,
    selectedSchedule, setSelectedSchedule,
    selectedNguoiGiao, setSelectedNguoiGiao,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedZns, setSelectedZns,
    selectedNgayDuKien, setSelectedNgayDuKien,
    selectedNgayThucTe, setSelectedNgayThucTe,
    filteredDeliveries
  } = useDeliveriesFilters(unifiedDeliveries, activeTab, customerTinhThanhMap);

  const { 
    handleDeleteDelivery, handleMarkDelivered, onCompleteDeliverySubmit, 
    handleSendZns, handleCancelDelivery, handleSaveDelivery,
    handleRevertDeliveryConfirmation,
    handleViewDeliveryConfirmation,
    viewingConfirmationDelivery, setViewingConfirmationDelivery,
    completingDelivery, setCompletingDelivery,
    blockingModalState, closeBlockingModal
  } = useDeliveriesActions(
    createDelivery as any, deleteDelivery, updateDelivery, updateContract as any, updateQuotation as any, 
    confirm, setDrawerDelivery, drawerDelivery, editingDelivery, setEditingDelivery, setIsFormOpen,
    userData?.role
  );

  const handleRecordShipment = async (masterDelivery: Delivery, newShipment: DeliveryShipment, shouldSendZns: boolean) => {
    const existingShipments = Array.isArray(masterDelivery.cacDotGiao) ? masterDelivery.cacDotGiao : [];
    const updatedShipments = [...existingShipments, newShipment];

    const totalBaseline = (masterDelivery.products || []).reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const totalShipped = updatedShipments.reduce((sum, s) => {
      return sum + (s.products || []).reduce((ssum, sp) => ssum + (Number(sp.quantity) || 0), 0);
    }, 0);
    const pct = totalBaseline > 0 ? Math.min(100, Math.round((totalShipped / totalBaseline) * 100)) : 100;
    const isPhysicalConfirmed = Boolean(newShipment.ngayGiaoThucTe) || Boolean(masterDelivery.ngayGiaoThucTe);
    const isDone = (pct >= 100 || newShipment.isDotCuoiCung) && isPhysicalConfirmed;

    const updatedMaster: Delivery = {
      ...masterDelivery,
      cacDotGiao: updatedShipments,
      slMay: totalShipped,
      soPhieuXuat: newShipment.soPhieuXuat,
      ngayGiaoMay: newShipment.ngayGiaoMay,
      thoGiaoMay: newShipment.thoGiaoMay || masterDelivery.thoGiaoMay,
      sdtThoGiaoMay: newShipment.sdtThoGiaoMay || masterDelivery.sdtThoGiaoMay,
      donViVanChuyen: newShipment.donViVanChuyen || masterDelivery.donViVanChuyen,
      khoXuat: newShipment.khoXuat || masterDelivery.khoXuat,
      tienDoLuyKe: pct,
      tinhTrangGiaoHang: isDone ? 'HOAN_TAT' : (pct > 0 ? 'DANG_GIAO' : 'CHO_GIAO'),
    };

    await updateDelivery(updatedMaster.id || updatedMaster.deliveryId, updatedMaster);
    notify.success(`Đã ghi nhận Đợt ${newShipment.dotGiaoHang} (${newShipment.soPhieuXuat}) thành công!`);

    if (shouldSendZns) {
      try {
        const shipmentContext = {
          ...updatedMaster,
          soPhieuXuat: newShipment.soPhieuXuat,
          ngayGiaoMay: newShipment.ngayGiaoMay,
          slMay: newShipment.slMay,
          dvt: newShipment.dvt,
          products: newShipment.products,
          danhSachMaMay: newShipment.danhSachMaMay,
          thoGiaoMay: newShipment.thoGiaoMay,
          sdtThoGiaoMay: newShipment.sdtThoGiaoMay,
        };
        await handleSendZns(shipmentContext as any, 'GIAOHANG_ZNS');
      } catch (err) {
        console.error('Failed to send ZNS for shipment:', err);
      }
    }
  };

  const handlePrefetchDelivery = (delivery: Delivery) => {
    if (!delivery) return;
    if (delivery.customerId) {
      preload(`customers:${delivery.customerId}`, swrDocFetcher).catch(() => {});
    }
    if (delivery.contractId) {
      preload(`contracts:${delivery.contractId}`, swrDocFetcher).catch(() => {});
    }
    if (delivery.quotationId) {
      preload(`quotations:${delivery.quotationId}`, swrDocFetcher).catch(() => {});
    }
  };

  // Dynamic SWR queries when Delivery details/form is open

  const { data: drawerContract = null } = useSWR<any | null>(
    drawerDelivery?.contractId ? `contracts:${drawerDelivery.contractId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const quotationId = drawerDelivery?.quotationId || drawerContract?.quotationId;
  const { data: drawerQuotation = null } = useSWR<any | null>(
    quotationId ? `quotations:${quotationId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );


  const columns = useMemo(() => getDeliveryColumns(), []);

  const handleResetAllFilters = () => {
    setSelectedStatus('');
    setSelectedSchedule('');
    setSelectedNguoiGiao('');
    setSelectedZns('');
    setSelectedTinhThanh('');
    setSelectedNgayDuKien(['', '']);
    setSelectedNgayThucTe(['', '']);
    setGlobalFilter('');
    setColumnFilters([]);
  };

  const tinhThanhOptions = useMemo(() => extractDeliveryTinhThanhList(customers), [customers]);

  const entityFilters = (
    <DeliveryFilterBar
      nguoiGiaoList={nguoiPhuTrachList}
      tinhThanhList={tinhThanhOptions}
      selectedStatus={selectedStatus}
      setSelectedStatus={setSelectedStatus}
      selectedSchedule={selectedSchedule}
      setSelectedSchedule={setSelectedSchedule}
      selectedNguoiGiao={selectedNguoiGiao}
      setSelectedNguoiGiao={setSelectedNguoiGiao}
      selectedTinhThanh={selectedTinhThanh}
      setSelectedTinhThanh={setSelectedTinhThanh}
      selectedZns={selectedZns}
      setSelectedZns={setSelectedZns}
      selectedNgayDuKien={selectedNgayDuKien}
      setSelectedNgayDuKien={setSelectedNgayDuKien}
      selectedNgayThucTe={selectedNgayThucTe}
      setSelectedNgayThucTe={setSelectedNgayThucTe}
    />
  );

  // Evaluate multi-dimensional filters
  const processedDeliveries = useMemo(() => {
    if (!filteredDeliveries || filteredDeliveries.length === 0) return EMPTY_PROCESSED_DELIVERIES;
    return filteredDeliveries.map((d) => {
      const cust = customers.length > 0 ? customers.find((c) => c.id === d.customerId || (c.maKh && c.maKh === d.customerId)) : undefined;
      const contract = contracts.length > 0 ? contracts.find((c) => (d.contractId && c.id === d.contractId) || (d.soHopDong && c.soHopDong === d.soHopDong)) : undefined;
      const payment = payments.length > 0 ? payments.find((p) => (d.paymentId && (p.id === d.paymentId || p.paymentId === d.paymentId))) : undefined;
      const resolvedQuotationId = d.quotationId || contract?.quotationId;
      const resolvedSoBaoGia = (d as any).soPhieuBaoGia || (d as any).soBaoGia || contract?.soPhieuBaoGia || (contract as any)?.soBaoGia;
      
      const quot = quotations.length > 0 ? quotations.find((q) => 
        (resolvedQuotationId && q.id === resolvedQuotationId) ||
        (resolvedSoBaoGia && (q.soPhieuBaoGia === resolvedSoBaoGia || (q as any).soBaoGia === resolvedSoBaoGia || q.id === resolvedSoBaoGia))
      ) : undefined;

      const finalSoPhieuBaoGia = quot?.soPhieuBaoGia || (quot as any)?.soBaoGia || resolvedSoBaoGia || (d as any).soPhieuBaoGia;
      const finalNgayBaoGia = quot?.ngayBaoGia || (d as any).ngayBaoGia;
      const finalTinhTrangThanhToan = payment?.tinhTrangThanhToan || d.tinhTrangThanhToan || '';

      return {
        ...d,
        __customerInfo: cust,
        __contractInfo: contract,
        __paymentInfo: payment,
        __quotationInfo: quot ? {
          ...quot,
          soPhieuBaoGia: finalSoPhieuBaoGia,
          ngayBaoGia: finalNgayBaoGia
        } : (finalSoPhieuBaoGia ? { soPhieuBaoGia: finalSoPhieuBaoGia, ngayBaoGia: finalNgayBaoGia } : undefined),
        soPhieuBaoGia: finalSoPhieuBaoGia,
        ngayBaoGia: finalNgayBaoGia,
        quotationId: resolvedQuotationId || quot?.id || d.quotationId,
        tinhTrangThanhToan: finalTinhTrangThanhToan
      };
    });
  }, [filteredDeliveries, customers, quotations, contracts, payments]);

  const processedDeliveriesWithStt = useMemo(() => enrichWithStt(processedDeliveries), [processedDeliveries]);

  const dataView = useDataView({
    viewId: 'deliveries_list',
    columns,
    data: processedDeliveriesWithStt,
    initialState: {
      grouping: [],
      sorting: [{ id: 'stt', desc: true }],
      columnVisibility: { nguoiPhuTrach: false, "Khách hàng / Liên hệ": true, soBGHdDh: true, ngayGiaoMayMonth: false, ngayLapPgh: true },
    },
    onRowSelect: (row) => setDrawerDelivery(row as Delivery),
    onNew: () => setIsFormOpen(true),
    meta: {
      onEdit: (row: Delivery) => { setEditingDelivery(row); setIsFormOpen(true); },
      onSendZns: handleSendZns,
      onMarkDelivered: handleMarkDelivered,
    }
  });

  const { setGlobalFilter, setColumnFilters } = dataView;

  // Compute KPIs
  const kpis = useDeliveriesKpis(deliveries, customers);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n') { e.preventDefault(); setIsFormOpen(true); }
      if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('input[type="search"]')?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const hasActiveDomainFilters = !!(
    selectedStatus ||
    selectedSchedule ||
    selectedNguoiGiao ||
    selectedTinhThanh ||
    selectedZns ||
    selectedNgayDuKien[0] ||
    selectedNgayDuKien[1] ||
    selectedNgayThucTe[0] ||
    selectedNgayThucTe[1]
  );

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden">
      <div className="px-6 pt-3 shrink-0">
        <CollapsibleStatsBanner
          storageKey="sgm_stats_pinned_fulfillment"
          title="Chỉ số & Tiến độ Giao hàng"
          summaryBadge={`${deliveries.length} phiếu`}
        >
          <DeliveryKPIs
            kpis={kpis}
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            selectedSchedule={selectedSchedule}
            setSelectedSchedule={setSelectedSchedule}
          />
        </CollapsibleStatsBanner>
      </div>
      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
        <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 mt-0 rounded-xl flex flex-col relative min-h-0">
          <DataViewEngine
            onCreateNew={() => { setEditingDelivery(null); setIsFormOpen(true); }}
            createNewLabel="Giao hàng mới"
            canCreate={can('create', 'delivery', userData?.role)}
            dataView={dataView}
            columns={columns}
            hasActiveDomainFilters={hasActiveDomainFilters}
            entityFilters={entityFilters}
            onResetAllFilters={handleResetAllFilters}
            searchTemplate="Tìm theo mã vận đơn, khách hàng, số ĐH..."
            availableViews={[
              { value: 'table', label: 'Bảng', icon: 'Table' },
            ]}
            groupByOptions={[
              { id: 'customerId', label: 'Khách hàng' },
              { id: 'donViVanChuyen', label: 'Đơn vị vận chuyển' },
            ]}
            onRowSelect={(row) => setDrawerDelivery(row as Delivery)}
            onRowDoubleClick={(row) => { 
                if (can('update', 'delivery', userData?.role)) {
                    setEditingDelivery(row as Delivery); setIsFormOpen(true); 
                } else {
                    setDrawerDelivery(row as Delivery);
                }
            }}
            onRowHover={(row) => handlePrefetchDelivery(row as Delivery)}
            onRowEdit={can('update', 'delivery', userData?.role) ? (row) => { setEditingDelivery(row as Delivery); setIsFormOpen(true); } : undefined}
            onRowZns={can('send_zns', 'delivery', userData?.role) ? (row) => handleSendZns(row as Delivery, 'GIAOHANG_ZNS') : undefined}
            onRowDelete={can('delete', 'delivery', userData?.role) ? handleDeleteDelivery : undefined}
            customRowActions={(row) => {
              const delivery = row as Delivery;
              const isCompleted = !!delivery.ngayGiaoThucTe;
              const recon = reconcileDeliveryShipments(delivery);
              const canAddShipment = !recon.isFullyDelivered && can('update', 'delivery', userData?.role);

              return (
                <div className="flex items-center gap-1">
                  {canAddShipment && (
                    <Button
                      type="button"
                      title="Ghi nhận đợt xuất kho mới"
                      onClick={(e) => { e.stopPropagation(); setRecordingShipmentDelivery(delivery); }}
                      className="px-2 py-0.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md border border-blue-200 bg-white cursor-pointer flex items-center gap-1 font-bold text-3xs transition-colors shadow-2xs whitespace-nowrap"
                    >
                      + Đợt {recon.nextDotGiaoHang}
                    </Button>
                  )}
                  {isCompleted ? (
                    <Button
                      type="button"
                      title="Xem / Hủy xác nhận giao hàng"
                      onClick={(e) => { e.stopPropagation(); handleViewDeliveryConfirmation(delivery); }}
                      className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                    >
                      <CheckCircle2 size={15} />
                    </Button>
                  ) : can('update', 'delivery', userData?.role) ? (
                    <Button
                      type="button"
                      title="Xác nhận hoàn tất giao hàng"
                      onClick={(e) => { e.stopPropagation(); handleMarkDelivered(delivery); }}
                      className="p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-100 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </Button>
                  ) : null}
                </div>
              );
            }}
            fetchMore={loadMore}
            isFetching={loading}
            error={null}
            onRetry={loadMore}
          />
        </div>
      </div>

      <DeliveryDetailDrawer 
        drawerDelivery={drawerDelivery}
        onClose={() => setDrawerDelivery(null)}
        onEdit={(del) => { setEditingDelivery(del); setIsFormOpen(true); }}
        onMarkDelivered={can('update', 'delivery', userData?.role) ? handleMarkDelivered : undefined}
        onRevertDelivered={can('update', 'delivery', userData?.role) ? handleRevertDeliveryConfirmation : undefined}
        onViewConfirmation={handleViewDeliveryConfirmation}
        onSendZns={handleSendZns}
        onCancelDelivery={handleCancelDelivery}
        onOpenRecordShipment={(del) => setRecordingShipmentDelivery(del)}
        drawerContract={drawerContract}
        drawerQuotation={drawerQuotation}
        completingDelivery={completingDelivery}
        setCompletingDelivery={setCompletingDelivery}
        onCompleteDeliverySubmit={onCompleteDeliverySubmit}
      />

      {recordingShipmentDelivery && (
        <RecordShipmentModal
          isOpen={Boolean(recordingShipmentDelivery)}
          delivery={recordingShipmentDelivery}
          allPayments={payments}
          onClose={() => setRecordingShipmentDelivery(null)}
          onSave={async (newShipment, shouldSendZns) => {
            await handleRecordShipment(recordingShipmentDelivery, newShipment, shouldSendZns);
          }}
        />
      )}

      {isFormOpen && (
        <DeliveryFormModal 
          key={editingDelivery?.id || 'new'}
          delivery={editingDelivery} 
          payments={payments} 
          contracts={contracts} 
          quotations={quotations} 
          customers={customers}
          deliveries={deliveries} 
          nguoiPhuTrachList={nguoiPhuTrachList}
          onClose={() => { setIsFormOpen(false); setEditingDelivery(null); }} 
          onSave={handleSaveDelivery} 
        />
      )}

      {completingDelivery && (
        <CompleteDeliveryModal
          delivery={completingDelivery}
          onClose={() => setCompletingDelivery(null)}
          onSave={onCompleteDeliverySubmit}
        />
      )}

      {viewingConfirmationDelivery && (
        <DeliveryConfirmationModal
          delivery={viewingConfirmationDelivery}
          onClose={() => setViewingConfirmationDelivery(null)}
          onRevertConfirmation={handleRevertDeliveryConfirmation}
          canRevert={can('update', 'delivery', userData?.role)}
        />
      )}

      <BlockingDocumentsModal
        isOpen={blockingModalState.isOpen}
        onClose={closeBlockingModal}
        title={blockingModalState.title}
        entityName={blockingModalState.entityName}
        reason={blockingModalState.reason}
        blockingDocuments={blockingModalState.blockingDocuments}
        detailedBlocks={blockingModalState.detailedBlocks}
      />
    </div>
  );
}
