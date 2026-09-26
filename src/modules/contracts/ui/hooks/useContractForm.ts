import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDraft } from '@/src/hooks/useDraft';
import { Contract } from '@/src/domain/schema/contract.schema';
import { aggregateProducts, computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import {
  FormSchema,
  FormValues,
  getInitialContractFormValues,
  applyQuotationToContractForm,
  computeEstimatedCompletionDate,
  filterExistingContractsForQuo
} from '../components/ContractFormHelpers';

import { useAuth } from '@/src/modules/iam';
import { formatUserOfficer } from '@/src/shared/utils/userProfile';

export function useContractForm(
  contract: Contract | null,
  contracts: Contract[],
  allPayments: any[],
  allDeliveries: any[],
  prefillQuotation?: any
) {
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [activeQuotationDoc, setActiveQuotationDoc] = useState<any>(null);
  const { user, userData } = useAuth();
  const defaultOfficer = formatUserOfficer(userData, user);

  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Contract>('contracts', contract?.id || 'new');

  const initialFormValues = useMemo(() => {
    const base = getInitialContractFormValues(contract, draft);
    return { ...base, nguoiPhuTrach: defaultOfficer };
  }, [contract, draft, defaultOfficer]);

  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isSubmitting, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: initialFormValues
  });

  useEffect(() => {
    if (defaultOfficer && getValues('nguoiPhuTrach') !== defaultOfficer) {
      setValue('nguoiPhuTrach', defaultOfficer, { shouldValidate: true });
    }
  }, [defaultOfficer, setValue, getValues]);

  useEffect(() => {
    if (contract) {
      reset({
        ...getInitialContractFormValues(contract, null),
        nguoiPhuTrach: defaultOfficer
      });
    }
  }, [contract, reset, defaultOfficer]);

  const selectedQuoId = watch('quotationId');
  const products = watch('products') || [];
  const ngayKy = watch('ngayKy');
  const soNgayDuKienHoanThanh = watch('soNgayDuKienHoanThanh') || 0;
  const watchAll = watch();

  useEffect(() => {
    let isCancelled = false;
    if (!contract && !draft) {
      const currentCode = watch('soHopDong');
      if (!currentCode) {
        const fallbackCode = `HD-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        setValue('soHopDong', fallbackCode, { shouldValidate: true });

        fetch('/api/workflow/next-code/contract', { method: 'POST' })
          .then(res => res.json())
          .then(data => {
            if (!isCancelled && data.success && data.code) {
              setValue('soHopDong', data.code, { shouldValidate: true, shouldDirty: true });
            }
          })
          .catch(() => {
            // Giữ fallbackCode an toàn khi mất kết nối mạng
          });
      }
    }
    return () => { isCancelled = true; };
  }, [contract, draft, setValue, watch]);

  useEffect(() => {
    if (prefillQuotation && !contract && !selectedQuoId && !draft) {
      setValue('quotationId', prefillQuotation.id, { shouldValidate: true });
      setActiveQuotationDoc(prefillQuotation);
    }
  }, [prefillQuotation, contract, selectedQuoId, setValue, draft]);

  useEffect(() => {
    if (selectedQuoId && !contract && activeQuotationDoc) {
      applyQuotationToContractForm(setValue, activeQuotationDoc);
    }
  }, [selectedQuoId, activeQuotationDoc, contract, setValue]);

  useEffect(() => {
    const totalQty = products.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0); 
    if (getValues('slMay') !== totalQty) {
      setValue('slMay', totalQty);
    }
    if (products.length > 0) {
      if (!getValues('loai')) {
        setValue('loai', products[0].productName || '');
      }
      if (!getValues('dvt')) {
        setValue('dvt', products[0].unit || 'Máy');
      }
    }
  }, [products, setValue, getValues]);

  const aggs = useMemo(() => aggregateProducts((products || []).map(computeLineItem)), [products]);
  const { totalGross: subTotal, totalDiscount: discountAmount, totalVat: vatAmount, totalAfterTax: totalAmount, totalBeforeTax } = aggs;

  useEffect(() => {
    if (getValues('subTotal') !== subTotal) setValue('subTotal', subTotal);
    if (getValues('discountAmount') !== discountAmount) setValue('discountAmount', discountAmount);
    if (getValues('vatAmount') !== vatAmount) setValue('vatAmount', vatAmount);
    if (getValues('totalAmount') !== totalAmount) setValue('totalAmount', totalAmount);

    const computedDiscountRate = subTotal > 0 ? Number(((discountAmount / subTotal) * 100).toFixed(2)) : 0;
    if (getValues('discountRate') !== computedDiscountRate) setValue('discountRate', computedDiscountRate);

    const computedVatRate = totalBeforeTax > 0 ? Math.round((vatAmount / totalBeforeTax) * 100) : 0;
    if (getValues('vatRate') !== computedVatRate) setValue('vatRate', computedVatRate);
  }, [subTotal, discountAmount, vatAmount, totalAmount, totalBeforeTax, setValue, getValues]);

  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      saveDraft(getValues() as any);
    }, 8000);
    return () => clearInterval(interval);
  }, [isDirty, saveDraft, getValues]);

  const estimatedCompletionDate = useMemo(() => computeEstimatedCompletionDate(ngayKy, soNgayDuKienHoanThanh), [ngayKy, soNgayDuKienHoanThanh]);

  const existingContractsForQuo = useMemo(() => filterExistingContractsForQuo(selectedQuoId, contracts, contract?.id), [selectedQuoId, contracts, contract?.id]);

  return {
    register,
    handleSubmit,
    watch,
    watchAll,
    setValue,
    errors,
    isSubmitting,
    isDirty,
    isLockedByOther,
    setIsLockedByOther,
    draft,
    clearDraft,
    lastSavedAt,
    products,
    selectedQuoId,
    estimatedCompletionDate,
    existingContractsForQuo,
    setActiveQuotationDoc,
    subTotal,
    discountAmount,
    vatAmount,
    totalAmount
  };
}
