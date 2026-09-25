import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { useDebounce } from '@/src/hooks/useDebounce';

interface AsyncSearchableSelectProps {
  collection: string;
  value: string;
  onChange: (value: string, doc?: Record<string, unknown>) => void;
  placeholder?: string;
  error?: string;
  className?: string;
  renderOption: (doc: Record<string, unknown>) => { label: string; subLabel?: string };
  filterOption?: (doc: Record<string, unknown>) => boolean;
  isOptionDisabled?: (doc: Record<string, unknown>) => { disabled: boolean; reason?: string };
  renderItemWrapper?: (doc: Record<string, unknown>, children: React.ReactNode) => React.ReactNode;
  disabled?: boolean;
}

// Maps to avoid race-condition by tracking current AbortControllers and Request IDs per base URL
const activeAbortControllers = new Map<string, AbortController>();
const requestSequences = new Map<string, number>();

const fetcher = async (url: string): Promise<Record<string, unknown>[]> => {
  const basePath = url.split('?')[0];

  // Get and increment sequence ID
  const currentReqId = (requestSequences.get(basePath) || 0) + 1;
  requestSequences.set(basePath, currentReqId);

  // Auto clean up / disconnect any existing active in-flight request on this base path
  const prevController = activeAbortControllers.get(basePath);
  if (prevController) {
    prevController.abort();
  }

  const controller = new AbortController();
  activeAbortControllers.set(basePath, controller);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const json = await res.json();

    // Verify requesting order sequence to protect against race conditions
    const latestReqId = requestSequences.get(basePath);
    if (latestReqId && currentReqId < latestReqId) {
      // Yield processing by returning a forever-pending promise
      return new Promise<Record<string, unknown>[]>(() => {});
    }

    return json.data;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      // Return a pending promise to prevent SWR from overwriting with stale results or error state
      return new Promise<Record<string, unknown>[]>(() => {});
    }
    throw err;
  } finally {
    if (activeAbortControllers.get(basePath) === controller) {
      activeAbortControllers.delete(basePath);
    }
  }
};

export function AsyncSearchableSelect({ 
  collection, 
  value, 
  onChange, 
  placeholder = 'Tìm kiếm...', 
  error, 
  className = '',
  renderOption,
  filterOption,
  isOptionDisabled,
  renderItemWrapper
}: AsyncSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
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

  const { data: rawOptionsData, isLoading, isValidating } = useSWR<Record<string, unknown>[]>(
    isOpen ? `/api/search/${collection}?q=${encodeURIComponent(debouncedSearch)}` : null,
    fetcher,
    { keepPreviousData: true }
  );
  
  const optionsData = rawOptionsData ? (filterOption ? rawOptionsData.filter(filterOption) : rawOptionsData) : undefined;


  // Load the selected item details if value exists but we don't have it in optionsData
  const { data: selectedDocData } = useSWR<Record<string, unknown>[]>(
    value && !isOpen ? `/api/search/${collection}?q=${encodeURIComponent(value)}` : null,
    fetcher
  );

  const selectedDoc = (optionsData || []).find(o => (o.id as string) === value) || (selectedDocData || []).find(o => (o.id as string) === value);
  const selectedOption = selectedDoc ? renderOption(selectedDoc) : null;

  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      <div 
        className={`premium-input w-full flex items-center justify-between cursor-pointer bg-white ${error ? '!border-red-500 !bg-red-50/50' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex-1 overflow-hidden pr-2">
          {selectedOption ? (
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
            {(isLoading || isValidating) && (
               <Loader2 className="w-4 h-4 text-brand-accent animate-spin" />
            )}
          </div>
          <div className="max-h-64 overflow-y-auto p-1.5 scrollbar-hide">
            {!optionsData && isLoading ? (
              <div className="flex flex-col gap-1 w-full animate-pulse p-3">
                 <div className="h-4 bg-slate-200 rounded w-2/3"></div>
                 <div className="h-3 bg-slate-100 rounded w-1/2"></div>
              </div>
            ) : optionsData && optionsData.length === 0 ? (
              <div className="p-4 text-center text-sm font-medium text-slate-600 bg-slate-50 rounded-lg italic">Không tìm thấy kết quả phù hợp</div>
            ) : (
              (optionsData || []).map(option => {
                const rendered = renderOption(option);
                const optionId = option.id as string;
                const disabledStatus = isOptionDisabled ? isOptionDisabled(option) : { disabled: false };
                
                const innerContent = (
                  <div 
                    title={disabledStatus.disabled ? disabledStatus.reason : undefined}
                    className={`px-3 py-2.5 mb-1 last:mb-0 rounded-lg flex items-center justify-between transition-colors ${
                      disabledStatus.disabled 
                        ? 'opacity-50 cursor-not-allowed bg-slate-50' 
                        : `cursor-pointer ${value === optionId ? 'bg-brand-accent/5 border border-brand-accent/20' : 'hover:bg-slate-100 border border-transparent'}`
                    }`}
                    onClick={() => {
                      if (disabledStatus.disabled) return;
                      onChange(optionId, option);
                      setIsOpen(false);
                      setSearch('');
                    }}
                  >
                    <div className="flex flex-col pr-4 overflow-hidden">
                       <span className={`truncate text-sm ${value === optionId && !disabledStatus.disabled ? 'font-bold text-brand-accent' : 'font-medium text-slate-700'}`}>{rendered.label}</span>
                       {rendered.subLabel && <span className={`truncate text-2xs ${value === optionId && !disabledStatus.disabled ? 'text-blue-800/70' : 'text-slate-600'}`}>{rendered.subLabel}</span>}
                    </div>
                    {value === optionId && <Check size={16} className={`shrink-0 ${disabledStatus.disabled ? 'text-slate-400' : 'text-brand-accent'}`} />}
                  </div>
                );
                
                const content = renderItemWrapper ? renderItemWrapper(option, innerContent) : innerContent;
                return <React.Fragment key={optionId}>{content}</React.Fragment>;
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
