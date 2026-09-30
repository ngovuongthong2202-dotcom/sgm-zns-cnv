import React, { useState } from 'react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { 
  detectDuplicateCustomerGroups, 
  buildConsolidationMigrationPlan, 
  DuplicateCustomerGroup 
} from '../utils/customerConsolidationEngine';
import { repositoryFactory } from '@/src/data/repositories';
import { clearSwrColCache } from '@/src/data/swr-fetchers';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { notify } from '@/src/shared/utils/notify';
import { Button } from '@/src/design-system/Button';
import { MergeCustomer } from '../../application/use-cases/MergeCustomer';
import { useAuth } from '@/src/modules/iam';
import { 
  Users, 
  GitMerge, 
  CheckCircle2, 
  Building2, 
  AlertCircle, 
  ShieldCheck, 
  Phone, 
  FileText, 
  X, 
  ArrowRight,
  RefreshCw
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

  const duplicateGroups = React.useMemo(() => {
    return detectDuplicateCustomerGroups(customers, quotations);
  }, [customers, quotations]);

  if (!isOpen) return null;

  const currentGroup: DuplicateCustomerGroup | undefined = duplicateGroups[selectedGroupIndex];

  const handleMergeGroup = async (group: DuplicateCustomerGroup) => {
    setIsProcessing(true);
    try {
      const plan = buildConsolidationMigrationPlan(
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
          nhuCauKhachHang: (plan.updatedMasterCustomer as any).ghiChu || plan.updatedMasterCustomer.nhuCauKhachHang,
        });
      }

      // 2. Thực hiện hợp nhất nguyên tử qua Backend ACID Batch
      const secondaryIds = group.secondaryCustomers.map(s => s.id).filter((id): id is string => Boolean(id));
      let backendSuccess = false;
      if (plan.masterCustomer.id) {
        try {
          await MergeCustomer.execute(plan.masterCustomer.id, secondaryIds, user?.email || undefined);
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
        `Đã gộp thành công ${group.secondaryCustomers.map(s => s.maKh).join(', ')} vào ${plan.masterCustomer.maKh}! Bảo toàn ${plan.updatedMasterCustomer.contacts?.length || 0} đầu mối & chuyển giao ${plan.affectedQuotationIds.length} báo giá.`
      );

      onConsolidationSuccess?.();
      onClose();
    } catch (err: any) {
      notify.error('Lỗi khi thực hiện gộp khách hàng: ' + (err?.message || 'Lỗi không xác định'));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/70 via-slate-50 to-indigo-50/40">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
              <GitMerge size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Hệ Thống Gom Khách Hàng Trùng MST (MDM Consolidation)
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-mono">
                  {duplicateGroups.length} nhóm trùng
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Gộp các hồ sơ cùng MST 10 số, bảo toàn 100% đầu mối liên hệ vào contacts & phân quyền Báo giá rõ ràng
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {duplicateGroups.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Không có khách hàng trùng Mã Số Thuế</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Danh bạ dữ liệu khách hàng hiện tại đã hoàn toàn sạch sẽ, không phát hiện mã số thuế 10 số nào bị nhân bản bản ghi.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Group Selector Tabs if multiple */}
              {duplicateGroups.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-100">
                  {duplicateGroups.map((g, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedGroupIndex(idx)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap ${
                        selectedGroupIndex === idx
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
                  {/* Overview Card */}
                  <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
                    <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold flex items-center gap-2">
                        MST: <span className="font-mono text-sm font-black text-amber-950">{currentGroup.taxCode}</span>
                        <span>•</span>
                        <span>{currentGroup.allCustomersInGroup.length} khách hàng trùng</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        Hệ thống sẽ hợp nhất vào hồ sơ chính <strong>{currentGroup.masterCustomer.maKh}</strong> ({currentGroup.masterCustomer.tenKhachHang}). Toàn bộ đầu mối liên hệ từ các bản ghi phụ sẽ được tích hợp vào danh sách <code>contacts</code> để mỗi Báo giá vẫn hiển thị chính xác đầu mối phụ trách tương ứng.
                      </p>
                    </div>
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
                        {currentGroup.secondaryCustomers.map((sec, idx) => (
                          <div key={sec.id || idx} className="p-2.5 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-700 text-2xs">{sec.maKh}</span>
                              <span className="text-3xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {sec.loaiKh || 'Doanh nghiệp'}
                              </span>
                            </div>
                            <p className="font-medium text-slate-800 line-clamp-1">{sec.tenKhachHang}</p>
                            <div className="text-3xs text-slate-600 flex items-center gap-2 pt-0.5">
                              <span>👤 {sec.nguoiDaiDien || 'Không tên'}</span>
                              <span>•</span>
                              <span className="font-mono text-blue-700">{sec.sdt || 'Không SĐT'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Preview Merged Result */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <Users size={14} className="text-blue-600" />
                      Dự kiến danh sách Đầu Mối Liên Hệ sau khi gộp ({currentGroup.distinctContactsCount} đầu mối)
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {/* Master contact */}
                      {currentGroup.masterCustomer.nguoiDaiDien && (
                        <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-lg text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-emerald-950">{currentGroup.masterCustomer.nguoiDaiDien}</span>
                            <span className="text-3xs font-extrabold text-emerald-700 bg-emerald-100 px-1 rounded">Chính</span>
                          </div>
                          <span className="font-mono text-2xs text-blue-700 block">{currentGroup.masterCustomer.sdt || '—'}</span>
                          <span className="text-3xs text-slate-500 block">Nguồn: {currentGroup.masterCustomer.maKh}</span>
                        </div>
                      )}

                      {/* Secondary contacts */}
                      {currentGroup.secondaryCustomers.map((sec, idx) => (
                        <div key={idx} className="p-2.5 bg-blue-50/50 border border-blue-200 rounded-lg text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{sec.nguoiDaiDien || `Đầu mối ${idx + 1}`}</span>
                            <span className="text-3xs font-bold text-blue-700 bg-blue-100 px-1 rounded">Đầu mối phụ</span>
                          </div>
                          <span className="font-mono text-2xs text-blue-700 block">{sec.sdt || '—'}</span>
                          <span className="text-3xs text-slate-500 block">Nguồn: {sec.maKh}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
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

          {currentGroup && (
            <Button
              variant="primary"
              size="sm"
              disabled={isProcessing}
              onClick={() => handleMergeGroup(currentGroup)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-9 px-4 flex items-center gap-2 shadow-sm"
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
