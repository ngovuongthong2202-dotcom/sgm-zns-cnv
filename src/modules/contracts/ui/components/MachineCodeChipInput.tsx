import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/src/design-system';
import { normalizeCode } from '@/src/shared/utils/textFormatter';

interface MachineCodeChipInputProps {
  value?: string[];
  onChange: (val: string[]) => void;
  allContracts?: any[];
}

export function MachineCodeChipInput({ value = [], onChange, allContracts = [] }: MachineCodeChipInputProps) {
  const [inputVal, setInputVal] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Extract real machine codes from existing contracts if available (NO hardcoded mock)
  const suggestions = useMemo(() => {
    if (!inputVal || inputVal.trim().length < 2) return [];
    const fromContracts = allContracts.flatMap(c => c.danhSachMaMay || []);
    const uniqueRealCodes = Array.from(new Set(fromContracts));
    const filteredByUsed = uniqueRealCodes.filter(item => !value.includes(item));
    return filteredByUsed.filter(item => 
      item.toLowerCase().includes(inputVal.trim().toLowerCase())
    ).slice(0, 8);
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

  const addCodes = (rawText: string) => {
    if (!rawText) return;
    // Tách theo dấu phẩy, chấm phẩy, xuống dòng hoặc khoảng trắng
    const parts = rawText
      .split(/[,;\n\r\t]+/)
      .map(p => normalizeCode(p.trim()))
      .filter((p): p is string => Boolean(p && p.length > 0));

    if (parts.length === 0) return;

    const newSet = new Set(value);
    parts.forEach(p => newSet.add(p));
    onChange(Array.from(newSet));
    setInputVal('');
    setShowSuggest(false);
  };

  const removeCode = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === 'Tab') {
      if (inputVal.trim()) {
        e.preventDefault();
        addCodes(inputVal);
      }
    } else if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      // Xóa tag cuối khi nhấn Backspace trên ô trống
      removeCode(value.length - 1);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (pasted && (pasted.includes(',') || pasted.includes(';') || pasted.includes('\n') || pasted.trim().length > 0)) {
      e.preventDefault();
      addCodes(pasted);
    }
  };

  const handleBlur = () => {
    if (inputVal.trim()) {
      addCodes(inputVal);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex flex-wrap gap-2 p-2.5 border border-slate-200 rounded-lg min-h-[42px] bg-white focus-within:ring-2 focus-within:ring-slate-900/5 focus-within:border-slate-900 transition-all">
        {value.map((m, idx) => (
          <span 
            key={idx} 
            className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-md bg-slate-100 text-2xs font-bold text-slate-800 font-mono tracking-wide border border-slate-200/80 shadow-sm transition-all hover:bg-slate-200 group"
          >
            <span>{m}</span>
            <button 
              type="button" 
              onClick={() => removeCode(idx)} 
              className="text-slate-400 hover:text-red-600 transition-colors focus:outline-none font-bold text-xs leading-none"
              title="Xóa tag này"
            >
              &times;
            </button>
          </span>
        ))}
        <input 
          aria-label="mã máy"
          type="text"
          value={inputVal}
          onChange={(e) => { 
            setInputVal(e.target.value); 
            setShowSuggest(true); 
          }}
          onFocus={() => setShowSuggest(true)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={value.length === 0 ? "Nhập mã máy / Serial (Gõ Enter, phẩy hoặc dán nhiều mã để tạo TAG)..." : "Nhập thêm (Enter để ghim)..."}
          className="flex-1 bg-transparent border-none outline-none text-xs font-semibold py-0.5 px-1 min-w-[160px] placeholder:text-slate-400 font-mono"
        />
      </div>

      {showSuggest && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 divide-y divide-slate-50 animate-fade-in">
          {suggestions.map((item, idx) => (
            <Button 
              key={idx}
              type="button"
              onClick={() => addCodes(item)}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center justify-between font-mono"
            >
              <span>{item}</span>
              <span className="text-3xs uppercase tracking-wider text-slate-500 font-semibold font-sans bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">Gợi ý từ HĐ</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
