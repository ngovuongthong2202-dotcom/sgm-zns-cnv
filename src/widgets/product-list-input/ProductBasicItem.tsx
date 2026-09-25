import React from 'react';
import { Hash, Type, Boxes, Trash } from 'lucide-react';
import { Button } from '@/src/design-system';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { ProductBaoHanhFields } from './ProductBaoHanhFields';
import { FinancialEngine } from '@/src/shared/utils/financialEngine';

interface ProductBasicItemProps {
  key?: React.Key;
  product: ProductItem;
  index: number;
  maxQ?: number;
  readOnly?: boolean;
  disabled?: boolean;
  hideAddRemove?: boolean;
  allowEditProductId?: boolean;
  showPrice?: boolean;
  showBaoHanh?: boolean;
  onUpdate: <K extends keyof ProductItem>(index: number, field: K, value: ProductItem[K]) => void;
  onRemove: (index: number) => void;
}

export function ProductBasicItem({
  product: p,
  index: idx,
  maxQ,
  readOnly,
  disabled,
  hideAddRemove,
  allowEditProductId,
  showPrice,
  showBaoHanh,
  onUpdate,
  onRemove
}: ProductBasicItemProps) {
  return (
    <div className="group relative bg-white border md:border-b-0 border-brand-border md:border-transparent md:border-b-brand-border/50 rounded-2xl md:rounded-none p-4 transition-all hover:bg-slate-50/50">
      <div className={`grid ${showPrice ? 'grid-cols-12' : 'grid-cols-12'} gap-3 lg:gap-4 items-start`}>
        <div className={`${showPrice ? 'col-span-12 md:col-span-2' : 'col-span-3'} space-y-1`}>
          <label className="md:hidden text-2xs font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1">
            <Hash size={10} /> Mã SP
          </label>
          <input aria-label="Nhập thông tin"
            type="text"
            value={p.productId}
            onChange={(e) => onUpdate(idx, 'productId', e.target.value)}
            readOnly={(readOnly && !allowEditProductId) || disabled}
            placeholder="Mã SP"
            className={`w-full text-xs font-mono font-bold text-brand-accent ${(readOnly && !allowEditProductId) || disabled ? 'bg-slate-50/30' : 'bg-white'} border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-accent p-2 md:h-[38px] disabled:opacity-70`}
          />
        </div>
        <div className={`${showPrice ? 'col-span-12 md:col-span-3' : 'col-span-4'} space-y-1`}>
          <label className="md:hidden text-2xs font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1">
            <Type size={10} /> Tên sản phẩm
          </label>
          <input aria-label="Nhập thông tin"
            type="text"
            value={p.productName}
            onChange={(e) => onUpdate(idx, 'productName', e.target.value)}
            readOnly={readOnly || disabled}
            placeholder="Tên sản phẩm..."
            className={`w-full text-xs font-medium text-slate-900 ${readOnly || disabled ? 'bg-slate-50/30' : 'bg-white'} border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-accent p-2 md:h-[38px] disabled:opacity-70`}
          />
        </div>
        <div className={`${showPrice ? 'col-span-3 md:col-span-1' : 'col-span-2'} space-y-1`}>
          <label className="md:hidden text-2xs font-bold text-slate-600 uppercase tracking-tight flex items-center gap-1">
            <Boxes size={10} /> SL
          </label>
          <input aria-label="Nhập thông tin"
            type="number"
            value={p.quantity}
            onChange={(e) => onUpdate(idx, 'quantity', parseInt(e.target.value) || 0)}
            readOnly={(readOnly && maxQ === undefined) || disabled}
            max={maxQ}
            className={`w-full text-xs font-bold text-slate-900 ${(readOnly && maxQ === undefined) || disabled ? 'bg-slate-50/30' : 'bg-white'} border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-accent p-2 text-center md:h-[38px] disabled:opacity-70`}
          />
        </div>
        <div className={`${showPrice ? 'col-span-3 md:col-span-1' : 'col-span-2'} space-y-1`}>
          <label className="md:hidden text-2xs font-bold text-slate-600 uppercase tracking-tight">ĐVT</label>
          <input aria-label="Nhập thông tin"
            type="text"
            value={p.unit}
            onChange={(e) => onUpdate(idx, 'unit', e.target.value)}
            readOnly={readOnly || disabled}
            className={`w-full text-xs font-medium text-slate-600 ${readOnly || disabled ? 'bg-slate-50/30' : 'bg-white'} border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-accent p-2 text-center md:h-[38px] disabled:opacity-70`}
          />
        </div>
        
        {showPrice && (
          <>
            <div className="col-span-6 md:col-span-2 space-y-1">
              <label className="md:hidden text-2xs font-bold text-slate-600 uppercase tracking-tight">Đơn giá</label>
              <input aria-label="Nhập thông tin"
                type="text"
                value={p.price ? FinancialEngine.formatVND(p.price) : ''}
                onChange={(e) => {
                  const newPrice = FinancialEngine.toInteger(e.target.value);
                  onUpdate(idx, 'price', newPrice);
                }}
                readOnly={readOnly || disabled}
                className={`w-full text-xs font-bold text-slate-900 ${readOnly || disabled ? 'bg-slate-50/30' : 'bg-white'} border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-accent p-2 text-right md:h-[38px] disabled:opacity-70`}
              />
            </div>
            <div className="col-span-6 md:col-span-2 space-y-1 flex items-center justify-end h-full">
              <label className="md:hidden text-2xs font-bold text-slate-600 uppercase tracking-tight mr-2">Thành tiền</label>
              <span className={`w-full md:w-auto text-xs font-bold text-emerald-700 bg-emerald-50/80 md:bg-transparent border-none rounded-lg p-2 md:p-0 text-right md:flex md:items-center md:justify-end md:h-[38px]`}>
                 {p.price && p.quantity ? FinancialEngine.formatVND(p.price * p.quantity) : '-'}
              </span>
            </div>
          </>
        )}

        <div className="col-span-12 md:col-span-1 flex items-end justify-end md:justify-center md:items-center h-full pb-1 md:pb-0">
          {!readOnly && !hideAddRemove && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              iconOnly
              title="Xóa"
              aria-label="Xóa"
              onClick={() => onRemove(idx)}
              className="p-2 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
            >
              <Trash size={16} />
            </Button>
          )}
        </div>
      </div>
      {maxQ !== undefined ? (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-accent transition-all duration-500"
              style={{ width: `${Math.min(((p.quantity || 0) / maxQ) * 100, 100)}%` }}
            />
          </div>
          <span className="text-3xs font-bold text-slate-600 uppercase">Còn lại: {maxQ}</span>
        </div>
      ) : null}
      {showBaoHanh && (
        <ProductBaoHanhFields product={p} viewType="table" disabled={disabled} onChange={(field, val) => onUpdate(idx, field, val === null ? undefined : val as any)} />
      )}
    </div>
  );
}
