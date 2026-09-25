import React, { useRef, useMemo, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { RefreshCw, CodeSquare, Copy, CheckCircle2, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { StatusPill } from '@/src/widgets/StatusPill';
import { tokens } from '@/src/design-system/tokens';
import { InlineEntityLabel } from '@/src/design-system/InlineEntityLabel';
import { t } from '@/src/i18n/vi';

interface Props {
  activeTab: 'outbox' | 'dlq' | 'debug' | 'unmapped';
  currentList: any[];
  loading: boolean;
  expandedMsgId: string | null;
  setExpandedMsgId: (id: string | null) => void;
  handleReplaySingle: (e: React.MouseEvent, id: string) => Promise<void>;
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
}

export default function ZnsHubTable({
  activeTab,
  currentList,
  loading,
  expandedMsgId,
  setExpandedMsgId,
  handleReplaySingle,
  hasMore,
  loadMore,
  loadingMore
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<'payload' | 'error' | null>(null);

  const handleCopy = (type: 'payload' | 'error', text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const selectedItem = useMemo(() => currentList.find(m => m.id === expandedMsgId) || null, [currentList, expandedMsgId]);

  const getScrollElement = useCallback(() => parentRef.current, []);
  const estimateSize = useCallback(() => 40, []);

  // Virtualizer config with stable callbacks
  const rowVirtualizer = useVirtualizer({
    count: currentList.length,
    getScrollElement,
    estimateSize,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  // Layout grid column specifications based on current tab selection
  const gridTemplateClass = useMemo(() => {
    if (activeTab === 'outbox' || activeTab === 'dlq') {
      return 'grid grid-cols-[140px_130px_130px_1fr_60px] items-center px-4';
    }
    if (activeTab === 'debug' || activeTab === 'unmapped') {
      return 'grid grid-cols-[140px_160px_160px_1fr] items-center px-4';
    }
    return 'grid grid-cols-5 items-center px-4';
  }, [activeTab]);

  return (
    <div className="flex-1 flex overflow-hidden bg-white relative border border-slate-200 rounded-xl shadow-sm">
      {loading && currentList.length === 0 && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 backdrop-blur-sm">
           <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Left List Area */}
      <div className={`flex flex-col h-full bg-white transition-all duration-300 ${expandedMsgId ? 'w-full md:w-[60%] border-r border-slate-200' : 'w-full'}`}>
         {/* Grid Table Header */}
         <div className={`bg-slate-50 border-b border-slate-200 py-3 font-semibold text-slate-500 uppercase tracking-wider text-2xs select-none shrink-0 ${gridTemplateClass}`}>
           <div>Thời gian</div>
           {(activeTab === 'outbox' || activeTab === 'dlq') && (
             <>
               <div>Tham chiếu</div>
               <div>Trạng thái</div>
               <div>Đối tượng</div>
               <div className="text-right">Hành động</div>
             </>
           )}
           {activeTab === 'debug' && (
             <>
               <div>ID Nhà cung cấp</div>
               <div>Mã phản hồi</div>
               <div>Tóm tắt</div>
             </>
           )}
           {activeTab === 'unmapped' && (
             <>
               <div>ID Tracking</div>
               <div>Lý do</div>
               <div>Tóm tắt</div>
             </>
           )}
         </div>

         {/* Scrollable list */}
         <div
           ref={parentRef}
           className="flex-1 overflow-y-auto w-full min-h-0 relative"
         >
           {currentList.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                 <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                    <CodeSquare size={20} className="text-slate-400" />
                 </div>
                 <p className={tokens.typography.body.md}>Không tìm thấy bản ghi log nào thỏa mãn điều kiện</p>
             </div>
           ) : (
             <div
               className="w-full relative"
               style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
             >
               {virtualItems.map((virtualRow) => {
                 const item = currentList[virtualRow.index];
                 if (!item) return null;
                 const isSelected = expandedMsgId === item.id;

                 return (
                   <div
                     key={item.id}
                     data-index={virtualRow.index}
                     onClick={() => setExpandedMsgId(isSelected ? null : item.id)}
                     className={`absolute top-0 left-0 w-full hover:bg-blue-50/50 transition-colors cursor-pointer group h-10 border-b border-slate-100 ${
                       isSelected ? 'bg-blue-50 border-blue-100' : ''
                     } ${gridTemplateClass}`}
                     style={{ transform: `translateY(${virtualRow.start}px)` }}
                   >
                     {/* Time */}
                     <div className="truncate font-mono text-slate-500 text-2xs" title={new Date(item.createdAt || item.timestamp || item.receivedAt).toLocaleString('vi-VN')}>
                       {new Date(item.createdAt || item.timestamp || item.receivedAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
                     </div>

                     {/* Columns for Outbox/DLQ status */}
                     {(activeTab === 'outbox' || activeTab === 'dlq') && (
                       <>
                         <div className="truncate pr-2">
                           <code className="text-2xs font-mono text-slate-600 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm">
                             {item.id?.slice(-8)}
                           </code>
                         </div>
                         <div>
                           <StatusPill statusStr={item.status} className="shrink-0" />
                         </div>
                         <div className="truncate flex items-center gap-2 pr-2">
                           <span className="text-2xs font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 whitespace-nowrap">
                             {item.entityType}
                           </span>
                           <span className="text-xs font-medium text-slate-700 truncate">
                             <InlineEntityLabel entityType={item.entityType} entityId={item.entityId} fallbackId={item.entityId} snapshotData={item.payload || item.data || item} />
                           </span>
                         </div>
                         <div className="text-right flex items-center justify-end pr-2">
                           {(item.status === 'DLQ' || item.status === 'FAILED') && (
                             <Button
                               onClick={(e) => handleReplaySingle(e, item.id)}
                               className="p-1 rounded text-red-500 hover:text-white hover:bg-red-500 transition-colors focus-visible:outline-none"
                               title="Retry DLQ"
                             >
                               <RefreshCw size={14} className="hover:animate-spin" />
                             </Button>
                           )}
                           <ChevronRight size={16} className={`ml-2 text-slate-300 transition-opacity ${isSelected ? 'opacity-100 text-blue-500' : 'opacity-0 group-hover:opacity-100'}`} />
                         </div>
                       </>
                     )}

                     {/* Columns for Debug */}
                     {activeTab === 'debug' && (
                       <>
                         <div className="truncate font-mono text-slate-700 text-2xs pr-2">
                           {item.payload?.request_id || item.payload?.stt || '--'}
                         </div>
                         <div>
                           <StatusPill statusStr={item.payload?.status || 'UNKNOWN'} className="shrink-0" />
                         </div>
                         <div className="truncate text-slate-400 font-mono text-2xs pr-2" title={JSON.stringify(item.payload)}>
                           {JSON.stringify(item.payload).slice(0, 50)}...
                         </div>
                       </>
                     )}

                     {/* Columns for Unmapped */}
                     {activeTab === 'unmapped' && (
                       <>
                         <div className="truncate font-mono text-slate-700 text-2xs pr-2">
                           {item.trackingId || '--'}
                         </div>
                         <div className="truncate text-slate-500 text-xs pr-2" title={item.reason || ''}>
                           {item.reason || '--'}
                         </div>
                         <div className="truncate text-slate-400 font-mono text-2xs pr-2" title={JSON.stringify(item.payload)}>
                           {JSON.stringify(item.payload).slice(0, 50)}...
                         </div>
                       </>
                     )}
                   </div>
                 );
               })}
             </div>
           )}
         </div>
         
         {hasMore && (
           <div className="p-3 flex justify-center bg-slate-50 border-t border-slate-200 shrink-0 select-none">
             <Button
               variant="secondary"
               size="sm"
               onClick={loadMore}
               isLoading={loadingMore}
             >
               Tải thêm logs lịch sử
             </Button>
           </div>
         )}
      </div>

      {/* Right Detail Panel */}
      {selectedItem && (
        <div className="w-full md:w-[40%] h-full bg-slate-50 flex flex-col absolute md:static right-0 top-0 bottom-0 z-10 animate-in slide-in-from-right-8 duration-200 shadow-xl md:shadow-none border-l border-slate-200">
           <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white shrink-0 shadow-sm">
             <h3 className={tokens.typography.heading.sm + " text-slate-900 flex items-center gap-2"}><CodeSquare size={16} className="text-blue-600" /> {t('znshub.detail.payloadTitle')}</h3>
             <Button 
               onClick={() => setExpandedMsgId(null)} 
               className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors md:hidden"
               aria-label="Đóng panel"
             >
                <ChevronRight size={16} />
             </Button>
           </div>
           
           <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-slate-50">
              {/* Payload Section */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="text-2xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                       {t('znshub.detail.compiledJson')}
                    </div>
                    <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => handleCopy('payload', JSON.stringify(selectedItem.payload || selectedItem, null, 2))}
                       className="h-6 text-2xs px-2 text-slate-500 hover:text-slate-900"
                    >
                       {copied === 'payload' ? <CheckCircle2 size={12} className="text-emerald-500 mr-1" /> : <Copy size={12} className="mr-1" />}
                       {copied === 'payload' ? t('znshub.detail.copied') : t('znshub.detail.copy')}
                    </Button>
                 </div>
                 <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto shadow-[0_4px_12px_rgba(15,23,42,0.15)] border border-slate-800">
                    <pre className="font-mono text-2xs text-slate-300 leading-relaxed select-auto">
                       {JSON.stringify(selectedItem.payload || selectedItem, null, 2)}
                    </pre>
                 </div>
              </div>

              {/* Vendor Response/Error Section */}
              <div className="space-y-3">
                 <div className="flex items-center justify-between">
                    <div className="text-2xs font-bold text-slate-400 uppercase tracking-wide flex items-center gap-2">
                       <AlertCircle size={14} className={selectedItem.errorLog ? "text-red-500" : "text-amber-500"} /> {t('znshub.detail.sysErr')}
                    </div>
                    {(selectedItem.errorLog || selectedItem.lastVendorResponse) && (
                       <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCopy('error', JSON.stringify(selectedItem.lastVendorResponse || selectedItem.errorLog, null, 2))}
                          className="h-6 text-2xs px-2 text-slate-500 hover:text-slate-900"
                       >
                          {copied === 'error' ? <CheckCircle2 size={12} className="text-emerald-500 mr-1" /> : <Copy size={12} className="mr-1" />}
                          {copied === 'error' ? t('znshub.detail.copied') : t('znshub.detail.copy')}
                        </Button>
                    )}
                 </div>
                 <div className={`rounded-xl p-4 overflow-x-auto shadow-inner border ${selectedItem.errorLog ? 'bg-red-50/50 border-red-100 text-red-900' : 'bg-white border-slate-200 text-slate-700'}`}>
                    <pre className="font-mono text-2xs leading-relaxed select-auto whitespace-pre-wrap">
                       {selectedItem.errorLog ? `[EXCEPTION]\n${selectedItem.errorLog}\n\n` : ''}
                       {selectedItem.lastVendorResponse
                         ? JSON.stringify(selectedItem.lastVendorResponse, null, 2)
                         : selectedItem.errorLog
                         ? ''
                         : t('znshub.detail.normal_status')}
                    </pre>
                 </div>
                 
                 {(selectedItem.status === 'DLQ' || selectedItem.status === 'FAILED') && (
                    <Button 
                       variant="danger" 
                       size="md" 
                       className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-center gap-2 py-2.5 rounded-xl shadow-[0_2px_4px_rgba(220,38,38,0.2)] transition-all"
                       onClick={(e) => handleReplaySingle(e, selectedItem.id)}
                    >
                       <RefreshCw size={14} className="animate-spin-slow" /> {t('znshub.detail.btn_retry_single')}
                    </Button>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
