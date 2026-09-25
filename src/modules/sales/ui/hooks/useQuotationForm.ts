import { useMemo, useEffect } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Quotation, QuotationSchema } from '@/src/domain/schema/quotation.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { useConfirm } from '@/src/design-system/Confirm';
import { useDraft } from '@/src/hooks/useDraft';
import { useAuth } from '@/src/modules/iam';
import { checkQuotationLock } from '@/src/domain/policy/lock.policy';
import { checkA5Policy } from '@/src/modules/iam';
import { useErpLookup } from './useErpLookup';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

interface UseQuotationFormProps {
  quotation: Quotation | null;
  quotations: Quotation[];
  customers: Customer[];
  allContracts: any[];
  allPayments: any[];
  allDeliveries: any[];
}

export function useQuotationForm({
  quotation,
  quotations,
  customers,
  allContracts,
  allPayments,
  allDeliveries
}: UseQuotationFormProps) {
  const { confirm } = useConfirm();
  const { user, userData } = useAuth();
  
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Quotation>('quotation', quotation?.id || 'new');
  
  const { canEdit, reason: lockReason } = checkA5Policy(user, userData, quotation);
  
  const businessLock = useMemo(() => {
    if (!quotation) return { locked: false, reason: undefined, blockingDocuments: [] };
    const myContracts = allContracts.filter(c => c.quotationId === quotation.id);
    const myPayments = allPayments.filter(p => p.quotationId === quotation.id);
    const myDeliveries = allDeliveries.filter(d => d.quotationId === quotation.id);
    return checkQuotationLock(quotation, myContracts, myPayments, myDeliveries);
  }, [quotation, allContracts, allPayments, allDeliveries]);
  
  const form: UseFormReturn<Quotation> = useForm<Quotation>({
    resolver: zodResolver(QuotationSchema) as any,
    defaultValues: quotation || draft || { 
      tinhTrangBaoGia: 'MỚI',
      ngayBaoGia: new Date().toISOString().split('T')[0],
      hieuLuc: 7,
      trangThaiGuiTinBaoGia: EntityZnsStatus.CHUA_GUI,
      products: [],
      loai: QUOTATION_LOAI.MAY
    } as any
  });

  const { control, register, handleSubmit, watch, setValue, getValues, trigger, reset, formState: { errors, isSubmitting, isDirty } } = form;

  useEffect(() => {
    if (quotation) {
      reset({
        ...quotation,
        products: quotation.products || [],
        noiDungGhiChu: quotation.noiDungGhiChu || '',
        hieuLuc: quotation.hieuLuc ?? 7,
        ngayBaoGia: quotation.ngayBaoGia || new Date().toISOString().split('T')[0],
        nguoiPhuTrach: quotation.nguoiPhuTrach || '',
        loai: quotation.loai || QUOTATION_LOAI.MAY
      });
    }
  }, [quotation, reset]);

  const currentLoai = watch('loai');
  const isCreating = !quotation?.id;
  
  const { lookupErp, isLookingUp, isErpLocked, setIsErpLocked } = useErpLookup(setValue, getValues, confirm, customers, trigger);

  useEffect(() => {
    let isCancelled = false;
    if (isCreating && currentLoai) {
      const currentSo = getValues('soPhieuBaoGia') || '';
      if (!currentSo) {
        fetch('/api/workflow/next-code/quotation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ loai: currentLoai })
        })
          .then(res => res.json())
          .then(data => {
            if (!isCancelled && data.success && data.code) {
              setValue('soPhieuBaoGia', data.code, { shouldValidate: true, shouldDirty: true });
            }
          })
          .catch(() => {
            // Offline/Network fallback
            const normLoai = normalizeLoai(currentLoai);
            let prefix = 'BGM-';
            if (normLoai === QUOTATION_LOAI.VAT_TU) prefix = 'BGVT-';
            else if (normLoai === QUOTATION_LOAI.DICH_VU) prefix = 'BGDV-';
            const fallbackCode = `${prefix}${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
            if (!isCancelled) {
              setValue('soPhieuBaoGia', fallbackCode, { shouldValidate: true, shouldDirty: true });
            }
          });
      }
    }
    return () => { isCancelled = true; };
  }, [currentLoai, isCreating, setValue, getValues]);

  const products = watch('products') || [];
  const ngayBaoGia = watch('ngayBaoGia');
  const hieuLuc = watch('hieuLuc');
  const ngayHetHan = watch('ngayHetHan');

  // Live expiration date calculation
  useEffect(() => {
    if (ngayBaoGia && hieuLuc != null) {
      const expirationDate = new Date(ngayBaoGia);
      expirationDate.setDate(expirationDate.getDate() + Number(hieuLuc));
      const calculatedString = expirationDate.toISOString().split('T')[0];
      if (ngayHetHan !== calculatedString) {
        setValue('ngayHetHan', calculatedString, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [ngayBaoGia, hieuLuc, setValue, ngayHetHan]);

  // SILENT Auto-Save Draft (every 8 seconds)
  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      saveDraft(getValues());
    }, 8000);
    return () => clearInterval(interval);
  }, [isDirty, saveDraft, getValues]);

  // Automatic calculation of slMay (total products count)
  useEffect(() => {
    const total = products.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0); 
    if (getValues('slMay') !== total) {
      setValue('slMay', total);
    }
  }, [products, setValue, getValues]);

  // ANCHOR: D4 - Pure Financial Calculations (derived from Line Items)
  const aggs = useMemo(() => aggregateProducts(products), [products]);

  useEffect(() => {
    let shouldUpdate = false;
    if (getValues('subTotal') !== aggs.totalGross) { setValue('subTotal', aggs.totalGross); shouldUpdate = true; }
    if (getValues('vatAmount') !== aggs.totalVat) { setValue('vatAmount', aggs.totalVat); shouldUpdate = true; }
    if (getValues('discountAmount') !== aggs.totalDiscount) { setValue('discountAmount', aggs.totalDiscount); shouldUpdate = true; }
    if (getValues('totalAmount') !== aggs.totalAfterTax) { setValue('totalAmount', aggs.totalAfterTax); shouldUpdate = true; }
    if (shouldUpdate) {
        trigger('totalAmount');
    }
  }, [aggs, getValues, setValue, trigger]);

  return {
    form,
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
    
    lastSavedAt,
    clearDraft,
    
    aggs,
    products,
    ngayHetHan
  };
}
