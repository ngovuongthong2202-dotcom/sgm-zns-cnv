import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';
import { Phone, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SmartPhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | undefined | null;
  onChange: (normalizedPhone: string) => void;
  showCarrierBadge?: boolean;
  showQuickActions?: boolean;
  error?: boolean;
  compact?: boolean;
}

interface CarrierInfo {
  name: string;
  color: string;
  badgeBg: string;
  textColor: string;
}

export function detectCarrier(phone: string): CarrierInfo | null {
  const clean = phone.replace(/\D/g, '');
  if (clean.length < 3) return null;
  const prefix3 = clean.slice(0, 3);

  // Viettel
  if (['086', '096', '097', '098', '032', '033', '034', '035', '036', '037', '038', '039'].includes(prefix3)) {
    return { name: 'Viettel', color: '#ee0033', badgeBg: 'bg-red-50 text-red-700 border-red-200', textColor: 'text-red-600' };
  }
  // VinaPhone
  if (['088', '091', '094', '081', '082', '083', '084', '085'].includes(prefix3)) {
    return { name: 'VinaPhone', color: '#0085ec', badgeBg: 'bg-blue-50 text-blue-700 border-blue-200', textColor: 'text-blue-600' };
  }
  // MobiFone
  if (['089', '090', '093', '070', '079', '077', '076', '078'].includes(prefix3)) {
    return { name: 'MobiFone', color: '#005baa', badgeBg: 'bg-sky-50 text-sky-700 border-sky-200', textColor: 'text-sky-600' };
  }
  // Vietnamobile
  if (['092', '056', '058'].includes(prefix3)) {
    return { name: 'Vietnamobile', color: '#ff6600', badgeBg: 'bg-orange-50 text-orange-700 border-orange-200', textColor: 'text-orange-600' };
  }
  // Wintel
  if (['055'].includes(prefix3)) {
    return { name: 'Wintel', color: '#e60012', badgeBg: 'bg-rose-50 text-rose-700 border-rose-200', textColor: 'text-rose-600' };
  }
  // Gmobile
  if (['059', '099'].includes(prefix3)) {
    return { name: 'Gmobile', color: '#fdb913', badgeBg: 'bg-amber-50 text-amber-700 border-amber-200', textColor: 'text-amber-600' };
  }

  return null;
}

export function normalizePhone(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/[\s.-]/g, '');
  if (clean.startsWith('+84')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('84') && clean.length >= 11) {
    clean = '0' + clean.slice(2);
  }
  return clean;
}

export function formatPhoneDisplay(clean: string): string {
  if (!clean) return '';
  if (clean.length <= 4) return clean;
  if (clean.length <= 7) return `${clean.slice(0, 4)} ${clean.slice(4)}`;
  return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7, 11)}`;
}

export const SmartPhoneInput = forwardRef<HTMLInputElement, SmartPhoneInputProps>(
  (
    {
      value,
      onChange,
      showCarrierBadge = true,
      showQuickActions = false, // Default to false in form edit mode to prevent crowding
      error = false,
      compact = false,
      className,
      placeholder = '09xx xxx xxx',
      disabled,
      readOnly,
      ...props
    },
    ref
  ) => {
    const cleanPhone = useMemo(() => normalizePhone(value || ''), [value]);
    const carrier = useMemo(() => detectCarrier(cleanPhone), [cleanPhone]);
    const isValidVNPhone = cleanPhone.length === 10 && cleanPhone.startsWith('0');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const normalized = normalizePhone(e.target.value);
      onChange(normalized);
    };

    const displayFormatted = useMemo(() => formatPhoneDisplay(cleanPhone), [cleanPhone]);

    return (
      <div className={twMerge('w-full flex flex-col gap-1', compact && 'gap-0.5')}>
        {/* Input Wrapper - Full Width, Ergonomic Typing */}
        <div className="relative w-full flex items-center">
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
            <Phone size={13} className="text-slate-400" />
          </div>

          <input
            ref={ref}
            type="tel"
            value={displayFormatted}
            onChange={handleInputChange}
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={twMerge(
              'w-full pl-7.5 pr-3 py-1.5 text-xs font-mono font-bold text-slate-900 bg-white border border-slate-200 rounded-lg outline-none transition-all',
              'focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-200/30 text-red-700',
              (disabled || readOnly) && 'bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200',
              className
            )}
            {...props}
          />
        </div>

        {/* Sub-Info Row: Carrier Badge & Quick Action Links (Placed neatly below input to prevent text squishing) */}
        {(showCarrierBadge && carrier || (showQuickActions && isValidVNPhone && !disabled)) && (
          <div className="flex items-center justify-between px-0.5 pt-0.5 text-3xs">
            {showCarrierBadge && carrier ? (
              <span
                className={twMerge(
                  'px-1.5 py-0.2 rounded border uppercase font-bold tracking-wider select-none text-3xs inline-flex items-center gap-1 animate-fadeIn',
                  carrier.badgeBg
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {carrier.name}
              </span>
            ) : <span />}

            {showQuickActions && isValidVNPhone && !disabled && (
              <div className="flex items-center gap-1.5">
                <a
                  href={`tel:${cleanPhone}`}
                  title="Gọi ngay"
                  className="p-0.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors flex items-center gap-0.5 font-bold"
                >
                  <Phone size={10} />
                  <span>Gọi</span>
                </a>
                <a
                  href={`https://zalo.me/${cleanPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Nhắn Zalo"
                  className="px-1.5 py-0.2 text-3xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded transition-colors border border-sky-200"
                >
                  Zalo ↗
                </a>
              </div>
            )}
          </div>
        )}

        {/* Validation hint if incomplete */}
        {cleanPhone.length > 0 && cleanPhone.length !== 10 && (
          <div className="flex items-center gap-1 text-3xs text-amber-600 px-0.5 mt-0.5">
            <AlertCircle size={10} />
            <span>SĐT 10 số (hiện có {cleanPhone.length})</span>
          </div>
        )}
      </div>
    );
  }
);

SmartPhoneInput.displayName = 'SmartPhoneInput';
