import React, { useEffect, useState } from 'react';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { motion } from 'motion/react';
import { CheckCircle2, User, Calendar, FileText, Package, MapPin, RotateCcw, X, ShieldCheck } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/src/design-system/Button';

interface DeliveryConfirmationModalProps {
  delivery: Delivery;
  onClose: () => void;
  onRevertConfirmation: (delivery: Delivery) => Promise<void>;
  canRevert?: boolean;
}

export function DeliveryConfirmationModal({
  delivery,
  onClose,
  onRevertConfirmation,
  canRevert = true,
}: DeliveryConfirmationModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleRevert = async () => {
    setIsReverting(true);
    try {
      await onRevertConfirmation(delivery);
      onClose();
    } finally {
      setIsReverting(false);
    }
  };

  if (!mounted) return null;

  const diaChi = (delivery as any).diaChiGiaoHang || (delivery as any).diaChi || '---';

  return (
    <Dialog.Root open={true} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9990]" />
        <Dialog.Content asChild>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 outline-none" style={{ pointerEvents: 'auto' }}>
            <div
              className="relative z-10 w-full max-w-xl outline-none flex flex-col max-h-[92vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[92vh] border border-emerald-200 overflow-hidden"
              >
                {/* Header */}
                <div className="px-6 py-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-b border-emerald-100 shrink-0 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-200 shrink-0">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Dialog.Title className="text-lg font-bold text-slate-900 tracking-tight">
                          Thông tin xác nhận giao hàng
                        </Dialog.Title>
                        <span className="bg-emerald-100 text-emerald-800 text-2xs font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Đã hoàn tất
                        </span>
                      </div>
                      <Dialog.Description className="text-xs text-slate-500 mt-1 font-medium">
                        Biên bản bàn giao thực tế cho phiếu <strong className="font-mono text-slate-800">{delivery.deliveryId || delivery.id}</strong>
                      </Dialog.Description>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
                    aria-label="Đóng popup"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 flex-1 overflow-y-auto space-y-5">
                  {/* Khối Thông tin bàn giao thực tế */}
                  <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4.5 space-y-3">
                    <div className="text-2xs font-bold text-emerald-900 uppercase tracking-widest flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Chi tiết ký nhận thực tế
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <Calendar size={12} className="text-emerald-600" /> Ngày giao thực tế
                        </span>
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {delivery.ngayGiaoThucTe ? formatDate(delivery.ngayGiaoThucTe) : '---'}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                          <User size={12} className="text-emerald-600" /> Người ký nhận
                        </span>
                        <span className="font-bold text-slate-900 text-sm truncate block" title={delivery.kyNhan || '---'}>
                          {delivery.kyNhan || <span className="text-slate-400 italic font-normal">Chưa ghi nhận</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Thông tin khách hàng & vận chuyển */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Khách hàng nhận</span>
                      <span className="font-bold text-slate-900 block truncate" title={delivery.tenKhachHang}>
                        {delivery.tenKhachHang || '---'}
                      </span>
                      {delivery.sdt && (
                        <span className="text-2xs font-mono text-slate-600 mt-0.5 block">SĐT: {delivery.sdt}</span>
                      )}
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                      <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Chứng từ liên kết</span>
                      <div className="flex flex-col gap-0.5 text-2xs font-mono">
                        {delivery.soHopDong && (
                          <span className="text-emerald-700 font-bold">HĐ: {delivery.soHopDong}</span>
                        )}
                        {delivery.soPhieuXuat && (
                          <span className="text-blue-700 font-bold">Phiếu xuất: {delivery.soPhieuXuat}</span>
                        )}
                        {delivery.soDonHang && (
                          <span className="text-slate-600">Đơn hàng: #{delivery.soDonHang}</span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-1 sm:col-span-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                      <MapPin size={15} className="text-slate-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Địa chỉ giao hàng</span>
                        <span className="text-xs text-slate-700 font-medium leading-relaxed block">{diaChi}</span>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách máy móc / hàng hóa bàn giao */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-2xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                        <Package size={13} className="text-blue-600" />
                        Danh sách sản phẩm bàn giao ({delivery.products?.length || 0} mặt hàng)
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      {delivery.products && delivery.products.length > 0 ? (
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-2xs font-bold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-3.5 py-2 font-medium">Tên hàng hóa / Thiết bị</th>
                              <th className="px-3 py-2 font-medium w-32 border-l border-slate-200">Mã / Model</th>
                              <th className="px-3 py-2 font-medium w-24 text-right border-l border-slate-200">SL Giao</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {delivery.products.map((prod, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                <td className="px-3.5 py-2.5 text-slate-800 font-medium">
                                  <span className="truncate block" title={prod.productName}>{prod.productName}</span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-500 font-mono border-l border-slate-100">
                                  <span className="truncate block" title={prod.productId || '---'}>{prod.productId || '---'}</span>
                                </td>
                                <td className="px-3 py-2.5 text-slate-900 font-bold text-right border-l border-slate-100 bg-slate-50/30">
                                  {prod.quantity} <span className="text-2xs text-slate-500 font-normal">{prod.unit || 'Máy'}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="p-4 text-center text-xs text-slate-500 italic bg-slate-50">Không có danh sách sản phẩm chi tiết.</div>
                      )}
                    </div>
                  </div>

                  {/* Serial máy móc nếu có */}
                  {delivery.danhSachMaMay && delivery.danhSachMaMay.length > 0 && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                      <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block">Danh sách Serial / Mã máy cấu hình đã xuất</span>
                      <div className="flex flex-wrap gap-1.5">
                        {delivery.danhSachMaMay.map((serial, idx) => (
                          <span key={idx} className="font-mono text-2xs font-bold bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                            {serial}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ghi chú khi giao */}
                  {delivery.ghiChu && (
                    <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-1">
                      <span className="text-2xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                        <FileText size={12} className="text-amber-700" /> Ghi chú bàn giao
                      </span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {delivery.ghiChu}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 shrink-0 flex items-center justify-between gap-3">
                  {canRevert ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleRevert}
                      disabled={isReverting}
                      className="bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border-red-200 h-[38px] text-xs font-bold px-4 flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      {isReverting ? (
                        <div className="w-3.5 h-3.5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
                      ) : (
                        <RotateCcw size={14} className="text-red-600" />
                      )}
                      Hủy / Xóa xác nhận giao hàng
                    </Button>
                  ) : <div />}

                  <Button
                    type="button"
                    onClick={onClose}
                    variant="secondary"
                    className="h-[38px] px-5 font-semibold text-slate-700 hover:text-slate-900 shadow-xs"
                  >
                    Đóng
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
