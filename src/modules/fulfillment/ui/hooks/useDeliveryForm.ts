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
  const { draft, saveDraft, clearDraft, lastSavedAt } = useDraft<Delivery>('deliveries', delivery?.id || 'new');

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

    const isContract = Boolean(
      p.contractId ||
      (p.soHopDong && String(p.soHopDong).trim()) ||
      (source && 'soHopDong' in source && Boolean(source.soHopDong))
    );
    const resolvedContractId = isContract ? (p.contractId || (source && 'soHopDong' in source ? source.id : '')) : '';
    const resolvedQuotationId = finalQuotationId || (!isContract && source ? source.id : '') || '';

    setValue('contractId', resolvedContractId, { shouldValidate: true, shouldDirty: true });
    setValue('quotationId', resolvedQuotationId, { shouldValidate: true, shouldDirty: true });
    setValue('soPhieuBaoGia', finalSoPhieuBaoGia);
    setValue('soBaoGia', finalSoPhieuBaoGia);
    setValue('ngayBaoGia', finalNgayBaoGia);
    setValue('soDonHang', p.soDonHang || source?.soDonHang || '');
    setValue('loai', p.loai || source?.loai || '');
    setValue('dvt', p.dvt || source?.dvt || (p.products?.[0]?.unit || 'Máy'));
    setValue('slMay', Number(p.slMay || source?.slMay) || 1);
    setValue('giaTriHopDong', Number(p.giaTriHopDong || p.totalAmount || source?.totalAmount) || 1);
    setValue('soHopDong', p.soHopDong || source?.soHopDong || '');
    setValue('ngayKy', p.ngayKy || source?.ngayKy || '');
    setValue('tinhTrangThanhToan', p.tinhTrangThanhToan || '');
    setValue('nguoiPhuTrach', defaultOfficer);

    if ((p as any).dacCachGiaoTruoc) {
      setValue('dacCachGiaoTruoc', true);
      setValue('lyDoDacCach', (p as any).lyDoDacCach || '');
      setValue('nguoiPheDuyetDacCach', (p as any).nguoiPheDuyetDacCach || defaultLeader);
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

      const sourceRootSerials: string[] = Array.isArray(source?.danhSachMaMay) ? source.danhSachMaMay : (Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay : []);
      const currentDeliverySerials: string[] = [];
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

        // 1. Giữ nguyên serials hiện có trên dòng nếu có
        const currentItemSerials: string[] = Array.isArray(cp.danhSachMaMay) ? [...cp.danhSachMaMay] : [];

        // 2. Khử triệt để số ngày bảo hành âm (như -1365) và đưa về chuẩn 365 ngày
        const rawWarranty = cp.soNgayBaoHanh ?? source?.soNgayBaoHanh;
        const sanitizedWarranty = (rawWarranty !== undefined && rawWarranty !== null && Number(rawWarranty) > 0)
          ? Number(rawWarranty)
          : 365;

        // 3. Tự động tính hạn bảo hành dự kiến chính xác theo ngày giao máy
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

      // Phân bổ thông minh mã máy hợp đồng chỉ vào các dòng MÁY
      const allocatedProducts = smartAllocateSerials(remainingProducts, sourceRootSerials);

      const allUniqueSerials = Array.from(new Set(allocatedProducts.flatMap((p: any) => p.danhSachMaMay || [])));
      if (allUniqueSerials.length > 0) {
        setValue('danhSachMaMay', allUniqueSerials, { shouldDirty: true });
      } else if (sourceRootSerials.length > 0) {
        setValue('danhSachMaMay', sourceRootSerials, { shouldDirty: true });
      }

      if (allocatedProducts.length === 0) {
        setValue('products', []);
        setValue('slMay', 0);
        setMaxQuantities(limits);
        notify.warning('Chứng từ này đã giao đủ 100% số lượng hàng hóa (còn phải giao = 0).');
      } else {
        setValue('products', allocatedProducts);
        const actualMachineCount = calculateActualMachineCount(allocatedProducts);
        setValue('slMay', actualMachineCount);
        setMaxQuantities(limits);
      }
    }
  }, [contracts, quotations, customers, deliveries, setValue, getValues, defaultOfficer, todayStr]);

  const populateFromContract = useCallback((c: any) => {
    if (!c) return;
    setValue('contractId', c.id || '', { shouldValidate: true });
    setValue('soHopDong', c.soHopDong || '', { shouldValidate: true });
    setValue('ngayKy', c.ngayKy || '');
    setValue('customerId', c.customerId || '');
    setValue('maKh', c.maKh || '');
    setValue('tenKhachHang', c.tenKhachHang || '');
    setValue('sdt', c.sdt || '');
    setValue('nguoiDaiDien', c.nguoiDaiDien || '');
    setValue('soDonHang', c.soDonHang || '');
    setValue('loai', c.loai || 'BG Máy');
    setValue('dvt', c.dvt || 'Máy');
    setValue('giaTriHopDong', Number(c.totalAmount || c.giaTriHopDong) || 1);
    setValue('subTotal', c.subTotal || 0);
    setValue('vatRate', c.vatRate || 0);
    setValue('vatAmount', c.vatAmount || 0);
    setValue('discountRate', c.discountRate || 0);
    setValue('discountAmount', c.discountAmount || 0);
    setValue('totalAmount', c.totalAmount || 0);
    setValue('nguoiPhuTrach', defaultOfficer);

    // Kích hoạt Đặc cách Lãnh đạo cho xuất kho trước thanh toán
    setValue('dacCachGiaoTruoc', true);
    setValue('lyDoDacCach', c.lyDoDacCach || 'Giao hàng trước thanh toán theo phê duyệt của Lãnh đạo');
    setValue('nguoiPheDuyetDacCach', c.nguoiPheDuyetDacCach || defaultLeader);
    setValue('tinhTrangThanhToan', 'CHƯA THANH TOÁN');

    // Snapshot quotation lineage nếu có
    if (c.quotationId) {
      setValue('quotationId', c.quotationId);
      setValue('soPhieuBaoGia', c.soPhieuBaoGia || c.soBaoGia || '');
      setValue('soBaoGia', c.soPhieuBaoGia || c.soBaoGia || '');
      setValue('ngayBaoGia', c.ngayBaoGia || '');
    }

    // Liên hệ khách hàng
    const targetCustId = c.customerId;
    const targetCustMa = c.maKh;
    const customer = customers?.find((cust: any) => (targetCustId && cust.id === targetCustId) || (targetCustMa && cust.maKh === targetCustMa));

    const contactPerson = customer?.contacts?.[0]?.nguoiDaiDien || customer?.nguoiDaiDien || c.nguoiDaiDien || '';
    const contactPhone = customer?.contacts?.[0]?.sdt || customer?.sdt || c.sdt || '';
    const deliveryAddress = customer?.diaChi || customer?.tinhThanh || c.diaChi || '';

    setValue('nguoiLienHe', contactPerson, { shouldValidate: true });
    setValue('sdtLienHe', contactPhone, { shouldValidate: true });
    setValue('diaChiGiaoHang', deliveryAddress, { shouldValidate: true });

    // Payment mapping nếu có
    const linkedPayment = payments?.find((p: any) => p.contractId === c.id || (c.soHopDong && p.soHopDong === c.soHopDong));
    if (linkedPayment) {
      setValue('paymentId', linkedPayment.id || linkedPayment.paymentId || '');
    }

    const productList = (Array.isArray(c.products) && c.products.length > 0 ? c.products : null)
      || (Array.isArray(c.sanPham) && c.sanPham.length > 0 ? c.sanPham : null)
      || [];

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
      const limits: Record<string, number> = {};
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

      // Phân bổ thông minh mã máy hợp đồng chỉ vào các dòng MÁY
      const allocatedProducts = smartAllocateSerials(remainingCandidates, sourceRootSerials);
      setValue('products', allocatedProducts);

      const allUniqueSerials = Array.from(new Set(allocatedProducts.flatMap((p: any) => p.danhSachMaMay || [])));
      if (allUniqueSerials.length > 0) {
        setValue('danhSachMaMay', allUniqueSerials, { shouldDirty: true });
      } else if (sourceRootSerials.length > 0) {
        setValue('danhSachMaMay', sourceRootSerials, { shouldDirty: true });
      }

      const actualMachineCount = calculateActualMachineCount(allocatedProducts);
      setValue('slMay', actualMachineCount);
      setMaxQuantities(limits);
    }
  }, [customers, deliveries, payments, setValue, getValues, defaultOfficer, todayStr]);

  const populateFromQuotation = useCallback((q: any) => {
    if (!q) return;
    setValue('contractId', '', { shouldValidate: true, shouldDirty: true });
    setValue('soHopDong', '', { shouldDirty: true });
    setValue('ngayKy', '', { shouldDirty: true });
    setValue('quotationId', q.id, { shouldValidate: true, shouldDirty: true });
    setValue('soPhieuBaoGia', q.soPhieuBaoGia || '');
    setValue('soBaoGia', q.soPhieuBaoGia || '');
    setValue('ngayBaoGia', q.ngayBaoGia || '');
    setValue('customerId', q.customerId || '');
    setValue('maKh', q.maKh || '');
    setValue('tenKhachHang', q.tenKhachHang || '');
    setValue('sdt', q.sdt || '');
    setValue('nguoiDaiDien', q.nguoiDaiDien || '');
    setValue('loai', q.loai || '');
    setValue('loaiBaoGia', q.loai || '');
    setValue('dvt', q.dvt || 'Bộ');
    setValue('slMay', Number(q.slMay) || 1);
    setValue('giaTriHopDong', Number(q.totalAmount) || 0);
    setValue('totalAmount', Number(q.totalAmount) || 0);
    setValue('subTotal', q.subTotal || 0);
    setValue('vatRate', q.vatRate || 0);
    setValue('vatAmount', q.vatAmount || 0);
    setValue('discountRate', q.discountRate || 0);
    setValue('discountAmount', q.discountAmount || 0);
    setValue('nguoiPhuTrach', defaultOfficer);

    const targetCustId = q.customerId;
    const targetCustMa = q.maKh;
    const customer = customers?.find((c: any) => (targetCustId && c.id === targetCustId) || (targetCustMa && c.maKh === targetCustMa));

    const contactPerson = customer?.contacts?.[0]?.nguoiDaiDien || customer?.nguoiDaiDien || q.nguoiDaiDien || '';
    const contactPhone = customer?.contacts?.[0]?.sdt || customer?.sdt || q.sdt || '';
    const deliveryAddress = customer?.diaChi || customer?.tinhThanh || q.diaChi || '';

    setValue('nguoiLienHe', contactPerson, { shouldValidate: true });
    setValue('sdtLienHe', contactPhone, { shouldValidate: true });
    setValue('diaChiGiaoHang', deliveryAddress, { shouldValidate: true });

    const productList = Array.isArray(q.products) ? q.products : [];
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

      const limits: Record<string, number> = {};
      const quoRootSerials: string[] = Array.isArray(q.danhSachMaMay) ? q.danhSachMaMay : [];
      const currentDeliverySerials: string[] = [];
      const baseDateStr = getValues('ngayGiaoMay') || getValues('ngayLapPgh') || todayStr;

      const remainingProducts = productList.map((cp: any, idx: number) => {
        const itemKey = getProductItemKey(cp, idx);
        const delivered = actualDeliveredMap[itemKey] || (cp.productId ? actualDeliveredMap[cp.productId] : 0) || 0;
        const reqQty = Number(cp.quantity || 0);
        const remaining = Math.max(0, reqQty - delivered);
        limits[itemKey] = remaining;

        let itemSerials: string[] = Array.isArray(cp.danhSachMaMay) && cp.danhSachMaMay.length > 0
          ? [...cp.danhSachMaMay]
          : [];
        if (itemSerials.length === 0 && quoRootSerials.length > 0) {
          itemSerials = quoRootSerials.slice(0, remaining);
        }
        currentDeliverySerials.push(...itemSerials);

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
          quantity: remaining,
          soNgayBaoHanh: sanitizedWarranty,
          ngayHetHanBaoHanh: computedExpiry,
          danhSachMaMay: itemSerials
        };
      }).filter((cp: any) => limits[cp.id] > 0);

      const allUniqueSerials = Array.from(new Set(currentDeliverySerials));
      if (allUniqueSerials.length > 0) {
        setValue('danhSachMaMay', allUniqueSerials, { shouldDirty: true });
      }

      setValue('products', remainingProducts);
      const totalRemainingQty = remainingProducts.reduce((sum: number, it: any) => sum + (it.quantity || 0), 0);
      setValue('slMay', totalRemainingQty);
      setMaxQuantities(limits);
    }
  }, [customers, deliveries, setValue, getValues, defaultOfficer, todayStr]);

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
      if (lastPopulatedPaymentIdRef.current === selectedPaymentId) return;
      lastPopulatedPaymentIdRef.current = selectedPaymentId;

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
    getValues,
    isDirty,
    saveDraft,
  };
}
