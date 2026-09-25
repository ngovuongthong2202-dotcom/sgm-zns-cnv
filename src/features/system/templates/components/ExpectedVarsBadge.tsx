import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';

import { Button } from '@/src/design-system/Button';

interface Props {
  expectedVars: string;
}

export function ExpectedVarsBadge({ expectedVars }: Props) {
  const handleSync = async () => {
     const toastId = notify.loading('Đang đồng bộ từ CNV...');
     try {
       const res = await fetch('/api/zns-templates/sync-from-cnv', { method: 'POST' });
       if (!res.ok) throw new Error('Failed to sync');
       notify.dismiss(toastId);
       notify.success('Đồng bộ mẫu ZNS từ CNV thành công');
     } catch (err: unknown) {
       notify.dismiss(toastId);
       notify.error('Lỗi đồng bộ: ' + (err instanceof Error ? err.message : String(err)));
     }
  };

  return (
    <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl shadow-sm text-sm shrink-0">
      <div className="font-semibold text-blue-800 mb-1 flex justify-between items-center">
         <span>CNV Expect Các Biến:</span>
         <Button onClick={handleSync} className="flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 px-2 py-1.5 rounded-md transition-colors text-xs font-medium">
            <RefreshCcw size={12} />
            Đồng bộ từ CNV
         </Button>
      </div>
      <p className="text-blue-700 font-mono text-xs max-w-full overflow-hidden text-ellipsis leading-relaxed tracking-wide mt-2">
         {expectedVars || '(Trống)'}
      </p>
    </div>
  );
}
