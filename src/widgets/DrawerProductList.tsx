import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { aggregateProducts, computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { formatDate } from '@/src/shared/utils/formatDate';
import { AlertTriangle } from 'lucide-react';

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
  paidAmount?: number;
  remainingDebt?: number;
}

function getProductItemKey(p: ProductItem, index: number) {
  return `${p.productId || ''}_${p.productName || ''}_${index}`;
}

export function DrawerProductList({
  products,
  vatRate,
  deliveredQuantities,
  accentColorClass = 'text-blue-700',
  hideTotals = false,
  paidAmount,
  remainingDebt
}: Props) {
  const healedProducts = React.useMemo(() => (products || []).map(computeLineItem), [products]);
  const aggs = React.useMemo(() => aggregateProducts(healedProducts), [healedProducts]);
  const calculatedSubTotal = aggs.totalGross || 0;
  const calculatedDiscount = aggs.totalDiscount || 0;
  const calculatedVat = aggs.totalVat || 0;
  const calculatedTotal = aggs.totalAfterTax || 0;
  const effectiveVatRate = vatRate !== undefined ? Number(vatRate) : (aggs.totalBeforeTax > 0 ? Math.round((aggs.totalVat / aggs.totalBeforeTax) * 100) : 0);
  
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
                                {(p as any).ngayHetHanBaoHanh ? ` (Đến ${formatDate((p as any).ngayHetHanBaoHanh)})` : ''}
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
              {!hideTotals && products && products.length > 0 && (
                <tfoot className="border-t-2 border-slate-200 divide-y divide-slate-100 bg-slate-50/70 select-none">
                  {/* 1. Subtotal / Cộng tiền hàng */}
                  <tr className="hover:bg-slate-100/60 transition-colors">
                    <td colSpan={3} className="p-3 text-slate-600 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        <span className="text-xs font-semibold text-slate-700">Tổng cộng:</span>
                        <span className="text-xs font-mono font-bold text-slate-800">{totalProducts} sản phẩm</span>
                        <span className="text-2xs text-slate-500 font-medium">({totalQuantity} mục)</span>
                      </div>
                    </td>
                    <td colSpan={3} className="p-3 text-right text-2xs font-bold uppercase tracking-wider text-slate-600 align-middle">
                      Cộng tiền hàng (Tạm tính):
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 text-xs align-middle whitespace-nowrap">
                      {new Intl.NumberFormat('vi-VN').format(calculatedSubTotal)} ₫
                    </td>
                    {deliveredQuantities && <td className="p-3"></td>}
                  </tr>

                  {/* 2. Chiết khấu (nếu > 0) */}
                  {calculatedDiscount > 0 && (
                    <tr className="hover:bg-amber-50/40 transition-colors bg-amber-50/20">
                      <td colSpan={3} className="p-2.5 px-3 text-2xs text-amber-700 italic align-middle">
                        Áp dụng chính sách chiết khấu thương mại
                      </td>
                      <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-amber-700 align-middle">
                        Tổng chiết khấu:
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono font-bold text-amber-700 text-xs align-middle whitespace-nowrap">
                        -{new Intl.NumberFormat('vi-VN').format(calculatedDiscount)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2.5"></td>}
                    </tr>
                  )}

                  {/* 3. Tiền thuế VAT (nếu > 0 hoặc = 0) */}
                  {calculatedVat > 0 ? (
                    <tr className="hover:bg-sky-50/40 transition-colors bg-sky-50/20">
                      <td colSpan={3} className="p-2.5 px-3 text-2xs text-sky-700 italic align-middle">
                        Thuế giá trị gia tăng (GTGT / VAT)
                      </td>
                      <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-sky-700 align-middle">
                        Tiền thuế VAT:
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono font-bold text-sky-700 text-xs align-middle whitespace-nowrap">
                        +{new Intl.NumberFormat('vi-VN').format(calculatedVat)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2.5"></td>}
                    </tr>
                  ) : (effectiveVatRate === 0) ? (
                    <tr className="hover:bg-amber-50/40 transition-colors bg-amber-50/20">
                      <td colSpan={3} className="p-2.5 px-3 text-2xs text-amber-800 italic align-middle flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-amber-600 shrink-0" />
                        Thuế suất GTGT: <strong>0%</strong> (Áp dụng đối tượng miễn/xuất khẩu)
                      </td>
                      <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-amber-800 align-middle">
                        Tiền thuế VAT (0%):
                      </td>
                      <td className="p-2.5 px-3 text-right font-mono font-bold text-amber-800 text-xs align-middle whitespace-nowrap">
                        0 ₫
                      </td>
                      {deliveredQuantities && <td className="p-2.5"></td>}
                    </tr>
                  ) : null}

                  {/* 4. Tổng thanh toán */}
                  <tr className="bg-blue-50/70 border-t-2 border-slate-300 hover:bg-blue-50 transition-colors">
                    <td colSpan={3} className="p-3 text-slate-700 align-middle">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider">Số tiền viết bằng chữ:</span>
                        <span className="text-xs italic font-semibold text-slate-800 line-clamp-1">
                          {readVietnameseCurrency(calculatedTotal)}
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
                      {new Intl.NumberFormat('vi-VN').format(calculatedTotal)} ₫
                    </td>
                    {deliveredQuantities && <td className="p-3"></td>}
                  </tr>

                  {/* 5. Đã thanh toán (nếu có context hợp đồng/thanh toán) */}
                  {paidAmount !== undefined && paidAmount > 0 && (
                    <tr className="hover:bg-emerald-50/40 transition-colors bg-emerald-50/20">
                      <td colSpan={3} className="p-2 px-3 text-3xs text-emerald-700 font-semibold align-middle">
                        Tiến độ dòng tiền: Đã thanh toán ghi nhận thực thu
                      </td>
                      <td colSpan={3} className="p-2 px-3 text-right text-2xs font-bold uppercase tracking-wider text-emerald-800 align-middle">
                        Đã thanh toán:
                      </td>
                      <td className="p-2 px-3 text-right font-mono font-bold text-emerald-700 text-xs align-middle whitespace-nowrap">
                        {new Intl.NumberFormat('vi-VN').format(paidAmount)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2"></td>}
                    </tr>
                  )}

                  {/* 6. Còn lại phải thanh toán / Công nợ */}
                  {remainingDebt !== undefined && remainingDebt > 0 && (
                    <tr className="hover:bg-amber-50/40 transition-colors bg-amber-50/30">
                      <td colSpan={3} className="p-2 px-3 text-3xs text-amber-700 font-semibold align-middle">
                        Công nợ
                      </td>
                      <td colSpan={3} className="p-2 px-3 text-right text-2xs font-bold uppercase tracking-wider text-amber-800 align-middle">
                        Còn lại (Công nợ):
                      </td>
                      <td className="p-2 px-3 text-right font-mono font-bold text-amber-700 text-xs align-middle whitespace-nowrap">
                        {new Intl.NumberFormat('vi-VN').format(remainingDebt)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2"></td>}
                    </tr>
                  )}
                </tfoot>
              )}
            </table>
          </div>

          {/* Cảnh báo tuân thủ pháp luật thuế VAT 0% */}
          {(effectiveVatRate === 0) && (
            <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-900 text-2xs flex items-start gap-2.5 shadow-2xs">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold text-amber-950 block text-xs">Cảnh báo tuân thủ xuất hóa đơn (Thuế suất VAT 0%):</strong>
                <span className="text-amber-850 mt-0.5 block">
                  Hợp đồng / Báo giá này đang áp dụng mức thuế suất <strong>VAT 0%</strong>. Theo quy định tại Nghị định 123/2020/NĐ-CP và Luật thuế GTGT, thuế suất 0% chỉ áp dụng đối với hàng hóa, dịch vụ xuất khẩu hoặc doanh nghiệp trong khu phi thuế quan (EPE). Vui lòng rà soát kỹ căn cứ pháp lý trước khi phát hành Hóa đơn điện tử.
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 px-4 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
          <span className="text-xs text-slate-400 font-medium">Không có sản phẩm thiết bị nào</span>
        </div>
      )}
    </div>
  );
}
