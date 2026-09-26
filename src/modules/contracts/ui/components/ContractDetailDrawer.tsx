// @ts-nocheck
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { formatDate } from '@/src/shared/utils/formatDate';
import { extractAvatarBadge } from '@/src/shared/utils/userProfile';
import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Customer } from '@/src/domain/schema/customer.schema';
import useSWR from 'swr';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { TabLichSuThanhToan } from "@/src/widgets/TabLichSuThanhToan";
import { TabLichSuGiaoHang } from "@/src/widgets/TabLichSuGiaoHang";
import { TabLichSuZNS } from "@/src/widgets/TabLichSuZNS";
import { DocumentLifecycleTimeline } from "@/src/widgets/DocumentLifecycleTimeline";
import { EntityAuditMetadataCard } from "@/src/widgets/EntityAuditMetadataCard";
import { TabLienKet } from "@/src/widgets/TabLienKet";
import { checkContractLock } from '@/src/domain/policy/lock.policy';
import { EntityBusinessLockWarning } from '@/src/widgets/EntityBusinessLockWarning';
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';
import { reconcileContractFinancials } from '@/src/domain/services/financial-reconciler';

import { sendZnsAndToast, nextAttempt } from '@/src/domain/zns-client';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { useConfirm } from '@/src/design-system/Confirm';
import { 
  FileText, 
  Trash2,
  Layers
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';

export interface ContractDetailDrawerProps {
  drawerContract: Contract | null;
  payments: Payment[];
  deliveries: Delivery[];
  customers: Customer[];
  onClose: () => void;
  onEdit: (contract: Contract) => void;
  onCreatePayment?: (contract: Contract) => void;
  onCreateDelivery?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
  modal?: boolean;
  className?: string;
}

export function ContractDetailDrawer({
  drawerContract,
  payments,
  deliveries,
  customers,
  onClose,
  onEdit,
  onCreatePayment,
  onCreateDelivery,
  onDelete,
  modal,
  className,
}: ContractDetailDrawerProps) {
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'payments' | 'deliveries' | 'zns' | 'links' | 'audit'>('overview');
  
  useEffect(() => {
    if (drawerContract?.id) {
      setActiveTab('overview');
    }
  }, [drawerContract?.id]);

  const isOpen = !!drawerContract;

  const { data: lazyPayments = [] } = useSWR<any[]>(
    isOpen && drawerContract?.id && activeTab === 'payments' && (!payments || payments.length === 0)
      ? `payments:50:contractId:${drawerContract?.id}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: lazyDeliveries = [] } = useSWR<any[]>(
    isOpen && drawerContract?.id && activeTab === 'deliveries' && (!deliveries || deliveries.length === 0)
      ? `deliveries:50:contractId:${drawerContract?.id}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  const { data: quotationSnapshot } = useSWR<any>(
    isOpen && drawerContract?.quotationId ? `quotations:${drawerContract.quotationId}` : null,
    swrDocFetcher,
    { revalidateOnFocus: false }
  );
  const quotationDoc = quotationSnapshot || (drawerContract?.quotationId ? entityCachePool.get('quotations', drawerContract.quotationId) : null);

  if (!drawerContract) return null;

  const pays = (payments || []).length > 0
    ? (payments || []).filter((p: Payment) => p.contractId === drawerContract.id || p.contractId === drawerContract.soHopDong || p.contractCode === drawerContract.soHopDong || p.soHopDong === drawerContract.soHopDong)
    : lazyPayments;
  const dels = (deliveries || []).length > 0
    ? (deliveries || []).filter((d: Delivery) => d.contractId === drawerContract.id || d.contractId === drawerContract.soHopDong || d.contractCode === drawerContract.soHopDong || d.soHopDong === drawerContract.soHopDong)
    : lazyDeliveries;

  // Math totals
  const contractProg = reconcileContractFinancials(drawerContract, pays);
  const totalContractAmount = contractProg.totalContractAmount;
  const totalPaid = contractProg.totalPaid;
  const pPct = contractProg.paymentPercentage;

  const totalContractQty = drawerContract.products?.reduce((sum, p) => sum + (p.quantity || 0), 0) || drawerContract.slMay || 1;
  const totalDeliveredQty = dels
    .filter((d: Delivery) => d.ngayGiaoThucTe != null)
    .reduce((sum, d) => {
      const qtyInShipment = d.products?.reduce((s: number, p: ProductItem) => s + (p.quantity || 0), 0) || d.slMay || d.danhSachMaMay?.length || 0;
      return sum + qtyInShipment;
    }, 0);
  const dPct = Math.min(100, Math.round((totalDeliveredQty / totalContractQty) * 100));

  const isMachine = normalizeLoai(quotationDoc?.loai) === QUOTATION_LOAI.MAY;
  const lockResult = checkContractLock(drawerContract, pays, dels);

  // TABS HEADERS
  const customTabsList = (
    <div className="flex items-center gap-6 border-b border-slate-100 pb-px -mb-[9px] select-none pl-1 overflow-x-auto scrollbar-hide">
      {(
        [
          { id: 'overview', label: 'Tổng quan' },
          { id: 'activity', label: 'Hoạt động' },
          { id: 'payments', label: 'Thanh toán', count: pays.length },
          { id: 'deliveries', label: 'Giao hàng', count: dels.length },
          { id: 'links', label: 'Liên kết' },
          { id: 'zns', label: 'ZNS' },
          { id: 'audit', label: 'Nhật ký' },
        ] as const
      ).map((tab) => {
        const isTabActive = activeTab === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`pb-2.5 text-xs font-semibold relative outline-none transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 border-0 bg-transparent ${
              isTabActive ? 'text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {'count' in tab && (
              <span className={`text-3xs px-1.5 h-3.5 rounded-full ml-0.5 inline-flex items-center justify-center font-bold ${isTabActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-150 text-slate-700'}`}>
                {tab.count}
              </span>
            )}
            {isTabActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );

  // 1. TỔNG QUAN TAB (OMNI-NEXUS COD 11.0)
  const ngayKyObj = drawerContract.ngayKy ? new Date(drawerContract.ngayKy) : null;
  const ngayHT = drawerContract.soNgayDuKienHoanThanh || 0;
  let progressDays = 0;
  let isDelayed = false;
  let daysLeft = 0;
  
  if (ngayKyObj && ngayHT > 0) {
    const now = new Date();
    const elapsed = Math.max(0, Math.floor((now.getTime() - ngayKyObj.getTime()) / (1000 * 60 * 60 * 24)));
    progressDays = elapsed;
    if (elapsed > ngayHT && dPct < 100) {
      isDelayed = true;
      daysLeft = elapsed - ngayHT;
    } else {
      daysLeft = Math.max(0, ngayHT - elapsed);
    }
  }
  const timeProgressPct = ngayHT > 0 ? Math.min(100, Math.round((progressDays / ngayHT) * 100)) : 0;
  const statusText = dPct >= 100 ? 'Hoàn thành bàn giao' : isDelayed ? 'Trễ tiến độ giao' : 'Đang triển khai';
  const statusColor = dPct >= 100 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : isDelayed ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-blue-700 bg-blue-50 border-blue-200';

  const overviewPanel = (
    <div className="space-y-5 pt-1 pb-6">
      {/* 1. Active State Stream (WorkflowTimeline) */}
      {quotationDoc && (
        <WorkflowTimeline 
          quotation={quotationDoc}
          contracts={[drawerContract]}
          payments={pays}
          deliveries={dels}
          onCreatePayment={() => onCreatePayment?.(drawerContract)}
          onCreateDelivery={() => onCreateDelivery?.(drawerContract)}
          className="shadow-xs border border-slate-200"
        />
      )}

      {/* 2. Business Lock Warning */}
      <EntityBusinessLockWarning {...lockResult} />

      {/* 3. Main Workspace: Asymmetric 70% Matrix / 30% Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ===================== CỘT CHÍNH (70%): DUAL-TRACK COCKPIT & SẢN PHẨM ===================== */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Khối 1: Dual-Track Execution Cockpit (Tiến độ kép) */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  TIẾN ĐỘ THỰC THI HỢP ĐỒNG (DUAL-TRACK COCKPIT)
                </h3>
              </div>
              <span className={`text-2xs uppercase font-bold px-2 py-0.5 rounded-md border ${statusColor}`}>
                {statusText}
              </span>
            </div>

            {/* Tiến độ thời gian thực hiện */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-150 mb-4">
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  Thời gian hợp đồng: {ngayHT > 0 ? `${ngayHT} ngày` : 'Chưa xác định hạn'}
                </span>
                <span className="font-mono text-2xs text-slate-600 font-semibold">
                  {dPct >= 100 
                    ? 'Đã giao xong toàn bộ' 
                    : isDelayed 
                      ? `Trễ ${daysLeft} ngày` 
                      : `Còn lại ${daysLeft} ngày`}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1.5">
                <div 
                  className={`h-full transition-all duration-500 ${dPct >= 100 ? 'bg-emerald-500' : isDelayed ? 'bg-rose-500' : 'bg-blue-500'}`} 
                  style={{ width: `${timeProgressPct}%` }} 
                />
              </div>
              <div className="flex justify-between text-3xs text-slate-400 font-mono">
                <span>Ngày ký: {ngayKyObj ? formatDate(drawerContract.ngayKy) : 'Chưa ký'}</span>
                <span>Tiến độ ngày: {timeProgressPct}%</span>
              </div>
            </div>

            {/* 2 Trục xương sống: Tài chính & Vận chuyển */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trục 1: Tài chính */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-150 rounded-lg">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xs uppercase font-bold tracking-wider text-slate-500">Tài chính (Đã thu)</span>
                  <span className="text-2xs font-mono font-bold text-slate-800">
                    {new Intl.NumberFormat('vi-VN').format(totalPaid)} / {new Intl.NumberFormat('vi-VN').format(totalContractAmount)} ₫
                    <span className="text-emerald-700 ml-1 font-bold">({pPct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                  <div 
                    className={`h-full transition-all duration-500 ${pPct === 100 ? 'bg-emerald-500' : pPct > 0 ? 'bg-blue-600' : 'bg-slate-300'}`} 
                    style={{ width: `${pPct}%` }} 
                  />
                </div>
                <span className="text-3xs text-slate-500 block text-right font-mono">
                  {contractProg.remainingDebt > 0 ? `Còn nợ: ${new Intl.NumberFormat('vi-VN').format(contractProg.remainingDebt)} ₫` : '✓ Đã tất toán 100%'}
                </span>
              </div>

              {/* Trục 2: Vận chuyển */}
              <div className="p-3.5 bg-slate-50/70 border border-slate-150 rounded-lg">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-3xs uppercase font-bold tracking-wider text-slate-500">Vận chuyển (Đã giao)</span>
                  <span className="text-2xs font-mono font-bold text-slate-800">
                    {totalDeliveredQty} / {totalContractQty} máy
                    <span className="text-cyan-700 ml-1 font-bold">({dPct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-1">
                  <div 
                    className={`h-full transition-all duration-500 ${dPct === 100 ? 'bg-emerald-500' : dPct > 0 ? 'bg-cyan-600' : 'bg-slate-300'}`} 
                    style={{ width: `${dPct}%` }} 
                  />
                </div>
                <span className="text-3xs text-slate-500 block text-right font-mono">
                  {totalContractQty - totalDeliveredQty > 0 ? `Còn thiếu: ${totalContractQty - totalDeliveredQty} máy` : '✓ Đã xuất xưởng đủ máy'}
                </span>
              </div>
            </div>
          </section>

          {/* Khối 2: Danh mục Sản phẩm & Serial Xuất xưởng */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Layers size={13} className="text-emerald-700" />
                THIẾT BỊ SẢN PHẨM PHỤ LỤC HỢP ĐỒNG
              </h3>
              <span className="font-mono text-3xs font-bold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                {drawerContract.products?.length || 0} hạng mục
              </span>
            </div>

            <DrawerProductList 
              products={drawerContract.products || []}
              subTotal={drawerContract.subTotal}
              discountRate={drawerContract.discountRate}
              discountAmount={drawerContract.discountAmount}
              vatRate={drawerContract.vatRate}
              vatAmount={drawerContract.vatAmount}
              totalAmount={drawerContract.totalAmount}
              deliveredQuantities={normalizeLoai(drawerContract.loai) !== QUOTATION_LOAI.MAY ? drawerContract.deliveredQuantities : undefined}
              accentColorClass="text-emerald-700"
              paidAmount={contractProg.totalPaid}
              remainingDebt={contractProg.remainingDebt}
            />

            {/* Mã Máy / Serial Chips */}
            {drawerContract.danhSachMaMay && drawerContract.danhSachMaMay.length > 0 && (
              <div className="pt-4 border-t border-slate-100">
                <span className="text-3xs font-black text-slate-500 uppercase tracking-wider block mb-2.5">
                  Theo dõi danh sách Serial / Mã máy cấu hình ({drawerContract.danhSachMaMay.length} máy):
                </span>
                <div className="flex flex-wrap gap-2">
                  {drawerContract.danhSachMaMay.map((serial, idx) => {
                    const isDelivered = dels.some((d: Delivery) => d.danhSachMaMay?.includes(serial));
                    return (
                      <span 
                        key={idx} 
                        className={`inline-flex items-center px-2.5 py-1 rounded-md text-2xs font-mono font-bold border transition-colors ${
                          isDelivered 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {serial}
                        {isDelivered ? <span className="ml-1.5 text-emerald-600 font-bold">✓ Đã giao</span> : <span className="ml-1.5 text-amber-600 font-medium">Chờ giao</span>}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ===================== CỘT VỆ TINH (30%): INTELLIGENCE INSPECTOR ===================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Thẻ 1: Khách hàng & Báo giá căn cứ */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Chủ thể hợp đồng
            </h4>

            <div>
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Khách hàng pháp nhân</span>
              <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={drawerContract.tenKhachHang}>
                {drawerContract.tenKhachHang || 'N/A'}
              </p>
              {drawerContract.sdt && (
                <span className="font-mono text-3xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 inline-block mt-1.5">
                  {drawerContract.sdt}
                </span>
              )}
            </div>

            {drawerContract.soPhieuBaoGia && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Báo giá căn cứ</span>
                <QuotationHoverCard quotationId={drawerContract.quotationId}>
                  <div className="p-2.5 bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-colors rounded-lg group cursor-pointer">
                    <span className="font-mono font-bold text-blue-700 text-xs block group-hover:underline">
                      {drawerContract.soPhieuBaoGia} ↗
                    </span>
                    <span className="text-3xs text-slate-500">Di chuột để xem tóm lược báo giá gốc</span>
                  </div>
                </QuotationHoverCard>
              </div>
            )}
          </section>

          {/* Thẻ 2: Quản trị & Ký kết */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500">
                Ký kết & Phụ trách
              </span>
              <Button 
                aria-label="Gửi thông báo ZNS" 
                size="xs"
                variant="subtle"
                className="text-3xs font-bold uppercase tracking-wider h-6 px-2 text-blue-700"
                onClick={async () => {
                  const c = customers.find(x => x.id === drawerContract.customerId);
                  const phone = drawerContract.sdt || c?.sdt;
                  if (!phone) return notify.error("Khách hàng không có số điện thoại");
                  if (!await confirm({ title: 'Thông báo tiến độ', message: `Gửi thông báo tiến độ HĐ tới ${phone}?` })) return;
                  await sendZnsAndToast({
                    entityId: drawerContract.id!, entityType: 'CONTRACT', messageType: ZnsMessageType.HOPDONG_SIGN_ZNS,
                    phone: phone as string, payload: { ...drawerContract }, attemptBucket: nextAttempt(drawerContract.trangThaiGuiTinHopDong || undefined)
                  });
                }}
              >
                Gửi ZNS
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 font-mono">
                {extractAvatarBadge(drawerContract.nguoiPhuTrach)}
              </div>
              <div className="min-w-0">
                <span className="text-3xs text-slate-400 block font-bold uppercase">Người phụ trách</span>
                <span className="font-bold text-slate-800 text-xs block truncate">{drawerContract.nguoiPhuTrach || 'Chưa nhận bàn giao'}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs flex justify-between items-center">
              <span className="text-slate-500 text-2xs">Ngày ký kết:</span>
              <span className="font-mono font-bold text-slate-800 text-xs">{formatDate(drawerContract.ngayKy)}</span>
            </div>
          </section>

          {/* Thẻ 3: Dòng chảy chứng từ liên kết */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Chứng từ phái sinh
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <div>
                  <span className="text-slate-600 font-medium text-2xs block">Phiếu thu tiền:</span>
                  <span className="font-mono font-bold text-slate-800 text-3xs">{pays.length} phiếu đã ghi nhận</span>
                </div>
                {onCreatePayment && (
                  <Button 
                    variant="subtle" 
                    size="xs" 
                    className="h-6 text-3xs font-bold" 
                    onClick={() => onCreatePayment(drawerContract)}
                  >
                    + Thu tiền
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-150">
                <div>
                  <span className="text-slate-600 font-medium text-2xs block">Phiếu giao hàng:</span>
                  <span className="font-mono font-bold text-slate-800 text-3xs">{dels.length} phiếu xuất kho</span>
                </div>
                {onCreateDelivery && (
                  <Button 
                    variant="subtle" 
                    size="xs" 
                    className="h-6 text-3xs font-bold" 
                    onClick={() => onCreateDelivery(drawerContract)}
                  >
                    + Xuất kho
                  </Button>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );

  // 2. HOẠT ĐỘNG TIMELINE PANEL
  const timelinePanel = (
    <DocumentLifecycleTimeline
      currentType="contract"
      currentDoc={drawerContract}
      relatedQuotations={quotationDoc ? [quotationDoc] : []}
      relatedPayments={pays}
      relatedDeliveries={dels}
    />
  );

  // 3. THANH TOÁN (PAYMENTS) PANEL
  const paymentsPanel = <TabLichSuThanhToan matchingPayments={pays} showCreateButton={!!onCreatePayment} onNavigateNew={() => onCreatePayment?.(drawerContract)} />;

  // 4. GIAO HÀNG (DELIVERIES) PANEL
  const deliveriesPanel = <TabLichSuGiaoHang matchingDeliveries={dels} showCreateButton={!!onCreateDelivery} onNavigateNew={() => onCreateDelivery?.(drawerContract)} />;

  // 5. ZNS OA PANEL
  const znsPanel = <TabLichSuZNS entityId={(drawerContract?.id || "")} entityType="contract" />;

  // 6. LIÊN KẾT PANEL
  const linksPanel = <TabLienKet entityId={(drawerContract?.id || "")} entityType="contract" />;

  // 7. AUDIT PANEL
  const auditPanel = (
    <EntityAuditMetadataCard
      entityId={drawerContract?.id || ""}
      entityType="contract"
      documentCode={drawerContract?.soHopDong}
      documentTypeLabel="hợp đồng"
      creatorOrOfficer={drawerContract?.nguoiPhuTrach}
      statusLabel={drawerContract?.tinhTrangHopDong || 'Mới'}
      statusColor={drawerContract?.tinhTrangHopDong === 'Đã ký' ? 'text-emerald-700' : 'text-blue-700'}
      createdAt={drawerContract?.createdAt || drawerContract?.ngayKy}
      updatedAt={drawerContract?.updatedAt || drawerContract?.ngayCapNhat}
      customerName={drawerContract?.tenKhachHang}
    />
  );

  const horizonHud = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5 flex-wrap">
        <span className="font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">
          {drawerContract.soHopDong}
        </span>
        {drawerContract.soDonHang && (
          <span className="font-mono text-2xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            ĐH: #{drawerContract.soDonHang}
          </span>
        )}
        <span className="text-slate-300 font-sans">|</span>
        <span className="text-slate-600 font-medium">
          Ký ngày: <strong className="text-slate-800 font-mono">{formatDate(drawerContract.ngayKy)}</strong>
        </span>
        <span className="text-slate-300 font-sans">|</span>
        <span className="px-2 py-0.5 rounded text-3xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          {drawerContract.tinhTrangHopDong || 'Mới'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-2xs">
          <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">Giá trị HĐ:</span>
          <span className="font-mono text-sm font-black text-emerald-800 tabular-nums">
            {new Intl.NumberFormat('vi-VN').format(totalContractAmount)} ₫
          </span>
          <span className="text-3xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 ml-1">
            Đã thu {pPct}%
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <DetailDrawer
      isOpen={!!drawerContract}
      onClose={onClose}
      modal={modal}
      className={className}
      title={`Hợp đồng ${drawerContract?.soHopDong || ''}`}
      subTitle={drawerContract?.tenKhachHang || ''}
      entityId={drawerContract?.id || ''}
      entityType="contract"
      icon={<FileText size={16} />}
      size="studio"
      horizonHud={horizonHud}
      tabs={customTabsList}
      footer={
        <div className="flex gap-2 justify-end w-full items-center">
          {onDelete && (
            <Button 
              aria-label="Xóa hợp đồng" 
              variant="danger"
              size="sm"
              className="mr-auto h-9 font-bold" 
              onClick={async () => {
                if (await confirm({ title: 'Xóa hợp đồng', message: `Bạn có chắc chắn muốn xóa hợp đồng ${drawerContract.soHopDong}?` })) {
                  onDelete(drawerContract);
                  onClose();
                }
              }}
              leftIcon={<Trash2 size={16} />}
            >
              Xóa
            </Button>
          )}

          {onCreatePayment && (
            <Button id="btn-create-p" aria-label="Tạo phiếu thu" variant="subtle" size="sm" className="h-9 font-bold" onClick={() => onCreatePayment(drawerContract)}>
              + Phiếu thu
            </Button>
          )}

          {onCreateDelivery && (
            <Button id="btn-create-d" aria-label="Tạo phiếu giao" variant="subtle" size="sm" className="h-9 font-bold" onClick={() => onCreateDelivery(drawerContract)}>
              + Phiếu giao
            </Button>
          )}

          <Button aria-label="Đóng" variant="secondary" size="sm" className="h-9 font-bold" onClick={onClose}>Đóng</Button>
          <Button aria-label="Chỉnh sửa" variant="primary" size="sm" className="h-9 font-bold" onClick={() => onEdit(drawerContract)}>Chỉnh sửa</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {activeTab === 'overview' && overviewPanel}
        {activeTab === 'activity' && timelinePanel}
        {activeTab === 'payments' && paymentsPanel}
        {activeTab === 'deliveries' && deliveriesPanel}
        {activeTab === 'links' && linksPanel}
        {activeTab === 'zns' && znsPanel}
        {activeTab === 'audit' && auditPanel}
      </div>
    </DetailDrawer>
  );
}
