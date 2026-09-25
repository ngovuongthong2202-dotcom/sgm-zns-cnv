import React from "react";
import { Button } from "@/src/design-system/Button";
import { Delivery } from "@/src/domain/schema/delivery.schema";
import { formatDate } from "@/src/shared/utils/formatDate";

interface TabLichSuGiaoHangProps {
  matchingDeliveries: Partial<Delivery>[];
  showCreateButton?: boolean;
  onNavigateNew?: () => void;
}

export function TabLichSuGiaoHang({ matchingDeliveries, showCreateButton, onNavigateNew }: TabLichSuGiaoHangProps) {
  return (
    <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-4 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-655 pb-2 border-b border-slate-100 flex items-center justify-between">
        <span>Phiếu giao hàng ({matchingDeliveries.length})</span>
        {showCreateButton && (
          <Button aria-label="Tạo phiếu mới" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-2.5 h-6.5">
            + Phiếu Giao Mới
          </Button>
        )}
      </h4>
      <div className="space-y-2.5">
        {matchingDeliveries.map(d => {
          const displayDeliveryCode = (d as any).deliveryId || d.soPhieuXuat || (d as any).maGiaoHang || (d.id && !d.id.includes('-') ? d.id : 'Phiếu giao hàng');
          return (
            <div 
              key={d.id} 
              onClick={() => {
                if (d.id) {
                  window.location.href = `/deliveries?id=${d.id}`;
                }
              }}
              className="p-3.5 bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-xl transition-all font-semibold text-xs text-slate-705 flex flex-col gap-1.5 cursor-pointer group shadow-xs"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-slate-900 font-mono font-black text-xs group-hover:text-blue-700 transition-colors">
                  {displayDeliveryCode}
                </span>
                <span className="text-3xs text-blue-700 bg-white border border-blue-200 px-2 py-0.5 rounded-full font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  Bấm mở chi tiết ↗
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-2xs pt-1 border-t border-slate-150/70">
                <span className="text-slate-600 font-mono">Ngày giao: {formatDate(d.ngayGiaoThucTe || (d as any).ngayGiaoMay as string)}</span>
                {(d as any).donViVanChuyen && <span className="font-mono text-slate-950 font-bold text-2xs">ĐVVC: {(d as any).donViVanChuyen}</span>}
              </div>
            </div>
          );
        })}
        {matchingDeliveries.length === 0 && (
          <div className="text-center py-6 text-slate-600 italic text-xs space-y-3">
             <p>Chưa ghi nhận đợt xuất giao hàng.</p>
             {showCreateButton && (
              <Button aria-label="Tạo phiếu mới" variant="secondary" onClick={onNavigateNew} className="text-2xs font-bold py-1 px-2.5 h-7 mx-auto flex">
                + Phiếu Giao Mới
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
