import React from "react";
import { Button } from "@/src/design-system/Button";
import { Payment } from "@/src/domain/schema/payment.schema";

interface TabLichSuThanhToanProps {
  matchingPayments: Partial<Payment>[];
  onNavigateNew?: () => void;
  showCreateButton?: boolean;
}

export function TabLichSuThanhToan({ matchingPayments, onNavigateNew, showCreateButton }: TabLichSuThanhToanProps) {
  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Phiếu thu & Đợt thanh toán ({matchingPayments.length})</span>
      </h4>
      <div className="space-y-2.5">
        {matchingPayments.map(p => (
          <div key={p.id} className="p-3 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100/50 transition-colors font-semibold text-xs text-slate-700 flex flex-col gap-1">
            <span className="text-slate-900 font-bold">{(p as any).soPhieuThanhToan || p.id?.slice(0, 8)}</span>
            <span className="text-2xs text-slate-600 font-mono">Số tiền nhập: {new Intl.NumberFormat("vi-VN").format(p.soTien || (p as any).amount || 0)} ₫</span>
            <span className="text-2xs text-slate-600">Trạng thái: {p.tinhTrangThanhToan || "Chờ thu"}</span>
          </div>
        ))}
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
