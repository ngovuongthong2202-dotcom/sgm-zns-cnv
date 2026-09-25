import { Button } from '@/src/design-system';
/* eslint-disable max-lines */
import { InlineEntityLabel } from '@/src/design-system/InlineEntityLabel';
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Mail, Zap, Play, Pause, X, RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { notify } from '@/src/shared/utils/notify';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';
import { t } from '@/src/i18n/vi';

interface ZnsMessageItem {
  id: string;
  createdAt: string;
  customerId?: string;
  status?: string;
  trangThai?: string;
  errorLog?: string;
  templateId?: string;
  soDienThoai?: string;
  tenThaoTac?: string;
  tenKhachHang?: string;
  entityId?: string;
  entityType?: string;
  payload?: any;
}

interface RealtimeZnsTickerV2Props {
  events: ZnsMessageItem[];
}

export function RealtimeZnsTickerV2({ events }: RealtimeZnsTickerV2Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isAutoScrollActive, setIsAutoScrollActive] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<ZnsMessageItem | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Math virtualization: estimate row height at exactly 40px
  const rowVirtualizer = useVirtualizer({
    count: events.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 4,
  });

  // Smooth scroll top when a new live message hits the stream, 
  // ONLY if not hovered and auto-scroll is actively enabled
  useEffect(() => {
    if (events.length > 0 && !isHovered && isAutoScrollActive) {
      rowVirtualizer.scrollToOffset(0, { align: 'start', behavior: 'smooth' });
    }
  }, [events[0]?.id, isHovered, isAutoScrollActive, rowVirtualizer]);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Standard resume stream after 3 seconds window gap
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 3000);
  };

  // Status Badge decorator
  function getStatusBadge(trangThai?: string, status?: string) {
    const norm = normalizeLegacyStatus(trangThai || status || '');
    
    if (norm === EntityZnsStatus.THANH_CONG) {
      return (
        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-3xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 selector-none uppercase tracking-wider">
          SUCCESS
        </span>
      );
    }
    if (norm === EntityZnsStatus.DA_DAY_CHO_KQ || norm === EntityZnsStatus.DANG_DAY) {
      return (
        <span className="inline-flex items-center h-5 px-1.5 rounded-full text-3xs font-bold bg-amber-50 text-amber-600 border border-amber-100 select-none uppercase tracking-wider">
          PENDING
        </span>
      );
    }
    if (norm === EntityZnsStatus.CAN_GUI_LAI) {
      return (
        <span className="inline-flex items-center h-5 px-1.5 rounded-md text-3xs font-semibold italic bg-red-100 text-red-700 border border-dashed border-red-300 select-none tracking-tight">
          DLQ
        </span>
      );
    }
    // FAILED
    return (
      <span className="inline-flex items-center h-5 px-1.5 rounded-full text-3xs font-bold bg-red-50 text-red-600 border border-red-100 select-none uppercase tracking-wider">
        FAILED
      </span>
    );
  }

  // Precalculating aggregates
  const tickerStats = useMemo(() => {
    const totals = events.length;
    const successes = events.filter(m => normalizeLegacyStatus(m.trangThai || m.status || '') === EntityZnsStatus.THANH_CONG).length;
    const rate = totals > 0 ? Math.round((successes / totals) * 100) : 100;
    return { totals, successes, rate };
  }, [events]);

  return (
    <article className="lg:col-span-12 bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden flex flex-col h-[320px]">
      
      {/* Upper header section */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-emerald-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
            Bộ định tuyến ZNS thời gian thực
          </h2>
          <span className="ml-1 flex h-2 w-2 relative">
            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>
        
        {/* Statistics & pause controls */}
        <div className="flex items-center gap-4">
          <div className="text-2xs font-semibold text-slate-500 hidden sm:flex items-center gap-3">
            <span>Tổng: <strong className="text-slate-900 font-mono">{tickerStats.totals}</strong> tin</span>
            <span className="w-1 h-3 bg-slate-200"></span>
            <span>Tỷ lệ đạt: <strong className="text-emerald-800 font-mono">{tickerStats.rate}%</strong></span>
          </div>

          <button
            type="button"
            onClick={() => setIsAutoScrollActive(!isAutoScrollActive)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer outline-none bg-white ${
              isAutoScrollActive ? 'text-slate-600 border-slate-200' : 'text-amber-600 border-amber-200 bg-amber-50/20'
            }`}
            title={isAutoScrollActive ? 'Tạm dừng trượt dòng' : 'Bật trượt dòng'}
          >
            {isAutoScrollActive ? <Pause size={12} /> : <Play size={12} />}
            <span className="font-bold uppercase text-3xs tracking-wider">
              {isAutoScrollActive ? 'Live ON' : 'Paused'}
            </span>
          </button>
        </div>
      </div>

      {/* Main scrolling viewport container wrap with hover listeners */}
      <div
        ref={parentRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="flex-1 overflow-y-auto scrollbar-none relative bg-slate-50/30"
        style={{ height: '240px' }}
      >
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 select-none">
            <Mail size={24} className="opacity-30 stroke-[1.5]" />
            <span className="text-xs font-semibold">{t('empty.noData')}</span>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const msg = events[virtualRow.index];
              if (!msg) return null;

              // Cost helper - SUCCESS/SENT counts as standard 300 VNĐ, FAILED counts as 0 VNĐ
              const representsSuccess = normalizeLegacyStatus(msg.trangThai || msg.status || '') === EntityZnsStatus.THANH_CONG;
              const cost = representsSuccess ? '300đ' : '0đ';

              // Customer route locator
              const cusRoute = msg.customerId ? `/customers?id=${msg.customerId}` : `/customers`;

              // Time formatting
              let msgTime = '12:00';
              try {
                if (msg.createdAt) {
                  msgTime = format(new Date(msg.createdAt), 'HH:mm:ss');
                }
              } catch (e) {
                console.warn('Date formatting exception: ', e);
              }

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '40px',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => setSelectedMsg(msg)}
                  className="flex items-center h-10 px-6 hover:bg-slate-100 border-b border-slate-100 transition-colors select-none font-sans cursor-pointer"
                >
                  {/* Status Indicator */}
                  <div className="w-[85px] shrink-0 flex items-center pr-2">
                    {getStatusBadge(msg.trangThai, msg.status)}
                  </div>

                  {/* Customer identifier link */}
                  <div className="flex-1 min-w-0 pr-4 flex items-center">
                    <Link
                      to={cusRoute}
                      className="text-xs font-semibold text-slate-800 hover:text-blue-600 hover:underline truncate"
                    >
                      {msg.tenKhachHang || msg.soDienThoai || 'Khách hàng SGM'}
                    </Link>
                  </div>

                  {/* Operator / Template description */}
                  <div className="w-[180px] shrink-0 hidden md:block text-xs text-slate-500 truncate pr-4">
                    {msg.tenThaoTac || `Mã nguồn: ${msg.templateId || 'ZNS_GENERIC'}`}
                  </div>

                  {/* Timestamp */}
                  <div className="w-[70px] shrink-0 text-slate-400 font-mono text-2xs select-none text-left">
                    {msgTime}
                  </div>

                  {/* Message execution pricing */}
                  <div className="w-[60px] shrink-0 text-right font-mono text-2xs font-bold text-slate-500 tabular-nums">
                    {cost}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating pause-indicators */}
      {isHovered && events.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-slate-900/90 text-white text-2xs items-center font-bold px-2.5 py-1 rounded-full gap-1 flex shadow-lg border border-slate-700 animate-in fade-in transition-all z-10">
          <Pause size={10} className="text-amber-400 fill-amber-400" />
          <span>TẠM DỪNG ĐỂ ĐỌC · SẼ CHẠY LẠI SAU 3S</span>
        </div>
      )}

      {/* Floating details Drawer */}
      <AnimatePresence>
        {selectedMsg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900"
              onClick={() => setSelectedMsg(null)}
            />
            {/* Drawer/Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center gap-2">
                  <Mail size={16} className="text-slate-800" />
                  <h3 className="text-sm font-bold text-slate-900 uppercase">Chi tiết định tuyến ZNS</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMsg(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition cursor-pointer border-0 bg-transparent"
                  aria-label="Đóng"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-2xs font-bold text-slate-600 block uppercase mb-1">Mã tham chiếu</span>
                    <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100 block truncate" title={selectedMsg.entityId}>
                      <InlineEntityLabel entityType={selectedMsg.entityType as string} entityId={selectedMsg.entityId as string} fallbackId={selectedMsg.entityId as string} snapshotData={selectedMsg.payload} />
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs font-bold text-slate-600 block uppercase mb-1">Tình trạng</span>
                    <div className="flex pt-0.5">
                      {getStatusBadge(selectedMsg.trangThai, selectedMsg.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-50/50 p-4 border border-slate-100 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-2xs font-bold text-slate-600 block uppercase mb-0.5">Khách hàng nhận</span>
                      <span className="text-sm font-semibold text-slate-900 block">
                        {selectedMsg.tenKhachHang || 'Khách hàng SGM'}
                      </span>
                    </div>
                    {selectedMsg.customerId && (
                      <Link
                        to={`/customers?id=${selectedMsg.customerId}`}
                        onClick={() => setSelectedMsg(null)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Hồ sơ KH →
                      </Link>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-2xs font-bold text-slate-600 block uppercase mb-0.5">Số điện thoại</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 block">
                        {selectedMsg.soDienThoai || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-2xs font-bold text-slate-600 block uppercase mb-0.5">Thời điểm ghi</span>
                      <span className="text-xs font-mono font-semibold text-slate-700 block text-left">
                        {selectedMsg.createdAt ? format(new Date(selectedMsg.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-2xs font-bold text-slate-600 block uppercase">Nội dung / Mẫu nguồn tin</span>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs font-semibold text-slate-800 flex items-center justify-between">
                    <span>{selectedMsg.tenThaoTac || 'Mã nguồn tin không rõ'}</span>
                    <span className="font-mono text-2xs bg-white px-2 py-0.5 rounded border border-slate-200/60 uppercase text-slate-600">
                      ID: {selectedMsg.templateId || 'GENERIC'}
                    </span>
                  </div>
                </div>

                {selectedMsg.errorLog && (
                  <div className="space-y-1">
                    <span className="text-2xs font-bold text-red-700 block uppercase flex items-center gap-1">
                      <AlertCircle size={10} /> Chi tiết lỗi định tuyến hệ thống
                    </span>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-900 font-mono overflow-x-auto whitespace-pre-wrap max-h-32 select-text">
                      {selectedMsg.errorLog}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedMsg(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 font-semibold text-xs text-slate-700 rounded-lg transition cursor-pointer bg-white"
                >
                  Đóng
                </button>
                {((selectedMsg.trangThai || selectedMsg.status || '').toUpperCase() === 'FAILED' ||
                  (selectedMsg.trangThai || selectedMsg.status || '').toUpperCase() === 'DLQ') && (
                  <Button
                    type="button"
                    disabled={isRetrying}
                    onClick={async () => {
                      setIsRetrying(true);
                      try {
                        const res = await fetch('/api/zns/replay', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ messageId: selectedMsg.id })
                        });
                        if (res.ok) {
                          notify.success('Đã gửi lại yêu cầu tái lập ZNS Hub thành công!');
                          setSelectedMsg(null);
                        } else {
                          const errData = await res.json();
                          notify.error(`Gửi lại thất bại: ${errData.error || 'Lỗi hệ thống'}`);
                        }
                      } catch (err: any) {
                        notify.error(`Gửi lại thất bại: ${err.message}`);
                      } finally {
                        setIsRetrying(false);
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <RefreshCw size={12} className={isRetrying ? 'animate-spin' : ''} />
                    {isRetrying ? 'Đang gửi...' : 'Gửi lại ngay'}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </article>
  );
}

export default RealtimeZnsTickerV2;
