import React from 'react';
import { ZnsTemplate, TemplateVariable } from '@/src/domain/schema/zns-template.schema';
import { Button } from '@/src/design-system/Button';
import { X, Check } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  oldTemplate: ZnsTemplate;
  newVariables: TemplateVariable[];
}

export function DiffViewerModal({ isOpen, onClose, onConfirm, oldTemplate, newVariables }: Props) {
  if (!isOpen) return null;

  const getDiffs = () => {
    const diffs: Array<{ name: string; type: string; oldValue?: string; newValue?: string }> = [];
    const oldVars = oldTemplate?.variables || [];
    const newVars = newVariables || [];
    
    newVars.forEach(nv => {
      const ov = oldVars.find(v => v.name === nv.name);

      if (!ov) {
         diffs.push({ name: nv.name, type: 'ADD', newValue: nv.sourceField });
      } else if (ov.sourceField !== nv.sourceField) {
         diffs.push({ name: nv.name, type: 'CHANGE', oldValue: ov.sourceField, newValue: nv.sourceField });
      }
    });
    oldVars.forEach(ov => {
      const nv = newVars.find(v => v.name === ov.name);
      if (!nv) {
        diffs.push({ name: ov.name, type: 'REMOVE', oldValue: ov.sourceField });
      }
    });
    return diffs;
  };

  const diffs = getDiffs();
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onConfirm();
      onClose();
    } catch (e: unknown) {
      notify.error(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
           <h2 className="text-lg font-bold text-slate-800">Xác nhận thay đổi (v{oldTemplate?.version || 1} → v{(oldTemplate?.version || 1) + 1})</h2>
           <Button aria-label="Đóng" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
              <X size={20} />
           </Button>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[60vh] overflow-y-auto font-mono text-sm">
           {diffs.length === 0 ? (
             <div className="text-slate-500 italic">Không có thay đổi nào về mapping variables.</div>
           ) : (
             <div className="space-y-3 flex flex-col">
               {diffs.map((d, i) => {
                 if (d.type === 'ADD') return <div key={i} className="text-emerald-700">+ [ {d.name} ] = {d.newValue}</div>;
                 if (d.type === 'REMOVE') return <div key={i} className="text-red-700 line-through">- [ {d.name} ] = {d.oldValue}</div>;
                 return (
                   <div key={i} className="flex grid-center gap-2">
                     <span className="text-amber-700">~ [ {d.name} ]</span>
                     <span className="text-red-700 bg-red-50 px-1 rounded">{d.oldValue || 'trống'}</span>
                     <span className="text-slate-400">→</span>
                     <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{d.newValue || 'trống'}</span>
                   </div>
                 );
               })}
             </div>
           )}
        </div>

        <div className="mt-6 flex justify-end gap-3">
           <Button variant="secondary" onClick={onClose}>Hủy lại</Button>
           <Button onClick={handleSave} isLoading={isSaving} leftIcon={<Check size={16} />}>Lưu Thành Bản Mới</Button>
        </div>
      </div>
    </div>
  );
}
