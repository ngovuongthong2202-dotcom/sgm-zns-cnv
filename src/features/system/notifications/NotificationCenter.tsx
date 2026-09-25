import { Button } from '@/src/design-system';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Info, AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { notificationsRepo } from '@/src/data/repositories/system.repo';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'danger';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: any; 
  link?: string;
}

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const authReady = Boolean(user);

  useEffect(() => {
    if (!user || !authReady) return;
    
    let isActive = true;

    const unsubscribe = notificationsRepo.subscribe(20, (data) => {
      if (!isActive) return;
      setNotifications(data as unknown as Notification[]);
    }, (error) => {
      console.warn("Could not load notifications:", error);
    });

    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [user, authReady]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await notificationsRepo.update(id, { read: true });
    } catch(_e) {
      // Opt out silently if failing due to rules
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const getIcon = (type: NotificationType) => {
    switch(type) {
      case 'info': return <Info size={16} className="text-blue-700" />;
      case 'warning': return <AlertTriangle size={16} className="text-amber-700" />;
      case 'danger':
      case 'error': return <XCircle size={16} className="text-red-700" />;
      case 'success': return <CheckCircle2 size={16} className="text-emerald-700" />;
      default: return <Info size={16} className="text-slate-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button aria-label="Thông báo" 
        onClick={() => setIsOpen(!isOpen)}
        variant={isOpen ? 'primary' : 'secondary'}
        size="md"
        iconOnly
        className="h-10 w-10 rounded-xl relative"
      >
        <Bell size={16} strokeWidth={2} />
        {unreadCount > 0 && (
          <div className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 bg-red-600 text-white text-2xs font-bold rounded-full flex items-center justify-center border border-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </div>
        )}
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-[380px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[100] flex flex-col max-h-[500px] ring-1 ring-slate-900/10"
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-semibold text-sm text-slate-900">Thông báo</h3>
              {unreadCount > 0 && (
                <Button aria-label="Đánh dấu đã đọc" 
                  variant="ghost"
                  size="xs"
                  onClick={() => notifications.forEach(n => !n.read && markAsRead(n.id))}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Đánh dấu đã đọc
                </Button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 p-2">
              {notifications.length === 0 ? (
                <div className="py-10 flex flex-col items-center justify-center text-slate-500">
                  <Bell size={32} className="mb-3 opacity-20" />
                  <p className="text-sm font-medium">Bạn không có thông báo nào</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      onClick={() => !notif.read && markAsRead(notif.id)}
                      className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-colors ${notif.read ? 'hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'}`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm tracking-tight ${notif.read ? 'text-slate-700 font-medium' : 'text-slate-900 font-bold'}`}>
                          {notif.title}
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {notif.message}
                        </div>
                        <div className="text-2xs text-slate-500 mt-2 font-medium">
                          {notif.createdAt?.toDate ? notif.createdAt.toDate().toLocaleString('vi-VN') : 'Vừa xong'}
                        </div>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
