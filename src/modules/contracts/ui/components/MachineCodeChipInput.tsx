import { Button } from '@/src/design-system';
import { useState, useEffect, useMemo, useRef } from 'react';
import { normalizeCode } from '@/src/shared/utils/textFormatter';

// Mock Inventory list for auto-suggest
const INVENTORY_MOCK = [
  'SGM-100D', 'SGM-200X', 'SGM-300PRO', 'SGM-500MAX', 'SGM-AUST-80', 
  'SGM-CNC-3040', 'SGM-LASER-1390', 'SGM-CO2-6090', 'SGM-FIBER-20W',
  'SGM-ECO-12', 'SGM-S400', 'SGM-D1325'
];

interface MachineCodeChipInputProps {
  value?: string[];
  onChange: (val: string[]) => void;
  allContracts?: any[];
}

export function MachineCodeChipInput({ value = [], onChange, allContracts = [] }: MachineCodeChipInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract other actual machine codes from existing contracts to populate auto-suggest list
  const suggestions = useMemo(() => {
    const fromContracts = allContracts.flatMap(c => c.danhSachMaMay || []);
    const merged = Array.from(new Set([...INVENTORY_MOCK, ...fromContracts]));
    const filteredByUsed = merged.filter(item => !value.includes(item));
    if (!inputVal) return filteredByUsed.slice(0, 10);
    return filteredByUsed.filter(item => 
      item.toLowerCase().includes(inputVal.toLowerCase())
    ).slice(0, 10);
  }, [inputVal, value, allContracts]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggest(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const addCode = (code: string) => {
    const clean = normalizeCode(code);
    if (clean && !value.includes(clean)) {
      onChange([...value, clean]);
    }
    setInputVal('');
    setShowSuggest(false);
  };

  const removeCode = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-wrap gap-2 p-2.5 border border-slate-200 rounded-lg min-h-[42px] bg-white focus-within:ring-2 focus-within:ring-slate-900/5 focus-within:border-slate-900 transition-all">
        {value.map((m, idx) => (
          <span key={idx} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-slate-100 text-2xs font-bold text-slate-700 font-mono tracking-wide border border-slate-200/60 shadow-sm transition-all hover:bg-slate-200">
            {m}
            <Button 
              type="button" 
              onClick={() => removeCode(idx)} 
              className="text-slate-400 hover:text-red-600 transition-colors focus:outline-none font-bold"
            >
              &times;
            </Button>
          </span>
        ))}
        <input 
          aria-label="mã máy"
          type="text"
          value={inputVal}
          onChange={(e) => { setInputVal(e.target.value); setShowSuggest(true); }}
          onFocus={() => setShowSuggest(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              if (inputVal.trim()) addCode(inputVal);
            }
          }}
          placeholder={value.length === 0 ? "Nhập mã máy (Enter để ghim)..." : "Thêm..."}
          className="flex-1 bg-transparent border-none outline-none text-xs font-semibold py-0.5 px-1 min-w-[120px] placeholder:text-slate-400 font-mono"
        />
      </div>
      {showSuggest && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-50 animate-fade-in">
          {suggestions.map((item, idx) => (
            <Button 
              key={idx}
              type="button"
              onClick={() => addCode(item)}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-between font-mono"
            >
              <span>{item}</span>
              <span className="text-3xs uppercase tracking-wider text-slate-400 font-semibold font-sans bg-slate-50 px-1.5 py-0.5 rounded border">Sẵn sàng</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
