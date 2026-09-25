import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
 
import React, { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Payment, PaymentSchema } from '@/src/domain/schema/payment.schema';
import { z } from 'zod';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/src/design-system/Confirm';
import { Button } from '@/src/design-system/Button';
import { useDraft } from '@/src/hooks/useDraft';
import { squeezeSpaces, normalizeCode, cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';

import { checkPaymentLock } from '@/src/domain/policy/lock.policy';
import { checkA5Policy } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { formatUserOfficer } from '@/src/shared/utils/userProfile';

import { PaymentRecordBasicFields } from './form/PaymentRecordBasicFields';
import { PaymentRecordProductsSection } from './form/PaymentRecordProductsSection';
import { handleEnterToTab } from '@/src/shared/utils/formNavigation';
import { calculateTotals, calculateOtherPaid, determinePaymentStatus } from '../utils/payment-limits';

interface PaymentRecordDrawerProps {
  isOpen?: boolean;
  onClose: () => void;
  payment?: Payment | null;
  onSave: (data: any) => Promise<void>; 
  contracts?: Contract[]; 
  quotations?: Quotation[];
  payments?: Payment[];
  allDeliveries?: any[];
  nguoiPhuTrachList?: string[];
  phuongThucThanhToanList?: string[];
  tinhTrangThanhToanList?: string[];
  prefillQuotation?: any;
}

import { EntityLockWarning } from '@/src/widgets/EntityLockWarning';
import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';

export function PaymentRecordDrawer({ 
  isOpen = true, 
  onClose, 
  payment, 
  payments = [], 
  onSave, 
  allDeliveries = [],
  contracts, 
  quotations, 
  nguoiPhuTrachList: _nguoiPhuTrachList,
  phuongThucThanhToanList: _phuongThucThanhToanList = ['Chuyển khoản', 'Tiền mặt', 'Quẹt thẻ', 'COD'],
  tinhTrangThanhToanList: _tinhTrangThanhToanList = ['Chưa TT', 'Công nợ', 'Tất toán', 'Miễn phí'],
  prefillQuotation
}: PaymentRecordDrawerProps) {
  const [isLockedByOther, setIsLockedByOther] = React.useState(false);
  const isNew = !payment;
  const { confirm: _confirm} = useConfirm();
  const { user, userData } = useAuth();
  const defaultOfficer = formatUserOfficer(userData, user);
  const { canEdit, reason: lockReason } = checkA5Policy(user, userData, payment);

  const businessLock = useMemo(() => {
    if (!payment) return { locked: false };
    const myDeliveries = allDeliveries.filter(d => d.paymentId === payment.id);
    return checkPaymentLock(payment as any, myDeliveries);
  }, [payment, allDeliveries]);

  const PaymentFormSchema = useMemo(() => PaymentSchema.extend({ 
    sourceValue: z.string().optional(),
    paymentId: z.string().optional().transform(v => (v && v.trim() && v !== '---') ? v : `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`)
  }).strip(), []);

  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Payment & { sourceValue: string }>('payments', payment?.id || 'new');

  const { register, handleSubmit, watch, setValue, control, reset, getValues, formState: { isSubmitting } } = useForm<Payment & { sourceValue: string }>({
    resolver: zodResolver(PaymentFormSchema) as any,
    defaultValues: draft ? { ...draft, nguoiPhuTrach: defaultOfficer } : (payment ? { ...payment, nguoiPhuTrach: defaultOfficer, sourceValue: payment.contractId ? `CONTRACT:${payment.contractId}` : payment.quotationId ? `QUOTATION:${payment.quotationId}` : '' } : { 
      paymentId: `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI, 
      tinhTrangThanhToan: 'Chưa TT', 
      phuongThucThanhToan: 'Chuyển khoản', 
      products: [],
      nguoiPhuTrach: defaultOfficer
    } as any)
  });

  useEffect(() => {
    if (defaultOfficer && getValues('nguoiPhuTrach') !== defaultOfficer) {
      setValue('nguoiPhuTrach', defaultOfficer, { shouldValidate: true });
    }
  }, [defaultOfficer, setValue, getValues]);

  const hasInitializedRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasInitializedRef.current = false;
      return;
    }

    if (hasInitializedRef.current) return;

    const currentPaymentId = getValues('paymentId') || draft?.paymentId || (payment?.paymentId ? payment.paymentId : `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);

    if (draft) {
      reset({
        ...draft,
        paymentId: (draft.paymentId && draft.paymentId !== '---') ? draft.paymentId : currentPaymentId
      });
      hasInitializedRef.current = true;
    } else if (payment) {
      const enriched = { ...payment };
      if (!enriched.soDonHang || !enriched.soHopDong) {
        const contract = (contracts && contracts.find(c => c.id === payment.contractId)) ||
          (payment.contractId ? entityCachePool.get('contracts', payment.contractId) : null);
        if (contract) {
          enriched.soDonHang = enriched.soDonHang || contract.soDonHang || '';
          enriched.soHopDong = enriched.soHopDong || contract.soHopDong || '';
        } else if (payment.quotationId) {
          const matchingContract = (contracts && contracts.find(c => c.quotationId === payment.quotationId)) ||
            entityCachePool.find('contracts', (c: any) => c.quotationId === payment.quotationId);
          enriched.soDonHang = enriched.soDonHang || matchingContract?.soDonHang || '';
          enriched.soHopDong = enriched.soHopDong || matchingContract?.soHopDong || '';
        }
      }
      reset({ 
        ...enriched, 
        paymentId: enriched.paymentId || currentPaymentId,
        sourceValue: payment.contractId ? `CONTRACT:${payment.contractId}` : payment.quotationId ? `QUOTATION:${payment.quotationId}` : '' 
      });
      hasInitializedRef.current = true;
    } else if (isNew) {
      if (prefillQuotation) {
        reset({
          paymentId: currentPaymentId,
          trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
          tinhTrangThanhToan: 'Chưa TT',
          phuongThucThanhToan: 'Chuyển khoản',
          sourceValue: `QUOTATION:${prefillQuotation.id}`,
          quotationId: prefillQuotation.id,
          contractId: '',
          customerId: prefillQuotation.customerId || '',
          maKh: prefillQuotation.maKh || '',
          tenKhachHang: prefillQuotation.tenKhachHang || '',
          sdt: prefillQuotation.sdt || '',
          soDonHang: '',
          soHopDong: '',
          soPhieuBaoGia: prefillQuotation.soPhieuBaoGia || '',
          subTotal: prefillQuotation.subTotal || 0,
          vatRate: prefillQuotation.vatRate || 0,
          vatAmount: prefillQuotation.vatAmount || 0,
          discountRate: prefillQuotation.discountRate || 0,
          discountAmount: prefillQuotation.discountAmount || 0,
          totalAmount: prefillQuotation.totalAmount || 0,
          soTien: prefillQuotation.totalAmount || prefillQuotation.subTotal || 0,
          products: prefillQuotation.products || [],
          ngayThanhToan: format(new Date(), 'yyyy-MM-dd')
        } as any);
      } else {
        reset({
          paymentId: currentPaymentId,
          trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
          tinhTrangThanhToan: 'Chưa TT',
          phuongThucThanhToan: 'Chuyển khoản',
          soTien: undefined,
          danhSachMaMay: [],
          slMay: 0,
          products: [],
          soDonHang: '',
          soHopDong: '',
          soPhieuBaoGia: '',
          ngayThanhToan: format(new Date(), 'yyyy-MM-dd')
        } as any);
      }
      hasInitializedRef.current = true;
    }
  }, [payment, isOpen, reset, draft, isNew, contracts, prefillQuotation, getValues]);

  const watchAll = watch();
  useEffect(() => {
    if (isOpen) {
      const handler = setTimeout(() => {
        saveDraft(watchAll);
      }, 500);
      return () => clearTimeout(handler);
    }
  }, [watchAll, saveDraft, isOpen]);

 
  const selectedSourceValue = watch('sourceValue');
  
  // Auto Generate Payment ID (Chỉ sinh 1 lần khi mở form tạo mới, chống trigger loop)
  const hasGeneratedCodeRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasGeneratedCodeRef.current = false;
      return;
    }
    const currentId = getValues('paymentId') || '';
    if (isNew && (!currentId || currentId === '---')) {
      // 1. Gán fallback code tức thì để UI không trống
      const fallbackCode = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setValue('paymentId', fallbackCode, { shouldValidate: true, shouldDirty: true });

      if (!hasGeneratedCodeRef.current) {
        hasGeneratedCodeRef.current = true;
        let isCancelled = false;

        // 2. Fetch mã chuẩn từ Universal Sequence Engine
        if (typeof fetch === 'function') {
          fetch('/api/workflow/next-code/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
            .then(res => res.json())
            .then(data => {
              if (!isCancelled && data?.success && data?.code) {
                setValue('paymentId', data.code, { shouldValidate: true, shouldDirty: true });
              }
            })
            .catch(() => {
              // Giữ fallbackCode đã set
            });
        }

        return () => {
          isCancelled = true;
        };
      }
    }
  }, [isOpen, isNew, setValue, getValues]);

  const soTienVal = Number(watch('soTien')) || 0;
  const totalAmountVal = Number(watch('totalAmount')) || 0;
  const otherPaid = selectedSourceValue ? calculateOtherPaid(payment?.id, payments, selectedSourceValue) : 0;

  useEffect(() => {
    if (selectedSourceValue && totalAmountVal > 0) {
      if (watch('tinhTrangThanhToan') === 'Miễn phí') return;
      const newStatus = determinePaymentStatus(soTienVal, otherPaid, totalAmountVal);
      if (newStatus && watch('tinhTrangThanhToan') !== newStatus) {
        setValue('tinhTrangThanhToan', newStatus, { shouldValidate: true });
      }
    }
  }, [selectedSourceValue, soTienVal, totalAmountVal, payments, payment, setValue, otherPaid, watch]);

  // Calculate totals
  const products = watch('products') || [];
  const vatRate = Number(watch('vatRate')) || 0;
  const discountRate = Number(watch('discountRate')) || 0;
  const currentSubTotal = Number(watch('subTotal')) || 0;

  const { calculatedSubTotal, finalSubTotal, vatAmount, discountAmount, totalAmount } = useMemo(() => {
    return calculateTotals(products, currentSubTotal, vatRate, discountRate);
  }, [products, currentSubTotal, vatRate, discountRate]);

  useEffect(() => {
    if (calculatedSubTotal !== null && getValues('subTotal') !== finalSubTotal) {
      setValue('subTotal', finalSubTotal, { shouldDirty: true });
    }
    if (getValues('vatAmount') !== vatAmount) {
      setValue('vatAmount', vatAmount, { shouldDirty: true });
    }
    if (getValues('discountAmount') !== discountAmount) {
      setValue('discountAmount', discountAmount, { shouldDirty: true });
    }
    if (getValues('totalAmount') !== totalAmount) {
      setValue('totalAmount', totalAmount, { shouldDirty: true });
    }
  }, [calculatedSubTotal, finalSubTotal, vatAmount, discountAmount, totalAmount, setValue, getValues]);
 
  const onSubmit = async (data: any) => {
    // Normalization
    data.ghiChu = squeezeSpaces(data.ghiChu);
    data.maKh = data.maKh ? normalizeCode(data.maKh) : '';
    data.tenKhachHang = data.tenKhachHang ? cleanProperVietnameseText(data.tenKhachHang) : '';
    data.paymentId = normalizeCode(data.paymentId);
    if (!data.paymentId || data.paymentId === '---') {
      data.paymentId = `PT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    if (data.sdt) {
      data.sdt = normalizePhoneVN(data.sdt) || data.sdt;
    }
    
    // Remove transient field used only for form linking
    delete data.sourceValue;

    await onSave(data);
    clearDraft();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col h-screen overflow-hidden">
      <div className="bg-slate-50 flex flex-col h-full w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header toolbar */}
        <div className="bg-slate-900 flex items-center justify-between px-6 py-3.5 shrink-0 z-20 shadow-md">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white">
                <DollarSign size={16} />
             </div>
             <div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">{isNew ? 'Khởi tạo Phiếu Thu/Chi' : 'Cập nhật Phiếu TT'}</h2>
                <div className="text-2xs text-slate-500 font-semibold flex items-center gap-2">
                   <span>Mã TT: {watchAll.paymentId || '---'}</span>
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
              <DollarSign size={16} />
              <span>{lockReason}</span>
            </div>
          </div>
        )}

        {payment?.id && (
          <div className="px-6 pt-3 shrink-0">
             <EntityLockWarning entityType="payments" entityId={payment?.id} onLockStateChange={setIsLockedByOther} />
             <EntityBusinessLockWarning locked={businessLock.locked} reason={businessLock.reason} blockingDocuments={businessLock.blockingDocuments} />
          </div>
        )}

        {/* 1-Screen Scrollable Body */}
        <form 
          id="paymentForm" 
          onKeyDown={handleEnterToTab}
          onSubmit={handleSubmit(onSubmit, (errors) => {
            const FIELD_LABELS: Record<string, string> = {
              paymentId: 'Mã TT',
              tinhTrangThanhToan: 'Tình trạng thanh toán',
              ngayThanhToan: 'Ngày thanh toán',
              customerId: 'Chứng từ tham chiếu',
              sourceValue: 'Chứng từ tham chiếu',
              soTien: 'Số tiền'
            };
            const errorList = Object.keys(errors).map(k => FIELD_LABELS[k] || k).join(', ');
            import('@/src/shared/utils/notify').then(({ notify }) => {
              notify.error(`Vui lòng kiểm tra: ${errorList}`);
            });
          })} 
          className="flex-1 overflow-y-auto w-full px-6 lg:px-8 py-8 pb-32 scrollbar-thin"
        >
          <PaymentRecordBasicFields
            register={register}
            watch={watch}
            setValue={setValue}
            control={control}
            otherPaid={otherPaid}
            disabled={businessLock.locked}
            contracts={contracts}
            quotations={quotations}
            nguoiPhuTrachList={_nguoiPhuTrachList}
            phuongThucThanhToanList={_phuongThucThanhToanList}
            tinhTrangThanhToanList={_tinhTrangThanhToanList}
          />
          <PaymentRecordProductsSection control={control} isEditMode={true} setValue={setValue} watch={watch} disabled={businessLock.locked} />
        </form>

        {/* Sticky footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/90 backdrop-blur shrink-0 flex items-center justify-between z-10 bottom-0 sticky w-full">
          <div className="text-2xs text-slate-500 font-mono flex items-center gap-1.5 min-w-0 pr-4">
            {draft && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="truncate">Đã tự động lưu nháp lúc {lastSavedAt?.toLocaleTimeString('vi-VN')}</span>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                clearDraft();
                onClose();
              }}
              disabled={isSubmitting}
              className="px-4 py-1.5 hover:bg-slate-200 text-sm font-medium text-slate-600 rounded-lg transition-colors border-none"
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              form="paymentForm"
              disabled={isSubmitting || isLockedByOther || businessLock?.locked || !canEdit}
              className={`px-5 py-2 h-9 border-none text-white rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm min-w-[120px] ${(!canEdit || businessLock?.locked) ? 'bg-slate-400' : 'bg-blue-600'}`}
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu Giao Dịch'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
