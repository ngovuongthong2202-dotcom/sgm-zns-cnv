import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { auditLogsRepo } from '@/src/data/repositories/system.repo';

interface ZnsLogItem {
  id: string;
  action: 'ZNS_SEND' | 'ZNS_CALLBACK' | string;
  timestamp: string | number;
  details?: {
    status?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export function EntityZnsHistory({ entityId, entityType }: { entityId: string, entityType: string }) {
  const [allLogs, setAllLogs] = useState<ZnsLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = auditLogsRepo.subscribe({ fkField: 'entityId', fkId: entityId, limit: 100 }, (data) => {
      setAllLogs(data as ZnsLogItem[]);
      setLoading(false);
    }, (err) => {
      console.error(err);
      setLoading(false);
    });
    return () => unsub();
  }, [entityId]);

  const typeLower = entityType.toLowerCase();
  const znsActions = [
    'ZNS_SEND', 'ZNS_CALLBACK', 'ZNS_ENQUEUED', 'ZNS_SENT_SYNC_SUCCESS', 
    'ZNS_SENT_SYNC_FAIL', 'ZNS_LIMIT_EXCEEDED', 'ZNS_DLQ', 
    'VENDOR_WEBHOOK_PROCESSED', 'WORKFLOW_ZNS_TRIGGERED', 'ZNS_PRE_FLIGHT_BLOCKED'
  ];
  
  const logs = allLogs.filter(log => {
    const belongsToZns = znsActions.includes(log.action) || String(log.action || '').startsWith('ZNS_');
    if (!belongsToZns) return false;
    
    // Match entityType (singular/plural, case-insensitive)
    const logType = String(log.entityType || '').toLowerCase();
    return logType === typeLower || 
           logType === typeLower + 's' || 
           typeLower === logType + 's';
  }).sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
    return timeB - timeA;
  });

  if (loading) return <div className="text-sm text-slate-600 py-8 flex items-center justify-center">Đang tải lịch sử...</div>;
  if (logs.length === 0) return <div className="text-sm text-slate-600 py-8 flex justify-center">Chưa có lịch sử gửi ZNS.</div>;

  return (
    <div className="relative border-l border-slate-200 ml-3 space-y-8 py-4">
      {logs.map((log) => {
        const isSuccess = log.details?.status === 'success' || log.action === 'ZNS_SEND';
        return (
          <div key={log.id} className="relative pl-8">
            <div className={`absolute -left-[17px] top-0 w-8 h-8 rounded-full border-4 border-slate-50 flex items-center justify-center ${
              log.action === 'ZNS_SEND' ? 'bg-blue-100 text-blue-600' :
              isSuccess ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            }`}>
              {log.action === 'ZNS_SEND' ? <Send size={12} /> : 
               isSuccess ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
               <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-sm text-slate-800">
                    {log.action === 'ZNS_SEND' ? 'Đã gửi yêu cầu ZNS' : 'ZNS Webhook Phản hồi'}
                  </div>
                  <div className="text-2xs font-mono text-slate-600">
                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </div>
               </div>
               
               <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 font-mono text-2xs text-slate-600 overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(log.details, null, 2)}
               </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
