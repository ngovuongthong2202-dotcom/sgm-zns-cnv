import { Button } from '@/src/design-system';
import React, { useState, useRef, useEffect, useDeferredValue } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  isMulti?: boolean;
}

export function FilterDropdown({
  label,
  options,
  selectedValues,
  onChange,
  isMulti = true,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
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

  const handleSelect = (val: string) => {
    if (val === 'all') {
      onChange([]);
      if (!isMulti) setIsOpen(false);
      return;
    }

    if (isMulti) {
      if (selectedValues.includes(val)) {
        onChange(selectedValues.filter(v => v !== val));
      } else {
        onChange([...selectedValues, val]);
      }
    } else {
      onChange([val]);
      setIsOpen(false);
    }
  };

  const activeCount = selectedValues.length;

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(deferredSearch.toLowerCase().trim())
  );

  return (
    <div className="relative shrink-0 select-none text-left" ref={containerRef}>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer select-none whitespace-nowrap shrink-0 flex-nowrap shadow-xs"
        aria-expanded={isOpen}
      >
        <span className="whitespace-nowrap shrink-0 leading-none">{label}</span>
        {activeCount > 0 ? (
          <span className="bg-blue-50 text-blue-700 text-2xs h-4 px-1.5 rounded-full inline-flex items-center justify-center font-bold font-sans shrink-0">
            {activeCount}
          </span>
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 ml-0.5" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute left-0 mt-1 z-50 w-[280px] p-2 bg-white border border-slate-200 rounded-lg shadow-[0_8px_24px_-8px_rgba(15,23,42,0.12)]">
          {/* Internal Search if options > 8 */}
          {options.length > 8 && (
            <div className="relative flex items-center h-8 mb-1.5 border-b border-slate-100 pb-1.5 gap-1.5">
              <Search className="w-3 h-3 text-slate-400 ml-1 shrink-0" />
              <input
                type="text"
                placeholder="Tìm ô chọn..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full text-xs text-slate-800 bg-transparent border-0 outline-none p-0 focus:ring-0 placeholder:text-slate-400"
                aria-label={`Tìm kiếm trong ${label}`}
              />
              {search && (
                <Button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-0.5 hover:bg-slate-100 rounded text-slate-400"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
          )}

          {/* List content */}
          <div className="max-h-[220px] overflow-y-auto scrollbar-thin">
            {/* Show "All" or "Reset" choice */}
            <Button
              type="button"
              onClick={() => handleSelect('all')}
              className="w-full text-left px-2 py-1.5 text-2xs font-medium rounded text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between mb-0.5 cursor-pointer border-0"
            >
              <span>-- Tất cả {label} --</span>
              {activeCount === 0 && <Check className="w-3 h-3 text-blue-600 hover:text-slate-800" />}
            </Button>

            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-2xs text-slate-600 bg-slate-50/50 rounded italic font-medium">
                Không tìm thấy kết quả
              </div>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt.value);
                return (
                  <Button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className="w-full text-left px-2 py-1.5 text-2xs rounded transition-colors flex items-center justify-between hover:bg-slate-50 cursor-pointer border-0 mb-0.5 font-medium"
                  >
                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                      {isMulti ? (
                        <div
                          className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                        </div>
                      ) : null}
                      <span className={`truncate ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>
                        {opt.label}
                      </span>
                    </div>
                    {!isMulti && isSelected ? (
                      <Check className="w-3 h-3 text-blue-600" />
                    ) : null}
                  </Button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
