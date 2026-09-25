import React, { useState, useEffect } from 'react';
import { ZnsTemplate } from '@/src/domain/schema/zns-template.schema';
import { FileCode2, AlertTriangle, AlertCircle, RefreshCw } from 'lucide-react';
import { getEntityDisplayLabel } from '@/src/domain/mapping/entity-label';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { settingsRepo } from '@/src/data/repositories/system.repo';

interface Props {
  template: ZnsTemplate;
  mockDataMap: Record<string, string>;
}

export function PayloadPreviewPanel({ template, mockDataMap }: Props) {
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<{message: string, missing: string[]} | null>(null);

  const [znsConfigDoc, setZnsConfigDoc] = useState<Record<string, unknown>[]>([]);
  const [recentEntities, setRecentEntities] = useState<any[]>([]);

  const strictMode = znsConfigDoc?.find((c) => c.id === 'zns_config')?.templateStrictMode;

  useEffect(() => {
    const unsub = settingsRepo.subscribe(100, (data) => {
      setZnsConfigDoc(data);
    }, console.error);
    return () => unsub();
  }, []);

  useEffect(() => {
    const collectionMap: Record<string, string> = {
      'CUSTOMER': 'customers',
      'QUOTATION': 'quotations',
      'CONTRACT': 'contracts',
      'PAYMENT': 'payments',
      'DELIVERY': 'deliveries'
    };
    const cName = collectionMap[template.entityType] || 'customers';
    const unsub = repositoryFactory.get(cName).subscribe(15, (data) => {
      setRecentEntities(data);
    }, console.error);
    return () => unsub();
  }, [template.entityType]);

  useEffect(() => {
    if (!selectedEntityId) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setPreviewError(null);
      setPreviewData(null);
      try {
        const res = await fetch('/api/zns/preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityId: selectedEntityId,
            entityType: template.entityType,
            messageType: template.templateKey 
          })
        });
        const data = await res.json();
        if (!res.ok) {
          setPreviewError({ message: data.error || 'Unknown error', missing: data.missing || [] });
        } else {
          setPreviewData(data.payload);
        }
      } catch (err: any) {
        setPreviewError({ message: err.message, missing: [] });
      } finally {
        setLoadingPreview(false);
      }
    };
    fetchPreview();
  }, [selectedEntityId, template.entityType, template.templateKey, template.variables]); // Re-fetch testing on variables change might require backend actually saving first though, but we just leave it for now. Actually, backend uses db templates. We'd have to save to see true effect, or pass template variables in body. Since we can't easily pass it without changing api, we leave it.

  // Generate fallback payload
  const fallbackPayload: Record<string, unknown> = {
    request_id: "REQ_123456789",
    stt: "1",
    so_dien_thoai_raw: "0912345678",
    phone: "0912345678",
    message_type: template.templateKey,
  };
  
  const fallbackVariableStatus: Record<string, { value: string; status: 'mapped' | 'fallback' | 'missing' }> = {};
  
  template.variables.forEach(v => {
    let val = mockDataMap[v.name] || '';
    if (!val && v.fallback) {
       val = v.fallback;
       fallbackVariableStatus[v.name] = { value: val, status: 'fallback' };
    } else if (!val) {
       fallbackVariableStatus[v.name] = { value: '', status: 'missing' };
    } else {
       fallbackVariableStatus[v.name] = { value: val, status: 'mapped' };
    }
    fallbackPayload[v.name] = val;
  });

  const displayPayload = previewData || fallbackPayload;
  let hasError: boolean;
  let missingVars: [string, string][];

  if (previewData) {
     missingVars = template.variables.filter(v => !displayPayload[v.name]).map(v => [v.name, 'trống']) as [string, string][];
     hasError = previewError !== null || (strictMode && missingVars.length > 0) ? true : false;
  } else {
     missingVars = Object.entries(fallbackVariableStatus)
        .filter(([_, s]) => s.status === 'missing')
        .map(([k]) => [k, 'trống']);
     hasError = missingVars.length > 0;
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full text-slate-300">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <FileCode2 size={16} className="text-emerald-400" />
          <h3 className="font-semibold text-sm">Payload CNV Sẽ Nhận</h3>
        </div>
        <select 
          className="bg-slate-800 border border-slate-700 text-xs rounded px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 w-48 text-slate-200"
          value={selectedEntityId}
          onChange={(e) => setSelectedEntityId(e.target.value)}
        >
          <option value="">[Hiển thị Mock Demo ▾]</option>
          {recentEntities?.map((e: any) => (
             <option key={e.id} value={e.id}>{getEntityDisplayLabel(template.entityType, e)}</option>
          ))}
        </select>
      </div>

      <div className="p-0 overflow-y-auto min-h-0 flex-1 font-mono text-xs relative">
        {loadingPreview && (
           <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-10">
              <RefreshCw className="animate-spin text-emerald-500" />
           </div>
        )}
        <div className="p-4">
           {selectedEntityId && !previewData && previewError ? (
              <div className="text-red-400">Error: {previewError.message}</div>
           ) : (
              <pre className="text-emerald-200">
                 {JSON.stringify(displayPayload, null, 2)}
              </pre>
           )}
        </div>
      </div>

      {hasError && (
        <div className="p-3 bg-red-950/50 border-t border-red-900/50 text-red-200 text-xs">
           <div className="flex items-start gap-2">
             <AlertTriangle size={14} className="shrink-0 mt-0.5 text-red-400" />
             <div className="space-y-1">
               <p className="font-semibold text-red-300">
                 {(previewError as any)?.code === 'ZALO_REQUIRED_VARS_EMPTY' 
                    ? `Không thể gửi! Hệ thống chặn vì thiếu biến required.`
                    : `Cảnh báo: ${missingVars.length} biến trống (${missingVars.map(m => m[0]).join(', ')})`}
                 {previewError ? ` - ${previewError.message}` : ''}
               </p>
               {strictMode && !previewError ? (
                 <p className="text-red-400">⛔ Strict Mode đang BẬT: Tin nhắn sẽ bị chặn gửi nếu gửi thực tế.</p>
               ) : !strictMode && !previewError ? (
                 <p className="text-amber-400/80">⚠ Strict Mode đang TẮT: Hệ thống vẫn sẽ gửi biến rỗng "" cho CNV.</p>
               ) : null}
             </div>
           </div>
        </div>
      )}
      
      {!hasError && Boolean(strictMode) && (
        <div className="p-3 bg-emerald-950/30 border-t border-emerald-900/50 text-emerald-300/80 text-xs flex items-center gap-2">
          <AlertCircle size={14} className="text-emerald-500" />
          Strict mode đang bật {selectedEntityId ? 'và payload này hợp lệ' : 'nhưng chú ý khi gửi thật'}.
        </div>
      )}
    </div>
  );
}
