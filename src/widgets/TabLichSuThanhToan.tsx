import React from "react";
import { Button } from "@/src/design-system/Button";
import { Payment } from "@/src/domain/schema/payment.schema";
import { getPaymentDisplayLabel } from "@/src/domain/mapping/entity-label";
import { useNavigate } from "react-router-dom";
import { ExternalLink, CreditCard } from "lucide-react";

interface TabLichSuThanhToanProps {
  matchingPayments: Partial<Payment>[];
  onNavigateNew?: () => void;
  showCreateButton?: boolean;
}

export function TabLichSuThanhToan({ matchingPayments, onNavigateNew, showCreateButton }: TabLichSuThanhToanProps) {
  const navigate = useNavigate();

  const handleOpenPayment = (p: Partial<Payment>) => {
    if (p.id) {
      navigate(`/payments?id=${p.id}`, { state: { openDrawer: p } });
    }
  };

  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Phiếu thu & Đợt thanh toán ({matchingPayments.length})</span>
      </h4>
      <div className="space-y-2.5">
        {matchingPayments.map(p => {
          const displayCode = p.paymentId || (p as any).soPhieuThu || (p as any).soChungTu || (p as any).soPhieuThanhToan || (p as any).code || getPaymentDisplayLabel(p);
          const isPaid = p.tinhTrangThanhToan?.toLowerCase().includes('tất toán') || p.tinhTrangThanhToan?.toLowerCase().includes('đã thanh toán');

          return (
            <div 
              key={p.id} 
              onClick={() => handleOpenPayment(p)}
              className="p-3.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl transition-all font-semibold text-xs text-slate-700 flex flex-col gap-1.5 cursor-pointer group shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard size={14} className="text-blue-600 shrink-0" />
                  <span className="text-slate-900 font-mono font-black text-xs group-hover:text-blue-700 transition-colors">
                    {displayCode}
                  </span>
                </div>
                <span className="text-3xs text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors inline-flex items-center gap-1">
                  Bấm mở chi tiết <ExternalLink size={10} />
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-150/70 text-2xs">
                <span className="text-slate-600 font-mono font-bold">
                  Số tiền: <strong className="text-slate-900">{new Intl.NumberFormat("vi-VN").format(p.soTien || (p as any).amount || 0)} ₫</strong>
                </span>
                <span className={`px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider text-3xs ${
                  isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {p.tinhTrangThanhToan || "Chờ thu"}
                </span>
              </div>
            </div>
          );
        })}
        {matchingPayments.length === 0 && (
          <div className="text-center py-6 text-slate-600 italic text-xs space-y-3">
            <p>Chưa gán giao dịch thanh toán nào.</p>
            {showCreateButton && (
              <Button aria-label="Tạo báo cáo thu" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-2.5 h-7">
                + Tạo Phiếu Thu
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
