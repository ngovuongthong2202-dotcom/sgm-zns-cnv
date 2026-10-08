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
import { CollapsibleStatsBanner } from '@/src/platform/ui/design-system/stats/CollapsibleStatsBanner';
import { getContractColumns } from './columns.config';
import { enrichWithStt } from '@/src/shared/utils/enrichWithStt';
import { useContractsFilters } from './hooks/useContractsFilters';
import { extractContractCustomerTinhThanhMap, extractContractTinhThanhList } from './utils/extractors';
import { ContractFilterBar } from './components/ContractFilterBar';
import { useContractsActions } from './hooks/useContractsActions';

import { useSharedFields } from '@/src/hooks/useSharedFields';
import { smartAllocateSerials } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { getLinkedDeliveriesForContract } from '@/src/domain/services/delivery-reconciler';
 

import { ContractModalsContainer } from './components/ContractModalsContainer';
import { BlockingDocumentsModal } from '@/src/widgets/BlockingDocumentsModal';
import { UniversalZnsPreviewModal } from '@/src/platform/ui/zns/UniversalZnsPreviewModal';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';

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
    const fromQuoId = searchParams.get('fromQuotation') || searchParams.get('quotationId');
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
        nextParams.delete('quotationId');
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
  const { data: realtimePayments = [] } = useRealtimeCollection<any>('payments');
  const { data: realtimeDeliveries = [] } = useRealtimeCollection<any>('deliveries');
  const { data: allCustomers = [] } = useRealtimeCollection<any>('customers');
  const { data: quotations = [] } = useRealtimeCollection<any>('quotations');

  const {
    editingContract, setEditingContract,
    isFormOpen, setIsFormOpen,
    drawerContract, setDrawerContract,
    prefillPaymentContract, setPrefillPaymentContract,
    prefillDeliveryContract, setPrefillDeliveryContract,
    handleDeleteContract,
    handleSendContractZns,
    znsPreviewContract,
    setZnsPreviewContract,
    blockingModalState,
    closeBlockingModal
  } = useContractsActions(deleteContract, realtimePayments, realtimeDeliveries, userData?.role);

  // Extract Province (Tỉnh/Thành) details using L1 cache
  const customerTinhThanhMap = useMemo(() => extractContractCustomerTinhThanhMap(allCustomers), [allCustomers]);
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
  const columns = useMemo(() => getContractColumns(realtimeDeliveries, realtimePayments, allCustomers, handleSendContractZns), [realtimeDeliveries, realtimePayments, allCustomers, handleSendContractZns]);

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

  const filteredContractsWithCustomer = useMemo(() => {
    return filteredContracts.map(ct => {
      const liveCustomer = allCustomers?.find(c => c.id === ct.customerId || (c.maKh && c.maKh === ct.customerId));
      const resolvedName = ct.tenKhachHang || liveCustomer?.tenKhachHang || '';
      const resolvedPhone = ct.sdt || liveCustomer?.sdt || (liveCustomer?.contacts?.[0]?.sdt) || '';
      const resolvedRep = ct.nguoiDaiDien || liveCustomer?.nguoiDaiDien || '';
      const resolvedAddress = (ct as any).diaChi || liveCustomer?.diaChi || '';
      const resolvedMaKh = ct.maKh || liveCustomer?.maKh || '';
      return {
        ...ct,
        tenKhachHang: resolvedName,
        sdt: resolvedPhone,
        phone: (ct as any).phone || resolvedPhone,
        nguoiDaiDien: resolvedRep,
        diaChi: resolvedAddress,
        maKh: resolvedMaKh,
        __customerInfo: liveCustomer || undefined
      };
    });
  }, [filteredContracts, allCustomers]);

  const filteredContractsWithStt = useMemo(() => enrichWithStt(filteredContractsWithCustomer), [filteredContractsWithCustomer]);

  const dataView = useDataView({
    viewId: 'contracts_list',
    columns: columns as any,
    data: filteredContractsWithStt,
    initialState: {
      grouping: [],
      sorting: [{ id: 'stt', desc: true }],
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
    const contractDels = getLinkedDeliveriesForContract(contract, deliveries);
    const raw = (contract.products || []).map(p => {
      const delivered = contractDels.reduce((sum, d) => {
        if (Array.isArray(d.cacDotGiao) && d.cacDotGiao.length > 0) {
          const shippedFromShipments = d.cacDotGiao.reduce((ssum: number, s: any) => {
            const sp = s.products?.find((x: any) => (x.productId && x.productId === p.productId) || (x.productName === p.productName));
            return ssum + (Number(sp?.quantity) || 0);
          }, 0);
          return sum + shippedFromShipments;
        }
        const dp = d.products?.find((x: any) => (x.productId && x.productId === p.productId) || (x.productName === p.productName));
        return sum + (Number(dp?.quantity) || 0);
      }, 0);
      const remaining = Math.max(0, (Number(p.quantity) || 0) - delivered);
      return {
        ...p,
        quantity: remaining,
        total: remaining * (p.price || 0)
      };
    }).filter(p => p.quantity > 0);
    return smartAllocateSerials(raw, contract.danhSachMaMay || []);
  };

  const hasActiveDomainFilters = !!(
    selectedNguoiPhuTrach ||
    selectedZns ||
    selectedTinhThanh ||
    selectedDkHoanThanh ||
    selectedTienDoTT ||
    selectedTienDoGiao ||
    selectedDateRange[0] ||
    selectedDateRange[1] ||
    (activeKpiFilter && activeKpiFilter !== 'ALL')
  );

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden">
      <ContractRouteSync
        hasDrawer={!!drawerContract}
        onOpenDrawer={setDrawerContract}
        quotations={quotations}
        onPrefillQuotation={(q) => { setPrefillQuotation(q); setEditingContract(null); }}
        onOpenForm={() => setIsFormOpen(true)}
      />

      <div className="px-6 pt-3 shrink-0">
        <CollapsibleStatsBanner
          storageKey="sgm_stats_pinned_contracts"
          title="Chỉ số & Tổng quan Hợp đồng"
          summaryBadge={`${contracts.length} hợp đồng`}
        >
          <ContractStats 
            contracts={contracts}
            realtimePayments={realtimePayments}
            realtimeDeliveries={realtimeDeliveries}
            activeKpiFilter={activeKpiFilter}
            setActiveKpiFilter={setActiveKpiFilter}
          />
        </CollapsibleStatsBanner>
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
        <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 mt-0 rounded-xl flex flex-col relative min-h-0">
          <DataViewEngine
            onCreateNew={() => { setEditingContract(null); setIsFormOpen(true); }}
            createNewLabel="Hợp đồng mới"
            canCreate={can('create', 'contract', userData?.role)}
            dataView={dataView as any}
            columns={columns as any}
            hasActiveDomainFilters={hasActiveDomainFilters}
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
        onSendZns={handleSendContractZns}
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
      {znsPreviewContract && (
        <UniversalZnsPreviewModal
          isOpen={!!znsPreviewContract}
          onClose={() => setZnsPreviewContract(null)}
          messageType={ZnsMessageType.HOPDONG_SIGN_ZNS}
          entityType="CONTRACT"
          entityId={znsPreviewContract.contract.id || ''}
          documentCode={znsPreviewContract.contract.soHopDong || znsPreviewContract.contract.id}
          customerName={znsPreviewContract.customer?.tenZns || znsPreviewContract.contract.tenKhachHang}
          phone={znsPreviewContract.phone}
          payload={{
            ...znsPreviewContract.contract,
            customerId: znsPreviewContract.contract.customerId || znsPreviewContract.customer?.id,
            tenKhachHang: znsPreviewContract.contract.tenKhachHang || znsPreviewContract.customer?.tenKhachHang,
            tenZns: znsPreviewContract.customer?.tenZns || znsPreviewContract.contract.tenKhachHang,
            ten_zns: znsPreviewContract.customer?.tenZns || znsPreviewContract.contract.tenKhachHang,
            customer_name: znsPreviewContract.customer?.tenZns || znsPreviewContract.contract.tenKhachHang,
            loai_don: 'Cung cấp Máy móc/Thiết Bị',
            so_phieu: znsPreviewContract.contract.soHopDong || znsPreviewContract.contract.id || '',
            order_code: znsPreviewContract.contract.soDonHang || (znsPreviewContract.contract as any).orderCode || 'DH-SGM',
            ma_bao_gia: znsPreviewContract.contract.soPhieuBaoGia || (znsPreviewContract.contract as any).quotationCode || 'BG-SGM',
            soHopDong: znsPreviewContract.contract.soHopDong || znsPreviewContract.contract.id,
            so_hop_dong: znsPreviewContract.contract.soHopDong || znsPreviewContract.contract.id,
            ngayKy: znsPreviewContract.contract.ngayKy,
            ngay_ky: znsPreviewContract.contract.ngayKy,
            soNgay: znsPreviewContract.contract.soNgayDuKienHoanThanh || (znsPreviewContract.contract as any).thoiGianThucHien || (znsPreviewContract.contract as any).soNgay || 30,
            so_ngay: znsPreviewContract.contract.soNgayDuKienHoanThanh || (znsPreviewContract.contract as any).thoiGianThucHien || (znsPreviewContract.contract as any).soNgay || 30,
            so_luong: Array.isArray(znsPreviewContract.contract.products) && znsPreviewContract.contract.products.length > 0
              ? znsPreviewContract.contract.products.reduce((acc: number, p: any) => acc + (Number(p.quantity || p.soLuong) || 1), 0)
              : 1,
            nhanVien: znsPreviewContract.contract.nguoiPhuTrach || 'Ngô Vương Thông',
            nhan_vien: znsPreviewContract.contract.nguoiPhuTrach || 'Ngô Vương Thông',
            ma_tra_cuu: znsPreviewContract.contract.soHopDong || znsPreviewContract.contract.id || '',
            phone: znsPreviewContract.phone,
            sdt: znsPreviewContract.phone
          }}
          availablePhones={znsPreviewContract.availablePhones}
          onSuccess={async () => {
            const cId = znsPreviewContract.contract.id;
            if (cId) {
              const updatedFields = {
                trangThaiGuiTin: 'THANH_CONG',
                trangThaiZns: 'THÀNH CÔNG',
                thongTinGuiZns: {
                  ngayGui: new Date().toISOString(),
                  sdt: znsPreviewContract.phone,
                  trangThai: 'THÀNH CÔNG'
                }
              };
              try {
                await updateContract(cId, updatedFields as any);
                if (drawerContract && drawerContract.id === cId) {
                  setDrawerContract({
                    ...drawerContract,
                    ...updatedFields
                  } as Contract);
                }
              } catch (err) {
                console.error('Error updating contract after ZNS send:', err);
              }
            }
          }}
        />
      )}
    </div>
  );
}

