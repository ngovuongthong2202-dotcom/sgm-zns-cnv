import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Pin, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface CollapsibleStatsBannerProps {
  storageKey: string;
  title: string;
  summaryBadge?: string;
  children: React.ReactNode;
  className?: string;
}

export function CollapsibleStatsBanner({
  storageKey,
  title,
  summaryBadge,
  children,
  className = ''
}: CollapsibleStatsBannerProps) {
  // Read initial pinned state from localStorage (browser-safe)
  const [isPinned, setIsPinned] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(storageKey) === 'true';
      }
    } catch {
      // Fallback
    }
    return false;
  });

  // Default collapsed unless pinned
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        return window.localStorage.getItem(storageKey) === 'true';
      }
    } catch {
      // Fallback
    }
    return false;
  });

  // Sync state if storageKey changes
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey) === 'true';
      setIsPinned(saved);
      if (saved) {
        setIsExpanded(true);
      }
    } catch {
      // Ignore
    }
  }, [storageKey]);

  const [isFullyExpanded, setIsFullyExpanded] = useState<boolean>(isExpanded);

  useEffect(() => {
    if (!isExpanded) {
      setIsFullyExpanded(false);
    }
  }, [isExpanded]);

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPin = !isPinned;
    setIsPinned(nextPin);
    try {
      window.localStorage.setItem(storageKey, String(nextPin));
    } catch {
      // Ignore
    }
    if (nextPin) {
      setIsExpanded(true);
    }
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => {
      const next = !prev;
      if (!next) setIsFullyExpanded(false);
      return next;
    });
  };

  return (
    <div className={`w-full flex flex-col transition-all duration-200 ${className}`}>
      {/* Micro-Ribbon Header Bar */}
      <div 
        onClick={toggleExpanded}
        className={`w-full flex items-center justify-between px-4 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
          isExpanded 
            ? 'bg-slate-100/90 border-slate-200/90 text-slate-800 shadow-2xs mb-2.5' 
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-2xs hover:border-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
            isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            <BarChart3 className="w-3 h-3" />
          </div>
          <span className="text-xs font-bold tracking-tight truncate">
            {title}
          </span>
          {summaryBadge && (
            <span className="text-3xs font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700">
              {summaryBadge}
            </span>
          )}
          {!isExpanded && (
            <span className="text-3xs text-slate-400 font-medium hidden sm:inline">
              (Bấm để xem chi tiết thống kê)
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Pin Button */}
          <button
            type="button"
            title={isPinned ? 'Bỏ ghim (sẽ tự thu gọn khi tải lại trang)' : 'Ghim mở (luôn hiển thị thống kê)'}
            onClick={togglePin}
            className={`p-1 rounded-md text-3xs font-semibold flex items-center gap-1 border transition-all ${
              isPinned
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs hover:bg-blue-100'
                : 'bg-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 border-transparent'
            }`}
          >
            <Pin className={`w-3 h-3 ${isPinned ? 'fill-blue-600 rotate-45' : ''}`} />
            <span className="hidden md:inline">
              {isPinned ? 'Đã ghim mở' : 'Ghim'}
            </span>
          </button>

          {/* Toggle Expand Icon */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded();
            }}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content Area */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onAnimationComplete={() => {
              if (isExpanded) {
                setIsFullyExpanded(true);
              }
            }}
            className={isFullyExpanded ? "overflow-visible" : "overflow-hidden"}
          >
            <div className="pb-1">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
