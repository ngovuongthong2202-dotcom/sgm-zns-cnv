import { Button } from '@/src/design-system';
import React, { useState, useRef, useEffect } from 'react';
import { GroupingState } from '@tanstack/react-table';
import { ListTree } from 'lucide-react';

interface GroupMenuProps {
  grouping: GroupingState;
  onGroupingChange: (grouping: GroupingState) => void;
  options: { id: string; label: string }[];
}

export function GroupMenu({ grouping, onGroupingChange, options }: GroupMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // For simplified UI, we only allow 1 level of grouping in this menu.
  const activeGroup = grouping.length > 0 ? grouping[0] : null;

  return (
    <div className="relative" ref={containerRef}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        iconOnly
        title="Gộp nhóm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 w-8 text-slate-700 relative group"
      >
        <ListTree className={`w-4 h-4 transition-colors ${activeGroup ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"}`} />
        {activeGroup && (
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-blue-500 rounded-full" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full mt-1 right-0 w-[200px] z-[50] bg-white border border-slate-200 shadow-premium rounded-lg py-1 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <span className="text-2xs font-bold text-slate-600 uppercase tracking-wider">CHỌN TRƯỜNG GỘP NHÓM</span>
          </div>
          
          <Button
             type="button"
             variant="ghost"
             size="sm"
             onClick={() => {
                onGroupingChange([]);
                setIsOpen(false);
             }}
             className={`w-full justify-start text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 ${!activeGroup ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-slate-700'}`}
          >
            Không gộp (Mặc định)
          </Button>

          {options.map((opt) => (
            <Button
              key={opt.id}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onGroupingChange([opt.id]);
                setIsOpen(false);
              }}
              className={`w-full justify-start text-left px-3 py-1.5 text-xs font-medium transition-colors hover:bg-slate-50 ${activeGroup === opt.id ? 'text-blue-600 bg-blue-50/50 font-semibold' : 'text-slate-700'}`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
