import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'default' | 'secondary' | 'ghost' | 'danger' | 'link' | 'accent' | 'dark' | 'subtle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size = 'md', 
    isLoading = false, 
    leftIcon, 
    rightIcon,
    iconOnly = false,
    children, 
    ...props 
  }, ref) => {
    const [showSpinner, setShowSpinner] = useState(false);

    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout>;
      if (isLoading) {
        timeout = setTimeout(() => setShowSpinner(true), 80);
      } else {
        setShowSpinner(false);
      }
      return () => clearTimeout(timeout);
    }, [isLoading]);

    const baseStyle = clsx(
      "inline-flex items-center justify-center transition-all duration-150 ease-out outline-none select-none whitespace-nowrap flex-nowrap",
      "focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
      "disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
    );

    // Resolve variant with Strict Safety: iconOnly or contextual classes never inherit primary bg-blue-600
    let resolvedVariant: NonNullable<ButtonProps['variant']> = variant || 'primary';
    if (!variant) {
      if (iconOnly) {
        resolvedVariant = 'ghost';
      } else if (className?.includes('bg-slate-900') || className?.includes('bg-black')) {
        resolvedVariant = 'dark';
      } else if (className?.includes('bg-white') || className?.includes('border-slate-')) {
        resolvedVariant = 'secondary';
      } else if (className?.includes('text-red-') || className?.includes('bg-red-')) {
        resolvedVariant = 'danger';
      } else if (className?.includes('underline') || className?.includes('hover:underline')) {
        resolvedVariant = 'link';
      } else if (className?.includes('bg-blue-50') || className?.includes('text-blue-700')) {
        resolvedVariant = 'subtle';
      } else if (className?.includes('hover:bg-') || className?.includes('border-transparent') || className?.includes('text-slate-') || className?.includes('bg-transparent')) {
        resolvedVariant = 'ghost';
      }
    } else if (variant === 'primary' && (className?.includes('bg-white') || className?.includes('border-slate-'))) {
      resolvedVariant = 'secondary';
    } else if (variant === 'primary' && className?.includes('bg-transparent')) {
      resolvedVariant = 'ghost';
    }

    const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary: "bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus-visible:ring-blue-600 font-semibold",
      accent: "bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus-visible:ring-blue-600 font-semibold",
      default: "bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm focus-visible:ring-blue-600 font-semibold",
      dark: "bg-slate-900 border border-slate-950 text-white hover:bg-slate-800 active:bg-slate-950 shadow-sm focus-visible:ring-slate-900 font-medium",
      secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 active:bg-slate-100 shadow-xs focus-visible:ring-slate-200 font-medium",
      ghost: "bg-transparent border border-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 active:bg-slate-200/70 focus-visible:ring-slate-200 font-medium",
      danger: "bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800 active:bg-red-200/60 focus-visible:ring-red-200 font-medium",
      subtle: "bg-blue-50 border border-blue-200/80 text-blue-700 hover:bg-blue-100 hover:text-blue-800 active:bg-blue-200/70 focus-visible:ring-blue-300 font-semibold",
      link: "bg-transparent text-blue-700 p-0 border-none hover:underline hover:text-blue-800 shadow-none active:scale-100 focus-visible:ring-blue-500 rounded-none h-auto w-auto focus-visible:outline-none focus-visible:ring-1 font-medium",
    };

    const sizes = {
      xs: iconOnly ? "h-6 w-6 p-0 text-xs rounded" : "h-6 px-2 text-xs rounded gap-1",
      sm: iconOnly ? "h-7 w-7 p-0 text-xs rounded-md" : "h-7 px-2.5 text-xs rounded-md gap-1",        // 28px
      md: iconOnly ? "h-8 w-8 p-0 text-xs rounded-md" : "h-8 px-3 text-xs rounded-md gap-1.5",       // 32px
      lg: iconOnly ? "h-9 w-9 p-0 text-sm rounded-lg" : "h-9 px-3.5 text-sm rounded-lg gap-1.5",     // 36px
      xl: iconOnly ? "h-10 w-10 p-0 text-sm rounded-lg" : "h-10 px-4 text-sm rounded-lg gap-2",      // 40px
    };

    const paddingOverwriteForLink = resolvedVariant === 'link' ? '!p-0 !h-auto !w-auto' : '';

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={twMerge(baseStyle, variants[resolvedVariant], sizes[size], paddingOverwriteForLink, className)}
        {...props}
      >
        {showSpinner ? (
          <div className="flex items-center justify-center gap-1.5">
            <svg 
              className="animate-spin h-3.5 w-3.5 text-current" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span className="sr-only">Đang tải...</span>
            <span className="opacity-70">{children}</span>
          </div>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0 items-center justify-center">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="inline-flex shrink-0 items-center justify-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
