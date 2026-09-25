import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { aggregateProducts } from '@/src/domain/pricing/quotation-pricing';

interface DeliveryQuantities {
  [key: string]: number;
}

interface Props {
  products: ProductItem[];
  subTotal?: number;
  discountRate?: number;
  discountAmount?: number;
  vatRate?: number;
  vatAmount?: number;
  totalAmount?: number;
  deliveredQuantities?: DeliveryQuantities;
  accentColorClass?: string;
  hideTotals?: boolean;
}

function getProductItemKey(p: ProductItem, index: number) {
  return `${p.productId || ''}_${p.productName || ''}_${index}`;
}

export function DrawerProductList({
  products,
  deliveredQuantities,
  accentColorClass = 'text-blue-700',
  hideTotals = false
}: Props) {
  const aggs = aggregateProducts(products || []);
  const calculatedSubTotal = aggs.totalGross || 0;
  const calculatedDiscount = aggs.totalDiscount || 0;
  const calculatedVat = aggs.totalVat || 0;
  const calculatedTotal = aggs.totalAfterTax || 0;
  
  const totalQuantity = products?.reduce((acc, p) => acc + (p.quantity || 0), 0) || 0;
  const totalProducts = products?.length || 0;

  // Validate deliveries
  const isOverDelivered = deliveredQuantities && products?.some((p, index) => {
    const itemKey = getProductItemKey(p, index);
    const deliveredQ = deliveredQuantities[itemKey] || 0;
    return deliveredQ > p.quantity;
  });

  return (
    <div className="flex flex-col animate-in fade-in duration-300">
      {isOverDelivered && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-medium flex items-center gap-2 shadow-sm">
          <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(220,38,38,0.6)]"></span>
          <strong>CẢNH BÁO:</strong> Có sản phẩm đã được giao vượt quá số lượng lập trong Hợp đồng/Báo giá!
        </div>
      )}

      {products && products.length > 0 ? (
        <div className="flex flex-col gap-3">
          {products.map((p, idx) => {
            const itemTotal = (p as any).subtotalAfterTax ?? ((p.price || 0) * (p.quantity || 1));
            const itemKey = getProductItemKey(p, idx);
            const deliveredQ = deliveredQuantities ? (deliveredQuantities[itemKey] || 0) : 0;
            const isFullyDelivered = deliveredQ >= (p.quantity || 1);

            return (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-slate-200 transition-colors"></div>
                
                <div className="flex flex-col flex-1 min-w-0 pr-4">
                  <span className="font-bold text-slate-800 text-sm leading-snug line-clamp-2" title={p.productName}>
                    {p.productName || 'Sản phẩm chưa đặt tên'}
                  </span>
                  
          <div className="flex flex-wrap gap-2 text-xs items-center text-slate-500 mt-1.5">
            {p.productId && (
              <>
                <span className="font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 hidden sm:inline-block">Mã: {p.productId}</span>
              </>
            )}
            <span className="font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
              SL: {p.quantity} <span className="font-normal text-slate-500">{p.unit || 'Cái'}</span>
            </span>
            <span className="text-slate-300 hidden sm:inline-block">•</span>
            <span>ĐG: {new Intl.NumberFormat('vi-VN').format(p.price || 0)} ₫</span>
            {p.discountPct ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                  Disc: {p.discountPct}% 
                  {p.discountAmount ? ` (-${new Intl.NumberFormat('vi-VN').format(p.discountAmount)} ₫)` : ''}
                </span>
              </>
            ) : null}
            {((p as any).vatRate || p.vatPct) ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-sky-600 font-medium bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">
                  VAT: {(p as any).vatRate || p.vatPct}%
                  {(p as any).vatAmount ? ` (+${new Intl.NumberFormat('vi-VN').format((p as any).vatAmount)} ₫)` : ''}
                </span>
              </>
            ) : null}
          </div>

                  {/* Warranty Info */}
                  {((p as any).soNgayBaoHanh || (p as any).ngayHetHanBaoHanh) && (
                    <div className="mt-2 flex items-center gap-2 text-2xs sm:text-2xs font-medium p-1.5 bg-blue-50/50 text-blue-700 border border-blue-100 rounded-[8px] w-fit">
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-[4px] uppercase tracking-wider font-bold">Bảo hành</span>
                      {Number((p as any).soNgayBaoHanh) > 0 && <span>{Number((p as any).soNgayBaoHanh)} ngày</span>}
                      {(p as any).soNgayBaoHanh && (p as any).ngayHetHanBaoHanh && <span className="text-blue-300">•</span>}
                      {(p as any).ngayHetHanBaoHanh && <span>Hạn: {(p as any).ngayHetHanBaoHanh}</span>}
                    </div>
                  )}

                  {/* Delivery Progress Bar */}
                  {deliveredQuantities && p.quantity > 0 && (
                    <div className="flex items-center gap-2 mt-3 max-w-[200px]">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${isFullyDelivered ? 'bg-emerald-500' : deliveredQ > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} 
                          style={{width: `${Math.min(100, (deliveredQ / p.quantity) * 100)}%`}}
                        ></div>
                      </div>
                      <span className="text-2xs text-slate-500 font-bold whitespace-nowrap">
                        Giao: {deliveredQ}/{p.quantity}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l border-slate-100 pt-3 sm:pt-0 sm:pl-4 mt-1 sm:mt-0">
                  <span className="text-2xs font-semibold uppercase tracking-wider text-slate-400 block sm:mb-1">Cộng</span>
                  <span className="font-mono font-black text-slate-800 text-base whitespace-nowrap">
                    {new Intl.NumberFormat('vi-VN').format(itemTotal)} ₫
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <span className="text-xs text-slate-400 font-medium">Không có sản phẩm thiết bị nào</span>
        </div>
      )}

      {/* Modern Totals Summary - VIP Light Layout */}
      {!hideTotals && products && products.length > 0 && (
        <div className="mt-8 w-full bg-white rounded-2xl overflow-hidden shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] border border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between p-4 px-6 md:p-6 pb-5 bg-gradient-to-br from-slate-50 to-white">
            {/* Header / Context */}
            <div className="flex flex-col mb-4 md:mb-0 mr-auto md:mr-8 md:min-w-[180px]">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-2xs font-black uppercase tracking-widest text-blue-600">Tổng kết tài chính</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 tracking-wide uppercase">Giá trị & Thanh toán</h4>
              <p className="text-2xs text-slate-700 mt-1 max-w-[200px]">Đã bao gồm các khoản thuế & chiết khấu được áp dụng trên từng hạng mục sản phẩm.</p>
              
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-2xs text-slate-700 uppercase font-bold tracking-wider">Tổng SP</span>
                  <span className="font-mono text-sm font-semibold text-slate-700">{totalProducts}</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex flex-col">
                  <span className="text-2xs text-slate-700 uppercase font-bold tracking-wider">Tổng SL</span>
                  <span className="font-mono text-sm font-semibold text-slate-700">{totalQuantity}</span>
                </div>
              </div>
            </div>

            {/* Breakdowns */}
            <div className="flex flex-1 w-full justify-between md:justify-end md:gap-10 mt-2 md:mt-0">
              <div className="flex flex-col mb-3 md:mb-0">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Giá trị hàng hóa</span>
                <span className="font-mono font-bold text-slate-800">
                  {new Intl.NumberFormat('vi-VN').format(calculatedSubTotal)} ₫
                </span>
              </div>

              {calculatedDiscount > 0 && (
                <div className="flex flex-col mb-3 md:mb-0">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Chiết khấu</span>
                  <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 -ml-2 w-max">
                    - {new Intl.NumberFormat('vi-VN').format(calculatedDiscount)} ₫
                  </span>
                </div>
              )}

              {calculatedVat > 0 && (
                <div className="flex flex-col mb-3 md:mb-0">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Thuế VAT</span>
                  <span className="font-mono font-bold text-sky-700">
                    {new Intl.NumberFormat('vi-VN').format(calculatedVat)} ₫
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-slate-50 border-t border-slate-200 p-4 px-6 flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none"></div>
            <span className="text-xs font-black uppercase tracking-widest text-slate-700 z-10 block">Tổng thanh toán</span>
            <div className="flex items-center gap-4 z-10">
               <span className="font-mono text-sm font-semibold text-slate-400">
                 VNĐ
               </span>
               <span className={`font-mono font-black text-2xl md:text-3xl leading-none tracking-tight tabular-nums text-blue-700`}>
                 {new Intl.NumberFormat('vi-VN').format(calculatedTotal)} ₫
               </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
