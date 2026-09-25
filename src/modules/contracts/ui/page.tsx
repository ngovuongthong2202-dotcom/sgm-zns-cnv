import { Button } from '@/src/design-system';
import React, { useMemo, useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { canCreateContract } from '@/src/domain/policy/gate.policy';
import { can } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';

import { useContracts } from './hooks/useContracts';
import { notify } from '@/src/shared/utils/notify';
import useSWR, { preload } from 'swr';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { useMutation } from '@/src/hooks/useMutation';
 
import { Contract } from '@/src/domain/schema/contract.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { t } from '@/src/i18n/vi';

import { DataViewEngine } from '@/src/design-system/dataview/DataViewEngine';
import { useDataView } from '@/src/design-system/dataview/useDataView';
import { ContractStats } from './components/ContractStats';
import { getContractColumns } from './columns.config';
import { useContractsFilters } from './hooks/useContractsFilters';
import { extractContractCustomerTinhThanhMap, extractContractTinhThanhList } from './utils/extractors';
import { ContractFilterBar } from './components/ContractFilterBar';
import { PageHeader } from '@/src/design-system/PageHeader';
import { useContractsActions } from './hooks/useContractsActions';

import { useSharedFields } from '@/src/hooks/useSharedFields';
 

import { PageSkeleton } from '@/src/design-system/skeletons/PageSkeleton';
import { ContractModalsContainer } from './components/ContractModalsContainer';
import { BlockingDocumentsModal } from '@/src/widgets/BlockingDocumentsModal';

const ContractRouteSync = React.memo(function ContractRouteSync({
  hasDrawer,
  onOpenDrawer,
  quotations,
  onPrefillQuotation,
  onOpenForm,
}: {
  hasDrawer: boolean;
  onOpenDrawer: (contract: any) => void;
  quotations: any[];
  onPrefillQuotation: (quo: any) => void;
  onOpenForm: () => void;
}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (location.pathname.startsWith('/contracts') && location.state?.openDrawer && !hasDrawer) {
      onOpenDrawer(location.state.openDrawer);
      window.history.replaceState({}, document.title);
    }
  }, [location.pathname, location.state, hasDrawer, onOpenDrawer]);

  useEffect(() => {
    if (!location.pathname.startsWith('/contracts')) return;
    const fromQuoId = searchParams.get('fromQuotation');
    if (fromQuoId && quotations.length > 0) {
      const foundQuo = quotations.find((q: any) => q.id === fromQuoId);
      if (foundQuo) {
        const canProceed = canCreateContract(foundQuo);
        if (!canProceed.allowed) {
          notify.error(canProceed.reason || "Báo giá không đủ điều kiện tạo Hợp đồng.");
        } else {
          onPrefillQuotation(foundQuo);
          onOpenForm();
        }
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('fromQuotation');
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [location.pathname, searchParams, quotations, setSearchParams, onPrefillQuotation, onOpenForm]);

  return null;
});

export default function ContractsFeature() {
  const { userData } = useAuth();
  const { contracts, loading, loadMore, createContract, updateContract, deleteContract, softDeleteContract } = useContracts();
  
  const { nguoiPhuTrachList } = useSharedFields();

  // Mutation and real-time streams
  const { createRecord: createPayment } = useMutation<any>({ collection: 'payments' });
  const { createRecord: createDelivery } = useMutation<any>({ collection: 'deliveries' });

  // On-demand streams with L1 EntityCachePool fallback
  const { data: realtimePayments = [] } = useRealtimeCollection<any>('non-existent-skip');
  const { data: realtimeDeliveries = [] } = useRealtimeCollection<any>('non-existent-skip');
  const quotations: any[] = [];

  const {
    editingContract, setEditingContract,
    isFormOpen, setIsFormOpen,
    drawerContract, setDrawerContract,
    prefillPaymentContract, setPrefillPaymentContract,
    prefillDeliveryContract, setPrefillDeliveryContract,
    handleDeleteContract,
    handleSendContractZns,
    blockingModalState,
    closeBlockingModal
  } = useContractsActions(deleteContract, realtimePayments, realtimeDeliveries);

  // Extract Province (Tỉnh/Thành) details using L1 cache
  const customerTinhThanhMap = useMemo(() => extractContractCustomerTinhThanhMap([]), []);
  const tinhThanhList = useMemo(() => extractContractTinhThanhList(contracts, customerTinhThanhMap), [contracts, customerTinhThanhMap]);

  const { 
    selectedNguoiPhuTrach, setSelectedNguoiPhuTrach,
    selectedZns, setSelectedZns,
    selectedTinhThanh, setSelectedTinhThanh,
    selectedDkHoanThanh, setSelectedDkHoanThanh,
    selectedTienDoTT, setSelectedTienDoTT,
    selectedTienDoGiao, setSelectedTienDoGiao,
    selectedDateRange, setSelectedDateRange,
    activeKpiFilter, setActiveKpiFilter,
    filteredContracts
  } = useContractsFilters(contracts, realtimePayments, realtimeDeliveries, customerTinhThanhMap);

  const handlePrefetchContract = (contract: Contract) => {
    if (!contract) return;
    if (contract.customerId) {
      preload(`customers:${contract.customerId}`, swrDocFetcher).catch(() => {});
    }
    if (contract.id) {
      preload(`payments:500:contractId:${contract.id}`, swrColFetcher).catch(() => {});
      preload(`deliveries:500:contractId:${contract.id}`, swrColFetcher).catch(() => {});
    }
  };

  // Dynamic SWR queries when Contract drawer is open
  const { data: drawerCustomer = null } = useSWR<Customer | null>(
    drawerContract?.customerId ? `customers:${drawerContract.customerId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const [prefillQuotation, setPrefillQuotation] = useState<any>(null);

  // Real-time pillars
  const columns = useMemo(() => getContractColumns(realtimeDeliveries, realtimePayments, []), [realtimeDeliveries, realtimePayments]);

  const handleResetAllFilters = () => {
    setSelectedNguoiPhuTrach('');
    setSelectedZns('');
    setSelectedTinhThanh('');
    setSelectedDkHoanThanh('');
    setSelectedTienDoTT('');
    setSelectedTienDoGiao('');
    setSelectedDateRange(['', '']);
    setGlobalFilter('');
    setColumnFilters([]);
    setActiveKpiFilter('ALL');
  };

  const dataView = useDataView({
    viewId: 'contracts_list',
    columns,
    data: filteredContracts,
    initialState: {
      grouping: ['customerId'],
      sorting: [{ id: 'ngayKy', desc: true }],
      columnVisibility: { 
        customerId: false, 
        ngayKyThang: false,
        products: false,
        nguoiPhuTrach: false,
        actions: false
      },
    },
    onRowSelect: (row) => setDrawerContract(row as Contract),
    onNew: () => setIsFormOpen(true)
  });

  const { setColumnFilters, setGlobalFilter } = dataView;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n') { e.preventDefault(); setIsFormOpen(true); }
      if (e.key === '/') { e.preventDefault(); document.querySelector<HTMLInputElement>('input[type="search"]')?.focus(); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setIsFormOpen]);

  const getRemainingProducts = (contract: Contract, deliveries: any[]) => {
    const contractDels = deliveries.filter(d => d.contractId === contract.id);
    return (contract.products || []).map(p => {
      const delivered = contractDels.reduce((sum, d) => {
        const dp = d.products?.find((x: any) => (x.productId && x.productId === p.productId) || (x.productName === p.productName));
        return sum + (dp?.quantity || 0);
      }, 0);
      const remaining = Math.max(0, (p.quantity || 0) - delivered);
      return {
        ...p,
        quantity: remaining,
        total: remaining * (p.price || 0)
      };
    }).filter(p => p.quantity > 0);
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden">
      <ContractRouteSync
        hasDrawer={!!drawerContract}
        onOpenDrawer={setDrawerContract}
        quotations={quotations}
        onPrefillQuotation={(q) => { setPrefillQuotation(q); setEditingContract(null); }}
        onOpenForm={() => setIsFormOpen(true)}
      />
      <PageHeader title="Hợp đồng" meta="Quản lý hợp đồng máy nguyên chiếc" />

      <div className="px-6 pt-4 shrink-0">
        <ContractStats 
          contracts={contracts}
          realtimePayments={realtimePayments}
          realtimeDeliveries={realtimeDeliveries}
          activeKpiFilter={activeKpiFilter}
          setActiveKpiFilter={setActiveKpiFilter}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
        <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 mt-0 rounded-xl flex flex-col relative min-h-0">
          <DataViewEngine
            onCreateNew={() => { setEditingContract(null); setIsFormOpen(true); }}
            createNewLabel="Hợp đồng mới"
            canCreate={can('create', 'contract', userData?.role)}
            dataView={dataView as any}
            columns={columns as any}
            entityFilters={
              <ContractFilterBar
                nguoiPhuTrachList={nguoiPhuTrachList}
                tinhThanhList={tinhThanhList}
                selectedNguoiPhuTrach={selectedNguoiPhuTrach} setSelectedNguoiPhuTrach={setSelectedNguoiPhuTrach}
                selectedZns={selectedZns} setSelectedZns={setSelectedZns}
                selectedTinhThanh={selectedTinhThanh} setSelectedTinhThanh={setSelectedTinhThanh}
                selectedDkHoanThanh={selectedDkHoanThanh} setSelectedDkHoanThanh={setSelectedDkHoanThanh}
                selectedTienDoTT={selectedTienDoTT} setSelectedTienDoTT={setSelectedTienDoTT}
                selectedTienDoGiao={selectedTienDoGiao} setSelectedTienDoGiao={setSelectedTienDoGiao}
                selectedDateRange={selectedDateRange} setSelectedDateRange={setSelectedDateRange}
              />
            }
            onResetAllFilters={handleResetAllFilters}
            searchTemplate={t('contract.searchPlaceholder')}
            availableViews={[
              { value: 'table', label: t('common.table') || 'Bảng', icon: 'Table' },
            ]}
            groupByOptions={[
              { id: 'customerId', label: t('contract.groups.customerId') },
              { id: 'nguoiPhuTrach', label: t('contract.groups.nguoiPhuTrach') },
              { id: 'ngayKyThang', label: t('contract.groups.ngayKyThang') },
              { id: 'trangThaiGuiTinHopDong', label: t('contract.groups.trangThaiGuiTinHopDong') },
            ]}
          onRowSelect={(row) => setDrawerContract(row as any)}
          onRowDoubleClick={(row) => { 
                if (can('update', 'contract', userData?.role)) {
                    setEditingContract(row as any); setIsFormOpen(true); 
                } else {
                    setDrawerContract(row as any);
                }
            }}
          onRowHover={(row) => handlePrefetchContract(row as Contract)}
          onRowEdit={can('update', 'contract', userData?.role) ? (row) => { setEditingContract(row as any); setIsFormOpen(true); } : undefined}
          onRowZns={can('send_zns', 'contract', userData?.role) ? handleSendContractZns : undefined}
          onRowDelete={can('delete', 'contract', userData?.role) ? handleDeleteContract : undefined}
          customRowActions={(row) => {
            const contract = row as Contract;
            if (!can('create', 'payment', userData?.role)) return null;
            return (
              <Button
                type="button"
                title="Tạo Thanh Toán"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setPrefillPaymentContract(contract);
                }}
                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-md border-0 bg-transparent cursor-pointer flex items-center justify-center transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
              </Button>
            )
          }}
          fetchMore={loadMore}
          isFetching={loading}
          error={null}
          onRetry={loadMore}
        />
        </div>
      </div>

      <ContractModalsContainer
        contracts={contracts}
        quotations={quotations}
        realtimePayments={realtimePayments}
        realtimeDeliveries={realtimeDeliveries}
        drawerCustomer={drawerCustomer}
        nguoiPhuTrachList={nguoiPhuTrachList}
        editingContract={editingContract}
        setEditingContract={setEditingContract}
        isFormOpen={isFormOpen}
        setIsFormOpen={setIsFormOpen}
        prefillQuotation={prefillQuotation}
        setPrefillQuotation={setPrefillQuotation}
        drawerContract={drawerContract}
        setDrawerContract={setDrawerContract}
        prefillPaymentContract={prefillPaymentContract}
        setPrefillPaymentContract={setPrefillPaymentContract}
        prefillDeliveryContract={prefillDeliveryContract}
        setPrefillDeliveryContract={setPrefillDeliveryContract}
        createContract={createContract}
        updateContract={updateContract}
        createPayment={createPayment}
        createDelivery={createDelivery}
        handleDeleteContract={handleDeleteContract}
        getRemainingProducts={getRemainingProducts}
      />
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

