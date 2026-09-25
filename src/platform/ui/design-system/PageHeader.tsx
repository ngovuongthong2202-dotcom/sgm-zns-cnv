import React from 'react';
import { Plus, Upload, Download } from 'lucide-react';
import { Button } from './Button';
import { Tooltip } from './Tooltip';

interface PageHeaderProps {
  title: string;
  meta: string;
  onNew?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  newLabel?: string;
}

export function PageHeader({ title, meta, onNew, onImport, onExport, newLabel = 'Tạo mới' }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shrink-0 select-none">
      <div>
        <h1 className="text-base font-semibold tracking-[-0.015em] text-slate-900 leading-normal">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5 font-normal">{meta}</p>
      </div>
      <div className="flex items-center gap-2">
        {onImport && (
          <Tooltip content="Nhập dữ liệu từ file Excel">
            <Button size="md" variant="secondary" leftIcon={<Upload size={14} />} aria-label="Nhập file Excel" onClick={onImport}>
              Import
            </Button>
          </Tooltip>
        )}
        {onExport && (
          <Tooltip content="Xuất báo cáo Excel">
            <Button size="md" variant="secondary" leftIcon={<Download size={14} />} aria-label="Xuất file Excel" onClick={onExport}>
              Export
            </Button>
          </Tooltip>
        )}
        {onNew && (
          <Tooltip content={<div className="flex items-center gap-1">Tạo mới <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-3xs">N</kbd></div>}>
            <Button size="md" variant="primary" leftIcon={<Plus size={14} />} aria-label="Thêm mới bản ghi" onClick={onNew}>
              {newLabel}
            </Button>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
