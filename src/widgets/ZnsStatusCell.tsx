import React from 'react';
import { StatusPill } from '@/src/widgets/StatusPill';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

interface ZnsStatusCellProps {
  status: EntityZnsStatus;
}

export function ZnsStatusCell({ status }: ZnsStatusCellProps) {
  return (
    <div onClick={(e) => e.stopPropagation()} className="group relative flex items-center gap-2">
      <StatusPill statusStr={status} />
    </div>
  );
}
