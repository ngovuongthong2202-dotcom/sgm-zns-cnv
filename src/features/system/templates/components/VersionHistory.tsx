import React from 'react';
import { ZnsTemplate } from '@/src/domain/schema/zns-template.schema';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Button } from '@/src/design-system/Button';
import { Clock, CheckCircle2, RotateCcw } from 'lucide-react';

interface Props {
  templates: ZnsTemplate[];
  selectedTemplateKey: string;
  onRestore: (template: ZnsTemplate) => void;
}

export function VersionHistory({ templates, selectedTemplateKey, onRestore }: Props) {
  const history = templates
    .filter(t => t.templateKey === selectedTemplateKey)
    .sort((a, b) => b.version - a.version);

  if (history.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
        <Clock size={16} className="text-slate-500" />
        <h3 className="font-semibold text-slate-800">Lịch sử cấu hình</h3>
      </div>
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[250px]">
         {history.map((t, idx) => {
            const isLatest = idx === 0;
            return (
              <div key={t.version} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                 <div>
                    <div className="flex items-center gap-2">
                       <span className="font-semibold text-slate-700">v{t.version}</span>
                       {isLatest && <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded flex items-center gap-1 font-medium"><CheckCircle2 size={12} /> Active</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                       {t.updatedAt ? formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: vi }) : 'Default mapping'} bởi {t.updatedBy || 'System'}
                    </div>
                 </div>
                 {!isLatest && (
                    <Button aria-label="Khôi phục version này" size="sm" variant="ghost" onClick={() => onRestore(t)} leftIcon={<RotateCcw size={14} className="text-slate-500" />} />
                 )}
              </div>
            );
         })}
      </div>
    </div>
  );
}
