import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ArrowRight, 
  CheckCircle2, 
  Cpu, 
  Layers, 
  Package, 
  Wrench, 
  X,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';

interface QuotationTypeDoubleCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentType: string;
  recommendedType: string;
  machineCount: number;
  materialCount: number;
  serviceCount: number;
  onConfirmRecommended: () => void;
  onConfirmCurrent: () => void;
}

export function QuotationTypeDoubleCheckModal({
  isOpen,
  onClose,
  currentType,
  recommendedType,
  machineCount,
  materialCount,
  serviceCount,
  onConfirmRecommended,
  onConfirmCurrent
}: QuotationTypeDoubleCheckModalProps) {
  if (!isOpen) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        <Dialog.Portal forceMount>
          {/* Overlay */}
          <Dialog.Overlay asChild>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 transition-opacity" 
            />
          </Dialog.Overlay>

          {/* Modal Container */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col focus:outline-none"
              >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/70 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700 shrink-0 shadow-2xs">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-6">
                    <Dialog.Title className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      Xác nhận Phân loại Báo Giá
                    </Dialog.Title>
                    <Dialog.Description className="text-xs font-medium text-slate-600 mt-1 leading-relaxed">
                      Phát hiện cơ cấu danh mục hàng hóa chưa khớp với phân loại phiếu báo giá đã chọn.
                    </Dialog.Description>
                  </div>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      onClick={onClose}
                      className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer border-0 bg-transparent"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </Dialog.Close>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                  {/* Visual Transformation Card */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                    {/* Current Choice */}
                    <div className="flex-1 text-center p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                      <span className="text-3xs uppercase font-extrabold text-slate-400 block mb-1">
                        Loại đang chọn
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">
                        {currentType || 'Chưa chọn'}
                      </span>
                    </div>

                    <div className="flex items-center justify-center shrink-0 text-amber-600">
                      <ArrowRight className="w-5 h-5 animate-pulse" />
                    </div>

                    {/* Recommended Choice */}
                    <div className="flex-1 text-center p-3 bg-emerald-50/80 rounded-lg border border-emerald-200 shadow-2xs">
                      <span className="text-3xs uppercase font-extrabold text-emerald-700 block mb-1 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đề xuất chuẩn
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-black bg-emerald-600 text-white shadow-2xs">
                        {recommendedType}
                      </span>
                    </div>
                  </div>

                  {/* Product Composition Inspection */}
                  <div className="space-y-2">
                    <span className="text-2xs font-black text-slate-500 uppercase tracking-widest block">
                      Chi tiết cơ cấu danh mục ({machineCount + materialCount + serviceCount} mục)
                    </span>
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Máy */}
                      <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                        machineCount > 0 
                          ? 'bg-blue-50/70 border-blue-200 text-blue-900 font-bold' 
                          : 'bg-slate-50/50 border-slate-200/60 text-slate-400'
                      }`}>
                        <Cpu className={`w-4 h-4 ${machineCount > 0 ? 'text-blue-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-black">{machineCount}</span>
                        <span className="text-3xs font-semibold">Máy móc</span>
                      </div>

                      {/* Vật tư */}
                      <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                        materialCount > 0 
                          ? 'bg-purple-50/70 border-purple-200 text-purple-900 font-bold' 
                          : 'bg-slate-50/50 border-slate-200/60 text-slate-400'
                      }`}>
                        <Package className={`w-4 h-4 ${materialCount > 0 ? 'text-purple-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-black">{materialCount}</span>
                        <span className="text-3xs font-semibold">Vật tư / LK</span>
                      </div>

                      {/* Dịch vụ */}
                      <div className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 ${
                        serviceCount > 0 
                          ? 'bg-amber-50/70 border-amber-200 text-amber-900 font-bold' 
                          : 'bg-slate-50/50 border-slate-200/60 text-slate-400'
                      }`}>
                        <Wrench className={`w-4 h-4 ${serviceCount > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                        <span className="text-xs font-black">{serviceCount}</span>
                        <span className="text-3xs font-semibold">Dịch vụ</span>
                      </div>
                    </div>
                  </div>

                  {/* Clarification Hint */}
                  <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl text-xs text-blue-950 flex items-start gap-2.5">
                    <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="text-2xs leading-relaxed text-slate-700">
                      <strong>Thứ bậc ưu tiên:</strong> Nếu đơn có <strong>Máy</strong> thì phiếu phải là <strong>BG Máy</strong>; nếu có <strong>Vật tư</strong> (không có Máy) thì là <strong>BG Vật tư</strong>; nếu chỉ có <strong>Dịch vụ</strong> thì là <strong>BG Dịch vụ</strong>.
                    </div>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onClose}
                    className="w-full sm:w-auto h-9 font-bold px-3 order-3 sm:order-1"
                  >
                    Quay lại kiểm tra
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onConfirmCurrent}
                    className="w-full sm:w-auto h-9 font-bold px-3.5 border-slate-300 text-slate-700 hover:bg-slate-100 order-2 sm:order-2"
                  >
                    Giữ nguyên & Lưu
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={onConfirmRecommended}
                    className="w-full sm:w-auto h-9 font-extrabold px-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs order-1 sm:order-3"
                  >
                    Chuyển sang {recommendedType} & Lưu
                  </Button>
                </div>
              </motion.div>
            </Dialog.Content>
          </div>
        </Dialog.Portal>
      </AnimatePresence>
    </Dialog.Root>
  );
}
