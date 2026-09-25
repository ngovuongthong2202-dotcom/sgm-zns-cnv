import React, { useState } from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Button } from '@/src/design-system/Button';
import { format } from 'date-fns';
import { FileText, Eye, Rewind, Copy, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { QuotationRevisionCompareModal } from './QuotationRevisionCompareModal';
import { notify } from '@/src/shared/utils/notify';
import { useConfirm } from '@/src/design-system/Confirm';
import { t } from '@/src/i18n/vi';

interface Props {
   quotation: Quotation;
   onRestore?: (rev: any) => void;
   onCreateRevision?: () => void;
   onDeleteRevision?: (revId: string) => void;
   onDuplicateRevision?: (rev: any) => void;
}

export function QuotationRevisionsPanel({ quotation, onRestore, onCreateRevision, onDeleteRevision, onDuplicateRevision }: Props) {
   const [compareRevision, setCompareRevision] = useState<any>(null);
   const [showDiff, setShowDiff] = useState(false);
   const { confirm } = useConfirm();

   const revisions = quotation.revisions || [];

   const handleCompare = (rev: any) => {
      setCompareRevision(rev);
      setShowDiff(true);
   };

   return (
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
         <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
            <div>
               <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText size={16} className="text-blue-600" /> Lịch sử thay đổi (Phiên bản)
               </h4>
               <p className="text-xs text-slate-500 mt-1">Lưu trữ các thay đổi về giá, sản phẩm trong quá trình thương lượng. Có thể sử dụng lại cho khách hàng khác.</p>
            </div>
            {onCreateRevision && (
                <Button size="sm" onClick={onCreateRevision} className="h-8">
                   + Lưu bản hiện tại
                </Button>
            )}
         </div>

         <div className="space-y-3">
            {revisions.length === 0 ? (
               <div className="text-center py-6 text-sm text-slate-400 italic">{t('empty.noData')}</div>
            ) : (
               [...revisions].reverse().map((rev, idx) => {
                  const total = rev.totalAmount !== undefined ? rev.totalAmount : rev.products.reduce((acc: number, p: any) => acc + (p.total || ((p.price||0)*(p.quantity||1))), 0);
                  return (
                     <div key={rev.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-blue-100 group transition-all">
                        <div>
                           <div className="font-bold text-slate-800 text-sm">
                              {rev.name || `Phiên bản đổi giá #${revisions.length - idx}`}
                              <span className="ml-2 text-2xs font-normal text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                                 {format(new Date(rev.createdAt), 'dd/MM/yyyy HH:mm')}
                              </span>
                           </div>
                           <div className="text-xs text-slate-600 mt-1 flex items-center gap-3">
                              <span>Người sửa: {rev.createdBy}</span>
                              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                              <span className="font-medium text-emerald-700">Tổng giá trị: {formatCurrency(total)}</span>
                           </div>
                           {rev.note && rev.note !== rev.name && <div className="text-xs text-amber-700 mt-1 border-l-2 border-amber-300 pl-2 opacity-80">{rev.note}</div>}
                        </div>
                        <div className="flex items-center gap-2 mt-3 sm:mt-0 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap justify-end">
                           <Button size="sm" variant="ghost" onClick={() => handleCompare(rev)} className="text-xs h-8 text-blue-700 hover:bg-blue-50" title="So sánh bản này với bảng giá hiện tại đang chọn">
                              <Eye size={14} className="mr-1 hidden md:block" /> So sánh
                           </Button>
                           <Button size="sm" variant="ghost" 
                              onClick={async () => {
                                 const isConfirmed = await confirm({
                                     title: 'Khôi phục cấu hình giá',
                                     message: `Bạn có chắc chắn muốn khôi phục sản phẩm, số lượng và thành tiền từ bản "${rev.name || `Phiên bản lưu #${revisions.length - idx}`}" đè lên bảng giá đang soạn hiện tại không?\n\nTổng Tiền mới sẽ là: ${formatCurrency(total)}`,
                                     confirmText: 'Chấp nhận khôi phục',
                                     cancelText: 'Hủy'
                                 });
                                 if (isConfirmed) {
                                    onRestore?.(rev);
                                    notify.success('Đã áp dụng cấu hình giá từ bản lưu');
                                 }
                              }} 
                              className="text-xs h-8 text-amber-700 hover:bg-amber-50" title="Apply bảng giá này vào BG hiện tại">
                              <Rewind size={14} className="mr-1 hidden md:block" /> Khôi phục
                           </Button>
                           {onDuplicateRevision && (
                              <Button size="sm" variant="ghost" 
                                 onClick={() => onDuplicateRevision(rev)} 
                                 className="text-xs h-8 text-emerald-700 hover:bg-emerald-50" title="Tạo Quotation mới hoàn toàn cho khách khác với cấu hình giá từ bản này">
                                 <Copy size={14} className="mr-1 hidden md:block" /> Dùng cho KH khác
                              </Button>
                           )}
                           {onDeleteRevision && (
                              <Button size="sm" variant="ghost" 
                                 onClick={async () => {
                                      const isConfirmed = await confirm({
                                           title: 'Xóa phiên bản lưu',
                                           message: `Bạn có chắc chắn muốn xóa vĩnh viễn cấu hình giá lưu trữ "${rev.name || `Phiên bản #${revisions.length - idx}`}" không?`,
                                           confirmText: 'Xóa vĩnh viễn',
                                           cancelText: 'Hủy bỏ'
                                      });
                                      if (isConfirmed) onDeleteRevision(rev.id);
                                 }} 
                                 className="text-xs h-8 text-red-600 hover:bg-red-50" title="Xóa bản lưu này">
                                 <Trash2 size={14} />
                              </Button>
                           )}
                        </div>
                     </div>
                  )
               })
            )}
         </div>

         {showDiff && (
            <QuotationRevisionCompareModal 
               isOpen={showDiff} 
               onClose={() => setShowDiff(false)} 
               quotation={quotation}
               revision={compareRevision}
            />
         )}
      </div>
   )
}
