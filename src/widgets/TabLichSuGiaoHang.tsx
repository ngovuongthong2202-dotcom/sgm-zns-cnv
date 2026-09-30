import React from "react";
import { Button } from "@/src/design-system/Button";
import { Delivery } from "@/src/domain/schema/delivery.schema";
import { formatDate } from "@/src/shared/utils/formatDate";
import { Truck, Calendar, CheckCircle2, Clock, Package, ExternalLink, User } from "lucide-react";
import { useDrawerStack } from "@/src/contexts/DrawerStackContext";
import { resolveDeliveryVoucherMeta } from "@/src/shared/utils/voucherResolver";

interface TabLichSuGiaoHangProps {
  matchingDeliveries: Partial<Delivery>[];
  showCreateButton?: boolean;
  onNavigateNew?: () => void;
}

export function TabLichSuGiaoHang({ matchingDeliveries, showCreateButton, onNavigateNew }: TabLichSuGiaoHangProps) {
  const { openDrawer } = useDrawerStack();

  const handleOpenDelivery = (d: Partial<Delivery>) => {
    if (d.id) {
      openDrawer('delivery', d.id);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-cyan-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Hồ Sơ Xuất Kho & Giao Hàng ({matchingDeliveries.length})
          </h4>
        </div>
        {showCreateButton && (
          <Button 
            aria-label="Tạo phiếu mới" 
            variant="secondary" 
            onClick={onNavigateNew} 
            className="text-2xs font-bold py-1 px-3 h-7 bg-white hover:bg-cyan-50 text-cyan-700 border-cyan-200 shadow-2xs"
          >
            + Phiếu Giao Mới
          </Button>
        )}
      </div>

      <div className="space-y-3.5">
        {matchingDeliveries.map(d => {
          const meta = resolveDeliveryVoucherMeta(d);
          const isDelivered = meta.isDelivered;
          const products = (d as any).products || [];

          return (
            <div 
              key={d.id} 
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-cyan-400 hover:shadow-xs transition-all group"
            >
              {/* Header */}
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`p-1.5 rounded-lg ${isDelivered ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                    <Truck size={15} />
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-xs font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                      {meta.displayCode}
                    </span>
                    {meta.erpCode && (
                      <span className="font-mono text-xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-300" title="Số phiếu xuất ERP">
                        PXK: {meta.erpCode}
                      </span>
                    )}
                    {(d as any).tenKhachHang && (
                      <span className="text-2xs text-slate-500 block truncate max-w-xs">{(d as any).tenKhachHang}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    isDelivered ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {isDelivered ? 'Đã bàn giao' : 'Đang vận chuyển'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenDelivery(d)}
                    className="inline-flex items-center gap-1 text-3xs font-bold text-cyan-700 bg-white hover:bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Mở chi tiết</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>

              {/* Metrics & Dates */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Calendar size={12} className="text-blue-600" /> Ngày xuất kho
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                      {d.ngayTaoPhieuXuat ? formatDate(d.ngayTaoPhieuXuat) : ((d as any).createdAt ? formatDate((d as any).createdAt) : "—")}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Clock size={12} className="text-amber-600" /> Hạn dự kiến giao
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                      {d.ngayGiaoMay ? formatDate(d.ngayGiaoMay) : "—"}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600" /> Ngày giao thực tế
                    </span>
                    <span className={`font-mono font-bold text-xs mt-0.5 ${isDelivered ? 'text-emerald-700' : 'text-slate-400'}`}>
                      {d.ngayGiaoThucTe ? formatDate(d.ngayGiaoThucTe) : "Chưa hoàn tất"}
                    </span>
                  </div>
                </div>

                {/* Danh mục máy / thiết bị bàn giao trực diện 100% */}
                {products.length > 0 && (
                  <div className="border border-slate-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <div className="bg-slate-50/90 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-3xs font-bold uppercase text-slate-500 tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Package size={12} className="text-slate-400" /> Danh mục thiết bị bàn giao ({products.length})
                      </span>
                      <span>Số lượng & Model</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-2xs">
                      {products.map((p: any, pIdx: number) => (
                        <div key={pIdx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="min-w-0 pr-2">
                            <span className="font-bold text-slate-800 block truncate">{p.productName || p.tenSanPham || `Thiết bị #${pIdx + 1}`}</span>
                            {p.productId && (
                              <span className="font-mono text-3xs text-slate-400 block">{p.productId}</span>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono font-bold text-xs text-slate-900">
                              SL: {p.quantity || 1} máy
                            </span>
                            {p.serial && (
                              <span className="text-3xs font-mono text-slate-500 block">
                                S/N: {p.serial}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thông tin vận chuyển & Nhận hàng */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-3xs text-slate-500 border-t border-dashed border-slate-100">
                  {((d as any).donViVanChuyen || (d as any).taiXe) && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Truck size={12} className="text-slate-400 shrink-0" />
                      <span>ĐVVC: <strong className="text-slate-700">{(d as any).donViVanChuyen || 'Nội bộ'}</strong></span>
                      {(d as any).taiXe && (
                        <span>• Tài xế: <strong className="text-slate-700">{(d as any).taiXe}</strong></span>
                      )}
                    </div>
                  )}
                  {(d.kyNhan || (d as any).diaChiGiaoHang || (d as any).diaChi) && (
                    <div className="flex items-center gap-1.5 truncate">
                      <User size={12} className="text-slate-400 shrink-0" />
                      <span>Ký nhận: <strong className="text-slate-700">{d.kyNhan || 'Đang cập nhật'}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {matchingDeliveries.length === 0 && (
          <div className="text-center py-8 text-slate-500 italic text-xs bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <p>Chưa ghi nhận đợt xuất giao hàng nào cho hồ sơ này.</p>
            {showCreateButton && (
              <Button aria-label="Tạo phiếu mới" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-3 h-7 mx-auto">
                + Phiếu Giao Mới
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
