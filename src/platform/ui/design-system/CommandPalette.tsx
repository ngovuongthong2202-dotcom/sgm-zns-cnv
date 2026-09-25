import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Search, Command } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FlexSearch from 'flexsearch';

interface CommandPaletteOption {
  id: string;
  title: string;
  type: string;
  url?: string;
  action?: () => void;
  [key: string]: any; 
}

interface CommandPaletteProps {
  options: CommandPaletteOption[];
  isOpen: boolean;
  onClose: () => void;
}

const LATELY_USED_KEY = 'zns_cmd_history';

export function CommandPalette({ options, isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const flexIndex = useMemo(() => {
    const index = new FlexSearch.Document<CommandPaletteOption>({
      document: {
        id: "id",
        index: ["title", "type"]
      },
      tokenize: "forward",
      resolution: 9
    });
    
    options.forEach(opt => index.add(opt));
    return index;
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (query.trim()) {
      const flexResults = flexIndex.search(query, { limit: 50, enrich: true });
      // flexResults returns an array for each indexed field. We need to merge them.
      const matchedIds = new Set<string>();
      const resultOpts: CommandPaletteOption[] = [];
      
      flexResults.forEach((fieldResult: any) => { 
        fieldResult.result.forEach((doc: any) => { 
          if (!matchedIds.has(doc.id)) {
            matchedIds.add(doc.id);
            resultOpts.push(doc.doc);
          }
        });
      });
      
      return resultOpts;
    }
    
    // Empty query -> show recent + top static
    let recentIds: string[] = [];
    try {
      recentIds = JSON.parse(localStorage.getItem(LATELY_USED_KEY) || '[]');
    } catch (e) {
      // Intentionally ignored fallback
    }

    const sorted = [...options].sort((a, b) => {
      const idxA = recentIds.indexOf(a.id);
      const idxB = recentIds.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return 0; // maintain original order for non-recent
    });
    return sorted.slice(0, 10);
  }, [flexIndex, query, options]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setQuery('');
      setActiveIndex(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const handleSelect = (option: CommandPaletteOption) => {
    onClose();
    if (option.action) {
      option.action();
    } else if (option.url) {
      navigate(option.url);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex justify-center items-start pt-[15vh]">
      <div className="fixed inset-0" onClick={onClose} />
      <div 
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-100"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
          }
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => Math.max(prev - 1, 0));
          }
          if (e.key === 'Enter' && filteredOptions[activeIndex]) {
            handleSelect(filteredOptions[activeIndex]);
          }
        }}
      >
        <div className="flex items-center px-4 py-3 border-b border-border-subtle">
          <Search className="w-5 h-5 text-text-muted mr-3" />
          <input
            ref={inputRef}
            aria-label="Từ khóa tìm kiếm" className="flex-1 bg-transparent border-none outline-none text-base text-text-primary placeholder-text-muted"
            placeholder="Search commands, customers, deliveries..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex flex-col gap-1 items-end pl-2">
            <div className="flex items-center gap-1 text-2xs text-text-muted bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Esc to close
            </div>
            <div className="flex items-center gap-1 text-2xs text-text-muted bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Enter to select
            </div>
          </div>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredOptions.length === 0 ? (
            <div className="text-center py-10 text-text-muted text-sm">
              No results found for "{query}"
            </div>
          ) : (
            filteredOptions.map((opt, i) => (
              <div
                key={opt.id}
                className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer ${
                  i === activeIndex ? 'bg-blue-50 text-accent' : 'text-text-primary hover:bg-slate-50'
                }`}
                onClick={() => handleSelect(opt)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <div className="flex items-center">
                  <Command className={`w-4 h-4 mr-3 ${i === activeIndex ? 'text-accent' : 'opacity-50'}`} />
                  <span className={i === activeIndex ? 'font-medium' : ''}>{opt.title}</span>
                </div>
                <span className="text-xs tracking-wider uppercase opacity-50 font-semibold">{opt.type}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
