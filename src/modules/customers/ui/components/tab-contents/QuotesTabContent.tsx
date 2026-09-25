import { Quotation } from '@/src/domain/schema/quotation.schema';
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import { ProductItem } from '@/src/domain/schema/product.schema';
import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { getStatusBadgeMeta } from '@/src/domain/enums/zns-status';
import { useDrawerStack } from '@/src/contexts/DrawerStackContext';
import { t } from '@/src/i18n/vi';

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
};

interface QuotesTabContentProps {
  loading: boolean;
  quotations: Quotation[];
}

export function QuotesTabContent({ loading, quotations }: QuotesTabContentProps) {
  const { openDrawer } = useDrawerStack();

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500 animate-pulse bg-white rounded-xl border">
        Đang tải báo giá...
      </div>
    );
  }

  if (quotations.length === 0) {
    return (
      <div className="p-8 text-center text-xs bg-slate-50/50 text-slate-550 rounded-xl border border-dashed border-slate-200">
        {t('empty.noQuoteDoc')}
      </div>
    );
  }

  const isMachineQuote = (q: Quotation) => {
    const typeLower = (q.loai || '').toLowerCase();
    if (typeLower.includes('máy') || typeLower.includes('may') || typeLower.includes('device') || typeLower.includes('equipment')) {
      return true;
    }
    if (q.products && Array.isArray(q.products)) {
      return q.products.some((p: ProductItem) => {
        const nameLower = (p.productName || '').toLowerCase();
        return nameLower.includes('máy') || nameLower.includes('may');
      });
    }
    return false;
  };

  const machineQuotes = quotations.filter(isMachineQuote);
  const materialQuotes = quotations.filter(q => !isMachineQuote(q));

  const renderQuoteCard = (q: Quotation) => {
    const znsMeta = getStatusBadgeMeta((q as any).trangThaiGuiTinBaoGia || (q as any).trangThaiGuiTin);
    const ZnsIcon = znsMeta.icon;

    return (
      <div 
        key={q.id} 
        onClick={() => openDrawer('quotation', q.id as string)}
        className="bg-white rounded-xl border border-slate-200 hover:border-slate-350 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-md transition-all cursor-pointer overflow-hidden group"
      >
        <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 group-hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-slate-500" />
            <span className="font-mono text-xs font-bold text-slate-805 group-hover:text-blue-600 transition-colors">{getEntityDisplayLabel('quotation', q)}</span>
            {q.ngayBaoGia && (
              <span className="text-xs text-slate-450 font-medium">({formatDate(q.ngayBaoGia)})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 select-none">
            <span className={`inline-flex items-center gap-1 h-5 px-1.5 rounded text-2xs font-semibold border ${znsMeta.color}`}>
              <ZnsIcon size={10} />
              <span>ZNS: {znsMeta.label}</span>
            </span>
            <span className="inline-flex items-center h-5 px-1.5 rounded text-2xs font-bold bg-slate-100 text-slate-705 border border-slate-205">
              {q.tinhTrangBaoGia || 'MỚI'}
            </span>
            <ExternalLink size={12} className="text-slate-450 group-hover:text-slate-650 ml-1 opacity-0 group-hover:opacity-100 transition-all" />
          </div>
        </div>
        
        <div className="p-4 space-y-3">
          {q.noiDungGhiChu && (
            <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <span className="font-semibold text-slate-700">Ghi chú:</span> {q.noiDungGhiChu}
            </p>
          )}

          {q.products && Array.isArray(q.products) && q.products.length > 0 && (
            <div className="rounded-lg border border-slate-100 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold text-2xs uppercase tracking-wide border-b border-slate-100">
                    <th className="p-2 pl-3">Sản phẩm</th>
                    <th className="p-2 text-center w-20">Số lượng</th>
                    <th className="p-2 text-right">Đơn giá</th>
                    <th className="p-2 text-right pr-3">Thành tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {q.products.map((p: ProductItem, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/45 text-slate-650">
                      <td className="p-2 pl-3 font-medium text-slate-800">{p.productName}</td>
                      <td className="p-2 text-center text-slate-500 font-mono text-2xs">{p.quantity} {p.unit || 'cái'}</td>
                      <td className="p-2 text-right text-slate-550 font-mono text-2xs">{formatCurrency(p.price || 0)}</td>
                      <td className="p-2 text-right pr-3 text-slate-950 font-bold font-mono text-2xs">{formatCurrency(p.total || ((p.price || 0) * p.quantity))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-1 bg-white select-none">
            <div className="text-right">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide mr-1.5">Tổng giá trị:</span>
              <span className="text-sm font-extrabold text-blue-650 font-mono">{formatCurrency(q.totalAmount || q.totalAmount || 0)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {machineQuotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Báo giá máy (Cần qua Hợp đồng)
            </h4>
            <span className="text-2xs bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-mono font-bold border border-blue-100">{machineQuotes.length}</span>
          </div>
          <div className="space-y-3">
            {machineQuotes.map(renderQuoteCard)}
          </div>
        </div>
      )}

      {materialQuotes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 select-none">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Báo giá vật tư & dịch vụ (Không qua Hợp đồng)
            </h4>
            <span className="text-2xs bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-mono font-bold border border-emerald-100">{materialQuotes.length}</span>
          </div>
          <div className="space-y-3">
            {materialQuotes.map(renderQuoteCard)}
          </div>
        </div>
      )}
    </div>
  );
}
