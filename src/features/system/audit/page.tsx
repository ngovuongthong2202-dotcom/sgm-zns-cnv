/* eslint-disable max-lines */
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Database, UserCheck, Activity, Clock, CodeSquare, FileJson, FileText } from 'lucide-react';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { useDebounce } from '../../../hooks/useDebounce';

import { Button } from '@/src/design-system/Button';
import { KPICard } from '@/src/design-system/KPICard';
import { tokens } from '@/src/design-system/tokens';
import { InlineEntityLabel } from '@/src/design-system/InlineEntityLabel';
import { PageHeader } from '@/src/design-system/PageHeader';
import { t } from '@/src/i18n/vi';

export interface AuditLogType {
  id?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ZNS_SEND' | 'ZNS_CALLBACK' | 'TRANSACTION_UPDATE' | string;
  entityId: string;
  entityType: string;
  details: any; 
  userId: string;
  timestamp: string;
}

function useRepoPaginatedAuditLogs(limit: number) {
  const [data, setData] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadData = useCallback(async (currentOffset: number = 0) => {
    setLoading(true);
    try {
      const res = await repositoryFactory.get('auditLogs').listPaginated({
        limit,
        offset: currentOffset,
        sortField: 'timestamp',
        sortDirection: 'desc'
      });
      setData(prev => currentOffset > 0 ? [...prev, ...(res.data as AuditLogType[])] : (res.data as AuditLogType[]));
      setHasMore(res.hasMore);
      setOffset(currentOffset + res.data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    setData([]);
    setHasMore(true);
    setOffset(0);
    loadData(0);
  }, [loadData]);

  return { data, loading, loadMore: () => loadData(offset), hasMore };
}

function DiffViewer({ before, after }: { before: any, after: any }) {
  if (!before || !after) return null;
  
  // Collect all unique keys from both sides
  const keys = Array.from(new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {})
  ])).filter(key => key !== 'id' && key !== 'timestamp' && key !== 'lastIndexOffset');

  const formatVal = (k: string, v: any) => {
    if (v === null || v === undefined || v === '') return <span className="text-slate-400 italic">-- Trống --</span>;
    if (typeof v === 'object') return JSON.stringify(v);
    
    // Resolve relation IDs if applicable
    if (typeof v === 'string' && v.length > 5 && k.endsWith('Id') && !k.endsWith('UserId')) {
      const entityTypeMap: Record<string, string> = {
        customerId: 'customers',
        quotationId: 'quotations',
        contractId: 'contracts',
        paymentId: 'payments',
        deliveryId: 'deliveries',
      };
      const entityType = entityTypeMap[k];
      if (entityType) {
        return <span className="font-semibold text-blue-700 underline decoration-blue-200 underline-offset-2"><InlineEntityLabel entityType={entityType} entityId={v} fallbackId={v} /></span>;
      }
    }
    
    return String(v);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider p-3">
        <div>Trường thông tin</div>
        <div>{t('audit.timeline.before')}</div>
        <div>{t('audit.timeline.after')}</div>
      </div>
      <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto custom-scrollbar">
        {keys.map(key => {
          const valBefore = before[key];
          const valAfter = after[key];
          const isChanged = JSON.stringify(valBefore) !== JSON.stringify(valAfter);

          return (
            <div key={key} className={`grid grid-cols-3 p-3 text-xs items-center transition-colors ${isChanged ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50'}`}>
              <div className="font-semibold text-slate-700 font-mono text-2xs truncate pr-2" title={key}>
                {key}
              </div>
              <div className={`truncate pr-2 font-mono text-xs ${isChanged ? 'text-red-700 font-medium' : 'text-slate-500'}`}>
                {valBefore !== undefined ? (
                  <span className={isChanged ? "bg-red-50 px-1 py-0.5 rounded border border-red-100" : ""}>
                    {formatVal(key, valBefore)}
                  </span>
                ) : (
                  <span className="text-slate-300 italic">N/A</span>
                )}
              </div>
              <div className={`truncate font-mono text-xs ${isChanged ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                {valAfter !== undefined ? (
                  <span className={isChanged ? "bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100" : ""}>
                    {formatVal(key, valAfter)}
                  </span>
                ) : (
                  <span className="text-slate-300 italic">N/A</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AuditLogsFeature() {
  const { data: logs, loading, loadMore, hasMore } = useRepoPaginatedAuditLogs(25);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [activeFilterAction, setActiveFilterAction] = useState<string>('ALL');
  const [detailTab, setDetailTab] = useState<'diff' | 'json'>('diff');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchSearch = 
        String(log.entityId || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
        String(log.action || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(log.entityType || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        String(log.userId || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      
      const matchAction = activeFilterAction === 'ALL' ? true : log.action === activeFilterAction;
      return matchSearch && matchAction;
    }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [logs, debouncedSearchTerm, activeFilterAction]);

  // Group by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLogType[]> = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString('vi-VN');
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }, [filteredLogs]);

  const selectedLog = logs.find(l => l.id === selectedLogId);

  // Aggregates
  const last24hCount = logs.filter(l => (Date.now() - new Date(l.timestamp).getTime()) < 86400000).length;
  const activeUsers = new Set(logs.map(l => l.userId)).size;
  const createCount = logs.filter(l => l.action === 'CREATE').length;
  const updateCount = logs.filter(l => l.action === 'UPDATE' || l.action === 'TRANSACTION_UPDATE').length;

  const getActionStyles = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-blue-100 text-blue-700 border border-blue-200/55';
      case 'UPDATE': 
      case 'TRANSACTION_UPDATE': return 'bg-amber-100 text-amber-700 border border-amber-200/55';
      case 'DELETE': return 'bg-red-100 text-red-700 border border-red-200/55';
      case 'ZNS_SEND': 
      case 'ZNS_ENQUEUED': return 'bg-emerald-100 text-emerald-700 border border-emerald-200/55';
      case 'ZNS_CALLBACK': 
      case 'WORKFLOW_EVENT_EMITTED': return 'bg-cyan-100 text-cyan-700 border border-cyan-200/55';
      case 'VENDOR_WEBHOOK_PROCESSED': return 'bg-teal-100 text-teal-700 border border-teal-200/55';
      default: return 'bg-slate-100 text-slate-700 border border-slate-200/55';
    }
  };

  const downloadFile = (dataStr: string, filename: string) => {
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExportSingleJSON = (log: AuditLogType) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(log, null, 2));
    downloadFile(dataStr, `audit-log-${log.id || 'record'}.json`);
  };

  const handleExportFilteredJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    downloadFile(dataStr, `audit-logs-filtered-${new Date().toISOString().split('T')[0]}.json`);
  };

  const handleExportFilteredCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['ID', 'Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID'];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.id || '',
        new Date(log.timestamp).toISOString(),
        log.userId || '',
        log.action || '',
        log.entityType || '',
        log.entityId || ''
      ].map(field => `"${field}"`).join(','))
    ];
    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csvRows.join('\n'));
    downloadFile(dataStr, `audit-logs-export-${new Date().toISOString().split('T')[0]}.csv`);
  };

  const beforeData = selectedLog?.details?.oldValues || selectedLog?.details?.before || null;
  const afterData = selectedLog?.details?.newValues || selectedLog?.details?.after || null;
  const isDiffAvailable = beforeData && afterData;

  return (
    <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
      <PageHeader title={t('audit.title')} meta={t('audit.subtitle') as string} />
      {/* Top Aggregates & Filters */}
      <div className="flex flex-col shrink-0 bg-white border-b border-slate-200 z-10 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-slate-200">
           <KPICard title={t('audit.last_24h')} value={last24hCount} icon={<Activity />} color="blue" isActive />
           <KPICard title={t('audit.active_users')} value={activeUsers} icon={<UserCheck />} color="emerald" isActive />
           <KPICard title="Khởi tạo mới" value={createCount} icon={<Database />} color="blue" isActive />
           <KPICard title="Lượt cập nhật" value={updateCount} icon={<Clock />} color="amber" isActive />
        </div>

        {/* Action Type Filter Chips & Search & Export */}
        <div className="px-6 py-3.5 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
             <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 overflow-x-auto scrollbar-hide shrink-0">
               {[
                 { id: 'ALL', label: t('audit.filter_all') },
                 { id: 'CREATE', label: 'CREATE' },
                 { id: 'UPDATE', label: 'UPDATE' },
                 { id: 'DELETE', label: 'DELETE' },
                 { id: 'WORKFLOW_EVENT_EMITTED', label: 'WORKFLOW' },
                 { id: 'ZNS_ENQUEUED', label: 'ZNS' }
               ].map(chip => (
                 <Button
                   aria-label={chip.label}
                   key={chip.id}
                   onClick={() => setActiveFilterAction(chip.id)}
                   className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap outline-none ${
                     activeFilterAction === chip.id
                       ? 'bg-white text-slate-950 shadow-sm border border-slate-200/50'
                       : 'text-slate-500 hover:text-slate-900 bg-transparent border border-transparent'
                   }`}
                 >
                   {chip.label}
                 </Button>
               ))}
             </div>

             <div className="bg-slate-50 rounded-lg border border-slate-200 shadow-sm flex items-center px-3 relative flex-1 h-8 max-w-md focus-within:ring-2 focus-within:ring-blue-600/15 focus-within:border-blue-600 transition-shadow">
                <Search size={14} className="text-slate-400 mr-2" />
                <input aria-label="Tra cứu thông tin" 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-full bg-transparent text-xs outline-none font-sans placeholder:text-slate-400 text-slate-800"
                  placeholder={t('audit.timeline.searchPlaceholder')}
                />
             </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              aria-label="Export CSV"
              onClick={handleExportFilteredCSV}
              variant="secondary"
              size="sm"
              leftIcon={<FileText size={14} />}
            >
              Export CSV
            </Button>
            <Button
              aria-label="Export JSON"
              onClick={handleExportFilteredJSON}
              variant="secondary"
              size="sm"
              leftIcon={<FileJson size={14} />}
            >
              Export JSON
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 bg-white">
         {/* Left Rail: Timeline View */}
         <div className="w-1/3 min-w-[320px] max-w-[400px] border-r border-slate-200 bg-slate-50/50 overflow-y-auto flex-shrink-0 hidden md:flex flex-col min-h-0">
            {loading && filteredLogs.length === 0 ? (
               <div className="p-8 text-center text-sm text-slate-500 animate-pulse">Loading logs...</div>
            ) : Object.keys(groupedLogs).length === 0 ? (
               <div className="p-12 text-center">
                  <Database className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-500">Không tìm thấy nhật ký.</p>
               </div>
            ) : (
               <div className="flex-1 overflow-y-auto w-full custom-scrollbar">
                 {(Object.entries(groupedLogs) as [string, AuditLogType[]][]).map(([date, groupLogs]) => (
                    <div key={date}>
                       <h4 className="text-2xs font-bold uppercase tracking-wider text-slate-400 px-5 py-2.5 bg-slate-100/60 backdrop-blur z-10 sticky top-0 border-b border-slate-200/80 shadow-sm font-mono">
                         {date}
                       </h4>
                       <div className="flex flex-col bg-white">
                          {groupLogs.map(log => (
                             <div 
                               key={log.id} 
                               onClick={() => setSelectedLogId(log.id || null)}
                               className={`px-5 py-4 border-b border-slate-100 cursor-pointer transition-colors group relative ${
                                 selectedLogId === log.id 
                                   ? 'bg-blue-50/55 border-blue-100' 
                                   : 'hover:bg-slate-50'
                               }`}
                             >
                                {selectedLogId === log.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-md" />}
                                <div className="flex items-center justify-between mb-2">
                                   <span className={`px-2 py-0.5 rounded text-2xs font-bold tracking-wide uppercase ${getActionStyles(log.action)}`}>
                                      {log.action}
                                   </span>
                                   <span className="text-2xs text-slate-500 font-mono flex items-center gap-1.5 font-medium">
                                      <Clock size={12} className="text-slate-300" />
                                      {new Date(log.timestamp).toLocaleTimeString('vi-VN', { timeStyle: 'short' })}
                                   </span>
                                </div>
                                <p className={tokens.typography.heading.sm + " truncate text-slate-900 group-hover:text-blue-700 transition-colors"}>
                                  {log.entityType} <span className="font-mono text-slate-400 font-normal text-xs ml-1"> <InlineEntityLabel entityType={log.entityType} entityId={log.entityId} fallbackId={log.entityId} snapshotData={log.details?.after || log.details?.newValues || log.details?.before || log.details?.oldValues || log.details} /></span>
                                </p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate mt-1">
                                  <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 border border-slate-200">
                                    <UserCheck size={10} />
                                  </div>
                                  <span className="truncate text-2xs font-medium text-slate-500">{log.userId}</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 ))}
                 
                 {hasMore && (
                    <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-center">
                      <Button aria-label="Tải thêm logs" onClick={loadMore} isLoading={loading} variant="secondary" size="md">
                         Tải thêm logs
                      </Button>
                    </div>
                 )}
               </div>
            )}
         </div>

         {/* Right Panel: Detail with Diff */}
         <div className="flex-1 bg-[#F8FAFC] overflow-y-auto custom-scrollbar">
            {selectedLog ? (
               <div className="w-full max-w-4xl mx-auto p-4 md:p-8 animate-in fade-in duration-200 flex flex-col gap-6">
                  <div className="flex items-center justify-between">
                     <h2 className={tokens.typography.heading.lg + " text-slate-900 flex items-center gap-2"}>
                        {t('audit.timeline.selectLog')}
                     </h2>
                     <Button 
                        aria-label="Export JSON" 
                        onClick={() => handleExportSingleJSON(selectedLog)}
                        variant="secondary"
                        size="sm"
                        leftIcon={<FileJson size={14} />}
                     >
                        Export JSON
                     </Button>
                  </div>

                  <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] border border-slate-200 overflow-hidden">
                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 border-b border-slate-100 bg-slate-50/50">
                        <div>
                           <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thời gian</p>
                           <p className="text-sm font-mono text-slate-800 font-semibold">{new Date(selectedLog.timestamp).toLocaleString('vi-VN')}</p>
                        </div>
                        <div>
                           <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('audit.fields.user')}</p>
                           <p className="text-sm font-semibold text-slate-800">{selectedLog.userId}</p>
                        </div>
                        <div>
                           <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('audit.fields.entity_type')}</p>
                           <p className="text-sm font-bold text-slate-850 uppercase">{selectedLog.entityType}</p>
                        </div>
                        <div>
                           <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t('audit.fields.action')}</p>
                           <span className={`px-2 py-0.5 rounded text-2xs font-bold tracking-wide uppercase inline-block ${getActionStyles(selectedLog.action)}`}>
                              {selectedLog.action}
                           </span>
                        </div>
                     </div>
                     <div className="p-5 flex items-center justify-between bg-white">
                        <div>
                           <p className="text-2xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                             <Database size={12} className="text-slate-400" />
                             {t('audit.fields.ref_id')}
                           </p>
                           <code className="text-xs font-mono bg-slate-50 px-3 py-1.5 rounded-lg text-slate-850 border border-slate-200 inline-block font-semibold">
                             <InlineEntityLabel entityType={selectedLog.entityType} entityId={selectedLog.entityId} fallbackId={selectedLog.entityId} snapshotData={selectedLog.details?.after || selectedLog.details?.newValues || selectedLog.details?.before || selectedLog.details?.oldValues || selectedLog.details} />
                           </code>
                        </div>
                     </div>
                  </div>

                  {/* DIFF VIEWER PANEL */}
                  <div className="bg-white rounded-xl shadow-[0_1px_3px_rgba(15,23,42,0.04)] border border-slate-200 overflow-hidden">
                     <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                          <CodeSquare size={14} className="text-blue-500" /> {t('audit.timeline.compiled_title')}
                        </h3>

                        {isDiffAvailable && (
                          <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-250">
                             <Button 
                               onClick={() => setDetailTab('diff')}
                               className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                 detailTab === 'diff' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                               }`}
                             >
                               So sánh trực quan
                             </Button>
                             <Button 
                               onClick={() => setDetailTab('json')}
                               className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                                 detailTab === 'json' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                               }`}
                             >
                               JSON Thô
                             </Button>
                          </div>
                        )}
                     </div>

                     <div className="p-5 bg-white">
                        {isDiffAvailable && detailTab === 'diff' ? (
                          <DiffViewer before={beforeData} after={afterData} />
                        ) : (
                          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto shadow-inner border border-slate-800">
                             <pre className="font-mono text-2xs text-slate-300 leading-relaxed select-auto">
                                {JSON.stringify(selectedLog.details, null, 2)}
                             </pre>
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-5 border border-slate-200 shadow-sm">
                    <Database className="w-8 h-8 text-slate-350" />
                  </div>
                  <p className={tokens.typography.heading.md + " text-slate-700"}>{t('audit.timeline.selectLog')}</p>
                  <p className={tokens.typography.body.sm + " text-slate-400 mt-1"}>{t('audit.timeline.selectLogDesc')}</p>
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
