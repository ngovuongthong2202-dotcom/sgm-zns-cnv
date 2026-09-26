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
import { settingsRepo } from '@/src/data/repositories/settings.repo';

export function useDeliveryForm(
  delivery: any,
  payments: any[],
  contracts: any[],
  quotations: any[],
  customers: any[] = [],
  deliveries: any[] = []
) {
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [isLookingUpExportSale, setIsLookingUpExportSale] = useState(false);
  const { user, userData } = useAuth();
  const defaultOfficer = formatUserOfficer(userData, user);
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Delivery>('deliveries', delivery?.id || 'new');

  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isSubmitting } } = useForm<Delivery>({
    resolver: zodResolver(DeliverySchema) as any,
    defaultValues: draft ? { ...draft, nguoiPhuTrach: draft.nguoiPhuTrach || defaultOfficer } : (delivery ? { ...delivery, nguoiPhuTrach: delivery.nguoiPhuTrach || defaultOfficer } : { 
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
      nguoiLienHe: '',
      sdtLienHe: '',
      diaChiGiaoHang: '',
      keToanKho: '',
      khoXuat: '',
      ngayTaoPhieuXuat: '',
      ghiChuNoiBo: '',
      soPhieuXuat: '',
      dacCachGiaoTruoc: false,
      lyDoDacCach: '',
      nguoiPheDuyetDacCach: ''
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
        slMay: delivery.slMay || 0,
        nguoiPhuTrach: delivery.nguoiPhuTrach || defaultOfficer,
        nguoiLienHe: delivery.nguoiLienHe || '',
        sdtLienHe: delivery.sdtLienHe || '',
        diaChiGiaoHang: delivery.diaChiGiaoHang || '',
        keToanKho: delivery.keToanKho || '',
        khoXuat: delivery.khoXuat || '',
        ngayTaoPhieuXuat: delivery.ngayTaoPhieuXuat || '',
        ghiChuNoiBo: delivery.ghiChuNoiBo || delivery.ghiChu || '',
        dacCachGiaoTruoc: Boolean((delivery as any).dacCachGiaoTruoc),
        lyDoDacCach: (delivery as any).lyDoDacCach || '',
        nguoiPheDuyetDacCach: (delivery as any).nguoiPheDuyetDacCach || ''
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
    // Snapshot quotation lineage from source/contract/payment/quotations
    const resolvedQuot = (quotations || []).find((q: any) => 
      (p.quotationId && (q.id === p.quotationId || q.soPhieuBaoGia === p.quotationId)) ||
      (source?.quotationId && (q.id === source.quotationId || q.soPhieuBaoGia === source.quotationId)) ||
      (source?.soPhieuBaoGia && (q.soPhieuBaoGia === source.soPhieuBaoGia || q.id === source.soPhieuBaoGia))
    );
    const finalQuotationId = p.quotationId || source?.quotationId || resolvedQuot?.id || '';
    const finalSoPhieuBaoGia = (p as any).soPhieuBaoGia || source?.soPhieuBaoGia || (source as any)?.soBaoGia || resolvedQuot?.soPhieuBaoGia || (resolvedQuot as any)?.soBaoGia || '';
    const finalNgayBaoGia = (p as any).ngayBaoGia || (source as any)?.ngayBaoGia || resolvedQuot?.ngayBaoGia || '';

    setValue('contractId', p.contractId || source?.id || '');
    setValue('quotationId', finalQuotationId);
    setValue('soPhieuBaoGia', finalSoPhieuBaoGia);
    setValue('soBaoGia', finalSoPhieuBaoGia);
    setValue('ngayBaoGia', finalNgayBaoGia);
    setValue('soDonHang', p.soDonHang || source?.soDonHang || '');
    setValue('loai', p.loai || source?.loai || '');
    setValue('dvt', p.dvt || source?.dvt || 'Máy');
    setValue('slMay', Number(p.slMay || source?.slMay) || 1);
    setValue('giaTriHopDong', Number(p.giaTriHopDong || p.totalAmount || source?.totalAmount) || 1);
    setValue('soHopDong', p.soHopDong || source?.soHopDong || '');
    setValue('ngayKy', p.ngayKy || source?.ngayKy || '');
    setValue('tinhTrangThanhToan', p.tinhTrangThanhToan || '');
    setValue('nguoiPhuTrach', defaultOfficer);

    if ((p as any).dacCachGiaoTruoc) {
      setValue('dacCachGiaoTruoc', true);
      setValue('lyDoDacCach', (p as any).lyDoDacCach || '');
      setValue('nguoiPheDuyetDacCach', (p as any).nguoiPheDuyetDacCach || 'Ban Giám Đốc');
    }

    // Tự động lấy tên người liên hệ, SĐT liên hệ, Địa chỉ giao hàng từ Khách hàng
    const targetCustId = p.customerId || source?.customerId;
    const targetCustMa = p.maKh || source?.maKh;
    const customer = customers?.find((c: any) => (targetCustId && c.id === targetCustId) || (targetCustMa && c.maKh === targetCustMa));

    const contactPerson = customer?.contacts?.[0]?.nguoiDaiDien || customer?.nguoiDaiDien || source?.nguoiDaiDien || p.nguoiDaiDien || '';
    const contactPhone = customer?.contacts?.[0]?.sdt || customer?.sdt || source?.sdt || p.sdt || '';
    const deliveryAddress = customer?.diaChi || customer?.tinhThanh || source?.diaChi || p.diaChi || '';

    setValue('nguoiLienHe', contactPerson, { shouldValidate: true });
    setValue('sdtLienHe', contactPhone, { shouldValidate: true });
    setValue('diaChiGiaoHang', deliveryAddress, { shouldValidate: true });

    const productList = (Array.isArray(source?.products) && source.products.length > 0 ? source.products : null)
      || (Array.isArray(source?.sanPham) && source.sanPham.length > 0 ? source.sanPham : null)
      || (Array.isArray(p.products) && p.products.length > 0 ? p.products : null)
      || (Array.isArray(p.sanPham) && p.sanPham.length > 0 ? p.sanPham : null)
      || [];

    if (source) {
      setValue('subTotal', source.subTotal || p.subTotal);
      setValue('vatRate', source.vatRate || p.vatRate);
      setValue('vatAmount', source.vatAmount || p.vatAmount);
      setValue('discountRate', source.discountRate || p.discountRate);
      setValue('discountAmount', source.discountAmount || p.discountAmount);
      setValue('totalAmount', source.totalAmount || p.totalAmount);
    }

    if (productList.length > 0) {
      // Tìm deliveries hợp lệ liên kết với chứng từ này
      const validDeliveries = (deliveries || []).filter((d: any) => 
        !d.deletedAt && !d.deleted_at && String(d.tinhTrangGiaoHang || '').toUpperCase() !== 'HỦY'
      );
      const linkedDeliveries = validDeliveries.filter((d: any) => {
        if (d.paymentId && (d.paymentId === p.id || d.paymentId === p.paymentId)) return true;
        if (d.soChungTuThamChieu && (d.soChungTuThamChieu === p.paymentId || d.soChungTuThamChieu === p.id)) return true;
        if (source?.id && d.contractId === source.id) return true;
        if (p.contractId && d.contractId === p.contractId) return true;
        if (source?.soHopDong && d.soHopDong === source.soHopDong) return true;
        if (p.soHopDong && d.soHopDong === p.soHopDong) return true;
        if (source?.id && d.quotationId === source.id) return true;
        if (p.quotationId && d.quotationId === p.quotationId) return true;
        if (source?.soPhieuBaoGia && d.soPhieuBaoGia === source.soPhieuBaoGia) return true;
        if (p.soPhieuBaoGia && d.soPhieuBaoGia === p.soPhieuBaoGia) return true;
        if (p.soDonHang && d.soDonHang === p.soDonHang) return true;
        return false;
      });

      const actualDeliveredMap: Record<string, number> = {};
      linkedDeliveries.forEach((d: any) => {
        const dItems = Array.isArray(d.products) && d.products.length > 0 ? d.products : (Array.isArray(d.sanPham) ? d.sanPham : []);
        dItems.forEach((dp: any, idx: number) => {
          const itemKey = getProductItemKey(dp, idx);
          const qty = Number(dp.quantity || dp.soLuong || 0);
          actualDeliveredMap[itemKey] = (actualDeliveredMap[itemKey] || 0) + qty;
          if (dp.productId) actualDeliveredMap[String(dp.productId)] = (actualDeliveredMap[String(dp.productId)] || 0) + qty;
          if (dp.productName) {
            const normName = String(dp.productName).trim().toLowerCase();
            actualDeliveredMap[normName] = (actualDeliveredMap[normName] || 0) + qty;
          }
        });
      });

      const sourceDelivered = (source?.deliveredQuantities || p.deliveredQuantities || {}) as Record<string, number>;
      const limits: Record<string, number> = {};

      const remainingProducts = productList.map((cp: any, index: number) => {
        const itemKey = getProductItemKey(cp, index);
        const normName = String(cp.productName || cp.tenSanPham || '').trim().toLowerCase();
        const fromDeliveries = Number(
          actualDeliveredMap[itemKey] ?? 
          (cp.productId ? actualDeliveredMap[String(cp.productId)] : undefined) ?? 
          (normName ? actualDeliveredMap[normName] : undefined) ?? 
          0
        );
        const fromSource = Number(sourceDelivered[itemKey] || 0);
        const delivered = Math.max(fromDeliveries, fromSource);
        const reqQty = Number(cp.quantity || cp.soLuong || 0);
        const remaining = Math.max(0, reqQty - delivered);
        limits[itemKey] = remaining;

        return {
          ...cp,
          id: itemKey,
          productName: cp.productName || cp.tenSanPham || '',
          quantity: remaining,
          price: cp.price || cp.donGia || 0
        };
      }).filter((cp: any) => limits[cp.id] > 0);

      if (remainingProducts.length === 0) {
        setValue('products', []);
        setValue('slMay', 0);
        setMaxQuantities(limits);
        notify.warning('Chứng từ này đã giao đủ 100% số lượng hàng hóa (còn phải giao = 0).');
      } else {
        setValue('products', remainingProducts);
        const totalRemainingQty = remainingProducts.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
        setValue('slMay', totalRemainingQty);
        setMaxQuantities(limits);
      }
    }
  }, [contracts, quotations, customers, deliveries, setValue, defaultOfficer]);

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
      const res = await fetch(`/api/items/export-sale/lookup?batch_code=${encodeURIComponent(code)}`);
      let json: any = null;
      if (res.ok) {
        json = await res.json();
      }

      // 2. Dự phòng gọi trực tiếp ERP nếu backend không phản hồi
      if (!json?.success || !json?.data) {
        const year = new Date().getFullYear();
        const erpSettings = await settingsRepo.getSettings<any>('erp_config').catch(() => null);
        const exportSaleEndpoint = erpSettings?.exportSaleUrl?.trim() || 'https://sgm.vnaisoft.com/api/public/export-sale';
        const listResp = await fetch(`${exportSaleEndpoint}?from_date=01-01-${year}&to_date=31-12-${year}`);
        if (listResp.ok) {
          const listJson = await listResp.json();
          const list = Array.isArray(listJson) ? listJson : (listJson.data || []);
          const normTarget = code.toLowerCase().replace(/[\s\-_]/g, '');
          const item = list.find((it: any) => {
            const b = String(it.batch_code || it.code || '').toLowerCase().replace(/[\s\-_]/g, '');
            return b === normTarget || (it.batch_code && String(it.batch_code).toLowerCase().includes(code.toLowerCase()));
          });
          if (item?._id) {
            const detailResp = await fetch(`${exportSaleEndpoint}/${item._id}`);
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
