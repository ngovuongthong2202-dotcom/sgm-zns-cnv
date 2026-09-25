import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, FileText, CreditCard, Truck, FileSpreadsheet, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { BlockingDocumentItem } from '@/src/domain/policy/lock.policy';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';

export interface BlockingDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  entityName?: string;
  reason?: string;
  blockingDocuments?: string[];
  detailedBlocks?: BlockingDocumentItem[];
}

export function BlockingDocumentsModal({
  isOpen,
  onClose,
  title = 'Không thể xóa chứng từ',
  entityName,
  reason,
  blockingDocuments = [],
  detailedBlocks = []
}: BlockingDocumentsModalProps) {
  // Group detailed blocks by type if available
  const contracts = detailedBlocks.filter(b => b.type === 'contract');
  const payments = detailedBlocks.filter(b => b.type === 'payment');
  const deliveries = detailedBlocks.filter(b => b.type === 'delivery');
  const quotations = detailedBlocks.filter(b => b.type === 'quotation');

  const hasDetailedBlocks = detailedBlocks.length > 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm pointer-events-auto"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-auto overflow-y-auto">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
                >
                  {/* Top Header Accent Banner */}
                  <div className="bg-gradient-to-r from-red-600 via-amber-600 to-amber-500 h-2 w-full shrink-0" />

                  {/* Header Area */}
                  <div className="p-6 pb-4 flex items-start gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 shrink-0 shadow-xs">
                      <ShieldAlert className="w-7 h-7" />
                    </div>
                    <div className="flex-1 pr-6">
                      <Dialog.Title className="text-lg font-bold text-slate-900 leading-tight">
                        {title}
                      </Dialog.Title>
                      {entityName && (
                        <div className="mt-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-md inline-block">
                          Mục đang chọn: {entityName}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={onClose}
                      className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Đóng"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Content Area */}
                  <div className="px-6 py-2 overflow-y-auto space-y-4 flex-1">
                    {/* Primary Reason Description */}
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        {reason ||
                          'Chứng từ này đã phát sinh các chứng từ cấp dưới liên quan trong chu trình bán hàng. Hệ thống bảo vệ tính toàn vẹn dữ liệu ngăn chặn thao tác xóa để tránh gãy vỡ chuỗi luồng.'}
                      </div>
                    </div>

                    {/* Detailed Blocking Documents Groups */}
                    {hasDetailedBlocks ? (
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Danh sách chứng từ liên kết đang chặn ({detailedBlocks.length}):
                        </div>

                        {/* Contracts Group */}
                        {contracts.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                            <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                Hợp đồng liên quan ({contracts.length})
                              </span>
                            </div>
                            <div className="p-2 divide-y divide-slate-100">
                              {contracts.map((item, idx) => (
                                <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-white rounded-lg transition-colors">
                                  <div>
                                    <div className="font-semibold text-slate-800">{item.code || item.label}</div>
                                    {item.date && <div className="text-slate-400 text-2xs">Ngày ký: {item.date}</div>}
                                  </div>
                                  <div className="text-right">
                                    {item.amount !== undefined && (
                                      <div className="font-mono font-bold text-blue-700">{formatCurrency(item.amount)}</div>
                                    )}
                                    {item.status && (
                                      <span className="inline-block text-2xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Payments Group */}
                        {payments.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                            <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                Phiếu thanh toán liên quan ({payments.length})
                              </span>
                            </div>
                            <div className="p-2 divide-y divide-slate-100">
                              {payments.map((item, idx) => (
                                <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-white rounded-lg transition-colors">
                                  <div>
                                    <div className="font-semibold text-slate-800">{item.code || item.label}</div>
                                    {item.date && <div className="text-slate-400 text-2xs">Ngày thu: {item.date}</div>}
                                  </div>
                                  <div className="text-right">
                                    {item.amount !== undefined && (
                                      <div className="font-mono font-bold text-emerald-700">{formatCurrency(item.amount)}</div>
                                    )}
                                    {item.status && (
                                      <span className="inline-block text-2xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Deliveries Group */}
                        {deliveries.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                            <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-amber-600" />
                                Phiếu giao hàng liên quan ({deliveries.length})
                              </span>
                            </div>
                            <div className="p-2 divide-y divide-slate-100">
                              {deliveries.map((item, idx) => (
                                <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-white rounded-lg transition-colors">
                                  <div>
                                    <div className="font-semibold text-slate-800">{item.code || item.label}</div>
                                    {item.date && <div className="text-slate-400 text-2xs">Ngày giao: {item.date}</div>}
                                  </div>
                                  <div className="text-right">
                                    {item.status && (
                                      <span className="inline-block text-2xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                                        {item.status}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Quotations Group (for customer lock) */}
                        {quotations.length > 0 && (
                          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                            <div className="px-3.5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
                              <span className="flex items-center gap-1.5">
                                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                                Báo giá liên quan ({quotations.length})
                              </span>
                            </div>
                            <div className="p-2 divide-y divide-slate-100">
                              {quotations.map((item, idx) => (
                                <div key={idx} className="p-2 flex items-center justify-between text-xs hover:bg-white rounded-lg transition-colors">
                                  <div>
                                    <div className="font-semibold text-slate-800">{item.code || item.label}</div>
                                    {item.date && <div className="text-slate-400 text-2xs">Ngày: {item.date}</div>}
                                  </div>
                                  <div className="text-right">
                                    {item.amount !== undefined && (
                                      <div className="font-mono font-bold text-blue-700">{formatCurrency(item.amount)}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : blockingDocuments.length > 0 ? (
                      /* Fallback simple list */
                      <div className="border border-slate-200 rounded-xl p-3 bg-slate-50 space-y-2">
                        <div className="text-xs font-bold text-slate-700">Chứng từ liên quan:</div>
                        <ul className="space-y-1 text-xs text-slate-600">
                          {blockingDocuments.map((doc, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                              <span>{doc}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {/* Safe Reversal Guidance */}
                    <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs text-slate-600 space-y-1.5">
                      <div className="font-bold text-blue-900 flex items-center gap-1.5">
                        <span>💡 Quy trình xử lý theo chuẩn toàn vẹn dữ liệu:</span>
                      </div>
                      <div className="flex items-center gap-1 text-2xs font-medium text-blue-800 flex-wrap">
                        <span>Giao hàng</span>
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                        <span>Thanh toán</span>
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                        <span>Hợp đồng</span>
                        <ArrowRight className="w-3 h-3 text-blue-400" />
                        <span>Báo giá</span>
                      </div>
                      <p className="text-2xs text-slate-500 leading-normal">
                        Để xóa chứng từ này một cách an toàn, bạn cần xử lý (hủy hoặc xóa) các chứng từ phụ thuộc cấp dưới liệt kê ở trên trước.
                      </p>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <Button
                      variant="primary"
                      onClick={onClose}
                      className="px-5 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                    >
                      Đã hiểu
                    </Button>
                  </div>
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
