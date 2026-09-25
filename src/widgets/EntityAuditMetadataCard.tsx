import React from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { TabLichSuHeThong } from './TabLichSuHeThong';
import { formatDate } from '@/src/shared/utils/formatDate';

interface EntityAuditMetadataCardProps {
  entityId: string;
  entityType: 'quotation' | 'contract' | 'payment' | 'delivery' | 'customer';
  documentCode?: string;
  documentTypeLabel: string;
  creatorOrOfficer?: string;
  statusLabel?: string;
  statusColor?: string;
  createdAt?: string | number;
  updatedAt?: string | number;
  customerName?: string;
}

export function EntityAuditMetadataCard({
  entityId,
  entityType,
  documentCode,
  documentTypeLabel,
  creatorOrOfficer,
  statusLabel,
  statusColor,
  createdAt,
  updatedAt,
  customerName
}: EntityAuditMetadataCardProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (entityId) {
      navigator.clipboard.writeText(entityId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-3 flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <ShieldCheck size={16} className="text-emerald-600" />
          Hồ sơ kiểm toán chứng từ (System Audit Metadata)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-3xs uppercase font-bold text-slate-500">Mã hồ sơ hệ thống (UUID)</span>
              <button
                type="button"
                onClick={handleCopyId}
                className="text-slate-400 hover:text-blue-600 transition-colors inline-flex items-center gap-1 text-3xs font-medium"
                title="Sao chép mã UUID"
              >
                {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
              </button>
            </div>
            <span className="font-mono text-2xs font-bold text-slate-800 select-all break-all block">{entityId || '---'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Số hiệu {documentTypeLabel}</span>
            <span className="font-mono text-xs font-bold text-blue-700 block">{documentCode || '---'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Người lập / Phụ trách</span>
            <span className="font-semibold text-slate-800 block truncate">{creatorOrOfficer || '---'}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Trạng thái hồ sơ</span>
            <span className={`font-bold block ${statusColor || 'text-slate-800'}`}>
              {statusLabel || 'Bình thường'}
            </span>
          </div>

          {customerName && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
              <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Khách hàng liên kết</span>
              <span className="font-semibold text-slate-800 block truncate" title={customerName}>{customerName}</span>
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-150">
            <span className="text-3xs uppercase font-bold text-slate-500 block mb-0.5">Thời điểm ghi nhận</span>
            <span className="font-mono text-2xs text-slate-600 block">
              Tạo: {createdAt ? formatDate(createdAt) : '---'}
              {updatedAt && updatedAt !== createdAt ? ` • Cập nhật: ${formatDate(updatedAt)}` : ''}
            </span>
          </div>
        </div>
      </div>

      <TabLichSuHeThong entityId={entityId} entityType={entityType} />
    </div>
  );
}
