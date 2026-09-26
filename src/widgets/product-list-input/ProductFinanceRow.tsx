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
      <tr className="group bg-white hover:bg-slate-50/70 transition-colors border-b border-slate-100">
        {/* STT */}
        <td className="p-3 align-top text-center w-[48px] font-bold text-slate-500 font-mono text-xs">
          {p.stt || idx + 1}
        </td>

        {/* Product Info */}
        <td className="p-3 align-top min-w-[260px]">
           <div className="flex flex-col gap-1.5 focus-within:ring-1 focus-within:ring-blue-100 rounded-md">
              <div className="flex items-center gap-2">
                <input type="text" placeholder="Mã SP"
                  value={p.productId || ''} onChange={e => onUpdate(idx, 'productId', e.target.value)}
                  readOnly={readOnly || disabled}
                  className="w-28 text-xs font-mono font-bold text-blue-700 bg-blue-50/70 border border-blue-200/80 rounded px-2 py-0.5 outline-none focus:border-blue-400 placeholder:text-blue-300"
                />
                {isPromo && (
                  <span className="shrink-0 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-bold rounded border border-emerald-200 uppercase tracking-wider">
                    Tặng kèm
                  </span>
                )}
              </div>
              <input type="text" placeholder="Tên sản phẩm / quy cách..."
                value={p.productName || ''} onChange={e => onUpdate(idx, 'productName', e.target.value)}
                readOnly={readOnly || disabled}
                className="w-full text-xs font-bold text-slate-900 border border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:bg-white rounded px-2 py-1 outline-none transition-all placeholder:text-slate-400 bg-white"
              />
              <input type="text" placeholder="Ghi chú thêm..."
                value={p.ghiChu || ''} onChange={e => onUpdate(idx, 'ghiChu', e.target.value)}
                readOnly={readOnly || disabled}
                className="w-full text-2xs italic text-slate-500 border border-slate-100 hover:border-slate-200 focus:border-blue-400 focus:bg-white rounded px-2 py-0.5 outline-none transition-all placeholder:text-slate-300 bg-white/70"
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
                className="w-full text-xs font-bold text-center text-slate-800 border border-slate-200 rounded p-1 outline-none focus:border-blue-400 bg-white font-mono"
              />
              <input type="text" placeholder="ĐVT"
                value={p.unit} onChange={e => onUpdate(idx, 'unit', e.target.value)}
                readOnly={readOnly || disabled}
                className="w-full text-2xs font-medium text-center text-slate-500 border border-slate-200 rounded p-0.5 outline-none focus:border-blue-400 bg-white"
              />
           </div>
        </td>

        {/* Price & Gross */}
        <td className="p-3 align-top w-[130px]">
           <div className="flex flex-col gap-1">
              <input type="text" placeholder="Đơn giá"
                value={p.price ? FinancialEngine.formatVND(p.price) : (p.price === 0 ? '0' : '')}
                onChange={(e) => {
                  const val = FinancialEngine.toInteger(e.target.value);
                  onUpdate(idx, 'price', val);
                }}
                readOnly={readOnly || disabled}
                className="w-full text-xs font-bold text-right text-slate-800 border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400 bg-white pr-2 font-mono"
              />
              <div className="text-right px-1 flex flex-col justify-center">
                 <span className="text-3xs font-semibold text-slate-400 uppercase leading-none">Tạm tính:</span>
                 <span className="text-2xs font-bold text-slate-600 font-mono mt-0.5">
                   {FinancialEngine.formatVND(computed.subtotalBeforeTax)} ₫
                 </span>
              </div>
           </div>
        </td>

        {/* Discount */}
        <td className="p-3 align-top w-[115px] bg-amber-50/15">
           <div className="flex flex-col gap-1">
              <div className="flex relative">
                <input type="number" placeholder="%"
                  value={p.discountPct ?? ''} onChange={e => onUpdate(idx, 'discountPct', e.target.value ? FinancialEngine.toFloat(e.target.value) : undefined)}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-center text-amber-700 border border-amber-200/80 rounded p-1 outline-none focus:border-amber-400 bg-white font-mono"
                />
                <span className="absolute right-2 top-1 text-2xs text-amber-400 pointer-events-none">%</span>
              </div>
              <input type="text" placeholder="Trừ tiền"
                value={p.discountAmount ? FinancialEngine.formatVND(p.discountAmount) : ''}
                onChange={(e) => {
                  const val = FinancialEngine.toInteger(e.target.value);
                  onUpdate(idx, 'discountAmount', val || undefined);
                }}
                readOnly={readOnly || disabled}
                className="w-full text-xs font-bold text-right text-amber-700 border border-amber-200/80 rounded p-1 outline-none focus:border-amber-400 bg-white font-mono pr-1.5"
              />
           </div>
        </td>

        {/* VAT */}
        <td className="p-3 align-top w-[105px] bg-sky-50/15">
           <div className="flex flex-col gap-1">
              <div className="flex relative">
                <input type="number" placeholder="%"
                  value={p.vatPct ?? ''} onChange={e => onUpdate(idx, 'vatPct', e.target.value ? parseFloat(e.target.value) : undefined)}
                  readOnly={readOnly || disabled}
                  className="w-full text-xs font-bold text-center text-sky-700 border border-sky-200/80 rounded p-1 outline-none focus:border-sky-400 bg-white font-mono"
                />
                <span className="absolute right-2 top-1 text-2xs text-sky-400 pointer-events-none">%</span>
              </div>
              <div className="text-right px-1 font-mono text-3xs font-bold text-sky-700">
                +{new Intl.NumberFormat('vi-VN').format(computed.taxAmount || 0)} ₫
              </div>
           </div>
        </td>

        {/* Total */}
        <td className="p-3 align-top text-right w-[140px] whitespace-nowrap">
           <div className="flex flex-col items-end justify-center py-1">
              <span className="font-mono font-black text-slate-900 text-xs md:text-sm">
                {new Intl.NumberFormat('vi-VN').format(computed.subtotalAfterTax || 0)} ₫
              </span>
              <span className="text-3xs text-slate-400 font-medium mt-0.5">Sau thuế & CK</span>
           </div>
        </td>

        {/* Actions */}
        <td className="p-3 align-top text-center w-[40px]">
           {!readOnly && !hideAddRemove && !disabled && (
             <Button
               type="button" 
               variant="ghost"
               size="xs"
               iconOnly
               title="Xóa dòng" 
               aria-label="Xóa dòng"
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
