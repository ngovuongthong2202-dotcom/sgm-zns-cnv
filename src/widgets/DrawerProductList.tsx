import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { aggregateProducts, computeLineItem } from '@/src/domain/pricing/quotation-pricing';

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
  const healedProducts = React.useMemo(() => (products || []).map(computeLineItem), [products]);
  const aggs = React.useMemo(() => aggregateProducts(healedProducts), [healedProducts]);
  const calculatedSubTotal = aggs.totalGross || 0;
  const calculatedDiscount = aggs.totalDiscount || 0;
  const calculatedVat = aggs.totalVat || 0;
  const calculatedTotal = aggs.totalAfterTax || 0;
  
  const totalQuantity = healedProducts.reduce((acc, p) => acc + (p.quantity || 0), 0);
  const totalProducts = healedProducts.length;

  // Validate deliveries
  const isOverDelivered = deliveredQuantities && healedProducts.some((p, index) => {
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

      {healedProducts.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ring-1 ring-slate-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 text-2xs font-bold uppercase tracking-wider">
                  <th className="p-3 text-center w-[50px]">STT</th>
                  <th className="p-3 min-w-[260px]">Sản phẩm & Quy cách</th>
                  <th className="p-3 text-center w-[90px]">SL / ĐVT</th>
                  <th className="p-3 text-right w-[130px]">Đơn giá</th>
                  <th className="p-3 text-right w-[110px]">Chiết khấu</th>
                  <th className="p-3 text-right w-[100px]">VAT</th>
                  <th className="p-3 text-right w-[140px]">Thành tiền</th>
                  {deliveredQuantities && (
                    <th className="p-3 text-center w-[120px]">Tiến độ giao</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {healedProducts.map((p, idx) => {
                  const itemTotal = p.subtotalAfterTax;
                  const itemKey = getProductItemKey(p, idx);
                  const deliveredQ = deliveredQuantities ? (deliveredQuantities[itemKey] || 0) : 0;
                  const isFullyDelivered = deliveredQ >= (p.quantity || 1);
                  const serials = Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay : [];
                  const isPromo = p.price === 0 && Boolean(p.productName || p.productId);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                      {/* STT */}
                      <td className="p-3 text-center font-bold text-slate-500 font-mono text-xs align-top">
                        {p.stt || idx + 1}
                      </td>

                      {/* Tên & Quy cách */}
                      <td className="p-3 align-top min-w-[260px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {p.productId && (
                              <span className="font-mono text-3xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {p.productId}
                              </span>
                            )}
                            <span className="font-bold text-slate-900 text-xs">
                              {p.productName || 'Sản phẩm chưa đặt tên'}
                            </span>
                            {isPromo && (
                              <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-3xs font-bold rounded border border-emerald-200 uppercase tracking-wider">
                                Tặng kèm
                              </span>
                            )}
                          </div>

                          {p.ghiChu && (
                            <p className="text-2xs italic text-slate-500">{p.ghiChu}</p>
                          )}

                          {/* Machine Codes / Serials */}
                          {serials.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                              <span className="text-3xs font-bold text-slate-600 uppercase">Mã máy:</span>
                              {serials.map((sn, sIdx) => (
                                <span key={sIdx} className="font-mono text-3xs bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-semibold border border-slate-200">
                                  {sn}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Warranty Info */}
                          {((p as any).soNgayBaoHanh || (p as any).ngayHetHanBaoHanh) && (
                            <div className="flex items-center gap-1.5 text-3xs text-blue-700 font-medium mt-0.5">
                              <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200/60 font-semibold uppercase">
                                BH: {Number((p as any).soNgayBaoHanh) > 0 ? `${Number((p as any).soNgayBaoHanh)} ngày` : ''}
                                {(p as any).ngayHetHanBaoHanh ? ` (Đến ${(p as any).ngayHetHanBaoHanh})` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* SL / ĐVT */}
                      <td className="p-3 text-center align-top whitespace-nowrap">
                        <span className="font-bold text-slate-800 font-mono text-sm">{p.quantity}</span>
                        <span className="text-2xs text-slate-500 font-medium ml-1">{p.unit || 'Máy'}</span>
                      </td>

                      {/* Đơn giá */}
                      <td className="p-3 text-right align-top whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 text-xs">
                          {new Intl.NumberFormat('vi-VN').format(p.price || 0)} ₫
                        </span>
                      </td>

                      {/* Chiết khấu */}
                      <td className="p-3 text-right align-top whitespace-nowrap">
                        {p.discountAmount || p.discountPct ? (
                          <div className="flex flex-col items-end text-amber-700">
                            {p.discountPct ? <span className="font-bold text-2xs">-{p.discountPct}%</span> : null}
                            {p.discountAmount ? (
                              <span className="font-mono text-3xs text-amber-600">
                                -{new Intl.NumberFormat('vi-VN').format(p.discountAmount)} ₫
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* VAT */}
                      <td className="p-3 text-right align-top whitespace-nowrap">
                        {p.vatPct ? (
                          <div className="flex flex-col items-end text-sky-700">
                            <span className="font-bold text-2xs">{p.vatPct}%</span>
                            <span className="font-mono text-3xs text-sky-600">
                              +{new Intl.NumberFormat('vi-VN').format(p.taxAmount || 0)} ₫
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-300">0%</span>
                        )}
                      </td>

                      {/* Thành tiền */}
                      <td className="p-3 text-right align-top whitespace-nowrap">
                        <span className="font-mono font-black text-slate-900 text-xs">
                          {new Intl.NumberFormat('vi-VN').format(itemTotal ?? 0)} ₫
                        </span>
                      </td>

                      {/* Tiến độ giao hàng */}
                      {deliveredQuantities && (
                        <td className="p-3 text-center align-top whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${isFullyDelivered ? 'bg-emerald-500' : deliveredQ > 0 ? 'bg-blue-500' : 'bg-slate-300'}`} 
                                style={{ width: `${Math.min(100, (deliveredQ / (p.quantity || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className={`text-3xs font-bold ${isFullyDelivered ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {deliveredQ}/{p.quantity} {p.unit || 'Máy'}
                            </span>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
