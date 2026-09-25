import React from 'react';
import { Search, Download, CodeSquare } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { t } from '@/src/i18n/vi';

interface Props {
  activeTab: 'outbox' | 'dlq' | 'debug' | 'unmapped';
  setActiveTab: (tab: 'outbox' | 'dlq' | 'debug' | 'unmapped') => void;
  dlqCount: number;
  unmappedCount: number;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filterModule: string;
  setFilterModule: (val: string) => void;
  uniqueModules: string[];
  canManage: boolean;
  setShowSandbox: (show: boolean) => void;
  handleExportCsv: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export default function ZnsHubFilters({
  activeTab,
  setActiveTab,
  dlqCount,
  unmappedCount,
  searchTerm,
  setSearchTerm,
  filterModule,
  setFilterModule,
  uniqueModules,
  canManage,
  setShowSandbox,
  handleExportCsv,
  inputRef
}: Props) {
  return (
    <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
      <div className="flex bg-slate-100/50 p-1 rounded-lg border border-slate-200 overflow-x-auto scrollbar-hide">
        {[
          { id: 'outbox', label: t('znshub.tabs.outbox') },
          { id: 'dlq', label: t('znshub.tabs.dlq') },
          { id: 'debug', label: t('znshub.tabs.debug') },
          { id: 'unmapped', label: t('znshub.tabs.unmapped') },
        ].map(tab => (
          <Button
            aria-label={tab.label}
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-semibold'
                : 'text-slate-600 hover:text-slate-900 bg-transparent border border-transparent'
            }`}
          >
            {tab.label}
            {tab.id === 'dlq' && dlqCount > 0 && (
              <span className="inline-flex items-center justify-center bg-red-100 text-red-700 min-w-[20px] h-5 rounded-full text-2xs px-1.5 font-bold animate-pulse">
                {dlqCount}
              </span>
            )}
            {tab.id === 'unmapped' && unmappedCount > 0 && (
              <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 min-w-[20px] h-5 rounded-full text-2xs px-1.5 font-bold animate-pulse">
                {unmappedCount}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(activeTab === 'outbox' || activeTab === 'dlq') && (
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={inputRef}
                aria-label="Tìm kiếm log ZNS"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Tìm ID / Target..."
                className="pl-8 pr-3 h-8 bg-white border border-slate-200 rounded-lg text-sm w-48 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-shadow placeholder:text-slate-400"
              />
            </div>
            <select
              aria-label="Lọc theo phân hệ"
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg pl-3 pr-8 h-8 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              <option value="">Tất cả phân hệ</option>
              {uniqueModules.map(mod => (
                <option key={mod} value={mod}>
                  {mod}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {canManage && activeTab === 'debug' && (
          <Button
            aria-label="Webhook Sandbox"
            onClick={() => setShowSandbox(true)}
            variant="secondary"
            size="md"
            leftIcon={<CodeSquare size={14} />}
          >
            Sandbox Webhook
          </Button>
        )}
        
        <Button
          aria-label="Export CSV"
          onClick={handleExportCsv}
          variant="secondary"
          size="md"
          leftIcon={<Download size={14} />}
        >
          Xuất CSV
        </Button>
      </div>
    </div>
  );
}
