import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { useDebounce } from '../../../hooks/useDebounce';
import { useConfirm } from '@/src/design-system/Confirm';
import { can } from '@/src/modules/iam';
import { useAuth } from '@/src/modules/iam';
import { PageHeader } from '@/src/design-system/PageHeader';

import ZnsHubKpiHeader from './components/ZnsHubKpiHeader';
import ZnsHubFilters from './components/ZnsHubFilters';
import ZnsHubTable from './components/ZnsHubTable';
import ZnsHubSandboxModal from './components/ZnsHubSandboxModal';

function useRepoPaginated(collectionName: string, enabled: boolean, limit: number, sortField: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);

  const loadData = useCallback(async (currentOffset: number = 0) => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await repositoryFactory.get(collectionName).listPaginated({
        limit,
        offset: currentOffset,
        sortField,
        sortDirection: 'desc'
      });
      setData(prev => currentOffset > 0 ? [...prev, ...res.data] : res.data);
      setHasMore(res.hasMore);
      setOffset(currentOffset + res.data.length);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [collectionName, enabled, limit, sortField]);

  useEffect(() => {
    setData([]);
    setHasMore(true);
    setOffset(0);
    if (enabled) {
      loadData(0);
    }
  }, [enabled, collectionName]);

  return {
    data,
    loading,
    loadMore: () => loadData(offset),
    hasMore
  };
}

export default function ZnsHubFeature() {
  const { userData } = useAuth();
  const canManage = can('manage_zns', 'zns_template', userData?.role);
  const [activeTab, setActiveTab] = useState<'outbox' | 'dlq' | 'debug' | 'unmapped'>('outbox');

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Single source of truth for Outbox & DLQ messages via realtime subscription (shared across outbox & dlq)
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  useEffect(() => {
    setLoadingMessages(true);
    const unsub = repositoryFactory.get('znsMessages').subscribe(
      { limit: 50, sortField: 'createdAt', sortDirection: 'desc' },
      (data) => {
        setMessages(data);
        setLoadingMessages(false);
      },
      (err) => {
        console.error(err);
        setLoadingMessages(false);
      }
    );
    return () => unsub();
  }, []);

  const handleLoadMoreMessages = useCallback(async () => {
    if (loadingMoreMessages || !hasMoreMessages || messages.length === 0) return;
    setLoadingMoreMessages(true);
    try {
      const res = await repositoryFactory.get('znsMessages').listPaginated({
        limit: 50,
        offset: messages.length,
        sortField: 'createdAt',
        sortDirection: 'desc'
      });
      if (!res.data.length || !res.hasMore) {
        setHasMoreMessages(false);
      }
      setMessages(prev => {
        const seen = new Set(prev.map((m: any) => m?.id));
        const newItems = (res.data as any[]).filter((m: any) => m?.id && !seen.has(m.id));
        return [...prev, ...newItems];
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMoreMessages(false);
    }
  }, [loadingMoreMessages, hasMoreMessages, messages.length]);

  // Tab-specific paginated datasets for Unmapped and Debug (table zns_callbacks uses processed_at)
  const { data: unmappedP, loading: loadingU, loadMore: loadMoreU, hasMore: hasMoreU } = useRepoPaginated(
    'znsUnmappedResults',
    activeTab === 'unmapped',
    25,
    'processed_at'
  );
  const { data: debugLogsP, loading: loadingD, loadMore: loadMoreD, hasMore: hasMoreD } = useRepoPaginated(
    'znsWebhookDebug',
    activeTab === 'debug',
    25,
    'processed_at'
  );

  const { confirm } = useConfirm();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);

  const [filterModule, setFilterModule] = useState('');
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [showSandbox, setShowSandbox] = useState(false);
  const [sandboxPayload, setSandboxPayload] = useState('{\n  "stt": "1",\n  "request_id": "test_123",\n  "status": "success"\n}');

  const outboxMessages = useMemo(() => {
    return messages.filter(m => m.status !== 'DLQ' && m.status !== 'FAILED');
  }, [messages]);

  const dlqMessages = useMemo(() => {
    return messages.filter(m => m.status === 'DLQ' || m.status === 'FAILED');
  }, [messages]);

  const uniqueModules = useMemo(() => {
    return Array.from(new Set(messages.map(m => m.entityType).filter(Boolean))) as string[];
  }, [messages]);

  const getFiltered = useCallback((arr: any[]) => {
    return arr.filter(msg => {
      const matchSearch = String(msg.id || msg.trackingId || msg.status || '').toLowerCase().includes(debouncedSearchTerm.toLowerCase());
      const matchModule = filterModule ? msg.entityType === filterModule : true;
      return matchSearch && matchModule;
    });
  }, [debouncedSearchTerm, filterModule]);

  const currentList = useMemo(() => {
    if (activeTab === 'outbox') return getFiltered(outboxMessages);
    if (activeTab === 'dlq') return getFiltered(dlqMessages);
    if (activeTab === 'debug') return debugLogsP;
    return unmappedP;
  }, [activeTab, getFiltered, outboxMessages, dlqMessages, debugLogsP, unmappedP]);

  // KPIs logically exclude PENDING to measure true success rate
  const { successRate, finishedCount } = useMemo(() => {
    const finished = messages.filter(m => m.status === 'SUCCESS' || m.status === 'FAILED' || m.status === 'DLQ');
    const successes = finished.filter(m => m.status === 'SUCCESS').length;
    return {
      successRate: finished.length > 0 ? Math.round((successes / finished.length) * 100) : 100,
      finishedCount: finished.length
    };
  }, [messages]);

  const healthPillColor = successRate >= 95 ? 'bg-emerald-500' : successRate >= 80 ? 'bg-amber-500' : 'bg-red-500';

  const handleExportCsv = () => {
    if (!currentList || currentList.length === 0) {
      notify.warning('Không có bản ghi nào để xuất CSV');
      return;
    }

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const filename = `zns_messages_${activeTab}_${dateStr}.csv`;

    const headers = ['ID', 'Thời gian', 'Trạng thái', 'Loại nghiệp vụ', 'Mã nghiệp vụ', 'Số điện thoại', 'Tracking ID', 'Số lần thử', 'Chi tiết lỗi'];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = currentList.map((item) => {
      const timeStr = item.createdAt || item.timestamp || item.receivedAt || item.processed_at || '';
      const formattedTime = timeStr ? new Date(timeStr).toLocaleString('vi-VN') : '';
      const phone = item.phone || item.recipientPhone || item.payload?.phone || item.payload?.soDienThoai || '';
      const tracking = item.trackingId || item.payload?.request_id || item.payload?.stt || item.id || '';
      const errorMsg = item.error || item.errorMessage || item.lastError || (typeof item.reason === 'string' ? item.reason : '') || '';

      return [
        escapeCsv(item.id || ''),
        escapeCsv(formattedTime),
        escapeCsv(item.status || ''),
        escapeCsv(item.entityType || ''),
        escapeCsv(item.entityId || ''),
        escapeCsv(phone),
        escapeCsv(tracking),
        escapeCsv(item.retryCount ?? item.attempts ?? 0),
        escapeCsv(errorMsg)
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notify.success(`Đã xuất ${currentList.length} bản ghi ra file ${filename}`);
  };

  const handleReplaySingle = async (e: React.MouseEvent, msgId: string) => {
    e.stopPropagation();
    if (await confirm({ title: 'Replay Message', message: 'Thử gửi lại tin ZNS này?' })) {
      const tid = notify.loading('Đang gửi lệnh...');
      try {
        const res = await fetch('/api/zns/replay', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId: msgId })
        });
        if (!res.ok) throw new Error('Lỗi backend');
        notify.dismiss(tid);
        notify.info('Hệ thống đã ghi nhận lệnh gửi lại vào hàng chờ (queued).');
      } catch (err: any) {
        notify.dismiss(tid);
        notify.error('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-sunken relative overflow-hidden">
      <PageHeader title="ZNS Control Hub" meta="Quản lý tin nhắn Zalo, lỗi gửi tin và mô phỏng giao tiếp Zalo" />
      <ZnsHubKpiHeader
        successRate={successRate}
        totalCount={messages.length}
        dlqCount={dlqMessages.length}
        healthPillColor={healthPillColor}
      />

      <div className="p-4 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(15,23,42,0.02)] border border-slate-200/80 flex flex-col h-full overflow-hidden">
          <ZnsHubFilters
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            dlqCount={dlqMessages.length}
            unmappedCount={unmappedP.length}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterModule={filterModule}
            setFilterModule={setFilterModule}
            uniqueModules={uniqueModules}
            canManage={canManage}
            setShowSandbox={setShowSandbox}
            handleExportCsv={handleExportCsv}
            inputRef={searchInputRef}
          />

          <ZnsHubTable
            activeTab={activeTab}
            currentList={currentList}
            loading={
              (activeTab === 'outbox' || activeTab === 'dlq') ? loadingMessages :
              activeTab === 'debug' ? loadingD :
              loadingU
            }
            expandedMsgId={expandedMsgId}
            setExpandedMsgId={setExpandedMsgId}
            handleReplaySingle={handleReplaySingle}
            hasMore={
              (activeTab === 'outbox' || activeTab === 'dlq') ? hasMoreMessages :
              activeTab === 'debug' ? hasMoreD :
              hasMoreU
            }
            loadMore={
              (activeTab === 'outbox' || activeTab === 'dlq') ? handleLoadMoreMessages :
              activeTab === 'debug' ? loadMoreD :
              loadMoreU
            }
            loadingMore={
              (activeTab === 'outbox' || activeTab === 'dlq') ? loadingMoreMessages :
              activeTab === 'debug' ? loadingD :
              loadingU
            }
          />
        </div>
      </div>

      {showSandbox && (
        <ZnsHubSandboxModal
          onClose={() => setShowSandbox(false)}
          sandboxPayload={sandboxPayload}
          setSandboxPayload={setSandboxPayload}
        />
      )}
    </div>
  );
}
