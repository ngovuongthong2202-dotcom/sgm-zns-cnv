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
  Layers,
  RotateCcw
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
  onConfirmShipment?: (shipment: DeliveryShipment) => void;
  onRevertShipment?: (shipment: DeliveryShipment) => void;
  canEdit?: boolean;
}

export function TabLichSuGiaoHang({
  delivery,
  onOpenRecordShipment,
  onSendShipmentZns,
  onConfirmShipment,
  onRevertShipment,
  canEdit = true
}: TabLichSuGiaoHangProps) {
  const recon = reconcileDeliveryShipments(delivery);
  const shipments = Array.isArray(delivery.cacDotGiao) ? delivery.cacDotGiao : [];
  const isRemainingZero = recon.isFullyDelivered ||
    (recon.remainingProducts.length > 0 && recon.remainingProducts.every(p => (Number(p.remainingQuantity) || 0) <= 0)) ||
    (recon.totalBaselineQuantity > 0 && recon.totalShippedQuantity >= recon.totalBaselineQuantity);

  return (
    <div className="space-y-6">
      
      {/* SUMMARY BANNER */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-5 shadow-sm border border-slate-700/50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-blue-400" />
              <h3 className="font-bold text-sm text-white uppercase tracking-wider">
                Sổ Giao Hàng
              </h3>
            </div>
            <p className="text-xs text-slate-300">
              Tổng số lượng đơn hàng: <strong className="text-white font-mono">{recon.totalBaselineQuantity}</strong> sản phẩm 
              • Đã xuất kho: <strong className="text-emerald-400 font-mono">{recon.totalShippedQuantity}</strong> 
              • Còn lại: <strong className="text-amber-300 font-mono">{Math.max(0, recon.totalBaselineQuantity - recon.totalShippedQuantity)}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-3xs uppercase font-bold text-slate-400 tracking-wider block">Tiến độ thực xuất</span>
              <span className="text-lg font-black font-mono text-emerald-400">{recon.tienDoLuyKe}%</span>
            </div>
            {canEdit && onOpenRecordShipment && !isRemainingZero ? (
              <Button
                type="button"
                onClick={onOpenRecordShipment}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm border-none transition-transform active:scale-95 cursor-pointer"
                title="Ghi nhận thêm đợt xuất kho mới"
              >
                <Plus size={14} />
                <span>+ Đợt {recon.nextDotGiaoHang}</span>
              </Button>
            ) : isRemainingZero ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold shadow-2xs">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Đã xuất đủ 100%</span>
              </span>
            ) : null}
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
                      {shipments.length <= 1 && isRemainingZero ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-extrabold text-xs flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-600" />
                          Phiếu xuất kho & Bàn giao
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 font-extrabold text-xs">
                          Đợt {shipment.dotGiaoHang || sIdx + 1}
                        </span>
                      )}
                      <span className="font-mono font-bold text-sm text-slate-900">
                        {shipment.soPhieuXuat}
                      </span>
                      {shipment.isDotCuoiCung && shipments.length > 1 && (
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

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Confirm Shipment Milestone Button */}
                      {!isCompleted ? (
                        onConfirmShipment && canEdit && (
                          <Button
                            type="button"
                            onClick={() => onConfirmShipment(shipment)}
                            className="text-xs h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 rounded-lg shadow-2xs border-none cursor-pointer transition-transform active:scale-95"
                            title={shipments.length <= 1 && isRemainingZero ? 'Xác nhận hoàn tất giao hàng' : `Xác nhận hoàn tất giao hàng Đợt ${shipment.dotGiaoHang}`}
                          >
                            <CheckCircle2 size={13} />
                            <span>{shipments.length <= 1 && isRemainingZero ? 'Xác nhận bàn giao' : `Xác nhận giao Đợt ${shipment.dotGiaoHang}`}</span>
                          </Button>
                        )
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-extrabold">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Đã giao: {formatDate(shipment.ngayGiaoThucTe)}</span>
                            {shipment.kyNhan && <span className="text-emerald-700 font-semibold">• {shipment.kyNhan}</span>}
                          </span>
                          {onRevertShipment && canEdit && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => onRevertShipment(shipment)}
                              className="text-3xs h-8 px-2 text-slate-500 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 rounded-lg cursor-pointer"
                              title="Sửa / Hủy xác nhận đợt này"
                            >
                              <RotateCcw size={12} />
                              <span>Sửa</span>
                            </Button>
                          )}
                        </div>
                      )}

                      {/* Print Handover Protocol for this Shipment */}
                      <ExportHandoverPdf 
                        delivery={projectedDelivery}
                        label={shipments.length <= 1 && isRemainingZero ? 'In BB Bàn giao' : `In BB Đợt ${shipment.dotGiaoHang}`}
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

                  {/* Dispatched Products in this Shipment - 5-Column High-End Data Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 px-3.5 py-2 flex items-center justify-between border-b border-slate-200">
                      <span className="text-2xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                        <Package size={13} className="text-blue-600" />
                        Danh sách sản phẩm xuất trong đợt ({shipmentItems.length} mục • {shipmentTotalQty} SP)
                      </span>
                      {shipment.giaTriXuatKhoDotNay && shipment.giaTriXuatKhoDotNay > 0 ? (
                        <span className="text-2xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-mono">
                          Giá trị xuất: {formatCurrency(shipment.giaTriXuatKhoDotNay)}
                        </span>
                      ) : null}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-100/70 border-b border-slate-200 text-3xs font-black uppercase text-slate-600 tracking-wider">
                            <th className="py-2 px-3 w-12 text-center">STT</th>
                            <th className="py-2 px-3 w-36">Mã SP</th>
                            <th className="py-2 px-3">Tên sản phẩm / Quy cách</th>
                            <th className="py-2 px-3 w-24 text-right">Số lượng</th>
                            <th className="py-2 px-3 w-20 text-center">ĐVT</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {shipmentItems.map((item, iIdx) => (
                            <tr key={iIdx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-3 text-center font-mono text-slate-400 font-bold">{iIdx + 1}</td>
                              <td className="py-2 px-3 font-mono text-blue-700 font-semibold text-2xs">
                                {item.productId || '---'}
                                {item.machineCode && (
                                  <span className="block font-mono text-3xs text-slate-500 font-normal">
                                    Serial: {item.machineCode}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-900">
                                <div>{item.productName}</div>
                                {item.quyCach && (
                                  <div className="text-3xs text-slate-500 italic mt-0.5">{item.quyCach}</div>
                                )}
                              </td>
                              <td className="py-2 px-3 text-right font-mono font-bold text-slate-950">{item.quantity}</td>
                              <td className="py-2 px-3 text-center text-slate-600 font-medium text-2xs">{item.unit || 'Cái'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
