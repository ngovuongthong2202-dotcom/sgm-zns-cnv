import React from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: 'border border-border-subtle shadow-lg !bg-surface !text-text-primary rounded-xl',
        duration: 4000,
        success: {
          icon: <CheckCircle2 className="w-5 h-5 text-success" />,
          className: '!border-success/20 !bg-emerald-50/50',
        },
        error: {
          icon: <AlertCircle className="w-5 h-5 text-danger" />,
          className: '!border-danger/20 !bg-red-50/50',
        },
        style: {
          maxWidth: '400px',
          padding: '16px',
        },
      }}
    />
  );
}

export const showToast = {
  success: (msg: string) => toast.success(msg),
  error: (msg: string) => toast.error(msg),
  info: (msg: string) => toast(msg, { icon: <Info className="w-5 h-5 text-info" /> }),
  warning: (msg: string) => toast(msg, { icon: <AlertTriangle className="w-5 h-5 text-warning" />, className: '!border-warning/20 !bg-amber-50/50' }),
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs),
};
