 
import React from 'react';
import { notify } from '@/src/shared/utils/notify';
import { motion } from 'motion/react';
import { Customer } from '@/src/domain/schema/customer.schema';
import { EntityLockWarning } from '@/src/widgets/EntityLockWarning';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { Button } from '@/src/design-system/Button';
import { useConfirm } from '@/src/design-system/Confirm';
import { Building2, Lock, X } from 'lucide-react';
import { checkA5Policy } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';
import { normalizeCustomerFormValues } from "./CustomerFormHelpers";
import { handleEnterToTab } from '@/src/shared/utils/formNavigation';
import { CustomerContactsArray } from "./CustomerContactsArray";
import { useCustomerForm } from '../hooks/useCustomerForm';

import { CustomerFormProfileSection, CustomerFormClassificationSection, CustomerFormCrossCheckPanel } from './CustomerFormSections';
import { CustomerDedupeModal } from './CustomerDedupeModal';
import { CustomerCascadeImpactModal } from './CustomerCascadeImpactModal';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { clearSwrColCache } from '@/src/data/swr-fetchers';
import { crossTabSync } from '@/src/shared/utils/crossTabSync';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';

interface Props {
  customer: Customer | null;
  nguoiPhuTrachList: string[];
  loaiKhachHangList: string[];
  onClose: () => void;
  onSave: (data: Customer, continueCreating?: boolean) => Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
  existingCustomers?: Customer[];
}

export function CustomerForm({
  customer,
  nguoiPhuTrachList,
  loaiKhachHangList,
  onClose,
  onSave,
  hideShell = false,
  onDirtyChange,
  existingCustomers = []
}: Props & { hideShell?: boolean }) {
  const { user, userData } = useAuth();
  const { tinhThanhList } = useSharedFields();
  const PROVINCES = tinhThanhList;
  const currentUserName = (userData?.displayName || user?.displayName || userData?.username || user?.username || '').trim() || 'Ngô Vương Thông';

  const effectiveNguoiPhuTrachList = React.useMemo(() => {
    const list = [...(nguoiPhuTrachList || [])];
    if (currentUserName && !list.includes(currentUserName)) {
      list.push(currentUserName);
    }
    const currentPic = customer?.nguoiPhuTrach;
    if (currentPic && !list.includes(currentPic)) {
      list.push(currentPic);
    }
    return list;
  }, [nguoiPhuTrachList, currentUserName, customer?.nguoiPhuTrach]);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    errors,
    isSubmitting,
    isLookingUp,
    isAiFormatting,
    lookupStatus,
    isLockedByOther,
    setIsLockedByOther,
    draftStatus,
    duplicates,
    showDedupeModal,
    setShowDedupeModal,
    pendingData,
    tagInput,
    setTagInput,
    handleAddTag,
    handleRemoveTag,
    nameInputRef,
    clearDraft,
    saveDraft,
    getValues,
    isDirty,
    smartFormatNameAI,
    checkDuplicates,
    handleTaxLookup,
    generateNextMaKh,
    magicPasteUnpack,
  } = useCustomerForm(customer, onDirtyChange, PROVINCES, loaiKhachHangList, currentUserName, existingCustomers);
  const { confirm } = useConfirm();

  const [cascadeState, setCascadeState] = React.useState<{
    isOpen: boolean;
    pendingData: Customer | null;
    linkedDocs: {
      quotations: Quotation[];
      contracts: Contract[];
      payments: Payment[];
      deliveries: Delivery[];
    };
  }>({
    isOpen: false,
    pendingData: null,
    linkedDocs: { quotations: [], contracts: [], payments: [], deliveries: [] }
  });
  const [isCheckingImpact, setIsCheckingImpact] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSaveMasterOnly = async () => {
    if (!cascadeState.pendingData) return;
    const dataToSave = cascadeState.pendingData;
    setCascadeState(prev => ({ ...prev, isOpen: false }));
    await clearDraft();
    await onSave(dataToSave);
  };

  const handleSafeSync = async (scope?: import('./CustomerCascadeImpactModal').CascadeSyncScope) => {
    if (!cascadeState.pendingData || !customer?.id) return;
    setIsSyncing(true);
    try {
      const dataToSave = cascadeState.pendingData;
      const { quotations, contracts, payments, deliveries } = cascadeState.linkedDocs;
      const effectiveScope = {
        syncQuotations: scope?.syncQuotations ?? true,
        syncContracts: scope?.syncContracts ?? true,
        syncPayments: scope?.syncPayments ?? true,
        syncDeliveries: scope?.syncDeliveries ?? true,
      };

      // 1. Save master customer
      await onSave(dataToSave);

      let syncedCount = 0;

      // 2. Cascade to Quotations (All linked quotations regardless of draft/sent/won)
      if (effectiveScope.syncQuotations && quotations.length > 0) {
        const quoteRepo = repositoryFactory.get<Quotation>('quotations');
        for (const q of quotations) {
          if (q.id) {
            await quoteRepo.update(q.id, {
              tenKhachHang: dataToSave.tenKhachHang,
              sdt: dataToSave.sdt,
              diaChi: dataToSave.diaChi,
              nguoiDaiDien: dataToSave.nguoiDaiDien || dataToSave.contacts?.[0]?.nguoiDaiDien,
              tinhThanh: dataToSave.tinhThanh,
              maSoThue: dataToSave.maSoThue,
              phanLoaiKhach: dataToSave.loaiKh
            } as any);
            syncedCount++;
          }
        }
      }

      // 3. Cascade to Contracts
      if (effectiveScope.syncContracts && contracts.length > 0) {
        const contractRepo = repositoryFactory.get<Contract>('contracts');
        for (const c of contracts) {
          if (c.id) {
            await contractRepo.update(c.id, {
              tenKhachHang: dataToSave.tenKhachHang,
              sdt: dataToSave.sdt,
              diaChi: dataToSave.diaChi,
              nguoiDaiDien: dataToSave.nguoiDaiDien || dataToSave.contacts?.[0]?.nguoiDaiDien,
              tinhThanh: dataToSave.tinhThanh
            } as any);
            syncedCount++;
          }
        }
      }

      // 4. Cascade to Payments
      if (effectiveScope.syncPayments && payments.length > 0) {
        const paymentRepo = repositoryFactory.get<Payment>('payments');
        for (const p of payments) {
          if (p.id) {
            await paymentRepo.update(p.id, {
              tenKhachHang: dataToSave.tenKhachHang,
              sdt: dataToSave.sdt,
              tenNguoiNop: dataToSave.nguoiDaiDien || dataToSave.tenKhachHang,
              tinhThanh: dataToSave.tinhThanh
            } as any);
            syncedCount++;
          }
        }
      }

      // 5. Cascade to Deliveries
      if (effectiveScope.syncDeliveries && deliveries.length > 0) {
        const deliveryRepo = repositoryFactory.get<Delivery>('deliveries');
        for (const d of deliveries) {
          if (d.id) {
            await deliveryRepo.update(d.id, {
              tenKhachHang: dataToSave.tenKhachHang,
              sdt: dataToSave.sdt,
              diaChiGiaoHang: dataToSave.diaChi || d.diaChiGiaoHang,
              nguoiDaiDien: dataToSave.nguoiDaiDien || dataToSave.contacts?.[0]?.nguoiDaiDien,
              nguoiLienHe: dataToSave.contacts?.[0]?.nguoiDaiDien || dataToSave.nguoiDaiDien || d.nguoiLienHe,
              sdtLienHe: dataToSave.contacts?.[0]?.sdt || dataToSave.sdt || d.sdtLienHe,
              tinhThanh: dataToSave.tinhThanh
            } as any);
            syncedCount++;
          }
        }
      }

      // 6. Invalidate SWR Caches & Broadcast sync
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

      notify.success(`Đã cập nhật Khách Hàng và đồng bộ toàn diện ${syncedCount} chứng từ liên quan!`);
      await clearDraft();
      setCascadeState(prev => ({ ...prev, isOpen: false }));
      onClose();
    } catch (err: any) {
      notify.error(`Lỗi khi đồng bộ chứng từ: ${err?.message || err}`);
    } finally {
      setIsSyncing(false);
    }
  };


  const handleCloseAttempt = async () => {
    if (isDirty) {
      await saveDraft(getValues());
      const proceed = await confirm({
        title: 'Xác nhận đóng',
        message: 'Dữ liệu đã được lưu nháp tự động. Bạn chắc chắn muốn đóng?',
        variant: 'warning',
        confirmText: 'Đóng',
        cancelText: 'Quay lại'
      });
      if (!proceed) return;
    }
    onClose();
  };
  
  const { canEdit, reason: lockReason } = checkA5Policy(user, userData, customer);

  const tags = watch('tags') || [];

  const formContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {!canEdit && (
        <div className="px-6 pt-3 shrink-0">
          <div className="bg-orange-50 text-orange-800 p-3 flex items-center gap-2 text-sm border border-orange-200 rounded-lg">
            <Lock size={16} />
            <span>{lockReason}</span>
          </div>
        </div>
      )}
      {customer?.id && (
        <div className="px-6 pt-3 shrink-0">
          <EntityLockWarning entityType="customers" entityId={customer.id} onLockStateChange={setIsLockedByOther} />
        </div>
      )}

      {/* Main Single-Screen Form Container styled in 1 Column */}
      <form
        id="customerForm"
        autoComplete="none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            const submitBtn = document.querySelector('button[type="submit"][form="customerForm"]') as HTMLButtonElement | null;
            if (submitBtn) {
              submitBtn.click();
            }
            return;
          }
          handleEnterToTab(e);
        }}
        onSubmit={handleSubmit(
          async (data: any) => {
            if (tagInput && tagInput.trim()) {
              const pendingTag = tagInput.trim();
              if (!Array.isArray(data.tags)) data.tags = [];
              if (!data.tags.includes(pendingTag)) {
                data.tags = [...data.tags, pendingTag];
              }
              setTagInput('');
            }
            const normalized = normalizeCustomerFormValues(data);
            if (!normalized.nguoiPhuTrach) {
              normalized.nguoiPhuTrach = customer?.nguoiPhuTrach || currentUserName;
            }
            
            // Check trùng khách khi tạo mới
            if (!customer) {
               const hasDupes = await checkDuplicates(normalized);
               if (hasDupes) return; // Dừng lại, hiện modal
            }

            // Khi chỉnh sửa khách hàng đã có mã/id
            if (customer && customer.id) {
              const coreFields = ['tenKhachHang', 'nguoiDaiDien', 'sdt', 'diaChi', 'tinhThanh', 'maSoThue'] as const;
              const hasCoreChanges = coreFields.some(
                (k) => String(customer[k] || '').trim() !== String(normalized[k] || '').trim()
              );

              if (hasCoreChanges) {
                setIsCheckingImpact(true);
                try {
                  const targetKeys = [customer.id, customer.maKh].filter(Boolean) as string[];
                  const [qList, cList, pList, dList] = await Promise.all([
                    repositoryFactory.get<Quotation>('quotations').list({ fkField: 'customerId', fkId: targetKeys, limit: 100 }),
                    repositoryFactory.get<Contract>('contracts').list({ fkField: 'customerId', fkId: targetKeys, limit: 100 }),
                    repositoryFactory.get<Payment>('payments').list({ fkField: 'customerId', fkId: targetKeys, limit: 100 }),
                    repositoryFactory.get<Delivery>('deliveries').list({ fkField: 'customerId', fkId: targetKeys, limit: 100 }),
                  ]);


                  const total = qList.length + cList.length + pList.length + dList.length;
                  if (total > 0) {
                    setCascadeState({
                      isOpen: true,
                      pendingData: normalized,
                      linkedDocs: {
                        quotations: qList,
                        contracts: cList,
                        payments: pList,
                        deliveries: dList
                      }
                    });
                    setIsCheckingImpact(false);
                    return; // Mở Impact Analysis Modal để người dùng quyết định
                  }
                } catch (err) {
                  console.error('Impact check error:', err);
                } finally {
                  setIsCheckingImpact(false);
                }
              }
            }
            
            // Successful submit -> wipe form draft
            await clearDraft();
            await onSave(normalized);
          },
          (formErrors) => {
            console.error("Form Validation Errors:", formErrors);
            const errorFields = Object.keys(formErrors);
            const fieldLabels: Record<string, string> = {
              tenKhachHang: "Tên khách hàng",
              maKh: "Mã khách hàng",
              tinhThanh: "Tỉnh thành",
              diaChi: "Địa chỉ chi tiết",
              sdt: "Số điện thoại",
              nguoiPhuTrach: "Người phụ trách",
              loaiKh: "Phân loại khách hàng"
            };
            const errorMessages = errorFields
              .map(f => fieldLabels[f] || f)
              .join(', ');
            notify.error(`Không thể lưu: Vui lòng điền đúng thông tin (${errorMessages}).`);
          }
        )}
        className="flex-1 overflow-y-auto w-full px-6 lg:px-12 py-8 space-y-6 pb-28 min-h-0"
      >
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            {/* COLUMN 1: Profile pháp nhân & Vận hành */}
            <div className="space-y-6">
              <CustomerFormProfileSection 
                register={register}
                errors={errors}
                watch={watch}
                setValue={setValue}
                nameInputRef={nameInputRef}
                isAiFormatting={isAiFormatting}
                smartFormatNameAI={smartFormatNameAI}
                isLookingUp={isLookingUp}
                lookupStatus={lookupStatus}
                handleTaxLookup={handleTaxLookup}
                PROVINCES={PROVINCES}
                onMagicPaste={magicPasteUnpack}
                existingCustomers={existingCustomers}
              />
              <CustomerFormClassificationSection 
                register={register}
                errors={errors}
                watch={watch}
                nguoiPhuTrachList={effectiveNguoiPhuTrachList}
                loaiKhachHangList={loaiKhachHangList}
                tags={tags}
                tagInput={tagInput}
                setTagInput={setTagInput}
                handleAddTag={handleAddTag}
                handleRemoveTag={handleRemoveTag}
                currentUserName={currentUserName}
              />
            </div>
          </div>

          <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
            <CustomerFormCrossCheckPanel watch={watch} currentUserName={currentUserName} />
            <CustomerContactsArray 
              control={control as any} 
              register={register} 
              errors={errors} 
              setValue={setValue} 
              isIndividual={watch('loaiHinhDoanhNghiep') === 'CÁ NHÂN' || watch('loaiKh') === 'Cá nhân'}
            />
          </div>
        </div>
      </form>
    </div>
  );

  if (hideShell) {
    return (
      <>
        {formContent}
        {customer && (
          <CustomerCascadeImpactModal
            show={cascadeState.isOpen}
            onClose={() => setCascadeState(prev => ({ ...prev, isOpen: false }))}
            originalCustomer={customer}
            updatedData={cascadeState.pendingData || {}}
            linkedDocs={cascadeState.linkedDocs}
            isLoadingLinkedDocs={isCheckingImpact}
            onConfirmSaveMasterOnly={handleSaveMasterOnly}
            onConfirmSafeSync={handleSafeSync}
            isSyncing={isSyncing}
          />
        )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col h-screen overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        className="flex flex-col h-full w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 flex items-center justify-between px-6 py-3.5 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white">
              <Building2 size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider select-none">
                {customer ? 'Cập nhật Khách Hàng' : 'Tạo mới Khách Hàng'}
              </h2>
              <div className="text-2xs text-slate-500 font-semibold flex items-center gap-2 select-none">
                <span>Hệ thống phân phối & quản lý cơ sở dữ liệu SGM-ZNS OS</span>
              </div>
            </div>
          </div>
          <Button
            aria-label="Đóng"
            onClick={handleCloseAttempt}
            variant="ghost"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors border-none"
          >
            <X size={16} />
          </Button>
        </div>

        {formContent}

        <CustomerDedupeModal 
          show={showDedupeModal} 
          onClose={() => setShowDedupeModal(false)} 
          duplicates={duplicates as Customer[]} 
          pendingData={pendingData} 
          clearDraft={clearDraft} 
          onSave={onSave as any} 
          onCloseParent={onClose} 
        />

        {customer && (
          <CustomerCascadeImpactModal
            show={cascadeState.isOpen}
            onClose={() => setCascadeState(prev => ({ ...prev, isOpen: false }))}
            originalCustomer={customer}
            updatedData={cascadeState.pendingData || {}}
            linkedDocs={cascadeState.linkedDocs}
            isLoadingLinkedDocs={isCheckingImpact}
            onConfirmSaveMasterOnly={handleSaveMasterOnly}
            onConfirmSafeSync={handleSafeSync}
            isSyncing={isSyncing}
          />
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/90 backdrop-blur shrink-0 flex items-center justify-between z-10 sticky bottom-0 w-full mb-0">
          <div className="text-2xs text-slate-500 font-mono flex items-center gap-1.5">
            {draftStatus && draftStatus !== 'idle' && (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${draftStatus === 'Đang tự động lưu...' ? 'bg-slate-400 animate-pulse' : 'bg-emerald-500'}`} />
                <span>{draftStatus.replace('Đã lưu bản nháp', 'Đã tự động lưu nháp')}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              className="px-4 py-1.5 hover:bg-slate-200 text-sm font-medium text-slate-600 rounded-lg transition-colors border-none"
            >
              Hủy bỏ
            </Button>

            {!customer && (
              <Button
                type="button"
                disabled={isSubmitting || isLockedByOther || !canEdit}
                onClick={handleSubmit(async (data: any) => {
                  const normalized = normalizeCustomerFormValues(data);
                  if (!normalized.nguoiPhuTrach) {
                    normalized.nguoiPhuTrach = currentUserName;
                  }
                  const hasDupes = await checkDuplicates(normalized);
                  if (hasDupes) return;
                  await clearDraft();
                  await onSave(normalized, true);
                  // Reset form softly và cấp ngay mã mới
                  setValue('tenKhachHang', '');
                  setValue('sdt', '');
                  setValue('diaChi', '');
                  setValue('nguoiDaiDien', '');
                  setValue('nguoiPhuTrach', data.nguoiPhuTrach || currentUserName);
                  setValue('contacts', [{ nguoiDaiDien: '', sdt: '', chiNhanh: '', chucVu: '' }]);
                  await generateNextMaKh();
                  setTimeout(() => nameInputRef?.current?.focus(), 100);
                })}
                variant="secondary"
                className="px-4 py-1.5 text-sm font-bold text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100 rounded-lg transition-colors border hidden md:block"
              >
                Lưu & Tạo tiếp
              </Button>
            )}

            <Button
              type="submit"
              form="customerForm"
              disabled={isSubmitting || isLockedByOther || !canEdit}
              className={`px-5 py-2 h-9 border-none text-white rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm ${!canEdit ? 'bg-slate-400' : 'bg-blue-600'}`}
            >
              {isSubmitting ? 'Đang lưu...' : customer ? 'Lưu thay đổi' : 'Tạo khách hàng'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
