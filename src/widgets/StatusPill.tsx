import React from 'react';
import { getStatusBadgeMeta, EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface StatusPillProps {
  statusStr?: string;
  animate?: boolean;
  className?: string;
}

/**
 * Standard system-wide StatusPill
 * Height: 20px (h-5), Micro-typography (text-2xs font-medium)
 * Meets Linear/Notion visual specifications.
 */
export function StatusPill({ statusStr = '', animate = true, className }: StatusPillProps) {
  // Try to parse as ZNS status first
  const normalizedZns = normalizeLegacyStatus(statusStr);
  
  // We can automatically detect if this is a known ZNS status
  const isZnsStatus = Object.values(EntityZnsStatus).includes(statusStr as EntityZnsStatus) || 
                      ['success', 'failed', 'sending', 'sent_waiting', 'limit_exceeded', 'dlq', 'init', 'pending', 'chua_gui'].some(s => statusStr.toLowerCase().includes(s));

  let classes: string;
  let label = statusStr;
  let IconComponent: React.ComponentType<{ className?: string }> | null = null;
  let showPulse = false;

  if (isZnsStatus) {
    const meta = getStatusBadgeMeta(normalizedZns);
    // Map heavy legacybg-100 to clean, low-density modern bgs
    if (normalizedZns === EntityZnsStatus.THANH_CONG) {
      classes = "bg-emerald-50 text-emerald-700 border-emerald-100/80";
    } else if (normalizedZns === EntityZnsStatus.THAT_BAI) {
      classes = "bg-red-50 text-red-700 border-red-100/80";
    } else if (normalizedZns === EntityZnsStatus.DANG_DAY) {
      classes = "bg-amber-50 text-amber-700 border-amber-100/80";
      showPulse = animate;
    } else if (normalizedZns === EntityZnsStatus.DA_DAY_CHO_KQ) {
      classes = "bg-blue-50 text-blue-700 border-blue-100/80";
    } else {
      classes = "bg-slate-50 text-slate-600 border-slate-200/80";
    }
    label = meta.label;
    IconComponent = meta.icon;
  } else {
    // Standard system states (contracts, payments, etc.)
    const term = statusStr.trim().toLowerCase();

    if (['thanh công', 'đã thanh toán', 'hoàn thành', 'đã giao', 'active', 'thành công', 'đã ký'].includes(term)) {
      classes = "bg-emerald-50 text-emerald-700 border-emerald-100/80";
    } else if (['nháp', 'chưa ký', 'chưa gửi', 'draft'].includes(term)) {
      classes = "bg-slate-50 text-slate-700 border-slate-200/80";
    } else if (['đang xử lý', 'chờ duyệt', 'đang chuyển', 'processing', 'pending', 'đang đẩy'].includes(term)) {
      classes = "bg-amber-50 text-amber-700 border-amber-100/80";
      showPulse = animate && term.includes('đang');
    } else if (['thất bại', 'hủy', 'quá hạn', 'cancelled', 'failed', 'bị từ chối'].includes(term)) {
      classes = "bg-red-50 text-red-700 border-red-100/80";
    } else if (['báo giá', 'đã gửi', 'sent', 'đang thực hiện'].includes(term)) {
      classes = "bg-cyan-50 text-cyan-700 border-cyan-100/80";
    } else {
      classes = "bg-slate-50 text-slate-600 border-slate-200/80";
    }
  }

  return (
    <span 
      className={twMerge(
        clsx(
          "inline-flex items-center h-5 px-1.5 rounded-md text-2xs font-medium gap-1 border transition-all duration-150 select-none",
          classes,
          className
        )
      )}
    >
      {showPulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
        </span>
      )}
      {IconComponent && !showPulse && <IconComponent className="w-3 h-3 shrink-0 opacity-80" />}
      <span className="truncate">{label}</span>
    </span>
  );
}
