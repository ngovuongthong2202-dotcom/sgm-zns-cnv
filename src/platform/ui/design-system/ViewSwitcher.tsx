import { Button } from '@/src/design-system';
import React from 'react';
import { Table, Kanban, Calendar, CalendarDays, List } from 'lucide-react';

export type ViewType = 'table' | 'board' | 'kanban' | 'calendar' | 'calendar-week' | 'list';

export interface ViewOption {
  value: ViewType;
  label: string;
  icon?: string;
}

interface ViewSwitcherProps {
  view: ViewType;
  onChange: (view: ViewType) => void;
  availableViews?: ViewOption[];
}

export function ViewSwitcher({ view, onChange, availableViews = [] }: ViewSwitcherProps) {
  // Translate views for Vietnamese operational users
  if (!availableViews || availableViews.length <= 1) {
    return null;
  }

  const getIcon = (name?: string) => {
    switch (name) {
      case 'Table':
        return <Table className="w-3.5 h-3.5" />;
      case 'Kanban':
      case 'Board':
        return <Kanban className="w-3.5 h-3.5" />;
      case 'Calendar':
        return <Calendar className="w-3.5 h-3.5" />;
      case 'CalendarDays':
        return <CalendarDays className="w-3.5 h-3.5" />;
      case 'List':
        return <List className="w-3.5 h-3.5" />;
      default:
        return <Table className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="flex bg-slate-50 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold select-none h-8 items-center">
      {availableViews.map((opt) => {
        const isSelected = view === opt.value;
        return (
          <Button
            key={opt.value}
            variant="ghost"
            size="sm"
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-1.5 px-3 h-full rounded-md transition-all text-xs whitespace-nowrap shrink-0 ${
              isSelected
                ? 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] text-slate-900 border border-slate-200/40 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 font-medium'
            }`}
            aria-pressed={isSelected}
            aria-label={`View as ${opt.label}`}
          >
            {getIcon(opt.icon)}
            <span>{opt.label}</span>
          </Button>
        );
      })}
    </div>
  );
}

export default ViewSwitcher;
