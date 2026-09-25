import React, { useState, useEffect, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { z } from 'zod';
import { useDebounce } from '@/src/hooks/useDebounce';
import { Button } from './Button';

interface InlineEditProps {
  value: string;
  onSave: (val: string) => Promise<void> | void;
  type?: 'text' | 'number';
  validator?: z.ZodTypeAny | ((val: string) => string | null);
  variant?: 'box' | 'linear';
}

export function InlineEdit({ value, onSave, type = 'text', validator, variant = 'box' }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedValue = useDebounce(currentValue, 500);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => inputRef.current?.focus(), 15);
    } else {
      setCurrentValue(value);
      setError(null);
    }
  }, [isEditing, value]);

  const handleSave = async (valToSave = currentValue) => {
    const trimmed = valToSave.trim();
    if (trimmed === value) {
      setIsEditing(false);
      return;
    }
    if (trimmed === '') {
      setIsEditing(false);
      return; // Keep edit open or reject
    }

    if (validator) {
      if (typeof validator === 'function') {
        const err = validator(trimmed);
        if (err) {
          setError(err);
          return;
        }
      } else {
        const parseResult = validator.safeParse(type === 'number' ? Number(trimmed) : trimmed);
        if (!parseResult.success) {
          const err = parseResult.error as any;
          setError(err.errors?.[0]?.message || err.issues?.[0]?.message || 'Dữ liệu không hợp lệ');
          return;
        }
      }
    }

    setIsSaving(true);
    setError(null);
    try {
      await onSave(trimmed);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1200);
      setIsEditing(false);
    } catch (e: any) { 
      setError(e?.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isEditing && debouncedValue !== value && !isSaving && debouncedValue.trim() !== '') {
      handleSave(debouncedValue);
    }
  }, [debouncedValue]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setCurrentValue(value);
      setIsEditing(false);
      setError(null);
    }
  };

  if (variant === 'linear') {
    if (!isEditing) {
      return (
        <div 
          className={`group inline-flex items-center gap-1.5 cursor-pointer max-w-full border-b border-transparent hover:border-slate-350 px-1 py-0.5 -ml-1 transition-all duration-150 select-none ${
            justSaved ? 'text-amber-600 font-semibold' : ''
          }`}
          onClick={() => setIsEditing(true)}
          tabIndex={0}
          role="button"
          onKeyDown={e => e.key === 'Enter' && setIsEditing(true)}
          title="Nhấp để chỉnh sửa trực tiếp"
        >
          <span className="truncate text-slate-700 group-hover:text-slate-900 text-xs font-medium border-b border-transparent">
            {value || <span className="text-slate-400 font-normal italic">Chưa xác định</span>}
          </span>
        </div>
      );
    }

    return (
      <div className="relative inline-flex items-center w-full z-10 bg-transparent min-w-[120px]">
        <input
          ref={inputRef}
          type={type}
          aria-label="Chỉnh sửa tại dòng"
          className={`bg-transparent border-b border-slate-950 focus:outline-none focus:border-blue-600 w-full text-sm py-0.5 focus:ring-0 ${
            error ? 'border-b-red-500 text-red-900' : 'text-slate-800'
          }`}
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => handleSave()}
          disabled={isSaving}
        />
        {error && (
          <div className="absolute top-full left-0 mt-1 bg-red-50 text-red-700 text-2xs px-2 py-1 rounded border border-red-100 shadow-sm whitespace-nowrap z-[100] font-medium">
            {error}
          </div>
        )}
      </div>
    );
  }

  if (!isEditing) {
    return (
      <div 
        className={`group inline-flex items-center gap-1.5 cursor-pointer max-w-full hover:bg-slate-50 border border-transparent hover:border-slate-200/60 px-2 py-1 -ml-2 rounded-md transition-all duration-150 select-none ${
          justSaved ? 'bg-amber-50 text-amber-800 border-amber-200' : ''
        }`}
        onClick={() => setIsEditing(true)}
        tabIndex={0}
        role="button"
        onKeyDown={e => e.key === 'Enter' && setIsEditing(true)}
        title="Nhấp để chỉnh sửa trực tiếp"
      >
        <span className="truncate text-slate-700 group-hover:text-slate-900 text-sm font-normal">
          {value || <span className="text-slate-400 font-normal italic">Trống</span>}
        </span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center gap-0.5 -ml-2 z-10 bg-white rounded-lg shadow-[0_2px_4px_rgba(15,23,42,0.04)] border border-slate-200 max-w-full">
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type={type}
          aria-label="Chỉnh sửa tại dòng"
          className={`border-none rounded-l-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full min-w-[160px] text-sm ${
            error ? 'bg-red-50 text-red-900' : 'bg-transparent text-slate-800'
          }`}
          value={currentValue}
          onChange={(e) => {
            setCurrentValue(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
        />
      </div>
      <Button 
        variant="ghost" 
        size="sm"
        aria-label="Lưu bản ghi" 
        onClick={() => handleSave()} 
        disabled={isSaving}
        className="w-7 h-7 !p-0 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
      >
        <Check className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm"
        aria-label="Hủy bỏ chỉnh sửa" 
        onClick={() => { setCurrentValue(value); setIsEditing(false); setError(null); }} 
        disabled={isSaving}
        className="w-7 h-7 !p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
      
      {error && (
        <div className="absolute top-full left-0 mt-1 bg-red-50 text-red-700 text-2xs px-2 py-1 rounded-md border border-red-100 shadow-sm whitespace-nowrap z-[100] font-medium animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}
    </div>
  );
}
