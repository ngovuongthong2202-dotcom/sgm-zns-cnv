// @ts-nocheck
import React, { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { notify } from '@/src/shared/utils/notify';
import { useQuotations } from './hooks/useQuotations';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { PageHeader } from '@/src/design-system/PageHeader';
import { DataViewEngine } from '@/src/design-system/dataview/DataViewEngine';
import { useDataView } from '@/src/design-system/dataview/useDataView';
import { getQuotationColumns } from './columns.config';
import { useQuotationsFilters } from './hooks/useQuotationsFilters';
import { useQuotationMigration } from './hooks/useQuotationMigration';
import { lazy, Suspense } from 'react';
import { QuotationDetailDrawer } from './components/QuotationDetailDrawer';
import { QuotationStats } from './components/QuotationStats';
import { extractCustomerTinhThanhMap, extractTinhThanhList, enhanceQuotationsWithProvince } from './utils/extractors';
import { enrichWithStt } from '@/src/shared/utils/enrichWithStt';
import { QuotationFilterBar } from './components/QuotationFilterBar';


const QuotationFormModal = lazy(() => import('./components/QuotationFormModal').then(m => ({ default: m.QuotationFormModal })));
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { useConfirm } from '@/src/design-system/Confirm';
import { useQuotationActions, validateQuotationUpdate } from './hooks/useQuotationActions';
import { BlockingDocumentsModal } from '@/src/widgets/BlockingDocumentsModal';

import { PageSkeleton } from '@/src/design-system/skeletons/PageSkeleton';
import { ModalSkeleton } from '@/src/design-system/skeletons/ModalSkeleton';

import { useAuth } from '@/src/modules/iam';
import { can } from '@/src/modules/iam';

const QuotationDrawerRouteListener = React.memo(function QuotationDrawerRouteListener({
  hasDrawer,
  onOpenDrawer,
}: {
  hasDrawer: boolean;
  onOpenDrawer: (quotation: any) => void;
}) {
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.startsWith('/quotations') && location.state?.openDrawer && !hasDrawer) {
      onOpenDrawer(location.state.openDrawer);
      window.history.replaceState({}, document.title);
    }
  }, [location.pathname, location.state, hasDrawer, onOpenDrawer]);
  return null;
});

export default function QuotationsFeature() {
  const { userData } = useAuth();
  const { quotations, loading, loadMore, createQuotation, updateQuotation, deleteQuotation } = useQuotations();
  
  const { nguoiPhuTrachList, loaiBaoGiaList, loaiKhachHangList } = useSharedFields();
  const { confirm } = useConfirm();
  
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [drawerQuotation, setDrawerQuotation] = useState<Quotation | null>(null);

  useQuotationMigration(quotations, updateQuotation);

  const { data: allContracts = [] } = useRealtimeCollection<Contract>('contracts');
  const { data: allPayments = [] } = useRealtimeCollection<any>('payments');
  const { data: allDeliveries = [] } = useRealtimeCollection<any>('deliveries');
  const { data: allCustomers = [] } = useRealtimeCollection<Customer>('customers');

  // Derive related drawer documents directly from in-memory Data Mesh (0ms latency, 0 database reads)
  const drawerCustomer = useMemo(() => {
    if (!drawerQuotation?.customerId) return null;
    return allCustomers.find((c) => c.id === drawerQuotation.customerId) || null;
  }, [allCustomers, drawerQuotation?.customerId]);

  const drawerContracts = useMemo(() => {
    if (!drawerQuotation?.id) return [];
    return allContracts.filter((c) => c.quotationId === drawerQuotation.id);
  }, [allContracts, drawerQuotation?.id]);

  const drawerPayments = useMemo(() => {
    if (!drawerQuotation?.id) return [];
    return allPayments.filter((p) => p.quotationId === drawerQuotation.id);
  }, [allPayments, drawerQuotation?.id]);

  const drawerDeliveries = useMemo(() => {
    if (!drawerQuotation?.id) return [];
    return allDeliveries.filter((d) => d.quotationId === drawerQuotation.id);
  }, [allDeliveries, drawerQuotation?.id]);

  const customerTinhThanhMap = useMemo(() => extractCustomerTinhThanhMap(allCustomers), [allCustomers]);
  const tinhThanhList = useMemo(() => extractTinhThanhList(quotations, customerTinhThanhMap), [quotations, customerTinhThanhMap]);

  const {
    selectedLoai, setSelectedLoai,
    selectedZns, setSelectedZns,
    selectedNguoiPhuTrach, setSelectedNguoiPhuTrach,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedHieuLuc, setSelectedHieuLuc,
    selectedTienDo, setSelectedTienDo,
    selectedDateRange, setSelectedDateRange,
    setIsPipelineOnly,
    statsQuotations,
    filteredQuotations
  } = useQuotationsFilters(quotations, allContracts, allPayments, allDeliveries, customerTinhThanhMap);

  const enhancedQuotations = useMemo(() => enhanceQuotationsWithProvince(filteredQuotations, customerTinhThanhMap), [filteredQuotations, customerTinhThanhMap]);


  // Keep drawerQuotation in sync with realtime updates
  useEffect(() => {
    if (drawerQuotation && enhancedQuotations?.length) {
      const updated = enhancedQuotations.find(q => q.id === drawerQuotation.id);
      // We do a shallow comparison of updatedAt or timeline length or similar if present to avoid infinite JSON.stringify loops
      if (updated && (updated.updatedAt !== drawerQuotation?.updatedAt || updated.timeline?.length !== drawerQuotation?.timeline?.length || updated.tinhTrangBaoGia !== drawerQuotation?.tinhTrangBaoGia)) {
        setDrawerQuotation(updated);
      }
    }
  }, [enhancedQuotations, drawerQuotation?.id, drawerQuotation?.updatedAt, drawerQuotation?.timeline?.length, drawerQuotation?.tinhTrangBaoGia]);


  const {
    handleSendQuotationZns, handleDeleteQuotation, handleSaveQuotation, handleDrawerSendZns,
    blockingModalState, closeBlockingModal
  } = useQuotationActions(
    createQuotation, updateQuotation, deleteQuotation, confirm,
    drawerQuotation, setDrawerQuotation, editingQuotation, setEditingQuotation, setIsFormOpen, drawerCustomer,
    allContracts, allPayments, allDeliveries, userData
  );

  const columns = useMemo(() => getQuotationColumns(
    allContracts,
    allPayments,
    allDeliveries,
    async (q, st) => {
      if (!q.id) return;
      if (!can('update', 'quotation', userData?.role)) {
          notify.error('Bạn không có quyền thực hiện chức năng này');
          return;
      }

      if (st === 'ĐÃ CHỐT' && !can('approve', 'quotation', userData?.role)) {
          notify.error('Bạn không có quyền Duyệt / Chốt báo giá');
          return;
      }
 
      // Rule 13 / General validation upon status transition
      const validation = validateQuotationUpdate(q, { ...q, tinhTrangBaoGia: st }, allContracts, allPayments, allDeliveries);
      if (!validation.allowed) {
        notify.error(validation.reason || 'Sự thay đổi trạng thái này không hợp lệ!');
        return;
      }
 
      try { await updateQuotation(q.id, { tinhTrangBaoGia: st }); notify.success("Đã cập nhật tình trạng báo giá"); } 
      catch { notify.error("Lỗi cập nhật tình trạng"); }
    },
    async (q, pic) => {
      if (!q.id) return;
      if (!can('update', 'quotation', userData?.role)) {
          notify.error('Bạn không có quyền cập nhật người phụ trách');
          return;
      }
 
 
      try { await updateQuotation(q.id, { nguoiPhuTrach: pic }); notify.success("Đã cập nhật người phụ trách"); } 
      catch { notify.error("Lỗi cập nhật người phụ trách"); }
    },
    nguoiPhuTrachList,
    can('send_zns', 'quotation', userData?.role) ? handleSendQuotationZns : () => {},
    can('update', 'quotation', userData?.role) ? (q) => { setEditingQuotation(q); setIsFormOpen(true); } : undefined
  ), [nguoiPhuTrachList, updateQuotation, handleSendQuotationZns, userData?.role]);

  const handleResetAllFilters = () => {
    setIsPipelineOnly(false);
    setSelectedLoai('');
    setSelectedZns('');
    setSelectedNguoiPhuTrach('');
    setSelectedTinhThanh('');
    setSelectedHieuLuc('');
    setSelectedDateRange(['', '']);
    setGlobalFilter('');
    setColumnFilters([]);
  };

  const enhancedQuotationsWithStt = useMemo(() => enrichWithStt(enhancedQuotations), [enhancedQuotations]);

  const dataView = useDataView({
    viewId: 'quotations_list',
    columns,
    data: enhancedQuotationsWithStt,
    initialState: {
      grouping: [],
      sorting: [{ id: 'stt', desc: true }],
      columnVisibility: { customerId: false, ngayHetHan: false, tinhThanh: false },
    },
    onRowSelect: (row) => setDrawerQuotation(row as Quotation),
    onNew: () => setIsFormOpen(true)
  });

  const { table, globalFilter: _globalFilter, setGlobalFilter, setColumnFilters } = dataView;
  const currentData = table.getFilteredRowModel().rows.map(r => r.original as Quotation);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n') { e.preventDefault(); setIsFormOpen(true); }
      if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('input[type="search"]')?.focus(); }
      
      // Navigate next/prev if drawer is open
      if (drawerQuotation && (e.key === '[' || e.key === ']')) {
        e.preventDefault();
        const currentIdx = currentData.findIndex(q => q.id === drawerQuotation.id);
        if (currentIdx === -1) return;
        
        let nextIdx = currentIdx;
        if (e.key === '[' && currentIdx > 0) nextIdx = currentIdx - 1;
        if (e.key === ']' && currentIdx < currentData.length - 1) nextIdx = currentIdx + 1;
        
        if (nextIdx !== currentIdx) setDrawerQuotation(currentData[nextIdx]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerQuotation, currentData]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
      <QuotationDrawerRouteListener hasDrawer={!!drawerQuotation} onOpenDrawer={setDrawerQuotation} />

      {/* Thống kê đài phát/báo giá */}
      <div className="px-6 pt-4 shrink-0">
        <QuotationStats 
          quotations={statsQuotations}
          allContracts={allContracts}
          allPayments={allPayments}
          selectedLoai={selectedLoai}
          setSelectedLoai={setSelectedLoai}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 pt-4 overflow-hidden min-h-0">
        <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 mt-0 rounded-xl flex flex-col relative min-h-0">
          <DataViewEngine
            onCreateNew={() => { setEditingQuotation(null); setIsFormOpen(true); }}
            createNewLabel="Báo giá mới"
            canCreate={can('create', 'quotation', userData?.role)}
            dataView={dataView}
            columns={columns}
            entityFilters={
              <QuotationFilterBar
                nguoiPhuTrachList={nguoiPhuTrachList}
                tinhThanhList={tinhThanhList}
                selectedZns={selectedZns} setSelectedZns={setSelectedZns}
                selectedNguoiPhuTrach={selectedNguoiPhuTrach} setSelectedNguoiPhuTrach={setSelectedNguoiPhuTrach}
                selectedTinhThanh={selectedTinhThanh} setSelectedTinhThanh={setSelectedTinhThanh}
                selectedTienDo={selectedTienDo} setSelectedTienDo={setSelectedTienDo}
                selectedHieuLuc={selectedHieuLuc} setSelectedHieuLuc={setSelectedHieuLuc}
                selectedDateRange={selectedDateRange} setSelectedDateRange={setSelectedDateRange}
              />
            }
            onResetAllFilters={handleResetAllFilters}
            searchTemplate="Tìm theo số phiếu, tên khách hàng..."
            availableViews={[
              { value: 'table', label: 'Bảng', icon: 'Table' },
            ]}
            groupByOptions={[
              { id: 'customerId', label: 'Khách hàng' },
              { id: 'tinhThanh', label: 'Tỉnh/Thành' },
              { id: 'nguoiPhuTrach', label: 'Người phụ trách' },
            ]}
          onRowSelect={(row) => setDrawerQuotation(row as Quotation)} 
          onRowDoubleClick={(row) => { 
                if (can('update', 'quotation', userData?.role)) {
                    setEditingQuotation(row as Quotation); setIsFormOpen(true); 
                } else {
                    setDrawerQuotation(row as Quotation);
                }
            }}
          onRowEdit={can('update', 'quotation', userData?.role) ? (row) => { setEditingQuotation(row as Quotation); setIsFormOpen(true); } : undefined}
          onRowZns={can('send_zns', 'quotation', userData?.role) ? handleSendQuotationZns : undefined}
          onRowDelete={can('delete', 'quotation', userData?.role) ? handleDeleteQuotation : undefined}
          fetchMore={loadMore}
          isFetching={loading}
        />
        </div>
      </div>
      <QuotationDetailDrawer
        quotation={drawerQuotation}
        customers={drawerCustomer ? [drawerCustomer] : []}
        owners={nguoiPhuTrachList}
        statuses={loaiBaoGiaList}
        contracts={drawerContracts}
        payments={drawerPayments}
        deliveries={drawerDeliveries}
        onClose={() => setDrawerQuotation(null)}
        onEdit={(q) => { setEditingQuotation(q); setDrawerQuotation(null); setIsFormOpen(true); }}
        onDelete={async () => {
          if (drawerQuotation) {
             handleDeleteQuotation(drawerQuotation);
          }
        }}
        onUpdate={updateQuotation}
        onSendZns={handleDrawerSendZns}
      />
      {isFormOpen && (
        <Suspense fallback={<ModalSkeleton />}>
          <QuotationFormModal 
            key={editingQuotation?.id || 'new'}
            quotation={editingQuotation}
            quotations={quotations}
            customers={allCustomers}
            nguoiPhuTrachList={nguoiPhuTrachList} loaiBaoGiaList={loaiBaoGiaList} loaiKhachHangList={loaiKhachHangList}
            onClose={() => { setIsFormOpen(false); setEditingQuotation(null); }}
            onSave={handleSaveQuotation}
            allContracts={allContracts}
            allPayments={allPayments}
            allDeliveries={allDeliveries}
          />
        </Suspense>
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
