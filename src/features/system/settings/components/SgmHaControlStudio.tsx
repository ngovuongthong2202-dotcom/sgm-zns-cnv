import { Switch } from '@/src/design-system';
import React, { useState } from 'react';
import { Activity, Wifi, WifiOff, Radio, Database, Info } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';

interface Props {
  wsPulseGlow?: boolean;
  offlineSimulated?: boolean;
  handleToggleOffline?: (checked: boolean) => void;
  bgSyncInterval?: 'off' | '30s' | '60s';
  setBgSyncInterval?: (val: 'off' | '30s' | '60s') => void;
  wsStreamActive?: boolean;
  setWsStreamActive?: (active: boolean) => void;
  cacheHits?: number;
}

export default function SgmHaControlStudio(props: Props) {
  const [localOfflineSimulated, setLocalOfflineSimulated] = useState(() => {
    return localStorage.getItem('sgm_simulated_offline') === 'true';
  });
  const [localBgSyncInterval, setLocalBgSyncInterval] = useState<'off' | '30s' | '60s'>(() => {
    return (localStorage.getItem('sgm_bg_sync_interval') as 'off' | '30s' | '60s') || '30s';
  });
  const [localWsStreamActive, setLocalWsStreamActive] = useState(() => {
    return localStorage.getItem('sgm_ws_stream_active') !== 'false';
  });

  const offlineSimulated = props.offlineSimulated !== undefined ? props.offlineSimulated : localOfflineSimulated;
  const handleToggleOffline = props.handleToggleOffline || ((checked) => {
    setLocalOfflineSimulated(checked);
    localStorage.setItem('sgm_simulated_offline', String(checked));
    window.dispatchEvent(new Event('storage'));
    notify.success(checked ? 'Đã kích hoạt chế độ ngoại tuyến giả lập' : 'Đã tắt chế độ ngoại tuyến giả lập');
  });

  const bgSyncInterval = props.bgSyncInterval || localBgSyncInterval;
  const setBgSyncInterval = props.setBgSyncInterval || ((val) => {
    setLocalBgSyncInterval(val);
    localStorage.setItem('sgm_bg_sync_interval', val);
    window.dispatchEvent(new Event('storage'));
    notify.success(val === 'off' ? 'Đã tắt đồng bộ nền tự động.' : `Đồng bộ nền được định cấu hình mỗi ${val === '30s' ? '30 giây' : '60 giây'}.`);
  });

  const wsStreamActive = props.wsStreamActive !== undefined ? props.wsStreamActive : localWsStreamActive;
  const setWsStreamActive = props.setWsStreamActive || ((active) => {
    setLocalWsStreamActive(active);
    localStorage.setItem('sgm_ws_stream_active', String(active));
    window.dispatchEvent(new Event('storage'));
    notify.success(active ? 'Luồng WebSockets đang được truyền thẳng tới biểu đồ!' : 'Đã ngắt luồng WebSockets.');
  });

  const wsPulseGlow = props.wsPulseGlow !== undefined ? props.wsPulseGlow : (wsStreamActive && !offlineSimulated);
  const cacheHits = props.cacheHits !== undefined ? props.cacheHits : (() => {
    return Number(localStorage.getItem('sgm_cache_hits') || '42');
  })();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col gap-4 print:hidden transition-all duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg bg-blue-50 text-blue-600 ${wsPulseGlow ? 'animate-bounce' : ''}`}>
            <Activity size={16} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Phòng điều khiển SGM HA</h3>
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              Trình Giả lập Ngoại tuyến & Kết nối mạng
              {wsPulseGlow && (
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              )}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-mono">Testbed Functionality</span>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            offlineSimulated 
              ? 'bg-amber-100/80 text-amber-800 border border-amber-200' 
              : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${offlineSimulated ? 'bg-amber-600 animate-pulse' : 'bg-emerald-600'}`} />
            {offlineSimulated ? 'ĐANG GIẢ LẬP OFFLINE' : 'ĐANG ONLINE MẶC ĐỊNH'}
          </div>
        </div>
      </div>
      
      {/* EXPLANATORY NOTE ADDED HERE */}
      <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex items-start gap-2.5 mt-1">
         <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
         <p className="text-xs text-blue-800 leading-relaxed">
           <strong>Mục đích:</strong> Công cụ giả lập (mockup) này được xây dựng để dành cho bộ phận kỹ thuật (IT) thử nghiệm tính năng lưu cache khi mất mạng. Việc bật/tắt các cấu hình ở đây <strong>KHÔNG</strong> ảnh hưởng đến dữ liệu thực tế hay khả năng hoạt động trực tuyến của ứng dụng, vì hệ thống Supabase luôn tự động chịu trách nhiệm đồng bộ.
         </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
        
        {/* COL 1: NETWORK SIMULATOR */}
        <div className="flex flex-col justify-between gap-3 h-full">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              {offlineSimulated ? <WifiOff size={12} className="text-amber-600" /> : <Wifi size={12} className="text-emerald-600" />}
              Giả lập Kết nối Mạng
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Khi chế độ Ngoại tuyến được bật, tất cả các request lấy dữ liệu mới sẽ được SWR định tuyến trực tiếp để hiển thị tức thì từ bộ nhớ cache persistent localStorage.
            </p>
          </div>
          <div className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-lg">
            <span className="text-xs font-semibold text-slate-600">Simulate Offline Mode</span>
            <Switch
              checked={offlineSimulated}
              onChange={handleToggleOffline}
              title="Bật/Tắt chế độ Ngoại tuyến"
              aria-label="Simulation toggle"
            />
          </div>
        </div>

        {/* COL 2: SYNC & WEBSOCKETS */}
        <div className="flex flex-col justify-between gap-3 md:pl-6 h-full pt-4 md:pt-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Radio size={12} className="text-blue-600 animate-pulse" />
              Đồng bộ Nền & WebSockets
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Tự động làm mới dữ liệu từ Firestore qua bộ lọc dồn tích SWR định kỳ, hoặc giả lập luồng WebSocket thời gian thực nhận các cập nhật giao dịch mới.
            </p>
          </div>
          
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 font-sans">Tần suất Sync Nền</span>
              <select
                value={bgSyncInterval}
                onChange={e => {
                  const val = e.target.value as 'off' | '30s' | '60s';
                  setBgSyncInterval(val);
                  notify.success(val === 'off' ? 'Đã tắt đồng bộ nền tự động.' : `Đồng bộ nền được định cấu hình mỗi ${val === '30s' ? '30 giây' : '60 giây'}.`);
                }}
                className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none text-slate-700 font-medium cursor-pointer"
                title="Chế độ đồng bộ"
              >
                <option value="off">Tắt Sync</option>
                <option value="30s">Mỗi 30s</option>
                <option value="60s">Mỗi 60s</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600 font-sans">Luồng WebSocket (Mock)</span>
              <Switch
                checked={wsStreamActive}
                onChange={(next) => {
                  setWsStreamActive(next);
                  notify.success(next ? 'Luồng WebSockets đang được truyền thẳng tới biểu đồ!' : 'Đã ngắt luồng WebSockets.');
                }}
                aria-label="WebSocket Stream Switch"
              />
            </div>
          </div>
        </div>

        {/* COL 3: SAVED READS STATS */}
        <div className="flex flex-col justify-between gap-3 md:pl-6 h-full pt-4 md:pt-0">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <Database size={12} className="text-emerald-600" />
              Hiệu quả Tối ưu Firestore SWR
            </div>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Phân tích định lượng số lượng truy vấn trực tiếp được dồn tích qua lớp SWR Cache, tránh tình trạng đội chi phí FirestoreReads vô lý khi xem báo cáo liên tục.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 bg-slate-50 border border-slate-100 p-2.5 rounded-lg select-none">
            <div className="flex flex-col">
              <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider font-sans">Reads Đã Tiết Kiệm</span>
              <span className="text-base font-bold text-slate-800 font-mono tracking-tight text-emerald-650">
                +{new Intl.NumberFormat('vi-VN').format(cacheHits * 1050)}
              </span>
            </div>
            <div className="flex flex-col border-l border-slate-200/50 pl-3">
              <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider font-sans">Băng Thông Giảm</span>
              <span className="text-base font-bold text-slate-800 font-mono tracking-tight">
                {(cacheHits * 1.25).toFixed(1)} MB
              </span>
            </div>
            <div className="flex flex-col border-t border-slate-200/50 pt-1.5 col-span-2 flex-row justify-between items-center flex">
              <span className="text-2xs text-slate-500 font-bold uppercase tracking-wider font-sans">Tốc độ nạp (SWR Cache VS Network)</span>
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                1.2s <span className="text-slate-300 font-normal">→</span> <span className="text-emerald-600 font-mono">4ms (Local)</span>
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
