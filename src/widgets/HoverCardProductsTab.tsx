import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';

interface Props {
  products: ProductItem[];
  subTotal?: number;
  discountRate?: number;
  discountAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  accentColorClass?: string; // e.g., 'text-teal-700' vs 'text-blue-700'
}

export function HoverCardProductsTab({
  products,
  subTotal,
  discountRate,
  discountAmount,
  vatRate,
  vatAmount,
  totalAmount,
  accentColorClass = 'text-teal-700'
}: Props) {
  const calculatedSubTotal = subTotal || products?.reduce((acc, p) => acc + ((p.price || 0) * (p.quantity || 1)), 0) || 0;
  const calculatedTotal = totalAmount || calculatedSubTotal;

  return (
    <div className="flex flex-col bg-white h-[320px] animate-in fade-in zoom-in-95 duration-200 relative">
      <div className="flex flex-col flex-1 p-2 overflow-y-auto scrollbar-thin">
        {products && products.length > 0 ? (
          <div className="flex flex-col gap-2">
            {products.map((p, idx) => {
              const itemTotal = p.total || ((p.price || 0) * (p.quantity || 1));
              return (
                <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-sm">
                  <div className="flex justify-between items-start gap-3">
                    <span className="font-semibold text-slate-800 text-xs leading-snug line-clamp-2" title={p.productName}>
                      {p.productName || 'Sản phẩm chưa đặt tên'}
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs whitespace-nowrap shrink-0 bg-white px-2 py-0.5 rounded-md border border-slate-200/60 shadow-sm">
                      {new Intl.NumberFormat('vi-VN').format(itemTotal)} ₫
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-2xs items-center text-slate-500 mt-0.5">
                    {p.productId && (
                      <span className="font-mono text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-150">
                        {p.productId}
                      </span>
                    )}
                    <span className="font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-150 shadow-sm">
                      SL: {p.quantity} <span className="font-normal text-slate-400">{p.unit || 'Cái'}</span>
                    </span>
                    <span className="text-slate-300">•</span>
                    <span>ĐG: {new Intl.NumberFormat('vi-VN').format(p.price || 0)}</span>
                    {((p as any).vatRate || p.vatPct) ? (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>VAT: {(p as any).vatRate || p.vatPct}%</span>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-2">
            <span>Không có sản phẩm nào</span>
          </div>
        )}
      </div>

      {/* Totals Summary */}
      <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 mt-auto shrink-0 shadow-[0_-5px_15px_-10px_rgba(0,0,0,0.05)] z-10 w-full rounded-b-xl">
        <div className="flex justify-between text-2xs text-slate-700 mb-1.5">
          <span className="font-medium">Tạm tính:</span>
          <span className="font-mono font-semibold text-slate-800">{new Intl.NumberFormat('vi-VN').format(calculatedSubTotal)} ₫</span>
        </div>
        {(discountAmount || 0) > 0 && (
          <div className="flex justify-between text-2xs text-emerald-600 mb-1.5">
            <span className="font-medium">Chiết khấu {discountRate ? `(${discountRate}%)` : ''}:</span>
            <span className="font-mono font-bold">-{new Intl.NumberFormat('vi-VN').format(discountAmount || 0)} ₫</span>
          </div>
        )}
        {(vatAmount || 0) > 0 && (
          <div className="flex justify-between text-2xs text-slate-700 mb-1.5">
            <span className="font-medium">Thuế VAT {vatRate ? `(${vatRate}%)` : ''}:</span>
            <span className="font-mono font-semibold text-slate-800">{new Intl.NumberFormat('vi-VN').format(vatAmount || 0)} ₫</span>
          </div>
        )}
        <div className="flex justify-between items-end mt-3 pt-3 border-t border-slate-200">
          <span className="text-2xs font-bold uppercase tracking-wider text-slate-700">Tổng thanh toán</span>
          <span className={`font-mono font-black text-base leading-none ${accentColorClass} drop-shadow-sm`}>
            {new Intl.NumberFormat('vi-VN').format(calculatedTotal)} ₫
          </span>
        </div>
      </div>
    </div>
  );
}
