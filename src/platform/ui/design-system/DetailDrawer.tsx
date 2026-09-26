/* eslint-disable max-lines */
import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'motion/react';
import { X, Printer, Trash2, Save, Send, Edit, ChevronLeft, ChevronRight, Columns2, Maximize2, LayoutGrid } from 'lucide-react';
import { usePresence } from '@/src/hooks/usePresence';
import { Button } from './Button';
import { DetailDrawerProps } from './DetailDrawerTypes';
import { useConfirm } from './Confirm';
 

function URLDrawerSynchronizer({ isOpen, entityId, entityType }: { isOpen: boolean; entityId: string | undefined; entityType: string | undefined }) {
  // Disabled temporarily to prevent react-router infinite loop freezes
  return null;
}

export function DetailDrawer({ 
  isOpen, onClose, entityId, entityType, icon, title, subTitle, statusPill, topRightControls,
  size = 'md', allowViewportSwitch, horizonHud, isDirty = false, updatedBy, updatedAt,
  overviewPanel, activityPanel, linksPanel, znsHistoryPanel, auditLogPanel, attachmentsPanel,
  children, footer, tabs,
  onSave, onSendZns, onPrint, onDelete, onEdit, modal = true, className = '',
  onNavigatePrev, onNavigateNext
}: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentSize, setCurrentSize] = useState(size);
  const { confirm } = useConfirm();

  useEffect(() => {
    setCurrentSize(size);
  }, [size]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement || 
        activeEl instanceof HTMLTextAreaElement || 
        (activeEl instanceof HTMLElement && activeEl.isContentEditable)
      ) {
        return;
      }
      if (e.key === '[' && onNavigatePrev) {
        e.preventDefault();
        onNavigatePrev();
      } else if (e.key === ']' && onNavigateNext) {
        e.preventDefault();
        onNavigateNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigatePrev, onNavigateNext]);

  const sizeClasses: Record<string, string> = {
    sm: 'sm:max-w-[420px] sm:w-[420px] w-full',
    md: 'sm:max-w-[440px] sm:w-[440px] w-full',
    lg: 'sm:max-w-[480px] sm:w-[480px] w-full',
    xl: 'sm:max-w-[640px] sm:w-[640px] w-full',
    full: 'sm:max-w-[840px] sm:w-[840px] w-full',
    docked: 'sm:max-w-[760px] lg:max-w-[860px] w-full',
    studio: 'sm:max-w-[1140px] 2xl:max-w-[1440px] w-full',
    screen: 'w-screen max-w-none'
  };

  const { activeUsers } = usePresence(entityId, entityType);
  const isElastic = allowViewportSwitch ?? (['screen', 'studio', 'docked'].includes(size));

  return (
    <>
      <URLDrawerSynchronizer isOpen={isOpen} entityId={entityId} entityType={entityType} />
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()} modal={modal}>
        <AnimatePresence>
          {isOpen && (
            <Dialog.Portal forceMount>
              {modal && (
                <Dialog.Overlay asChild>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/20 z-[120]"
                  />
                </Dialog.Overlay>
              )}
              
              <Dialog.Content 
                asChild
                onInteractOutside={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('[role="dialog"], [role="alertdialog"], .toast, .radix-portal, [class*="fixed"]')) {
                    e.preventDefault();
                  }
                }}
              >
                <motion.div 
                  initial={{ x: '100%', opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                  className={`fixed inset-y-0 right-0 z-[125] w-full ${sizeClasses[currentSize] || sizeClasses.screen} bg-white shadow-[0_24px_48px_-12px_rgba(15,23,42,0.16)] flex flex-col outline-none border-l border-slate-100 transition-[max-width] duration-300 ease-in-out ${className}`}
                >
                  <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full overflow-hidden">
                  
                  {/* Top Header Panel */}
                  <div className="flex flex-col shrink-0 border-b border-slate-100">
                    <div className="flex items-start justify-between px-6 py-5">
                      <div className="flex items-start gap-4">
                        {icon && (
                          <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center justify-center text-slate-700 shrink-0 select-none">
                            {icon}
                          </div>
                        )}
                        <div>
                          <Dialog.Title className="text-base font-semibold tracking-[-0.015em] text-slate-900 flex items-center gap-2.5">
                            {title}
                            {statusPill && <span className="scale-90 origin-left">{statusPill}</span>}
                          </Dialog.Title>
                          <Dialog.Description asChild>
                            <div className="text-xs text-slate-500 font-mono tracking-tight mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                              <span>{subTitle || entityId}</span>
                              <span className="text-slate-300 font-sans select-none">|</span>
                              <span className="inline-flex items-center gap-1 text-slate-500 text-2xs font-sans">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                Bạn đang xem
                              </span>
                              {activeUsers.length > 0 && (
                                <>
                                  <span className="text-slate-300 font-sans select-none">|</span>
                                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-2xs font-sans font-medium border border-emerald-100">
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-600"></span>
                                    </span>
                                    {activeUsers.length} chuyên viên khác cùng xem
                                  </span>
                                </>
                              )}
                            </div>
                          </Dialog.Description>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        {activeUsers.length > 0 && (
                          <div className="flex -space-x-1.5 mr-2">
                            {activeUsers.map((u: any) => (
                              <div 
                                key={u.userId} 
                                title={`${u.displayName} đang xem (${new Date(u.lastSeenAt).toLocaleTimeString()})`} 
                                className="w-7 h-7 rounded-full border-2 border-white bg-blue-50 flex items-center justify-center text-blue-600 text-2xs font-bold select-none hover:z-10 hover:ring-2 hover:ring-blue-100 transition-all cursor-default"
                              >
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt={u.displayName} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  u.displayName.charAt(0).toUpperCase()
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {(onNavigatePrev || onNavigateNext) && (
                          <div className="flex items-center mx-1 gap-0.5 bg-slate-50 border border-slate-200/60 rounded-md p-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={onNavigatePrev}
                              disabled={!onNavigatePrev}
                              className="w-6 h-6 text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30"
                              title="Bản ghi trước ( [ )"
                              aria-label="Bản ghi trước"
                            >
                              <ChevronLeft size={16} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={onNavigateNext}
                              disabled={!onNavigateNext}
                              className="w-6 h-6 text-slate-600 hover:text-slate-900 hover:bg-slate-200 disabled:opacity-30"
                              title="Bản ghi sau ( ] )"
                              aria-label="Bản ghi sau"
                            >
                              <ChevronRight size={16} />
                            </Button>
                          </div>
                        )}

                        {isElastic && (
                          <div className="flex items-center mx-1 gap-0.5 bg-slate-100/80 border border-slate-200/80 rounded-lg p-0.5" title="Chế độ hiển thị khung nhìn">
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={() => setCurrentSize('docked')}
                              className={`w-6 h-6 rounded ${currentSize === 'docked' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                              title="Thu gọn (Docked 55vw)"
                              aria-label="Thu gọn"
                            >
                              <Columns2 size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={() => setCurrentSize('studio')}
                              className={`w-6 h-6 rounded ${currentSize === 'studio' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                              title="Tiêu chuẩn (Studio 80vw)"
                              aria-label="Tiêu chuẩn"
                            >
                              <LayoutGrid size={13} />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="xs"
                              iconOnly
                              onClick={() => setCurrentSize('screen')}
                              className={`w-6 h-6 rounded ${currentSize === 'screen' ? 'bg-white shadow-xs text-blue-700 font-bold' : 'text-slate-500 hover:text-slate-900'}`}
                              title="Toàn màn hình (Immersive 100vw)"
                              aria-label="Toàn màn hình"
                            >
                              <Maximize2 size={13} />
                            </Button>
                          </div>
                        )}

                        {topRightControls}
                        <Dialog.Close asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            iconOnly
                            aria-label="Đóng" 
                            className="w-7 h-7 text-slate-500 hover:bg-slate-100 hover:text-slate-800 rounded-full"
                          >
                            <X size={14} />
                          </Button>
                        </Dialog.Close>
                      </div>
                    </div>

                    {/* Horizon HUD (Heads-Up Display) */}
                    {horizonHud && (
                      <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/80 shrink-0 animate-in fade-in duration-200">
                        {horizonHud}
                      </div>
                    )}

                    {/* Navigation Tab Heads */}
                    {!tabs && (overviewPanel || activityPanel || linksPanel || znsHistoryPanel || auditLogPanel || attachmentsPanel) && (
                      <div className="px-6">
                        <Tabs.List className="flex items-center gap-5 border-b border-transparent">
                          {[
                            ...(overviewPanel ? [{ id: 'overview', label: 'Tổng quan' }] : []),
                            ...(activityPanel ? [{ id: 'activity', label: 'Hoạt động' }] : []),
                            ...(linksPanel ? [{ id: 'links', label: 'Liên kết' }] : []),
                            ...(znsHistoryPanel ? [{ id: 'zns', label: 'ZNS' }] : []),
                            ...(auditLogPanel ? [{ id: 'history', label: 'Nhật ký' }] : []),
                            ...(attachmentsPanel ? [{ id: 'attachments', label: 'Tập tin' }] : []),
                          ].map(tab => (
                            <Tabs.Trigger 
                              key={tab.id}
                              value={tab.id}
                              className={`pb-2.5 text-xs font-semibold relative outline-none transition-colors select-none cursor-pointer ${
                                activeTab === tab.id ? 'text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {tab.label}
                              {activeTab === tab.id && (
                                <motion.div 
                                  layoutId="drawer-activetab-indicator" 
                                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600"
                                />
                              )}
                            </Tabs.Trigger>
                          ))}
                        </Tabs.List>
                      </div>
                    )}
                    {tabs && <div className="px-6 pb-2 border-b border-transparent">{tabs}</div>}
                  </div>
                  
                  {/* Sliding Body Area */}
                  <div className="flex-1 overflow-y-auto bg-slate-50/60 p-6 relative focus:outline-none">
                    {children ? children : (
                      <>
                        {overviewPanel && <Tabs.Content value="overview" className="focus:outline-none">{overviewPanel}</Tabs.Content>}
                        {activityPanel && <Tabs.Content value="activity" className="focus:outline-none">{activityPanel}</Tabs.Content>}
                        {linksPanel && <Tabs.Content value="links" className="focus:outline-none">{linksPanel}</Tabs.Content>}
                        {znsHistoryPanel && <Tabs.Content value="zns" className="focus:outline-none">{znsHistoryPanel}</Tabs.Content>}
                        {auditLogPanel && <Tabs.Content value="history" className="focus:outline-none">{auditLogPanel}</Tabs.Content>}
                        {attachmentsPanel && <Tabs.Content value="attachments" className="focus:outline-none">{attachmentsPanel}</Tabs.Content>}
                      </>
                    )}
                  </div>

                  {/* Clean Bottom Tab Actions */}
                  <div className="p-4 border-t border-slate-100 bg-white shrink-0 flex items-center justify-between select-none">
                    {footer ? footer : (
                      <>
                        {/* LEFT action group: Danger button ONLY */}
                        <div className="flex items-center">
                          {onDelete && (
                            <Button 
                              variant="danger" 
                              size="md" 
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'Xác nhận xóa',
                                  message: 'Bạn có chắc chắn muốn xóa bản ghi này? Mọi dữ liệu liên quan sẽ bị loại bỏ vĩnh viễn và không thể khôi phục.',
                                  variant: 'danger',
                                  confirmText: 'Xác nhận xóa',
                                  cancelText: 'Hủy bỏ'
                                });
                                if (ok) {
                                  onDelete();
                                }
                              }} 
                              aria-label="Xóa bản ghi này"
                              title="Xóa vĩnh viễn"
                              leftIcon={<Trash2 size={14} />}
                            >
                              Xóa
                            </Button>
                          )}
                        </div>
                        
                        {/* RIGHT action group: Functional Actions */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {onEdit && (
                              <Button 
                                variant="dark" 
                                size="md" 
                                aria-label="Chỉnh sửa chi tiết" 
                                onClick={onEdit} 
                                leftIcon={<Edit size={14} />}
                                className="font-bold"
                              >
                                Chỉnh sửa
                              </Button>
                            )}
                            {onSendZns && (
                              <Button 
                                variant="subtle" 
                                size="md" 
                                aria-label="Gửi tin nhắn ZNS" 
                                onClick={onSendZns} 
                                leftIcon={<Send size={14} />}
                                className="font-bold"
                              >
                                Gửi ZNS
                              </Button>
                            )}
                            {onSave && (
                              <Button 
                                variant="primary" 
                                size="md" 
                                aria-label="Lưu thay đổi" 
                                onClick={onSave} 
                                disabled={!isDirty} 
                                leftIcon={<Save size={14} />}
                                className="font-bold"
                              >
                                Lưu thay đổi
                              </Button>
                            )}
                          </div>

                          {updatedBy && (
                            <span className="text-2xs text-slate-600 font-mono mr-2 hidden sm:block">
                              Cập nhật: {updatedAt} bởi {updatedBy}
                            </span>
                          )}
                          {onPrint && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              iconOnly
                              onClick={onPrint} 
                              className="w-8 h-8 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                              aria-label="In bản ghi này"
                              title="In tài liệu"
                            >
                              <Printer size={14} />
                            </Button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </Tabs.Root>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
      </Dialog.Root>
    </>
  );
}
