import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/src/design-system/Button';
import { 
  computeLineItem,
  aggregateProducts, 
  formatVietnameseCurrency 
} from '@/src/domain/pricing/quotation-pricing';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { X, ArrowRight, ArrowDown } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation; // Current quotation
  revision: any; // The selected revision to compare against
}

export function QuotationRevisionCompareModal({ isOpen, onClose, quotation, revision }: Props) {
  if (!revision) return null;

  const currentProducts = (quotation.products || []).map(computeLineItem);
  const currentAggs = aggregateProducts(currentProducts);
  const currentSubTotal = currentAggs.totalGross;
  const currentDiscountAmount = currentAggs.totalDiscount;
  const currentVatAmount = currentAggs.totalVat;
  const currentTotal = currentAggs.totalAfterTax;
  const currentDiscountRate = currentSubTotal > 0 ? Number(((currentDiscountAmount / currentSubTotal) * 100).toFixed(2)) : 0;
  const currentVatRate = currentAggs.totalBeforeTax > 0 ? Math.round((currentVatAmount / currentAggs.totalBeforeTax) * 100) : 0;

  const revProducts = (revision.products || []).map(computeLineItem);
  const revAggs = aggregateProducts(revProducts);
  const revSubTotal = revAggs.totalGross;
  const revDiscountAmount = revAggs.totalDiscount;
  const revVatAmount = revAggs.totalVat;
  const revTotal = revAggs.totalAfterTax;
  const revDiscountRate = revSubTotal > 0 ? Number(((revDiscountAmount / revSubTotal) * 100).toFixed(2)) : 0;
  const revVatRate = revAggs.totalBeforeTax > 0 ? Math.round((revVatAmount / revAggs.totalBeforeTax) * 100) : 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal forceMount>
        {isOpen && (
          <>
            <Dialog.Overlay className="fixed inset-0 z-[160] bg-slate-900/50 backdrop-blur-sm animate-in fade-in" />
            <Dialog.Content 
              className="fixed left-[50%] top-[50%] z-[160] w-full max-w-6xl translate-x-[-50%] translate-y-[-50%] outline-none"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div>
                <Dialog.Title className="text-lg font-semibold text-slate-800 m-0">So sánh phiên bản Báo giá</Dialog.Title>
                <Dialog.Description className="text-xs text-slate-500 mt-1 m-0">So sánh bản đang soạn thảo với Phiên bản lưu trữ: {revision.name || "Bản lưu"}</Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <Button aria-label="Đóng bảng so sánh" variant="ghost" className="p-1.5 h-8 w-8 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </Button>
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-slate-50/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
                
                {/* Revision Column (Old) */}
                <div className="border border-amber-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col h-[calc(80vh-140px)]">
                  <div className="bg-amber-50 p-4 border-b border-amber-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-amber-800 text-sm">Phiên bản lưu trữ</h3>
                        <p className="text-xs text-amber-600 font-medium">({revision.name || "Bản lưu"})</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xs text-amber-600 uppercase font-semibold">TỔNG GIÁ TRỊ</div>
                        <div className="font-bold text-lg text-amber-700">{formatVietnameseCurrency(revTotal)}</div>
                    </div>
                  </div>
                  <div className="p-0 overflow-auto flex-1 flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-2xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Sản phẩm</th>
                              <th className="py-2.5 px-3 font-semibold text-center">SL</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Đơn giá</th>
                              <th className="py-2.5 px-4 font-semibold text-right">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {revProducts.length === 0 ? (
                              <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">Không có sản phẩm</td></tr>
                            ) : revProducts.map((p: any, i: number) => (
                              <tr key={i} className="hover:bg-amber-50/30 transition-colors">
                                <td className="py-3 px-4 text-slate-800 max-w-[150px]">
                                    <div className="font-medium truncate" title={p.productName || p.name}>{p.productName || p.name}</div>
                                    {(p.productId || p.code) && <div className="text-2xs text-slate-500 font-mono mt-0.5">{p.productId || p.code}</div>}
                                </td>
                                <td className="py-3 px-3 text-slate-700 text-center font-medium bg-slate-50/50">{p.quantity} {p.unit && <span className="text-3xs text-slate-400 font-normal">{p.unit}</span>}</td>
                                <td className="py-3 px-3 text-slate-700 text-right">{formatVietnameseCurrency(p.price || 0)}</td>
                                <td className="py-3 px-4 text-slate-800 font-bold text-right text-amber-700">{formatVietnameseCurrency(p.total || ((p.price||0)*(p.quantity||1)))}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                    </div>
                    
                    {/* Summary section at bottom */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col gap-1 items-end text-sm flex-shrink-0">
                         <div className="flex justify-between w-64 text-slate-600">
                            <span>Tạm tính:</span>
                            <span className="font-medium">{formatVietnameseCurrency(revSubTotal)}</span>
                         </div>
                         {(revision.discountRate > 0 || revDiscountAmount > 0) && (
                           <div className="flex justify-between w-64 text-slate-600">
                              <span>Chiết khấu {revision.discountRate ? `(${revision.discountRate}%)` : ''}:</span>
                              <span className="font-medium text-red-600">-{formatVietnameseCurrency(revDiscountAmount)}</span>
                           </div>
                         )}
                         {(revision.vatRate > 0 || revVatAmount > 0) && (
                           <div className="flex justify-between w-64 text-slate-600">
                              <span>Thuế VAT {revision.vatRate ? `(${revision.vatRate}%)` : ''}:</span>
                              <span className="font-medium">{formatVietnameseCurrency(revVatAmount)}</span>
                           </div>
                         )}
                         <div className="flex justify-between w-64 text-amber-900 pt-2 mt-1 border-t border-amber-200">
                            <span className="font-bold">TỔNG CỘNG:</span>
                            <span className="font-bold text-amber-700 text-lg">{formatVietnameseCurrency(revTotal)}</span>
                         </div>
                    </div>
                  </div>
                </div>

                {/* Visual separator on Desktop */}
                <div className="hidden lg:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border-2 border-slate-100 rounded-full items-center justify-center shadow-md">
                    <ArrowRight size={16} className="text-slate-400" />
                </div>
                
                {/* Visual separator on Mobile */}
                <div className="lg:hidden flex items-center justify-center py-2 h-10 w-full relative z-10 -my-5">
                    <div className="bg-white border-2 border-slate-100 rounded-full p-2 shadow-sm">
                        <ArrowDown size={16} className="text-slate-400" />
                    </div>
                </div>

                {/* Current Column (New) */}
                <div className="border border-emerald-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col h-[calc(80vh-140px)] relative">
                  <div className="bg-emerald-50 p-4 border-b border-emerald-200 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h3 className="font-bold text-emerald-800 text-sm">Bảng giá hiện tại</h3>
                        <p className="text-xs text-emerald-600 font-medium">(Đang soạn)</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xs text-emerald-600 uppercase font-semibold">TỔNG GIÁ TRỊ</div>
                        <div className="font-bold text-lg text-emerald-700">{formatVietnameseCurrency(currentTotal)}</div>
                    </div>
                  </div>
                  <div className="p-0 overflow-auto flex-1 flex flex-col">
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-2xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="py-2.5 px-4 font-semibold">Sản phẩm</th>
                              <th className="py-2.5 px-3 font-semibold text-center">SL</th>
                              <th className="py-2.5 px-3 font-semibold text-right">Đơn giá</th>
                              <th className="py-2.5 px-4 font-semibold text-right">Thành tiền</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentProducts.length === 0 ? (
                              <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">Không có sản phẩm</td></tr>
                            ) : currentProducts.map((p: any, i: number) => {
                              return (
                                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                   <td className="py-3 px-4 text-slate-800 max-w-[150px]">
                                        <div className="font-medium truncate" title={p.productName || p.name}>{p.productName || p.name}</div>
                                        {(p.productId || p.code) && <div className="text-2xs text-slate-500 font-mono mt-0.5">{p.productId || p.code}</div>}
                                   </td>
                                   <td className="py-3 px-3 text-slate-700 text-center font-medium bg-slate-50/50">{p.quantity} {p.unit && <span className="text-3xs text-slate-400 font-normal">{p.unit}</span>}</td>
                                   <td className="py-3 px-3 text-slate-700 text-right">{formatVietnameseCurrency(p.price || 0)}</td>
                                   <td className="py-3 px-4 text-emerald-800 font-bold text-right">{formatVietnameseCurrency(p.total || ((p.price||0)*(p.quantity||1)))}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                    </div>

                    {/* Summary section at bottom */}
                    <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col gap-1 items-end text-sm flex-shrink-0">
                         <div className="flex justify-between w-64 text-slate-600">
                            <span>Tạm tính:</span>
                            <span className="font-medium">{formatVietnameseCurrency(currentSubTotal)}</span>
                         </div>
                         {(quotation.discountRate > 0 || currentDiscountAmount > 0) && (
                           <div className="flex justify-between w-64 text-slate-600">
                              <span>Chiết khấu {quotation.discountRate ? `(${quotation.discountRate}%)` : ''}:</span>
                              <span className="font-medium text-red-600">-{formatVietnameseCurrency(currentDiscountAmount)}</span>
                           </div>
                         )}
                         {(quotation.vatRate > 0 || currentVatAmount > 0) && (
                           <div className="flex justify-between w-64 text-slate-600">
                              <span>Thuế VAT {quotation.vatRate ? `(${quotation.vatRate}%)` : ''}:</span>
                              <span className="font-medium">{formatVietnameseCurrency(currentVatAmount)}</span>
                           </div>
                         )}
                         <div className="flex justify-between w-64 text-emerald-900 pt-2 mt-1 border-t border-emerald-200">
                            <span className="font-bold">TỔNG CỘNG:</span>
                            <span className="font-bold text-emerald-700 text-lg">{formatVietnameseCurrency(currentTotal)}</span>
                         </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
            
            <div className="px-6 py-4 flex items-center justify-end border-t border-slate-100 bg-slate-50 flex-shrink-0">
                <Dialog.Close asChild>
                  <Button onClick={onClose}>Đóng so sánh</Button>
                </Dialog.Close>
            </div>
          </div>
        </Dialog.Content>
          </>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
