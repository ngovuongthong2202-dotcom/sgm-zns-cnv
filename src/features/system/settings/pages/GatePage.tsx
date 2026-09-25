import React, { useEffect, useState } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { Shield, Play, RefreshCw } from 'lucide-react';
import { settingsRepo } from '@/src/data/repositories';

import { Button } from '@/src/design-system/Button';

export default function GatePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<any>({ 
    contractCreationGate: 'WARN',
    paymentCreationGate: 'WARN',
    deliveryCreationGate: 'WARN',
  });

  const [simState, setSimState] = useState({ entityType: 'QUOTATION', entityId: '' });
  const [simResult, setSimResult] = useState<any>(null); 
  const [simLoading, setSimLoading] = useState(false);

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const d = await settingsRepo.getSettings<any>('gate_policy');
        if (d) {
          setPolicy(d);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPolicy();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsRepo.setSettings('gate_policy', policy, true);
      notify.success('Đã lưu cấu hình Gate Policy');
    } catch (err: any) { 
      notify.error((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const handleSimulate = async () => {
     setSimLoading(true);
     setSimResult(null);
     try {
         const res = await fetch(`/api/workflow/check-gate?sourceType=${simState.entityType}&sourceId=${simState.entityId}`);
         const data = await res.json();
         setSimResult(data);
     } catch (err: any) { 
         notify.error("Lỗi Simulator: " + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)));
     } finally {
         setSimLoading(false);
     }
  };
  const LevelCard = ({ title, desc, icon, level, onChange }: any) => ( 
    <div className="bg-white border rounded-xl p-5 mb-4 shadow-sm border-slate-200 relative focus-within:ring-1 focus-within:ring-blue-500 transition-shadow group">
       <div className="flex justify-between items-start gap-4">
         <div className="flex gap-3">
            <div className="mt-1 group-hover:text-blue-600 transition-colors">{icon}</div>
            <div>
               <h3 className="font-medium text-slate-900 leading-none mb-1.5 text-sm">{title}</h3>
               <p className="text-xs text-slate-500 max-w-sm">{desc}</p>
            </div>
         </div>
         <select aria-label="Chế độ Gate" 
           value={level} 
           onChange={(e) => onChange(e.target.value)}
           className="px-3 h-8 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-medium hover:bg-slate-100 transition-colors shrink-0 outline-none cursor-pointer"
         >
           <option value="STRICT">STRICT (Cấm ngặt)</option>
           <option value="WARN">WARNING (Cảnh báo mềm)</option>
           <option value="BYPASS">BYPASS (Tự do)</option>
         </select>
       </div>
    </div>
  );

  if (loading) return <div className="p-8 text-slate-600 font-mono text-sm animate-pulse">Đang tải...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Workflow Gate Policy</h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          Quy định mức độ "chặn" của các bước quy trình. Khóa STRICT sẽ không cho phép tạo record con nếu record cha chưa gửi ZNS thành công.
        </p>
      </div>

      <div>
        <LevelCard
           title="Khởi tạo Hợp Đồng"
           desc="Yêu cầu Báo Giá tương ứng phải có trạng thái ZNS = SUCCESS."
           icon={<Shield size={20} className="text-slate-500" />}
           level={policy.contractCreationGate || 'STRICT'}
           onChange={(v: string) => setPolicy({...policy, contractCreationGate: v})}
        />
        <LevelCard
           title="Khởi tạo Phiếu Thu (Công Nợ)"
           desc="Yêu cầu Báo giá HOẶC Hợp đồng phản hồi ZNS = SUCCESS."
           icon={<Shield size={20} className="text-slate-500" />}
           level={policy.paymentCreationGate || 'STRICT'}
           onChange={(v: string) => setPolicy({...policy, paymentCreationGate: v})}
        />
        <LevelCard
           title="Khởi tạo Phiếu Giao Hàng"
           desc="Yêu cầu Phiếu thu phải được xác nhận gửi tin ZNS = SUCCESS."
           icon={<Shield size={20} className="text-slate-500" />}
           level={policy.deliveryCreationGate || 'STRICT'}
           onChange={(v: string) => setPolicy({...policy, deliveryCreationGate: v})}
        />
      </div>

      <div className="pb-6">
        <Button aria-label="Lưu cấu hình" 
           variant="primary"
           onClick={handleSave} 
           disabled={saving}
           className="h-8 px-4 bg-blue-600 text-white rounded-lg font-medium text-sm shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Đang lưu...' : 'Lưu Policy'}
        </Button>
      </div>

      <div className="pt-6 border-t border-slate-200">
         <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2"><Play className="text-blue-600 h-4 w-4" /> Gate Simulator</h3>
         <p className="text-xs text-slate-500 mb-4">Giả lập việc tạo record (Contract/Payment) với một record ID có sẵn để xem Gate hoạt động thế nào và trả ra phản hồi gì.</p>
         
         <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
             <div className="flex gap-4 items-end flex-wrap sm:flex-nowrap">
                <div className="w-full sm:w-auto">
                   <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5 focus-within:relative">Source Entity</label>
                   <select aria-label="Chọn Entity" 
                      value={simState.entityType} 
                      onChange={(e) => setSimState({...simState, entityType: e.target.value})}
                      className="px-3 h-8 bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none w-full sm:w-48 text-xs font-medium cursor-pointer"
                   >
                     <option value="QUOTATION">Từ Báo Giá</option>
                     <option value="CONTRACT">Từ Hợp Đồng</option>
                     <option value="PAYMENT">Từ Phiếu Thu</option>
                   </select>
                </div>
                <div className="flex-1 w-full sm:w-auto focus-within:relative">
                   <label htmlFor="sim-entity-id" className="text-2xs font-medium text-slate-500 uppercase tracking-wide block mb-1.5">Source ID</label>
                   <input aria-label="Source ID (Test)" 
                      id="sim-entity-id"
                      value={simState.entityId} 
                      onChange={(e) => setSimState({...simState, entityId: e.target.value})}
                      placeholder="Nhập ID để giả lập..."
                      className="w-full px-3 h-8 text-xs font-mono bg-white border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
                   />
                </div>
                <Button aria-label="Chạy Simulator" 
                  variant="secondary"
                  onClick={handleSimulate}
                  disabled={simLoading || !simState.entityId}
                  className="px-4 h-8 text-sm bg-white border border-slate-200 text-slate-700 font-medium rounded-lg hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 flex items-center gap-1.5 transition-colors focus:outline-none w-full sm:w-auto justify-center"
                >
                  {simLoading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />} Giả lập
                </Button>
             </div>
             {simResult && (
                 <div className="mt-5 border-t border-slate-200 pt-5">
                    <h4 className="text-2xs font-medium text-slate-500 uppercase tracking-wide mb-3">Kết quả:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-center items-start">
                          <span className={`px-2 py-0.5 rounded-md text-2xs font-bold tracking-wide uppercase ${
                              simResult.action === 'ALLOW' ? 'bg-emerald-100 text-emerald-700' :
                              simResult.action === 'WARN' ? 'bg-amber-100 text-amber-700' :
                              simResult.action === 'ASK_REASON' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                          }`}>
                            ACTION: {simResult.action}
                          </span>
                          <p className="text-sm text-slate-700 mt-2 font-medium">{simResult.reason || 'Có thể tiếp tục tạo document.'}</p>
                       </div>
                       <pre className="bg-slate-900 text-emerald-400 text-2xs p-4 rounded-lg overflow-auto w-full max-h-[160px] custom-scrollbar">
                          {JSON.stringify(simResult, null, 2)}
                       </pre>
                    </div>
                 </div>
             )}
         </div>
      </div>
    </div>
  );
}
