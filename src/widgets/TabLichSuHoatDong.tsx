import React from "react";
import { Clock } from "lucide-react";
import { EntityAuditLogs } from "@/src/widgets/EntityAuditLogs";

interface TabLichSuHoatDongProps {
  entityId: string;
  entityType: "quotation" | "contract" | "payment" | "delivery" | "customer";
}

export function TabLichSuHoatDong({ entityId, entityType }: TabLichSuHoatDongProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-650 mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
        <Clock size={12} /> Lịch sử hoạt động CRM
      </h3>
      <EntityAuditLogs entityId={entityId} entityType={entityType} />
    </div>
  );
}
