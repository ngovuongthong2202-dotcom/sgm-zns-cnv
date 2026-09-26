/* eslint-disable max-lines */
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import { formatDate } from '@/src/shared/utils/formatDate';
import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { swrDocFetcher } from '@/src/data/swr-fetchers';
import { PaymentHoverCard } from '@/src/modules/billing/ui/components/PaymentHoverCard';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { DetailDrawer } from '@/src/design-system/DetailDrawer';
import { Truck, MapPin, Package, Phone, FileText, CheckCircle2, AlertTriangle, Send, User, ShieldCheck, Clock, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { TabLichSuZNS } from "@/src/widgets/TabLichSuZNS";
import { TabLichSuHoatDong } from "@/src/widgets/TabLichSuHoatDong";
import { TabLichSuHeThong } from "@/src/widgets/TabLichSuHeThong";
import { TabLienKet } from "@/src/widgets/TabLienKet";
import { WorkflowTimeline } from '@/src/widgets/WorkflowTimeline';
import { DrawerProductList } from '@/src/widgets/DrawerProductList';

import { Button } from '@/src/design-system/Button';

interface DeliveryDetailDrawerProps {
  drawerDelivery: Delivery | null;
  onClose: () => void;
  onEdit: (delivery: Delivery) => void;
  onMarkDelivered?: (delivery: Delivery) => void;
  onRevertDelivered?: (delivery: Delivery) => Promise<void>;
  onViewConfirmation?: (delivery: Delivery) => void;
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
  onRevertDelivered,
  onViewConfirmation,
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
  const [showMismatchDetails, setShowMismatchDetails] = useState(false);

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

  const mismatchDiffList = useMemo(() => {
    if (!drawerDelivery || !drawerContract) return [];
    const contractProducts = drawerContract.products || [];
    const deliveryProducts = drawerDelivery.products || [];

    const diffMap = new Map<string, { name: string; model?: string; contractQty: number; deliveryQty: number }>();

    contractProducts.forEach((cp: any, idx: number) => {
      const key = cp.productId || cp.productName || `c_${idx}`;
      diffMap.set(key, {
        name: cp.productName || 'Sản phẩm',
        model: cp.productId || '',
        contractQty: Number(cp.quantity) || 0,
        deliveryQty: 0,
      });
    });

    deliveryProducts.forEach((dp: any, idx: number) => {
      const key = dp.productId || dp.productName || `d_${idx}`;
      const existing = diffMap.get(key);
      if (existing) {
        existing.deliveryQty = Number(dp.quantity) || 0;
      } else {
        diffMap.set(key, {
          name: dp.productName || 'Sản phẩm ngoài hợp đồng',
          model: dp.productId || '',
          contractQty: 0,
          deliveryQty: Number(dp.quantity) || 0,
        });
      }
    });

    return Array.from(diffMap.values());
  }, [drawerDelivery, drawerContract]);

  if (!drawerDelivery) return null;

  // 1. TỔNG QUAN PANEL (OMNI-NEXUS COD 11.0: 70% Left Logistics Matrix / 30% Right Inspector)
  const overviewPanel = (
    <div className="space-y-5 pt-1">
      {/* Workflow Progress Display */}
      {drawerQuotation && (
        <WorkflowTimeline 
          quotation={drawerQuotation}
          contracts={drawerContract ? [drawerContract] : []}
          payments={paymentDoc ? [paymentDoc] : []}
          deliveries={[drawerDelivery]}
          className="shadow-2xs border border-slate-200/80 rounded-xl"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ===================== CỘT TRỌNG TÂM (70%): LOGISTICS & FULFILLMENT MATRIX ===================== */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Cảnh báo cấu hình máy lệch nếu có */}
          {isMismatch && (
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle className="text-amber-700 shrink-0" size={18} />
                  <div>
                    <h4 className="font-bold text-amber-900 text-xs">Cảnh báo</h4>
                    <p className="text-amber-800 text-3xs mt-0.5">
                      Phát hiện chênh lệch danh mục / số lượng sản phẩm so với hợp đồng ({drawerContract?.soHopDong || 'liên kết'})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMismatchDetails(!showMismatchDetails)}
                  className="text-3xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  {showMismatchDetails ? (
                    <>
                      <span>Thu gọn</span>
                      <ChevronUp size={13} />
                    </>
                  ) : (
                    <>
                      <span>Mở chi tiết cảnh báo</span>
                      <ChevronDown size={13} />
                    </>
                  )}
                </button>
              </div>

              {showMismatchDetails && (
                <div className="pt-2 border-t border-amber-200/80 space-y-2">
                  <p className="text-amber-900 text-2xs leading-relaxed">
                    Bảng đối chiếu cấu hình sản phẩm giữa Hợp đồng và Phiếu giao hàng:
                  </p>
                  <div className="border border-amber-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <table className="w-full text-left text-2xs">
                      <thead className="bg-amber-100/70 text-amber-950 font-bold border-b border-amber-200 text-3xs uppercase tracking-wider">
                        <tr>
                          <th className="p-2 px-3">Sản phẩm / Model</th>
                          <th className="p-2 px-3 text-center w-28">SL Hợp đồng</th>
                          <th className="p-2 px-3 text-center w-28">SL Giao lần này</th>
                          <th className="p-2 px-3 text-center w-36">Chênh lệch</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100">
                        {mismatchDiffList.map((item, idx) => {
                          const diff = item.deliveryQty - item.contractQty;
                          return (
                            <tr key={idx} className="hover:bg-amber-50/50">
                              <td className="p-2 px-3 font-medium text-slate-800">
                                <span>{item.name}</span>
                                {item.model && <span className="font-mono text-slate-400 text-3xs block">{item.model}</span>}
                              </td>
                              <td className="p-2 px-3 text-center font-mono font-semibold text-slate-700">
                                {item.contractQty}
                              </td>
                              <td className="p-2 px-3 text-center font-mono font-bold text-slate-900">
                                {item.deliveryQty}
                              </td>
                              <td className="p-2 px-3 text-center">
                                {diff === 0 ? (
                                  <span className="text-3xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    Khớp 100%
                                  </span>
                                ) : diff < 0 ? (
                                  <span className="text-3xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                    Thiếu {Math.abs(diff)} cái
                                  </span>
                                ) : item.contractQty === 0 ? (
                                  <span className="text-3xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                    Ngoài HĐ (+{item.deliveryQty})
                                  </span>
                                ) : (
                                  <span className="text-3xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                    Vượt +{diff} cái
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Khối 1: Logistics Command Banner */}
          {!isCompleted ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-3">
                <div className="p-2.5 bg-amber-100 text-amber-800 rounded-xl shrink-0">
                  <Truck size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-xs">Đang chờ giao hàng & Bàn giao thực tế</h4>
                  <p className="text-amber-800 text-2xs mt-0.5">
                    Hạn dự kiến giao: <strong className="font-mono text-amber-950 font-bold">{formatDate(drawerDelivery.ngayGiaoMay) || 'Chưa xác định'}</strong>
                  </p>
                </div>
              </div>
              <Button 
                aria-label="Hoàn tất giao hàng" 
                disabled={!onMarkDelivered} 
                onClick={() => onMarkDelivered && onMarkDelivered(drawerDelivery)} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-xs font-black rounded-lg shadow-sm h-9 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                Hoàn tất giao hàng
              </Button>
            </div>
          ) : (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex gap-3 items-center min-w-0">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-emerald-900 text-sm">Giao hàng thành công</h4>
                    <span className="text-3xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                      Đã bàn giao
                    </span>
                  </div>
                  <p className="text-emerald-700 text-xs mt-0.5">
                    Ngày giao thực tế: <strong className="font-mono text-emerald-900">{formatDate(drawerDelivery.ngayGiaoThucTe)}</strong>
                    {drawerDelivery.kyNhan && <> • Người nhận: <strong className="text-emerald-900">{drawerDelivery.kyNhan}</strong></>}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => onViewConfirmation && onViewConfirmation(drawerDelivery)}
                  className="bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold h-8.5 px-3 flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <FileText size={13} className="text-emerald-600" />
                  Xem biên bản
                </Button>
                {onRevertDelivered && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onRevertDelivered(drawerDelivery)}
                    className="bg-white hover:bg-red-50 text-red-700 hover:text-red-800 border-red-200 text-xs font-bold h-8.5 px-3 flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                    title="Hủy/xóa thông tin xác nhận giao hàng và đưa về trạng thái Đang giao"
                  >
                    <RotateCcw size={13} className="text-red-600" />
                    Hủy xác nhận
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Khối 2: Căn cứ xuất kho ERP & Kế toán kho */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2">
                <Package size={14} className="text-blue-600" />
                CĂN CỨ XUẤT KHO ERP & QUẢN TRỊ KHO BÃI
              </span>
              {drawerDelivery.soPhieuXuat && (
                <span className="font-mono text-2xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {drawerDelivery.soPhieuXuat}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Kế toán kho</span>
                <span className="font-bold text-slate-900">{drawerDelivery.keToanKho || '---'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Kho xuất hàng</span>
                <span className="font-bold text-slate-900">{drawerDelivery.khoXuat || '---'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Ngày lập phiếu xuất</span>
                <span className="font-mono font-bold text-slate-900">
                  {drawerDelivery.ngayTaoPhieuXuat ? formatDate(drawerDelivery.ngayTaoPhieuXuat) : (drawerDelivery.ngayLapPgh ? formatDate(drawerDelivery.ngayLapPgh) : '---')}
                </span>
              </div>
            </div>

            {(drawerDelivery.ghiChuNoiBo || drawerDelivery.ghiChu) && (
              <div className="pt-2 text-xs">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Ghi chú điều phối kho & vận chuyển</span>
                <p className="text-slate-700 text-xs leading-relaxed italic bg-slate-50 p-3 rounded-lg border border-slate-150">
                  {drawerDelivery.ghiChuNoiBo || drawerDelivery.ghiChu}
                </p>
              </div>
            )}
          </section>

          {/* Khối 3: Sản phẩm bàn giao chi tiết & Cấu hình máy */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-blue-600" />
                SẢN PHẨM BÀN GIAO THỰC TẾ
              </h3>
              <span className="font-mono text-3xs font-bold bg-blue-50 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                {drawerDelivery?.products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || drawerDelivery?.slMay || 0} sản phẩm
              </span>
            </div>

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
              <div className="px-4 py-8 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Phiếu giao tổng hợp (Không có danh mục sản phẩm lẻ).
              </div>
            )}

            {/* Serial chips */}
            {drawerDelivery.danhSachMaMay && drawerDelivery.danhSachMaMay.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-2">Danh sách Serial máy xuất xưởng</span>
                <div className="flex flex-wrap gap-1.5">
                  {drawerDelivery.danhSachMaMay.map((serial, idx) => (
                    <span key={idx} className="font-mono text-2xs font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      {serial}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* ===================== CỘT VỆ TINH (30%): INTELLIGENCE INSPECTOR ===================== */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Thẻ 1: Khách hàng & Nơi nhận */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Khách hàng & Nơi nhận
            </h4>

            <div>
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Khách hàng nhận hàng</span>
              <p className="font-bold text-slate-900 text-sm leading-snug line-clamp-2" title={drawerDelivery.tenKhachHang}>
                {drawerDelivery.tenKhachHang || '---'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1.5 flex items-center gap-1">
                <MapPin size={11} className="text-blue-600" /> Địa chỉ giao nhận chi tiết
              </span>
              <p className="font-medium text-slate-800 text-xs leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-150">
                {(drawerDelivery as any).diaChiGiaoHang || (drawerDelivery as any).diaChi || smartAddress}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Người nhận liên hệ</span>
              <p className="font-bold text-slate-900 text-xs">
                {(drawerDelivery as any).nguoiLienHe || drawerDelivery.nguoiDaiDien || drawerDelivery.tenKhachHang || '---'}
              </p>
              <p className="font-mono text-2xs text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                <Phone size={11} className="text-slate-400" />
                {(drawerDelivery as any).sdtLienHe || drawerDelivery.sdt || 'Chưa có SĐT'}
              </p>
            </div>
          </section>

          {/* Thẻ 2: Vận chuyển & Điều phối */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Vận chuyển & Điều phối
            </h4>

            <div>
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Đơn vị vận chuyển</span>
              <p className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Truck size={13} className="text-amber-600" />
                {drawerDelivery.donViVanChuyen || 'Nội bộ vận chuyển'}
              </p>
              <p className="font-mono text-2xs text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                <Phone size={11} className="text-slate-400" />
                {drawerDelivery.soDienThoaiDonViVanChuyen ? `Hotline: ${drawerDelivery.soDienThoaiDonViVanChuyen}` : 'Chưa có SĐT lái xe'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-3xs uppercase font-bold text-slate-400 block mb-1">Chuyên viên phụ trách</span>
              <p className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <User size={12} className="text-slate-400" />
                {drawerDelivery.nguoiPhuTrach || '---'}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-3xs uppercase font-bold text-slate-400">Trạng thái ZNS SGM</span>
              <StatusPill statusStr={drawerDelivery.trangThaiGuiTinGiaoHang as any} />
            </div>
          </section>

          {/* Thẻ 3: Hồ sơ đối chiếu */}
          <section className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
            <h4 className="text-2xs font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2">
              Hồ sơ đối chiếu
            </h4>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Hợp đồng</span>
                <span className="font-mono font-bold text-emerald-700 text-xs truncate block" title={drawerDelivery.soHopDong}>
                  {drawerDelivery.soHopDong || 'Không HĐ'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-150">
                <span className="text-3xs uppercase font-bold text-slate-400 block mb-0.5">Báo giá</span>
                <span className="font-mono font-bold text-blue-700 text-xs truncate block" title={drawerQuotation?.soPhieuBaoGia}>
                  {drawerQuotation?.soPhieuBaoGia || 'Không BG'}
                </span>
              </div>
            </div>

            {drawerDelivery.paymentId && (
              <div className="pt-2 border-t border-slate-100">
                <PaymentHoverCard
                  payment={paymentDoc || { id: drawerDelivery.paymentId, customerId: drawerDelivery.customerId, tenKhachHang: drawerDelivery.tenKhachHang } as any}
                  contracts={drawerContract ? [drawerContract] : []}
                  quotations={drawerQuotation ? [drawerQuotation] : []}
                  deliveries={[drawerDelivery]}
                >
                  <div className="p-3 bg-emerald-50/50 border border-emerald-200 hover:border-emerald-400 transition-colors rounded-xl group cursor-pointer text-left">
                    <div className="text-3xs text-emerald-800 uppercase font-bold tracking-wider flex items-center justify-between mb-1">
                      <span>Chứng từ thanh toán</span>
                      <span className="text-3xs text-emerald-600 lowercase font-medium group-hover:underline">Chi tiết ↗</span>
                    </div>
                    <div className="font-mono font-bold text-emerald-800 text-xs truncate">
                      {getEntityDisplayLabel('payment', paymentDoc)}
                    </div>
                  </div>
                </PaymentHoverCard>
              </div>
            )}
          </section>

          {/* Thẻ 4: Đặc cách Ban Giám Đốc nếu có */}
          {drawerDelivery.dacCachGiaoTruoc && (
            <section className="p-4 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2 shadow-xs">
              <div className="flex items-center gap-1.5 text-amber-900 font-black text-2xs uppercase tracking-wider">
                <span>⚡</span> ĐẶC CÁCH BAN GIÁM ĐỐC
              </div>
              <p className="text-2xs text-amber-800 font-medium leading-relaxed">
                {drawerDelivery.lyDoDacCach || 'Đơn hàng được phê duyệt xuất kho trước và đôn đốc thanh toán sau khi bàn giao nghiệm thu.'}
              </p>
              {drawerDelivery.nguoiPheDuyetDacCach && (
                <div className="text-3xs text-amber-700 font-bold uppercase pt-1 border-t border-amber-200/60">
                  Phê duyệt: {drawerDelivery.nguoiPheDuyetDacCach}
                </div>
              )}
            </section>
          )}

        </div>
      </div>
    </div>
  );

  // 2. HOẠT ĐỘNG TIMELINE PANEL (Lộ trình hành trình giao nhận thực tế + Lịch sử tương tác CRM)
  const timelinePanel = (
    <div className="space-y-6 pt-2">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Truck size={14} className="text-blue-600" />
          Tiến trình & Lộ trình giao nhận thực tế
        </h3>

        <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {/* Mốc 1: Khởi tạo phiếu & liên kết */}
          <div className="relative group">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Khởi tạo phiếu giao hàng: {drawerDelivery.deliveryId}</span>
                <span className="text-2xs font-mono text-slate-500">
                  {drawerDelivery.ngayLapPgh ? formatDate(drawerDelivery.ngayLapPgh) : ((drawerDelivery as any).createdAt ? formatDate((drawerDelivery as any).createdAt) : '---')}
                </span>
              </div>
              <p className="text-2xs text-slate-600">
                Người phụ trách: <strong>{drawerDelivery.nguoiPhuTrach || '---'}</strong> • Khách hàng: <strong>{drawerDelivery.tenKhachHang || '---'}</strong>
              </p>
              <div className="flex gap-2 mt-2">
                {drawerDelivery.soHopDong && (
                  <span className="text-3xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    HĐ: {drawerDelivery.soHopDong}
                  </span>
                )}
                {drawerDelivery.soDonHang && (
                  <span className="text-3xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                    ĐH: #{drawerDelivery.soDonHang}
                  </span>
                )}
                {drawerDelivery.paymentId && (
                  <span className="text-3xs font-mono bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded border border-emerald-200">
                    Đã liên kết thanh toán
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Mốc 2: Căn cứ xuất kho ERP */}
          <div className="relative group">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-amber-100 border-2 border-amber-600 flex items-center justify-center">
              <Package size={10} className="text-amber-700" />
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Căn cứ xuất kho ERP</span>
                <span className="text-2xs font-mono text-slate-500">
                  {drawerDelivery.ngayTaoPhieuXuat ? formatDate(drawerDelivery.ngayTaoPhieuXuat) : '---'}
                </span>
              </div>
              <p className="text-2xs text-slate-600">
                Số phiếu xuất: <strong className="font-mono text-blue-700">{drawerDelivery.soPhieuXuat || 'Chưa cập nhật'}</strong> • Kế toán kho: <strong>{drawerDelivery.keToanKho || '---'}</strong> • Kho xuất: <strong>{drawerDelivery.khoXuat || '---'}</strong>
              </p>
            </div>
          </div>

          {/* Mốc 3: Lộ trình vận chuyển */}
          <div className="relative group">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-blue-100 border-2 border-blue-600 flex items-center justify-center">
              <Truck size={10} className="text-blue-700" />
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">Kế hoạch vận chuyển & Giao nhận</span>
                <span className="text-2xs font-mono text-amber-700 font-bold">
                  Dự kiến: {drawerDelivery.ngayGiaoMay ? formatDate(drawerDelivery.ngayGiaoMay) : '---'}
                </span>
              </div>
              <p className="text-2xs text-slate-600">
                Đơn vị vận tải: <strong>{drawerDelivery.donViVanChuyen || 'Tự vận chuyển'}</strong> • SĐT: <span className="font-mono">{drawerDelivery.soDienThoaiDonViVanChuyen || '---'}</span>
              </p>
              <p className="text-2xs text-slate-600 mt-1">
                Người nhận: <strong>{(drawerDelivery as any).nguoiLienHe || drawerDelivery.nguoiDaiDien || drawerDelivery.tenKhachHang}</strong> • SĐT: <strong className="font-mono">{(drawerDelivery as any).sdtLienHe || drawerDelivery.sdt || '---'}</strong>
              </p>
              <p className="text-2xs text-slate-600 mt-1">
                Địa chỉ giao: <strong>{(drawerDelivery as any).diaChiGiaoHang || (drawerDelivery as any).diaChi || smartAddress}</strong>
              </p>
            </div>
          </div>

          {/* Mốc 4: Tương tác ZNS */}
          <div className="relative group">
            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-cyan-100 border-2 border-cyan-600 flex items-center justify-center">
              <Send size={10} className="text-cyan-700" />
            </div>
            <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">Thông báo tiến độ qua Zalo ZNS</span>
                <span className="text-2xs text-slate-500">Mẫu: GIAOHANG_ZNS / GIAOHANG_HOANTAT</span>
              </div>
              <div>
                <StatusPill statusStr={drawerDelivery.trangThaiGuiTinGiaoHang as any} />
              </div>
            </div>
          </div>

          {/* Mốc 5: Bàn giao thực tế */}
          <div className="relative group">
            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
              isCompleted ? 'bg-emerald-100 border-emerald-600' : 'bg-slate-100 border-slate-300'
            }`}>
              {isCompleted ? <CheckCircle2 size={12} className="text-emerald-700" /> : <Clock size={10} className="text-slate-400" />}
            </div>
            <div className={`border rounded-lg p-3 ${isCompleted ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold ${isCompleted ? 'text-emerald-900' : 'text-slate-700'}`}>
                  {isCompleted ? 'Bàn giao thực tế hoàn tất' : 'Chờ xác nhận bàn giao thực tế'}
                </span>
                <span className="text-2xs font-mono text-slate-600">
                  {drawerDelivery.ngayGiaoThucTe ? formatDate(drawerDelivery.ngayGiaoThucTe) : 'Chưa giao'}
                </span>
              </div>
              {isCompleted ? (
                <p className="text-2xs text-emerald-800">
                  Người ký nhận: <strong>{drawerDelivery.kyNhan || 'Đã ký nhận'}</strong>
                  {drawerDelivery.ghiChu && <span className="block mt-1 italic">Ghi chú: {drawerDelivery.ghiChu}</span>}
                </p>
              ) : (
                <p className="text-2xs text-slate-500 italic">
                  Chưa ghi nhận ngày giao thực tế từ người phụ trách hoặc đối tác vận chuyển.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <TabLichSuHoatDong entityId={drawerDelivery.id || ""} entityType="delivery" />
    </div>
  );

  // 3. ZNS OA PANEL
  const znsPanel = <TabLichSuZNS entityId={drawerDelivery.id || ""} entityType="delivery" />;

  // 4. LIÊN KẾT PANEL
  const linksPanel = <TabLienKet entityId={drawerDelivery.id || ""} entityType="delivery" />;

  // 5. AUDIT PANEL (Nhật ký hệ thống)
  const auditPanel = (
    <div className="space-y-4 pt-2">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          Hồ sơ kiểm toán chứng từ (System Audit Metadata)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Mã hồ sơ hệ thống</span>
            <span className="font-mono text-2xs font-bold text-slate-800 select-all">{drawerDelivery.id || '---'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Số hiệu phiếu giao</span>
            <span className="font-mono text-2xs font-bold text-blue-700">{drawerDelivery.deliveryId || '---'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Người lập / Phụ trách</span>
            <span className="font-semibold text-slate-800">{drawerDelivery.nguoiPhuTrach || '---'}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Trạng thái hồ sơ</span>
            <span className={`font-bold ${isCompleted ? 'text-emerald-700' : 'text-blue-700'}`}>
              {isCompleted ? 'Đã hoàn tất bàn giao' : 'Đang xử lý giao hàng'}
            </span>
          </div>
        </div>
      </div>

      <TabLichSuHeThong entityId={drawerDelivery.id || ""} entityType="delivery" />
    </div>
  );

  // Horizon HUD (Top Status Pulse)
  const horizonHud = (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-3">
        <span className="font-mono font-black text-blue-900 bg-white px-2.5 py-1 rounded-md border border-blue-200 shadow-2xs">
          {drawerDelivery.deliveryId || drawerDelivery.soPhieuXuat || 'N/A'}
        </span>
        <span className={`px-2 py-0.5 rounded text-3xs font-bold border ${
          isCompleted 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          {isCompleted ? '✓ Đã bàn giao' : 'Đang giao hàng'}
        </span>
        {drawerDelivery.soHopDong && (
          <span className="font-mono text-3xs font-semibold text-slate-700 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
            HĐ: {drawerDelivery.soHopDong}
          </span>
        )}
        {drawerDelivery.soPhieuXuat && (
          <span className="font-mono text-3xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            PX: {drawerDelivery.soPhieuXuat}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-3xs text-slate-500 uppercase font-bold">Dự kiến giao:</span>
          <span className="font-mono font-bold text-amber-800">
            {drawerDelivery.ngayGiaoMay ? formatDate(drawerDelivery.ngayGiaoMay) : '---'}
          </span>
        </div>
        {drawerDelivery.ngayGiaoThucTe && (
          <>
            <div className="h-3.5 w-px bg-slate-200 hidden sm:block" />
            <div className="flex items-center gap-1.5">
              <span className="text-3xs text-slate-500 uppercase font-bold">Thực giao:</span>
              <span className="font-mono font-bold text-emerald-800">
                {formatDate(drawerDelivery.ngayGiaoThucTe)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
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
      size="studio"
      horizonHud={horizonHud}
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
  );
}
