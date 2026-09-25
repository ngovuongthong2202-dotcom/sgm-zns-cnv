import React from 'react';
import { Hash, Type, Boxes } from 'lucide-react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

import { useProductListInput } from './product-list-input/useProductListInput';
import { ProductFinanceCard } from './product-list-input/ProductFinanceCard';
import { ProductFinanceRow } from './product-list-input/ProductFinanceRow';
import { ProductBasicItem } from './product-list-input/ProductBasicItem';
import { ProductListHeader, ProductListFooter } from './product-list-input/ProductListSections';

interface ProductListInputProps {
  products: ProductItem[];
  onChange: (products: ProductItem[]) => void;
  readOnly?: boolean;
  allowEditProductId?: boolean;
  hideAddRemove?: boolean;
  maxQuantities?: Record<string, number>; 
  showBaoHanh?: boolean;
  baseDateForBaoHanh?: string;
  defaultUnit?: string;
  showPrice?: boolean;
  showFinance?: boolean; 
  disabled?: boolean;
}

export default function ProductListInput({
  products,
  onChange,
  readOnly,
  allowEditProductId,
  hideAddRemove,
  maxQuantities,
  showBaoHanh,
  baseDateForBaoHanh,
  defaultUnit = 'Máy',
  showPrice,
  showFinance,
  disabled
}: ProductListInputProps) {

  const {
    bulkVat, setBulkVat, bulkDiscPct, setBulkDiscPct,
    bulkDiscAmount, setBulkDiscAmount, applyBulkVat, applyBulkDiscPct,
    applyBulkDiscAmount, addProduct, addFromCatalog, removeProduct, updateProduct
  } = useProductListInput({
    products, onChange, maxQuantities, showBaoHanh, baseDateForBaoHanh, defaultUnit, showFinance
  });

  const totalQuantity = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const aggs = showFinance ? aggregateProducts(products) : null;

  return (
    <div className="space-y-4">
      <ProductListHeader 
        readOnly={readOnly}
        hideAddRemove={hideAddRemove}
        disabled={disabled}
        showFinance={showFinance}
        productsLength={products.length}
        bulkVat={bulkVat}
        setBulkVat={setBulkVat}
        applyBulkVat={applyBulkVat}
        bulkDiscPct={bulkDiscPct}
        setBulkDiscPct={setBulkDiscPct}
        applyBulkDiscPct={applyBulkDiscPct}
        bulkDiscAmount={bulkDiscAmount}
        setBulkDiscAmount={setBulkDiscAmount}
        applyBulkDiscAmount={applyBulkDiscAmount}
        defaultUnit={defaultUnit}
        addFromCatalog={addFromCatalog}
        addProduct={addProduct}
      />

      <div className="space-y-3 md:space-y-0">
        {!showFinance && products.length > 0 && (
          <div className={`hidden md:grid ${showPrice ? 'grid-cols-12' : 'grid-cols-12'} gap-3 lg:gap-4 pb-2 border-b border-brand-border/50 text-2xs font-bold text-slate-700 uppercase tracking-tight px-4`}>
            <div className={`${showPrice ? 'col-span-2' : 'col-span-3'} flex items-center gap-1`}><Hash size={10} /> Mã SP</div>
            <div className={`${showPrice ? 'col-span-3' : 'col-span-4'} flex items-center gap-1`}><Type size={10} /> Tên sản phẩm</div>
            <div className={`${showPrice ? 'col-span-1' : 'col-span-2'} flex items-center gap-1 justify-center`}><Boxes size={10} /> SL</div>
            <div className={`${showPrice ? 'col-span-1' : 'col-span-2'} text-center`}>ĐVT</div>
            {showPrice && (
              <>
                <div className="col-span-2 text-right">Đơn giá</div>
                <div className="col-span-2 text-right">Thành tiền</div>
              </>
            )}
            <div className="col-span-1 text-center"></div>
          </div>
        )}

        {showFinance && products.length > 0 && (
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto ring-1 ring-slate-900/5 mt-4">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 text-2xs font-bold text-slate-700 uppercase tracking-wider min-w-[280px]">Sản phẩm & Quy cách</th>
                  <th className="p-3 text-2xs font-bold text-slate-700 uppercase tracking-wider text-center w-[90px]">SL / ĐVT</th>
                  <th className="p-3 text-2xs font-bold text-slate-700 uppercase tracking-wider text-right w-[140px]">Đơn giá</th>
                  <th className="p-3 w-[120px]">
                    <div className="flex flex-col text-[#b45309]">
                       <span className="text-2xs font-bold uppercase tracking-wider text-center">Chiết khấu (<span className="font-mono">%</span>)</span>
                       <span className="text-3xs font-medium text-center opacity-80 uppercase pt-0.5">Tiền giảm</span>
                    </div>
                  </th>
                  <th className="p-3 w-[110px]">
                    <div className="flex flex-col text-[#0369a1]">
                       <span className="text-2xs font-bold uppercase tracking-wider text-center">VAT (<span className="font-mono">%</span>)</span>
                       <span className="text-3xs font-medium text-center opacity-80 uppercase pt-0.5">Tiền thuế</span>
                    </div>
                  </th>
                  <th className="p-3 text-2xs font-black text-slate-800 uppercase tracking-widest text-right w-[140px]">Thành tiền</th>
                  <th className="p-3 w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => (
                  <ProductFinanceRow 
                    key={idx} 
                    product={p} 
                    index={idx} 
                    maxQ={maxQuantities ? maxQuantities[getProductItemKey(p, idx)] : undefined}
                    readOnly={readOnly}
                    disabled={disabled}
                    hideAddRemove={hideAddRemove}
                    showBaoHanh={showBaoHanh}
                    onUpdate={updateProduct}
                    onRemove={removeProduct}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {products.map((p, idx) => {
          const maxQ = maxQuantities ? maxQuantities[getProductItemKey(p, idx)] : undefined;
          if (showFinance) {
            return (
              <ProductFinanceCard 
                key={idx} 
                product={p} 
                index={idx}
                maxQ={maxQ}
                readOnly={readOnly}
                disabled={disabled}
                hideAddRemove={hideAddRemove}
                allowEditProductId={allowEditProductId}
                showBaoHanh={showBaoHanh}
                onUpdate={updateProduct}
                onRemove={removeProduct}
              />
            );
          }
          return (
            <ProductBasicItem 
              key={idx} 
              product={p} 
              index={idx} 
              maxQ={maxQ}
              readOnly={readOnly}
              disabled={disabled}
              hideAddRemove={hideAddRemove}
              allowEditProductId={allowEditProductId}
              showPrice={showPrice}
              showBaoHanh={showBaoHanh}
              onUpdate={updateProduct}
              onRemove={removeProduct}
            />
          );
        })}

        {products.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-2xl bg-white">
            <p className="text-sm text-slate-600">Chưa có sản phẩm nào được thêm</p>
          </div>
        )}
      </div>

      <ProductListFooter 
        showFinance={showFinance}
        productsLength={products.length}
        totalQuantity={totalQuantity}
        aggs={aggs}
      />
    </div>
  );
}

