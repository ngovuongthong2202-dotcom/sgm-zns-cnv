import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export interface SearchableSelectOption {
  value: string;
  label: string;
  subLabel?: string;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  isLoading?: boolean;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Chọn...', error, className = '', isLoading = false }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const deferredSearch = React.useDeferredValue(search);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);
  
  // Clean search terms for better matching
  const normalizedSearch = deferredSearch.toLowerCase().trim();
  const filteredOptions = options.filter(o => {
    const mainMatch = o.label.toLowerCase().includes(normalizedSearch);
    const subMatch = o.subLabel ? o.subLabel.toLowerCase().includes(normalizedSearch) : false;
    return mainMatch || subMatch;
  });

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div 
        className={`premium-input w-full flex items-center justify-between cursor-pointer bg-white ${error ? '!border-red-500 !bg-red-50/50' : ''}`}
        onClick={() => !isLoading && setIsOpen(!isOpen)}
      >
        <div className="flex-1 overflow-hidden pr-2">
          {isLoading ? (
            <div className="flex flex-col gap-1 w-full animate-pulse">
               <div className="h-4 bg-slate-200 rounded w-2/3"></div>
               <div className="h-3 bg-slate-100 rounded w-1/2"></div>
            </div>
          ) : selectedOption ? (
           <div className="flex flex-col">
              <span className="text-slate-900 truncate font-semibold">{selectedOption.label}</span>
              {selectedOption.subLabel && <span className="text-2xs text-slate-600 truncate">{selectedOption.subLabel}</span>}
           </div>
          ) : (
            <span className="text-slate-600">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className={`text-slate-600 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>
      
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white rounded-xl shadow-premium-xl border border-slate-200 overflow-hidden" style={{ minWidth: "100%" }}>
          <div className="p-3 border-b border-slate-100 flex items-center gap-2 text-slate-600 bg-slate-50/50 sticky top-0 z-10">
            <Search size={16} />
            <input aria-label="Nhập thông tin" 
              type="text" 
              className="w-full outline-none bg-transparent font-medium text-slate-700 placeholder:text-slate-600 text-sm" 
              placeholder="Nhập từ khóa tìm kiếm..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5 scrollbar-hide">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-sm font-medium text-slate-600 bg-slate-50 rounded-lg italic">Không tìm thấy kết quả phù hợp</div>
            ) : (
              filteredOptions.map(option => (
                <div 
                  key={option.value}
                  className={`px-3 py-2.5 mb-1 last:mb-0 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${value === option.value ? 'bg-brand-accent/5.5 border border-brand-accent/20' : 'hover:bg-slate-100 border border-transparent'}`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                >
                  <div className="flex flex-col pr-4 overflow-hidden">
                     <span className={`truncate text-sm ${value === option.value ? 'font-bold text-brand-accent' : 'font-medium text-slate-700'}`}>{option.label}</span>
                     {option.subLabel && <span className={`truncate text-2xs ${value === option.value ? 'text-blue-800/70' : 'text-slate-600'}`}>{option.subLabel}</span>}
                  </div>
                  {value === option.value && <Check size={16} className="text-brand-accent shrink-0" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
