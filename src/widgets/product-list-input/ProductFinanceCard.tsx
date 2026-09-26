import React from 'react';
import { Trash } from 'lucide-react';
import { Button } from '@/src/design-system';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { ProductBaoHanhFields } from './ProductBaoHanhFields';
import { FinancialEngine } from '@/src/shared/utils/financialEngine';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { MachineCodeChipInput } from '@/src/modules/contracts/ui/components/MachineCodeChipInput';

interface ProductFinanceCardProps {
  key?: React.Key;
  product: ProductItem;
  index: number;
  maxQ?: number;
  readOnly?: boolean;
  disabled?: boolean;
  hideAddRemove?: boolean;
  allowEditProductId?: boolean;
  showBaoHanh?: boolean;
  showSerial?: boolean;
  allContracts?: any[];
  onUpdate: <K extends keyof ProductItem>(index: number, field: K, value: ProductItem[K]) => void;
  onRemove: (index: number) => void;
}

export function ProductFinanceCard({
  product: p,
  index: idx,
  maxQ,
  readOnly,
  disabled,
  hideAddRemove,
  allowEditProductId,
  showBaoHanh,
  showSerial,
  allContracts,
  onUpdate,
  onRemove
}: ProductFinanceCardProps) {
  // Proactive Reactive Projection: Đảm bảo hiển thị tức thì, không bị kẹt số 0
  const computed = React.useMemo(() => computeLineItem(p), [p]);
  const isPromo = computed.price === 0 && Boolean(computed.productName || computed.productId);

  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl mb-3 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] overflow-hidden lg:hidden">
      {!readOnly && !hideAddRemove && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          iconOnly
          title="Xóa"
          aria-label="Xóa"
          onClick={() => onRemove(idx)}
          className="absolute top-2 right-2 z-10 p-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white rounded-md transition-all shadow-sm"
        >
          <Trash size={14} />
        </Button>
      )}

      {/* Mobile Card Layout */}
      <div className="p-3 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="shrink-0 px-2 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded font-mono">
            #{p.stt || idx + 1}
          </span>
          <input type="text"
            placeholder="Mã SP"
            value={p.productId}
            onChange={(e) => onUpdate(idx, 'productId', e.target.value)}
            readOnly={(readOnly && !allowEditProductId) || disabled}
            className="w-1/3 text-xs font-mono font-bold text-blue-600 bg-white border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
          />
          <div className="w-2/3 flex items-center gap-1.5">
            <input type="text"
              placeholder="Tên sản phẩm"
              value={p.productName}
              onChange={(e) => onUpdate(idx, 'productName', e.target.value)}
              readOnly={readOnly || disabled}
              className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
            />
            {isPromo && (
              <span className="shrink-0 px-1 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-bold rounded border border-emerald-200 uppercase tracking-wider">
                Tặng
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <input type="number"
            placeholder="SL"
            value={p.quantity}
            onChange={(e) => onUpdate(idx, 'quantity', parseInt(e.target.value) || 0)}
            readOnly={(readOnly && maxQ === undefined) || disabled}
            className="w-1/4 text-xs font-bold text-center text-slate-800 bg-white border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
          />
          <input type="text"
            placeholder="ĐVT"
            value={p.unit}
            onChange={(e) => onUpdate(idx, 'unit', e.target.value)}
            readOnly={readOnly || disabled}
            className="w-1/4 text-xs font-medium text-center text-slate-600 bg-white border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
          />
          <input type="text"
            placeholder="Đơn giá"
            value={p.price ? FinancialEngine.formatVND(p.price) : (p.price === 0 ? '0' : '')}
            onChange={(e) => {
              const newPrice = FinancialEngine.toInteger(e.target.value);
              onUpdate(idx, 'price', newPrice);
            }}
            readOnly={readOnly || disabled}
            className="w-2/4 text-xs font-bold text-right text-slate-800 bg-white border border-slate-200 rounded p-1.5 outline-none focus:border-blue-400"
          />
        </div>
        <div className="mt-2 text-2xs font-mono font-semibold text-slate-500 flex justify-between bg-white p-1.5 rounded border border-slate-100">
           <span>TRƯỚC THUẾ:</span>
           <span className="text-slate-800">{FinancialEngine.formatVND(computed.subtotalBeforeTax)} ₫</span>
        </div>
      </div>

      <div className="bg-white p-3 grid grid-cols-2 gap-3">
         {/* Chiết khấu */}
         <div className="space-y-1 bg-amber-50/30 p-2 rounded border border-amber-100">
            <label className="text-2xs font-bold text-amber-700 uppercase">Chiết khấu (% & Tiền)</label>
            <div className="flex gap-1">
                <input type="number" placeholder="%"
                value={p.discountPct ?? ''}
                onChange={(e) => onUpdate(idx, 'discountPct', e.target.value ? FinancialEngine.toFloat(e.target.value) : undefined)}
                readOnly={readOnly || disabled}
                className="w-10 text-xs font-medium text-center bg-white border border-slate-200 rounded p-1 outline-none focus:border-amber-400"
              />
              <input type="text"
                placeholder="Tiền Disc"
                value={p.discountAmount ? FinancialEngine.formatVND(p.discountAmount) : ''}
                onChange={(e) => {
                  const newDisc = FinancialEngine.toInteger(e.target.value);
                  onUpdate(idx, 'discountAmount', newDisc || undefined);
                }}
                readOnly={readOnly || disabled}
                className="flex-1 text-xs font-medium text-right text-amber-700 bg-white border border-slate-200 rounded p-1 outline-none focus:border-amber-400"
              />
            </div>
         </div>

         {/* VAT */}
         <div className="space-y-1 bg-sky-50/30 p-2 rounded border border-sky-100">
            <label className="text-2xs font-bold text-sky-700 uppercase">Thuế VAT (% & Tiền)</label>
            <div className="flex flex-col gap-1">
               <div className="flex gap-1">
                 <span className="text-xs text-sky-600 bg-white px-1 border border-slate-100 rounded flex items-center justify-center font-mono w-10">%</span>
                 <input type="number"
                  placeholder="%"
                  value={p.vatPct ?? ''}
                  onChange={(e) => onUpdate(idx, 'vatPct', e.target.value ? parseFloat(e.target.value) : undefined)}
                  readOnly={readOnly || disabled}
                  className="flex-1 text-xs font-medium text-center bg-white border border-slate-200 rounded p-1 outline-none focus:border-sky-400"
                />
               </div>
               <div className="text-2xs font-mono font-medium text-right text-slate-500 mt-0.5">
                 +{new Intl.NumberFormat('vi-VN').format(computed.taxAmount || 0)} đ
               </div>
            </div>
         </div>
      </div>
      
      <div className="px-3 pb-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2.5 flex justify-between items-center shadow-sm">
           <span className="text-2xs font-bold text-blue-800 uppercase tracking-tight">Thu (Sau Thuế)</span>
           <span className="text-sm font-black text-blue-700">
             {new Intl.NumberFormat('vi-VN').format(computed.subtotalAfterTax || 0)} ₫
           </span>
        </div>
        {maxQ !== undefined && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${Math.min(((p.quantity || 0) / maxQ) * 100, 100)}%` }} />
            </div>
            <span className="text-3xs font-bold text-slate-600 uppercase">Còn lại: {maxQ}</span>
          </div>
        )}
        {showBaoHanh && (
          <ProductBaoHanhFields product={p} viewType="card" disabled={disabled} onChange={(field, val) => onUpdate(idx, field, val === null ? undefined : val as any)} />
        )}
        {showSerial && (
          <div className="mt-3 pt-2.5 border-t border-slate-100">
            <span className="text-3xs font-bold text-slate-600 uppercase tracking-wider block mb-1">
              Mã máy / Serial ({p.danhSachMaMay?.length || 0}/{p.quantity || 0} {p.unit || 'Máy'}):
            </span>
            <MachineCodeChipInput
              value={p.danhSachMaMay || []}
              onChange={(codes) => onUpdate(idx, 'danhSachMaMay', codes)}
              allContracts={allContracts}
            />
          </div>
        )}
      </div>
    </div>
  );
}
