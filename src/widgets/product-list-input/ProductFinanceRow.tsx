import React from 'react';
import { Trash } from 'lucide-react';
import { Button } from '@/src/design-system';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { ProductBaoHanhFields } from './ProductBaoHanhFields';
import { FinancialEngine } from '@/src/shared/utils/financialEngine';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { MachineCodeChipInput } from '@/src/modules/contracts/ui/components/MachineCodeChipInput';

interface ProductFinanceRowProps {
  key?: React.Key;
  product: ProductItem;
  index: number;
  maxQ?: number;
  readOnly?: boolean;
  disabled?: boolean;
  hideAddRemove?: boolean;
  showBaoHanh?: boolean;
  showSerial?: boolean;
  allContracts?: any[];
  onUpdate: <K extends keyof ProductItem>(index: number, field: K, value: ProductItem[K]) => void;
  onRemove: (index: number) => void;
}

export function ProductFinanceRow({
  product: p,
  index: idx,
  maxQ,
  readOnly,
  disabled,
  hideAddRemove,
  showBaoHanh,
  showSerial,
  allContracts,
  onUpdate,
  onRemove
}: ProductFinanceRowProps) {
  // Proactive Reactive Projection: Đảm bảo số liệu tài chính luôn được tính toán trực tiếp, không kẹt 0
  const computed = React.useMemo(() => computeLineItem(p), [p]);
  const isPromo = computed.price === 0 && Boolean(computed.productName || computed.productId);

  return (
    <React.Fragment>
      <tr className="group bg-white hover:bg-slate-50 transition-colors border-b border-slate-100">
        {/* STT */}
        <td className="p-3 align-top text-center w-[50px] font-bold text-slate-500 text-xs">
          {p.stt || idx + 1}
        </td>

        {/* Product Info */}
        <td className="p-3 align-top min-w-[280px]">
           <div className="flex flex-col gap-1.5 focus-within:ring-1 focus-within:ring-blue-100 rounded-md">
              <input type="text" placeholder="Mã SP"
                value={p.productId} onChange={e => onUpdate(idx, 'productId', e.target.value)}
                readOnly={readOnly || disabled}
                className="w-full text-xs font-mono font-bold text-blue-600 bg-transparent outline-none placeholder:text-blue-300"
              />
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Tên sản phẩm"
                  value={p.productName} onChange={e => onUpdate(idx, 'productName', e.target.value)}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-slate-800 bg-transparent outline-none placeholder:text-slate-400"
                />
                {isPromo && (
                  <span className="shrink-0 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-bold rounded border border-emerald-200 uppercase tracking-wider">
                    Tặng kèm
                  </span>
                )}
              </div>
              <input type="text" placeholder="Ghi chú thêm..."
                value={p.ghiChu || ''} onChange={e => onUpdate(idx, 'ghiChu', e.target.value)}
                readOnly={readOnly || disabled}
                className="w-full text-2xs italic text-slate-500 bg-transparent outline-none placeholder:text-slate-300"
              />
           </div>
           {showBaoHanh && (
             <ProductBaoHanhFields product={p} viewType="table" disabled={disabled} onChange={(f, v) => onUpdate(idx, f, v === null ? undefined : v as any)} />
           )}
           {showSerial && (
             <div className="mt-2 pt-2 border-t border-slate-100">
               <div className="flex items-center justify-between mb-1">
                 <span className="text-3xs font-bold text-slate-600 uppercase tracking-wider">
                   Mã máy / Serial ({p.danhSachMaMay?.length || 0}/{p.quantity || 0} {p.unit || 'Máy'}):
                 </span>
               </div>
               <MachineCodeChipInput 
                 value={p.danhSachMaMay || []}
                 onChange={(codes) => onUpdate(idx, 'danhSachMaMay', codes)}
                 allContracts={allContracts}
               />
             </div>
           )}
        </td>

        {/* Quantity & Unit */}
        <td className="p-3 align-top w-[90px]">
           <div className="flex flex-col gap-1.5">
              <input type="number" placeholder="SL"
                value={p.quantity} onChange={e => onUpdate(idx, 'quantity', parseInt(e.target.value)||0)}
                readOnly={readOnly || disabled}
                className="w-full text-sm font-bold text-center text-slate-800 border border-slate-200 rounded p-1 outline-none focus:border-blue-400 bg-white"
              />
              <input type="text" placeholder="ĐVT"
                value={p.unit} onChange={e => onUpdate(idx, 'unit', e.target.value)}
                readOnly={readOnly || disabled}
                className="w-full text-xs font-medium text-center text-slate-500 border border-slate-200 rounded p-1 outline-none focus:border-blue-400 bg-white"
              />
           </div>
        </td>

        {/* Price & Gross */}
        <td className="p-3 align-top w-[140px]">
           <div className="flex flex-col gap-1.5">
              <div className="relative">
                <input type="text" placeholder="Đơn giá"
                  value={p.price ? FinancialEngine.formatVND(p.price) : (p.price === 0 ? '0' : '')}
                  onChange={(e) => {
                    const val = FinancialEngine.toInteger(e.target.value);
                    onUpdate(idx, 'price', val);
                  }}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-right text-slate-800 border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400 bg-white pr-2"
                />
              </div>
              <div className="text-right bg-slate-50 border border-slate-100 rounded px-2 py-1 flex flex-col justify-center">
                 <span className="text-3xs font-bold text-slate-400 uppercase leading-none mb-1">Trị giá H.Hóa</span>
                 <span className="text-xs font-bold text-slate-700 leading-none">
                   {FinancialEngine.formatVND(computed.subtotalBeforeTax)} ₫
                 </span>
              </div>
           </div>
        </td>

        {/* Discount */}
        <td className="p-3 align-top w-[120px] bg-amber-50/20">
           <div className="flex flex-col gap-1.5">
              <div className="flex relative">
                <input type="number" placeholder="%"
                  value={p.discountPct ?? ''} onChange={e => onUpdate(idx, 'discountPct', e.target.value ? FinancialEngine.toFloat(e.target.value) : undefined)}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-center text-amber-700 border border-amber-200 rounded p-1.5 outline-none focus:border-amber-400 bg-white"
                />
                <span className="absolute right-2 top-1.5 text-xs text-amber-400 pointer-events-none">%</span>
              </div>
              <div className="relative">
                <input type="text" placeholder="Trừ tiền"
                  value={p.discountAmount ? FinancialEngine.formatVND(p.discountAmount) : ''}
                  onChange={(e) => {
                    const val = FinancialEngine.toInteger(e.target.value);
                    onUpdate(idx, 'discountAmount', val || undefined);
                  }}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-right text-amber-700 border border-amber-200 rounded p-1.5 outline-none focus:border-amber-400 bg-white"
                />
              </div>
           </div>
        </td>

        {/* VAT */}
        <td className="p-3 align-top w-[110px] bg-sky-50/20">
           <div className="flex flex-col gap-1.5">
              <div className="flex relative">
                <input type="number" placeholder="%"
                  value={p.vatPct ?? ''} onChange={e => onUpdate(idx, 'vatPct', e.target.value ? parseFloat(e.target.value) : undefined)}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-center text-sky-700 border border-sky-200 rounded p-1.5 outline-none focus:border-sky-400 bg-white"
                />
                <span className="absolute right-2 top-1.5 text-xs text-sky-400 pointer-events-none">%</span>
              </div>
              <div className="text-right border border-sky-100 rounded bg-white px-2 py-1.5 flex flex-col justify-center">
                 <span className="text-2xs font-mono font-bold text-sky-700 leading-none">
                   +{new Intl.NumberFormat('vi-VN').format(computed.taxAmount || 0)}
                 </span>
              </div>
           </div>
        </td>

        {/* Total */}
        <td className="p-3 align-top w-[140px]">
           <div className="h-full min-h-[64px] bg-blue-50 border border-blue-100 rounded-lg flex flex-col justify-center items-end px-3 py-2">
              <span className="text-3xs font-bold text-blue-600/70 uppercase">Thu (Sau thuế)</span>
              <span className="text-sm font-black tracking-tight text-blue-700 mt-0.5">
                {new Intl.NumberFormat('vi-VN').format(computed.subtotalAfterTax || 0)} ₫
              </span>
           </div>
        </td>

        {/* Actions */}
        <td className="p-3 align-middle text-center w-[40px]">
           {!readOnly && !hideAddRemove && !disabled && (
             <Button
               type="button" 
               variant="ghost"
               size="xs"
               iconOnly
               title="Xóa" 
               aria-label="Xóa"
               onClick={() => onRemove(idx)}
               className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
             >
               <Trash size={14} />
             </Button>
           )}
        </td>
      </tr>
      {maxQ !== undefined && (
        <tr>
           <td colSpan={8} className="px-3 pb-2 -mt-1 bg-white border-b border-slate-100">
              <div className="flex items-center gap-2 max-w-sm">
                <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(((p.quantity || 0) / maxQ) * 100, 100)}%` }} />
                </div>
                <span className="text-3xs font-bold text-slate-500 uppercase">Còn lại: {maxQ}</span>
              </div>
           </td>
        </tr>
      )}
    </React.Fragment>
  );
}
