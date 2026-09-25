import { Button } from '@/src/design-system';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Info, AlertTriangle, XCircle, CheckCircle2, X, Copy, Check } from 'lucide-react';
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
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [copied, setCopied] = useState(false);
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
    // Optimistic update
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await notificationsRepo.update(id, { read: true });
    } catch (_e) {
      console.warn("Failed to sync markAsRead to server:", _e);
    }
  };

  const handleMarkAllAsRead = async () => {
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const unread = notifications.filter(n => !n.read);
    try {
      await Promise.allSettled(unread.map(n => notificationsRepo.update(n.id, { read: true })));
    } catch (_e) {
      console.warn("Failed to sync markAllAsRead to server:", _e);
    }
  };

  const handleSelectNotification = (notif: Notification) => {
    setSelectedNotification(notif);
    if (!notif.read) {
      markAsRead(notif.id);
    }
  };

  const handleCopyMessage = () => {
    if (!selectedNotification) return;
    const textToCopy = `[${selectedNotification.title}]\n${selectedNotification.message}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const getTypeBadge = (type: NotificationType) => {
    switch(type) {
      case 'info': return <span className="px-2 py-0.5 rounded text-2xs font-bold bg-blue-100 text-blue-800">Thông tin</span>;
      case 'warning': return <span className="px-2 py-0.5 rounded text-2xs font-bold bg-amber-100 text-amber-800">Cảnh báo</span>;
      case 'danger':
      case 'error': return <span className="px-2 py-0.5 rounded text-2xs font-bold bg-red-100 text-red-800">Lỗi ZNS / Hệ thống</span>;
      case 'success': return <span className="px-2 py-0.5 rounded text-2xs font-bold bg-emerald-100 text-emerald-800">Thành công</span>;
      default: return null;
    }
  };

  const formatCreatedAt = (createdAt: any) => {
    if (!createdAt) return 'Vừa xong';
    if (createdAt?.toDate) return createdAt.toDate().toLocaleString('vi-VN');
    if (typeof createdAt === 'string' || typeof createdAt === 'number') {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleString('vi-VN');
    }
    return 'Vừa xong';
  };

  return (
    <>
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
              className="absolute right-0 top-12 w-[400px] bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-[100] flex flex-col max-h-[520px] ring-1 ring-slate-900/10"
            >
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900">Thông báo</h3>
                  {unreadCount > 0 && (
                    <span className="bg-red-100 text-red-700 text-2xs font-bold px-1.5 py-0.5 rounded-full">
                      {unreadCount} mới
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <Button aria-label="Đánh dấu đã đọc" 
                    variant="ghost"
                    size="xs"
                    onClick={handleMarkAllAsRead}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    Đánh dấu đã đọc
                  </Button>
                )}
              </div>

              <div className="overflow-y-auto flex-1 p-2 divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                    <Bell size={36} className="mb-3 opacity-20" />
                    <p className="text-sm font-medium">Bạn không có thông báo nào</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {notifications.map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => handleSelectNotification(notif)}
                        className={`p-3 rounded-xl flex items-start gap-3 cursor-pointer transition-all duration-150 ${notif.read ? 'hover:bg-slate-100/70 opacity-80' : 'bg-blue-50/60 hover:bg-blue-100/70 border border-blue-100'}`}
                      >
                        <div className="mt-0.5 shrink-0">
                          {getIcon(notif.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-sm tracking-tight truncate ${notif.read ? 'text-slate-800 font-semibold' : 'text-slate-950 font-bold'}`}>
                              {notif.title}
                            </span>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                            {notif.message}
                          </div>
                          <div className="text-2xs text-slate-400 mt-2 font-medium">
                            {formatCreatedAt(notif.createdAt)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Xem Chi Tiết Thông Báo */}
      <AnimatePresence>
        {selectedNotification && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-150 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-xs border border-slate-200 shrink-0">
                    {getIcon(selectedNotification.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      {selectedNotification.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getTypeBadge(selectedNotification.type)}
                      <span className="text-2xs text-slate-500 font-medium">
                        {formatCreatedAt(selectedNotification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Đóng chi tiết"
                  onClick={() => setSelectedNotification(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto flex-1 space-y-3">
                <span className="text-2xs uppercase tracking-wider font-bold text-slate-500">
                  Nội dung chi tiết
                </span>
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap break-words select-text">
                  {selectedNotification.message}
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleCopyMessage}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copied ? 'Đã sao chép' : 'Sao chép nội dung'}</span>
                </button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setSelectedNotification(null)}
                >
                  Đã hiểu & Đóng
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
