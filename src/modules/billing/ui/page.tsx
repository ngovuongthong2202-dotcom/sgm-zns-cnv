import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { canCreatePayment } from '@/src/domain/policy/gate.policy';
import { notify } from '@/src/shared/utils/notify';
import { can } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';

import { usePayments } from './hooks/usePayments';
import { Payment } from '@/src/domain/schema/payment.schema';
import useSWR, { preload } from 'swr';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { DataViewEngine } from '@/src/design-system/dataview/DataViewEngine';
import { useDataView } from '@/src/design-system/dataview/useDataView';
import { usePaymentsFilters } from './hooks/usePaymentsFilters';
import { usePaymentKpiMetrics } from './hooks/usePaymentKpiMetrics';
import { usePaymentsColumns } from './hooks/usePaymentsColumns';
import { handleDatabaseError, OperationType } from '@/src/shared/errors/database-error';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { PaymentRecordDrawer } from './components/PaymentRecordDrawer';
import { PaymentDetailDrawer } from './components/PaymentDetailDrawer';
import { useConfirm } from '@/src/design-system/Confirm';
import { PageHeader } from '@/src/design-system/PageHeader';
import { FinancialDashboardHeader } from './components/FinancialDashboardHeader';
import { PaymentFilterBar } from './components/PaymentFilterBar';
import { extractPaymentTinhThanhList } from './utils/extractors';
import { enrichWithStt } from '@/src/shared/utils/enrichWithStt';
import { usePaymentsActions } from './hooks/usePaymentsActions';
 
import { PageSkeleton } from '@/src/design-system/skeletons/PageSkeleton';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { BlockingDocumentsModal } from '@/src/widgets/BlockingDocumentsModal';

import PaymentDeliveryBanner from './components/PaymentDeliveryBanner';

const PaymentRouteSync = React.memo(function PaymentRouteSync({
  hasDrawer,
  onOpenDrawer,
  quotations,
  onPrefillQuotation,
  onOpenForm,
}: {
  hasDrawer: boolean;
  onOpenDrawer: (payment: any) => void;
  quotations: any[];
  onPrefillQuotation: (quo: any) => void;
  onOpenForm: () => void;
}) {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (location.pathname.startsWith('/payments') && location.state?.openDrawer && !hasDrawer) {
      onOpenDrawer(location.state.openDrawer);
      window.history.replaceState({}, document.title);
    }
  }, [location.pathname, location.state, hasDrawer, onOpenDrawer]);

  useEffect(() => {
    if (!location.pathname.startsWith('/payments')) return;
    const fromQuoId = searchParams.get('fromQuotation');
    if (fromQuoId && quotations.length > 0) {
      const foundQuo = quotations.find((q: any) => q.id === fromQuoId);
      if (foundQuo) {
        const canProceed = canCreatePayment(foundQuo);
        if (!canProceed.allowed) {
          notify.error(canProceed.reason || "Báo giá không đủ điều kiện lập phiếu thu.");
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

export default function PaymentsFeature() {
  const { userData } = useAuth();
  const { payments, loading, loadMore, refresh, createPayment, updatePaymentWithTransaction, deletePayment } = usePayments();
  const { nguoiPhuTrachList, phuongThucThanhToanList, tinhTrangThanhToanList } = useSharedFields();
  const { confirm } = useConfirm();

  // Core background collections for lookups and suggestions from shared Data Mesh
  const { data: contracts = [] } = useRealtimeCollection<any>('contracts');
  const { data: quotations = [] } = useRealtimeCollection<any>('quotations');
  const { data: customers = [] } = useRealtimeCollection<any>('customers');
  const { data: deliveries = [] } = useRealtimeCollection<any>('deliveries');

  const {
    drawerPayment, setDrawerPayment,
    editingPayment, setEditingPayment,
    isFormOpen, setIsFormOpen,
    handleDeletePayment,
    handleSendZns,
    handleCreatePrepaidFinalPayment,
    blockingModalState,
    closeBlockingModal,
  } = usePaymentsActions(deletePayment, refresh, deliveries, userData?.role);

  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'OVERDUE' | 'PAID'>('ALL');
  const { filteredPayments, selectedTinhTrangThanhToan, setSelectedTinhTrangThanhToan, selectedPhanLoai, setSelectedPhanLoai, selectedTinhThanh, setSelectedTinhThanh, selectedZns, setSelectedZns, selectedNguoiPhuTrach, setSelectedNguoiPhuTrach, selectedDateRange, setSelectedDateRange } = usePaymentsFilters(payments, customers, activeTab);
  
  const kpiMetrics = usePaymentKpiMetrics(payments);
  const columns = usePaymentsColumns(updatePaymentWithTransaction as any, refresh, confirm, handleSendZns as any, contracts, quotations, deliveries, customers);
  
  const handlePrefetchPayment = (payment: Payment) => {
    if (!payment) return;
    if (payment.customerId) {
      preload(`customers:${payment.customerId}`, swrDocFetcher).catch(() => {});
    }
    if (payment.contractId) {
      preload(`contracts:${payment.contractId}`, swrDocFetcher).catch(() => {});
    }
    if (payment.quotationId) {
      preload(`quotations:${payment.quotationId}`, swrDocFetcher).catch(() => {});
    }
  };

  const { data: formContract = null } = useSWR<any | null>(
    editingPayment?.contractId ? `contracts:${editingPayment.contractId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const { data: formQuotation = null } = useSWR<any | null>(
    editingPayment?.quotationId ? `quotations:${editingPayment.quotationId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false, revalidateIfStale: false }
  );

  const [prefillQuotationForPayment, setPrefillQuotationForPayment] = useState<any>(null);

  const finishedDeliveryRecommend = useMemo(() => {
    const completedDeliveries = deliveries.filter(d => (d as any).status === 'DELIVERED');
    for (const d of completedDeliveries) {
      const targetId = d.contractId || d.quotationId;
      if (!targetId) continue;

      const matchedPayments = payments.filter(p => p.contractId === targetId || p.quotationId === targetId);
      const existsPaid = matchedPayments.some(p => p.tinhTrangThanhToan === 'Tất toán' || p.tinhTrangThanhToan === 'ĐÃ THANH TOÁN');

      if (!existsPaid) {
        return d;
      }
    }
    return null;
  }, [deliveries, payments]);

  const handleResetAllFilters = () => {
    setSelectedTinhTrangThanhToan('');
    setSelectedPhanLoai('');
    setSelectedTinhThanh('');
    setSelectedZns('');
    setSelectedNguoiPhuTrach('');
    setSelectedDateRange(['', '']);
    setGlobalFilter('');
    setColumnFilters([]);
  };

  const tinhThanhList = useMemo(() => extractPaymentTinhThanhList(customers), [customers]);

  const filteredPaymentsWithStt = useMemo(() => enrichWithStt(filteredPayments), [filteredPayments]);

  const dataView = useDataView({
    viewId: 'payments_list',
    columns,
    data: filteredPaymentsWithStt,
    initialState: {
      grouping: [],
      sorting: [{ id: 'stt', desc: true }],
      columnVisibility: { phuongThucThanhToan: false },
    },
    onRowSelect: (row) => setDrawerPayment(row as Payment),
    onNew: () => {
      setEditingPayment(null);
      setIsFormOpen(true);
    }
  });

  const { setGlobalFilter, setColumnFilters } = dataView;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'n') {
        e.preventDefault();
        setEditingPayment(null);
        setIsFormOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setEditingPayment, setIsFormOpen]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden select-none animate-in fade-in duration-150">
      <PaymentRouteSync
        hasDrawer={!!drawerPayment}
        onOpenDrawer={setDrawerPayment}
        quotations={quotations}
        onPrefillQuotation={(q) => { setPrefillQuotationForPayment(q); setEditingPayment(null); }}
        onOpenForm={() => setIsFormOpen(true)}
      />
      <PageHeader title="Thanh toán" meta="Quản lý và đối soát công nợ, khoản thu" />

      <PaymentDeliveryBanner
        finishedDeliveryRecommend={finishedDeliveryRecommend}
        handleCreatePrepaidFinalPayment={handleCreatePrepaidFinalPayment}
      />

      <div className="px-6 pt-4 shrink-0">
        <FinancialDashboardHeader 
          collectedToday={kpiMetrics.collectedToday}
          collectedThisWeek={kpiMetrics.collectedThisWeek}
          collectedThisMonth={kpiMetrics.collectedThisMonth}
          collectedThisYear={kpiMetrics.collectedThisYear}
          totalDebt={kpiMetrics.totalDebt}
          statsByStatus={kpiMetrics.statsByStatus}
          statsByType={kpiMetrics.statsByType}
          activeTab={activeTab}
          selectedStatus={selectedTinhTrangThanhToan}
          selectedPhanLoai={selectedPhanLoai}
          onFilterTab={setActiveTab}
          onFilterStatus={setSelectedTinhTrangThanhToan}
          onFilterPhanLoai={setSelectedPhanLoai}
        />
      </div>

      <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
        <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 mt-0 rounded-xl flex flex-col relative min-h-0">
            <DataViewEngine
              onCreateNew={() => { setEditingPayment(null); setIsFormOpen(true); }}
              createNewLabel="Thanh toán mới"
              canCreate={can('create', 'payment', userData?.role)}
              dataView={dataView as any}
              columns={columns as any}
              entityFilters={
                <PaymentFilterBar
                  nguoiPhuTrachList={nguoiPhuTrachList}
                  tinhThanhList={tinhThanhList}
                  tinhTrangThanhToanList={tinhTrangThanhToanList}
                  selectedTinhTrangThanhToan={selectedTinhTrangThanhToan} setSelectedTinhTrangThanhToan={setSelectedTinhTrangThanhToan}
                  selectedPhanLoai={selectedPhanLoai} setSelectedPhanLoai={setSelectedPhanLoai}
                  selectedTinhThanh={selectedTinhThanh} setSelectedTinhThanh={setSelectedTinhThanh}
                  selectedZns={selectedZns} setSelectedZns={setSelectedZns}
                  selectedNguoiPhuTrach={selectedNguoiPhuTrach} setSelectedNguoiPhuTrach={setSelectedNguoiPhuTrach}
                  selectedDateRange={selectedDateRange} setSelectedDateRange={setSelectedDateRange}
                />
              }
              onResetAllFilters={handleResetAllFilters}
              searchTemplate="Tìm theo mã GD, khách hàng, HĐ..."
              availableViews={[
                { value: 'table', label: 'Bảng', icon: 'Table' },
              ]}
              groupByOptions={[
                { id: 'tinhTrangThanhToan', label: 'Tình trạng thanh toán' },
                { id: 'customerId', label: 'Khách hàng' },
                { id: 'phuongThucThanhToan', label: 'Phương thức' },
                { id: 'ngayThanhToan', label: 'Ngày thanh toán' },
                { id: 'ngayDenHan', label: 'Hạn chót phải thu' },
              ]}
              extraActions={null}
              onRowSelect={(row) => setDrawerPayment(row as Payment)}
              onRowDoubleClick={(row) => setDrawerPayment(row as Payment)}
              onRowHover={(row) => handlePrefetchPayment(row as Payment)}
              onRowEdit={can('update', 'payment', userData?.role) ? (row) => { setEditingPayment(row as Payment); setIsFormOpen(true); } : undefined}
              onRowZns={can('send_zns', 'payment', userData?.role) ? handleSendZns : undefined}
              onRowDelete={can('delete', 'payment', userData?.role) ? handleDeletePayment : undefined}
              fetchMore={loadMore}
              isFetching={loading}
              error={null}
              onRetry={loadMore}
            />
        </div>
      </div>

      {drawerPayment && (
        <PaymentDetailDrawer
          isOpen={!!drawerPayment}
          onClose={() => setDrawerPayment(null)}
          payment={drawerPayment}
          onEdit={(pm: Payment) => {
            setEditingPayment(pm);
            setIsFormOpen(true);
          }}
          onSendZns={handleSendZns}
          onDelete={handleDeletePayment}
        />
      )}

      {isFormOpen && (
        <PaymentRecordDrawer
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingPayment(null);
            setPrefillQuotationForPayment(null);
          }}
          payment={editingPayment}
          payments={payments}
          contracts={formContract ? [formContract] : []}
          quotations={formQuotation ? [formQuotation] : (prefillQuotationForPayment ? [prefillQuotationForPayment] : [])}
          prefillQuotation={prefillQuotationForPayment}
          nguoiPhuTrachList={nguoiPhuTrachList}
          phuongThucThanhToanList={phuongThucThanhToanList}
          tinhTrangThanhToanList={tinhTrangThanhToanList}
          onSave={async (data: any) => { 
            try {
              data.slMay = Number(data.slMay) || 0;
              if (editingPayment?.id) {
                 const validation = validatePaymentUpdate(editingPayment, data, deliveries);
                 if (!validation.allowed) {
                   notify.error(validation.reason || "Cập nhật không được phép!");
                   return;
                 }
                 await updatePaymentWithTransaction(editingPayment.id, () => {
                   return {
                     ...data,
                     _lastUpdatedAt: (editingPayment as any)?.updatedAt || (editingPayment as any)?.ngayCapNhat
                   };
                 });
              } else {
                 await apiCreateEntity('payment', data);
              }
              notify.success('Cập nhật thành công');
              setIsFormOpen(false);
              setEditingPayment(null);
              setPrefillQuotationForPayment(null);
              refresh();
            } catch (e: any) {
              notify.error(e.message || 'Lỗi cập nhật'); 
              handleDatabaseError(e, OperationType.WRITE, `payments/${editingPayment?.id || 'new'}`);
            }
          }}
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

function validatePaymentUpdate(
  oldP: any,
  newP: any,
  deliveries: any[]
): { allowed: boolean; reason?: string } {
  const linkedDeliveries = (deliveries || []).filter(d => 
    (d.paymentId && (d.paymentId === oldP.id || d.paymentId === oldP.paymentId))
  );
  const hasLinkedDelivery = linkedDeliveries.length > 0;

  // Rule 10: Không đổi khách hàng khi đã phát sinh bước sau
  if (oldP.customerId !== newP.customerId && hasLinkedDelivery) {
    return { allowed: false, reason: `Cảnh báo: Không thể thay đổi khách hàng cho phiếu thanh toán ${oldP.paymentId} vì đã phát sinh phiếu Giao hàng liên kết: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}` };
  }

  // Rule 11: Không sửa mã chứng từ đã được tham chiếu
  if (oldP.paymentId !== newP.paymentId && hasLinkedDelivery) {
    return { allowed: false, reason: `Cảnh báo: Không thể thay đổi số hiệu thanh toán từ "${oldP.paymentId}" sang "${newP.paymentId}" vì đã có phiếu Giao hàng tham chiếu: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}` };
  }

  // Rule 8: Thanh toán đã dùng làm điều kiện giao hàng thì khi sửa/xóa phải kiểm tra lại giao hàng
  if (hasLinkedDelivery) {
    const isMainChanged = oldP.customerId !== newP.customerId ||
                          oldP.paymentId !== newP.paymentId ||
                          oldP.contractId !== newP.contractId ||
                          oldP.quotationId !== newP.quotationId ||
                          oldP.soTien !== newP.soTien;
    if (isMainChanged) {
      return { allowed: false, reason: `Cảnh báo: Phiếu thanh toán này đang làm điều kiện giao hàng cho phiếu Giao hàng: ${linkedDeliveries.map(d => d.deliveryId).join(', ')}. Không được phép tự ý sửa đổi các thông tin chính (khách hàng, số hiệu, hợp đồng, báo giá, số tiền) làm sai lệch điều kiện!` };
    }
  }

  // Rule 13: Không chuyển trạng thái thủ công vượt luồng
  if (oldP.tinhTrangThanhToan && newP.tinhTrangThanhToan && oldP.tinhTrangThanhToan !== newP.tinhTrangThanhToan) {
    if (oldP.tinhTrangThanhToan === 'Tất toán' && newP.tinhTrangThanhToan === 'CHƯA THANH TOÁN') {
      return { allowed: false, reason: 'Không được phép chuyển tình trạng thanh toán từ Tất toán về CHƯA THANH TOÁN!' };
    }
  }

  return { allowed: true };
}

