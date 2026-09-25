import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TabItem<T extends string = string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  count?: number | string;
  countColor?: string;
  disabled?: boolean;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: readonly TabItem<T>[] | TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  type?: 'line' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  type = 'line',
  size = 'md',
  className,
}: SegmentedTabsProps<T>) {
  if (type === 'pill') {
    return (
      <div 
        role="tablist"
        className={twMerge(
          "inline-flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200 select-none gap-0.5",
          className
        )}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={twMerge(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all outline-none cursor-pointer whitespace-nowrap",
                "focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? "bg-white text-slate-900 shadow-xs border border-slate-200/80 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent font-medium"
              )}
            >
              {Icon && (
                <Icon size={14} className={isActive ? "text-blue-600" : "text-slate-400"} />
              )}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={clsx(
                    "text-3xs px-1.5 py-0.5 rounded-full font-bold ml-0.5",
                    isActive ? "bg-blue-100 text-blue-700" : "bg-slate-200/80 text-slate-600"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Default: Line style (High visual ergonomics for pages, settings & drawers)
  return (
    <div 
      role="tablist"
      className={twMerge(
        "flex items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto scrollbar-hide",
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={twMerge(
              "flex items-center gap-2 border-b-2 transition-all outline-none cursor-pointer whitespace-nowrap select-none",
              "focus-visible:ring-2 focus-visible:ring-blue-500 rounded-t-lg",
              size === 'sm' && "px-3 py-2 text-xs",
              size === 'md' && "px-4 py-2.5 text-sm",
              size === 'lg' && "px-5 py-3 text-base",
              isActive
                ? "border-blue-600 text-blue-700 bg-blue-50/50 font-bold shadow-xs"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium"
            )}
          >
            {Icon && (
              <Icon 
                size={size === 'sm' ? 14 : 16} 
                className={isActive ? "text-blue-600" : "text-slate-400"} 
              />
            )}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={clsx(
                  "text-3xs px-1.5 py-0.2 rounded-full font-bold ml-1",
                  isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedTabs;
