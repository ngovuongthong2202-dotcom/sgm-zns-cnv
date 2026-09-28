import React, { useState, useEffect, useRef, useMemo, forwardRef, useImperativeHandle } from 'react';
import { twMerge } from 'tailwind-merge';
import { parseFinancialInput } from '@/src/platform/ui/forms/useSmartFormInput';
import { FinancialEngine } from '@/src/shared/utils/financialEngine';
import { readVietnameseCurrency } from '@/src/shared/utils/textFormatter';
import { Calculator, Check, AlertCircle } from 'lucide-react';

export interface PresetRatio {
  label: string;
  ratio: number;
}

export interface SmartFinancialInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | undefined | null;
  onChange: (val: number) => void;
  currencySuffix?: string;
  showWordsBadge?: boolean;
  showLiveMathPreview?: boolean;
  baseAmountForPresets?: number;
  presetRatios?: PresetRatio[];
  quickIncrements?: number[];
  max?: number;
  min?: number;
  align?: 'left' | 'right' | 'center';
  compact?: boolean;
  error?: boolean;
}

export interface SmartFinancialInputRef {
  focus: () => void;
  blur: () => void;
  select: () => void;
  getNumericValue: () => number;
}

export const SmartFinancialInput = forwardRef<SmartFinancialInputRef, SmartFinancialInputProps>(
  (
    {
      value,
      onChange,
      currencySuffix = '₫',
      showWordsBadge = false,
      showLiveMathPreview = true,
      baseAmountForPresets,
      presetRatios,
      quickIncrements,
      max,
      min = 0,
      align = 'right',
      compact = false,
      error = false,
      className,
      placeholder = '0',
      disabled,
      readOnly,
      onFocus,
      onBlur,
      onKeyDown,
      ...restProps
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isFocused, setIsFocused] = useState<boolean>(false);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      select: () => inputRef.current?.select(),
      getNumericValue: () => (typeof value === 'number' ? value : 0)
    }));

    // Format display string from numeric value when not focused
    useEffect(() => {
      if (!isFocused) {
        if (value !== undefined && value !== null && !isNaN(value)) {
          if (value === 0 && !compact) {
            setDisplayValue(currencySuffix ? `0 ${currencySuffix}` : '0');
          } else if (value === 0 && compact) {
            setDisplayValue('0');
          } else {
            const formatted = FinancialEngine.formatVND(value);
            setDisplayValue(currencySuffix ? `${formatted} ${currencySuffix}` : formatted);
          }
        } else {
          setDisplayValue('');
        }
      }
    }, [value, isFocused, currencySuffix, compact]);

    // Live preview of math expressions or shortcuts during typing
    const liveCalculated = useMemo(() => {
      if (!isFocused || !displayValue) return null;
      const trimmed = displayValue.trim();
      const hasShortcutOrMath = /[kmbtrpt+*/-]|\s*(?:tỷ|triệu|nghìn|ngàn|đ|vnd)/i.test(trimmed);
      if (!hasShortcutOrMath) return null;

      try {
        const parsed = parseFinancialInput(trimmed);
        if (parsed > 0 && parsed !== value) {
          return parsed;
        }
      } catch {
        return null;
      }
      return null;
    }, [displayValue, isFocused, value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayValue(e.target.value);
    };

    const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Strip currency suffix on focus so user sees pure number/expression to edit easily
      if (value !== undefined && value !== null && !isNaN(value) && value > 0) {
        setDisplayValue(FinancialEngine.formatVND(value));
      } else if (value === 0) {
        setDisplayValue('');
      }
      // Select all for instant overwrite convenience
      setTimeout(() => {
        e.target.select();
      }, 20);
      onFocus?.(e);
    };

    const commitChange = () => {
      setIsFocused(false);
      const parsed = parseFinancialInput(displayValue);
      let clamped = parsed;
      if (max !== undefined && clamped > max) clamped = max;
      if (min !== undefined && clamped < min) clamped = min;

      onChange(clamped);

      const formatted = FinancialEngine.formatVND(clamped);
      setDisplayValue(currencySuffix ? `${formatted} ${currencySuffix}` : formatted);
    };

    const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      commitChange();
      onBlur?.(e);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitChange();
        inputRef.current?.blur();
      } else if (e.key === 'Escape') {
        setIsFocused(false);
        const originalVal = value || 0;
        const formatted = FinancialEngine.formatVND(originalVal);
        setDisplayValue(currencySuffix ? `${formatted} ${currencySuffix}` : formatted);
        inputRef.current?.blur();
      }
      onKeyDown?.(e);
    };

    const handleApplyPreset = (ratio: number) => {
      const base = baseAmountForPresets !== undefined ? baseAmountForPresets : (value || 0);
      let target = Math.round(base * ratio);
      if (max !== undefined && target > max) target = max;
      if (min !== undefined && target < min) target = min;

      onChange(target);
      const formatted = FinancialEngine.formatVND(target);
      setDisplayValue(currencySuffix ? `${formatted} ${currencySuffix}` : formatted);
    };

    const handleApplyIncrement = (inc: number) => {
      const current = typeof value === 'number' ? value : 0;
      let target = current + inc;
      if (max !== undefined && target > max) target = max;
      if (min !== undefined && target < min) target = min;

      onChange(target);
      const formatted = FinancialEngine.formatVND(target);
      setDisplayValue(currencySuffix ? `${formatted} ${currencySuffix}` : formatted);
    };

    const currentNumeric = typeof value === 'number' ? value : 0;
    const isExceedingMax = max !== undefined && currentNumeric > max;

    return (
      <div className={twMerge('flex flex-col gap-1', compact && 'gap-0')}>
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            value={displayValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={twMerge(
              'w-full font-mono text-slate-800 bg-white border border-slate-200 rounded-lg p-2 text-sm transition-all outline-none',
              align === 'right' && 'text-right',
              align === 'center' && 'text-center',
              align === 'left' && 'text-left',
              'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
              (error || isExceedingMax) && 'border-red-400 focus:border-red-500 focus:ring-red-200/30 text-red-700',
              (disabled || readOnly) && 'bg-slate-50/60 text-slate-500 cursor-not-allowed border-slate-200',
              compact && 'p-1.5 text-xs rounded',
              className
            )}
            {...restProps}
          />

          {/* Live shortcut/math calculation preview badge */}
          {showLiveMathPreview && isFocused && liveCalculated !== null && (
            <div className="absolute right-2 -bottom-6 z-20 flex items-center gap-1 px-2 py-0.5 bg-blue-600 text-white text-3xs font-semibold rounded shadow-md pointer-events-none animate-in fade-in slide-in-from-top-1">
              <Calculator size={10} />
              <span>= {FinancialEngine.formatVND(liveCalculated)} ₫</span>
            </div>
          )}
        </div>

        {/* Warning if exceeded max */}
        {isExceedingMax && (
          <div className="flex items-center gap-1 text-3xs font-bold text-red-600 mt-0.5">
            <AlertCircle size={11} />
            <span>Vượt quá giới hạn tối đa: {FinancialEngine.formatVND(max)} ₫</span>
          </div>
        )}

        {/* Vietnamese Words Reading Badge */}
        {showWordsBadge && !compact && currentNumeric > 0 && (
          <div className="flex items-center gap-1 text-2xs text-slate-600 italic bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-md">
            <span className="font-semibold text-slate-400 not-italic uppercase tracking-wider text-3xs">Bằng chữ:</span>
            <span className="text-slate-700 font-medium">{readVietnameseCurrency(currentNumeric)}</span>
          </div>
        )}

        {/* Preset Ratio Chips */}
        {presetRatios && presetRatios.length > 0 && !disabled && !readOnly && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {presetRatios.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(p.ratio)}
                className="px-2 py-0.5 text-3xs font-bold text-blue-700 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 rounded transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Quick Increment Chips */}
        {quickIncrements && quickIncrements.length > 0 && !disabled && !readOnly && (
          <div className="flex flex-wrap items-center gap-1 mt-0.5">
            {quickIncrements.map((inc, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyIncrement(inc)}
                className="px-1.5 py-0.5 text-3xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                +{FinancialEngine.formatVND(inc)}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }
);

SmartFinancialInput.displayName = 'SmartFinancialInput';
