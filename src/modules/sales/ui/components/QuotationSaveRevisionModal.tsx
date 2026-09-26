import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/src/design-system/Button';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { 
  computeLineItem,
  aggregateProducts, 
  formatVietnameseCurrency 
} from '@/src/domain/pricing/quotation-pricing';
import { X, Save } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onSave: (name: string, note: string) => Promise<void> | void;
}

export function QuotationSaveRevisionModal({ isOpen, onClose, quotation, onSave }: Props) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(name || `Bản lưu ${formatDate(new Date().toISOString())}`, note);
      setName('');
      setNote('');
    } finally {
      setIsSaving(false);
    }
  };

  const products = (quotation.products || []).map(computeLineItem);
  const aggs = aggregateProducts(products);
  const subTotal = aggs.totalGross;
  const discountAmount = aggs.totalDiscount;
  const vatAmount = aggs.totalVat;
  const total = aggs.totalAfterTax;
  const discountRate = subTotal > 0 ? Number(((discountAmount / subTotal) * 100).toFixed(2)) : 0;
  const vatRate = aggs.totalBeforeTax > 0 ? Math.round((vatAmount / aggs.totalBeforeTax) * 100) : 0;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal forceMount>
        {isOpen && (
          <>
            <Dialog.Overlay className="fixed inset-0 z-[160] bg-slate-900/50 backdrop-blur-sm animate-in fade-in" />
            <Dialog.Content 
              className="fixed left-[50%] top-[50%] z-[160] w-full max-w-5xl translate-x-[-50%] translate-y-[-50%] outline-none"
              onInteractOutside={(e) => e.preventDefault()}
            >
              <div className="bg-white rounded-xl shadow-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Save className="text-blue-600" size={20} />
                <Dialog.Title className="text-lg font-semibold text-slate-800 m-0">Lưu phiên bản Báo giá</Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <Button aria-label="Đóng" variant="ghost" className="p-1.5 h-8 w-8 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
                  <X className="w-5 h-5" />
                </Button>
              </Dialog.Close>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
                 Bạn đang lưu cấu hình giá hiện tại thành một <strong>Phiên bản lưu trữ</strong>. Phiên bản này sẽ được dùng để khôi phục hoặc so sánh sau này (có thể dùng sao chép cho khách hàng khác).
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                       <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                          <h4 className="text-sm font-bold text-slate-700">Chi tiết sản phẩm sẽ lưu ({products.length} mục)</h4>
                       </div>
                       <div className="overflow-x-auto">
                          <table className="w-full text-sm text-left">
                             <thead className="text-2xs uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200">
                                <tr>
                                   <th className="py-2 px-3 font-semibold w-12 text-center">STT</th>
                                   <th className="py-2 px-3 font-semibold">Mã SP</th>
                                   <th className="py-2 px-3 font-semibold">Tên SP</th>
                                   <th className="py-2 px-3 font-semibold text-right">SL</th>
                                   <th className="py-2 px-3 font-semibold text-center">ĐVT</th>
                                   <th className="py-2 px-3 font-semibold text-right">Đơn giá</th>
                                   <th className="py-2 px-3 font-semibold text-right">Thành tiền</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                                {products.length === 0 ? (
                                   <tr><td colSpan={7} className="py-8 text-center text-slate-400 italic">Không có sản phẩm</td></tr>
                                ) : products.map((p, i) => (
                                   <tr key={i} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2 px-3 text-slate-500 text-center">{i + 1}</td>
                                      <td className="py-2 px-3 text-slate-600 font-mono text-xs max-w-[100px] truncate" title={p.productId || (p as any).code}>{p.productId || (p as any).code || '-'}</td>
                                      <td className="py-2 px-3 text-slate-800 font-medium max-w-[200px] truncate" title={p.productName || (p as any).name}>{p.productName || (p as any).name}</td>
                                      <td className="py-2 px-3 text-slate-800 text-right">{p.quantity}</td>
                                      <td className="py-2 px-3 text-slate-500 text-center">{p.unit || '-'}</td>
                                      <td className="py-2 px-3 text-slate-700 text-right">{formatVietnameseCurrency(p.price || 0)}</td>
                                      <td className="py-2 px-3 text-slate-800 font-medium text-right">{formatVietnameseCurrency(p.total || ((p.price || 0) * (p.quantity || 1)))}</td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                       <div className="bg-slate-50 p-4 border-t border-slate-200">
                          <div className="flex flex-col gap-1 items-end text-sm">
                             <div className="flex justify-between w-64 text-slate-600">
                                <span>Tạm tính:</span>
                                <span className="font-medium">{formatVietnameseCurrency(subTotal)}</span>
                             </div>
                             {(discountRate > 0 || discountAmount > 0) && (
                               <div className="flex justify-between w-64 text-slate-600">
                                  <span>Chiết khấu {discountRate ? `(${discountRate}%)` : ''}:</span>
                                  <span className="font-medium text-red-600">-{formatVietnameseCurrency(discountAmount)}</span>
                               </div>
                             )}
                             {(vatRate > 0 || vatAmount > 0) && (
                               <div className="flex justify-between w-64 text-slate-600">
                                  <span>Thuế VAT {vatRate ? `(${vatRate}%)` : ''}:</span>
                                  <span className="font-medium">{formatVietnameseCurrency(vatAmount)}</span>
                               </div>
                             )}
                             <div className="flex justify-between w-64 text-slate-900 pt-2 mt-1 border-t border-slate-200">
                                <span className="font-bold">TỔNG CỘNG:</span>
                                <span className="font-bold text-blue-700 text-lg">{formatVietnameseCurrency(total)}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm space-y-4">
                       <h4 className="text-sm font-bold text-slate-700 border-b border-slate-100 pb-2">Thông tin phiên bản</h4>
                       
                       <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Khách hàng</label>
                          <div className="text-sm text-slate-900 font-medium bg-slate-50 p-2 rounded border border-slate-100">{quotation.tenKhachHang || 'Chưa xác định'}</div>
                       </div>

                       <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Tên phiên bản (Tùy chọn)</label>
                          <input 
                             type="text" 
                             value={name}
                             onChange={e => setName(e.target.value)}
                             placeholder={`VD: Bản lưu ${formatDate(new Date().toISOString())}`}
                             className="w-full text-sm border-slate-200 rounded-md shadow-sm bg-white p-2 border focus:ring-1 focus:ring-blue-500 outline-none"
                             autoFocus
                          />
                       </div>
                       
                       <div className="space-y-1">
                          <label className="text-xs font-semibold text-slate-700">Ghi chú thêm (Tùy chọn)</label>
                          <textarea 
                             value={note}
                             onChange={e => setNote(e.target.value)}
                             placeholder="Lý do lưu bản này, ghi chú đặc biệt về giá..."
                             rows={4}
                             className="w-full text-sm border-slate-200 rounded-md shadow-sm bg-white p-2 border focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                          />
                       </div>
                    </div>
                 </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
              <Dialog.Close asChild>
                <Button variant="secondary" onClick={onClose} disabled={isSaving}>Hủy thao tác</Button>
              </Dialog.Close>
              <Button variant="primary" onClick={handleSave} disabled={isSaving} isLoading={isSaving}>{isSaving ? 'Đang lưu...' : '+ Xác nhận Lưu Phiên bản'}</Button>
            </div>
          </div>
        </Dialog.Content>
          </>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
