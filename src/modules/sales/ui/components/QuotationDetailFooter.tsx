import React from 'react';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Button } from '@/src/design-system/Button';
import { FileText, Copy, Send, Trash2 } from 'lucide-react';
const ExportQuotationPdf = React.lazy(() => import('./ExportQuotationPdf').then(m => ({ default: m.ExportQuotationPdf })));

interface QuotationDetailFooterProps {
  quotation: Quotation;
  isZnsLocked: boolean;
  onEdit: (quotation: Quotation) => void;
  handleDuplicate: () => void;
  handleSendZnsWithLock: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function QuotationDetailFooter({
  quotation,
  isZnsLocked,
  onEdit,
  handleDuplicate,
  handleSendZnsWithLock,
  onDelete
}: QuotationDetailFooterProps) {
  return (
    <div className="flex items-center justify-between w-full relative z-30 px-2">
      <div className="flex items-center gap-2">
        <Button 
          aria-label="Edit" 
          variant="ghost"
          onClick={() => onEdit(quotation)} 
          className="text-slate-700 hover:bg-slate-100 px-3 h-9 rounded-lg font-bold text-xs flex items-center gap-1.5"
        >
          <FileText size={14} /> Chỉnh sửa
        </Button>
        
        <Button 
          aria-label="Duplicate" 
          variant="ghost"
          onClick={handleDuplicate}
          className="text-slate-700 hover:bg-slate-100 px-3 h-9 rounded-lg font-bold text-xs flex items-center gap-1.5"
        >
          <Copy size={14} /> Nhân bản
        </Button>
 
        <React.Suspense fallback={
          <div className="h-9 px-3 text-slate-500 select-none animate-pulse flex items-center text-xs">...</div>
        }>
          <ExportQuotationPdf 
            quotation={quotation} 
            variant="ghost"
            className="text-slate-700 hover:bg-slate-100 px-3 h-9 rounded-lg font-bold text-xs flex items-center gap-1.5"
            label="In / PDF"
          />
        </React.Suspense>
      </div>

      <div className="flex items-center gap-2">
 
        <Button 
          aria-label="Trình gửi Zalo" 
          variant="primary"
          size="sm"
          className="px-5 h-9 font-bold text-xs"
          onClick={handleSendZnsWithLock}
          disabled={isZnsLocked}
          leftIcon={<Send size={12} />}
        >
          {isZnsLocked ? 'Đang gửi...' : 'Gửi ZNS'}
        </Button>

        <span className="w-px h-4 bg-slate-200 mx-1"></span>

        <Button 
          aria-label="Delete" 
          variant="ghost"
          size="sm"
          iconOnly
          onClick={() => onDelete(quotation.id as string)}
          className="w-9 h-9 text-slate-500 hover:bg-red-50 hover:text-red-700"
          title="Xóa báo giá"
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}
