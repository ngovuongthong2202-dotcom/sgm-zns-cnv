import React from 'react';
import { 
  Truck, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  User, 
  FileText, 
  AlertCircle,
  Printer,
  Send,
  Plus,
  Package,
  Layers
} from 'lucide-react';
import { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';
import { formatDate } from '@/src/shared/utils/formatDate';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { ExportHandoverPdf } from '@/src/modules/fulfillment/ui/components/ExportHandoverPdf';
import { reconcileDeliveryShipments } from '@/src/modules/fulfillment/ui/utils/delivery-reconciler';
import { Button } from '@/src/design-system/Button';

interface TabLichSuGiaoHangProps {
  delivery: Delivery;
  onOpenRecordShipment?: () => void;
  onSendShipmentZns?: (shipment: DeliveryShipment) => void;
  canEdit?: boolean;
}

export function TabLichSuGiaoHang({
  delivery,
  onOpenRecordShipment,
  onSendShipmentZns,
  canEdit = true
}: TabLichSuGiaoHangProps) {
  const recon = reconcileDeliveryShipments(delivery);
  const shipments = Array.isArray(delivery.cacDotGiao) ? delivery.cacDotGiao : [];

  return (
    <div className="space-y-6">
      
      {/* SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Sổ Cái Phân Kỳ Giao Hàng (Omni-Milestone Nexus)
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Tổng số lượng đơn hàng: <strong className="text-white font-mono">{recon.totalBaselineQuantity}</strong> sản phẩm 
              • Đã xuất kho: <strong className="text-emerald-400 font-mono">{recon.totalShippedQuantity}</strong> 
              • Còn lại: <strong className="text-amber-300 font-mono">{recon.totalBaselineQuantity - recon.totalShippedQuantity}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-3xs uppercase font-bold text-slate-400 tracking-wider block">Tiến độ thực xuất</span>
              <span className="text-lg font-black font-mono text-emerald-400">{recon.tienDoLuyKe}%</span>
            </div>
            {canEdit && !recon.isFullyDelivered && onOpenRecordShipment && (
              <Button
                type="button"
                onClick={onOpenRecordShipment}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm border-none"
              >
                <Plus size={14} />
                <span>+ Đợt {recon.nextDotGiaoHang}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden mt-4 shadow-inner">
          <div 
            style={{ width: `${recon.tienDoLuyKe}%` }} 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-500 rounded-full"
          />
        </div>
      </div>

      {/* SHIPMENTS TIMELINE */}
      {shipments.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white p-6">
          <Truck size={36} className="mx-auto text-slate-300 mb-2" />
          <h4 className="text-sm font-bold text-slate-700">Chưa có đợt xuất kho nào được ghi nhận</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Đơn hàng này hiện chưa phát sinh đợt giao hàng thực tế. Bạn có thể bấm nút bên dưới để ghi nhận đợt xuất kho đầu tiên.
          </p>
          {canEdit && onOpenRecordShipment && (
            <Button
              type="button"
              onClick={onOpenRecordShipment}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl"
            >
              + Ghi nhận đợt giao đầu tiên (Đợt 1)
            </Button>
          )}
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
          {shipments.map((shipment, sIdx) => {
            const isCompleted = Boolean(shipment.ngayGiaoThucTe);
            const shipmentItems = Array.isArray(shipment.products) ? shipment.products : [];
            const shipmentTotalQty = shipmentItems.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);

            // Create projected Delivery snapshot for this shipment to feed print components
            const projectedDelivery: Delivery = {
              ...delivery,
              dotGiaoHang: shipment.dotGiaoHang,
              soPhieuXuat: shipment.soPhieuXuat,
              ngayGiaoMay: shipment.ngayGiaoMay,
              ngayGiaoThucTe: shipment.ngayGiaoThucTe,
              slMay: shipment.slMay || shipmentTotalQty,
              dvt: shipment.dvt,
              products: shipment.products,
              danhSachMaMay: shipment.danhSachMaMay,
              thoGiaoMay: shipment.thoGiaoMay,
              sdtThoGiaoMay: shipment.sdtThoGiaoMay,
              donViVanChuyen: shipment.donViVanChuyen,
              soBienBanNghiemThu: shipment.soBienBanNghiemThu,
              ngayNghiemThu: shipment.ngayNghiemThu,
              tinhTrangNghiemThu: shipment.tinhTrangNghiemThu,
            };

            return (
              <div key={shipment.id || sIdx} className="relative group">
                
                {/* Timeline Node Bullet */}
                <div className={`absolute -left-[19px] top-4 w-4 h-4 rounded-full border-2 transition-all ${
                  isCompleted 
                    ? 'bg-emerald-500 border-white ring-4 ring-emerald-100 shadow-sm' 
                    : 'bg-blue-600 border-white ring-4 ring-blue-100 shadow-sm animate-pulse'
                }`} />

                {/* Shipment Card */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all space-y-4">
                  
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-xs">
                        Đợt {shipment.dotGiaoHang || sIdx + 1}
                      </span>
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {shipment.soPhieuXuat}
                      </span>
                      {shipment.isDotCuoiCung && (
                        <span className="px-2 py-0.5 rounded text-3xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wider">
                          Đợt Cuối
                        </span>
                      )}
                      {shipment.dacCachGiaoTruoc && (
                        <span className="px-2 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider" title={shipment.lyDoDacCach || 'Đặc cách BGĐ'}>
                          ⭐ Đặc cách BGĐ
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Print Handover Protocol for this Shipment */}
                      <ExportHandoverPdf 
                        delivery={projectedDelivery}
                        label={`In BB Đợt ${shipment.dotGiaoHang}`}
                        variant="secondary"
                        className="text-xs h-8 px-3"
                      />

                      {/* ZNS Dispatch Button */}
                      {onSendShipmentZns && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => onSendShipmentZns(shipment)}
                          className="text-xs h-8 px-2.5 text-blue-600 hover:bg-blue-50 flex items-center gap-1.5"
                          title="Gửi ZNS thông báo cho đợt giao này"
                        >
                          <Send size={13} />
                          <span>Gửi ZNS</span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Shipment Info Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-slate-400 text-2xs block uppercase font-medium">Ngày hẹn giao</span>
                      <span className="font-semibold text-slate-800 font-mono">
                        {shipment.ngayGiaoMay ? formatDate(shipment.ngayGiaoMay) : '---'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-2xs block uppercase font-medium">Ngày thực tế</span>
                      <span className={`font-semibold font-mono ${shipment.ngayGiaoThucTe ? 'text-emerald-700' : 'text-slate-400 italic'}`}>
                        {shipment.ngayGiaoThucTe ? formatDate(shipment.ngayGiaoThucTe) : 'Chưa xác nhận'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-2xs block uppercase font-medium">Thợ giao máy</span>
                      <span className="font-medium text-slate-800">
                        {shipment.thoGiaoMay || '---'} {shipment.sdtThoGiaoMay ? `(${shipment.sdtThoGiaoMay})` : ''}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 text-2xs block uppercase font-medium">Kho & Vận tải</span>
                      <span className="font-medium text-slate-800 truncate block">
                        {shipment.donViVanChuyen || shipment.khoXuat || '---'}
                      </span>
                    </div>
                  </div>

                  {/* Dispatched Products in this Shipment */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xs font-bold uppercase tracking-wider text-slate-500">
                        Hàng hóa xuất trong đợt ({shipmentItems.length} mục • {shipmentTotalQty} SP)
                      </span>
                      {shipment.giaTriXuatKhoDotNay && shipment.giaTriXuatKhoDotNay > 0 ? (
                        <span className="text-3xs font-bold text-slate-600 font-mono">
                          Giá trị: {formatCurrency(shipment.giaTriXuatKhoDotNay)}
                        </span>
                      ) : null}
                    </div>

                    <div className="divide-y divide-slate-200/60 text-xs">
                      {shipmentItems.map((item, iIdx) => (
                        <div key={iIdx} className="py-1.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-4 text-center font-mono text-3xs text-slate-400">{iIdx + 1}.</span>
                            <span className="font-semibold text-slate-800">{item.productName}</span>
                            {item.productId && (
                              <span className="font-mono text-3xs text-blue-600 bg-blue-50 px-1 rounded">
                                {item.productId}
                              </span>
                            )}
                            {item.machineCode && (
                              <span className="font-mono text-3xs text-slate-600 bg-slate-200 px-1 rounded">
                                Serial: {item.machineCode}
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-slate-900">
                            {item.quantity} {item.unit || 'Cái'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footnotes & Acceptance */}
                  {(shipment.ghiChu || shipment.soBienBanNghiemThu || shipment.dacCachGiaoTruoc) && (
                    <div className="text-2xs text-slate-500 pt-1 flex flex-wrap items-center gap-4">
                      {shipment.ghiChu && (
                        <span>Ghi chú: <strong className="text-slate-700">{shipment.ghiChu}</strong></span>
                      )}
                      {shipment.soBienBanNghiemThu && (
                        <span>BB Nghiệm thu: <strong className="font-mono text-slate-800">{shipment.soBienBanNghiemThu}</strong></span>
                      )}
                      {shipment.dacCachGiaoTruoc && shipment.nguoiPheDuyetDacCach && (
                        <span>Duyệt đặc cách: <strong className="text-amber-800">{shipment.nguoiPheDuyetDacCach}</strong></span>
                      )}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
