import React from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/src/shared/utils/formatDate';
import { resolveQuotationChronoMeta } from '@/src/shared/utils/quotationDateResolver';
import { computeContractCompletionTimeline } from '@/src/shared/utils/vietnamBusinessDays';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import { CustomerHoverCard } from '@/src/modules/customers';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';
import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';
import { checkQuotationLock } from '@/src/domain/policy/lock.policy';
import { User, MapPin, FileText, ArrowUpRight, Zap, CheckCircle2, Smartphone, Building2, Copy, Check, Star } from 'lucide-react';
import { extractVietnamesePhones } from '@/src/modules/customers/ui/utils/vietnameseTelecomExtractor';
import { SearchableSelect } from '@/src/design-system/primitives/SearchableSelect';
import { extractAvatarBadge } from '@/src/shared/utils/userProfile';
import { StatusPill } from '@/src/widgets/StatusPill';
import { normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { hasActualCashCollected } from '@/src/domain/enums/payment-status';
import { differenceInDays } from 'date-fns';
import { useAuth } from '@/src/modules/iam';
import { isAdministratorRole } from '@/src/shared/utils/userProfile';
import { useConfirm } from '@/src/design-system/Confirm';
import { notify } from '@/src/shared/utils/notify';
import { ItemSemanticType } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { syncProductTypeCascading, analyzeProductTypeImpact } from '@/src/modules/sales/domain/services/productTypeCascadingSyncService';

interface QuotationDetailOverviewProps {
  quotation: Quotation;
  customer?: Customer;
  matchingContracts: any[];
  matchingPayments: any[];
  matchingDeliveries: any[];
  owners: string[];
  totalValue: number;
  handleOwnerChange: (newOwner: string) => Promise<void>;
  onClose?: () => void;
}

export function QuotationDetailOverview({
  quotation,
  customer,
  matchingContracts,
  matchingPayments,
  matchingDeliveries,
  owners,
  totalValue,
  handleOwnerChange,
  onClose
}: QuotationDetailOverviewProps) {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const isAdmin = isAdministratorRole(userData, user);
  const { confirm } = useConfirm();
  const [currentQuotation, setCurrentQuotation] = React.useState<Quotation>(quotation);

  React.useEffect(() => {
    setCurrentQuotation(quotation);
  }, [quotation]);

  const lockResult = checkQuotationLock(currentQuotation, matchingContracts, matchingPayments, matchingDeliveries);
  const isBgMay = normalizeLoai(currentQuotation.loai) === QUOTATION_LOAI.MAY;
  const [copiedPhone, setCopiedPhone] = React.useState<string | null>(null);

  const safeOwnersOptions = React.useMemo(() => {
    const list = [...(owners || [])];
    const currentPic = (currentQuotation.nguoiPhuTrach || '').trim();
    if (currentPic && !list.some(o => o.trim().toLowerCase() === currentPic.toLowerCase())) {
      list.unshift(currentPic);
    }
    return list.map(o => ({ value: o, label: o }));
  }, [owners, currentQuotation.nguoiPhuTrach]);

  const handleCopyPhone = (ph: string) => {
    navigator.clipboard.writeText(ph);
    setCopiedPhone(ph);
    setTimeout(() => setCopiedPhone(null), 1500);
  };

  const handleProductTypeChange = async (itemIndex: number, newType: ItemSemanticType) => {
    if (!isAdmin) {
      notify.warning('Chỉ tài khoản Quản trị viên (Admin) mới có quyền đổi phân loại sản phẩm và đồng bộ liên kết.');
      return;
    }

    try {
      const impact = await analyzeProductTypeImpact(currentQuotation, itemIndex, newType);
      const targetProdName = impact.productName;
      const oldTypeLabel = impact.oldType === 'MACHINE' ? 'Máy' : impact.oldType === 'MATERIAL' ? 'Vật tư' : 'Dịch vụ';
      const newTypeLabel = newType === 'MACHINE' ? 'Máy' : newType === 'MATERIAL' ? 'Vật tư' : 'Dịch vụ';

      let confirmMsg = `Bạn có chắc chắn muốn đổi "${targetProdName}" từ [${oldTypeLabel}] sang [${newTypeLabel}]?\n\nHệ thống sẽ tự động cập nhật:`;
      if (impact.linkedContracts.length > 0) {
        confirmMsg += `\n• ${impact.linkedContracts.length} Hợp đồng liên quan (tính lại SL máy)`;
      }
      if (impact.linkedPayments.length > 0) {
        confirmMsg += `\n• ${impact.linkedPayments.length} Phiếu thu liên quan`;
      }
      if (impact.linkedDeliveries.length > 0) {
        confirmMsg += `\n• ${impact.linkedDeliveries.length} Phiếu xuất kho liên quan (tính lại SL máy)`;
      }
      if (impact.isDeliveredOrAssigned) {
        confirmMsg += `\n⚠️ Lưu ý: Sản phẩm này đã xuất kho ${impact.deliveredQuantity} sản phẩm.`;
      }

      const proceed = await confirm({
        title: 'Đồng bộ Phân loại Sản phẩm (Cascading Sync)',
        message: confirmMsg,
        confirmText: 'Đồng bộ ngay',
        cancelText: 'Hủy',
        variant: 'warning'
      });

      if (!proceed) return;

      const res = await syncProductTypeCascading(currentQuotation, itemIndex, newType, {
        email: user?.email,
        displayName: (userData as any)?.displayName || user?.displayName
      });

      if (res.success) {
        setCurrentQuotation(res.updatedQuotation);
        notify.success(`Đã cập nhật và đồng bộ ${res.syncedContractsCount} HĐ, ${res.syncedPaymentsCount} Phiếu thu, ${res.syncedDeliveriesCount} Phiếu giao!`);
      }
    } catch (err: any) {
      notify.error(err.message || 'Lỗi khi đồng bộ loại sản phẩm');
    }
  };

  // Realtime calculated financial lineage
  const totalPaid = (matchingPayments || [])
    .filter((p) => !p.deletedAt && !p.isDeleted && hasActualCashCollected(p.tinhTrangThanhToan))
    .reduce((sum, p) => sum + (Number(p.soTien) || 0), 0);
  const paymentPct = totalValue > 0 ? Math.min(100, Math.round((totalPaid / totalValue) * 100)) : 0;
  const remainingDebt = Math.max(0, totalValue - totalPaid);

  // Chrono Resolution & Deal Health calculation
  const chrono = resolveQuotationChronoMeta(currentQuotation);
  const creationDate = new Date(chrono.issueDate);
  const now = new Date();
  const daysSinceCreation = Math.max(0, differenceInDays(now, creationDate));

  const { dealHealthClass, dealHealthLabel } = (() => {
    if (totalValue > 0 && totalPaid >= totalValue) {
      return { dealHealthClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dealHealthLabel: 'Đã tất toán giao dịch' };
    }
    if (matchingContracts.length > 0) {
      const primaryContract = matchingContracts[0];
      const timeline = computeContractCompletionTimeline(primaryContract, matchingPayments);
      return { 
        dealHealthClass: timeline.isDelayed ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200', 
        dealHealthLabel: timeline.executionStageLabel ? `HĐ: ${timeline.executionStageLabel} (${timeline.completionDateFormatted})` : 'Đã ký kết hợp đồng' 
      };
    }
    if (chrono.statusBadge.isExpired) {
      return { dealHealthClass: 'bg-red-50 text-red-700 border-red-200', dealHealthLabel: chrono.statusBadge.label };
    }
    if (daysSinceCreation <= 3) {
      return { dealHealthClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', dealHealthLabel: 'Khách hàng mới (Nóng)' };
    }
    if (daysSinceCreation <= 7) {
      return { dealHealthClass: 'bg-amber-50 text-amber-700 border-amber-200', dealHealthLabel: 'Đang đàm phán (Ấm)' };
    }
    return { dealHealthClass: 'bg-red-50 text-red-700 border-red-200', dealHealthLabel: `Đã ngâm ${daysSinceCreation} ngày` };
  })();

  const znsStatus = normalizeLegacyStatus(quotation.trangThaiGuiTinBaoGia);

  return (
    <div className="flex flex-col gap-5 pb-6 pt-1">
      {/* 1. Business Lock Warning (if applicable) */}
      <EntityBusinessLockWarning {...lockResult} />

      {/* 2. Banner Thông Báo Khách Hàng Xác Nhận Đồng Ý Trực Tuyến Qua Cổng ZNS */}
      {(currentQuotation.customerApprovedAt || currentQuotation.tinhTrangBaoGia === 'KH_DONG_Y') && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-xl p-4 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-500/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30 shadow-2xs">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm uppercase tracking-wide">
                  Khách Hàng Đã Xác Nhận Đồng Ý Báo Giá Trực Tuyến!
                </span>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-3xs font-bold border border-white/30">
                  Cổng ZNS
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                {currentQuotation.customerApprovedAt 
                  ? `Thời gian xác nhận: ${new Date(currentQuotation.customerApprovedAt).toLocaleString('vi-VN')}` 
                  : 'Khách hàng đã chấp thuận các điều khoản thương mại.'} 
                {' '}Vui lòng ưu tiên khởi tạo Hợp đồng kinh tế để chuẩn bị sản xuất!
              </p>
            </div>
          </div>

          {matchingContracts.length === 0 && (
            <button
              type="button"
              onClick={() => {
                onClose?.();
                navigate(`/contracts?action=create&quotationId=${currentQuotation.id}&customerId=${currentQuotation.customerId || ''}`);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-800 hover:bg-emerald-50 active:scale-98 font-bold text-xs shadow-sm transition-all shrink-0 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Lập Hợp Đồng Ngay</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-800" />
            </button>
          )}
        </div>
      )}

      {/* 3. Main Workspace: Asymmetric 72% Matrix / 28% Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ===================== CỘT CHÍNH (72%): SPREADSHEET-GRADE DATA MATRIX ===================== */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Khối Sản Phẩm Trung Tâm */}
          <section className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h3 className="font-bold text-xs uppercase tracking-widest text-slate-800">
                  DANH MỤC THIẾT BỊ & CẤU HÌNH BÁO GIÁ
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-200 text-2xs font-bold">
                  {quotation.products?.reduce((acc, p) => acc + (p.quantity || 1), 0) || 0} sản phẩm
                </span>
                <span className={`text-2xs font-bold px-2 py-0.5 rounded-md border ${dealHealthClass}`}>
                  {dealHealthLabel}
                </span>
              </div>
            </div>

            <div className="p-4">
              <DrawerProductList 
                products={currentQuotation.products || []}
                subTotal={currentQuotation.subTotal}
                discountRate={currentQuotation.discountRate}
                discountAmount={currentQuotation.discountAmount}
                vatRate={currentQuotation.vatRate}
                vatAmount={currentQuotation.vatAmount}
                totalAmount={currentQuotation.totalAmount}
                deliveredQuantities={!isBgMay ? currentQuotation.deliveredQuantities : undefined}
                accentColorClass="text-blue-700"
                paidAmount={totalPaid > 0 ? totalPaid : undefined}
                remainingDebt={remainingDebt > 0 && totalPaid > 0 ? remainingDebt : undefined}
                canEditProductType={isAdmin}
                onProductTypeChange={handleProductTypeChange}
              />
            </div>
          </section>

          {/* Khối Điều khoản thương mại & Bàn giao dự kiến */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
              <FileText size={13} className="text-blue-600" />
              Điều khoản thương mại & Phạm vi thực hiện
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Loại hình báo giá</span>
                <span className="font-bold text-slate-800 text-xs">{quotation.loai || 'Chưa phân loại'}</span>
                <span className="text-3xs text-slate-500 block mt-0.5">
                  {isBgMay ? 'Bắt buộc qua hợp đồng' : 'Có thể xuất bán trực tiếp'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-3xs uppercase font-bold text-slate-400">Thời hạn hiệu lực</span>
                  <span className={`text-3xs font-bold px-1.5 py-0.2 rounded border font-mono ${chrono.statusBadge.colorClass}`}>
                    {chrono.statusBadge.label}
                  </span>
                </div>
                <span className="font-bold font-mono text-slate-800 text-xs block">
                  {chrono.expireDateFormatted} ({chrono.validityDays} ngày)
                </span>
                <span className="text-3xs text-slate-500 font-medium block mt-1">
                  Lập ngày: <strong className="font-mono text-slate-700">{chrono.issueDateFormatted}</strong>
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Địa điểm giao nhận dự kiến</span>
                <span className="font-semibold text-slate-800 text-xs line-clamp-1" title={(quotation as any).diaChiGiaoHang || customer?.diaChi || 'Theo thỏa thuận'}>
                  {(quotation as any).diaChiGiaoHang || customer?.diaChi || 'Theo thỏa thuận'}
                </span>
                <span className="text-3xs text-slate-500 block mt-0.5">
                  Khu vực: {(quotation as any).tinhThanh || customer?.tinhThanh || 'Toàn quốc'}
                </span>
              </div>
            </div>
          </section>

          {/* Khối Phả hệ Đơn hàng ERP & Hồ sơ cân bàn đính kèm (Nexus 50.0) */}
          {(quotation.soDonHangErp || quotation.sourceRef || (quotation.attachments && quotation.attachments.length > 0)) && (
            <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Zap size={13} className="text-amber-500" />
                  Phả Hệ Đơn Hàng ERP &amp; Hồ Sơ Chứng Từ Gốc
                </h4>
                {quotation.soDonHangErp && (
                  <span className="font-mono text-3xs font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    ERP: {quotation.soDonHangErp}
                  </span>
                )}
              </div>

              {(quotation.sourceRef as any)?.tareFormula && (
                <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-2xs text-emerald-900 font-mono font-medium">
                  ⚖️ {(quotation.sourceRef as any).tareFormula}
                </div>
              )}

              {Array.isArray(quotation.attachments) && quotation.attachments.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-3xs font-bold uppercase text-slate-400 block tracking-wider">
                    Tệp đính kèm phiếu cân ({quotation.attachments.length} tệp):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {quotation.attachments.map((att: any, idx: number) => {
                      const isPdf = (att.name || '').toLowerCase().endsWith('.pdf');
                      return (
                        <a
                          key={idx}
                          href={att.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 transition-colors text-2xs group"
                        >
                          <FileText size={14} className={isPdf ? 'text-red-500' : 'text-blue-600'} />
                          <span className="font-medium text-slate-700 group-hover:text-blue-700 line-clamp-1 flex-1">
                            {att.name}
                          </span>
                          <ArrowUpRight size={11} className="text-slate-400 group-hover:text-blue-600" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* ===================== CỘT VỆ TINH (28%): INTELLIGENCE INSPECTOR ===================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Thẻ 1: Khách hàng tham chiếu */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                <User size={13} className="text-blue-600" />
                Khách hàng pháp nhân
              </span>
              {customer?.maKh && (
                <span className="font-mono text-3xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  {customer.maKh}
                </span>
              )}
            </div>

            {customer ? (
              <CustomerHoverCard customer={customer}>
                <div className="p-3 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all rounded-lg cursor-pointer group">
                  <h4 className="font-bold text-slate-900 text-sm group-hover:text-blue-700 transition-colors line-clamp-1" title={customer.tenKhachHang}>
                    {customer.tenKhachHang}
                  </h4>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {customer.sdt && (
                      <span className="font-mono text-3xs font-bold text-blue-700 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                        {customer.sdt}
                      </span>
                    )}
                    {customer.loaiKh && (
                      <span className="text-3xs font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                        {customer.loaiKh}
                      </span>
                    )}
                  </div>
                  <p className="text-3xs text-slate-500 mt-2 flex items-center gap-1 line-clamp-1">
                    <MapPin size={11} className="shrink-0 text-slate-400" />
                    {customer.diaChi || customer.tinhThanh || 'Chưa cập nhật địa chỉ'}
                  </p>
                </div>
              </CustomerHoverCard>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <h4 className="font-bold text-slate-900 text-sm">{quotation.tenKhachHang || 'Khách hàng'}</h4>
                {quotation.sdt && <p className="font-mono text-2xs text-slate-600 mt-1">{quotation.sdt}</p>}
              </div>
            )}

            {/* Khối Đầu Mối & Số Điện Thoại Nhận Báo Giá */}
            {(() => {
              const rep = quotation.nguoiDaiDien || customer?.nguoiDaiDien || '';
              const rawP = quotation.sdt || customer?.sdt || '';
              const ext = rawP ? extractVietnamesePhones(rawP, quotation.diaChi || customer?.diaChi) : null;
              const phones = ext?.phones || [];

              return (
                <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">
                      Đầu mối nhận Báo giá
                    </span>
                    {(quotation.chucVu || (customer?.contacts?.[0] as any)?.chucVu) && (
                      <span className="text-3xs bg-white text-slate-600 px-1.5 py-0.2 rounded border border-slate-200 font-medium">
                        {quotation.chucVu || (customer?.contacts?.[0] as any)?.chucVu}
                      </span>
                    )}
                  </div>
                  <strong className="text-xs font-bold text-slate-900 block">
                    👤 {rep || 'Chưa cập nhật người nhận'}
                  </strong>
                  
                  {phones.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      {phones.map((p, idx) => {
                        const isPrimary = p.cleaned === quotation.sdt || (idx === 0 && !quotation.sdt);
                        const isMobile = p.type === 'MOBILE';
                        const isCopied = copiedPhone === p.cleaned;

                        return (
                          <div key={idx} className="flex items-center justify-between gap-1.5 bg-white p-1.5 rounded-md border border-slate-200/70 shadow-2xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              {isMobile ? (
                                <Smartphone size={12} className={isPrimary ? "text-blue-600 shrink-0" : "text-slate-400 shrink-0"} />
                              ) : (
                                <Building2 size={12} className="text-slate-400 shrink-0" />
                              )}
                              <span className={`font-mono text-xs font-bold tracking-tight truncate ${isPrimary ? 'text-blue-900' : 'text-slate-800'}`}>
                                {p.formatted}
                              </span>
                              {p.carrier && (
                                <span className="text-3xs px-1 py-0.1 rounded font-bold border border-blue-200 bg-blue-50 text-blue-700 shrink-0">
                                  {p.carrier}
                                </span>
                              )}
                              {isPrimary && (
                                <span className="text-amber-500 flex items-center shrink-0" title="SĐT chính nhận ZNS">
                                  <Star size={11} fill="currentColor" />
                                </span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyPhone(p.cleaned)}
                              className="text-3xs font-bold text-blue-700 hover:text-blue-800 bg-slate-50 hover:bg-blue-50 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              title="Sao chép SĐT"
                            >
                              {isCopied ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                              <span>{isCopied ? 'Đã chép' : 'Chép'}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  ) : rawP ? (
                    <p className="font-mono text-xs text-slate-700">{rawP}</p>
                  ) : null}
                </div>
              );
            })()}
          </section>

          {/* Thẻ 2: Quản trị & PIC Phụ trách */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500">
                Chuyên viên phụ trách
              </span>
              <StatusPill statusStr={znsStatus as any} />
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 font-mono">
                {extractAvatarBadge(quotation.nguoiPhuTrach)}
              </div>
              <div className="flex-1 min-w-0">
                <SearchableSelect 
                  value={quotation.nguoiPhuTrach || ''}
                  onChange={handleOwnerChange}
                  options={safeOwnersOptions}
                  placeholder="-- Chọn PIC phụ trách --"
                />
              </div>
            </div>
            {!quotation.nguoiPhuTrach && (
              <p className="text-3xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 font-medium">
                Báo giá chưa được phân công PIC. Vui lòng chọn người phụ trách để theo dõi.
              </p>
            )}
          </section>

          {/* Thẻ 3: Chuỗi liên kết chứng từ (Deal Lineage Pulse) */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Dòng chảy chứng từ liên kết
            </h4>

            <div className="space-y-2 text-xs">
              {/* Hợp đồng */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <span className="text-slate-600 font-medium text-2xs">Hợp đồng pháp lý:</span>
                {matchingContracts.length > 0 ? (
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-3xs">
                    {matchingContracts[0].soHopDong || 'Đã ký HĐ'}
                  </span>
                ) : !isBgMay ? (
                  <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-3xs flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-blue-600" /> Miễn HĐ (Thu tiền trực tiếp)
                  </span>
                ) : (
                  <span className="text-slate-400 italic text-3xs">Chưa lập HĐ</span>
                )}
              </div>

              {/* Thanh toán */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <span className="text-slate-600 font-medium text-2xs">Tiến độ thanh toán:</span>
                <span className={`font-mono font-bold text-3xs px-2 py-0.5 rounded border ${
                  paymentPct === 100 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : paymentPct > 0 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {paymentPct}% ({new Intl.NumberFormat('vi-VN').format(totalPaid)} ₫)
                </span>
              </div>

              {/* Giao hàng */}
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <span className="text-slate-600 font-medium text-2xs">Xuất kho giao hàng:</span>
                <span className="font-mono font-bold text-slate-700 text-3xs">
                  {matchingDeliveries.length > 0 ? `${matchingDeliveries.length} phiếu giao` : 'Chưa giao'}
                </span>
              </div>

              {!isBgMay && remainingDebt > 0 && quotation?.id && (
                <button
                  type="button"
                  onClick={() => {
                    navigate(`/payments?fromQuotation=${quotation.id}`);
                  }}
                  className="w-full mt-2 py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-2xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Zap size={13} className="text-blue-600" />
                  Lập Phiếu Thu Nhanh (Không Cần HĐ)
                </button>
              )}
            </div>
          </section>

          {/* Thẻ 4: Ghi chú nội bộ / Phụ lục */}
          {quotation.noiDungGhiChu && (
            <section className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs shadow-2xs">
              <h4 className="text-2xs font-black text-amber-900 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                Ghi chú nội bộ / Phụ lục
              </h4>
              <p className="text-slate-700 text-2xs leading-relaxed whitespace-pre-wrap font-medium">
                {quotation.noiDungGhiChu}
              </p>
            </section>
          )}

        </div>
      </div>
    </div>
  );
}
