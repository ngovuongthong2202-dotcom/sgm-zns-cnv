import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  Send, 
  ShieldCheck, 
  Link2, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  User, 
  CornerDownLeft, 
  RefreshCw,
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { auditLogsRepo, znsMessagesRepo } from '@/src/data/repositories/system.repo';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { notify } from '@/src/shared/utils/notify';
import { formatDate } from '@/src/shared/utils/formatDate';
import { Button } from '@/src/design-system/Button';
import { EntityAuditLogs } from './EntityAuditLogs';
import { EntityAuditMetadataCard } from './EntityAuditMetadataCard';
import { EntityZnsHistory } from './EntityZnsHistory';
import { EntityLinks } from './EntityLinks';

export type NexusFilterType = 'all' | 'notes' | 'zns' | 'audit' | 'links';

export interface UnifiedActivityAuditNexusProps {
  entityId: string;
  entityType: 'customer' | 'quotation' | 'contract' | 'payment' | 'delivery';
  documentCode?: string;
  documentTypeLabel?: string;
  creatorOrOfficer?: string;
  statusLabel?: string;
  statusColor?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  customerName?: string;
  initialFilter?: NexusFilterType;
}

export function UnifiedActivityAuditNexus({
  entityId,
  entityType,
  documentCode,
  documentTypeLabel = 'chứng từ',
  creatorOrOfficer,
  statusLabel,
  statusColor,
  createdAt,
  updatedAt,
  customerName,
  initialFilter = 'all',
}: UnifiedActivityAuditNexusProps) {
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<NexusFilterType>(initialFilter);
  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Subscribe to count metrics for dynamic capsule badge pills
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [znsMessages, setZnsMessages] = useState<any[]>([]);
  const [customerNotes, setCustomerNotes] = useState<any[]>([]);

  useEffect(() => {
    if (!entityId) return;

    let isMounted = true;

    // 1. Audit logs
    const unsubAudit = auditLogsRepo.subscribe(
      { fkField: 'entityId', fkId: entityId, limit: 100 },
      (data) => {
        if (isMounted) setAuditLogs(data || []);
      },
      () => {}
    );

    // 2. ZNS messages
    const unsubZns = znsMessagesRepo.subscribe(
      { fkField: 'entityId', fkId: entityId, limit: 100 },
      (data) => {
        if (isMounted) setZnsMessages(data || []);
      },
      () => {}
    );

    // 3. Customer notes (if customer)
    let unsubNotes = () => {};
    if (entityType === 'customer') {
      unsubNotes = repositoryFactory.get('customerNotes').subscribe(
        { fkField: 'customerId', fkId: entityId, limit: 100 },
        (data) => {
          if (isMounted) setCustomerNotes(data || []);
        },
        () => {}
      );
    }

    return () => {
      isMounted = false;
      unsubAudit();
      unsubZns();
      unsubNotes();
    };
  }, [entityId, entityType]);

  // Compute counts
  const counts = useMemo(() => {
    const typeLower = entityType.toLowerCase();
    
    // Notes count: customer notes + audit notes
    const auditNotesCount = auditLogs.filter(
      (l) => l.action === 'NOTE_ADDED' || l.action === 'ACTIVITY_LOGGED' || l.details?.note
    ).length;
    const totalNotes = (customerNotes?.length || 0) + auditNotesCount;

    // ZNS count: messages + ZNS audit logs
    const znsAuditCount = auditLogs.filter((l) => {
      const act = String(l.action || '');
      return act.startsWith('ZNS_') || ['ZNS_SEND', 'ZNS_CALLBACK', 'WORKFLOW_ZNS_TRIGGERED'].includes(act);
    }).length;
    const totalZns = Math.max(znsMessages.length, znsAuditCount);

    // Audit logs (excluding pure ZNS)
    const totalAudit = auditLogs.filter((l) => {
      const act = String(l.action || '');
      return !act.startsWith('ZNS_') && !['ZNS_SEND', 'ZNS_CALLBACK', 'WORKFLOW_ZNS_TRIGGERED'].includes(act);
    }).length;

    return {
      all: totalNotes + totalZns + totalAudit,
      notes: totalNotes,
      zns: totalZns,
      audit: totalAudit,
      links: 1, // At least self reference + related
    };
  }, [auditLogs, znsMessages, customerNotes, entityType]);

  // Handle Note Submission
  const handleAddQuickNote = async () => {
    if (!noteContent.trim() || isSubmittingNote) return;
    setIsSubmittingNote(true);

    try {
      const tags = noteContent.match(/#[\w\u00C0-\u1EF9]+/g)?.map((t) => t.slice(1)) || [];
      const mentions = noteContent.match(/@[\w.]+/g)?.map((m) => m.slice(1)) || [];
      const author = user?.email || (user as any)?.displayName || 'Quản trị viên';
      const now = new Date().toISOString();

      if (entityType === 'customer') {
        // Save as customerNote
        await repositoryFactory.get('customerNotes').create({
          customerId: entityId,
          content: noteContent.trim(),
          tags,
          mentions,
          createdBy: author,
          createdAt: now,
        });
      }

      // Also record audit log entry for unified traceability
      await auditLogsRepo.create({
        id: crypto.randomUUID(),
        action: 'NOTE_ADDED',
        entityId,
        entityType,
        timestamp: now,
        userId: author,
        details: {
          note: noteContent.trim(),
          tags,
          mentions,
          author,
          documentCode,
        },
      });

      setNoteContent('');
      notify.success('Đã lưu ghi chú hoạt động thành công');
    } catch (err: any) {
      console.error('Error adding quick note:', err);
      notify.error('Lỗi khi lưu ghi chú: ' + (err.message || 'Thao tác không thành công'));
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAddQuickNote();
    }
  };

  const filterTabs = [
    { id: 'all', label: 'Tất cả dòng chảy', count: counts.all, icon: Clock },
    { id: 'notes', label: 'Ghi chú & Trao đổi', count: counts.notes, icon: MessageSquare },
    { id: 'zns', label: 'Zalo ZNS OA', count: counts.zns, icon: Send },
    { id: 'audit', label: 'Nhật ký kiểm toán', count: counts.audit, icon: ShieldCheck },
    { id: 'links', label: 'Bản đồ liên kết', count: counts.links, icon: Link2 },
  ] as const;

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Capsule Segmented Control Bar */}
      <div className="bg-slate-100/80 p-1 rounded-xl flex items-center gap-1 overflow-x-auto scrollbar-none border border-slate-200/80 shadow-2xs">
        {filterTabs.map((tab) => {
          const isActive = activeFilter === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as NexusFilterType)}
              className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/70 ring-1 ring-blue-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent'
              }`}
            >
              <Icon size={12} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span
                  className={`text-3xs px-1.5 py-0.2 rounded-full font-mono font-bold ml-0.5 ${
                    isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 2. In-feed Quick Note Input (Hiển thị khi ở tab 'all' hoặc 'notes') */}
      {(activeFilter === 'all' || activeFilter === 'notes') && (
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
            <MessageSquare size={14} className="text-blue-600" />
            <span className="text-2xs uppercase font-extrabold tracking-wider text-slate-700">
              Ghi chú hoạt động & Chỉ đạo tác nghiệp
            </span>
            <span className="ml-auto text-3xs font-mono text-slate-400 flex items-center gap-1">
              <CornerDownLeft size={10} /> Nhấn Ctrl + Enter để lưu nhanh
            </span>
          </div>

          <div className="relative">
            <textarea
              rows={2}
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nhập ghi chú tác nghiệp, phản hồi khách hàng, đính kèm tag (#gap, #thanhtoan, #giaohang)..."
              className="w-full text-xs text-slate-800 placeholder:text-slate-400 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none font-sans"
            />
          </div>

          <div className="flex items-center justify-between mt-2 pt-1">
            <div className="flex items-center gap-1.5 text-3xs text-slate-400">
              <Tag size={11} className="text-slate-400" />
              <span>Gợi ý:</span>
              <button
                type="button"
                onClick={() => setNoteContent((prev) => (prev ? `${prev} #gap` : '#gap '))}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                #gap
              </button>
              <button
                type="button"
                onClick={() => setNoteContent((prev) => (prev ? `${prev} #thanhtoan` : '#thanhtoan '))}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                #thanhtoan
              </button>
              <button
                type="button"
                onClick={() => setNoteContent((prev) => (prev ? `${prev} #giaohang` : '#giaohang '))}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono"
              >
                #giaohang
              </button>
            </div>

            <Button
              variant="primary"
              size="xs"
              onClick={handleAddQuickNote}
              disabled={!noteContent.trim() || isSubmittingNote}
              className="h-7 text-2xs font-bold px-3"
              leftIcon={<Plus size={12} />}
            >
              {isSubmittingNote ? 'Đang lưu...' : 'Lưu ghi chú'}
            </Button>
          </div>
        </div>
      )}

      {/* 3. Panel Content Dynamic Switching */}
      <div className="space-y-4">
        {/* ALL MODE */}
        {activeFilter === 'all' && (
          <div className="space-y-4">
            {/* System Audit Overview Card at Top of All Feed */}
            <EntityAuditMetadataCard
              entityId={entityId}
              entityType={entityType}
              documentCode={documentCode}
              documentTypeLabel={documentTypeLabel}
              creatorOrOfficer={creatorOrOfficer}
              statusLabel={statusLabel}
              statusColor={statusColor}
              createdAt={createdAt}
              updatedAt={updatedAt}
              customerName={customerName}
            />

            {/* Quick Link Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h4 className="text-2xs uppercase font-extrabold tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Link2 size={13} className="text-blue-600" />
                  Mạng lưới chứng từ liên kết trực tiếp
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveFilter('links')}
                  className="text-3xs font-bold text-blue-700 hover:text-blue-800"
                >
                  Xem chi tiết bản đồ ↗
                </button>
              </div>
              <EntityLinks entityId={entityId} entityType={entityType} />
            </div>

            {/* Combined Chrono Stream */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
              <h4 className="text-2xs uppercase font-extrabold tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Clock size={13} className="text-blue-600" />
                Dòng sự kiện & Kiểm toán chi tiết
              </h4>
              <EntityAuditLogs entityId={entityId} entityType={entityType} />
            </div>
          </div>
        )}

        {/* NOTES ONLY */}
        {activeFilter === 'notes' && (
          <div className="space-y-3">
            {customerNotes && customerNotes.length > 0 && (
              <div className="space-y-2.5">
                {customerNotes.map((note) => (
                  <div key={note.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1.5">
                    <div className="flex items-center justify-between text-2xs text-slate-500">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <User size={12} className="text-slate-400" />
                        {note.createdBy || 'Quản trị viên'}
                      </span>
                      <span className="font-mono text-3xs">{formatDate(note.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{note.content}</p>
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {note.tags.map((t: string, idx: number) => (
                          <span key={idx} className="px-1.5 py-0.2 rounded text-3xs font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* In case of audit note logs */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
              <h4 className="text-2xs uppercase font-extrabold tracking-wider text-slate-700 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <MessageSquare size={13} className="text-blue-600" />
                Nhật ký chỉ đạo & ghi chú hệ thống
              </h4>
              <EntityAuditLogs entityId={entityId} entityType={entityType} />
            </div>
          </div>
        )}

        {/* ZNS ONLY */}
        {activeFilter === 'zns' && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
            <h4 className="text-2xs uppercase font-extrabold tracking-wider text-slate-700 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Send size={13} className="text-blue-600" />
              Lịch sử tương tác Zalo ZNS OA
            </h4>
            <EntityZnsHistory entityId={entityId} entityType={entityType} />
          </div>
        )}

        {/* AUDIT ONLY */}
        {activeFilter === 'audit' && (
          <EntityAuditMetadataCard
            entityId={entityId}
            entityType={entityType}
            documentCode={documentCode}
            documentTypeLabel={documentTypeLabel}
            creatorOrOfficer={creatorOrOfficer}
            statusLabel={statusLabel}
            statusColor={statusColor}
            createdAt={createdAt}
            updatedAt={updatedAt}
            customerName={customerName}
          />
        )}

        {/* LINKS ONLY */}
        {activeFilter === 'links' && (
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
            <h4 className="text-2xs uppercase font-extrabold tracking-wider text-slate-700 mb-3 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Link2 size={13} className="text-blue-600" />
              Bản đồ cây chứng từ & Mối quan hệ thực thể
            </h4>
            <EntityLinks entityId={entityId} entityType={entityType} />
          </div>
        )}
      </div>
    </div>
  );
}
