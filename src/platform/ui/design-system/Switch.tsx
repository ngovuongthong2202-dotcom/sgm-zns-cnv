import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  label?: React.ReactNode;
  description?: React.ReactNode;
  title?: string;
  className?: string;
  'aria-label'?: string;
}

export function Switch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  description,
  title,
  className,
  'aria-label': ariaLabel,
}: SwitchProps) {
  const switchDimensions = {
    sm: "h-4 w-7",
    md: "h-5 w-9",
    lg: "h-6 w-11",
  };

  const thumbDimensions = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const thumbTranslations = {
    sm: checked ? "translate-x-3" : "translate-x-0.5",
    md: checked ? "translate-x-4" : "translate-x-0.5",
    lg: checked ? "translate-x-5" : "translate-x-0.5",
  };

  const button = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel || (typeof label === 'string' ? label : 'Bật/Tắt')}
      onClick={() => !disabled && onChange(!checked)}
      className={twMerge(
        "relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out outline-none select-none",
        "focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        switchDimensions[size],
        checked ? "bg-blue-600" : "bg-slate-200 hover:bg-slate-300",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          "pointer-events-none inline-block transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
          thumbDimensions[size],
          thumbTranslations[size]
        )}
      />
    </button>
  );

  if (!label && !description) {
    return button;
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        {label && (
          <span className="text-xs font-semibold text-slate-800">{label}</span>
        )}
        {description && (
          <span className="text-2xs text-slate-500 mt-0.5">{description}</span>
        )}
      </div>
      {button}
    </div>
  );
}

export default Switch;
