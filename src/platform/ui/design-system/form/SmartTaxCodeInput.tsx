import React, { useMemo, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Building2, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SmartTaxCodeInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | undefined | null;
  onChange: (taxCode: string) => void;
  onLookup?: (taxCode: string) => void;
  isLookingUp?: boolean;
  error?: boolean;
  compact?: boolean;
}

function normalizeTaxCode(raw: string): string {
  if (!raw) return '';
  // Keep only digits and hyphens
  let clean = raw.trim().toUpperCase().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[^\d-]/g, '');
  // Format branch format: 10 digits followed by hyphen and 3 digits: 0123456789-001
  if (clean.length > 10 && !clean.includes('-')) {
    clean = clean.slice(0, 10) + '-' + clean.slice(10, 13);
  }
  return clean;
}

export const SmartTaxCodeInput = forwardRef<HTMLInputElement, SmartTaxCodeInputProps>(
  (
    {
      value,
      onChange,
      onLookup,
      isLookingUp = false,
      error = false,
      compact = false,
      className,
      placeholder = '0123456789 hoặc 0123456789-001',
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    const cleanTax = useMemo(() => normalizeTaxCode(value || ''), [value]);
    const digitsOnly = cleanTax.replace(/\D/g, '');
    const isValidEnterprise = digitsOnly.length === 10;
    const isValidBranch = digitsOnly.length === 13;
    const isValid = isValidEnterprise || isValidBranch;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalized = normalizeTaxCode(e.target.value);
      onChange(normalized);
    };

    return (
      <div className={twMerge('flex flex-col gap-1', compact && 'gap-0')}>
        <div className="relative flex items-center">
          <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
            <Building2 size={14} />
          </div>

          <input
            ref={ref}
            type="text"
            value={cleanTax}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            maxLength={14}
            className={twMerge(
              'w-full pl-9 pr-24 py-2 font-mono text-sm tracking-wider uppercase text-slate-900 bg-white border border-slate-200 rounded-lg outline-none transition-all',
              'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-200/30 text-red-700',
              (disabled || readOnly) && 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200',
              compact && 'py-1.5 text-xs',
              className
            )}
            {...props}
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {isValid && (
              <span className="flex items-center gap-0.5 text-3xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                <CheckCircle2 size={10} className="text-emerald-600" />
                {isValidEnterprise ? 'MST DN' : 'Chi nhánh'}
              </span>
            )}

            {onLookup && !readOnly && !disabled && (
              <button
                type="button"
                onClick={() => onLookup(cleanTax)}
                disabled={!isValid || isLookingUp}
                className={twMerge(
                  'flex items-center gap-1 px-2 py-1 text-3xs font-bold rounded transition-colors',
                  isValid && !isLookingUp
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                )}
                title="Tra cứu thông tin doanh nghiệp từ Tổng cục Thuế"
              >
                <Search size={10} />
                <span>{isLookingUp ? 'Đang tra...' : 'Tra cứu'}</span>
              </button>
            )}
          </div>
        </div>

        {cleanTax.length > 0 && !isValid && (
          <div className="flex items-center gap-1 text-3xs text-amber-600 mt-0.5 px-1">
            <AlertCircle size={10} />
            <span>MST chuẩn có 10 số (doanh nghiệp) hoặc 13 số (chi nhánh). Hiện có {digitsOnly.length} số.</span>
          </div>
        )}
      </div>
    );
  }
);

SmartTaxCodeInput.displayName = 'SmartTaxCodeInput';
