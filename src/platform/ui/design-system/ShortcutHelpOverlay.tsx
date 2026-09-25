import React, { useState } from 'react';
import { useAllShortcuts, useKeyboardShortcut } from '@/src/contexts/ShortcutContext';
import { X, Keyboard } from 'lucide-react';
import { Button } from './Button';

export function ShortcutHelpOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const shortcuts = useAllShortcuts();

  useKeyboardShortcut({
    key: 'Shift+?',
    description: 'Hiện bảng phím tắt',
    context: 'Global',
    action: () => setIsOpen(true)
  });

  if (!isOpen) return null;

  const grouped = shortcuts.reduce((acc: any, curr: any) => {
    if (!acc[curr.context]) acc[curr.context] = [];
    acc[curr.context].push(curr);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text-primary">Phím tắt hệ thống</h2>
          </div>
          <Button variant="ghost" aria-label="Đóng" 
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-600 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 overflow-y-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(grouped).map(([context, list]) => (
            <div key={context} className="space-y-3">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">{context}</h3>
              <ul className="space-y-2">
                {(list as Array<any>).map((s, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="text-sm text-text-primary">{s.description}</span>
                    <div className="flex items-center gap-1">
                      {s.key.split('+').map((k: string, i: number) => (
                        <span key={i} className="px-2 py-1 text-xs font-mono font-medium text-slate-600 border border-slate-200 bg-slate-50 rounded shadow-sm">
                          {k}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
