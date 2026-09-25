import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Clock, Phone, Hash } from 'lucide-react';
import { auditLogsRepo, znsMessagesRepo } from '@/src/data/repositories/system.repo';

interface ZnsHistoryItem {
  id: string;
  source: 'zns_message' | 'audit_log';
  action?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'SENDING' | string;
  timestamp: string | number;
  phone?: string;
  templateName?: string;
  trackingId?: string;
  details?: Record<string, unknown>;
  errorMessage?: string;
}

export function EntityZnsHistory({ entityId, entityType }: { entityId: string, entityType: string }) {
  const [znsMessages, setZnsMessages] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entityId) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    // 1. Subscribe to zns_messages table
    const unsubZns = znsMessagesRepo.subscribe({ fkField: 'entityId', fkId: entityId, limit: 100 }, (data) => {
      if (isSubscribed) {
        setZnsMessages(data || []);
        setLoading(false);
      }
    }, () => {
      if (isSubscribed) setLoading(false);
    });

    // 2. Subscribe to audit_logs table
    const unsubAudit = auditLogsRepo.subscribe({ fkField: 'entityId', fkId: entityId, limit: 100 }, (data) => {
      if (isSubscribed) {
        setAuditLogs(data || []);
      }
    }, () => {});

    return () => {
      isSubscribed = false;
      unsubZns();
      unsubAudit();
    };
  }, [entityId]);

  const typeLower = entityType.toLowerCase();

  // Combine and normalize items
  const combinedItems: ZnsHistoryItem[] = [];

  // Add from znsMessages
  znsMessages.forEach((msg) => {
    const statusUpper = String(msg.status || 'PENDING').toUpperCase();
    combinedItems.push({
      id: msg.id || msg.trackingId || Math.random().toString(),
      source: 'zns_message',
      status: statusUpper,
      timestamp: msg.createdAt || msg.updatedAt || Date.now(),
      phone: msg.phone || msg.data?.phone,
      templateName: msg.templateName || msg.templateId || msg.data?.templateName || msg.data?.templateId || 'Tin nhắn Zalo ZNS',
      trackingId: msg.trackingId || msg.id,
      errorMessage: msg.errorMessage || msg.error || msg.data?.errorMessage,
      details: msg.data || msg
    });
  });

  // Add from auditLogs (if not already captured)
  const znsActions = [
    'ZNS_SEND', 'ZNS_CALLBACK', 'ZNS_ENQUEUED', 'ZNS_SENT_SYNC_SUCCESS', 
    'ZNS_SENT_SYNC_FAIL', 'ZNS_LIMIT_EXCEEDED', 'ZNS_DLQ', 
    'VENDOR_WEBHOOK_PROCESSED', 'WORKFLOW_ZNS_TRIGGERED', 'ZNS_PRE_FLIGHT_BLOCKED'
  ];

  auditLogs.forEach((log) => {
    const actionStr = String(log.action || '');
    const belongsToZns = znsActions.includes(actionStr) || actionStr.startsWith('ZNS_');
    if (!belongsToZns) return;

    const logType = String(log.entityType || '').toLowerCase();
    const typeMatch = logType === typeLower || logType === typeLower + 's' || typeLower === logType + 's';
    if (!typeMatch) return;

    // Check if duplicate of a znsMessage
    const trackingId = log.details?.trackingId || log.details?.tracking_id;
    if (trackingId && combinedItems.some(item => item.trackingId === trackingId)) {
      return;
    }

    const isSuccess = log.details?.status === 'success' || actionStr === 'ZNS_SEND' || actionStr === 'ZNS_SENT_SYNC_SUCCESS';
    const isFail = log.details?.status === 'failed' || actionStr === 'ZNS_SENT_SYNC_FAIL' || actionStr === 'ZNS_DLQ';

    combinedItems.push({
      id: log.id || Math.random().toString(),
      source: 'audit_log',
      action: actionStr,
      status: isSuccess ? 'SUCCESS' : (isFail ? 'FAILED' : 'PENDING'),
      timestamp: log.timestamp || log.createdAt || Date.now(),
      phone: log.details?.phone as string | undefined,
      templateName: (log.details?.templateName as string) || (log.details?.template_id as string) || actionStr,
      trackingId: trackingId as string | undefined,
      details: log.details || log
    });
  });

  // Sort descending by timestamp
  combinedItems.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime() || 0;
    const timeB = new Date(b.timestamp).getTime() || 0;
    return timeB - timeA;
  });

  if (loading) {
    return <div className="text-xs text-slate-500 py-8 flex items-center justify-center font-medium">Đang tải lịch sử ZNS...</div>;
  }

  if (combinedItems.length === 0) {
    return (
      <div className="text-center py-10 px-4">
        <Send className="mx-auto h-8 w-8 text-slate-300 mb-2" />
        <p className="text-xs font-semibold text-slate-600">Chưa có lịch sử gửi ZNS</p>
        <p className="text-2xs text-slate-400 mt-1">Các tin ZNS gửi thành công hoặc qua webhook sẽ được ghi nhận tự động tại đây.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-slate-200 ml-4 space-y-6 py-2">
      {combinedItems.map((item) => {
        const isSuccess = item.status === 'SUCCESS' || item.status === 'DELIVERED';
        const isFailed = item.status === 'FAILED' || item.status === 'DLQ';
        const isPending = !isSuccess && !isFailed;

        let statusBadgeBg = 'bg-blue-50 text-blue-700 border-blue-200';
        let statusText = 'Đã gửi yêu cầu';
        if (isSuccess) {
          statusBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
          statusText = 'Gửi thành công';
        } else if (isFailed) {
          statusBadgeBg = 'bg-red-50 text-red-700 border-red-200';
          statusText = 'Thất bại';
        } else if (isPending) {
          statusBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
          statusText = 'Đang xử lý';
        }

        return (
          <div key={item.id} className="relative pl-6">
            <div className={`absolute -left-[15px] top-1 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center shadow-xs ${
              isSuccess ? 'bg-emerald-500 text-white' : 
              isFailed ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
            }`}>
              {isSuccess ? <CheckCircle2 size={13} /> : 
               isFailed ? <AlertCircle size={13} /> : <Clock size={13} />}
            </div>
            
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs hover:border-slate-300 transition-colors space-y-2.5">
               <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">
                      {item.templateName || 'Thông báo ZNS'}
                    </span>
                    <span className={`px-2 py-0.5 text-3xs font-extrabold rounded-full border ${statusBadgeBg} uppercase tracking-wider`}>
                      {statusText}
                    </span>
                  </div>
                  <span className="text-2xs font-mono text-slate-500 flex items-center gap-1">
                    <Clock size={11} className="text-slate-400" />
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </span>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs">
                  {item.phone && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Phone size={11} className="text-slate-400 shrink-0" />
                      <span>Số điện thoại: <strong className="font-mono text-slate-800">{item.phone}</strong></span>
                    </div>
                  )}
                  {item.trackingId && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <Hash size={11} className="text-slate-400 shrink-0" />
                      <span className="truncate">Tracking: <strong className="font-mono text-slate-700">{item.trackingId}</strong></span>
                    </div>
                  )}
               </div>

               {item.errorMessage && (
                  <div className="p-2 bg-red-50 rounded-lg border border-red-100 text-2xs text-red-700 font-medium">
                    Lỗi: {String(item.errorMessage)}
                  </div>
               )}

               {item.details && Object.keys(item.details).length > 0 && (
                  <details className="text-2xs text-slate-500 group">
                    <summary className="cursor-pointer hover:text-slate-800 font-semibold select-none flex items-center gap-1">
                      <span>Chi tiết kỹ thuật / Payload</span>
                    </summary>
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono text-3xs text-slate-600 overflow-x-auto whitespace-pre-wrap mt-1.5">
                      {JSON.stringify(item.details, null, 2)}
                    </div>
                  </details>
               )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
