import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Button } from '@/src/design-system/Button';
import { FileText, Copy, Send, Trash2, Zap } from 'lucide-react';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
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
  const navigate = useNavigate();
  const isBgMay = normalizeLoai(quotation.loai) === QUOTATION_LOAI.MAY;
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
        {!isBgMay && quotation?.id && (
          <Button 
            aria-label="Lập phiếu thu" 
            variant="ghost"
            size="sm"
            className="px-3 h-9 font-bold text-xs text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5"
            onClick={() => navigate(`/payments?fromQuotation=${quotation.id}`)}
            leftIcon={<Zap size={13} className="text-blue-600" />}
          >
            Lập Phiếu Thu
          </Button>
        )}

        <Button 
          aria-label="Trình gửi Zalo" 
          variant="primary"
          size="sm"
          className="px-4 h-9 font-bold text-xs flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
          onClick={handleSendZnsWithLock}
          disabled={isZnsLocked}
          leftIcon={<Send size={12} />}
        >
          <span>{isZnsLocked ? 'Đang gửi...' : 'Gửi ZNS'}</span>
          <span className="text-3xs font-mono px-1.5 py-0.5 rounded-full bg-blue-500/30 text-blue-100 border border-blue-400/30">#647061</span>
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
