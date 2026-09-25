import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Delivery, DeliverySchema } from '@/src/domain/schema/delivery.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { useDraft } from '@/src/hooks/useDraft';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { useAuth } from '@/src/modules/iam';
import { formatUserOfficer } from '@/src/shared/utils/userProfile';
import { notify } from '@/src/shared/utils/notify';

export function useDeliveryForm(
  delivery: any,
  payments: any[],
  contracts: any[],
  quotations: any[]
) {
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [isLookingUpExportSale, setIsLookingUpExportSale] = useState(false);
  const { user, userData } = useAuth();
  const defaultOfficer = formatUserOfficer(userData, user);
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Delivery>('deliveries', delivery?.id || 'new');

  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isSubmitting } } = useForm<Delivery>({
    resolver: zodResolver(DeliverySchema) as any,
    defaultValues: draft ? { ...draft, nguoiPhuTrach: defaultOfficer } : (delivery ? { ...delivery, nguoiPhuTrach: defaultOfficer } : { 
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
      products: [],
      nguoiPhuTrach: defaultOfficer,
      keToanKho: '',
      khoXuat: '',
      ngayTaoPhieuXuat: '',
      ghiChuNoiBo: '',
      soPhieuXuat: ''
    })
  });

  useEffect(() => {
    if (defaultOfficer && getValues('nguoiPhuTrach') !== defaultOfficer) {
      setValue('nguoiPhuTrach', defaultOfficer, { shouldValidate: true });
    }
  }, [defaultOfficer, setValue, getValues]);

  useEffect(() => {
    if (delivery) {
      reset({
        ...delivery,
        products: delivery.products || [],
        danhSachMaMay: delivery.danhSachMaMay || [],
        ghiChu: delivery.ghiChu || '',
        donViVanChuyen: delivery.donViVanChuyen || '',
        soPhieuXuat: delivery.soPhieuXuat || '',
        slMay: delivery.slMay || 0,
        nguoiPhuTrach: defaultOfficer,
        keToanKho: delivery.keToanKho || '',
        khoXuat: delivery.khoXuat || '',
        ngayTaoPhieuXuat: delivery.ngayTaoPhieuXuat || '',
        ghiChuNoiBo: delivery.ghiChuNoiBo || delivery.ghiChu || ''
      });
    }
  }, [delivery, reset, defaultOfficer]);

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

  const populateFromPayment = useCallback((p: any) => {
    if (!p) return;
    const source = p.contractId
      ? contracts?.find((c: any) => c.id === p.contractId || c.soHopDong === p.soHopDong)
      : quotations?.find((q: any) => q.id === p.quotationId || q.soPhieuBaoGia === p.soPhieuBaoGia);

    setValue('paymentId', p.id || p.paymentId || '', { shouldValidate: true });
    setValue('customerId', p.customerId || source?.customerId || '');
    setValue('maKh', p.maKh || source?.maKh || '');
    setValue('tenKhachHang', p.tenKhachHang || source?.tenKhachHang || '');
    setValue('sdt', p.sdt || source?.sdt || '');
    setValue('nguoiDaiDien', source?.nguoiDaiDien || p.nguoiDaiDien || '');
    setValue('contractId', p.contractId || '');
    setValue('quotationId', p.quotationId || '');
    setValue('soDonHang', p.soDonHang || '');
    setValue('loai', p.loai || source?.loai || '');
    setValue('dvt', p.dvt || source?.dvt || 'Máy');
    setValue('slMay', Number(p.slMay || source?.slMay) || 1);
    setValue('giaTriHopDong', Number(p.giaTriHopDong || p.totalAmount || source?.totalAmount) || 1);
    setValue('soHopDong', p.soHopDong || source?.soHopDong || '');
    setValue('ngayKy', p.ngayKy || source?.ngayKy || '');
    setValue('tinhTrangThanhToan', p.tinhTrangThanhToan || '');
    setValue('nguoiPhuTrach', defaultOfficer);

    const productSource = (source && Array.isArray(source.products) && source.products.length > 0)
      ? source 
      : (Array.isArray(p.products) && p.products.length > 0 ? p : null);

    if (productSource && productSource.products) {
      setValue('subTotal', productSource.subTotal);
      setValue('vatRate', productSource.vatRate);
      setValue('vatAmount', productSource.vatAmount);
      setValue('discountRate', productSource.discountRate);
      setValue('discountAmount', productSource.discountAmount);
      setValue('totalAmount', productSource.totalAmount);

      const currentDelivered = productSource.deliveredQuantities || {};
      const limits: Record<string, number> = {};
      
      const remainingProducts = productSource.products.map((cp: any, index: number) => {
        const itemKey = getProductItemKey(cp, index);
        const delivered = Number(currentDelivered[itemKey] || 0);
        const remaining = Math.max(0, Number(cp.quantity || 0) - delivered);
        limits[itemKey] = remaining;
        
        return {
          ...cp,
          id: itemKey,
          quantity: remaining
        };
      }).filter((cp: any) => limits[cp.id] > 0);

      setValue('products', remainingProducts.length > 0 ? remainingProducts : productSource.products.map((cp: any, idx: number) => ({ ...cp, id: getProductItemKey(cp, idx), quantity: Number(cp.quantity || 0) })));
      setMaxQuantities(limits);
    }
  }, [contracts, quotations, setValue, defaultOfficer]);

  useEffect(() => {
    if (selectedPaymentId && !delivery?.id) {
      const p = payments?.find((x: any) => x.id === selectedPaymentId || x.paymentId === selectedPaymentId);
      if (p) {
        populateFromPayment(p);
      } else {
        fetch(`/api/search/payments?q=${encodeURIComponent(selectedPaymentId)}&limit=1`)
          .then(res => res.json())
          .then(resData => {
            const found = resData?.data?.[0];
            if (found && (found.id === selectedPaymentId || found.paymentId === selectedPaymentId)) {
              populateFromPayment(found);
            }
          })
          .catch(() => {});
      }
    }
  }, [selectedPaymentId, delivery?.id, payments, populateFromPayment]);

  const lookupExportSale = useCallback(async (batchCodeToLookup?: string) => {
    const code = (batchCodeToLookup || getValues('soPhieuXuat') || '').trim();
    if (!code) {
      notify.warning('Vui lòng nhập số phiếu xuất kho cần tra cứu');
      return;
    }

    try {
      setIsLookingUpExportSale(true);
      // 1. Gọi backend lookup endpoint
      let res = await fetch(`/api/items/export-sale/lookup?batch_code=${encodeURIComponent(code)}`);
      let json: any = null;
      if (res.ok) {
        json = await res.json();
      }

      // 2. Dự phòng gọi trực tiếp ERP nếu backend không phản hồi
      if (!json?.success || !json?.data) {
        const year = new Date().getFullYear();
        const listResp = await fetch(`https://sgm.vnaisoft.com/api/public/export-sale?from_date=01-01-${year}&to_date=31-12-${year}`);
        if (listResp.ok) {
          const listJson = await listResp.json();
          const list = Array.isArray(listJson) ? listJson : (listJson.data || []);
          const normTarget = code.toLowerCase().replace(/[\s\-_]/g, '');
          const item = list.find((it: any) => {
            const b = String(it.batch_code || it.code || '').toLowerCase().replace(/[\s\-_]/g, '');
            return b === normTarget || (it.batch_code && String(it.batch_code).toLowerCase().includes(code.toLowerCase()));
          });
          if (item?._id) {
            const detailResp = await fetch(`https://sgm.vnaisoft.com/api/public/export-sale/${item._id}`);
            if (detailResp.ok) {
              const detailJson = await detailResp.json();
              const d = detailJson.data || detailJson;
              json = {
                success: true,
                data: {
                  batch_code: d.batch_code || item.batch_code || code,
                  note: d.note || '',
                  created_at: d.created_at || d.event_date || '',
                  by_name: d.created_by_name || d.by_name || d.approved_by_name || d.created_by || '',
                  warehouse_name: d.warehouse_name || '',
                  transport_company: d.transport_company || '',
                  vehicle_phone: d.vehicle_phone || ''
                }
              };
            }
          }
        }
      }

      if (json?.success && json?.data) {
        const { note, created_at, by_name, warehouse_name, transport_company, vehicle_phone } = json.data;
        if (note) {
          setValue('ghiChu', note, { shouldDirty: true });
          setValue('ghiChuNoiBo', note, { shouldDirty: true });
        }
        if (created_at) {
          const dateStr = created_at.includes('T') ? created_at.split('T')[0] : created_at;
          setValue('ngayTaoPhieuXuat', dateStr, { shouldDirty: true });
        }
        if (by_name) {
          setValue('keToanKho', by_name, { shouldDirty: true });
        }
        if (warehouse_name) {
          setValue('khoXuat', warehouse_name, { shouldDirty: true });
        }
        if (transport_company && !getValues('donViVanChuyen')) {
          setValue('donViVanChuyen', transport_company, { shouldDirty: true });
        }
        if (vehicle_phone && !getValues('soDienThoaiDonViVanChuyen')) {
          setValue('soDienThoaiDonViVanChuyen', vehicle_phone, { shouldDirty: true });
        }
        notify.success(`Đã tự động lấy dữ liệu phiếu xuất ${json.data.batch_code || code} từ ERP`);
      } else {
        notify.warning(`Không tìm thấy thông tin phiếu xuất kho cho mã: ${code}`);
      }
    } catch (err: any) {
      console.error('Error looking up export sale:', err);
      notify.error('Lỗi khi tra cứu thông tin phiếu xuất bán hàng');
    } finally {
      setIsLookingUpExportSale(false);
    }
  }, [getValues, setValue]);

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
    populateFromPayment,
    lookupExportSale,
    isLookingUpExportSale,
    getValues,
  };
}
