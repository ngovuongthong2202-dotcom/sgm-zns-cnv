import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Delivery, DeliverySchema } from '@/src/domain/schema/delivery.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { useDraft } from '@/src/hooks/useDraft';
import { getProductItemKey } from '@/src/shared/utils/product-key';

export function useDeliveryForm(
  delivery: any,
  payments: any[],
  contracts: any[],
  quotations: any[]
) {
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Delivery>('deliveries', delivery?.id || 'new');

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<Delivery>({
    resolver: zodResolver(DeliverySchema) as any,
    defaultValues: draft ? draft : (delivery || { 
      trangThaiGuiTinGiaoHang: EntityZnsStatus.CHUA_GUI,
      ngayLapPgh: new Date().toISOString().split('T')[0],
      ngayGiaoMay: new Date().toISOString().split('T')[0],
      danhSachMaMay: [],
      slMay: 0,
      dvt: 'Máy',
      loai: '',
      soDonHang: '',
      giaTriHopDong: 1,
      tinhTrangThanhToan: 'CHƯA THANH TOÁN',
      products: []
    })
  });

  useEffect(() => {
    if (delivery) {
      reset({
        ...delivery,
        products: delivery.products || [],
        danhSachMaMay: delivery.danhSachMaMay || [],
        ghiChu: delivery.ghiChu || '',
        donViVanChuyen: delivery.donViVanChuyen || '',
        soPhieuXuat: delivery.soPhieuXuat || '',
        slMay: delivery.slMay || 0
      });
    }
  }, [delivery, reset]);

  const watchAll = watch();
  
  useEffect(() => {
    const handler = setTimeout(() => {
      saveDraft(watchAll);
    }, 500);
    return () => clearTimeout(handler);
  }, [watchAll, saveDraft]);

  const isCreating = !delivery?.id;

  // Auto Generate Delivery ID (PGH-YYYY-XXXX) từ Universal Sequence Engine
  useEffect(() => {
    let isCancelled = false;
    if (isCreating && !draft?.deliveryId) {
      const currentCode = watch('deliveryId');
      if (!currentCode) {
        const fallbackCode = `PGH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        setValue('deliveryId', fallbackCode, { shouldValidate: true });

        if (typeof fetch === 'function') {
          fetch('/api/workflow/next-code/delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          })
            .then(res => res.json())
            .then(data => {
              if (!isCancelled && data?.success && data?.code) {
                setValue('deliveryId', data.code, { shouldValidate: true, shouldDirty: true });
              }
            })
            .catch(() => {
              // Giữ fallbackCode an toàn
            });
        }
      }
    }
    return () => {
      isCancelled = true;
    };
  }, [isCreating, draft?.deliveryId, setValue]);

  const selectedPaymentId = watch('paymentId');
  const deliveryProducts = watch('products') || [];
  const [maxQuantities, setMaxQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (selectedPaymentId && !delivery && !draft?.paymentId) {
      const p = payments?.find((x: any) => x.id === selectedPaymentId);
      if (p) {
        const source = p.contractId
          ? contracts?.find((c: any) => c.id === p.contractId)
          : quotations?.find((q: any) => q.id === p.quotationId);

        setValue('customerId', p.customerId || '');
        setValue('maKh', p.maKh || '');
        setValue('tenKhachHang', p.tenKhachHang || '');
        setValue('sdt', p.sdt || source?.sdt || '');
        setValue('nguoiDaiDien', source?.nguoiDaiDien || p.nguoiDaiDien || '');
        setValue('contractId', p.contractId || '');
        setValue('quotationId', p.quotationId || '');
        setValue('soDonHang', p.soDonHang || '');
        setValue('loai', p.loai || '');
        setValue('dvt', p.dvt || 'Máy');
        setValue('slMay', Number(p.slMay) || 1);
        setValue('giaTriHopDong', Number(p.giaTriHopDong || p.totalAmount) || 1);
        setValue('soHopDong', p.soHopDong || '');
        setValue('ngayKy', p.ngayKy || '');
        setValue('tinhTrangThanhToan', p.tinhTrangThanhToan || '');
        setValue('nguoiPhuTrach', p.nguoiPhuTrach || '');

        if (source && source.products) {
          setValue('subTotal', source.subTotal);
          setValue('vatRate', source.vatRate);
          setValue('vatAmount', source.vatAmount);
          setValue('discountRate', source.discountRate);
          setValue('discountAmount', source.discountAmount);
          setValue('totalAmount', source.totalAmount);

          const currentDelivered = source.deliveredQuantities || {};
          const limits: Record<string, number> = {};
          
          const remainingProducts = source.products.map((cp: any, index: number) => {
            const itemKey = getProductItemKey(cp, index);
            const delivered = currentDelivered[itemKey] || 0;
            const remaining = cp.quantity - delivered;
            limits[itemKey] = remaining;
            
            return {
              ...cp,
              id: itemKey,
              quantity: remaining
            };
          }).filter((cp: any) => limits[cp.id] > 0);

          setValue('products', remainingProducts);
          setMaxQuantities(limits);
        } else if (p.products) {
           setValue('products', p.products.map((cp: any, index: number) => ({ ...cp, id: getProductItemKey(cp, index), quantity: cp.quantity })));
        }
      }
    }
  }, [selectedPaymentId, payments, delivery, draft, setValue, contracts, quotations]);

  useEffect(() => {
    let source: any = null;
    let payment: any = null;

    if (selectedPaymentId) {
      payment = payments?.find((p: any) => p.id === selectedPaymentId);
      if (payment) {
        source = payment.contractId
          ? contracts?.find((c: any) => c.id === payment.contractId)
          : quotations?.find((q: any) => q.id === payment.quotationId);
      }
    } else if (delivery) {
      if (delivery.contractId) {
        source = contracts?.find((c: any) => c.id === delivery.contractId);
      } else if (delivery.quotationId) {
        source = quotations?.find((q: any) => q.id === delivery.quotationId);
      }
    }

    if (source && source.products) {
      const currentDelivered = source.deliveredQuantities || {};
      const limits: Record<string, number> = {};
      source.products.forEach((cp: any, index: number) => {
        const itemKey = getProductItemKey(cp, index);
        const totalDelivered = currentDelivered[itemKey] || 0;
        const currentShipmentQty = delivery?.products?.find((p: any, pIndex: number) => getProductItemKey(p, pIndex) === itemKey)?.quantity || 0;
        limits[itemKey] = Math.max(0, cp.quantity - (totalDelivered - currentShipmentQty));
      });
      setMaxQuantities(limits);
    }
  }, [selectedPaymentId, payments, delivery, contracts, quotations]);

  const currentSubTotal = watch('subTotal');
  const currentVatAmount = watch('vatAmount');
  const currentDiscountAmount = watch('discountAmount');
  const currentTotalAmount = watch('totalAmount');
  const vatRate = Number(watch('vatRate')) || 0;
  const discountRate = Number(watch('discountRate')) || 0;

  useEffect(() => {
    const total = deliveryProducts.reduce((sum: number, p: any) => sum + (Number(p.quantity) || 0), 0);
    setValue('slMay', total, { shouldDirty: true });
    
    if (deliveryProducts.length > 0) {
      const firstProductUnit = deliveryProducts[0].unit || (deliveryProducts[0] as any).dvt_chuan || (deliveryProducts[0] as any).dvt;
      if (firstProductUnit) {
        setValue('dvt', firstProductUnit);
      }
    }

    const customCalculateSubTotal = (prods: any[]) => prods.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.quantity) || 0), 0);
    
    const newSubTotal = customCalculateSubTotal(deliveryProducts);
    const newVatAmount = Math.round(newSubTotal * (vatRate / 100));
    const newDiscountAmount = Math.round(newSubTotal * (discountRate / 100));
    const newTotalAmount = newSubTotal + newVatAmount - newDiscountAmount;

    if (currentSubTotal !== newSubTotal) setValue('subTotal', newSubTotal, { shouldDirty: true });
    if (currentVatAmount !== newVatAmount) setValue('vatAmount', newVatAmount, { shouldDirty: true });
    if (currentDiscountAmount !== newDiscountAmount) setValue('discountAmount', newDiscountAmount, { shouldDirty: true });
    if (currentTotalAmount !== newTotalAmount) setValue('totalAmount', newTotalAmount, { shouldDirty: true });
  }, [deliveryProducts, setValue, vatRate, discountRate, currentSubTotal, currentVatAmount, currentDiscountAmount, currentTotalAmount]);

  return {
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
    maxQuantities,
    deliveryProducts,
    selectedPaymentId,
  };
}
