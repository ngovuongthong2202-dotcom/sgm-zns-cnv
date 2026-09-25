import React from 'react';
import { twMerge } from 'tailwind-merge';

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, label, error, description, required, children, ...props }, ref) => {
    return (
      <div ref={ref} className={twMerge("space-y-1.5", className)} {...props}>
        {label && (
          <label className="block text-xs font-semibold text-slate-800">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        {children}
        {description && !error && (
          <p className="text-xs text-slate-600">{description}</p>
        )}
        {error && (
          <p className="text-xs font-medium text-red-600">{error}</p>
        )}
      </div>
    );
  }
);
Field.displayName = 'Field';
