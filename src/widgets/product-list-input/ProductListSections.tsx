import React from 'react';
import { Calculator, Plus, ChevronRight } from 'lucide-react';
import { Button } from '@/src/design-system';
import { ProductCatalogPicker } from '@/src/modules/sales/ui/components/ProductCatalogPicker';

export function ProductListHeader({
  readOnly,
  hideAddRemove,
  disabled,
  showFinance,
  productsLength,
  bulkVat,
  setBulkVat,
  applyBulkVat,
  bulkDiscPct,
  setBulkDiscPct,
  applyBulkDiscPct,
  bulkDiscAmount,
  setBulkDiscAmount,
  applyBulkDiscAmount,
  defaultUnit,
  addFromCatalog,
  addProduct
}: any) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
      <div className="flex items-center gap-2 text-slate-800">
        <Calculator size={16} className="text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-widest">Danh mục hàng hóa</h3>
      </div>
      
      {!readOnly && !hideAddRemove && !disabled && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-3 sm:mt-0">
          {showFinance && productsLength > 0 && (
            <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/5">
              <div className="px-2.5 py-1.5 bg-slate-50 border-r border-slate-200 text-2xs font-bold text-slate-700 uppercase tracking-widest flex items-center">
                 Công cụ
              </div>
              
              <div className="flex group focus-within:ring-1 focus-within:ring-sky-200 bg-sky-50/20">
                 <input type="number" placeholder="% VAT" value={bulkVat} onChange={e=>setBulkVat(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyBulkVat()} className="w-16 px-2 py-1.5 text-xs text-center font-bold text-sky-700 bg-transparent outline-none placeholder:text-sky-300" />
                 <Button type="button" variant="ghost" size="xs" onClick={applyBulkVat} className="bg-sky-100 hover:bg-sky-500 hover:text-white transition-colors text-sky-700 px-2 py-1.5 text-2xs font-bold border-r border-slate-200 rounded-none">ÁP</Button>
              </div>
              
              <div className="flex focus-within:ring-1 focus-within:ring-amber-200 bg-amber-50/20">
                 <input type="number" placeholder="% CK" value={bulkDiscPct} onChange={e=>setBulkDiscPct(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyBulkDiscPct()} className="w-14 px-2 py-1.5 text-xs text-center font-bold text-amber-700 bg-transparent outline-none placeholder:text-amber-300" />
                 <Button type="button" variant="ghost" size="xs" onClick={applyBulkDiscPct} className="bg-amber-100/50 hover:bg-amber-500 hover:text-white transition-colors text-amber-700 px-2.5 py-1.5 text-2xs font-bold border-r border-slate-200 rounded-none">ÁP</Button>
              </div>
              
              <div className="flex focus-within:ring-1 focus-within:ring-emerald-200 bg-emerald-50/10">
                 <input type="text" placeholder="Tiền CK (VNĐ)" value={bulkDiscAmount} onChange={e=>setBulkDiscAmount(new Intl.NumberFormat('vi-VN').format(parseInt(e.target.value.replace(/\D/g, ''))||0))} onKeyDown={e=>e.key==='Enter'&&applyBulkDiscAmount()} className="w-24 px-2 py-1.5 text-xs text-right font-bold text-emerald-700 bg-transparent outline-none placeholder:font-normal placeholder:text-emerald-300" />
                 <Button type="button" variant="ghost" size="xs" onClick={applyBulkDiscAmount} className="bg-emerald-100/40 hover:bg-emerald-500 hover:text-white transition-colors text-emerald-700 px-2.5 py-1.5 text-2xs font-bold flex items-center rounded-none">Chia <ChevronRight size={12}/></Button>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <ProductCatalogPicker onSelect={addFromCatalog} category={defaultUnit === 'Máy' ? 'Máy' : undefined} />
            <Button aria-label="Nút bấm"
              type="button"
              onClick={addProduct}
              className="text-xs font-bold text-white hover:text-white flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
             variant="accent" size="sm">
              <Plus size={14} />
              Thêm dòng
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function ProductListFooter({
  showFinance,
  productsLength,
  totalQuantity,
  aggs
}: any) {
  if (showFinance && productsLength > 0) {
    return (
      <div className="lg:hidden sticky bottom-0 z-20 flex flex-wrap justify-end gap-3 p-3.5 bg-white rounded-xl border border-slate-200 mt-4 shadow-md items-center">
        <div className="flex flex-col items-end opacity-70">
          <span className="text-3xs font-bold uppercase tracking-widest text-slate-700">Số lượng</span>
          <span className="text-xs font-bold font-mono text-slate-800">{aggs?.totalQuantity} <span className="text-3xs">mục</span></span>
        </div>
        <div className="flex flex-col items-end opacity-70">
          <span className="text-3xs font-bold uppercase tracking-widest text-amber-600">Tổng giảm CK</span>
          <span className="text-xs font-bold font-mono text-amber-700">-{new Intl.NumberFormat('vi-VN').format(aggs?.totalDiscount || 0)}</span>
        </div>
        <div className="w-px h-6 bg-slate-200"></div>
        <div className="flex flex-col items-end">
          <span className="text-3xs font-bold uppercase tracking-widest text-slate-700">Trị giá hàng</span>
          <span className="text-xs font-bold font-mono text-slate-800">{new Intl.NumberFormat('vi-VN').format(aggs?.totalBeforeTax || 0)}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-3xs font-bold uppercase tracking-widest text-sky-600">Tổng VAT</span>
          <span className="text-xs font-bold font-mono text-sky-700">+{new Intl.NumberFormat('vi-VN').format(aggs?.totalVat || 0)}</span>
        </div>
        <div className="flex flex-col items-end bg-blue-50 p-2 px-3 rounded-lg border border-blue-100 shadow-xs ml-1">
          <span className="text-3xs font-bold uppercase tracking-widest text-blue-600 mb-0.5">Tổng thanh toán</span>
          <div className="flex items-baseline gap-1">
             <span className="text-base font-black tracking-tight text-blue-700">{new Intl.NumberFormat('vi-VN').format(aggs?.totalAfterTax || 0)}</span>
             <span className="text-3xs font-bold text-blue-500 font-mono">₫</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-brand-border mt-4">
      <span className="text-xs font-bold uppercase tracking-widest text-slate-600">Tổng cộng {productsLength} loại hàng</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-600">Tổng SL:</span>
        <span className="text-lg font-display font-bold text-brand-accent">{totalQuantity}</span>
      </div>
    </div>
  );
}
