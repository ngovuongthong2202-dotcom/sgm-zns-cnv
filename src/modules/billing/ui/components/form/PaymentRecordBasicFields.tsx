import React from 'react';
import { Controller } from 'react-hook-form';
import { FileText, Clock, DollarSign, Lock } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { isAdministratorRole } from '@/src/shared/utils/userProfile';
import { format } from 'date-fns';
import { AsyncSearchableSelect } from '@/src/design-system/primitives/AsyncSearchableSelect';
import { MoneyInput } from '../PaymentRecordDrawerHelpers';
import { canCreatePayment } from '@/src/domain/policy/gate.policy';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { ContractHoverCard } from '@/src/modules/contracts/ui/components/ContractHoverCard';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';
import { computeLineItem, aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

interface PaymentRecordBasicFieldsProps {
  register: any;
  watch: any;
  setValue: any;
  control: any;
  otherPaid?: number;
  disabled?: boolean;
  contracts?: any[];
  quotations?: any[];
  payments?: any[];
  currentPaymentId?: string;
  nguoiPhuTrachList?: string[];
  phuongThucThanhToanList?: string[];
  tinhTrangThanhToanList?: string[];
}

export function PaymentRecordBasicFields({
  register,
  watch,
  setValue,
  control,
  otherPaid = 0,
  disabled,
  contracts = [],
  quotations = [],
  payments = [],
  currentPaymentId,
  nguoiPhuTrachList = [],
  phuongThucThanhToanList = ['Chuyển khoản', 'Tiền mặt'],
  tinhTrangThanhToanList = ['Tất toán', 'Công nợ', 'Chưa TT', 'Miễn phí']
}: PaymentRecordBasicFieldsProps) {
  const { user, userData } = useAuth();
  const isAdmin = isAdministratorRole(userData, user);
  const watchAll = watch();
  const sourceVal = watchAll.sourceValue || '';
  const [selectedDoc, setSelectedDoc] = React.useState<any>(null);

  const isContractDoc = (doc: any): boolean => {
    if (!doc) return false;
    return doc._collectionType === 'contracts' || Boolean(doc.soHopDong);
  };

  const isContract = sourceVal.startsWith('CONTRACT:') ||
                     Boolean(selectedDoc && isContractDoc(selectedDoc)) ||
                     Boolean(watchAll.contractId) ||
                     Boolean(watchAll.soHopDong);

  const contractId = sourceVal.startsWith('CONTRACT:') ? sourceVal.replace('CONTRACT:', '') : (watchAll.contractId || (isContract ? sourceVal : ''));
  const quotationId = sourceVal.startsWith('QUOTATION:') ? sourceVal.replace('QUOTATION:', '') : (watchAll.quotationId || (!isContract ? sourceVal : ''));

  const activeDoc = selectedDoc || 
    (isContract 
      ? (contracts.find(c => c.id === contractId || (watchAll.soHopDong && c.soHopDong === watchAll.soHopDong)))
      : (quotations.find(q => q.id === quotationId || (watchAll.soPhieuBaoGia && q.soPhieuBaoGia === watchAll.soPhieuBaoGia))));

  const totalAmountVal = Number(watch('totalAmount')) || 0;
  const soTienVal = Number(watch('soTien')) || 0;
  const statusVal = watch('tinhTrangThanhToan') || '';
  const isFree = statusVal === 'Miễn phí';

  // Fix: Local state for smooth typing of percentage
  const [localRate, setLocalRate] = React.useState<string>('');

  React.useEffect(() => {
    if (totalAmountVal > 0 && !isNaN(totalAmountVal) && !isNaN(soTienVal)) {
      const rawRate = (soTienVal / totalAmountVal) * 100;
      const clampedRate = Math.min(100, Math.max(0, rawRate));
      const computedRate = clampedRate.toFixed(2);
      if (Math.abs(Number(computedRate) - Number(localRate)) > 0.01) {
        setLocalRate(Number(computedRate) === 0 ? '' : Number(computedRate).toString());
      }
    } else {
      setLocalRate('');
    }
  }, [soTienVal, totalAmountVal, localRate]);

  // Helper tìm trạng thái khớp (hỗ trợ cả chữ hoa TẤT TOÁN/CÔNG NỢ và Tất toán/Công nợ)
  const findStatusInList = React.useCallback((target: string): string => {
    const t = target.trim().toLowerCase();
    const found = tinhTrangThanhToanList.find(item => item.trim().toLowerCase() === t);
    return found || target;
  }, [tinhTrangThanhToanList]);

  // Đồng bộ từ trạng thái giao dịch sang tỷ lệ % và số tiền
  const handleStatusChange = React.useCallback((newStatus: string) => {
    setValue('tinhTrangThanhToan', newStatus, { shouldValidate: true, shouldDirty: true });
    const norm = newStatus.trim().toLowerCase();
    
    if (norm === 'tất toán' || norm === 'tat toan') {
      setLocalRate('100');
      const maxAllowed = totalAmountVal > 0 ? totalAmountVal : 0;
      setValue('soTien', maxAllowed, { shouldValidate: true, shouldDirty: true });
    } else if (norm === 'công nợ' || norm === 'cong no') {
      const curRate = Number(localRate);
      if (isNaN(curRate) || curRate <= 0 || curRate >= 100) {
        setLocalRate('50');
        const half = totalAmountVal > 0 ? Math.round(totalAmountVal * 0.5) : 0;
        setValue('soTien', half, { shouldValidate: true, shouldDirty: true });
      }
    } else if (norm === 'chưa tt' || norm === 'chua tt') {
      setLocalRate('0');
      setValue('soTien', 0, { shouldValidate: true, shouldDirty: true });
    } else if (norm === 'miễn phí' || norm === 'mien phi') {
      setLocalRate('100');
      setValue('soTien', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [setValue, totalAmountVal, localRate]);

  // Đồng bộ từ tỷ lệ % hoặc số tiền sang trạng thái giao dịch
  const syncStatusFromRate = React.useCallback((rate: number, amount: number) => {
    const curStatus = (watch('tinhTrangThanhToan') || '').trim().toLowerCase();
    if (curStatus === 'miễn phí' || curStatus === 'mien phi') {
      return; // Giữ nguyên trạng thái Miễn phí
    }
    if (rate >= 100) {
      const statusTatToan = findStatusInList('Tất toán');
      setValue('tinhTrangThanhToan', statusTatToan, { shouldValidate: true, shouldDirty: true });
    } else if (rate > 0 && rate < 100) {
      const statusCongNo = findStatusInList('Công nợ');
      setValue('tinhTrangThanhToan', statusCongNo, { shouldValidate: true, shouldDirty: true });
    } else if (rate === 0 && amount === 0) {
      const statusChuaTT = findStatusInList('Chưa TT');
      setValue('tinhTrangThanhToan', statusChuaTT, { shouldValidate: true, shouldDirty: true });
    }
  }, [findStatusInList, setValue, watch]);

  // Force soTien to 0 when "Miễn phí" is selected
  React.useEffect(() => {
    if (isFree && soTienVal !== 0) {
      setValue('soTien', 0, { shouldValidate: true, shouldDirty: true });
    }
  }, [isFree, soTienVal, setValue]);

  const handleQuickDate = (days: number) => {
    const next = new Date();
    next.setDate(next.getDate() + days);
    setValue('ngayDenHan', format(next, 'yyyy-MM-dd'), { shouldValidate: true });
  };

  const handleQuickPaymentDate = (daysOffset: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysOffset);
    setValue('ngayThanhToan', format(targetDate, 'yyyy-MM-dd'), { shouldValidate: true, shouldDirty: true });
  };

  // Lọc tức thời danh sách nguồn tham chiếu:
  // 1. Chỉ hiển thị Contract hoặc Quotation Vật tư/Dịch vụ (loại bỏ BG Máy vì bắt buộc qua HĐ)
  // 2. Loại bỏ triệt để các Báo giá / Hợp đồng đã được tạo phiếu thanh toán rồi
  const eligibleSources = React.useMemo(() => {
    const paidContractIds = new Set<string>();
    const paidContractCodes = new Set<string>();
    const paidQuotationIds = new Set<string>();
    const paidQuotationCodes = new Set<string>();

    (payments || []).forEach((p: any) => {
      if (p.deletedAt || p.deleted_at || p.isDeleted) return;
      if (currentPaymentId && (p.id === currentPaymentId || p.paymentId === currentPaymentId)) return;
      if (p.contractId) paidContractIds.add(String(p.contractId).trim());
      if (p.soHopDong) paidContractCodes.add(String(p.soHopDong).trim());
      if (p.quotationId) paidQuotationIds.add(String(p.quotationId).trim());
      if (p.soPhieuBaoGia) paidQuotationCodes.add(String(p.soPhieuBaoGia).trim());
    });

    const contractItems = (contracts || [])
      .filter((c: any) => {
        if (c.deletedAt || c.deleted_at) return false;
        if (paidContractIds.has(String(c.id).trim())) return false;
        if (c.soHopDong && paidContractCodes.has(String(c.soHopDong).trim())) return false;
        return true;
      })
      .map((c: any) => ({
        ...c,
        _collectionType: 'contracts',
        id: `CONTRACT:${c.id}`,
        _rawId: c.id
      }));

    const quotationItems = (quotations || [])
      .filter((q: any) => {
        if (q.deletedAt || q.deleted_at) return false;
        const loai = normalizeLoai((q.loai || q.phanLoai || q.loaiBaoGia) as string);
        if (loai === QUOTATION_LOAI.MAY) return false; // BG Máy bắt buộc phải qua HĐ
        if (paidQuotationIds.has(String(q.id).trim())) return false;
        if (q.soPhieuBaoGia && paidQuotationCodes.has(String(q.soPhieuBaoGia).trim())) return false;
        return true;
      })
      .map((q: any) => ({
        ...q,
        _collectionType: 'quotations',
        id: `QUOTATION:${q.id}`,
        _rawId: q.id
      }));

    return [...contractItems, ...quotationItems];
  }, [contracts, quotations, payments, currentPaymentId]);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Col */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* Section 1: Tham chiếu Gốc */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText size={14} /> 1. THAM CHIẾU GỐC
            </h3>
            <div className="space-y-4">
              <div className="z-20 relative">
                <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1 flex justify-between items-center">
                  <span>Căn cứ Hợp đồng/Báo giá</span>
                  {activeDoc && isContract && (
                    <ContractHoverCard contract={activeDoc}>
                      <span className="text-teal-600 hover:text-teal-700 font-bold text-2xs cursor-pointer bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                        Xem chi tiết HĐ 🛈
                      </span>
                    </ContractHoverCard>
                  )}
                  {activeDoc && !isContract && (
                    <QuotationHoverCard quotation={activeDoc}>
                      <span className="text-teal-600 hover:text-teal-700 font-bold text-2xs cursor-pointer bg-teal-50 px-2 py-0.5 rounded border border-teal-200 flex items-center gap-1">
                        Xem chi tiết BG 🛈
                      </span>
                    </QuotationHoverCard>
                  )}
                </label>
                <AsyncSearchableSelect
                  collection="contracts,quotations"
                  options={eligibleSources}
                  value={watch('sourceValue') || ''}
                  disabled={disabled}
                  onChange={(val, doc: any) => {
                      if (doc) {
                        setSelectedDoc(doc);
                        const isDocContract = isContractDoc(doc);
                        const prefix = isDocContract ? 'CONTRACT:' : 'QUOTATION:';
                        setValue('sourceValue', `${prefix}${doc._rawId || doc.id.replace(/^(CONTRACT|QUOTATION):/, '')}`, { shouldValidate: true, shouldDirty: true });
                        
                        setValue('customerId', doc.customerId || doc.customer_id || '', { shouldValidate: true, shouldDirty: true });
                        setValue('maKh', doc.maKh || '', { shouldDirty: true });
                        setValue('tenKhachHang', doc.tenKhachHang || '', { shouldDirty: true });
                        setValue('sdt', doc.sdt || '', { shouldDirty: true });
                        setValue('soHopDong', isDocContract ? (doc.soHopDong || '') : '', { shouldDirty: true });
                        setValue('soDonHang', isDocContract ? (doc.soDonHang || '') : '', { shouldDirty: true });
                        setValue('soPhieuBaoGia', doc.soPhieuBaoGia || '', { shouldDirty: true });
                        
                        if (isDocContract) {
                          setValue('contractId', doc._rawId || doc.id.replace('CONTRACT:', ''), { shouldDirty: true });
                          setValue('quotationId', doc.quotationId || '', { shouldDirty: true });
                          setValue('phanLoai', QUOTATION_LOAI.MAY, { shouldDirty: true });
                          setValue('loai', QUOTATION_LOAI.MAY, { shouldDirty: true });
                        } else {
                          const normLoai = normalizeLoai((doc.loai || doc.phanLoai || doc.loaiBaoGia) as string) || QUOTATION_LOAI.VAT_TU;
                          setValue('quotationId', doc._rawId || doc.id.replace('QUOTATION:', ''), { shouldDirty: true });
                          setValue('contractId', '', { shouldDirty: true });
                          setValue('phanLoai', normLoai, { shouldDirty: true });
                          setValue('loai', normLoai, { shouldDirty: true });
                        }

                        // Compute total quantity and unit
                        const healedProducts = (doc.products && Array.isArray(doc.products)) ? doc.products.map(computeLineItem) : [];
                        const aggs = aggregateProducts(healedProducts);
                        const resolvedSubTotal = aggs.totalGross > 0 ? aggs.totalGross : (Number(doc.subTotal) || 0);
                        const resolvedDiscount = aggs.totalDiscount > 0 ? aggs.totalDiscount : (Number(doc.discountAmount) || 0);
                        const resolvedVat = aggs.totalVat > 0 ? aggs.totalVat : (Number(doc.vatAmount) || 0);
                        const resolvedTotal = aggs.totalAfterTax > 0 ? aggs.totalAfterTax : (Number(doc.totalAmount) || Number(doc.giaTriHopDong) || resolvedSubTotal);
                        const resolvedVatRate = aggs.totalBeforeTax > 0 ? Math.round((resolvedVat / aggs.totalBeforeTax) * 100) : (Number(doc.vatRate) || 0);
                        const resolvedDiscountRate = resolvedSubTotal > 0 ? Number(((resolvedDiscount / resolvedSubTotal) * 100).toFixed(2)) : (Number(doc.discountRate) || 0);

                        const totalQty = (healedProducts.length > 0)
                          ? healedProducts.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0)
                          : (Number(doc.slMay) || 1);
                        const firstUnit = (healedProducts.length > 0 && healedProducts[0]?.unit) || doc.dvt || 'Cái';
                        setValue('slMay', totalQty, { shouldDirty: true });
                        setValue('soLuong', totalQty, { shouldDirty: true });
                        setValue('dvt', firstUnit, { shouldDirty: true });

                        setValue('subTotal', resolvedSubTotal, { shouldDirty: true });
                        setValue('vatRate', resolvedVatRate, { shouldDirty: true });
                        setValue('vatAmount', resolvedVat, { shouldDirty: true });
                        setValue('discountRate', resolvedDiscountRate, { shouldDirty: true });
                        setValue('discountAmount', resolvedDiscount, { shouldDirty: true });
                        setValue('totalAmount', resolvedTotal, { shouldDirty: true });
                        setValue('soTien', resolvedTotal, { shouldValidate: true, shouldDirty: true });
                        setValue('products', healedProducts, { shouldDirty: true });
                      } else {
                        setValue('sourceValue', val, { shouldValidate: true });
                      }
                  }}
                  filterOption={(doc: any) => {
                    const isDocContract = isContractDoc(doc);
                    // Đối với Báo giá: chỉ hiển thị Báo giá Vật tư hoặc Dịch vụ, loại bỏ BG Máy (bắt buộc phải qua HĐ)
                    if (!isDocContract) {
                      const loai = normalizeLoai((doc.loai || doc.phanLoai || doc.loaiBaoGia) as string);
                      if (loai === QUOTATION_LOAI.MAY) return false;
                    }

                    // Loại bỏ chứng từ đã được tạo thanh toán rồi (trừ khi đang sửa chính phiếu thanh toán đó)
                    const isAlreadyPaid = (payments || []).some((p: any) => {
                      if (p.isDeleted || p.deletedAt || p.deleted_at) return false;
                      if (currentPaymentId && (p.id === currentPaymentId || p.paymentId === currentPaymentId)) return false;
                      const rawDocId = doc._rawId || doc.id.replace(/^(CONTRACT|QUOTATION):/, '');
                      if (isDocContract) {
                        return (p.contractId && (p.contractId === rawDocId || p.contractId === doc.id)) || (p.soHopDong && doc.soHopDong && p.soHopDong === doc.soHopDong);
                      } else {
                        return (p.quotationId && (p.quotationId === rawDocId || p.quotationId === doc.id)) || (p.soPhieuBaoGia && doc.soPhieuBaoGia && p.soPhieuBaoGia === doc.soPhieuBaoGia);
                      }
                    });

                    if (isAlreadyPaid) return false;
                    return true;
                  }}
                  renderOption={(doc: any) => {
                      const isDocContract = isContractDoc(doc);
                      return {
                        label: `${isDocContract ? 'HĐ' : 'BG'} — ${isDocContract ? doc.soHopDong : doc.soPhieuBaoGia}`,
                        subLabel: doc.tenKhachHang
                      };
                  }}
                  isOptionDisabled={(doc: any) => {
                    const isDocContract = isContractDoc(doc);
                    const isAlreadyPaid = (payments || []).some((p: any) => {
                      if (p.isDeleted || p.deletedAt) return false;
                      if (currentPaymentId && (p.id === currentPaymentId || p.paymentId === currentPaymentId)) return false;
                      if (isDocContract) {
                        return (p.contractId && p.contractId === doc.id) || (p.soHopDong && doc.soHopDong && p.soHopDong === doc.soHopDong);
                      } else {
                        return (p.quotationId && p.quotationId === doc.id) || (p.soPhieuBaoGia && doc.soPhieuBaoGia && p.soPhieuBaoGia === doc.soPhieuBaoGia);
                      }
                    });
                    if (isAlreadyPaid) {
                      return { disabled: true, reason: 'Chứng từ này đã có phiếu thanh toán.' };
                    }
                    const gateResult = canCreatePayment(doc as any);
                    if (!gateResult.allowed) return { disabled: true, reason: gateResult.reason };
                    return { disabled: false };
                  }}
                  renderItemWrapper={(doc: any, children) => {
                    const isDocContract = isContractDoc(doc);
                    if (isDocContract) {
                      return (
                        <ContractHoverCard contract={doc}>
                          {children}
                        </ContractHoverCard>
                      );
                    } else {
                      return (
                        <QuotationHoverCard quotation={doc}>
                          {children}
                        </QuotationHoverCard>
                      );
                    }
                  }}
                  placeholder="Chọn chứng từ..."
                />
              </div>
              <p className="text-2xs text-slate-500 font-medium">Hệ thống hỗ trợ tự động điền thông tin sau khi nhận diện chứng từ hợp lệ.</p>

              {watch('sourceValue') && (
                <div className="space-y-3">
                  <div className="bg-blue-50/50 border border-blue-200/50 rounded-xl p-4 flex flex-col gap-1.5 shadow-xs">
                    <span className="text-2xs font-black uppercase text-blue-800 tracking-wider">Căn cứ tham chiếu</span>
                    <h4 className="text-xs font-bold text-slate-900">
                      Thông tin được đồng bộ thông minh từ {isContract ? 'Hợp đồng' : 'Báo giá'}: #{isContract ? (watchAll.soHopDong || activeDoc?.soHopDong || 'Chưa xác định') : (watchAll.soPhieuBaoGia || activeDoc?.soPhieuBaoGia || 'Chưa xác định')}
                    </h4>
                    <p className="text-2xs text-slate-500 leading-normal font-semibold">
                      Khách hàng nhận hóa đơn, giá trị tài chính và lịch trình thanh toán được liên thông trực tiếp hệ thống. Bạn có thể ghi nhận số tiền thực tế nhận được theo từng mốc thanh toán cụ thể.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 border border-slate-150 text-xs font-semibold text-slate-700 bg-slate-50/50 p-4 rounded-xl shadow-xs">
                    <div>
                      <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Khách hàng nhận HĐ</span>
                      <strong className="text-slate-950 text-sm font-bold block">{watchAll.tenKhachHang || '---'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase text-3xs tracking-wider block mb-0.5 font-bold">Liên hệ & giao nhận</span>
                      <strong className="text-slate-950 font-mono text-xs font-bold block">{watchAll.sdt || '---'}</strong>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
                    <span className="text-2xs uppercase tracking-wider font-bold text-slate-500">Đối soát công nợ & tiến độ dòng tiền</span>
                    <div className="flex flex-col gap-1 items-stretch">
                      <div className="flex justify-between text-xs font-bold font-mono">
                         <span className="text-slate-600">Tổng Trị Giá (A)</span>
                         <span className="text-slate-900">{new Intl.NumberFormat('vi-VN').format(totalAmountVal)} đ</span>
                      </div>
                      <div className="flex justify-between text-xs font-bold font-mono">
                         <span className="text-blue-600">Đã thu trước đó (B)</span>
                         <span className="text-blue-700">{new Intl.NumberFormat('vi-VN').format(otherPaid)} đ</span>
                      </div>
                      <div className="border-t border-slate-200 my-1"></div>
                      <div className="flex justify-between text-xs font-bold font-mono">
                         <span className="text-amber-600">Còn lại phải thu (A - B)</span>
                         <span className="text-amber-700">{new Intl.NumberFormat('vi-VN').format(Math.max(0, totalAmountVal - otherPaid))} đ</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">
                          {isContract ? 'Số Hợp Đồng' : 'Số Phiếu Báo Giá'}
                        </label>
                        {isContract ? (
                          <input aria-label="Số hợp đồng" disabled={disabled} {...register('soHopDong')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" placeholder="HD..."/>
                        ) : (
                          <input aria-label="Số phiếu báo giá" disabled={disabled} {...register('soPhieuBaoGia')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" placeholder="BG..."/>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">
                          Số Đơn Hàng {!isContract && <span className="text-red-650">*</span>}
                        </label>
                        <input 
                          aria-label="Số đơn hàng" 
                          disabled={disabled || isContract} 
                          {...register('soDonHang')} 
                          className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" 
                          placeholder={isContract ? (watchAll.soDonHang ? watchAll.soDonHang : "Tự động kế thừa từ HĐ") : "Nhập số đơn hàng..."}
                        />
                    </div>
                  </div>
              </div>
            </div>
        </div>

        {/* Section 2: Quản lý tình trạng */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <Clock size={14} /> 2. QUẢN LÝ TÌNH TRẠNG & KỲ HẠN
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">Trạng thái Giao dịch</label>
                  <select 
                    aria-label="Tình trạng thanh toán" 
                    disabled={disabled} 
                    value={watch('tinhTrangThanhToan') || 'Chưa TT'}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full bg-white font-semibold cursor-pointer disabled:bg-slate-50/50 disabled:opacity-75"
                  >
                    {tinhTrangThanhToanList.map((t: string) => <option key={t} value={t}>{t}</option>)}
                    {watch('tinhTrangThanhToan') && !tinhTrangThanhToanList.includes(watch('tinhTrangThanhToan')) && (
                      <option value={watch('tinhTrangThanhToan')}>{watch('tinhTrangThanhToan')}</option>
                    )}
                  </select>
              </div>
              <div className="space-y-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">P.Thức thanh toán</label>
                  <select aria-label="Phương thức thanh toán" disabled={disabled} {...register('phuongThucThanhToan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full bg-white cursor-pointer disabled:bg-slate-50/50 disabled:opacity-75">
                    {phuongThucThanhToanList.map((m: string) => <option key={m} value={m}>{m}</option>)}
                    {watch('phuongThucThanhToan') && !phuongThucThanhToanList.includes(watch('phuongThucThanhToan')) && (
                      <option value={watch('phuongThucThanhToan')}>{watch('phuongThucThanhToan')}</option>
                    )}
                  </select>
              </div>
              <div className="space-y-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-1">
                    Người phụ trách {isAdmin && <span className="text-blue-500 font-bold ml-1 text-[10px]">(Admin)</span>}
                  </label>
                  {isAdmin ? (
                    <select
                      aria-label="Người phụ trách"
                      disabled={disabled}
                      {...register('nguoiPhuTrach')}
                      className="h-8 rounded-lg border border-blue-200 px-3 text-sm focus:border-blue-500 outline-none w-full bg-blue-50/30 text-slate-800 font-medium cursor-pointer disabled:bg-slate-50/50 disabled:opacity-75"
                    >
                      <option value="">-- Chọn người phụ trách --</option>
                      {nguoiPhuTrachList.map((pic: string) => (
                        <option key={pic} value={pic}>{pic}</option>
                      ))}
                      {watch('nguoiPhuTrach') && !nguoiPhuTrachList.includes(watch('nguoiPhuTrach')) && (
                        <option value={watch('nguoiPhuTrach')}>{watch('nguoiPhuTrach')}</option>
                      )}
                    </select>
                  ) : (
                    <div className="relative">
                      <input 
                        type="text"
                        disabled
                        readOnly
                        value={watch('nguoiPhuTrach') || ''}
                        {...register('nguoiPhuTrach')} 
                        className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full bg-slate-100 font-semibold text-slate-700 cursor-not-allowed select-none pr-8" 
                        placeholder="Người phụ trách theo tài khoản"
                      />
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  )}
              </div>

              {/* Date Inputs */}
              <div className="col-span-2 bg-slate-50/50 p-4 rounded-xl border border-slate-100 flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-2">Ngày Thu Thực Tế</label>
                  <div className="space-y-2">
                      <input aria-label="Ngày thanh toán" disabled={disabled} type="date" {...register('ngayThanhToan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" />
                      <div className="flex gap-1.5 mt-2">
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickPaymentDate(0)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">Hôm nay</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickPaymentDate(-1)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">Hôm qua</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickPaymentDate(-7)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">7N trước</button>
                      </div>
                  </div>
                  </div>
                  <div className="flex-1">
                  <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block mb-2">Hạn Chót Phải Thu</label>
                  <div className="space-y-2">
                      <input aria-label="Ngày đến hạn" disabled={disabled} type="date" {...register('ngayDenHan')} className="h-8 rounded-lg border border-slate-200 px-3 text-sm focus:border-slate-950 outline-none w-full font-mono bg-white disabled:bg-slate-50/50 disabled:opacity-75" />
                      <div className="flex gap-1.5 mt-2">
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickDate(3)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">+3D</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickDate(7)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">+7D</button>
                        <button aria-label="Nút bấm" disabled={disabled} type="button" onClick={() => handleQuickDate(30)} className="flex-1 py-1 h-7 bg-white border border-slate-200 hover:border-blue-600 rounded text-2xs font-bold text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:opacity-50">+1M</button>
                      </div>
                  </div>
                  </div>
              </div>
            </div>
        </div>

        {/* Section 3: Ghi chú */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-2">
              <FileText size={14} /> 3. GHI CHÚ
            </h3>
            <label className="text-2xs font-medium uppercase tracking-wide text-slate-500 block">Ghi Chú & Mã UNC</label>
            <textarea aria-label="Ghi chú" {...register('ghiChu')} className="premium-input w-full min-h-[80px] rounded-lg border border-slate-200 p-3 text-sm focus:border-slate-950 outline-none bg-white" placeholder="Paste link chứng từ, mã giao dịch NH..." />
        </div>
      </div>

      {/* Right Col */}
      <div className="w-full lg:w-[380px] shrink-0 flex flex-col gap-6">

        {/* Section 4: SỐ TIỀN */}
        <div className="p-6 bg-emerald-50 border border-emerald-100 focus-within:border-emerald-400 rounded-2xl shadow-sm transition-colors pt-6">
          <div className="flex flex-col gap-4 mb-4">
            <label className="text-xs font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-2"><DollarSign size={16} className="text-emerald-700" /> SỐ TIỀN GIAO DỊCH <span className="text-red-700">*</span></label>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex justify-between font-semibold text-xs border-b border-slate-100 pb-2">
                  <span className="text-slate-500 uppercase tracking-wider">Tổng trị giá tham chiếu:</span>
                  <span className="font-mono text-slate-900">{new Intl.NumberFormat('vi-VN').format(totalAmountVal)} đ</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-2xs text-slate-500 font-bold uppercase tracking-wide">Tỷ lệ thanh toán (%):</span>
                <div className="relative">
                    <input 
                      aria-label="Tỷ lệ %" 
                      type="number" 
                      min="0" max="100" 
                      step="any"
                      placeholder="0" 
                      value={localRate}
                      disabled={isFree || disabled}
                      className="w-20 premium-input h-8 pl-3 pr-6 text-right font-bold text-slate-900 bg-slate-50 border border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20 rounded-lg outline-none disabled:opacity-50"
                      onChange={(e) => {
                        const valStr = e.target.value;
                        setLocalRate(valStr);
                        let val = Number(valStr);
                        if (val > 100) val = 100;
                        if (val < 0) val = 0;
                        const total = totalAmountVal || 0;
                        if (!isNaN(val) && total > 0 && valStr !== '') {
                            const computedNum = Math.round((total * val) / 100);
                            setValue('soTien', computedNum, { shouldValidate: true, shouldDirty: true });
                            syncStatusFromRate(val, computedNum);
                        } else if (valStr === '' || val === 0) {
                            setValue('soTien', 0, { shouldValidate: true, shouldDirty: true });
                            syncStatusFromRate(0, 0);
                        }
                      }}
                    />
                    <span className="absolute right-2.5 top-1 text-slate-600 font-bold text-2xs leading-6">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl overflow-hidden border border-emerald-200">
            <Controller
              name="soTien" control={control}
              render={() => (
                <div className="px-4 py-2 bg-emerald-100/30 border-b border-emerald-100">
                  <span className="text-2xs uppercase font-bold text-emerald-800 tracking-widest">Thực thu / Thực chi</span>
                </div>
              )}
            />
            <Controller
              name="soTien" control={control}
              render={({ field }) => (
                <MoneyInput 
                  value={field.value} 
                  onChange={(val: any) => {
                    let num = Number(val) || 0;
                    if (num < 0) num = 0;
                    field.onChange(num);
                    if (totalAmountVal > 0) {
                      const rate = Math.min(100, (num / totalAmountVal) * 100);
                      syncStatusFromRate(rate, num);
                    }
                  }} 
                  readOnly={isFree || disabled} 
                  placeholder="0" 
                />
              )}
            />
          </div>
        </div>

          {/* Section 5: Thông tin rà soát chéo */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              <h3 className="text-2xs font-bold text-slate-900 uppercase tracking-widest">
                Thông tin rà soát chéo
              </h3>
            </div>
            <div className="flex flex-col gap-3 text-xs font-semibold text-slate-700">
              <div>
                <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Đối tác thanh toán</span>
                <p className="text-slate-950 text-sm font-bold text-balance">{watchAll.tenKhachHang || '---'}</p>
                <p className="mt-0.5">Mã KH: <span className="font-mono text-slate-800 font-bold">{watchAll.maKh || '---'}</span></p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 text-2xs uppercase font-bold block mb-0.5">Căn cứ Hợp Đồng</span>
                <p>Số HĐ: <span className="font-mono text-slate-800 font-bold">{watchAll.soHopDong || '---'}</span></p>
                <p className="mt-0.5">Hạn TT: <span className="font-mono text-slate-800 font-bold">{watchAll.ngayDenHan ? format(new Date(watchAll.ngayDenHan), 'dd/MM/yyyy') : '---'}</span></p>
              </div>
            </div>
          </div>

      </div>
    </div>
  );
}
