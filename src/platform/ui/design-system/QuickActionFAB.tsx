import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Users, FileText, Handshake, CreditCard, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from './Tooltip';
import { Button } from './Button';

export function QuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement || (e.target as HTMLElement).isContentEditable) {
        return;
      }
      
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const actions = [
    { label: 'Tạo Khách hàng', icon: <Users size={16} />, color: 'bg-blue-500', onClick: () => { navigate('/customers?new=true'); setIsOpen(false); } },
    { label: 'Tạo Báo giá', icon: <FileText size={16} />, color: 'bg-sky-500', onClick: () => { navigate('/quotations?new=true'); setIsOpen(false); } },
    { label: 'Tạo Hợp đồng', icon: <Handshake size={16} />, color: 'bg-amber-500', onClick: () => { navigate('/contracts?new=true'); setIsOpen(false); } },
    { label: 'Tạo Thanh toán', icon: <CreditCard size={16} />, color: 'bg-emerald-500', onClick: () => { navigate('/payments?new=true'); setIsOpen(false); } },
    { label: 'Tạo Giao hàng', icon: <Package size={16} />, color: 'bg-teal-500', onClick: () => { navigate('/deliveries?new=true'); setIsOpen(false); } },
  ];

  return (
    <div className="fixed bottom-8 right-20 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.9, transition: { duration: 0.15 } }}
            className="mb-4 flex flex-col gap-3 items-end"
          >
            {actions.map((action, idx) => (
              <motion.button
                key={action.label}
                aria-label={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0, transition: { delay: (actions.length - 1 - idx) * 0.05 } }}
                onClick={action.onClick}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity translate-x-2 group-hover:translate-x-0 pointer-events-none whitespace-nowrap">
                  {action.label}
                </span>
                <div className={`w-12 h-12 rounded-full ${action.color} text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all`}>
                  {action.icon}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <Tooltip side="left" content={
        <div className="flex items-center gap-2">
            Tạo nhanh <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-2xs">C</kbd>
        </div>
      }>
        <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? 'Đóng Tạo nhanh' : 'Mở Tạo nhanh'}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl shadow-brand-accent/30 transition-all duration-300 ${isOpen ? 'bg-slate-800 rotate-45' : 'bg-brand-accent hover:scale-110 active:scale-95'}`}
        >
          <Plus size={24} />
        </Button>
      </Tooltip>
    </div>
  );
}
