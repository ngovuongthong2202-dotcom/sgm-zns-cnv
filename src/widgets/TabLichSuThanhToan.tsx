import React from "react";
import { Button } from "@/src/design-system/Button";
import { Payment } from "@/src/domain/schema/payment.schema";
import { getPaymentDisplayLabel } from "@/src/domain/mapping/entity-label";
import { formatDate } from "@/src/shared/utils/formatDate";
import { ExternalLink, CreditCard, DollarSign, Calendar, Layers } from "lucide-react";
import { useDrawerStack } from "@/src/contexts/DrawerStackContext";

interface TabLichSuThanhToanProps {
  matchingPayments: Partial<Payment>[];
  onNavigateNew?: () => void;
  showCreateButton?: boolean;
}

export function TabLichSuThanhToan({ matchingPayments, onNavigateNew, showCreateButton }: TabLichSuThanhToanProps) {
  const { openDrawer } = useDrawerStack();

  const formatMoney = (val?: number) => {
    if (!val && val !== 0) return "0 ₫";
    return new Intl.NumberFormat("vi-VN").format(val) + " ₫";
  };

  const handleOpenPayment = (p: Partial<Payment>) => {
    if (p.id) {
      openDrawer('payment', p.id);
    }
  };

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-emerald-600" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
            Hồ Sơ Giao Dịch Thanh Toán ({matchingPayments.length})
          </h4>
        </div>
        {showCreateButton && (
          <Button 
            aria-label="Tạo phiếu thu" 
            variant="secondary" 
            onClick={onNavigateNew} 
            className="text-2xs font-bold py-1 px-3 h-7 bg-white hover:bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs"
          >
            + Tạo Phiếu Thu
          </Button>
        )}
      </div>

      <div className="space-y-3.5">
        {matchingPayments.map(p => {
          const displayCode = p.paymentId || (p as any).soPhieuThu || (p as any).soChungTu || (p as any).soPhieuThanhToan || (p as any).code || getPaymentDisplayLabel(p);
          const isPaid = p.tinhTrangThanhToan?.toLowerCase().includes('tất toán') || p.tinhTrangThanhToan?.toLowerCase().includes('đã thanh toán');
          const cacDotThu = (p as any).cacDotThu || [];
          const totalAmount = Number(p.soTien || (p as any).amount || 0);

          return (
            <div 
              key={p.id} 
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-emerald-400 hover:shadow-xs transition-all group"
            >
              {/* Header */}
              <div className="bg-slate-50/80 px-4 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isPaid ? 'bg-emerald-100/80 text-emerald-700' : 'bg-amber-100/80 text-amber-700'}`}>
                    <CreditCard size={15} />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {displayCode}
                    </span>
                    {p.ngayThanhToan && (
                      <span className="text-2xs text-slate-500 font-mono block">Ngày lập: {formatDate(p.ngayThanhToan)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                    isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {p.tinhTrangThanhToan || "Chờ thu"}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenPayment(p)}
                    className="inline-flex items-center gap-1 text-3xs font-bold text-emerald-700 bg-white hover:bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    <span>Mở chi tiết</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>

              {/* Metrics Bar */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <DollarSign size={12} className="text-emerald-600" /> Tổng tiền phiếu thu
                    </span>
                    <span className="font-currency font-black text-sm text-emerald-800 tabular-nums mt-0.5">
                      {formatMoney(totalAmount)}
                    </span>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-col justify-center">
                    <span className="text-3xs uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                      <Calendar size={12} className="text-blue-600" /> Ngày hạch toán / Thu tiền
                    </span>
                    <span className="font-mono font-bold text-xs text-slate-800 mt-0.5">
                      {p.ngayThanhToan ? formatDate(p.ngayThanhToan) : "—"}
                    </span>
                  </div>
                </div>

                {/* Danh sách các đợt thu chi tiết (Hiển thị 100% trực diện, không cần bấm click mở thêm) */}
                {cacDotThu.length > 0 ? (
                  <div className="border border-slate-200/80 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <div className="bg-slate-50/90 px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-3xs font-bold uppercase text-slate-500 tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <Layers size={12} className="text-slate-400" /> Lịch sử các đợt thu thực tế ({cacDotThu.length})
                      </span>
                      <span>Số tiền & Chứng từ</span>
                    </div>
                    <div className="divide-y divide-slate-100 text-2xs">
                      {cacDotThu.map((dot: any, dIdx: number) => (
                        <div key={dIdx} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800">Đợt {dot.lanThu || dIdx + 1}</span>
                              <span className="text-3xs text-slate-500 font-mono">
                                ({dot.ngayThu ? formatDate(dot.ngayThu) : 'Chưa có ngày'})
                              </span>
                              {dot.hinhThuc && (
                                <span className="text-3xs font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {dot.hinhThuc}
                                </span>
                              )}
                            </div>
                            {dot.ghiChu && (
                              <p className="text-3xs text-slate-500 truncate mt-0.5">{dot.ghiChu}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-currency font-black text-xs text-emerald-800 tabular-nums">
                              {formatMoney(dot.soTien)}
                            </span>
                            {dot.soChungTu && (
                              <span className="text-3xs text-slate-400 font-mono block">
                                UNC: {dot.soChungTu}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-2xs text-slate-600 flex items-center justify-between">
                    <span className="font-medium">Chưa ghi nhận chi tiết từng đợt thu lẻ.</span>
                    <span className="font-currency font-bold text-slate-800 tabular-nums">Đã thu: {formatMoney(totalAmount)}</span>
                  </div>
                )}

                {/* Additional footer notes */}
                {(p as any).ghiChu && (
                  <div className="pt-1 text-3xs text-slate-500 border-t border-dashed border-slate-100">
                    <span className="font-semibold text-slate-600">Ghi chú: </span>
                    {(p as any).ghiChu}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {matchingPayments.length === 0 && (
          <div className="text-center py-8 text-slate-500 italic text-xs bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
            <p>Chưa có giao dịch thanh toán nào được ghi nhận cho hồ sơ này.</p>
            {showCreateButton && (
              <Button aria-label="Tạo phiếu thu" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-3 h-7 mx-auto">
                + Tạo Phiếu Thu
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
