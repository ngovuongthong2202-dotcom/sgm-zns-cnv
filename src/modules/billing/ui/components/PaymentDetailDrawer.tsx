/* eslint-disable max-lines */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { swrColFetcher, swrDocFetcher } from '@/src/data/swr-fetchers';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { Payment } from '@/src/domain/schema/payment.schema';
import { CreditCard, Calendar, Clock, Send, DollarSign, Edit, Package, User, FileText } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { StatusPill } from '@/src/widgets/StatusPill';
import { TabLichSuGiaoHang } from "@/src/widgets/TabLichSuGiaoHang";
import { TabLichSuZNS } from "@/src/widgets/TabLichSuZNS";
import { TabLienKet } from "@/src/widgets/TabLienKet";
import { DrawerProductList } from '@/src/widgets/DrawerProductList';
import { DocumentLifecycleTimeline } from "@/src/widgets/DocumentLifecycleTimeline";
import { EntityAuditMetadataCard } from "@/src/widgets/EntityAuditMetadataCard";
import { ContractHoverCard } from '@/src/modules/contracts/ui/components/ContractHoverCard';
import { QuotationHoverCard } from '@/src/modules/sales/ui/components/QuotationHoverCard';
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';

import { Button } from '@/src/design-system/Button';

import { useConfirm } from '@/src/design-system/Confirm';

interface PaymentDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment;
  onEdit?: (payment: Payment) => void;
  onSendZns?: (payment: Payment) => void;
  onDelete?: (payment: Payment) => void;
  modal?: boolean;
  className?: string;
}

export function PaymentDetailDrawer({
  isOpen,
  onClose,
  payment,
  onEdit,
  onSendZns,
  onDelete,
  modal,
  className,
}: PaymentDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'deliveries' | 'zns' | 'links' | 'audit'>('overview');
  const { confirm } = useConfirm();

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen, payment?.id]);

  const paymentId = payment?.id || '';
  const contractId = payment?.contractId || '';
  const { data: contractDoc } = useSWR<any>(
    isOpen && payment.contractId ? `contracts:${payment.contractId}` : null,
    swrDocFetcher
  );

  // Lineage fallback: resolve quotationId directly from payment or indirectly through linked contractDoc
  const quotationId = payment.quotationId || contractDoc?.quotationId;
  const filterKey = contractId ? `contractId:${contractId}` : quotationId ? `quotationId:${quotationId}` : null;

  const { data: _quotationDoc } = useSWR<any>(
    isOpen && quotationId ? `quotations:${quotationId}` : null,
    swrDocFetcher
  );
  const { data: deliveries = [], isLoading: dLoading } = useSWR<any[]>(
    isOpen && filterKey
      ? `deliveries:500:${filterKey}`
      : null,
    swrColFetcher,
    { revalidateOnFocus: false }
  );

  if (!payment) return null;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  const totalPayable = payment.totalAmount || (payment as any).tongTienCanThanhToan || payment.soTien || 0;
  const remainingDebt = Math.max(0, totalPayable - (payment.soTien || 0));

  // 1. TỔNG QUAN TAB (OMNI-NEXUS COD 11.0)
  const overviewPanel = (
    <div className="space-y-5 pt-1 pb-6">
      {/* Workflow Progress Display */}
      {_quotationDoc && (
        <WorkflowTimeline 
          quotation={_quotationDoc}
          contracts={contractDoc ? [contractDoc] : []}
          payments={[payment]}
          deliveries={deliveries}
          className="shadow-xs border border-slate-200"
        />
      )}

      {/* Executive Waiver Debt Reminder Banner */}
      {(() => {
        const waiverDelivery = (deliveries || []).find((d: any) => d.dacCachGiaoTruoc || d.hinhThucThanhToan === 'GIAO_TRUOC_TT_SAU');
        if (!waiverDelivery) return null;
        return (
          <div className="p-4 bg-amber-50/90 border border-amber-300 rounded-xl flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
              ⚡
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                  Đặc cách Ban Giám Đốc: Đã xuất kho trước khi thanh toán
                </span>
                <span className="text-3xs font-mono font-bold bg-amber-200/80 text-amber-900 px-1.5 py-0.5 rounded">
                  Phiếu GH: {waiverDelivery.deliveryId || '---'}
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-1 font-medium leading-relaxed">
                Đơn hàng này đã được <strong>{waiverDelivery.nguoiPheDuyetDacCach || 'Ban Giám Đốc'}</strong> chỉ định giao hàng trước. Kế toán lưu ý theo dõi sát sao tiến độ thu tiền và nhắc nhở khách hàng tất toán đúng hạn.
              </p>
              {waiverDelivery.lyDoDacCach && (
                <div className="mt-1.5 text-2xs text-amber-900 font-mono bg-white/70 p-2 rounded border border-amber-200/80">
                  <strong>Căn cứ / Lý do:</strong> {waiverDelivery.lyDoDacCach}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Main Workspace: Asymmetric 70% Matrix / 30% Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* ===================== CỘT CHÍNH (70%): TREASURY HERO & BẢNG SẢN PHẨM ===================== */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Khối 1: Treasury Hero Card */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-800">
                  KHO BẠC & XÁC NHẬN THỰC THU (TREASURY CONSOLE)
                </h3>
              </div>
              <span className="text-2xs uppercase font-bold px-2 py-0.5 rounded-md border bg-blue-50 text-blue-700 border-blue-200">
                {payment.tinhTrangThanhToan || 'Đã ghi nhận'}
              </span>
            </div>

            {/* Hero Amount Banner */}
            <div className="p-4 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 border border-emerald-200 rounded-xl mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-3xs uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5 mb-1">
                  <DollarSign size={13} className="text-emerald-600" /> SỐ TIỀN THỰC THU ĐỢT NÀY
                </span>
                <div className="font-mono font-black text-2xl md:text-3xl text-emerald-800 tabular-nums">
                  {formatCurrency(payment.soTien || 0)}
                </div>
              </div>

              <div className="flex flex-col sm:items-end text-xs">
                <span className="text-3xs uppercase font-bold text-slate-500 mb-0.5">Phương thức thanh toán</span>
                <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  {payment.phuongThucThanhToan || 'Chuyển khoản'}
                </span>
              </div>
            </div>

            {/* Đối soát dòng tiền 3 con số */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Ngày thực thu</span>
                <span className="font-mono font-bold text-slate-800 text-xs flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  {formatDate(payment.ngayThanhToan)}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Hạn chót thanh toán</span>
                <span className="font-mono font-bold text-amber-800 text-xs flex items-center gap-1">
                  <Clock size={12} className="text-amber-500" />
                  {payment.ngayDenHan ? formatDate(payment.ngayDenHan) : 'Không ghi nhận'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Nghĩa vụ công nợ còn lại</span>
                <span className={`font-mono font-bold text-xs ${remainingDebt > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {remainingDebt > 0 ? formatCurrency(remainingDebt) : '✓ Tất toán 100%'}
                </span>
              </div>
            </div>
          </section>

          {/* Khối 2: Sản phẩm đối chiếu */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-blue-600" />
                SẢN PHẨM & CẤU HÌNH ĐỐI CHIẾU
              </h3>
              <span className="font-mono text-3xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {payment.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || payment.slMay || 0} sản phẩm
              </span>
            </div>

            {payment.products?.length ? (
              <DrawerProductList 
                products={payment.products}
                subTotal={payment.subTotal}
                discountRate={payment.discountRate}
                discountAmount={payment.discountAmount}
                vatRate={payment.vatRate}
                vatAmount={payment.vatAmount}
                totalAmount={payment.totalAmount}
                accentColorClass="text-blue-700"
                paidAmount={payment.soTien}
                remainingDebt={remainingDebt}
              />
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Phiếu thu tổng hợp theo Hợp đồng / Báo giá (Không có danh mục sản phẩm lẻ).
              </div>
            )}
          </section>
        </div>

        {/* ===================== CỘT VỆ TINH (30%): INTELLIGENCE INSPECTOR ===================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Thẻ 1: Khách hàng & Người nộp tiền */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Khách hàng & Người nộp
            </h4>

            <div>
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Khách hàng pháp nhân</span>
              <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={payment.tenKhachHang}>
                {payment.tenKhachHang || '---'}
              </p>
              {payment.maKh && (
                <span className="font-mono text-3xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block mt-1.5">
                  {payment.maKh}
                </span>
              )}
            </div>

            {(payment.tenNguoiNop || payment.sdt) && (
              <div className="pt-2 border-t border-slate-100 text-xs">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Đại diện nộp tiền</span>
                <span className="font-semibold text-slate-800 block">{payment.tenNguoiNop || '---'}</span>
                {payment.sdt && <span className="font-mono text-3xs text-blue-700 font-bold block mt-0.5">{payment.sdt}</span>}
              </div>
            )}
          </section>

          {/* Thẻ 2: Căn cứ Thu tiền */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Chứng từ căn cứ thu tiền
            </h4>

            {payment.contractId ? (
              <ContractHoverCard contract={contractDoc || { id: payment.contractId, soHopDong: payment.soHopDong, customerId: payment.customerId, tenKhachHang: payment.tenKhachHang } as any}>
                <div className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-colors rounded-lg group cursor-pointer">
                  <span className="text-3xs text-slate-400 block uppercase font-bold mb-1">Hợp đồng căn cứ:</span>
                  <span className="font-mono font-bold text-emerald-700 text-xs block group-hover:underline">
                    {payment.soHopDong || 'HĐ chưa gắn mã'} ↗
                  </span>
                  <span className="text-3xs text-slate-500">Di chuột để xem chi tiết hợp đồng</span>
                </div>
              </ContractHoverCard>
            ) : payment.quotationId ? (
              <QuotationHoverCard quotationId={payment.quotationId}>
                <div className="p-3 bg-slate-50 hover:bg-amber-50/50 border border-slate-200 hover:border-amber-300 transition-colors rounded-lg group cursor-pointer">
                  <span className="text-3xs text-slate-400 block uppercase font-bold mb-1">Báo giá căn cứ:</span>
                  <span className="font-mono font-bold text-amber-700 text-xs block group-hover:underline">
                    {payment.soDonHang || 'Báo giá bán lẻ'} ↗
                  </span>
                  <span className="text-3xs text-slate-500">Di chuột để xem chi tiết báo giá</span>
                </div>
              </QuotationHoverCard>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs text-slate-400 italic">
                Thu tiền tự do (Không gắn chứng từ gốc)
              </div>
            )}
          </section>

          {/* Thẻ 3: Quản trị & Ghi chú */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-2xs font-black uppercase tracking-widest text-slate-500">
                Chuyên viên thu nợ
              </span>
              <StatusPill statusStr={payment.trangThaiGuiTinThanhToan as any} />
            </div>

            <div className="text-xs">
              <span className="font-bold text-slate-800 text-xs block">{payment.nguoiPhuTrach || '---'}</span>
            </div>

            {payment.ghiChu && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Ghi chú & Mã giao dịch UNC:</span>
                <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-150 leading-relaxed whitespace-pre-wrap font-mono text-2xs">
                  {payment.ghiChu}
                </p>
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );

  // 3. GIAO HÀNG TRONG HỢP ĐỒNG LIÊN KẾT (TT-GH constraints)
  const navigate = useNavigate();
  const pStatus = (payment.tinhTrangThanhToan || '').toLowerCase().trim();
  const isChuaTT = pStatus === 'chưa tt' || pStatus === 'chua tt' || pStatus === 'chưa thanh toán';
  const deliveriesPanel = (
    <TabLichSuGiaoHang 
      matchingDeliveries={deliveries} 
      showCreateButton={!isChuaTT} 
      onNavigateNew={() => {
        onClose();
        navigate('/deliveries', { state: { createFromPayment: payment } });
      }} 
    />
  );

  // Horizon HUD (Top Status Pulse)
  const horizonHud = (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <span className="font-mono font-black text-emerald-800 bg-white px-2.5 py-1 rounded-md border border-emerald-200 shadow-2xs">
          {payment.paymentId || 'N/A'}
        </span>
        <span className={`px-2 py-0.5 rounded text-3xs font-bold border ${
          isChuaTT ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {payment.tinhTrangThanhToan || 'Tất toán'}
        </span>
        {payment.soHopDong && (
          <span className="font-mono text-3xs font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
            HĐ: {payment.soHopDong}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-3xs text-slate-700 uppercase font-bold">Thực thu:</span>
          <span className="font-mono font-black text-emerald-800">
            {formatCurrency(payment.soTien || 0)}
          </span>
        </div>
        <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
        <div className="flex items-center gap-1.5">
          <span className="text-3xs text-slate-700 uppercase font-bold">Còn nợ:</span>
          <span className={`font-mono font-bold ${remainingDebt > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
            {remainingDebt > 0 ? formatCurrency(remainingDebt) : '0 ₫ (Xong)'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <DetailDrawer
      isOpen={isOpen}
      onClose={onClose}
      modal={modal}
      className={className}
      title={`XÁC NHẬN THANH TOÁN: ${payment.paymentId || 'N/A'}`}
      subTitle={
        <div className="flex items-center gap-2">
          <span className="font-mono text-slate-600 text-xs font-semibold">
            {payment.tinhTrangThanhToan || '---'}
          </span>
        </div>
      }
      entityId={paymentId}
      entityType="payment"
      icon={<CreditCard size={16} />}
      size="studio"
      horizonHud={horizonHud}
      tabs={
        <div className="flex items-center gap-6 border-b border-slate-100 pb-px -mb-[9px] select-none pl-1 overflow-x-auto scrollbar-hide">
          {(
            [
              { id: 'overview', label: 'Tổng quan' },
              { id: 'activity', label: 'Hoạt động' },
              { id: 'deliveries', label: 'Giao hàng', count: deliveries.length, loading: dLoading },
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
                    {tab.loading ? '...' : tab.count}
                  </span>
                )}
                {isTabActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-t-full" />
                )}
              </button>
            );
          })}
        </div>
      }
      footer={
        <div className="flex w-full select-none items-center justify-between">
          <div>
            {onDelete && (
              <Button
                aria-label="Xoá"
                variant="danger"
                size="sm"
                className="h-9 font-bold"
                onClick={() => {
                  confirm({
                    title: 'Xóa giao dịch',
                    message: 'Bạn có chắc chắn muốn xóa giao dịch thanh toán này? Hành động này không thể hoàn tác.',
                    confirmText: 'Xóa',
                    variant: 'danger'
                  }).then((confirmed) => {
                    if (confirmed) onDelete(payment);
                  });
                }}
              >
                Xoá
              </Button>
            )}
          </div>
          <div className="flex gap-2 justify-end">
            <Button aria-label="Đóng" variant="secondary" size="sm" onClick={onClose} className="h-9 font-bold">
              Đóng
            </Button>

            {onSendZns && (
              <Button
                aria-label="Gửi tin Zalo"
                variant="subtle"
                size="sm"
                onClick={() => onSendZns(payment)}
                className="h-9 font-bold"
                leftIcon={<Send size={12} />}
              >
                Gửi tin Zalo
              </Button>
            )}

            {onEdit && (
              <Button
                aria-label="Chỉnh sửa"
                variant="dark"
                size="sm"
                onClick={() => {
                  onEdit(payment);
                  onClose();
                }}
                className="h-9 font-bold"
                leftIcon={<Edit size={12} />}
              >
                Chỉnh sửa
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {activeTab === 'overview' && overviewPanel}
        {activeTab === 'activity' && (
          <DocumentLifecycleTimeline
            currentType="payment"
            currentDoc={payment}
            relatedQuotations={_quotationDoc ? [_quotationDoc] : []}
            relatedContracts={contractDoc ? [contractDoc] : []}
            relatedDeliveries={deliveries}
          />
        )}
        {activeTab === 'deliveries' && deliveriesPanel}
        {activeTab === 'links' && <TabLienKet entityId={paymentId} entityType="payment" />}
        {activeTab === 'zns' && <TabLichSuZNS entityId={paymentId} entityType="payment" />}
        {activeTab === 'audit' && (
          <EntityAuditMetadataCard
            entityId={paymentId}
            entityType="payment"
            documentCode={payment.paymentId || (payment as any).soPhieuThu || (payment as any).soChungTu}
            documentTypeLabel="chứng từ thanh toán"
            creatorOrOfficer={payment.nguoiPhuTrach}
            statusLabel={payment.tinhTrangThanhToan || 'Tất toán'}
            statusColor={payment.tinhTrangThanhToan === 'Tất toán' ? 'text-emerald-700' : 'text-amber-700'}
            createdAt={payment.createdAt || payment.ngayThanhToan}
            updatedAt={(payment as any).updatedAt || (payment as any).ngayCapNhat}
            customerName={payment.tenKhachHang}
          />
        )}
      </div>
    </DetailDrawer>
  );
}
