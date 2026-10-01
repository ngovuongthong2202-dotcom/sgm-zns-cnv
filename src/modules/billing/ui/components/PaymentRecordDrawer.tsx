import { Contract } from '@/src/domain/schema/contract.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
 
import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Payment, PaymentSchema } from '@/src/domain/schema/payment.schema';
import { z } from 'zod';
import { DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { useConfirm } from '@/src/design-system/Confirm';
import { Button } from '@/src/design-system/Button';
import { useDraft } from '@/src/hooks/useDraft';
import { cleanProperVietnameseText } from '@/src/shared/utils/textFormatter';
import { normalizePhoneVN } from '@/src/shared/utils/phone';
import { sanitizeText, sanitizeCode, sanitizePhoneVN } from '@/src/shared/utils/inputSanitizer';

import { checkPaymentLock } from '@/src/domain/policy/lock.policy';
import { checkA5Policy } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { formatUserOfficer } from '@/src/shared/utils/userProfile';
import { generateDeterministicNextCode } from '@/src/shared/utils/voucherResolver';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

import { PaymentRecordBasicFields } from './form/PaymentRecordBasicFields';
import { PaymentRecordProductsSection } from './form/PaymentRecordProductsSection';
import { handleEnterToTab } from '@/src/shared/utils/formNavigation';
import { calculateOtherPaid, determinePaymentStatus } from '../utils/payment-limits';

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
  const { confirm } = useConfirm();
  const { user, userData } = useAuth();
  const defaultOfficer = formatUserOfficer(userData, user);
  const { canEdit, reason: lockReason } = checkA5Policy(user, userData, payment);

  const businessLock = useMemo(() => {
    if (!payment) return { locked: false };
    const myDeliveries = allDeliveries.filter(d => d.paymentId === payment.id);
    return checkPaymentLock(payment as any, myDeliveries);
  }, [payment, allDeliveries]);

  const allPaymentsList = useMemo(() => {
    const map = new Map<string, any>();
    (payments || []).forEach(p => p?.id && map.set(p.id, p));
    try {
      const cached = entityCachePool.getAll<any>('payments');
      if (cached) cached.forEach(p => p?.id && map.set(p.id, p));
    } catch {
      // Ignore cache pool lookup failure
    }
    return Array.from(map.values());
  }, [payments]);

  const allCustomers = useMemo(() => {
    try {
      return entityCachePool.getAll<any>('customers') || [];
    } catch {
      return [];
    }
  }, []);

  const PaymentFormSchema = useMemo(() => PaymentSchema.extend({ 
    sourceValue: z.string().optional(),
    paymentId: z.string().optional().transform(v => (v && v.trim() && v !== '---') ? v : generateDeterministicNextCode('PT', allPaymentsList))
  }).strip(), [allPaymentsList]);

  // ANCHOR: Scoped Draft Isolation - Cô lập nháp theo từng chứng từ tham chiếu
  const scopedDraftKey = payment?.id 
    ? payment.id 
    : (prefillQuotation?.id ? `new_quotation_${prefillQuotation.id}` : 'new_standalone');
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Payment & { sourceValue: string }>('payments', scopedDraftKey);

  const { register, handleSubmit, watch, setValue, control, reset, getValues, formState: { isSubmitting, isDirty } } = useForm<Payment & { sourceValue: string }>({
    resolver: zodResolver(PaymentFormSchema) as any,
    defaultValues: draft ? { ...draft, nguoiPhuTrach: draft.nguoiPhuTrach || defaultOfficer } : (payment ? { ...payment, nguoiPhuTrach: payment.nguoiPhuTrach || defaultOfficer, sourceValue: payment.contractId ? `CONTRACT:${payment.contractId}` : payment.quotationId ? `QUOTATION:${payment.quotationId}` : '' } : { 
      paymentId: generateDeterministicNextCode('PT', allPaymentsList),
      trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI, 
      tinhTrangThanhToan: 'Chưa TT', 
      phuongThucThanhToan: 'Chuyển khoản', 
      products: [],
      nguoiPhuTrach: defaultOfficer
    } as any)
  });

  const effectiveNguoiPhuTrachList = useMemo(() => {
    const list = [...(_nguoiPhuTrachList || [])];
    if (defaultOfficer && !list.includes(defaultOfficer)) {
      list.push(defaultOfficer);
    }
    const currentOfficer = payment?.nguoiPhuTrach;
    if (currentOfficer && !list.includes(currentOfficer)) {
      list.push(currentOfficer);
    }
    return list;
  }, [_nguoiPhuTrachList, defaultOfficer, payment?.nguoiPhuTrach]);

  const lastInitializedKeyRef = React.useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) {
      lastInitializedKeyRef.current = null;
      return;
    }

    const currentKey = payment?.id || (prefillQuotation?.id ? `prefill_quo_${prefillQuotation.id}` : (draft?.paymentId ? `draft_${draft.paymentId}` : 'new_empty'));
    if (lastInitializedKeyRef.current === currentKey) return;
    lastInitializedKeyRef.current = currentKey;

    const currentPaymentId = getValues('paymentId') || draft?.paymentId || (payment?.paymentId ? payment.paymentId : generateDeterministicNextCode('PT', allPaymentsList));

    if (payment) {
      const enriched = { ...payment };
      if (!enriched.soDonHang || !enriched.soHopDong) {
        const contract = (contracts && contracts.find(c => c.id === payment.contractId)) ||
          (payment.contractId ? entityCachePool.get('contracts', payment.contractId) : null);
        if (contract) {
          enriched.soDonHang = enriched.soDonHang || contract.soDonHang || '';
          enriched.soHopDong = enriched.soHopDong || contract.soHopDong || '';
          enriched.quotationId = enriched.quotationId || contract.quotationId || '';
          enriched.soPhieuBaoGia = enriched.soPhieuBaoGia || contract.soPhieuBaoGia || '';
        } else if (payment.quotationId) {
          const matchingContract = (contracts && contracts.find(c => c.quotationId === payment.quotationId)) ||
            entityCachePool.find('contracts', (c: any) => c.quotationId === payment.quotationId);
          enriched.soDonHang = enriched.soDonHang || matchingContract?.soDonHang || '';
          enriched.soHopDong = enriched.soHopDong || matchingContract?.soHopDong || '';
        }
      }
      reset({ 
        ...enriched, 
        nguoiPhuTrach: enriched.nguoiPhuTrach || defaultOfficer,
        paymentId: enriched.paymentId || currentPaymentId,
        sourceValue: payment.contractId ? `CONTRACT:${payment.contractId}` : payment.quotationId ? `QUOTATION:${payment.quotationId}` : '' 
      });
    } else if (isNew) {
      if (prefillQuotation) {
        const normLoai = (prefillQuotation.phanLoai || (prefillQuotation as any).loai || (prefillQuotation as any).loaiBaoGia) || 'BG Vật tư';
        const quoTotal = Number(prefillQuotation.totalAmount) || Number(prefillQuotation.subTotal) || 0;
        const initialStatus = quoTotal > 0 ? 'Tất toán' : 'Chưa TT';

        reset({
          paymentId: currentPaymentId,
          trangThaiGuiTinThanhToan: EntityZnsStatus.CHUA_GUI,
          tinhTrangThanhToan: initialStatus,
          phuongThucThanhToan: 'Chuyển khoản',
          sourceValue: `QUOTATION:${prefillQuotation.id}`,
          quotationId: prefillQuotation.id,
          contractId: '',
          customerId: prefillQuotation.customerId || (prefillQuotation as any).customer_id || '',
          maKh: prefillQuotation.maKh || '',
          tenKhachHang: prefillQuotation.tenKhachHang || '',
          sdt: prefillQuotation.sdt || '',
          soDonHang: prefillQuotation.soDonHang || '',
          soHopDong: '',
          soPhieuBaoGia: prefillQuotation.soPhieuBaoGia || '',
          subTotal: prefillQuotation.subTotal || 0,
          vatRate: prefillQuotation.vatRate || 0,
          vatAmount: prefillQuotation.vatAmount || 0,
          discountRate: prefillQuotation.discountRate || 0,
          discountAmount: prefillQuotation.discountAmount || 0,
          totalAmount: quoTotal,
          soTien: quoTotal,
          products: prefillQuotation.products || [],
          ngayThanhToan: format(new Date(), 'yyyy-MM-dd'),
          nguoiPhuTrach: defaultOfficer,
          phanLoai: normLoai,
          loai: normLoai
        } as any);
      } else if (draft) {
        reset({
          ...draft,
          nguoiPhuTrach: draft.nguoiPhuTrach || defaultOfficer,
          paymentId: (draft.paymentId && draft.paymentId !== '---') ? draft.paymentId : currentPaymentId
        });
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
          ngayThanhToan: format(new Date(), 'yyyy-MM-dd'),
          nguoiPhuTrach: defaultOfficer,
          phanLoai: '',
          loai: ''
        } as any);
      }
    }
  }, [payment, isOpen, reset, draft, isNew, contracts, prefillQuotation, getValues, defaultOfficer, allPaymentsList]);

  // ANCHOR: D1 - Pure Financial Calculations (derived on-the-fly from Line Items, 0-Effect)
  const products = watch('products') || [];
  const effectiveTotals = useMemo(() => {
    const healed = (products || []).map(computeLineItem);
    return aggregateProducts(healed);
  }, [products]);

  // Silent Safe Auto-Save Draft with Pure Enriched Financials
  const handleSaveDraft = useCallback(() => {
    const current = getValues();
    if (effectiveTotals.totalGross > 0 || (current.products && current.products.length > 0)) {
      current.subTotal = effectiveTotals.totalGross;
      current.discountAmount = effectiveTotals.totalDiscount;
      current.vatAmount = effectiveTotals.totalVat;
      current.totalAmount = effectiveTotals.totalAfterTax;
    }
    saveDraft(current);
  }, [getValues, effectiveTotals, saveDraft]);

  useEffect(() => {
    if (!isDirty || !isOpen) return;
    const interval = setInterval(() => {
      handleSaveDraft();
    }, 8000);
    return () => clearInterval(interval);
  }, [isDirty, handleSaveDraft, isOpen]);

  const selectedSourceValue = watch('sourceValue');
  
  // Auto Generate Payment ID (Chỉ sinh 1 lần khi mở form tạo mới, Zero Math.random, Zero Dirty Storm)
  const hasGeneratedCodeRef = React.useRef(false);
  useEffect(() => {
    if (!isOpen) {
      hasGeneratedCodeRef.current = false;
      return;
    }
    const currentId = getValues('paymentId') || '';
    if (isNew && (!currentId || currentId === '---')) {
      const fallbackCode = generateDeterministicNextCode('PT', allPaymentsList);
      setValue('paymentId', fallbackCode, { shouldValidate: true });

      if (!hasGeneratedCodeRef.current) {
        hasGeneratedCodeRef.current = true;
        let isCancelled = false;

        if (typeof fetch === 'function') {
          fetch('/api/workflow/next-code/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
            .then(res => res.json())
            .then(data => {
              if (!isCancelled && data?.success && data?.code) {
                setValue('paymentId', data.code, { shouldValidate: true });
              }
            })
            .catch(() => {
              // Giữ fallbackCode an toàn
            });
        }

        return () => {
          isCancelled = true;
        };
      }
    }
  }, [isOpen, isNew, setValue, getValues, allPaymentsList]);

  const soTienVal = Number(watch('soTien')) || 0;
  const totalAmountVal = Number(watch('totalAmount')) || 0;
  const targetTotalAmount = effectiveTotals.totalAfterTax > 0 ? effectiveTotals.totalAfterTax : totalAmountVal;
  const otherPaid = selectedSourceValue ? calculateOtherPaid(payment?.id, payments, selectedSourceValue) : 0;

  // ANCHOR: Stable Payment Status Coordinator (0-Watch-Loop)
  useEffect(() => {
    if (selectedSourceValue && targetTotalAmount > 0) {
      const curStatus = getValues('tinhTrangThanhToan');
      if (curStatus === 'Miễn phí') return;
      const newStatus = determinePaymentStatus(soTienVal, otherPaid, targetTotalAmount);
      if (newStatus && curStatus !== newStatus) {
        setValue('tinhTrangThanhToan', newStatus, { shouldValidate: true });
      }
    }
  }, [selectedSourceValue, soTienVal, targetTotalAmount, otherPaid, setValue, getValues]);
 
  const onSubmit = async (data: any) => {
    // Normalization & Enterprise 5-Tier Sanitization
    data.ghiChu = sanitizeText(data.ghiChu);
    data.maKh = data.maKh ? sanitizeCode(data.maKh) : '';
    data.tenKhachHang = data.tenKhachHang ? sanitizeText(cleanProperVietnameseText(data.tenKhachHang)) : '';
    data.paymentId = sanitizeCode(data.paymentId);
    if (!data.paymentId || data.paymentId === '---' || data.paymentId === 'N/A') {
      data.paymentId = generateDeterministicNextCode('PT', allPaymentsList);
    }
    if (data.soHopDong) data.soHopDong = sanitizeCode(data.soHopDong);
    if (data.soDonHang) data.soDonHang = sanitizeCode(data.soDonHang);
    if (data.soBaoGia) data.soBaoGia = sanitizeCode(data.soBaoGia);
    if (data.soChungTuThamChieu) data.soChungTuThamChieu = sanitizeCode(data.soChungTuThamChieu);
    if (data.tenNguoiNop) data.tenNguoiNop = sanitizeText(data.tenNguoiNop);
    if (data.soTaiKhoan) data.soTaiKhoan = sanitizeCode(data.soTaiKhoan);
    if (data.nganHang) data.nganHang = sanitizeText(data.nganHang);
    if (data.sdt) {
      data.sdt = sanitizePhoneVN(data.sdt) || normalizePhoneVN(data.sdt) || data.sdt;
    }
    
    // ANCHOR: Pure Serialization Interceptor - Tự động enrich tài chính chuẩn D1
    if (effectiveTotals.totalGross > 0 || (data.products && data.products.length > 0)) {
      data.subTotal = effectiveTotals.totalGross;
      data.discountAmount = effectiveTotals.totalDiscount;
      data.vatAmount = effectiveTotals.totalVat;
      data.totalAmount = effectiveTotals.totalAfterTax;
      data.discountRate = effectiveTotals.totalGross > 0 ? Number(((effectiveTotals.totalDiscount / effectiveTotals.totalGross) * 100).toFixed(2)) : 0;
      data.vatRate = effectiveTotals.totalBeforeTax > 0 ? Math.round((effectiveTotals.totalVat / effectiveTotals.totalBeforeTax) * 100) : 0;
    }

    // Remove transient field used only for form linking
    delete data.sourceValue;

    // Sanitize foreign keys so PostgreSQL does not violate FK constraints
    if (!data.contractId || !String(data.contractId).trim()) {
      delete data.contractId;
    }
    if (!data.quotationId || !String(data.quotationId).trim()) {
      delete data.quotationId;
    }
    if (!data.nguoiPhuTrach || !String(data.nguoiPhuTrach).trim()) {
      data.nguoiPhuTrach = defaultOfficer;
    }

    // Kiểm tra nghiệp vụ: Kế thừa số đơn hàng nếu từ Hợp Đồng
    const isFromContract = Boolean(data.contractId || (data.soHopDong && String(data.soHopDong).trim() !== ''));
    if (isFromContract && (!data.soDonHang || !String(data.soDonHang).trim())) {
      const matchedContract = contracts?.find((c: any) => c.id === data.contractId || c.soHopDong === data.soHopDong);
      if (matchedContract?.soDonHang) {
        data.soDonHang = matchedContract.soDonHang;
      }
    }

    await onSave(data);
    clearDraft();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-50 z-[200] flex flex-col h-screen overflow-hidden">
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
                   <span>Mã TT: {watch('paymentId') || '---'}</span>
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
                   message: 'Dữ liệu đã được lưu nháp tự động. Bạn chắc chắn muốn đóng?',
                   variant: 'warning',
                   confirmText: 'Đóng',
                   cancelText: 'Quay lại'
                 });
                 if (!proceed) return;
               }
               onClose();
             }} 
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

        <form 
          id="paymentForm" 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              const submitBtn = document.querySelector('button[type="submit"][form="paymentForm"]') as HTMLButtonElement | null;
              if (submitBtn) {
                submitBtn.click();
              }
              return;
            }
            handleEnterToTab(e);
          }}
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
            payments={payments}
            customers={allCustomers}
            currentPaymentId={payment?.id || payment?.paymentId}
            nguoiPhuTrachList={effectiveNguoiPhuTrachList}
            phuongThucThanhToanList={_phuongThucThanhToanList}
            tinhTrangThanhToanList={_tinhTrangThanhToanList}
            targetTotal={effectiveTotals.totalAfterTax > 0 ? effectiveTotals.totalAfterTax : undefined}
          />
          <PaymentRecordProductsSection 
            control={control} 
            isEditMode={true} 
            setValue={setValue} 
            watch={watch} 
            disabled={businessLock.locked} 
            totals={effectiveTotals}
          />
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
