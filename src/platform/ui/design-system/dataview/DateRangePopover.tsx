import { Button } from '@/src/design-system';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Calendar, X } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';

interface DateRangePopoverProps {
  label: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  onChange: (start: string, end: string) => void;
}

export function DateRangePopover({
  label,
  startDate,
  endDate,
  onChange,
}: DateRangePopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePreset = (preset: 'all' | 'today' | 'week' | 'month' | '30days' | '90days') => {
    const today = new Date();
    let start = '';
    let end = format(today, 'yyyy-MM-dd');

    switch (preset) {
      case 'all':
        start = '';
        end = '';
        break;
      case 'today':
        start = format(today, 'yyyy-MM-dd');
        break;
      case 'week':
        start = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        break;
      case 'month':
        start = format(startOfMonth(today), 'yyyy-MM-dd');
        break;
      case '30days':
        start = format(subDays(today, 30), 'yyyy-MM-dd');
        break;
      case '90days':
        start = format(subDays(today, 90), 'yyyy-MM-dd');
        break;
    }

    onChange(start, end);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', '');
    setIsOpen(false);
  };

  const isActive = startDate || endDate;

  const displayLabel = () => {
    if (!isActive) return label;
    if (startDate && endDate) return `${startDate} : ${endDate}`;
    if (startDate) return `>= ${startDate}`;
    return `<= ${endDate}`;
  };

  return (
    <div className="relative shrink-0 select-none text-left" ref={containerRef}>
      <div className="flex items-center">
        <Button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-8 px-2.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer border whitespace-nowrap shrink-0 flex-nowrap shadow-xs ${
            isActive
              ? 'bg-blue-50/50 border-blue-300 text-blue-700'
              : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50'
          }`}
          aria-expanded={isOpen}
        >
          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="whitespace-nowrap shrink-0 leading-none">{displayLabel()}</span>
          {isActive ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 hover:bg-blue-100/60 rounded-full ml-0.5 transition-colors cursor-pointer inline-flex items-center justify-center text-blue-500 hover:text-blue-700"
              title="Clear date filter"
            >
              <X className="w-3 h-3" />
            </span>
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-[240px] p-3 bg-white border border-slate-200 rounded-lg shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)]">
          <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Chọn nhanh khoảng
          </span>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'today', label: 'Hôm nay' },
              { id: 'week', label: 'Tuần này' },
              { id: 'month', label: 'Tháng này' },
              { id: '30days', label: '30 ngày qua' },
              { id: '90days', label: '90 ngày qua' },
            ].map(preset => (
              <Button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset.id as any)}
                className="text-left px-2 py-1 text-2xs font-medium text-slate-600 hover:text-blue-700 hover:bg-blue-50 border-0 rounded cursor-pointer transition-colors"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <span className="text-2xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Khoảng ngày tùy chọn
            </span>
            <div className="flex flex-col gap-2">
              <div className="flex flex-col">
                <span className="text-2xs font-semibold text-slate-600 mb-0.5">Từ ngày:</span>
                <input
                  type="date"
                  aria-label="Từ ngày tùy chọn"
                  value={startDate}
                  onChange={e => onChange(e.target.value, endDate)}
                  className="h-8 px-2 border border-slate-200 rounded-md text-2xs font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 transition-all font-mono"
                />
              </div>

              <div className="flex flex-col">
                <span className="text-2xs font-semibold text-slate-600 mb-0.5">Đến ngày:</span>
                <input
                  type="date"
                  aria-label="Đến ngày tùy chọn"
                  value={endDate}
                  onChange={e => onChange(startDate, e.target.value)}
                  className="h-8 px-2 border border-slate-200 rounded-md text-2xs font-medium outline-none bg-slate-50 focus:bg-white focus:border-blue-500 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default DateRangePopover;
