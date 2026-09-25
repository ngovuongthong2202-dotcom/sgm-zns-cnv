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

  // 1. TỔNG QUAN TAB
  const overviewPanel = (
    <div className="space-y-6 pt-2">
      {/* Workflow Progress Display */}
      {_quotationDoc && (
        <WorkflowTimeline 
          quotation={_quotationDoc}
          contracts={contractDoc ? [contractDoc] : []}
          payments={[payment]}
          deliveries={deliveries}
          className="shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
        />
      )}

      {/* Fin Info Bento */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="text-2xs text-emerald-800 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><DollarSign size={14}/> SỐ TIỀN THU</div>
          <div className="font-mono font-extrabold text-emerald-800 text-lg">{formatCurrency(payment.soTien || 0)}</div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><CreditCard size={14}/> PHƯƠNG THỨC</div>
          <div className="font-bold text-slate-800 text-sm tracking-tight">{payment.phuongThucThanhToan || '---'}</div>
        </div>

        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Calendar size={14}/> NGÀY THU TIỀN</div>
          <div className="font-mono text-slate-800 font-bold text-sm tracking-tight">{formatDate(payment.ngayThanhToan)}</div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col justify-center shadow-sm">
          <div className="text-2xs text-amber-800 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5"><Clock size={14}/> HẠN CHÓT THU</div>
          <div className="font-mono text-amber-800 font-bold text-sm tracking-tight">{payment.ngayDenHan ? formatDate(payment.ngayDenHan) : '---'}</div>
        </div>
      </div>
      
      {/* Customer / Contract block */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2 text-2xs font-bold uppercase tracking-wider text-slate-500">
             <User size={14} className="text-blue-500" /> KHÁCH HÀNG
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">{payment.tenKhachHang || '---'}</div>
            {payment.maKh && <div className="text-xs font-mono text-slate-500 mt-0.5">{payment.maKh}</div>}
          </div>
          {(payment.tenNguoiNop || payment.sdt) && (
             <div className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                <span className="font-medium text-slate-800">{payment.tenNguoiNop}</span> 
                {payment.sdt && <span className="text-slate-500">{payment.sdt}</span>}
             </div>
          )}
        </div>
        
        <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center gap-2 mb-1 border-b border-slate-100 pb-2 text-2xs font-bold uppercase tracking-wider text-slate-500">
             <FileText size={14} className="text-blue-500" /> CĂN CỨ THU TIỀN
          </div>
          {payment.contractId ? (
            <ContractHoverCard contract={contractDoc || { id: payment.contractId, soHopDong: payment.soHopDong, customerId: payment.customerId, tenKhachHang: payment.tenKhachHang } as any}>
              <div className="p-4 bg-white border border-slate-150 hover:border-blue-400 transition-colors rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)] group cursor-pointer text-left">
                <div className="text-2xs text-slate-500 mb-1.5 uppercase font-bold tracking-wider flex items-center justify-between">
                  <span>Tham chiếu căn cứ</span>
                  <span className="text-3xs text-blue-600 lowercase font-medium group-hover:underline">Di chuột xem hợp đồng</span>
                </div>
                <div className="font-mono font-extrabold text-blue-600 text-xs">{payment.soHopDong || 'HĐ chưa gắn'}</div>
              </div>
            </ContractHoverCard>
          ) : payment.quotationId ? (
            <QuotationHoverCard quotationId={payment.quotationId}>
              <div className="p-4 bg-white border border-slate-150 hover:border-blue-400 transition-colors rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)] group cursor-pointer text-left">
                <div className="text-2xs text-slate-500 mb-1.5 uppercase font-bold tracking-wider flex items-center justify-between">
                  <span>Tham chiếu căn cứ</span>
                  <span className="text-3xs text-blue-600 lowercase font-medium group-hover:underline">Di chuột xem báo giá</span>
                </div>
                <div className="font-mono font-extrabold text-amber-600 text-xs">{payment.soDonHang || 'Bán lẻ / Báo giá'}</div>
              </div>
            </QuotationHoverCard>
          ) : (
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl text-center text-xs text-slate-400 italic">
              Không có tham chiếu căn cứ
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-2 pt-2 border-t border-slate-100">
            <div>
               <div className="text-2xs text-slate-500 font-bold tracking-wider uppercase mb-0.5">SỐ ĐƠN HÀNG</div>
               <div className="font-mono text-slate-800 font-semibold text-xs">{payment.soDonHang || '---'}</div>
            </div>
            <div>
               <div className="text-2xs text-slate-500 font-bold tracking-wider uppercase mb-0.5">TÌNH TRẠNG</div>
               <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">{payment.tinhTrangThanhToan || '---'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile/Responsible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-slate-200 rounded-xl text-xs font-semibold shadow-sm">
        <div>
          <span className="text-2xs text-slate-600 block uppercase font-bold tracking-wider">Người phụ trách</span>
          <span className="font-extrabold text-slate-800 mt-1 block">{payment.nguoiPhuTrach || '---'}</span>
        </div>
        <div>
          <span className="text-2xs text-slate-600 block uppercase font-bold tracking-wider">Trạng thái ZNS SGM</span>
          <div className="mt-1 flex justify-start">
            <StatusPill statusStr={payment.trangThaiGuiTinThanhToan as any} />
          </div>
        </div>
        <div className="col-span-1 sm:col-span-2 pt-4 border-t border-slate-100">
          <span className="text-2xs text-slate-600 block uppercase font-bold tracking-wider">Ghi chú & Mã UNC</span>
          <p className="text-xs text-slate-700 bg-slate-50 p-4 border border-slate-150 rounded-xl leading-relaxed whitespace-pre-wrap text-left mt-1.5">
            {payment.ghiChu || <span className="italic text-slate-600 font-normal">Không có ghi chú.</span>}
          </p>
        </div>
      </div>

      {/* Billable detail products */}
      <div>
        <h3 className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-2 uppercase tracking-wider pl-1 header-text">
          <Package size={14} className="text-slate-500" />
          Sản phẩm đối chiếu ({payment.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || payment.slMay || 0} SP)
        </h3>
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden animate-in fade-in">
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
            />
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500 font-medium bg-slate-50 rounded-xl">Không có cấu trúc sản phẩm chi tiết.</div>
          )}
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
      size="screen"
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
