import React from 'react';
import { Hash, Type, Boxes } from 'lucide-react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';

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
  showSerial?: boolean;
  allContracts?: any[];
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
  disabled,
  showSerial,
  allContracts
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
          <div className="hidden lg:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto ring-1 ring-slate-900/5 mt-3">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-2xs font-bold uppercase tracking-wider">
                  <th className="p-3 text-center w-[48px]">STT</th>
                  <th className="p-3 min-w-[260px]">Sản phẩm & Quy cách</th>
                  <th className="p-3 text-center w-[90px]">SL / ĐVT</th>
                  <th className="p-3 text-right w-[130px]">Đơn giá</th>
                  <th className="p-3 text-right w-[115px]">Chiết khấu</th>
                  <th className="p-3 text-right w-[105px]">VAT</th>
                  <th className="p-3 text-right w-[140px]">Thành tiền</th>
                  <th className="p-3 text-center w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
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
                    showSerial={showSerial}
                    allContracts={allContracts}
                    onUpdate={updateProduct}
                    onRemove={removeProduct}
                  />
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 divide-y divide-slate-100 bg-slate-50/70 select-none">
                {/* 1. Subtotal / Cộng tiền hàng */}
                <tr className="hover:bg-slate-100/60 transition-colors">
                  <td colSpan={3} className="p-3 text-slate-600 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      <span className="text-xs font-semibold text-slate-700">Tổng cộng:</span>
                      <span className="text-xs font-mono font-bold text-slate-800">{products.length} sản phẩm</span>
                      <span className="text-2xs text-slate-500 font-medium">({totalQuantity} mục)</span>
                    </div>
                  </td>
                  <td colSpan={3} className="p-3 text-right text-2xs font-bold uppercase tracking-wider text-slate-600 align-middle">
                    Cộng tiền hàng (Tạm tính):
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-slate-900 text-xs align-middle whitespace-nowrap">
                    {new Intl.NumberFormat('vi-VN').format(aggs?.totalGross || 0)} ₫
                  </td>
                  <td className="p-3"></td>
                </tr>

                {/* 2. Chiết khấu (nếu > 0) */}
                {(aggs?.totalDiscount || 0) > 0 && (
                  <tr className="hover:bg-amber-50/40 transition-colors bg-amber-50/20">
                    <td colSpan={3} className="p-2.5 px-3 text-2xs text-amber-700 italic align-middle">
                      Áp dụng chính sách chiết khấu thương mại
                    </td>
                    <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-amber-700 align-middle">
                      Chiết khấu thương mại:
                    </td>
                    <td className="p-2.5 px-3 text-right font-mono font-bold text-amber-700 text-xs align-middle whitespace-nowrap">
                      -{new Intl.NumberFormat('vi-VN').format(aggs?.totalDiscount || 0)} ₫
                    </td>
                    <td className="p-2.5"></td>
                  </tr>
                )}

                {/* 3. Tiền thuế VAT (nếu > 0) */}
                {(aggs?.totalVat || 0) > 0 && (
                  <tr className="hover:bg-sky-50/40 transition-colors bg-sky-50/20">
                    <td colSpan={3} className="p-2.5 px-3 text-2xs text-sky-700 italic align-middle">
                      Thuế giá trị gia tăng (GTGT / VAT)
                    </td>
                    <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-sky-700 align-middle">
                      Tiền thuế VAT:
                    </td>
                    <td className="p-2.5 px-3 text-right font-mono font-bold text-sky-700 text-xs align-middle whitespace-nowrap">
                      +{new Intl.NumberFormat('vi-VN').format(aggs?.totalVat || 0)} ₫
                    </td>
                    <td className="p-2.5"></td>
                  </tr>
                )}

                {/* 4. Tổng thanh toán */}
                <tr className="bg-blue-50/70 border-t-2 border-slate-300 hover:bg-blue-50 transition-colors">
                  <td colSpan={3} className="p-3 text-slate-700 align-middle">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">Số tiền viết bằng chữ:</span>
                      <span className="text-xs italic font-semibold text-slate-800 line-clamp-1">
                        {readVietnameseCurrency(aggs?.totalAfterTax || 0)}
                      </span>
                    </div>
                  </td>
                  <td colSpan={3} className="p-3 text-right align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                      <span className="text-xs font-black uppercase tracking-wider text-blue-900">
                        Tổng thanh toán:
                      </span>
                    </div>
                  </td>
                  <td className="p-3 text-right font-mono font-black text-sm md:text-base text-blue-700 align-middle tabular-nums whitespace-nowrap">
                    {new Intl.NumberFormat('vi-VN').format(aggs?.totalAfterTax || 0)} ₫
                  </td>
                  <td className="p-3"></td>
                </tr>
              </tfoot>
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
                showSerial={showSerial}
                allContracts={allContracts}
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
              showSerial={showSerial}
              allContracts={allContracts}
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

