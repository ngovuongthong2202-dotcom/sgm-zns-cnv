import React from "react";
import { EntityLinks } from "@/src/widgets/EntityLinks";

interface TabLienKetProps {
  entityId: string;
  entityType: "quotation" | "contract" | "payment" | "delivery" | "customer";
}

export function TabLienKet({ entityId, entityType }: TabLienKetProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_2px_rgba(15,23,42,0.02)] pt-2 mt-2">
      <EntityLinks entityId={entityId} entityType={entityType} />
    </div>
  );
}
