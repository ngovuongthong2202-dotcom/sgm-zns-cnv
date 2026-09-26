// @ts-nocheck
import React, { useMemo } from 'react';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { EntityLockWarning } from '@/src/widgets/EntityLockWarning';
import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';
import { checkContractLock } from '@/src/domain/policy/lock.policy';
import { checkA5Policy } from '@/src/modules/iam';
import { notify } from '@/src/shared/utils/notify';
import { useAuth } from '@/src/modules/iam';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { Package, ScrollText } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import ProductListInput from '@/src/widgets/ProductListInput';
import { normalizeCode, normalizePersonName } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { MachineCodeChipInput } from './MachineCodeChipInput';
import { handleEnterToTab } from '@/src/shared/utils/formNavigation';
import { ContractHiddenInputs } from './ContractFormHelpers';
import { validateContractSubmit } from '../utils/contract-validation';
import { useContractForm } from '../hooks/useContractForm';
import { ContractBasisSection, ContractDefinitionSection, ContractFinanceSection, ContractCrossCheckSection } from './ContractFormSections';

export function ContractFormModal({ contract, contracts, quotations, nguoiPhuTrachList, onClose, onSave, allPayments = [], allDeliveries = [], prefillQuotation }: {
  contract: Contract | null;
  contracts: Contract[];
  quotations: Quotation[];
  nguoiPhuTrachList: string[];
  allPayments?: any[];
  allDeliveries?: any[];
  onClose: () => void;
  onSave: (data: any) => Promise<void>; 
  prefillQuotation?: any;
}) {
  const { user, userData } = useAuth();
  const { nguoiPhuTrachList: sharedNguoiPhuTrachList } = useSharedFields();
  const effectiveNguoiPhuTrachList = (nguoiPhuTrachList && nguoiPhuTrachList.length > 0) ? nguoiPhuTrachList : sharedNguoiPhuTrachList;
  
  const { canEdit, reason: lockReason } = checkA5Policy(user, userData, contract);

  const businessLock = useMemo(() => {
    if (!contract) return { locked: false };
    const myPayments = allPayments.filter(p => p.contractId === contract.id);
    const myDeliveries = allDeliveries.filter(d => d.contractId === contract.id);
    return checkContractLock(contract, myPayments, myDeliveries);
  }, [contract, allPayments, allDeliveries]);
  
  const {
    register,
    handleSubmit,
    watch,
    watchAll,
    setValue,
    errors,
    isSubmitting,
    isLockedByOther,
    setIsLockedByOther,
    draft,
    clearDraft,
    lastSavedAt,
    products,
    estimatedCompletionDate,
    existingContractsForQuo,
    setActiveQuotationDoc,
    subTotal,
    discountAmount,
    vatAmount,
    totalAmount
  } = useContractForm(contract, contracts, allPayments, allDeliveries, prefillQuotation);

  const onSubmitForm = async (data: any) => {
    try {
      // Normalize before validating
      data.soHopDong = normalizeCode(data.soHopDong);
      data.soDonHang = normalizeCode(data.soDonHang);
      data.nguoiDaiDien = normalizePersonName(data.nguoiDaiDien);
      if (data.sdt) {
        data.sdt = normalizePhoneVN(data.sdt) || data.sdt;
      }
      if (data.logTomTat) {
         data.logTomTat = data.logTomTat.trim().replace(/\s+/g, ' ');
      }
      
      const isValid = await validateContractSubmit({
        data,
        contract,
        user,
        quotations,
        existingContractsForQuo
      });
      if (!isValid) return;

      await onSave(data);
      await clearDraft();
    } catch (e: any) {
       notify.error("Lỗi lưu dữ liệu: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col h-screen overflow-hidden">
      <div 
        className="bg-slate-50 flex flex-col h-full w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header toolbar */}
        <div className="bg-slate-900 flex items-center justify-between px-6 py-3.5 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white">
                <ScrollText size={16} />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{contract ? 'Cập nhật Hợp Đồng Kinh Tế' : 'Khởi tạo Hợp Đồng Mới'}</h2>
                <div className="text-2xs text-slate-500 font-semibold flex items-center gap-2">
                   <span>Mã nhận diện: {watchAll.soHopDong || 'HĐ-XXXX-XXXX'}</span>
                </div>
             </div>
          </div>
          <Button 
             aria-label="Đóng"  
             onClick={onClose} 
             className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors border-none"
             variant="ghost"
          >
             <span className="text-xl">&times;</span>
          </Button>
        </div>

        {!canEdit && (
          <div className="px-6 pt-3 shrink-0">
            <div className="bg-orange-50 text-orange-800 p-3 flex items-center gap-2 text-sm border border-orange-200 rounded-lg">
              <ScrollText size={16} />
              <span>{lockReason}</span>
            </div>
          </div>
        )}

        {contract?.id && (
          <div className="px-6 pt-3 shrink-0">
             <EntityLockWarning entityType="contracts" entityId={contract?.id} onLockStateChange={setIsLockedByOther} />
             <EntityBusinessLockWarning locked={businessLock.locked} reason={businessLock.reason} blockingDocuments={businessLock.blockingDocuments} />
          </div>
        )}

        {/* 1-Screen Scrollable Body */}
        <form 
          id="contractForm" 
          onKeyDown={handleEnterToTab}
          onSubmit={handleSubmit(onSubmitForm, (err) => {
            notify.error("Vui lòng kiểm tra lại các trường bắt buộc.");
            console.warn("Contract form validation failures:", err);
          })} 
          className="flex-1 overflow-y-auto w-full px-6 lg:px-8 py-8 pb-32 scrollbar-thin"
        >
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* Cột trái (Panel 1 & 2) */}
            <div className="flex-1 flex flex-col gap-6 min-w-0">
              <ContractBasisSection
                watch={watch}
                setValue={setValue}
                setActiveQuotationDoc={setActiveQuotationDoc}
                quotations={quotations}
                contracts={contracts}
                contract={contract}
                errors={errors}
                businessLock={businessLock}
              />
              <ContractDefinitionSection
                register={register}
                errors={errors}
                estimatedCompletionDate={estimatedCompletionDate}
                nguoiPhuTrachList={effectiveNguoiPhuTrachList}
                businessLock={businessLock}
                watch={watch}
              />
            </div>

            {/* Cột phải (Panel 4) */}
            <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">
              <ContractFinanceSection
                subTotal={subTotal}
                discountAmount={discountAmount}
                vatAmount={vatAmount}
                totalAmount={totalAmount}
              />
              <ContractCrossCheckSection
                watchAll={watchAll}
                estimatedCompletionDate={estimatedCompletionDate}
              />
            </div>

          </div>

          {/* Section 3: Sản phẩm (Full width) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Package className="text-slate-900 w-4 h-4" />
                <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wide">
                  3. Danh mục sản phẩm cung cấp
                </h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-sm font-mono tracking-widest">
                TỔNG SL: {watchAll.slMay || 0} {watchAll.dvt || 'Máy'}
              </span>
            </div>

            <div className="overflow-x-auto mb-6">
              <ProductListInput 
                products={products} 
                disabled={businessLock.locked}
                onChange={(newProducts) => {
                  setValue('products', newProducts, { shouldDirty: true });
                  const allSerials = Array.from(new Set(newProducts.flatMap(p => p.danhSachMaMay || [])));
                  if (allSerials.length > 0) {
                    setValue('danhSachMaMay', allSerials, { shouldDirty: true });
                  }
                }} 
                showPrice={true}
                showFinance={true}
                showBaoHanh={true}
                baseDateForBaoHanh={watchAll.ngayKyHopDong || watchAll.ngayTao || new Date().toISOString().split('T')[0]}
                showSerial={true}
                allContracts={contracts}
              />
            </div>

            <div className="space-y-2 border-t border-slate-100 pt-5">
              <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">
                Tổng hợp Mã Máy / Serial Toàn Hợp Đồng
              </label>
              <MachineCodeChipInput 
                value={watchAll.danhSachMaMay || []}
                onChange={(newVal) => setValue('danhSachMaMay', newVal, { shouldDirty: true })}
                allContracts={contracts}
              />
              <p className="text-2xs text-slate-500 font-medium">Nhập trực tiếp trên từng dòng máy ở bảng sản phẩm hoặc ghim bổ sung tại đây để đối soát khi lập phiếu giao hàng.</p>
            </div>
          </div>

          <ContractHiddenInputs register={register} />
        </form>

        {/* Sticky Form Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/90 backdrop-blur shrink-0 flex items-center justify-between z-10 sticky bottom-0 w-full">
          <div className="flex items-center gap-3">
             {lastSavedAt && (
               <div className="text-2xs text-slate-500 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Đã tự động lưu nháp lúc {lastSavedAt.toLocaleTimeString('vi-VN')}</span>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-3">
            <Button aria-label="Hủy" type="button" onClick={onClose} variant="ghost" className="px-4 py-1.5 hover:bg-slate-200 text-sm font-medium text-slate-600 rounded-lg transition-colors border-none">
              Hủy bỏ
            </Button>

            <Button aria-label="Lưu" 
              type="submit" 
              form="contractForm" 
              disabled={isSubmitting || isLockedByOther || businessLock?.locked || !canEdit} 
              className={`px-5 py-2 h-9 border-none text-white rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm ${(!canEdit || businessLock?.locked) ? 'bg-slate-400' : 'bg-blue-600'}`}
            >
              <ScrollText size={14} />
              {isSubmitting ? 'Đang lưu trữ...' : contract ? 'Lưu chỉnh sửa' : 'Ký kết hợp đồng'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
