/* eslint-disable max-lines */
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import { formatDate } from '@/src/shared/utils/formatDate';
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import { PaymentHoverCard } from '@/src/modules/billing/ui/components/PaymentHoverCard';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { Truck, MapPin, Package, Phone, FileText, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { TabLichSuZNS } from "@/src/widgets/TabLichSuZNS";
import { TabLichSuHoatDong } from "@/src/widgets/TabLichSuHoatDong";
import { TabLichSuHeThong } from "@/src/widgets/TabLichSuHeThong";
import { TabLienKet } from "@/src/widgets/TabLienKet";
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';

import { Button } from '@/src/design-system/Button';
import { CompleteDeliveryModal } from './CompleteDeliveryModal';

interface DeliveryDetailDrawerProps {
  drawerDelivery: Delivery | null;
  onClose: () => void;
  onEdit: (delivery: Delivery) => void;
  onMarkDelivered?: (delivery: Delivery) => void;
  onSendZns: (delivery: Delivery, templateCode: 'GIAOHANG_ZNS' | 'GIAOHANG_HOANTAT') => void;
  onCancelDelivery: (delivery: Delivery, reason: string) => Promise<void>;
  drawerContract: any | null;
  drawerQuotation: any | null;
  modal?: boolean;
  className?: string;
  completingDelivery?: Delivery | null;
  setCompletingDelivery?: React.Dispatch<React.SetStateAction<Delivery | null>>;
  onCompleteDeliverySubmit?: (data: Partial<Delivery>) => Promise<void>;
}

export function DeliveryDetailDrawer({ 
  drawerDelivery, 
  onClose, 
  onEdit, 
  onMarkDelivered, 
  onSendZns,
  onCancelDelivery,
  drawerContract,
  drawerQuotation,
  modal,
  className,
  completingDelivery,
  setCompletingDelivery,
  onCompleteDeliverySubmit,
}: DeliveryDetailDrawerProps) {
  const { data: paymentDoc } = useSWR<any>(
    drawerDelivery?.paymentId ? `payments:${drawerDelivery.paymentId}` : null,
    swrDocFetcher
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'links' | 'zns' | 'audit'>('overview');

  const customTabsList = (
    <div className="flex items-center gap-6 border-b border-slate-100 pb-px -mb-[9px] select-none pl-1 overflow-x-auto scrollbar-hide">
      {(
        [
          { id: 'overview', label: 'Tổng quan' },
          { id: 'activity', label: 'Hoạt động' },
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
            {isTabActive && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );

  const isCompleted = drawerDelivery ? !!drawerDelivery.ngayGiaoThucTe : false;

  const smartAddress = useMemo(() => {
    if (!drawerDelivery) return 'Hà Nội';
    
    const noteText = drawerDelivery.ghiChu || '';
    const addressKeywords = [
      /địa chỉ:\s*([^\n;.]+)/i,
      /giao tại:\s*([^\n;.]+)/i,
      /nơi giao:\s*([^\n;.]+)/i,
      /giao đến:\s*([^\n;.]+)/i,
      /ship to:\s*([^\n;.]+)/i
    ];
    for (const pattern of addressKeywords) {
      const match = noteText.match(pattern);
      if (match && match[1]?.trim()) {
        return match[1].trim();
      }
    }

    if ((drawerDelivery as any).diaChiGiaoHang) return (drawerDelivery as any).diaChiGiaoHang;
    if ((drawerDelivery as any).diaChi) return (drawerDelivery as any).diaChi;
    if (drawerContract && (drawerContract.diaChiGiaoHang || drawerContract.diaChi)) return drawerContract.diaChiGiaoHang || drawerContract.diaChi;

    const customerLabel = drawerDelivery.tenKhachHang || 'Hà Nội';
    if (
      customerLabel.toLowerCase().includes('việt nam') || 
      customerLabel.toLowerCase().includes('hà nội') || 
      customerLabel.toLowerCase().includes('hồ chí minh')
    ) {
      return customerLabel;
    }
    return `${customerLabel}, Việt Nam`;
  }, [drawerDelivery, drawerContract]);

  const isMismatch = useMemo(() => {
    if (!drawerDelivery || !drawerContract) return false;
    const contractProducts = drawerContract.products || [];
    const deliveryProducts = drawerDelivery.products || [];

    if (contractProducts.length === 0 && deliveryProducts.length > 0) return true;
    if (contractProducts.length !== deliveryProducts.length) return true;

    for (const dp of deliveryProducts) {
      const match = contractProducts.find((cp: any) => 
        (cp.id || cp.productId || cp.productName) === (dp.id || dp.productId || dp.productName)
      );
      if (!match) return true;
      if (Number(match.quantity) < Number(dp.quantity)) return true;
    }

    return false;
  }, [drawerDelivery, drawerContract]);

  if (!drawerDelivery) return null;

  // 1. TỔNG QUAN PANEL
  const overviewPanel = (
    <div className="space-y-6 pt-2">

      {/* Workflow Progress Display */}
      {drawerQuotation && (
        <WorkflowTimeline 
          quotation={drawerQuotation}
          contracts={drawerContract ? [drawerContract] : []}
          payments={paymentDoc ? [paymentDoc] : []}
          deliveries={[drawerDelivery]}
          className="shadow-[0_1px_2px_rgba(15,23,42,0.02)]"
        />
      )}

      {/* Mismatch warnings */}
      {isMismatch && (
        <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-amber-900 text-xs">Cảnh báo: Lệch máy cấu hình (Discrepancy Detected)</h4>
            <p className="text-amber-700 text-2xs/normal mt-1 leading-relaxed">
              Danh sách sản phẩm hoặc khối lượng dòng máy trong Phiếu Giao này đang **khác biệt** so với Hợp đồng phụ lục vừa thay đổi mới nhất. Vui lòng rà soát lại thông tin cấu hình sản phẩm xuất xưởng!
            </p>
          </div>
        </div>
      )}

      {/* Status Banner */}
      {!isCompleted ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col items-start gap-4">
          <div className="flex gap-3">
            <Truck className="text-amber-700 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-amber-900 text-xs text-left">Đang chờ giao hàng</h4>
              <p className="text-amber-750 text-2xs text-left mt-0.5">Dự kiến giao: <strong className="font-mono">{formatDate(drawerDelivery.ngayGiaoMay) || 'TBD'}</strong></p>
            </div>
          </div>
          <Button aria-label="Hoàn tất giao hàng" disabled={!onMarkDelivered} onClick={() => onMarkDelivered && onMarkDelivered(drawerDelivery)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-black rounded-lg shadow-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed">
            Hoàn tất giao hàng
          </Button>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col items-start gap-4">
          <div className="flex gap-3 items-center">
            <CheckCircle2 className="text-emerald-700 shrink-0" size={24} />
            <div>
              <h4 className="font-bold text-emerald-900 text-xs text-left">Giao hàng thành công</h4>
              <p className="text-emerald-700 text-2xs text-left mt-0.5">Ngày giao thực tế: <strong className="font-mono">{formatDate(drawerDelivery.ngayGiaoThucTe)}</strong></p>
            </div>
          </div>
        </div>
      )}

      {/* Reference Links Detailed Layout */}
      <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl grid grid-cols-2 gap-y-4 gap-x-2">
         <div>
            <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-1">Mã hóa đơn / PX</div>
            <div className="flex flex-col">
               <span className="font-mono font-bold text-sm text-slate-900 mb-0.5 truncate">{drawerDelivery.deliveryId || '---'}</span>
               <span className="text-2xs font-mono text-slate-500 truncate" title={drawerDelivery.soPhieuXuat}>PX: {drawerDelivery.soPhieuXuat || '---'}</span>
            </div>
         </div>
         <div>
            <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-1">Hợp đồng / Báo giá</div>
            <div className="flex flex-col">
               <span className="font-mono font-bold text-sm text-emerald-700 mb-0.5 truncate">{drawerDelivery.soHopDong || 'Không HĐ'}</span>
               <span className="text-2xs font-mono text-amber-600 truncate" title={drawerQuotation?.soPhieuBaoGia || 'Không báo giá'}>{drawerQuotation?.soPhieuBaoGia ? `BG: ${drawerQuotation.soPhieuBaoGia}` : (drawerDelivery.quotationId ? 'Tồn tại BG' : 'Không BG')}</span>
            </div>
         </div>
         <div className="col-span-2 pt-3 border-t border-slate-100">
            <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-1">Đơn hàng / Khách hàng</div>
            <div className="flex flex-col min-w-0">
               <span className="font-mono text-2xs text-slate-500 mb-0.5 truncate">{drawerDelivery.soDonHang ? `DH: #${drawerDelivery.soDonHang}` : 'Không ĐH'}</span>
               <span className="text-sm text-blue-700 font-bold truncate" title={drawerDelivery.tenKhachHang}>{drawerDelivery.tenKhachHang || 'N/A'}</span>
            </div>
         </div>
         {drawerDelivery.paymentId && (
            <div className="col-span-2 pt-3 border-t border-slate-100">
               <PaymentHoverCard
                  payment={paymentDoc || { id: drawerDelivery.paymentId, customerId: drawerDelivery.customerId, tenKhachHang: drawerDelivery.tenKhachHang } as any}
                  contracts={drawerContract ? [drawerContract] : []}
                  quotations={drawerQuotation ? [drawerQuotation] : []}
                  deliveries={[drawerDelivery]}
               >
                  <div className="p-4 bg-white border border-slate-150 hover:border-emerald-400 transition-colors rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.01)] group cursor-pointer text-left">
                     <div className="text-2xs text-slate-550 mb-1.5 uppercase font-bold tracking-wider flex items-center justify-between">
                        <span>Tham chiếu thanh toán</span>
                        <span className="text-3xs text-emerald-600 lowercase font-medium group-hover:underline">Di chuột xem chi tiết thanh toán</span>
                     </div>
                     <div className="font-mono font-extrabold text-emerald-600 text-xs">{getEntityDisplayLabel('payment', paymentDoc)}</div>
                  </div>
               </PaymentHoverCard>
            </div>
         )}
      </div>

      {/* Overview Stack */}
      <div className="flex flex-col gap-3">
        <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl flex items-start gap-3">
          <div className="p-2.5 bg-brand-50 text-brand-600 rounded-lg shrink-0"><MapPin size={16} /></div>
          <div className="min-w-0">
            <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Địa chỉ vận chuyển (Smart)</div>
            <div className="font-semibold text-slate-900 text-xs leading-relaxed" title={smartAddress}>{smartAddress}</div>
          </div>
        </div>
        <div className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl flex items-start gap-3">
          <div className="p-2.5 bg-orange-50 text-orange-600 rounded-lg shrink-0"><Truck size={16} /></div>
          <div className="min-w-0">
            <div className="text-2xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Đơn vị vận hành tải</div>
            <div className="font-semibold text-slate-900 text-xs truncate" title={drawerDelivery.donViVanChuyen}>{drawerDelivery.donViVanChuyen || 'N/A'}</div>
          </div>
        </div>
      </div>


      
      {/* Detail List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 bg-white border border-slate-200 shadow-sm rounded-xl text-xs font-semibold">
        <div>
          <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Người Phụ Trách</span> 
          <span className="font-extrabold text-slate-800 mt-1 block text-left">{drawerDelivery.nguoiPhuTrach || '---'}</span>
        </div>
        <div>
          <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Trạng thái ZNS SGM</span> 
          <div className="mt-1 flex justify-start"><StatusPill statusStr={drawerDelivery.trangThaiGuiTinGiaoHang as any} /></div>
        </div>

        <div className="col-span-1 sm:col-span-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Ngày lập phiếu</span> 
            <span className="font-bold font-mono text-slate-800 mt-1 block text-left">
              {drawerDelivery.ngayLapPgh ? formatDate(drawerDelivery.ngayLapPgh) : (drawerDelivery as any).createdAt ? formatDate((drawerDelivery as any).createdAt) : '---'}
            </span>
          </div>
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Ngày dự kiến giao</span> 
            <span className="font-bold font-mono text-amber-700 mt-1 block text-left">
              {drawerDelivery.ngayGiaoMay ? formatDate(drawerDelivery.ngayGiaoMay) : '---'}
            </span>
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 pt-3 border-t border-slate-100 grid grid-cols-2 gap-4">
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Ngày xác nhận giao</span> 
            <span className="font-bold font-mono text-emerald-800 mt-1 block text-left">
              {drawerDelivery.ngayGiaoThucTe ? formatDate(drawerDelivery.ngayGiaoThucTe) : <span className="text-slate-400 italic font-sans font-normal">Chưa xác nhận giao</span>}
            </span>
          </div>
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Người xác nhận - Nhận hàng</span> 
            <span className="font-bold text-slate-800 mt-1 block text-left">
              {drawerDelivery.kyNhan || <span className="text-slate-400 italic font-sans font-normal">Chưa ký nhận</span>}
            </span>
          </div>
        </div>

        <div className="col-span-1 sm:col-span-2 pt-3 border-t border-slate-100">
          <div>
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider flex items-center gap-1.5"><Phone size={12}/> SĐT Vận Chuyển / Tài xế</span> 
            <span className="font-bold font-mono text-slate-850 mt-1 block text-left">{drawerDelivery.soDienThoaiDonViVanChuyen || '---'}</span>
          </div>
        </div>

        {drawerDelivery.danhSachMaMay && drawerDelivery.danhSachMaMay.length > 0 && (
          <div className="col-span-1 sm:col-span-2 pt-3 border-t border-slate-100">
            <span className="text-2xs text-slate-500 block uppercase font-bold tracking-wider">Danh sách Serial máy cấu hình</span> 
            <div className="flex flex-wrap gap-1.5 mt-2 justify-start">
              {drawerDelivery.danhSachMaMay.map((serial, idx) => (
                <span key={idx} className="font-mono text-2xs font-black uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-150">{serial}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Thông tin xuất kho ERP */}
      <div className="p-4 bg-blue-50/40 border border-blue-200/60 rounded-xl space-y-3">
        <div className="flex items-center justify-between border-b border-blue-100 pb-2">
          <span className="text-2xs font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
            <Package size={14} /> CĂN CỨ XUẤT KHO ERP
          </span>
          {drawerDelivery.soPhieuXuat && (
            <span className="font-mono text-2xs font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
              {drawerDelivery.soPhieuXuat}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Kế toán kho</span>
            <span className="font-bold text-slate-900">{drawerDelivery.keToanKho || '---'}</span>
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Kho xuất</span>
            <span className="font-bold text-slate-900">{drawerDelivery.khoXuat || '---'}</span>
          </div>
          <div>
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Ngày tạo phiếu xuất</span>
            <span className="font-mono font-bold text-slate-900">{drawerDelivery.ngayTaoPhieuXuat ? formatDate(drawerDelivery.ngayTaoPhieuXuat) : '---'}</span>
          </div>
        </div>
        {(drawerDelivery.ghiChuNoiBo || drawerDelivery.ghiChu) && (
          <div className="pt-2 border-t border-blue-100/60 text-xs">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Ghi chú xuất kho (Nội bộ)</span>
            <p className="text-slate-700 text-xs leading-relaxed italic bg-white/70 p-2.5 rounded-lg border border-blue-100/80">
              {drawerDelivery.ghiChuNoiBo || drawerDelivery.ghiChu}
            </p>
          </div>
        )}
      </div>
      
      {/* Products Check */}
      <div>
        <h3 className="text-xs font-black text-slate-600 mb-3 flex items-center gap-2 uppercase tracking-widest pl-1 header-text">
          <Package size={14} className="text-slate-600" />
          Sản phẩm bàn giao ({drawerDelivery?.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || drawerDelivery?.slMay || 0} SP)
        </h3>
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in shadow-[0_1px_2px_rgba(15,23,42,0.02)] p-4">
          {drawerDelivery?.products?.length ? (
            <DrawerProductList 
               products={drawerDelivery.products}
               subTotal={drawerDelivery.subTotal}
               discountRate={drawerDelivery.discountRate}
               discountAmount={drawerDelivery.discountAmount}
               vatRate={drawerDelivery.vatRate}
               vatAmount={drawerDelivery.vatAmount}
               totalAmount={drawerDelivery.totalAmount}
               accentColorClass="text-blue-700"
            />
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500 font-medium bg-slate-50 rounded-xl">Không có cấu trúc sản phẩm chi tiết.</div>
          )}
        </div>
      </div>
      
      {/* Notes */}
      {drawerDelivery.ghiChu && (
        <div>
          <h3 className="text-2xs font-bold text-slate-500 mb-2 uppercase tracking-wider flex items-center gap-1"><FileText size={12}/> Ghi chú lúc giao</h3>
          <p className="text-xs text-slate-700 bg-amber-500/5 p-4 border border-amber-100 rounded-xl leading-relaxed whitespace-pre-wrap text-left font-semibold">{drawerDelivery.ghiChu}</p>
        </div>
      )}
    </div>
  );

  // 2. HOẠT ĐỘNG TIMELINE PANEL
  const timelinePanel = <TabLichSuHoatDong entityId={drawerDelivery.id || ""} entityType="delivery" />;

  // 3. ZNS OA PANEL
  const znsPanel = <TabLichSuZNS entityId={drawerDelivery.id || ""} entityType="delivery" />;

  // 4. LIÊN KẾT PANEL
  const linksPanel = <TabLienKet entityId={drawerDelivery.id || ""} entityType="delivery" />;

  // 5. AUDIT PANEL
  const auditPanel = <TabLichSuHeThong entityId={drawerDelivery.id || ""} entityType="delivery" />;

  return (
    <>
      <DetailDrawer
        isOpen={!!drawerDelivery}
        onClose={onClose}
        modal={modal}
        className={className}
        title={`XUẤT KHO VẬN CHUYỂN: ${drawerDelivery.soPhieuXuat || 'N/A'}`}
        subTitle={
          <div className="flex items-center gap-2">
            <span className="font-mono">{drawerDelivery.deliveryId}</span>
            •
            <span className="text-slate-600">HĐ: {drawerDelivery.soHopDong || 'N/A'}</span>
            •
            <span className="text-slate-600">ĐH: {drawerDelivery.soDonHang || 'N/A'}</span>
          </div>
        }
        entityId={drawerDelivery.id || ''}
        entityType="delivery"
        icon={<Package size={16} />}
        size="screen"
        tabs={customTabsList}
        footer={
          <div className="flex justify-end w-full">
            <div className="flex gap-2 items-center">
              <Button aria-label="Đóng" variant="secondary" size="sm" onClick={onClose} className="h-9 font-bold">Đóng</Button>
              
              <div className="relative group">
                <Button aria-label="Gửi ZNS" variant="subtle" size="sm" className="h-9 font-bold flex items-center justify-center gap-1.5" leftIcon={<Send size={14} />}>
                  Gửi tin Zalo
                </Button>
                {/* Dropdown Options overlay for sending specific ZNS */}
                <div className="absolute right-0 bottom-full mb-1.5 hidden group-hover:block hover:block bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 w-60 z-30 animate-in fade-in slide-in-from-bottom-2">
                  <Button 
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSendZns(drawerDelivery, 'GIAOHANG_ZNS')}
                    className="w-full justify-start text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2"
                  >
                    <Send size={12} className="text-amber-600" />
                    Cập Nhật Lộ Trình (GIAOHANG_ZNS)
                  </Button>
                  <Button 
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSendZns(drawerDelivery, 'GIAOHANG_HOANTAT')}
                    className="w-full justify-start text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-2 border-t border-slate-100"
                  >
                    <Send size={12} className="text-emerald-600" />
                    Gửi Hoàn Tất (GIAOHANG_HOANTAT)
                  </Button>
                </div>
              </div>

              <Button aria-label="Chỉnh sửa" variant="dark" size="sm" onClick={() => { onEdit(drawerDelivery); onClose(); }} className="h-9 font-bold">Chỉnh sửa</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {activeTab === 'overview' && overviewPanel}
          {activeTab === 'activity' && timelinePanel}
          {activeTab === 'links' && linksPanel}
          {activeTab === 'zns' && znsPanel}
          {activeTab === 'audit' && auditPanel}
        </div>
      </DetailDrawer>
      {completingDelivery && onCompleteDeliverySubmit && setCompletingDelivery && (
        <CompleteDeliveryModal
          delivery={completingDelivery}
          onClose={() => setCompletingDelivery(null)}
          onSave={onCompleteDeliverySubmit}
        />
      )}
    </>
  );
}
