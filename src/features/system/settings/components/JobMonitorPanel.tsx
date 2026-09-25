import React, { useState } from 'react';
import useSWR from 'swr';
import { Activity, AlertTriangle, Clock, Bug, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { formatDate } from '@/src/shared/utils/formatDate';
import { Button } from '@/src/design-system';

export default function JobMonitorPanel() {
  const { data, error, mutate, isValidating } = useSWR('/api/metrics/monitor', async (url) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return { heartbeats: [], errors: [], clientErrors: [] };
      return res.json();
    } catch {
      return { heartbeats: [], errors: [], clientErrors: [] };
    }
  });
  const [expandedErrorId, setExpandedErrorId] = useState<string | null>(null);

  const isLoading = !data && !error;

  const formatWithTime = (dateStr: string) => {
    if (!dateStr) return '---';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.valueOf())) return dateStr;
      const t = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      return `${t} ${formatDate(dateStr)}`;
    } catch {
      return formatDate(dateStr);
    }
  };

  return (
    <div className="mt-4 border border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Activity size={16} className="text-blue-600" />
          Giám sát System & Cron
        </h3>
        <Button size="sm" variant="secondary" onClick={() => mutate()} leftIcon={<RefreshCw size={14} className={isValidating ? 'animate-spin' : ''} />}>
          Làm mới
        </Button>
      </div>
      <div className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 border-b border-slate-200">
          
          <div className="p-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-3">
              <Clock size={14} /> Cron Heartbeats (Top 10)
            </h4>
            {isLoading ? (
              <div className="text-sm text-slate-400">Đang tải...</div>
            ) : data?.heartbeats?.length > 0 ? (
              <ul className="space-y-2">
                {data.heartbeats.map((hb: any) => (
                  <li key={hb.id} className="text-xs flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <span className="font-medium text-slate-700">{hb.jobName || hb.id}</span>
                    <span className="text-slate-500">{formatWithTime(hb.timestamp || hb.lastRun)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-slate-400">Không có dữ liệu heartbeat.</div>
            )}
          </div>

          <div className="p-4">
            <h4 className="text-xs font-semibold text-red-500 uppercase flex items-center gap-2 mb-3">
              <AlertTriangle size={14} /> Cảnh báo & Lỗi hệ thống
            </h4>
            {isLoading ? (
               <div className="text-sm text-slate-400">Đang tải...</div>
            ) : data?.errors?.length > 0 ? (
              <ul className="space-y-2">
                {data.errors.map((errItem: any) => (
                  <li key={errItem.id} className="text-[11px] p-2 bg-red-50 text-red-800 rounded-md">
                    <div className="font-medium mb-1">{errItem.message}</div>
                    <div className="text-red-500/80 text-right">{formatWithTime(errItem.timestamp)}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-sm text-emerald-600 bg-emerald-50 p-2 rounded-md border border-emerald-100 flex items-center gap-2">
                 Thật tuyệt, không phát hiện lỗi nào gần đây.
              </div>
            )}
          </div>

        </div>

        {/* Client Errors Row */}
        <div className="p-4 bg-slate-50">
           <h4 className="text-xs font-semibold text-orange-600 uppercase flex items-center gap-2 mb-3">
              <Bug size={14} /> Lỗi Client (Giao diện React JS - Top 10)
           </h4>
           {isLoading ? (
               <div className="text-sm text-slate-400">Đang tải...</div>
            ) : data?.clientErrors?.length > 0 ? (
              <div className="space-y-2">
                {data.clientErrors.map((clientErr: any) => {
                  const isExpanded = expandedErrorId === clientErr.id;
                  return (
                    <div key={clientErr.id} className="border border-orange-200 bg-white rounded-md overflow-hidden transition-all">
                      <button 
                        onClick={() => setExpandedErrorId(isExpanded ? null : clientErr.id)}
                        className="w-full text-left p-3 flex items-start gap-2 hover:bg-orange-50/50 outline-none"
                      >
                         <div className="mt-0.5 text-orange-400">
                           {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                         </div>
                         <div className="flex-1 min-w-0">
                           <div className="text-[13px] font-medium text-slate-800 truncate">
                             {clientErr.error || 'Unknown Error'}
                           </div>
                           <div className="text-[11px] text-slate-500 mt-1 flex gap-3">
                             <span>{formatWithTime(clientErr.createdAt)}</span>
                             <span className="w-1 h-1 rounded-full bg-slate-300 mt-1.5" />
                             <span className="truncate max-w-[200px] md:max-w-md">{clientErr.url}</span>
                           </div>
                         </div>
                      </button>
                      {isExpanded && (
                        <div className="p-3 border-t border-orange-100 bg-slate-900 text-slate-300 text-xs font-mono overflow-x-auto">
                          <div className="mb-2 text-white font-semibold">Stack Trace:</div>
                          <pre className="whitespace-pre-wrap break-all leading-relaxed">{clientErr.stack || 'No stack trace'}</pre>
                          {clientErr.componentStack && (
                            <>
                              <div className="mt-4 mb-2 text-white font-semibold">Component Stack:</div>
                              <pre className="whitespace-pre-wrap break-all leading-relaxed text-slate-400">{clientErr.componentStack}</pre>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-emerald-600 bg-emerald-50 p-2 rounded-md border border-emerald-100 flex items-center gap-2">
                 Thật tuyệt, chưa ghi nhận lỗi UI nào từ người dùng.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
