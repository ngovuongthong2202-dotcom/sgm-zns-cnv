import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={twMerge(
          "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-600 transition-all disabled:opacity-60 disabled:bg-slate-50 disabled:border-slate-200",
          error && "border-red-500 hover:border-red-600 focus:border-red-500 focus:ring-red-100",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
