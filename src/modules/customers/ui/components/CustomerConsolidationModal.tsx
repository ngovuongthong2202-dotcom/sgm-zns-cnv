import React, { useState, useEffect } from 'react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { 
  detectDuplicateCustomerGroups, 
  buildConsolidationMigrationPlan, 
  DuplicateCustomerGroup,
  calculateBusinessNameSimilarity 
} from '../utils/customerConsolidationEngine';
import { repositoryFactory } from '@/src/data/repositories';
import { clearSwrColCache } from '@/src/data/swr-fetchers';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { notify } from '@/src/shared/utils/notify';
import { Button } from '@/src/design-system/Button';
import { MergeCustomer } from '../../application/use-cases/MergeCustomer';
import { useAuth } from '@/src/modules/iam';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { 
  Users, 
  GitMerge, 
  CheckCircle2, 
  Building2, 
  AlertCircle, 
  ShieldCheck, 
  X,
  RefreshCw,
  Search,
  History,
  RotateCcw,
  AlertTriangle,
  Lock,
  Crown
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  quotations: Quotation[];
  contracts?: any[];
  payments?: any[];
  deliveries?: any[];
  onConsolidationSuccess?: () => void;
}

export function CustomerConsolidationModal({
  isOpen,
  onClose,
  customers,
  quotations,
  contracts = [],
  payments = [],
  deliveries = [],
  onConsolidationSuccess,
}: Props) {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [mergeHistory, setMergeHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [rollingBackId, setRollingBackId] = useState<string | null>(null);
  const [customMasterId, setCustomMasterId] = useState<string | null>(null);

  const duplicateGroups = React.useMemo(() => {
    return detectDuplicateCustomerGroups(customers, quotations, contracts, payments, deliveries);
  }, [customers, quotations, contracts, payments, deliveries]);

  // Load history when tab is activated
  const loadHistory = React.useCallback(async () => {
    setIsLoadingHistory(true);
    try {
      const history = await MergeCustomer.getMergeHistory();
      setMergeHistory(history);
    } catch (err: any) {
      console.warn('Failed to load merge history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && isOpen) {
      loadHistory();
    }
  }, [activeTab, isOpen, loadHistory]);

  useEffect(() => {
    setCustomMasterId(null);
  }, [selectedGroupIndex]);

  const filteredGroups = React.useMemo(() => {
    if (!searchQuery.trim()) return duplicateGroups;
    const q = searchQuery.toLowerCase().trim();
    return duplicateGroups.filter(g => 
      g.taxCode.includes(q) || 
      g.allCustomersInGroup.some(c => 
        (c.tenKhachHang || '').toLowerCase().includes(q) || 
        (c.maKh || '').toLowerCase().includes(q)
      )
    );
  }, [duplicateGroups, searchQuery]);

  const rawGroup: DuplicateCustomerGroup | undefined = filteredGroups[selectedGroupIndex] || filteredGroups[0];

  const currentGroup: DuplicateCustomerGroup | undefined = React.useMemo(() => {
    if (!rawGroup || !customMasterId) return rawGroup;
    const chosenMaster = rawGroup.allCustomersInGroup.find(c => c.id === customMasterId || c.maKh === customMasterId);
    if (!chosenMaster) return rawGroup;
    return {
      ...rawGroup,
      masterCustomer: chosenMaster,
      secondaryCustomers: rawGroup.allCustomersInGroup.filter(c => (c.id || c.maKh) !== (chosenMaster.id || chosenMaster.maKh))
    };
  }, [rawGroup, customMasterId]);

  const currentPlan = React.useMemo(() => {
    if (!isOpen || !currentGroup) return null;
    return buildConsolidationMigrationPlan(
      currentGroup,
      quotations,
      contracts,
      payments,
      deliveries
    );
  }, [isOpen, currentGroup, quotations, contracts, payments, deliveries]);

  if (!isOpen) return null;

  const handleMergeGroup = async (group: DuplicateCustomerGroup) => {
    setIsProcessing(true);
    try {
      const plan = currentPlan || buildConsolidationMigrationPlan(
        group,
        quotations,
        contracts,
        payments,
        deliveries
      );

      const customerRepo = repositoryFactory.get<any>('customers');
      const quoteRepo = repositoryFactory.get<any>('quotations');
      const contractRepo = repositoryFactory.get<any>('contracts');
      const paymentRepo = repositoryFactory.get<any>('payments');
      const deliveryRepo = repositoryFactory.get<any>('deliveries');

      // 1. Cập nhật Master Customer với contacts đã gộp
      if (plan.updatedMasterCustomer.id) {
        await customerRepo.update(plan.updatedMasterCustomer.id, {
          contacts: plan.updatedMasterCustomer.contacts,
          mergedCustomerCodes: plan.updatedMasterCustomer.mergedCustomerCodes,
          nhuCauKhachHang: (plan.updatedMasterCustomer as any).ghiChu || plan.updatedMasterCustomer.nhuCauKhachHang,
        });
      }

      // 2. Thực hiện hợp nhất nguyên tử qua Backend ACID Batch kèm Audit Log
      const secondaryIds = plan.archivedSecondaryCustomers.map(s => s.id).filter((id): id is string => Boolean(id));
      let backendSuccess = false;
      if (plan.masterCustomer.id) {
        try {
          await MergeCustomer.execute(
            plan.masterCustomer.id, 
            secondaryIds, 
            user?.email || undefined,
            plan.updatedMasterCustomer.contacts,
            plan.updatedMasterCustomer.mergedCustomerCodes
          );
          backendSuccess = true;
        } catch (err) {
          console.warn('[CustomerConsolidation] Backend atomic merge failed or offline, falling back to client-side migration:', err);
        }
      }

      // 3. Fallback client-side nếu backend không khả dụng
      if (!backendSuccess) {
        for (const sec of plan.archivedSecondaryCustomers) {
          if (sec.id) {
            await customerRepo.update(sec.id, {
              isArchived: true,
              mergedInto: plan.masterCustomer.id,
              tenKhachHang: `[ĐÃ GỘP VÀO ${plan.masterCustomer.maKh}] ${sec.tenKhachHang}`,
            });
          }
        }
        for (const qId of plan.affectedQuotationIds) {
          await quoteRepo.update(qId, {
            customerId: plan.masterCustomer.id,
            maKh: plan.masterCustomer.maKh,
          });
        }
        for (const cId of plan.affectedContractIds) {
          await contractRepo.update(cId, {
            customerId: plan.masterCustomer.id,
            maKh: plan.masterCustomer.maKh,
          });
        }
        for (const pId of plan.affectedBillingIds) {
          await paymentRepo.update(pId, {
            customerId: plan.masterCustomer.id,
            maKh: plan.masterCustomer.maKh,
          });
        }
        for (const dId of plan.affectedDeliveryIds) {
          await deliveryRepo.update(dId, {
            customerId: plan.masterCustomer.id,
            maKh: plan.masterCustomer.maKh,
          });
        }
      }

      // Clear caches and sync
      clearSwrColCache('customers');
      clearSwrColCache('quotations');
      clearSwrColCache('contracts');
      clearSwrColCache('payments');
      clearSwrColCache('deliveries');
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'customers' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'quotations' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'contracts' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'payments' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'deliveries' });

      notify.success(
        `Đã gộp thành công ${group.secondaryCustomers.map(s => s.maKh).join(', ')} vào ${plan.masterCustomer.maKh}! Bảo toàn 100% chứng từ lịch sử & tích hợp ${plan.updatedMasterCustomer.contacts?.length || 0} đầu mối.`
      );

      onConsolidationSuccess?.();
      onClose();
    } catch (err: any) {
      notify.error('Lỗi khi thực hiện gộp khách hàng: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRollback = async (auditLogId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hoàn tác lần gộp này? Tất cả khách hàng phụ và chứng từ liên quan sẽ được khôi phục nguyên trạng ban đầu.')) {
      return;
    }
    setRollingBackId(auditLogId);
    try {
      const msg = await MergeCustomer.rollback(auditLogId, user?.email || undefined);
      notify.success(msg);
      await loadHistory();
      clearSwrColCache('customers');
      clearSwrColCache('quotations');
      clearSwrColCache('contracts');
      clearSwrColCache('payments');
      clearSwrColCache('deliveries');
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'customers' });
      crossTabSync.broadcast({ type: 'COLLECTION_REFRESH', collectionName: 'quotations' });
      onConsolidationSuccess?.();
    } catch (err: any) {
      notify.error('Lỗi khi hoàn tác: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setRollingBackId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-slate-50 to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Hệ Thống Gom Khách Hàng Trùng MST (Sovereign MDM)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                  {duplicateGroups.length} nhóm trùng
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Gom nhóm pháp nhân MST 10 số • Bảo toàn 100% chứng từ lịch sử • Hỗ trợ hoàn tác 1-Click
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab & Filter Bar */}
        <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitMerge size={13} />
              Cần Xử Lý ({duplicateGroups.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-blue-700 font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={13} />
              Nhật Ký & Hoàn Tác
            </button>
          </div>

          {activeTab === 'pending' && duplicateGroups.length > 0 && (
            <div className="relative w-64">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm MST, tên công ty..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedGroupIndex(0);
                }}
                className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500"
              />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'history' ? (
            /* Tab History & Rollback */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <History size={14} className="text-blue-600" />
                  Lịch Sử Các Lần Gộp Khách Hàng Gần Đây
                </h3>
                <button
                  type="button"
                  onClick={loadHistory}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw size={12} className={isLoadingHistory ? 'animate-spin' : ''} />
                  Làm mới
                </button>
              </div>

              {isLoadingHistory ? (
                <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                  <RefreshCw size={14} className="animate-spin" /> Đang tải lịch sử gộp...
                </div>
              ) : mergeHistory.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                  Chưa có lần gộp khách hàng nào được ghi nhận trong hệ thống.
                </div>
              ) : (
                <div className="space-y-3">
                  {mergeHistory.map((item: any) => {
                    const d = item.details || {};
                    const isRolledBack = Boolean(d.rolledBackAt);
                    const formattedDate = item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : '—';
                    const secCount = (d.secondaryIds || []).length;
                    const quoCount = d.affectedDocuments?.quotations?.length || 0;
                    const contractCount = d.affectedDocuments?.contracts?.length || 0;

                    return (
                      <div 
                        key={item.id}
                        className={`p-4 rounded-xl border text-xs transition-all ${
                          isRolledBack 
                            ? 'bg-slate-50/60 border-slate-200 opacity-60' 
                            : 'bg-white border-slate-200 shadow-xs hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                Master: <span className="font-mono text-blue-700">{d.masterMaKh || d.masterId}</span>
                              </span>
                              <span>•</span>
                              <span className="text-slate-500">{formattedDate}</span>
                              <span>•</span>
                              <span className="text-slate-500">Bởi: {item.userEmail || item.userId || 'Hệ thống'}</span>
                              {isRolledBack ? (
                                <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">
                                  ĐÃ HOÀN TÁC
                                </span>
                              ) : (
                                <span className="text-3xs font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                  ĐANG HIỆU LỰC
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600">
                              Đã gộp <strong className="text-slate-800">{secCount} hồ sơ phụ</strong> (Mã: {(d.secondaryIds || []).join(', ')}) • 
                              Liên kết: {quoCount} báo giá, {contractCount} hợp đồng.
                            </p>
                            {isRolledBack && d.rolledBackAt && (
                              <p className="text-3xs text-slate-400 italic">
                                Đã hoàn tác lúc {new Date(d.rolledBackAt).toLocaleString('vi-VN')} bởi {d.rolledBackBy || 'Người dùng'}
                              </p>
                            )}
                          </div>

                          {!isRolledBack && (
                            <Button
                              variant="ghost"
                              size="xs"
                              disabled={rollingBackId === item.id}
                              onClick={() => handleRollback(item.id)}
                              className="text-amber-700 hover:text-amber-900 hover:bg-amber-50 border border-amber-200 font-bold shrink-0 flex items-center gap-1.5 cursor-pointer"
                            >
                              {rollingBackId === item.id ? (
                                <>
                                  <RefreshCw size={12} className="animate-spin" /> Đang hoàn tác...
                                </>
                              ) : (
                                <>
                                  <RotateCcw size={12} /> Hoàn Tác (Rollback)
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Tab Pending Merge */
            duplicateGroups.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Không có khách hàng trùng Mã Số Thuế</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Danh bạ dữ liệu khách hàng hiện tại đã hoàn toàn sạch sẽ, không phát hiện mã số thuế 10 số nào bị nhân bản bản ghi.
                </p>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                Không tìm thấy nhóm trùng nào khớp với từ khóa "{searchQuery}".
              </div>
            ) : (
              <div className="space-y-5">
                {/* Group Selector Tabs if multiple */}
                {filteredGroups.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
                    {filteredGroups.map((g, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedGroupIndex(idx)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                          (selectedGroupIndex === idx || (!filteredGroups[selectedGroupIndex] && idx === 0))
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Building2 size={13} />
                        <span className="font-mono">{g.taxCode}</span>
                        <span className="text-3xs opacity-80">({g.allCustomersInGroup.length} bản ghi)</span>
                      </button>
                    ))}
                  </div>
                )}

                {currentGroup && (
                  <div className="space-y-4">
                    {/* Zero-Trust Notice & Overview Card */}
                    <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
                      <div className="flex items-center justify-between">
                        <div className="font-bold flex items-center gap-2">
                          <AlertCircle size={16} className="text-blue-600" />
                          <span>MST: <strong className="font-mono text-sm text-blue-900">{currentGroup.taxCode}</strong></span>
                          <span>•</span>
                          <span>{currentGroup.allCustomersInGroup.length} hồ sơ trùng lặp</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md border border-blue-200 text-2xs font-bold text-blue-800 shadow-2xs">
                          <Lock size={12} className="text-blue-600" />
                          Bảo toàn 100% Chứng Từ Lịch Sử (Zero-Trust)
                        </div>
                      </div>
                      <p className="text-blue-800 leading-relaxed text-2xs">
                        Hệ thống sẽ chuyển giao liên kết quản trị vào hồ sơ Master <strong>{currentGroup.masterCustomer.maKh}</strong>.
                        Mọi số điện thoại, người nhận hàng và chi tiết đã chốt trên Báo giá/Hợp đồng cũ được <strong>niêm phong bất biến</strong>.
                      </p>
                    </div>

                    {/* Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Master Card */}
                      <div className="p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-600 text-white tracking-wider flex items-center gap-1">
                            <CheckCircle2 size={11} /> Hồ sơ Master (Giữ lại)
                          </span>
                          <span className="font-mono font-bold text-xs text-emerald-900 bg-white px-2 py-0.5 rounded border border-emerald-200">
                            {currentGroup.masterCustomer.maKh}
                          </span>
                        </div>

                        <div>
                          <span className="text-3xs text-slate-400 uppercase font-bold block mb-0.5">Tên doanh nghiệp</span>
                          <p className="font-bold text-xs text-slate-900 leading-snug">{currentGroup.masterCustomer.tenKhachHang}</p>
                        </div>

                        <div className="text-xs space-y-1 pt-1 border-t border-emerald-100">
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-3xs uppercase font-bold">Người đại diện:</span>
                            <span className="font-semibold text-slate-800">{currentGroup.masterCustomer.nguoiDaiDien || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-3xs uppercase font-bold">Số điện thoại:</span>
                            <span className="font-mono font-medium text-blue-700">{currentGroup.masterCustomer.sdt || '—'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500 text-3xs uppercase font-bold">Địa chỉ:</span>
                            <span className="text-slate-700 truncate">{currentGroup.masterCustomer.diaChi || '—'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Secondary Customers */}
                      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-700 tracking-wider">
                            Bản ghi phụ ({currentGroup.secondaryCustomers.length}) (Sẽ gộp)
                          </span>
                        </div>

                        <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                          {currentGroup.secondaryCustomers.map((sec, idx) => {
                            const similarity = calculateBusinessNameSimilarity(currentGroup.masterCustomer.tenKhachHang, sec.tenKhachHang);
                            const hasLowSimilarity = similarity < 0.4;

                            return (
                              <div key={sec.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-slate-700 text-2xs">{sec.maKh}</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-3xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {sec.loaiKh || 'Doanh nghiệp'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setCustomMasterId(sec.id || sec.maKh)}
                                      className="text-3xs px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                                      title="Chỉ định bản ghi này làm Master thay thế"
                                    >
                                      <Crown size={11} className="text-amber-500" />
                                      <span>Đặt làm Master</span>
                                    </button>
                                  </div>
                                </div>
                                <p className="font-medium text-slate-800 line-clamp-1">{sec.tenKhachHang}</p>
                                
                                {hasLowSimilarity && (
                                  <div className="flex items-center gap-1 text-3xs text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-semibold">
                                    <AlertTriangle size={11} className="shrink-0" />
                                    <span>Tên có sự khác biệt (Độ khớp: {Math.round(similarity * 100)}%)</span>
                                  </div>
                                )}

                                <div className="text-3xs text-slate-600 flex items-center gap-2 pt-0.5">
                                  <span>👤 {sec.nguoiDaiDien || 'Không tên'}</span>
                                  <span>•</span>
                                  <span className="font-mono text-blue-700">{sec.sdt || 'Không SĐT'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Forensic Impact Summary Metrics Banner - Sovereign MDM Apex */}
                    {currentPlan?.impactSummary && (
                      <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-xl shadow-xs border border-slate-700 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" />
                            Ma Trận Tác Động Dữ Liệu Chuyển Giao (Omni-Impact Matrix)
                          </span>
                          <span className="text-3xs text-blue-300 font-mono">
                            Bảo toàn 100% chứng từ lịch sử
                          </span>
                        </div>

                        {/* TẦNG 1: TÀI SẢN MASTER SỞ HỮU SẴN */}
                        {currentPlan.masterOwnedSummary && (
                          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-800/90 rounded-lg border border-slate-700/80 text-2xs text-slate-300">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 size={12} /> Master {currentGroup.masterCustomer.maKh} hiện có:
                              </span>
                              <span>
                                <strong className="text-white font-mono">{currentPlan.masterOwnedSummary.quotationsCount}</strong> Báo giá {currentPlan.masterOwnedSummary.totalQuotationValue > 0 && `(${formatCurrency(currentPlan.masterOwnedSummary.totalQuotationValue)})`}
                              </span>
                              <span className="text-slate-500">•</span>
                              <span>
                                <strong className="text-white font-mono">{currentPlan.masterOwnedSummary.contractsCount}</strong> Hợp đồng {currentPlan.masterOwnedSummary.totalContractValue > 0 && `(${formatCurrency(currentPlan.masterOwnedSummary.totalContractValue)})`}
                              </span>
                              <span className="text-slate-500">•</span>
                              <span>
                                <strong className="text-white font-mono">{currentPlan.masterOwnedSummary.billingsCount}</strong> Phiếu thu ({currentPlan.masterOwnedSummary.paymentInstallmentsCount} đợt)
                              </span>
                              <span className="text-slate-500">•</span>
                              <span>
                                <strong className="text-white font-mono">{currentPlan.masterOwnedSummary.deliveriesCount}</strong> Đơn giao ({currentPlan.masterOwnedSummary.deliveryShipmentsCount} đợt PXK)
                              </span>
                            </div>
                            <span className="text-3xs font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/80">
                              Đang liên kết trực tiếp
                            </span>
                          </div>
                        )}

                        {/* TẦNG 2: TÀI SẢN CHUYỂN GIAO TỪ HỒ SƠ PHỤ */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                            <span className="text-3xs uppercase font-medium text-slate-400 block">Báo giá di chuyển</span>
                            <span className="text-sm font-black font-mono text-blue-300">
                              {currentPlan.transferringSummary.quotationsCount}
                            </span>
                            {currentPlan.transferringSummary.quotationsCount > 0 ? (
                              <span className="text-3xs text-blue-200 font-mono block truncate font-semibold">
                                {formatCurrency(currentPlan.transferringSummary.totalQuotationValue)}
                              </span>
                            ) : (
                              <span className="text-3xs text-slate-400 font-mono block truncate">
                                {currentPlan.masterOwnedSummary.quotationsCount > 0 ? 'Đã quy tụ tại Master' : 'Chưa phát sinh'}
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                            <span className="text-3xs uppercase font-medium text-slate-400 block">Hợp đồng pháp lý</span>
                            <span className="text-sm font-black font-mono text-emerald-400">
                              {currentPlan.transferringSummary.contractsCount}
                            </span>
                            {currentPlan.transferringSummary.contractsCount > 0 ? (
                              <span className="text-3xs text-emerald-200 font-mono block truncate font-semibold">
                                {formatCurrency(currentPlan.transferringSummary.totalContractValue)}
                              </span>
                            ) : (
                              <span className="text-3xs text-slate-400 font-mono block truncate">
                                {currentPlan.masterOwnedSummary.contractsCount > 0 ? 'Đã quy tụ tại Master' : 'Chưa phát sinh'}
                              </span>
                            )}
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                            <span className="text-3xs uppercase font-medium text-slate-400 block">Phiếu thu & Các đợt thu</span>
                            <span className="text-sm font-black font-mono text-amber-300">
                              {currentPlan.transferringSummary.billingsCount}
                            </span>
                            <span className="text-3xs text-amber-200 font-mono block truncate">
                              {currentPlan.transferringSummary.billingsCount > 0 
                                ? `${currentPlan.transferringSummary.paymentInstallmentsCount} đợt • ${formatCurrency(currentPlan.transferringSummary.totalBillingAmount)}`
                                : (currentPlan.masterOwnedSummary.billingsCount > 0 ? 'Đã quy tụ tại Master' : 'Chưa phát sinh')}
                            </span>
                          </div>
                          <div className="bg-slate-800/80 p-2 rounded-lg border border-slate-700/60">
                            <span className="text-3xs uppercase font-medium text-slate-400 block">Đợt giao & Xuất kho PXK</span>
                            <span className="text-sm font-black font-mono text-purple-300">
                              {currentPlan.transferringSummary.deliveriesCount}
                            </span>
                            <span className="text-3xs text-purple-200 font-mono block truncate">
                              {currentPlan.transferringSummary.deliveriesCount > 0
                                ? `${currentPlan.transferringSummary.deliveryShipmentsCount} đợt PXK • ${currentPlan.impactSummary.contactsMergedCount} xưởng`
                                : (currentPlan.masterOwnedSummary.deliveriesCount > 0 ? `${currentPlan.impactSummary.contactsMergedCount} xưởng bảo toàn` : 'Chưa phát sinh')}
                            </span>
                          </div>
                        </div>

                        {/* TẦNG 3: TỔNG HỢP NHẤT TOÀN DIỆN SAU GỘP */}
                        {currentPlan.combinedSummary && (
                          <div className="text-center pt-1 border-t border-slate-800 text-3xs text-slate-400 font-mono">
                            Tổng hợp nhất sau gộp: <strong className="text-blue-300">{currentPlan.combinedSummary.quotationsCount} BG</strong> ({formatCurrency(currentPlan.combinedSummary.totalQuotationValue)}) • <strong className="text-emerald-300">{currentPlan.combinedSummary.contractsCount} HĐ</strong> • <strong className="text-amber-300">{currentPlan.combinedSummary.billingsCount} Phiếu thu</strong> ({currentPlan.combinedSummary.paymentInstallmentsCount} đợt) • <strong className="text-purple-300">{currentPlan.combinedSummary.deliveriesCount} Đơn giao</strong> ({currentPlan.combinedSummary.deliveryShipmentsCount} đợt PXK)
                          </div>
                        )}
                      </div>
                    )}

                    {/* Preview Merged Result */}
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                          <Users size={14} className="text-blue-600" />
                          Dự kiến danh sách Đầu Mối Liên Hệ sau khi gộp ({currentPlan?.updatedMasterCustomer?.contacts?.length || currentGroup.distinctContactsCount} đầu mối)
                        </h4>
                        <span className="text-3xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 size={11} /> Đã khử trùng số điện thoại
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {(currentPlan?.updatedMasterCustomer?.contacts || []).map((ct, idx) => {
                          const isPrimary = idx === 0 || ct.chucVu?.includes('chính') || ct.chucVu === 'Đại diện' || ct.sdt === currentGroup.masterCustomer.sdt;
                          return (
                            <div 
                              key={idx} 
                              className={`p-2.5 rounded-lg text-xs space-y-1 border transition-all ${
                                isPrimary 
                                  ? 'bg-emerald-50/70 border-emerald-200 shadow-2xs' 
                                  : 'bg-blue-50/50 border-blue-200'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-slate-900 truncate">
                                  {ct.nguoiDaiDien || `Đầu mối ${idx + 1}`}
                                </span>
                                <span className={`text-3xs font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                  isPrimary ? 'text-emerald-700 bg-emerald-100 font-extrabold' : 'text-blue-700 bg-blue-100'
                                }`}>
                                  {isPrimary ? 'Chính' : (ct.chucVu || 'Đầu mối phụ')}
                                </span>
                              </div>
                              <span className="font-mono text-2xs text-blue-700 font-semibold block">
                                {ct.sdt || '—'}
                              </span>
                              {ct.email && (
                                <span className="text-3xs text-slate-500 truncate block">
                                  ✉️ {ct.email}
                                </span>
                              )}
                              <span className="text-3xs text-slate-500 font-medium block truncate" title={ct.chiNhanh || ''}>
                                {ct.chiNhanh || `Nguồn: ${currentGroup.masterCustomer.maKh}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            disabled={isProcessing}
          >
            Đóng
          </Button>

          {activeTab === 'pending' && currentGroup && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleMergeGroup(currentGroup)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 flex items-center gap-2 shadow-sm cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Đang gom dữ liệu...
                </>
              ) : (
                <>
                  <GitMerge size={15} />
                  Tiến Hành Gộp Nhóm MST: {currentGroup.taxCode}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
