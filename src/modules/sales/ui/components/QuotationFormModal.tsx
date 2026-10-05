import React, { useState } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { FileText, X, Package, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useConfirm } from '@/src/design-system/Confirm';
import { QuotationProductsArray } from './QuotationProductsArray';
import { EntityLockWarning } from '@/src/widgets/EntityLockWarning';
import { Button } from '@/src/design-system/Button';

import { QuotationBasicInfoSection, QuotationRightSidebar } from './QuotationFormSections';
import { normalizeQuotationFormValues } from './QuotationFormHelpers';

import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';
import { handleEnterToTab } from '@/src/shared/utils/formNavigation';

import { useSharedFields } from '@/src/hooks/useSharedFields';
import { useQuotationForm, evaluateQuotationHierarchy, HierarchyEvaluation } from '../hooks/useQuotationForm';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { QuotationTypeDoubleCheckModal } from './QuotationTypeDoubleCheckModal';
import { ErpCustomerIngestionModal } from './ErpCustomerIngestionModal';
import { QuickCustomerModal, QuickCustomerInitialData } from '@/src/modules/customers/ui/components/QuickCustomerModal';

interface Props {
  quotation: Quotation | null;
  quotations: Quotation[];
  customers: import('@/src/domain/schema/customer.schema').Customer[]; 
  nguoiPhuTrachList: string[];
  loaiBaoGiaList: string[];
  loaiKhachHangList: string[];
  onClose: () => void;
  onSave: (data: import('@/src/domain/schema/quotation.schema').Quotation) => Promise<void>; 
  allContracts?: any[];
  allPayments?: any[];
  allDeliveries?: any[];
}

export function QuotationFormModal({ quotation, quotations, customers = [], nguoiPhuTrachList, onClose, onSave, allContracts = [], allPayments = [], allDeliveries = [] }: Props) {
  const [isLockedByOther, setIsLockedByOther] = React.useState(false);
  const { loaiBaoGiaList, nguoiPhuTrachList: sharedNguoiPhuTrachList } = useSharedFields();
  const effectiveNguoiPhuTrachList = (nguoiPhuTrachList && nguoiPhuTrachList.length > 0) ? nguoiPhuTrachList : sharedNguoiPhuTrachList;
  const { confirm } = useConfirm();
  
  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    errors,
    isSubmitting,
    isDirty,
    
    canEdit,
    lockReason,
    businessLock,
    
    lookupErp,
    isLookingUp,
    isErpLocked,
    setIsErpLocked,
    unmatchedErpCustomer,
    setUnmatchedErpCustomer,
    
    lastSavedAt,
    clearDraft,
    saveDraft,
    
    aggs,
    products,
    ngayHetHan
  } = useQuotationForm({
    quotation,
    quotations,
    customers,
    allContracts,
    allPayments,
    allDeliveries
  });

  const isCreating = !quotation?.id;
  const watchAll = watch();

  const [isSaving, setIsSaving] = useState(false);
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);
  const [quickCustomerInitial, setQuickCustomerInitial] = useState<QuickCustomerInitialData | undefined>(undefined);

  const [doubleCheckData, setDoubleCheckData] = useState<{
    isOpen: boolean;
    pendingData: import('@/src/domain/schema/quotation.schema').Quotation | null;
    evaluation: HierarchyEvaluation | null;
  }>({
    isOpen: false,
    pendingData: null,
    evaluation: null
  });

  const submitForm = async (data: import('@/src/domain/schema/quotation.schema').Quotation) => {
    setIsSaving(true);
    try {
      const normalizedData = normalizeQuotationFormValues(data);

      if (normalizedData.ngayHetHan && normalizedData.ngayBaoGia && normalizedData.ngayHetHan < normalizedData.ngayBaoGia) {
        notify.error("Ngày hết hạn không thể đi trước ngày lập báo giá.");
        return;
      }

      // Tự động tạo snapshot lịch sử (Price Revisions Engine) khi cập nhật báo giá đã có dữ liệu sản phẩm
      if (quotation?.id && quotation.products && quotation.products.length > 0) {
        const isModified = 
          JSON.stringify(quotation.products) !== JSON.stringify(normalizedData.products) ||
          quotation.totalAmount !== normalizedData.totalAmount ||
          quotation.discountAmount !== normalizedData.discountAmount ||
          quotation.vatAmount !== normalizedData.vatAmount;

        if (isModified) {
          const revCount = (quotation.revisions || []).length;
          const autoRevision = {
            id: crypto.randomUUID(),
            name: `Phiên bản tự động #${revCount + 1}`,
            note: 'Lưu tự động trước khi cập nhật bảng giá/sản phẩm mới',
            createdAt: new Date().toISOString(),
            createdBy: 'Hệ thống tự động',
            products: quotation.products,
            subTotal: quotation.subTotal || 0,
            discountRate: Number(quotation.discountRate) || 0,
            discountAmount: quotation.discountAmount || 0,
            vatRate: Number(quotation.vatRate) || 0,
            vatAmount: quotation.vatAmount || 0,
            totalAmount: quotation.totalAmount || 0,
          };
          const cleanRev = Object.fromEntries(Object.entries(autoRevision).filter(([_, v]) => v !== undefined));
          normalizedData.revisions = [...(quotation.revisions || []), cleanRev as any];
        }
      }

      await onSave(normalizedData);
      await clearDraft();
    } catch (err: unknown) {
      notify.error((err as Error)?.message || 'Lỗi khi lưu báo giá');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreSubmit = async (data: import('@/src/domain/schema/quotation.schema').Quotation) => {
    const evalResult = evaluateQuotationHierarchy(data.products || [], data.loai || data.loaiBaoGia);
    if (evalResult.isDiscrepancy) {
      setDoubleCheckData({
        isOpen: true,
        pendingData: data,
        evaluation: evalResult
      });
      return;
    }
    await submitForm(data);
  };

  const formatValidationErrors = (err: Record<string, any>): string => {
    const messages: string[] = [];
    const fieldLabels: Record<string, string> = {
      customerId: 'Khách hàng',
      soPhieuBaoGia: 'Số phiếu báo giá',
      loai: 'Phân loại báo giá',
      slMay: 'Tổng số lượng',
      hieuLuc: 'Thời hạn hiệu lực',
      ngayBaoGia: 'Ngày báo giá',
      products: 'Danh mục sản phẩm',
    };

    Object.entries(err).forEach(([key, val]: [string, any]) => {
      if (!val) return;
      const label = fieldLabels[key] || key;
      if (val.message) {
        messages.push(`${label}: ${val.message}`);
      } else if (Array.isArray(val)) {
        val.forEach((itemErr, i) => {
          if (itemErr) {
            Object.entries(itemErr).forEach(([subKey, subVal]: [string, any]) => {
              if (subVal?.message) {
                messages.push(`SP #${i + 1} (${subKey}): ${subVal.message}`);
              }
            });
          }
        });
      } else if (typeof val === 'object' && val.message) {
        messages.push(`${label}: ${val.message}`);
      }
    });

    if (messages.length === 0) return 'Vui lòng rà soát lại các trường thông tin bắt buộc còn thiếu.';
    return messages.slice(0, 3).join(' | ');
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 overflow-hidden">
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         exit={{ opacity: 0 }}
         className="w-full h-full flex flex-col relative"
      >
        {/* Header Toolbar - Fixed top, full width */}
        <div className="bg-slate-900 flex items-center justify-between px-6 py-3.5 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white">
                <FileText size={16} />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{quotation ? 'Cập nhật Báo Giá' : 'Khởi tạo Báo Giá mới'}</h2>
                <div className="text-2xs text-slate-500 font-semibold flex items-center gap-2">
                   <span>Hệ thống phân phối & quản lý cơ sở dữ liệu SGM-ZNS OS</span>
                </div>
             </div>
          </div>
          <Button 
             aria-label="Đóng"  
             onClick={async () => {
               if (isDirty) {
                 await saveDraft(getValues());
                 const proceed = await confirm({
                   title: 'Xác nhận đóng',
                   message: 'Dữ liệu chỉnh sửa sẽ được lưu nháp để tiếp tục sau. Bạn chắc chắn muốn đóng và thoát khỏi màn hình lập báo giá?',
                   variant: 'warning',
                   confirmText: 'Đóng & Lưu nháp',
                   cancelText: 'Quay lại soạn thảo'
                 });
                 if (!proceed) return;
               }
               onClose();
             }} 
             className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-white transition-colors border-none"
             variant="ghost"
          >
             <X size={16} />
          </Button>
        </div>

        {!canEdit && (
          <div className="px-6 pt-3 shrink-0">
            <div className="bg-orange-50 text-orange-800 p-3 flex items-center gap-2 text-sm border border-orange-200 rounded-lg">
              <Lock size={16} />
              <span>{lockReason}</span>
            </div>
          </div>
        )}

        {quotation?.id && (
          <div className="px-6 pt-3 shrink-0">
             <EntityLockWarning entityType="quotations" entityId={quotation?.id} onLockStateChange={setIsLockedByOther} />
             <EntityBusinessLockWarning locked={businessLock.locked} reason={businessLock.reason} blockingDocuments={businessLock.blockingDocuments} />
          </div>
        )}

        {/* 2-Column desktop design for information density */}
        <form 
          id="quotationForm"
          noValidate
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit(async (data: import('@/src/domain/schema/quotation.schema').Quotation) => {
                if (!data.customerId) {
                  notify.error("Vui lòng chọn đối tác khách hàng pháp nhân trước khi lưu.");
                  return;
                }
                if (!data.products || data.products.length === 0) {
                  notify.error("Vui lòng khai báo danh mục sản phẩm thiết bị.");
                  return;
                }
                await handlePreSubmit(data);
              }, (err) => {
                notify.error(formatValidationErrors(err));
                console.warn("Quotation validation error:", err);
              })();
              return;
            }
            handleEnterToTab(e);
          }}
          onSubmit={handleSubmit(async (data: import('@/src/domain/schema/quotation.schema').Quotation) => {
            if (!data.customerId) {
              notify.error("Vui lòng chọn đối tác khách hàng pháp nhân trước khi lưu.");
              return;
            }
            if (!data.products || data.products.length === 0) {
              notify.error("Vui lòng khai báo danh mục sản phẩm thiết bị.");
              return;
            }
            await handlePreSubmit(data);
          }, (err) => {
            notify.error(formatValidationErrors(err));
            console.warn("Quotation validation error:", err);
          })}
          className="flex-1 flex flex-col lg:flex-row min-h-0 bg-slate-50"
        >
          
          {/* LEFT SCROLLING INPUT FORM PANEL (70% WIDTH) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide pb-20 border-r border-slate-200">
            {/* 1. KHÁCH HÀNG & THỜI HẠN */}
            <QuotationBasicInfoSection
              register={register}
              watch={watch}
              setValue={setValue}
              getValues={getValues}
              errors={errors}
              isLookingUp={isLookingUp}
              isCreating={isCreating}
              businessLock={businessLock}
              lookupErp={lookupErp}
              loaiBaoGiaList={loaiBaoGiaList}
              customers={customers}
              ngayHetHan={ngayHetHan}
              nguoiPhuTrachList={effectiveNguoiPhuTrachList}
              onOpenQuickCustomer={() => {
                setQuickCustomerInitial(undefined);
                setIsQuickCustomerOpen(true);
              }}
            />

            {/* 2. CHỌN SẢN PHẨM THIẾT BỊ */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                 <div className="flex items-center gap-1.5">
                   <Package size={14} className="text-slate-700" />
                   <h3 className="text-sm font-semibold text-slate-900">
                      2. Danh mục sản phẩm thiết bị khai báo
                   </h3>
                   {isErpLocked && (
                     <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 font-bold text-2xs uppercase rounded border border-blue-200">
                       Nguồn: ERP
                     </span>
                   )}
                 </div>
                 <div className="flex items-center gap-2">
                   {isErpLocked && (
                     <Button
                       type="button"
                       onClick={() => setIsErpLocked(false)}
                       className="text-2xs font-bold text-slate-500 hover:text-slate-700 underline"
                     >
                       Chỉnh sửa thủ công
                     </Button>
                   )}
                   <span className="font-mono text-xs text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-lg">
                     {products.length} hàng
                   </span>
                 </div>
              </div>

              <div className="overflow-x-auto min-h-[290px] w-full">
                <QuotationProductsArray
                   control={control as any}
                   register={register as any}
                   errors={errors as any}
                   setValue={setValue as any}
                   products={products}
                   defaultUnit={normalizeLoai(watch('loai')) === QUOTATION_LOAI.VAT_TU ? 'Cái' : normalizeLoai(watch('loai')) === QUOTATION_LOAI.DICH_VU ? 'Gói' : 'Máy'}
                   defaultItemType={
                     normalizeLoai(watch('loai')) === QUOTATION_LOAI.VAT_TU 
                       ? 'MATERIAL' 
                       : normalizeLoai(watch('loai')) === QUOTATION_LOAI.DICH_VU 
                         ? 'SERVICE' 
                         : 'MACHINE'
                   }
                   showPrice={true}
                   disabled={businessLock?.locked || isErpLocked}
                   baseDateForBaoHanh={watch('ngayBaoGia') || new Date().toISOString().split('T')[0]}
                 />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PANEL - 30% WIDTH */}
          <QuotationRightSidebar
            watchAll={watchAll}
            ngayHetHan={ngayHetHan}
            aggs={aggs}
            register={register}
          />

          {/* Hidden internal Snapshot items */}
          <input type="hidden" {...register('maKh')} />
          <input type="hidden" {...register('tenKhachHang')} />
          <input type="hidden" {...register('sdt')} />
          <input type="hidden" {...register('phanLoaiKhach')} />
        </form>

        {/* BOTTOM FORM STICKY FOOTER TOOLBAR */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/90 backdrop-blur shrink-0 flex items-center justify-between z-10 bottom-0 absolute w-full">
          <div className="flex items-center gap-3">
             {lastSavedAt && (
               <div className="text-2xs text-slate-500 font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>Đã tự động lưu nháp lúc {lastSavedAt.toLocaleTimeString('vi-VN')}</span>
               </div>
             )}
          </div>

          <div className="flex items-center gap-3">
             <Button aria-label="Thoát không lưu" type="button" onClick={onClose} variant="ghost" className="px-4 py-1.5 hover:bg-slate-200 text-sm font-medium text-slate-600 rounded-lg transition-colors border-none">
                Hủy bỏ
             </Button>
             <Button aria-label="Ký duyệt lưu hệ thống" 
                type="submit"
                form="quotationForm"
                disabled={isSubmitting || isSaving || isLockedByOther || businessLock?.locked || !canEdit}
                className={`px-5 py-2 h-9 border-none text-white rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm ${(!canEdit || businessLock?.locked) ? 'bg-slate-400' : 'bg-blue-600'}`}
             >
                {(isSubmitting || isSaving) ? 'Đang gửi lưu trữ...' : quotation ? 'Sửa đổi chứng từ' : 'Ký phát & Lưu hệ thống'}
             </Button>
          </div>
        </div>

        {doubleCheckData.isOpen && doubleCheckData.evaluation && (
          <QuotationTypeDoubleCheckModal
            isOpen={doubleCheckData.isOpen}
            onClose={() => setDoubleCheckData({ isOpen: false, pendingData: null, evaluation: null })}
            currentType={doubleCheckData.pendingData?.loai || doubleCheckData.pendingData?.loaiBaoGia || 'BG Chưa rõ'}
            recommendedType={doubleCheckData.evaluation.recommendedType}
            machineCount={doubleCheckData.evaluation.machineCount}
            materialCount={doubleCheckData.evaluation.materialCount}
            serviceCount={doubleCheckData.evaluation.serviceCount}
            onConfirmRecommended={async () => {
              if (!doubleCheckData.pendingData || !doubleCheckData.evaluation) return;
              const updated = {
                ...doubleCheckData.pendingData,
                loai: doubleCheckData.evaluation.recommendedType as any,
                loaiBaoGia: doubleCheckData.evaluation.recommendedType as any
              };
              setDoubleCheckData({ isOpen: false, pendingData: null, evaluation: null });
              await submitForm(updated);
            }}
            onConfirmCurrent={async () => {
              if (!doubleCheckData.pendingData) return;
              const dataToSave = doubleCheckData.pendingData;
              setDoubleCheckData({ isOpen: false, pendingData: null, evaluation: null });
              await submitForm(dataToSave);
            }}
          />
        )}

        {unmatchedErpCustomer && (
          <ErpCustomerIngestionModal
            isOpen={Boolean(unmatchedErpCustomer)}
            onClose={() => setUnmatchedErpCustomer(null)}
            erpCustomerData={unmatchedErpCustomer}
            existingCustomers={customers}
            onCustomerConfirmed={async (newCustomer) => {
              setValue('customerId', newCustomer.id, { shouldDirty: true, shouldValidate: true });
              setValue('maKh', newCustomer.maKh, { shouldDirty: true });
              setValue('tenKhachHang', newCustomer.tenKhachHang, { shouldDirty: true });
              setValue('sdt', newCustomer.sdt, { shouldDirty: true });
              setValue('nguoiDaiDien', newCustomer.nguoiDaiDien, { shouldDirty: true });
              if (newCustomer.diaChi) setValue('diaChi', newCustomer.diaChi, { shouldDirty: true });
              setUnmatchedErpCustomer(null);
              notify.success(`Đã tự động khởi tạo và gán Khách hàng ${newCustomer.maKh} (${newCustomer.tenKhachHang}) vào Báo giá`);
            }}
            onLinkExistingCustomer={(matchedCust) => {
              setValue('customerId', matchedCust.id, { shouldDirty: true, shouldValidate: true });
              setValue('maKh', matchedCust.maKh, { shouldDirty: true });
              setValue('tenKhachHang', matchedCust.tenKhachHang, { shouldDirty: true });
              setValue('sdt', matchedCust.sdt || matchedCust.contacts?.[0]?.sdt || '', { shouldDirty: true });
              setValue('nguoiDaiDien', matchedCust.nguoiDaiDien || matchedCust.contacts?.[0]?.nguoiDaiDien || '', { shouldDirty: true });
              setUnmatchedErpCustomer(null);
              notify.success(`Đã liên kết Báo giá với khách hàng ${matchedCust.maKh} (${matchedCust.tenKhachHang})`);
            }}
            onEditManually={(initData) => {
              setUnmatchedErpCustomer(null);
              setQuickCustomerInitial(initData);
              setIsQuickCustomerOpen(true);
            }}
          />
        )}

        {isQuickCustomerOpen && (
          <QuickCustomerModal
            isOpen={isQuickCustomerOpen}
            onClose={() => {
              setIsQuickCustomerOpen(false);
              setQuickCustomerInitial(undefined);
            }}
            initialData={quickCustomerInitial}
            onCustomerCreated={(newCust) => {
              setValue('customerId', newCust.id, { shouldDirty: true, shouldValidate: true });
              setValue('maKh', newCust.maKh, { shouldDirty: true });
              setValue('tenKhachHang', newCust.tenKhachHang, { shouldDirty: true });
              setValue('sdt', newCust.sdt, { shouldDirty: true });
              setValue('nguoiDaiDien', newCust.nguoiDaiDien, { shouldDirty: true });
              if (newCust.diaChi) setValue('diaChi', newCust.diaChi, { shouldDirty: true });
              setIsQuickCustomerOpen(false);
              setQuickCustomerInitial(undefined);
              notify.success(`Đã gán Khách hàng ${newCust.maKh} vào Báo giá`);
            }}
          />
        )}
      </motion.div>
    </div>
  );
}
