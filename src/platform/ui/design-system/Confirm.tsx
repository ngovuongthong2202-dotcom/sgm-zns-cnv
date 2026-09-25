import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './Button';
import { AlertCircle, Info, AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  ConfirmHost: React.FC<{children: ReactNode}>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmHost');
  return ctx;
}

export function ConfirmHost({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveFn, setResolveFn] = useState<((val: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveFn(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isOpen && resolveFn && resolveFn(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
// eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isOpen && resolveFn && resolveFn(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, ConfirmHost: ({children}) => <>{children}</> }}>
      {children}
      <Dialog.Root open={isOpen} onOpenChange={(open) => {
          if (!open) handleCancel();
      }}>
        <AnimatePresence>
          {isOpen && options && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild>
                <div className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-sm pointer-events-auto" />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 pointer-events-auto">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-md bg-white rounded-xl shadow-2xl p-6 border border-slate-200"
                  >
                     <div className="flex gap-4">
                       <div className="shrink-0 mt-1">
                         {options.variant === 'danger' && <AlertCircle className="w-6 h-6 text-red-700" />}
                         {options.variant === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-700" />}
                         {(!options.variant || options.variant === 'info') && <Info className="w-6 h-6 text-blue-700" />}
                       </div>
                       <div className="flex-1">
                         <Dialog.Title className="text-lg font-semibold text-slate-900">
                           {options.title}
                         </Dialog.Title>
                         <Dialog.Description asChild>
                           <div className="mt-2 text-slate-600 text-sm leading-relaxed">
                             {options.message}
                           </div>
                         </Dialog.Description>
                       </div>
                     </div>
                     
                     <div className="mt-6 flex justify-end gap-3">
                       <Button variant="secondary" onClick={handleCancel}>
                         {options.cancelText || 'Hủy'}
                       </Button>
                       <Button variant={options.variant === 'danger' ? 'danger' : 'primary'} 
                         onClick={handleConfirm}
                       >
                         {options.confirmText || 'Xác nhận'}
                       </Button>
                     </div>
                  </motion.div>
                </div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </ConfirmContext.Provider>
  );
}
