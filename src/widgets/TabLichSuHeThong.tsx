import React from "react";
import { CheckSquare } from "lucide-react";
import { EntityAuditLogs } from "@/src/widgets/EntityAuditLogs";

interface TabLichSuHeThongProps {
  entityId: string;
  entityType: "quotation" | "contract" | "payment" | "delivery" | "customer";
}

export function TabLichSuHeThong({ entityId, entityType }: TabLichSuHeThongProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-655 mb-4 border-b border-slate-100 pb-2 flex items-center gap-1.5">
        <CheckSquare size={12} /> Nhật ký hệ thống (Audit Logs)
      </h3>
      <EntityAuditLogs entityId={entityId} entityType={entityType} />
    </div>
  );
}
