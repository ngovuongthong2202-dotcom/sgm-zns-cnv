import React from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { aggregateProducts, computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { formatDate } from '@/src/shared/utils/formatDate';
import { AlertTriangle } from 'lucide-react';
import { detectItemType, ITEM_SEMANTIC_CONFIG, ItemSemanticType } from '@/src/widgets/product-list-input/useProductItemSemantic';

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
          <div className="overflow-x-auto max-h-[600px] scrollbar-thin">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead className="sticky top-0 z-10 bg-slate-100 text-slate-950 font-black text-2xs uppercase tracking-wider border-b-2 border-slate-300 shadow-2xs select-none">
                <tr>
                  <th className="p-2.5 text-center w-12 border-r border-slate-200/90">STT</th>
                  <th className="p-2.5 min-w-[280px] border-r border-slate-200/90">Sản phẩm & Quy cách</th>
                  <th className="p-2.5 text-center w-[95px] border-r border-slate-200/90">SL / ĐVT</th>
                  <th className="p-2.5 text-right w-[130px] border-r border-slate-200/90">Đơn giá</th>
                  <th className="p-2.5 text-right w-[115px] border-r border-slate-200/90">Chiết khấu</th>
                  <th className="p-2.5 text-right w-[115px] border-r border-slate-200/90">VAT</th>
                  <th className="p-2.5 text-right w-[140px] border-r border-slate-200/90">Thành tiền</th>
                  {deliveredQuantities && (
                    <th className="p-2.5 text-center w-[120px]">Tiến độ giao</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {healedProducts.map((p, idx) => {
                  const itemTotal = p.subtotalAfterTax;
                  const itemKey = getProductItemKey(p, idx);
                  const deliveredQ = deliveredQuantities ? (deliveredQuantities[itemKey] || 0) : 0;
                  const isFullyDelivered = deliveredQ >= (p.quantity || 1);
                  const serials = Array.isArray(p.danhSachMaMay) ? p.danhSachMaMay : [];
                  const isPromo = p.price === 0 && Boolean(p.productName || p.productId);
                  const isZeroVat = p.vatPct === 0 || p.vatPct === undefined || p.vatPct === null;
                  const itemType: ItemSemanticType = (p.itemType as ItemSemanticType) || detectItemType(p.productName, p.unit);
                  const semConfig = ITEM_SEMANTIC_CONFIG[itemType] || ITEM_SEMANTIC_CONFIG.MACHINE;

                  return (
                    <tr 
                      key={idx} 
                      className={`transition-colors group ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      } hover:bg-blue-50/60`}
                    >
                      {/* STT */}
                      <td className="p-2.5 text-center font-bold text-slate-800 font-mono text-xs align-top w-12 border-r border-slate-200/80">
                        {p.stt || idx + 1}
                      </td>

                      {/* Tên & Quy cách */}
                      <td className="p-2.5 align-top min-w-[280px] border-r border-slate-200/80">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {p.productId && (
                              <span className="font-mono text-3xs font-bold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {p.productId}
                              </span>
                            )}
                            {/* Semantic Type Badge */}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-3xs font-extrabold border select-none ${semConfig.badgeClass}`}>
                              <span>{semConfig.icon}</span>
                              <span>{semConfig.shortLabel}</span>
                            </span>
                            <span className="font-bold text-slate-950 text-xs leading-snug">
                              {p.productName || 'Sản phẩm chưa đặt tên'}
                            </span>
                            {isPromo && (
                              <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-3xs font-black rounded border border-emerald-300 uppercase tracking-wider">
                                Tặng kèm
                              </span>
                            )}
                          </div>

                          {p.ghiChu && (
                            <p className="text-2xs italic text-slate-700 font-medium">{p.ghiChu}</p>
                          )}

                          {p.quyCach && (
                            <p className="text-2xs text-emerald-950 font-medium bg-emerald-50/70 border border-emerald-200/60 rounded px-1.5 py-0.5 mt-0.5">
                              <span className="font-bold">Quy cách:</span> {p.quyCach}
                            </p>
                          )}

                          {p.phamViCongViec && (
                            <p className="text-2xs text-amber-950 font-medium bg-amber-50/70 border border-amber-200/60 rounded px-1.5 py-0.5 mt-0.5">
                              <span className="font-bold">Phạm vi CV:</span> {p.phamViCongViec}
                            </p>
                          )}

                          {/* Machine Codes / Serials */}
                          {serials.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 items-center">
                              <span className="text-3xs font-bold text-slate-800 uppercase">Mã máy:</span>
                              {serials.map((sn, sIdx) => (
                                <span key={sIdx} className="font-mono text-3xs bg-slate-100 text-slate-900 px-1.5 py-0.5 rounded font-bold border border-slate-300">
                                  {sn}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Warranty Info */}
                          {(() => {
                            const days = Number((p as any).soNgayBaoHanh || 0);
                            let expiry = (p as any).ngayHetHanBaoHanh;
                            if (!expiry && days > 0) {
                              const base = new Date();
                              expiry = new Date(base.getTime() + days * 86400000).toISOString();
                            }
                            if (days <= 0 && !expiry) return null;
                            return (
                              <div className="flex items-center gap-1.5 text-3xs text-blue-800 font-semibold mt-0.5">
                                <span className="bg-blue-50 text-blue-900 px-1.5 py-0.5 rounded border border-blue-200 font-bold uppercase">
                                  🛡️ BH: {days > 0 ? `${days} ngày` : ''}
                                  {expiry ? ` (Đến ${formatDate(expiry)})` : ''}
                                </span>
                              </div>
                            );
                          })()}
                        </div>
                      </td>

                      {/* SL / ĐVT */}
                      <td className="p-2.5 text-center align-top whitespace-nowrap border-r border-slate-200/80">
                        <span className="font-bold text-slate-950 font-mono text-sm">{p.quantity}</span>
                        <span className="text-2xs text-slate-700 font-semibold ml-1">{p.unit || 'Máy'}</span>
                      </td>

                      {/* Đơn giá */}
                      <td className="p-2.5 text-right align-top whitespace-nowrap border-r border-slate-200/80">
                        <span className="font-currency font-bold text-slate-950 text-xs">
                          {new Intl.NumberFormat('vi-VN').format(p.price || 0)} ₫
                        </span>
                      </td>

                      {/* Chiết khấu */}
                      <td className="p-2.5 text-right align-top whitespace-nowrap border-r border-slate-200/80">
                        {p.discountAmount || p.discountPct ? (
                          <div className="flex flex-col items-end text-amber-800">
                            {p.discountPct ? <span className="font-bold text-2xs">-{p.discountPct}%</span> : null}
                            {p.discountAmount ? (
                              <span className="font-currency text-3xs text-amber-700 font-bold">
                                -{new Intl.NumberFormat('vi-VN').format(p.discountAmount)} ₫
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">-</span>
                        )}
                      </td>

                      {/* VAT */}
                      <td className="p-2.5 text-right align-top whitespace-nowrap border-r border-slate-200/80">
                        {p.vatPct && p.vatPct > 0 ? (
                          <div className="flex flex-col items-end text-sky-800">
                            <span className="font-bold text-2xs">{p.vatPct}%</span>
                            <span className="font-currency text-3xs text-sky-700 font-bold">
                              +{new Intl.NumberFormat('vi-VN').format(p.taxAmount || 0)} ₫
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-bold text-3xs tracking-tight whitespace-nowrap shadow-2xs">
                              <AlertTriangle size={10} className="text-amber-700 shrink-0" />
                              0% (Nghi vấn)
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Thành tiền */}
                      <td className="p-2.5 text-right align-top whitespace-nowrap border-r border-slate-200/80">
                        <span className="font-currency font-black text-slate-950 text-xs">
                          {new Intl.NumberFormat('vi-VN').format(itemTotal ?? 0)} ₫
                        </span>
                      </td>

                      {/* Tiến độ giao hàng */}
                      {deliveredQuantities && (
                        <td className="p-2.5 text-center align-top whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full transition-all ${isFullyDelivered ? 'bg-emerald-600' : deliveredQ > 0 ? 'bg-blue-600' : 'bg-slate-300'}`} 
                                style={{ width: `${Math.min(100, (deliveredQ / (p.quantity || 1)) * 100)}%` }}
                              />
                            </div>
                            <span className={`text-3xs font-bold ${isFullyDelivered ? 'text-emerald-800' : 'text-slate-700'}`}>
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
                <tfoot className="border-t-2 border-slate-300 divide-y divide-slate-200 bg-slate-50/90 select-none font-semibold">
                  {/* 1. Subtotal / Cộng tiền hàng */}
                  <tr className="hover:bg-slate-100/70 transition-colors">
                    <td colSpan={3} className="p-2.5 px-3 text-slate-800 align-middle border-r border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                        <span className="text-xs font-bold text-slate-900">Tổng cộng:</span>
                        <span className="text-xs font-mono font-bold text-slate-950">{totalProducts} sản phẩm</span>
                        <span className="text-2xs text-slate-700 font-semibold">({totalQuantity} mục)</span>
                      </div>
                    </td>
                    <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-slate-800 align-middle border-r border-slate-200/80">
                      Cộng tiền hàng (Tạm tính):
                    </td>
                    <td className="p-2.5 px-3 text-right font-currency font-black text-slate-950 text-xs align-middle whitespace-nowrap border-r border-slate-200/80">
                      {new Intl.NumberFormat('vi-VN').format(calculatedSubTotal)} ₫
                    </td>
                    {deliveredQuantities && <td className="p-2.5"></td>}
                  </tr>

                  {/* 2. Chiết khấu (nếu > 0) */}
                  {calculatedDiscount > 0 && (
                    <tr className="hover:bg-amber-50/50 transition-colors bg-amber-50/30">
                      <td colSpan={3} className="p-2.5 px-3 text-2xs text-amber-900 italic font-semibold align-middle border-r border-slate-200/80">
                        Áp dụng chính sách chiết khấu thương mại
                      </td>
                      <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-amber-900 align-middle border-r border-slate-200/80">
                        Tổng chiết khấu:
                      </td>
                      <td className="p-2.5 px-3 text-right font-currency font-black text-amber-800 text-xs align-middle whitespace-nowrap border-r border-slate-200/80">
                        -{new Intl.NumberFormat('vi-VN').format(calculatedDiscount)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2.5"></td>}
                    </tr>
                  )}

                  {/* 3. Tiền thuế VAT (nếu > 0 hoặc = 0) */}
                  {calculatedVat > 0 ? (
                    <tr className="hover:bg-sky-50/50 transition-colors bg-sky-50/30">
                      <td colSpan={3} className="p-2.5 px-3 text-2xs text-sky-900 font-semibold italic align-middle border-r border-slate-200/80">
                        Thuế giá trị gia tăng (GTGT / VAT)
                      </td>
                      <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-bold uppercase tracking-wider text-sky-900 align-middle border-r border-slate-200/80">
                        Tiền thuế VAT ({effectiveVatRate}%):
                      </td>
                      <td className="p-2.5 px-3 text-right font-currency font-black text-sky-800 text-xs align-middle whitespace-nowrap border-r border-slate-200/80">
                        +{new Intl.NumberFormat('vi-VN').format(calculatedVat)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2.5"></td>}
                    </tr>
                  ) : (effectiveVatRate === 0) ? (
                    <tr className="hover:bg-amber-50/50 transition-colors bg-amber-50/20 border-y border-amber-200">
                      <td colSpan={3} className="p-2.5 px-3 text-2xs text-amber-900 font-bold italic align-middle border-r border-slate-200/80">
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle size={13} className="text-amber-700 shrink-0" />
                          Thuế GTGT 0% (Cần kiểm toán hồ sơ)
                        </span>
                      </td>
                      <td colSpan={3} className="p-2.5 px-3 text-right text-2xs font-black uppercase tracking-wider text-amber-900 align-middle border-r border-slate-200/80">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-200 text-amber-950 rounded font-black">
                          VAT 0% (Nghi vấn sai luật):
                        </span>
                      </td>
                      <td className="p-2.5 px-3 text-right font-currency font-black text-amber-900 text-xs align-middle whitespace-nowrap border-r border-slate-200/80">
                        0 ₫
                      </td>
                      {deliveredQuantities && <td className="p-2.5"></td>}
                    </tr>
                  ) : null}

                  {/* 4. Tổng thanh toán */}
                  <tr className="bg-blue-50/80 border-t-2 border-slate-300 hover:bg-blue-50 transition-colors">
                    <td colSpan={3} className="p-3 text-slate-900 align-middle border-r border-slate-200/80">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-3xs uppercase font-black text-slate-700 tracking-wider">Số tiền viết bằng chữ:</span>
                        <span className="text-xs italic font-bold text-slate-900 line-clamp-1">
                          {readVietnameseCurrency(calculatedTotal)}
                        </span>
                      </div>
                    </td>
                    <td colSpan={3} className="p-3 text-right align-middle border-r border-slate-200/80">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
                        <span className="text-xs font-black uppercase tracking-wider text-blue-950">
                          Tổng thanh toán:
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-currency font-black text-sm md:text-base text-blue-800 align-middle tabular-nums whitespace-nowrap border-r border-slate-200/80">
                      {new Intl.NumberFormat('vi-VN').format(calculatedTotal)} ₫
                    </td>
                    {deliveredQuantities && <td className="p-3"></td>}
                  </tr>

                  {/* 5. Đã thanh toán (nếu có context hợp đồng/thanh toán) */}
                  {paidAmount !== undefined && paidAmount > 0 && (
                    <tr className="hover:bg-emerald-50/40 transition-colors bg-emerald-50/20">
                      <td colSpan={3} className="p-2 px-3 text-3xs text-emerald-800 font-bold align-middle border-r border-slate-200/80">
                        Tiến độ dòng tiền: Đã thanh toán ghi nhận thực thu
                      </td>
                      <td colSpan={3} className="p-2 px-3 text-right text-2xs font-bold uppercase tracking-wider text-emerald-900 align-middle border-r border-slate-200/80">
                        Đã thanh toán:
                      </td>
                      <td className="p-2 px-3 text-right font-currency font-black text-emerald-800 text-xs align-middle whitespace-nowrap border-r border-slate-200/80">
                        {new Intl.NumberFormat('vi-VN').format(paidAmount)} ₫
                      </td>
                      {deliveredQuantities && <td className="p-2"></td>}
                    </tr>
                  )}

                  {/* 6. Còn lại phải thanh toán / Công nợ */}
                  {remainingDebt !== undefined && remainingDebt > 0 && (
                    <tr className="hover:bg-amber-50/40 transition-colors bg-amber-50/30">
                      <td colSpan={3} className="p-2 px-3 text-3xs text-amber-900 font-bold align-middle border-r border-slate-200/80">
                        Công nợ
                      </td>
                      <td colSpan={3} className="p-2 px-3 text-right text-2xs font-bold uppercase tracking-wider text-amber-950 align-middle border-r border-slate-200/80">
                        Còn lại (Công nợ):
                      </td>
                      <td className="p-2 px-3 text-right font-currency font-black text-amber-900 text-xs align-middle whitespace-nowrap border-r border-slate-200/80">
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
            <div className="p-3 bg-amber-50/90 border-t border-amber-200 text-amber-950 text-2xs flex items-start gap-2.5">
              <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <strong className="font-bold text-amber-950 uppercase tracking-wide block">
                  Lưu ý kiểm toán thuế (VAT 0%):
                </strong>
                <p className="text-amber-900 font-medium leading-relaxed">
                  Theo Luật Thuế GTGT và Thông tư 219/2013/TT-BTC, thuế suất 0% chỉ áp dụng cho hàng xuất khẩu nước ngoài hoặc bán cho doanh nghiệp chế xuất (EPE) có tờ khai hải quan. Bán hàng nội địa áp dụng 0% là nghi vấn sai luật, kế toán cần kiểm tra kỹ hồ sơ hải quan hoặc công văn miễn thuế trước khi ký xuất hóa đơn.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center py-12 px-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
          <span className="text-xs text-slate-700 font-semibold">Không có sản phẩm thiết bị nào</span>
        </div>
      )}
    </div>
  );
}
