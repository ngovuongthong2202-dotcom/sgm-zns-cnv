import { Button } from '@/src/design-system';
import React, { useState, useRef, useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { SortingState } from '@tanstack/react-table';

interface SortMenuProps {
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  availableColumns: { id: string; label: string }[];
  customTrigger?: React.ReactNode;
}

export function SortMenu({ sorting, onSortingChange, availableColumns, customTrigger }: SortMenuProps) {
  const [isOpen, setIsOpen] = useState(!customTrigger);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!customTrigger) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [customTrigger]);

  const addSort = (id: string) => {
    if (sorting.find(s => s.id === id)) return;
    onSortingChange([...sorting, { id, desc: false }]);
  };

  const removeSort = (id: string) => {
    onSortingChange(sorting.filter(s => s.id !== id));
  };

  const toggleSort = (id: string) => {
    onSortingChange(sorting.map(s => s.id === id ? { ...s, desc: !s.desc } : s));
  };
  
  const moveSort = (index: number, direction: 'up' | 'down') => {
    const newSorting = [...sorting];
    if (direction === 'up' && index > 0) {
      [newSorting[index - 1], newSorting[index]] = [newSorting[index], newSorting[index - 1]];
      onSortingChange(newSorting);
    } else if (direction === 'down' && index < newSorting.length - 1) {
      [newSorting[index], newSorting[index + 1]] = [newSorting[index + 1], newSorting[index]];
      onSortingChange(newSorting);
    }
  };

  const content = (
    <div className={`flex bg-white ${
      customTrigger 
        ? 'flex-col min-w-[245px] p-2.5 gap-2' 
        : 'border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.03)] rounded-lg p-1.5 gap-1.5 flex-wrap items-center'
      } text-xs select-none`}
    >
      {customTrigger && (
        <div className="text-2xs font-bold text-slate-600 uppercase tracking-widest px-1 py-0.5 leading-normal select-none">
          Thứ tự Sắp xếp
        </div>
      )}
      {!customTrigger && (
        <span className="text-slate-600 font-bold text-2xs uppercase tracking-wider px-1.5 select-none">
          Sắp xếp
        </span>
      )}
      
      {sorting.length === 0 && customTrigger && (
        <div className="text-xs text-slate-400 p-3 text-center italic select-none">
          Chưa cấu hình sắp xếp nâng cao.
        </div>
      )}

      {sorting.map((sort, index) => {
        const col = availableColumns.find(c => c.id === sort.id);
        return (
          <div 
            key={sort.id} 
            className={`flex items-center gap-1.5 bg-slate-50/65 border border-slate-200/60 rounded-md px-2 py-1 select-none ${
              customTrigger ? 'w-full justify-between' : ''
            }`}
          >
            <div className="flex items-center gap-1 min-w-0 flex-1">
              {index > 0 && (
                <Button 
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => moveSort(index, 'up')} 
                  className="rounded p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200" 
                  aria-label="Nâng thứ tự ưu tiên"
                >
                  <ChevronUp className="w-3 h-3" />
                </Button>
              )}
              {index < sorting.length - 1 && (
                <Button 
                  variant="ghost"
                  size="xs"
                  iconOnly
                  onClick={() => moveSort(index, 'down')} 
                  className="rounded p-0.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200" 
                  aria-label="Giảm thứ tự ưu tiên"
                >
                  <ChevronDown className="w-3 h-3" />
                </Button>
              )}
              <span className="font-semibold truncate text-slate-700 text-2xs leading-normal">{col?.label || sort.id}</span>
            </div>
            
            <div className="flex justify-end gap-1 shrink-0 items-center">
              <Button 
                variant="secondary"
                size="xs"
                onClick={() => toggleSort(sort.id)} 
                className="px-1.5 py-0.5 text-slate-700 font-bold text-3xs hover:text-slate-900" 
                aria-label="Đổi hướng sắp xếp"
              >
                {sort.desc ? 'Z-A (Giảm)' : 'A-Z (Tăng)'}
              </Button>
              <Button 
                variant="ghost"
                size="xs"
                iconOnly
                onClick={() => removeSort(sort.id)} 
                className="p-0.5 text-slate-400 hover:text-red-700 hover:bg-red-50" 
                aria-label={`Hủy sắp xếp cho cột ${sort.id}`}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        );
      })}

      {sorting.length < availableColumns.length && (
        <select
          aria-label="Thêm tiêu chí sắp xếp" 
          className={`text-2xs bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md outline-none text-blue-600 font-bold ${
            customTrigger ? 'w-full py-1.5 px-2.5 mt-1 cursor-pointer' : 'px-2 py-0.5 cursor-pointer'
          }`}
          onChange={(e) => {
            if (e.target.value) addSort(e.target.value);
            e.target.value = "";
          }}
        >
          <option value="">+ Thêm trường sắp xếp...</option>
          {availableColumns.filter(c => !sorting.find(s => s.id === c.id)).map(c => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
      )}
    </div>
  );

  if (!customTrigger) return content;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer h-full flex items-center">
        {customTrigger}
      </div>
      {isOpen && (
        <div className="absolute top-full lg:right-0 mt-1.5 z-50 bg-white rounded-lg shadow-[0_4px_12px_rgba(15,23,42,0.08)] border border-slate-200 animate-in fade-in slide-in-from-top-1">
          {content}
        </div>
      )}
    </div>
  );
}

export default SortMenu;
