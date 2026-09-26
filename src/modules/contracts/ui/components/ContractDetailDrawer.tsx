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

  // 1. TỔNG QUAN TAB
  const overviewPanel = (
    <div className="space-y-6 pt-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)]">
          <div className="text-2xs text-slate-600 mb-1 uppercase font-bold tracking-wider">Khách hàng pháp nhân</div>
          <div className="font-semibold text-slate-900 text-sm">{drawerContract.tenKhachHang || 'N/A'}</div>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)]">
          <div className="text-2xs text-slate-600 mb-1 uppercase font-bold tracking-wider">Số HĐ / Số ĐH</div>
          <div className="font-mono font-bold text-slate-900 text-sm">{drawerContract.soHopDong || 'N/A'} / {drawerContract.soDonHang || 'N/A'}</div>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)]">
          <div className="text-2xs text-slate-600 mb-1 uppercase font-bold tracking-wider">Ngày ký kết</div>
          <div className="text-slate-900 font-bold text-sm">{formatDate(drawerContract.ngayKy)}</div>
        </div>
        <div className="p-4 bg-white border border-slate-100 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)]">
          <div className="text-2xs text-slate-600 mb-1 uppercase font-bold tracking-wider">Số ngày thực hiện</div>
          <div className="font-bold text-slate-900 text-xs">{drawerContract.soNgayDuKienHoanThanh ? `${drawerContract.soNgayDuKienHoanThanh} ngày` : '—'}</div>
        </div>
        {drawerContract.soPhieuBaoGia && (
          <div className="col-span-2">
            <QuotationHoverCard quotationId={drawerContract.quotationId}>
              <div className="p-4 bg-white border border-slate-100 hover:border-blue-300 transition-colors rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)] group">
                <div className="text-2xs text-slate-600 mb-1 uppercase font-bold tracking-wider flex items-center justify-between">
                  <span>Báo giá căn cứ</span>
                  <span className="text-3xs text-blue-600 lowercase font-medium group-hover:underline">Di chuột xem chi tiết báo giá</span>
                </div>
                <div className="font-mono font-extrabold text-blue-600 text-xs">{drawerContract.soPhieuBaoGia}</div>
              </div>
            </QuotationHoverCard>
          </div>
        )}
      </div>

      {/* Contract Progress Display */}
      {quotationDoc && (
        <WorkflowTimeline 
          quotation={quotationDoc}
          contracts={[drawerContract]}
          payments={pays}
          deliveries={dels}
          className="mb-6 shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
        />
      )}
      <EntityBusinessLockWarning {...lockResult} />
      
      <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <h3 className="text-xs font-black text-slate-600 mb-4 uppercase tracking-widest flex items-center justify-between">
          <span>Tiến độ hợp đồng</span>
          <Button 
            aria-label="Gửi thông báo ZNS" 
            className="text-2xs font-black uppercase text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 h-7 rounded border border-blue-200/50 cursor-pointer shadow-sm" 
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
            Gửi thông báo ZNS
          </Button>
        </h3>
        
        {(() => {
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
          const statusText = dPct >= 100 ? 'Hoàn thành' : isDelayed ? 'Trễ tiến độ' : 'Đang thực hiện';
          const statusColor = dPct >= 100 ? 'text-emerald-600 bg-emerald-50' : isDelayed ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50';

          return (
            <div className="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-2xs font-bold text-slate-700">Thời gian thực hiện ({ngayHT} ngày)</span>
                <span className={`text-2xs uppercase font-bold px-2 py-0.5 rounded-full ${statusColor}`}>
                  {statusText}
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full transition-all ${dPct >= 100 ? 'bg-emerald-500' : isDelayed ? 'bg-red-500' : 'bg-blue-500'}`} 
                  style={{width: `${timeProgressPct}%`}} 
                />
              </div>
              <div className="flex justify-between text-2xs text-slate-500 font-medium">
                <span>{ngayKyObj ? formatDate(drawerContract.ngayKy) : 'Chưa ký'}</span>
                <span>
                  {dPct >= 100 
                    ? 'Đã giao xong' 
                    : isDelayed 
                      ? `Trễ ${daysLeft} ngày` 
                      : `Còn lại ${daysLeft} ngày`}
                </span>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          <div className="flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider">Tài chính (Đã thu)</span>
              <span className="text-2xs text-slate-700 font-bold font-mono tracking-wide">{new Intl.NumberFormat('vi-VN').format(totalPaid)} / {new Intl.NumberFormat('vi-VN').format(totalContractAmount)} đ <span className="text-blue-600 ml-1">({pPct}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${pPct === 100 ? 'bg-emerald-500' : pPct > 0 ? 'bg-blue-600' : 'bg-slate-200'}`} style={{width: `${pPct}%`}} />
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <div className="flex justify-between items-end mb-2">
              <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider">Vận chuyển (Đã giao)</span>
              <span className="text-2xs text-slate-700 font-bold font-mono tracking-wide">{totalDeliveredQty} / {totalContractQty} máy <span className="text-cyan-600 ml-1">({dPct}%)</span></span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full transition-all ${dPct === 100 ? 'bg-emerald-500' : dPct > 0 ? 'bg-cyan-600' : 'bg-slate-200'}`} style={{width: `${dPct}%`}} />
            </div>
          </div>
        </div>

        {/* Mã Máy Tracking */}
        {drawerContract.danhSachMaMay && drawerContract.danhSachMaMay.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-3">Theo dõi Serial / Mã Máy</span>
            <div className="flex flex-wrap gap-2">
              {drawerContract.danhSachMaMay.map((serial, idx) => {
                const isDelivered = dels.some((d: Delivery) => d.danhSachMaMay?.includes(serial));
                return (
                  <span 
                    key={idx} 
                    className={`inline-flex items-center px-2 py-1 rounded text-2xs font-mono font-bold border transition-colors ${
                      isDelivered 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {serial}
                    {isDelivered && <span className="ml-1 opacity-70">✓</span>}
                  </span>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Embedded Products & Logistics details */}
      <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.02)]">
        <h3 className="text-xs font-black text-slate-650 mb-3 uppercase tracking-widest border-b border-slate-100 pb-2 flex items-center gap-1.5">
          <Layers size={12} /> THIẾT BỊ SẢN PHẨM PHỤ LỤC
        </h3>
        <div>
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
          />
        </div>

        {/* PIC display */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <span className="text-2xs text-slate-600 block uppercase font-bold tracking-wider mb-1.5">Người Phụ Trách</span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-slate-950 text-white flex items-center justify-center font-bold text-2xs shadow-sm">
                {extractAvatarBadge(drawerContract.nguoiPhuTrach)}
              </div>
              <span className="font-bold text-slate-900 text-xs">{drawerContract.nguoiPhuTrach || 'Chưa nhận bàn giao'}</span>
            </div>
          </div>
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
      size="screen"
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
