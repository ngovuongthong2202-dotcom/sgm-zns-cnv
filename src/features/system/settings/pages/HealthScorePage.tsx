import React, { useState } from 'react';
import { Settings, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';
import { t } from '@/src/i18n/vi';

export default function HealthScorePage() {
  const [isSaving, setIsSaving] = useState(false);
  const [weights, setWeights] = useState({
    conversion: 30,
    overdue: 40,
    recent: 30
  });

  const handleSave = async () => {
    const total = weights.conversion + weights.overdue + weights.recent;
    if (total !== 100) {
      notify.error('Tổng tỷ trọng cấu hình cần bằng 100%');
      return;
    }
    
    setIsSaving(true);
    // Giả lập lưu
    setTimeout(() => {
      setIsSaving(false);
      notify.success('Đã lưu cấu hình Sức khoẻ quan hệ thành công');
    }, 800);
  }

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] border border-slate-200">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Settings size={16} className="text-slate-500" />
            Tham số tính toán "Sức khoẻ quan hệ" (Health Score)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Điều chỉnh công thức gốc cho module AI Health Score
          </p>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-600 mt-0.5" size={16} />
          <div className="text-sm text-amber-800">
             <strong>Chú ý:</strong> Tổng của 3 loại tỷ trọng phải bằng 100%. Các đánh giá sẽ được áp dụng sau vài phút lên toàn bộ hệ thống ngay khi lưu.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-4">
              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-slate-500 block mb-1">
                   Tỷ trọng chốt HĐ (%)
                </label>
                <input 
                   type="number" 
                   value={weights.conversion}
                   onChange={e => setWeights({...weights, conversion: Number(e.target.value)})}
                   className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none text-sm font-mono shadow-inner"
                />
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-slate-500 block mb-1">
                   Tỷ trọng công nợ quá hạn (%)
                </label>
                <input 
                   type="number" 
                   value={weights.overdue}
                   onChange={e => setWeights({...weights, overdue: Number(e.target.value)})}
                   className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none text-sm font-mono shadow-inner"
                />
              </div>

              <div>
                <label className="text-2xs font-bold uppercase tracking-widest text-slate-500 block mb-1">
                   Tỷ trọng tương tác & CSKH gần đây (%)
                </label>
                <input 
                   type="number" 
                   value={weights.recent}
                   onChange={e => setWeights({...weights, recent: Number(e.target.value)})}
                   className="w-full h-10 border border-slate-200 rounded-lg px-3 outline-none text-sm font-mono shadow-inner"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-700">Tổng trọng số:</span>
                <span className={`text-sm font-bold bg-slate-100 px-3 py-1 rounded font-mono ${weights.conversion + weights.overdue + weights.recent !== 100 ? 'text-red-600' : 'text-emerald-600'}`}>
                   {weights.conversion + weights.overdue + weights.recent} / 100
                </span>
              </div>
           </div>
        </div>
      </div>
      <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 rounded-b-xl">
        <Button 
          variant="dark"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-900 text-white hover:bg-slate-800 transition-colors px-6 h-9 rounded-lg text-xs font-medium flex items-center gap-2 shadow-sm"
        >
          {isSaving ? (
             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
             <Save size={16} />
          )}
          {isSaving ? 'Đang áp dụng...' : t('common.save')}
        </Button>
      </div>
    </div>
  );
}
