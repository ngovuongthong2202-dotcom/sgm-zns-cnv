import { useState, useEffect, useCallback, useRef } from 'react';
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
import { calculateActualMachineCount, smartAllocateSerials } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { useSharedFields } from '@/src/hooks/useSharedFields';
import { generateDeterministicNextCode } from '@/src/shared/utils/voucherResolver';

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
  const { lanhDaoPheDuyetList } = useSharedFields();
  const defaultLeader = (lanhDaoPheDuyetList && lanhDaoPheDuyetList.length > 0) ? lanhDaoPheDuyetList[0] : '';
  const scopedDraftKey = delivery?.id || (
    delivery?.paymentId ? `new_pay_${delivery.paymentId}` : (
      delivery?.contractId ? `new_ctr_${delivery.contractId}` : (
        delivery?.quotationId ? `new_quo_${delivery.quotationId}` : 'new_standalone'
      )
    )
  );
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Delivery>('deliveries', scopedDraftKey);

  const todayStr = new Date().toISOString().split('T')[0];

  const { register, handleSubmit, watch, setValue, getValues, reset, formState: { errors, isSubmitting, isDirty } } = useForm<Delivery>({
    resolver: zodResolver(DeliverySchema) as any,
    defaultValues: draft ? { 
      ...draft, 
      nguoiPhuTrach: draft.nguoiPhuTrach || defaultOfficer,
      ngayLapPgh: draft.ngayLapPgh || todayStr,
      ngayGiaoMay: draft.ngayGiaoMay || todayStr,
    } : (delivery ? { 
      ...delivery, 
      nguoiPhuTrach: delivery.nguoiPhuTrach || defaultOfficer,
      ngayLapPgh: delivery.ngayLapPgh || todayStr,
      ngayGiaoMay: delivery.ngayGiaoMay || todayStr,
      nguoiPheDuyetDacCach: delivery.nguoiPheDuyetDacCach || defaultLeader,
    } : { 
      trangThaiGuiTinGiaoHang: EntityZnsStatus.CHUA_GUI,
      ngayLapPgh: todayStr,
      ngayGiaoMay: todayStr,
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
      nguoiPheDuyetDacCach: defaultLeader
    })
  });

  const initializedDeliveryRef = useRef<string | null>(null);

  useEffect(() => {
    if (delivery) {
      const deliveryKey = delivery.id || `${delivery.paymentId || ''}_${delivery.contractId || ''}_${delivery.quotationId || ''}`;
      if (initializedDeliveryRef.current === deliveryKey) return;
      initializedDeliveryRef.current = deliveryKey;

      reset({
        ...delivery,
        ngayLapPgh: delivery.ngayLapPgh || todayStr,
        ngayGiaoMay: delivery.ngayGiaoMay || todayStr,
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
        nguoiPheDuyetDacCach: (delivery as any).nguoiPheDuyetDacCach || defaultLeader
      });
    }
  }, [delivery, reset, defaultOfficer, todayStr, defaultLeader]);

  const watchAll = watch();
  
  useEffect(() => {
    if (!isDirty) return;
    const interval = setInterval(() => {
      saveDraft(getValues());
    }, 8000);
    return () => clearInterval(interval);
  }, [isDirty, saveDraft, getValues]);

  const isCreating = !delivery?.id;

  // Auto Generate Delivery ID (PGH-YYYY-XXXX) từ Universal Sequence Engine (Zero Math.random)
  useEffect(() => {
    let isCancelled = false;
    if (isCreating && !draft?.deliveryId) {
      const currentCode = watch('deliveryId');
      if (!currentCode) {
        const fallbackCode = generateDeterministicNextCode('PGH', deliveries);
        setValue('deliveryId', fallbackCode, { shouldValidate: true });

        if (typeof fetch === 'function') {
          fetch('/api/workflow/next-code/delivery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(1500)
          })
            .then(res => res.json())
            .then(data => {
              if (!isCancelled && data?.success && data?.code) {
                setValue('deliveryId', data.code, { shouldValidate: true });
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

    const targetPayId = p.id || p.paymentId || '';
    const resolvedQuot = (quotations || []).find((q: any) => 
      (p.quotationId && (q.id === p.quotationId || q.soPhieuBaoGia === p.quotationId)) ||
      (source?.quotationId && (q.id === source.quotationId || q.soPhieuBaoGia === source.quotationId)) ||
      (source?.soPhieuBaoGia && (q.soPhieuBaoGia === source.soPhieuBaoGia || q.id === source.soPhieuBaoGia))
    );
    const finalQuotationId = p.quotationId || source?.quotationId || resolvedQuot?.id || '';
    const finalSoPhieuBaoGia = (p as any).soPhieuBaoGia || source?.soPhieuBaoGia || (source as any)?.soBaoGia || resolvedQuot?.soPhieuBaoGia || (resolvedQuot as any)?.soBaoGia || '';
    const finalNgayBaoGia = (p as any).ngayBaoGia || (source as any)?.ngayBaoGia || resolvedQuot?.ngayBaoGia || '';

    const isContract = Boolean(
      p.contractId ||
      (p.soHopDong && String(p.soHopDong).trim()) ||
      (source && 'soHopDong' in source && Boolean(source.soHopDong))
    );
    const resolvedContractId = isContract ? (p.contractId || (source && 'soHopDong' in source ? source.id : '')) : '';
    const resolvedQuotationId = finalQuotationId || (!isContract && source ? source.id : '') || '';

    const targetCustId = p.customerId || source?.customerId;
    const targetCustMa = p.maKh || source?.maKh;
    const customer = customers?.find((c: any) => (targetCustId && c.id === targetCustId) || (targetCustMa && c.maKh === targetCustMa));

    const contactPerson = source?.nguoiDaiDien || source?.nguoiLienHe || p.nguoiDaiDien || p.nguoiLienHe || (p as any).tenNguoiNop || customer?.contacts?.[0]?.nguoiDaiDien || customer?.nguoiDaiDien || '';
    const contactPhone = source?.sdt || source?.sdtLienHe || p.sdt || p.sdtLienHe || customer?.contacts?.[0]?.sdt || customer?.sdt || '';
    const deliveryAddress = source?.diaChi || p.diaChi || customer?.diaChi || customer?.tinhThanh || '';

    const productList = (Array.isArray(source?.products) && source.products.length > 0 ? source.products : null)
      || (Array.isArray(source?.sanPham) && source.sanPham.length > 0 ? source.sanPham : null)
      || (Array.isArray(p.products) && p.products.length > 0 ? p.products : null)
      || (Array.isArray(p.sanPham) && p.sanPham.length > 0 ? p.sanPham : null)
      || [];

    const limits: Record<string, number> = {};
    let allocatedProducts: any[] = [];
    let finalSerials: string[] = [];
    let actualMachineCount = 0;

    if (productList.length > 0) {
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
      const sourceRootSerials: string[] = Array.isArray(source?.danhSachMaMay) ? source.danhSachMaMay : (Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay : []);
      const baseDateStr = getValues('ngayGiaoMay') || getValues('ngayLapPgh') || todayStr;

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

        const currentItemSerials: string[] = Array.isArray(cp.danhSachMaMay) ? [...cp.danhSachMaMay] : [];

        const rawWarranty = cp.soNgayBaoHanh ?? source?.soNgayBaoHanh;
        const sanitizedWarranty = (rawWarranty !== undefined && rawWarranty !== null && Number(rawWarranty) > 0)
          ? Number(rawWarranty)
          : 365;

        let computedExpiry = cp.ngayHetHanBaoHanh;
        if (!computedExpiry || sanitizedWarranty > 0) {
          const b = new Date(baseDateStr);
          if (!isNaN(b.getTime())) {
            const exp = new Date(b.getTime() + sanitizedWarranty * 24 * 60 * 60 * 1000);
            computedExpiry = exp.toISOString().split('T')[0];
          }
        }

        return {
          ...cp,
          id: itemKey,
          productName: cp.productName || cp.tenSanPham || '',
          quantity: remaining,
          price: cp.price || cp.donGia || 0,
          soNgayBaoHanh: sanitizedWarranty,
          ngayHetHanBaoHanh: computedExpiry,
          danhSachMaMay: currentItemSerials
        };
      }).filter((cp: any) => limits[cp.id] > 0);

      allocatedProducts = smartAllocateSerials(remainingProducts, sourceRootSerials);
      const allUniqueSerials = Array.from(new Set(allocatedProducts.flatMap((p: any) => p.danhSachMaMay || [])));
      finalSerials = allUniqueSerials.length > 0 ? allUniqueSerials : sourceRootSerials;
      actualMachineCount = calculateActualMachineCount(allocatedProducts);

      if (allocatedProducts.length === 0) {
        notify.warning('Chứng từ này đã giao đủ 100% số lượng hàng hóa (còn phải giao = 0).');
      }
    }

    const currentValues = getValues();
    reset({
      ...currentValues,
      paymentId: targetPayId,
      customerId: p.customerId || source?.customerId || '',
      maKh: p.maKh || source?.maKh || '',
      tenKhachHang: p.tenKhachHang || source?.tenKhachHang || '',
      sdt: p.sdt || source?.sdt || '',
      nguoiDaiDien: source?.nguoiDaiDien || p.nguoiDaiDien || '',
      contractId: resolvedContractId,
      quotationId: resolvedQuotationId,
      soPhieuBaoGia: finalSoPhieuBaoGia,
      soBaoGia: finalSoPhieuBaoGia,
      ngayBaoGia: finalNgayBaoGia,
      soDonHang: p.soDonHang || source?.soDonHang || '',
      loai: p.loai || source?.loai || '',
      dvt: p.dvt || source?.dvt || (p.products?.[0]?.unit || 'Máy'),
      slMay: allocatedProducts.length === 0 ? 0 : (actualMachineCount || Number(p.slMay || source?.slMay) || 0),
      giaTriHopDong: Number(p.giaTriHopDong || p.totalAmount || source?.totalAmount) || 1,
      soHopDong: p.soHopDong || source?.soHopDong || '',
      ngayKy: p.ngayKy || source?.ngayKy || '',
      tinhTrangThanhToan: p.tinhTrangThanhToan || '',
      nguoiPhuTrach: defaultOfficer,
      dacCachGiaoTruoc: Boolean((p as any).dacCachGiaoTruoc || currentValues.dacCachGiaoTruoc),
      lyDoDacCach: (p as any).lyDoDacCach || currentValues.lyDoDacCach || '',
      nguoiPheDuyetDacCach: (p as any).nguoiPheDuyetDacCach || currentValues.nguoiPheDuyetDacCach || defaultLeader,
      nguoiLienHe: contactPerson,
      sdtLienHe: contactPhone,
      diaChiGiaoHang: deliveryAddress,
      subTotal: source ? (source.subTotal || p.subTotal) : currentValues.subTotal,
      vatRate: source ? (source.vatRate || p.vatRate) : currentValues.vatRate,
      vatAmount: source ? (source.vatAmount || p.vatAmount) : currentValues.vatAmount,
      discountRate: source ? (source.discountRate || p.discountRate) : currentValues.discountRate,
      discountAmount: source ? (source.discountAmount || p.discountAmount) : currentValues.discountAmount,
      totalAmount: source ? (source.totalAmount || p.totalAmount) : currentValues.totalAmount,
      products: allocatedProducts,
      danhSachMaMay: finalSerials
    });
    setMaxQuantities(limits);
  }, [contracts, quotations, customers, deliveries, reset, getValues, defaultOfficer, todayStr, defaultLeader]);

  const populateFromContract = useCallback((c: any) => {
    if (!c) return;
    const targetCustId = c.customerId;
    const targetCustMa = c.maKh;
    const customer = customers?.find((cust: any) => (targetCustId && cust.id === targetCustId) || (targetCustMa && cust.maKh === targetCustMa));

    const contactPerson = c.nguoiDaiDien || c.nguoiLienHe || customer?.contacts?.[0]?.nguoiDaiDien || customer?.nguoiDaiDien || '';
    const contactPhone = c.sdt || c.sdtLienHe || customer?.contacts?.[0]?.sdt || customer?.sdt || '';
    const deliveryAddress = c.diaChi || customer?.diaChi || customer?.tinhThanh || '';

    const linkedPayment = payments?.find((p: any) => p.contractId === c.id || (c.soHopDong && p.soHopDong === c.soHopDong));
    const productList = (Array.isArray(c.products) && c.products.length > 0 ? c.products : null)
      || (Array.isArray(c.sanPham) && c.sanPham.length > 0 ? c.sanPham : null)
      || [];

    const limits: Record<string, number> = {};
    let allocatedProducts: any[] = [];
    let finalSerials: string[] = [];
    let actualMachineCount = 0;

    if (productList.length > 0) {
      const validDeliveries = (deliveries || []).filter((d: any) => 
        !d.deletedAt && !d.deleted_at && String(d.tinhTrangGiaoHang || '').toUpperCase() !== 'HỦY'
      );
      const linkedDeliveries = validDeliveries.filter((d: any) => d.contractId === c.id || (c.soHopDong && d.soHopDong === c.soHopDong));

      const actualDeliveredMap: Record<string, number> = {};
      linkedDeliveries.forEach((d: any) => {
        const dItems = Array.isArray(d.products) && d.products.length > 0 ? d.products : [];
        dItems.forEach((dp: any, idx: number) => {
          const itemKey = getProductItemKey(dp, idx);
          const qty = Number(dp.quantity || dp.soLuong || 0);
          actualDeliveredMap[itemKey] = (actualDeliveredMap[itemKey] || 0) + qty;
          if (dp.productId) actualDeliveredMap[String(dp.productId)] = (actualDeliveredMap[String(dp.productId)] || 0) + qty;
        });
      });

      const sourceDelivered = (c.deliveredQuantities || {}) as Record<string, number>;
      const sourceRootSerials: string[] = Array.isArray(c.danhSachMaMay) ? c.danhSachMaMay : [];
      const baseDateStr = getValues('ngayGiaoMay') || getValues('ngayLapPgh') || todayStr;

      const remainingCandidates = productList.map((cp: any, index: number) => {
        const itemKey = getProductItemKey(cp, index);
        const fromDeliveries = Number(actualDeliveredMap[itemKey] ?? (cp.productId ? actualDeliveredMap[String(cp.productId)] : 0) ?? 0);
        const fromSource = Number(sourceDelivered[itemKey] || 0);
        const delivered = Math.max(fromDeliveries, fromSource);
        const reqQty = Number(cp.quantity || cp.soLuong || 0);
        const remaining = Math.max(0, reqQty - delivered);
        limits[itemKey] = remaining;

        const rawWarranty = cp.soNgayBaoHanh ?? c.soNgayBaoHanh;
        const sanitizedWarranty = (rawWarranty !== undefined && rawWarranty !== null && Number(rawWarranty) > 0)
          ? Number(rawWarranty)
          : 365;

        let computedExpiry = cp.ngayHetHanBaoHanh;
        if (!computedExpiry || sanitizedWarranty > 0) {
          const b = new Date(baseDateStr);
          if (!isNaN(b.getTime())) {
            const exp = new Date(b.getTime() + sanitizedWarranty * 24 * 60 * 60 * 1000);
            computedExpiry = exp.toISOString().split('T')[0];
          }
        }

        return {
          ...cp,
          id: itemKey,
          productName: cp.productName || cp.tenSanPham || '',
          quantity: remaining,
          price: cp.price || cp.donGia || 0,
          soNgayBaoHanh: sanitizedWarranty,
          ngayHetHanBaoHanh: computedExpiry,
          danhSachMaMay: Array.isArray(cp.danhSachMaMay) ? [...cp.danhSachMaMay] : []
        };
      }).filter((cp: any) => limits[cp.id] > 0);

      allocatedProducts = smartAllocateSerials(remainingCandidates, sourceRootSerials);
      const allUniqueSerials = Array.from(new Set(allocatedProducts.flatMap((p: any) => p.danhSachMaMay || [])));
      finalSerials = allUniqueSerials.length > 0 ? allUniqueSerials : sourceRootSerials;
      actualMachineCount = calculateActualMachineCount(allocatedProducts);
    }

    const currentValues = getValues();
    reset({
      ...currentValues,
      contractId: c.id || '',
      soHopDong: c.soHopDong || '',
      ngayKy: c.ngayKy || '',
      customerId: c.customerId || '',
      maKh: c.maKh || '',
      tenKhachHang: c.tenKhachHang || '',
      sdt: c.sdt || '',
      nguoiDaiDien: c.nguoiDaiDien || '',
      soDonHang: c.soDonHang || '',
      loai: c.loai || 'BG Máy',
      dvt: c.dvt || 'Máy',
      giaTriHopDong: Number(c.totalAmount || c.giaTriHopDong) || 1,
      subTotal: c.subTotal || 0,
      vatRate: c.vatRate || 0,
      vatAmount: c.vatAmount || 0,
      discountRate: c.discountRate || 0,
      discountAmount: c.discountAmount || 0,
      totalAmount: c.totalAmount || 0,
      nguoiPhuTrach: defaultOfficer,
      dacCachGiaoTruoc: true,
      lyDoDacCach: c.lyDoDacCach || 'Giao hàng trước thanh toán theo phê duyệt của Lãnh đạo',
      nguoiPheDuyetDacCach: c.nguoiPheDuyetDacCach || defaultLeader,
      tinhTrangThanhToan: 'CHƯA THANH TOÁN',
      quotationId: c.quotationId || currentValues.quotationId || '',
      soPhieuBaoGia: c.soPhieuBaoGia || c.soBaoGia || currentValues.soPhieuBaoGia || '',
      soBaoGia: c.soPhieuBaoGia || c.soBaoGia || currentValues.soBaoGia || '',
      ngayBaoGia: c.ngayBaoGia || currentValues.ngayBaoGia || '',
      nguoiLienHe: contactPerson,
      sdtLienHe: contactPhone,
      diaChiGiaoHang: deliveryAddress,
      paymentId: linkedPayment ? (linkedPayment.id || linkedPayment.paymentId || '') : currentValues.paymentId,
      products: allocatedProducts,
      danhSachMaMay: finalSerials,
      slMay: actualMachineCount || Number(c.slMay) || 0
    });
    setMaxQuantities(limits);
  }, [customers, deliveries, payments, reset, getValues, defaultOfficer, todayStr, defaultLeader]);

  const populateFromQuotation = useCallback((q: any) => {
    if (!q) return;
    const targetCustId = q.customerId;
    const targetCustMa = q.maKh;
    const customer = customers?.find((c: any) => (targetCustId && c.id === targetCustId) || (targetCustMa && c.maKh === targetCustMa));

    const contactPerson = q.nguoiDaiDien || q.nguoiLienHe || customer?.contacts?.[0]?.nguoiDaiDien || customer?.nguoiDaiDien || '';
    const contactPhone = q.sdt || q.sdtLienHe || customer?.contacts?.[0]?.sdt || customer?.sdt || '';
    const deliveryAddress = q.diaChi || customer?.diaChi || customer?.tinhThanh || '';

    const productList = Array.isArray(q.products) ? q.products : [];
    const limits: Record<string, number> = {};
    let allocatedProducts: any[] = [];
    let finalSerials: string[] = [];
    let actualMachineCount = 0;

    if (productList.length > 0) {
      const validDeliveries = (deliveries || []).filter((d: any) => 
        !d.deletedAt && !d.deleted_at && String(d.tinhTrangGiaoHang || '').toUpperCase() !== 'HỦY'
      );
      const linkedDeliveries = validDeliveries.filter((d: any) => d.quotationId === q.id || d.soPhieuBaoGia === q.soPhieuBaoGia);

      const actualDeliveredMap: Record<string, number> = {};
      linkedDeliveries.forEach((d: any) => {
        const dItems = Array.isArray(d.products) ? d.products : [];
        dItems.forEach((dp: any, idx: number) => {
          const itemKey = getProductItemKey(dp, idx);
          actualDeliveredMap[itemKey] = (actualDeliveredMap[itemKey] || 0) + Number(dp.quantity || 0);
          if (dp.productId) actualDeliveredMap[dp.productId] = (actualDeliveredMap[dp.productId] || 0) + Number(dp.quantity || 0);
          if (dp.productName) actualDeliveredMap[dp.productName] = (actualDeliveredMap[dp.productName] || 0) + Number(dp.quantity || 0);
        });
      });

      const quoRootSerials: string[] = Array.isArray(q.danhSachMaMay) ? q.danhSachMaMay : [];
      const baseDateStr = getValues('ngayGiaoMay') || getValues('ngayLapPgh') || todayStr;

      const remainingCandidates = productList.map((cp: any, idx: number) => {
        const itemKey = getProductItemKey(cp, idx);
        const delivered = actualDeliveredMap[itemKey] || (cp.productId ? actualDeliveredMap[cp.productId] : 0) || 0;
        const reqQty = Number(cp.quantity || cp.soLuong || 0);
        const remaining = Math.max(0, reqQty - delivered);
        limits[itemKey] = remaining;

        const rawWarranty = cp.soNgayBaoHanh ?? q.soNgayBaoHanh;
        const sanitizedWarranty = (rawWarranty !== undefined && rawWarranty !== null && Number(rawWarranty) > 0)
          ? Number(rawWarranty)
          : 365;

        let computedExpiry = cp.ngayHetHanBaoHanh;
        if (!computedExpiry || sanitizedWarranty > 0) {
          const b = new Date(baseDateStr);
          if (!isNaN(b.getTime())) {
            const exp = new Date(b.getTime() + sanitizedWarranty * 24 * 60 * 60 * 1000);
            computedExpiry = exp.toISOString().split('T')[0];
          }
        }

        return {
          ...cp,
          id: itemKey,
          productName: cp.productName || cp.tenSanPham || '',
          quantity: remaining,
          price: cp.price || cp.donGia || 0,
          soNgayBaoHanh: sanitizedWarranty,
          ngayHetHanBaoHanh: computedExpiry,
          danhSachMaMay: Array.isArray(cp.danhSachMaMay) ? [...cp.danhSachMaMay] : []
        };
      }).filter((cp: any) => limits[cp.id] > 0);

      allocatedProducts = smartAllocateSerials(remainingCandidates, quoRootSerials);
      const allUniqueSerials = Array.from(new Set(allocatedProducts.flatMap((p: any) => p.danhSachMaMay || [])));
      finalSerials = allUniqueSerials.length > 0 ? allUniqueSerials : quoRootSerials;
      actualMachineCount = calculateActualMachineCount(allocatedProducts);
    }

    const currentValues = getValues();
    reset({
      ...currentValues,
      contractId: '',
      soHopDong: '',
      ngayKy: '',
      quotationId: q.id,
      soPhieuBaoGia: q.soPhieuBaoGia || '',
      soBaoGia: q.soPhieuBaoGia || '',
      ngayBaoGia: q.ngayBaoGia || '',
      customerId: q.customerId || '',
      maKh: q.maKh || '',
      tenKhachHang: q.tenKhachHang || '',
      sdt: q.sdt || '',
      nguoiDaiDien: q.nguoiDaiDien || '',
      loai: q.loai || '',
      loaiBaoGia: q.loai || '',
      dvt: q.dvt || 'Bộ',
      slMay: actualMachineCount || Number(q.slMay) || 1,
      giaTriHopDong: Number(q.totalAmount) || 0,
      totalAmount: Number(q.totalAmount) || 0,
      subTotal: q.subTotal || 0,
      vatRate: q.vatRate || 0,
      vatAmount: q.vatAmount || 0,
      discountRate: q.discountRate || 0,
      discountAmount: q.discountAmount || 0,
      nguoiPhuTrach: defaultOfficer,
      nguoiLienHe: contactPerson,
      sdtLienHe: contactPhone,
      diaChiGiaoHang: deliveryAddress,
      products: allocatedProducts,
      danhSachMaMay: finalSerials
    });
    setMaxQuantities(limits);
  }, [customers, deliveries, reset, getValues, defaultOfficer, todayStr]);

  const lastPopulatedQuotationIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (delivery?.quotationId && !selectedPaymentId && !delivery?.id) {
      if (lastPopulatedQuotationIdRef.current === delivery.quotationId) return;
      lastPopulatedQuotationIdRef.current = delivery.quotationId;

      const q = quotations?.find((x: any) => x.id === delivery.quotationId || x.soPhieuBaoGia === delivery.quotationId);
      if (q) {
        populateFromQuotation(q);
      }
    }
  }, [delivery?.quotationId, selectedPaymentId, delivery?.id, quotations, populateFromQuotation]);

  const lastPopulatedContractIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (delivery?.contractId && !selectedPaymentId && !delivery?.id) {
      if (lastPopulatedContractIdRef.current === delivery.contractId) return;
      lastPopulatedContractIdRef.current = delivery.contractId;

      const c = contracts?.find((x: any) => x.id === delivery.contractId || x.soHopDong === delivery.contractId);
      if (c) {
        populateFromContract(c);
      }
    }
  }, [delivery?.contractId, selectedPaymentId, delivery?.id, contracts, populateFromContract]);

  const lastPopulatedPaymentIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (selectedPaymentId && !delivery?.id) {
      const currentPayId = String(selectedPaymentId).trim();
      if (lastPopulatedPaymentIdRef.current === currentPayId) return;

      const p = payments?.find((x: any) => x.id === currentPayId || x.paymentId === currentPayId);
      if (p) {
        lastPopulatedPaymentIdRef.current = currentPayId;
        populateFromPayment(p);
      } else {
        lastPopulatedPaymentIdRef.current = currentPayId;
        fetch(`/api/search/payments?q=${encodeURIComponent(currentPayId)}&limit=1`)
          .then(res => res.json())
          .then(resData => {
            const found = resData?.data?.[0];
            if (found && (found.id === currentPayId || found.paymentId === currentPayId)) {
              populateFromPayment(found);
            }
          })
          .catch(() => {});
      }
    }
  }, [selectedPaymentId, delivery?.id, payments, populateFromPayment]);

  const [erpLinkedCode, setErpLinkedCode] = useState<string | null>(delivery?.soPhieuXuat || null);

  const clearErpFields = useCallback((notifyUser = true) => {
    setValue('soPhieuXuat', '', { shouldDirty: true });
    setValue('khoXuat', '', { shouldDirty: true });
    setValue('keToanKho', '', { shouldDirty: true });
    setValue('ngayTaoPhieuXuat', '', { shouldDirty: true });
    setValue('donViVanChuyen', '', { shouldDirty: true });
    setValue('soDienThoaiDonViVanChuyen', '', { shouldDirty: true });
    setErpLinkedCode(null);
    if (notifyUser) {
      notify.info('Đã làm sạch thông tin liên kết phiếu xuất ERP');
    }
  }, [setValue]);

  const lookupExportSale = useCallback(async (batchCodeToLookup?: string) => {
    const code = (batchCodeToLookup !== undefined ? batchCodeToLookup : (getValues('soPhieuXuat') || '')).trim();
    if (!code) {
      clearErpFields(false);
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
        setErpLinkedCode(json.data.batch_code || code);
        notify.success(`Đã tự động lấy dữ liệu phiếu xuất ${json.data.batch_code || code} từ ERP`);
      } else {
        setErpLinkedCode(null);
        notify.warning(`Không tìm thấy thông tin phiếu xuất kho cho mã: ${code}`);
      }
    } catch (err: any) {
      console.error('Error looking up export sale:', err);
      notify.error('Lỗi khi tra cứu thông tin phiếu xuất bán hàng');
    } finally {
      setIsLookingUpExportSale(false);
    }
  }, [getValues, setValue, clearErpFields]);

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
    const machineCount = calculateActualMachineCount(deliveryProducts);
    setValue('slMay', machineCount, { shouldDirty: true });
    
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
    populateFromContract,
    populateFromQuotation,
    lookupExportSale,
    isLookingUpExportSale,
    clearErpFields,
    erpLinkedCode,
    getValues,
    isDirty,
    saveDraft,
  };
}
