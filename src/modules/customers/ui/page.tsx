import React, { useMemo, useCallback, useState } from 'react';


import { getCustomerColumns } from './columns.config';
import { enrichWithStt } from '@/src/shared/utils/enrichWithStt';
import { useCustomersPage } from './hooks/useCustomersPage';
import { CustomerFilterBar } from './components/CustomerFilterBar';
import { PageHeader } from '@/src/design-system/PageHeader';
import { CustomerDetailDrawer } from './components/CustomerDetailDrawer';
import { CustomerForm } from './components/CustomerFormModal';
import { CustomerStats } from './components/CustomerStats';
import { useDataView } from '@/src/design-system/dataview/useDataView';
import { DataViewEngine } from '@/src/design-system/dataview/DataViewEngine';
import { Customer, CustomerSchema } from '@/src/domain/schema/customer.schema';
import { DataImportModal, Button } from '@/src/design-system';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { BlockingDocumentsModal } from '@/src/widgets/BlockingDocumentsModal';
import { can } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';

export default function CustomersFeature() {
  const { userData } = useAuth();
  const {
    customers,
    filteredCustomers,
    loading,
    hasMore,
    loadMore,
    drawerState,
    setDrawerState,
    setIsFormDirty,
    density: _density,
    searchFilter: _searchFilter,
    setSearchFilter,
    selectedNguoiPhuTrach,
    setSelectedNguoiPhuTrach,
    selectedZnsStatus,
    setSelectedZnsStatus,
    selectedTinhThanh,
    setSelectedTinhThanh,
    selectedLoaiKh,
    setSelectedLoaiKh,
    selectedCreatedDateRange,
    setSelectedCreatedDateRange,
    tinhThanhList,
    drawerViewCustomer,
    activeCustomerForDetails,
    nguoiPhuTrachList,
    loaiKhachHangList,
    handleUpdateCustomer,
    handleDeleteCustomer,
    handleCreateCustomer,
    handleSendZns,
    sendingZnsIds,
    blockingModalState,
    closeBlockingModal,
  } = useCustomersPage();

  // Sequential drawer navigation logic
  const currentIndex = useMemo(() => {
    if (!drawerViewCustomer) return -1;
    return filteredCustomers.findIndex((c) => c.id === drawerViewCustomer.id);
  }, [filteredCustomers, drawerViewCustomer]);

  const prevCustomer = useMemo(() => {
    if (currentIndex <= 0) return null;
    return filteredCustomers[currentIndex - 1];
  }, [filteredCustomers, currentIndex]);

  const nextCustomer = useMemo(() => {
    if (currentIndex === -1 || currentIndex >= filteredCustomers.length - 1) return null;
    return filteredCustomers[currentIndex + 1];
  }, [filteredCustomers, currentIndex]);

  const handleNavigatePrev = useCallback(() => {
    if (prevCustomer) {
      setDrawerState({ mode: 'view', customer: prevCustomer });
    }
  }, [prevCustomer, setDrawerState]);

  const handleNavigateNext = useCallback(() => {
    if (nextCustomer) {
      setDrawerState({ mode: 'view', customer: nextCustomer });
    }
  }, [nextCustomer, setDrawerState]);

  // Construct custom column render configs
  const columns = useMemo(() => {
    const canDelete = can('delete', 'customer', userData?.role);
    const canSendZns = can('send_zns', 'customer', userData?.role);

    return getCustomerColumns(
      [],
      can('update', 'customer', userData?.role) ? (c) => setDrawerState({ mode: 'edit', customer: c }) : undefined,
      canDelete ? handleDeleteCustomer : undefined,
      canSendZns ? handleSendZns : undefined,
      undefined,
      sendingZnsIds,
      (c) => setDrawerState({ mode: 'view', customer: c, initialTab: 'quotes' })
    );
  }, [handleDeleteCustomer, handleSendZns, sendingZnsIds, setDrawerState, userData?.role]);

  const customersWithStt = useMemo(() => enrichWithStt(filteredCustomers), [filteredCustomers]);

  const dataView = useDataView<Customer>({
    viewId: 'customers_list',
    columns,
    data: customersWithStt,
    initialState: {
      grouping: [],
      sorting: [{ id: 'stt', desc: true }],
      columnVisibility: {
        tinhThanh: false,
        loaiKh: false,
      }
    },
    onRowSelect: (row) => setDrawerState({ mode: 'view', customer: row }),
    onNew: () => setDrawerState({ mode: 'new' })
  });

  const { table: _table, setColumnFilters, grouping: _grouping, setGrouping: _setGrouping } = dataView;

  const handleResetFilters = useCallback(() => {
    setSelectedNguoiPhuTrach('');
    setSelectedTinhThanh('');
    setSelectedLoaiKh('');
    setSelectedZnsStatus('');
    setSelectedCreatedDateRange(['', '']);
    setSearchFilter('');
    setColumnFilters([]);
  }, [setSearchFilter, setColumnFilters, setSelectedNguoiPhuTrach, setSelectedTinhThanh, setSelectedLoaiKh, setSelectedZnsStatus, setSelectedCreatedDateRange]);

  const [isImportOpen, setIsImportOpen] = useState(false);

  const handleImportCustomers = async (validData: Customer[]) => {
    let successCount = 0;
    for (const row of validData) {
      try {
        await apiCreateEntity('customers', row);
        successCount++;
      } catch (err: any) {
        toast.error(`Lỗi lưu khách hàng ${row.maKh}: ${err.message}`);
      }
    }
    toast.success(`Đã thêm thành công ${successCount} khách hàng`);
  };

  const hasActiveDomainFilters = !!(
    selectedNguoiPhuTrach ||
    selectedTinhThanh ||
    selectedLoaiKh ||
    selectedZnsStatus ||
    selectedCreatedDateRange[0] ||
    selectedCreatedDateRange[1]
  );


  return (
    <div className="flex flex-col h-full bg-slate-50">
      <PageHeader title="Khách hàng" meta="Quản lý khách hàng tiềm năng và khách hàng hiện tại" />
      {/* Thống kê đài phát */}
      <div className="px-6 pt-6 shrink-0">
        <CustomerStats 
          customers={customers} 
          selectedZnsStatus={selectedZnsStatus}
          onSelectZnsStatus={setSelectedZnsStatus}
          selectedProvince={selectedTinhThanh}
          onSelectProvince={(v) => setSelectedTinhThanh(v || '')}
        />
      </div>

      {/* Virtualized High-Perf Grid list */}
      <div className="flex-1 flex flex-col p-6 pt-4 overflow-hidden min-h-0">
        <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl flex flex-col relative min-h-0">
          <DataViewEngine<Customer>
            onCreateNew={() => setDrawerState({ mode: 'new' })}
            createNewLabel="Khách hàng mới"
            canCreate={can('create', 'customer', userData?.role)}
            dataView={dataView}
            columns={columns}
            groupByOptions={[
              { id: 'tinhThanh', label: 'Tỉnh/Thành' },
              { id: 'loaiKh', label: 'Loại khách hàng' },
              { id: 'nguoiPhuTrach', label: 'Phụ trách' },
              { id: 'trangThaiGuiTinQuangCao', label: 'Trạng thái ZNS' }
            ]}
            availableViews={[
              { value: 'table', label: 'Bảng', icon: 'Table' },
            ]}
            onRowSelect={(row) => setDrawerState({ mode: 'view', customer: row })}
            onRowDoubleClick={(row) => {
              if (can('update', 'customer', userData?.role)) {
                setDrawerState({ mode: 'edit', customer: row });
              } else {
                setDrawerState({ mode: 'view', customer: row });
              }
            }}
            onRowEdit={can('update', 'customer', userData?.role) ? (row) => setDrawerState({ mode: 'edit', customer: row }) : undefined}
            onRowZns={can('send_zns', 'customer', userData?.role) ? handleSendZns : undefined}
            onRowDelete={can('delete', 'customer', userData?.role) ? handleDeleteCustomer : undefined}
            fetchMore={hasMore ? loadMore : undefined}
            isFetching={loading}
            onResetAllFilters={handleResetFilters}
            hasActiveDomainFilters={hasActiveDomainFilters}
            extraActions={
              <Button 
                variant="secondary" 
                size="sm" 
                leftIcon={<Upload size={14} className="shrink-0 text-slate-500" />}
                className="h-8 px-2.5 text-slate-700 hover:text-slate-900 font-medium whitespace-nowrap shrink-0 inline-flex items-center shadow-xs" 
                onClick={() => setIsImportOpen(true)}
              >
                Thêm Excel/CSV
              </Button>
            }
            entityFilters={
              <CustomerFilterBar
                nguoiPhuTrachList={nguoiPhuTrachList}
                tinhThanhList={tinhThanhList}
                loaiKhachHangList={loaiKhachHangList}
                selectedNguoiPhuTrach={selectedNguoiPhuTrach}
                setSelectedNguoiPhuTrach={setSelectedNguoiPhuTrach}
                selectedZnsStatus={selectedZnsStatus}
                setSelectedZnsStatus={setSelectedZnsStatus}
                selectedTinhThanh={selectedTinhThanh}
                setSelectedTinhThanh={setSelectedTinhThanh}
                selectedLoaiKh={selectedLoaiKh}
                setSelectedLoaiKh={setSelectedLoaiKh}
                selectedCreatedDateRange={selectedCreatedDateRange}
                setSelectedCreatedDateRange={setSelectedCreatedDateRange}
              />
            }
          />
        </div>
      </div>

      {/* Slide right lazy detail drawer */}
      <CustomerDetailDrawer
        isOpen={drawerState.mode === 'view'}
        onClose={() => setDrawerState({ mode: 'closed' })}
        customer={activeCustomerForDetails || undefined}
        initialTab={drawerState.mode === 'view' ? drawerState.initialTab : undefined}
        prevCustomer={prevCustomer}
        nextCustomer={nextCustomer}
        onNavigatePrev={handleNavigatePrev}
        onNavigateNext={handleNavigateNext}
        onEdit={() => setDrawerState({ mode: 'edit', customer: drawerViewCustomer! })}
        onSendZns={handleSendZns}
        onDeleteCustomer={handleDeleteCustomer}
      />

      {/* Stepper Create / Edit dialog */}
      {(drawerState.mode === 'new' || drawerState.mode === 'edit') && (
        <CustomerForm
          key={drawerState.mode === 'edit' ? (drawerState.customer.id || drawerState.customer.maKh) : 'new'}
          customer={drawerState.mode === 'edit' ? drawerState.customer : null}
          nguoiPhuTrachList={nguoiPhuTrachList}
          loaiKhachHangList={loaiKhachHangList}
          onClose={() => setDrawerState({ mode: 'closed' })}
          onSave={
            drawerState.mode === 'edit'
              ? (data) => handleUpdateCustomer(drawerState.customer.id!, data)
              : (data, continueCreating) => handleCreateCustomer(data, continueCreating)
          }
          onDirtyChange={setIsFormDirty}
        />
      )}

      <DataImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Nhập khách hàng từ Excel/CSV"
        schema={CustomerSchema}
        onImport={handleImportCustomers}
        templateData={[{ maKh: 'KH001', tenKhachHang: 'Công ty ABC', nguoiPhuTrach: 'Nguyễn Văn A' }]}
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
