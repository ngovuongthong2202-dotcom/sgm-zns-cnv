import React from "react";
import { Button } from "@/src/design-system/Button";
import { Contract } from "@/src/domain/schema/contract.schema";

interface TabHopDongLienQuanProps {
  matchingContracts: Partial<Contract>[];
  onNavigateNew?: () => void;
  showCreateButton?: boolean;
}

export function TabHopDongLienQuan({ matchingContracts, onNavigateNew, showCreateButton }: TabHopDongLienQuanProps) {
  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-650 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Hợp đồng liên quan ({matchingContracts.length})</span>
      </h4>
      <div className="space-y-2.5">
        {matchingContracts.map(c => (
          <div key={c.id} className="p-3 bg-slate-50 border border-slate-150 rounded-lg hover:bg-slate-100/50 transition-colors font-semibold text-xs text-slate-700 flex flex-col gap-1">
            <span className="text-slate-900 font-bold">{c.soHopDong}</span>
            <span className="text-2xs text-slate-600 font-mono">Dự toán: {new Intl.NumberFormat("vi-VN").format((c as any).totalValue || (c as any).totalAmount || 0)} ₫</span>
            <span className="text-2xs text-slate-600">Tình trạng: {c.tinhTrangHopDong || "Mới"}</span>
          </div>
        ))}
        {matchingContracts.length === 0 && (
          <div className="text-center py-6 text-slate-600 italic text-xs space-y-3">
            <p>Chưa khai báo hợp đồng liên kết.</p>
            {showCreateButton && (
              <Button aria-label="Tạo hợp đồng" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-2.5 h-7">
                + Tạo Hợp Đồng V2
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
