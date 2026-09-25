import React, { useState, useEffect } from 'react';
import { Save, Info, MessageCircle, Plus, Trash2, Send } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';

import { Button } from '@/src/design-system/Button';
import { t } from '@/src/i18n/vi';
import { settingsRepo } from '@/src/data/repositories';

const defaultTemplates = {
  digest: `📊 *Báo cáo SGM ngày {{date}}*\n\n👥 *Khách hàng*: {{newCustomersToday}} mới ({{customerDelta}} vs hôm qua)\n💼 *Báo giá*: {{newQuotations}} phát hành, {{closedQuotations}} đã chốt\n📑 *Hợp đồng*: {{newContracts}} ký mới\n💰 *Doanh thu*: {{revenueToday}} ₫ (thu trong ngày)\n📦 *Giao hàng*: {{newDeliveries}} phiếu mới, {{completedDeliveries}} đã giao\n📨 *ZNS*: {{znsSent}} gửi, {{znsSuccess}} thành công ({{znsSuccessRate}}%)\n\n{{#hasUrgent}}\n⚠️ *Việc cần xử lý*:\n{{urgentItems}}\n{{/hasUrgent}}`,
  alertDlq: `🚨 *Cảnh báo ZNS DLQ cao*\nSố lượng tin nhắn lỗi (DLQ): {{count}} tin/giờ.`,
  alertContract: `⚠️ *Hợp đồng sắp hết hạn*\nMã HĐ: {{id}} - Tên: {{name}} sắp hết hạn vào ngày {{endDate}}.`,
  alertPayment: `⚠️ *Phiếu thanh toán quá hạn*\nMã: {{id}} - Số tiền: {{amount}} ₫ quá hạn từ ngày {{dueDate}}.`,
  manualReport: `📊 *Báo cáo tùy chọn*\n\n[Đang tự động thu thập và gửi...]`
};

interface TelegramChat {
  chatId: string;
  label: string;
  enabled: boolean;
  receiveDigest: boolean;
  receiveAlerts: boolean;
  receiveManualReports: boolean;
}

interface TelegramConfig {
  botToken: string;
  enabled: boolean;
  chats: TelegramChat[];
  digestSchedule: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
  };
  alertThresholds: {
    dlqHigh: number;
    successRateLow: number;
    overduePayments: number;
    contractsExpiring: number;
  };
  templates: typeof defaultTemplates;
}

export default function TelegramPage() {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  const [config, setConfig] = useState<TelegramConfig>({
    botToken: '',
    enabled: false,
    chats: [],
    digestSchedule: {
      enabled: false,
      cronExpression: '0 8 * * *',
      timezone: 'Asia/Ho_Chi_Minh'
    },
    alertThresholds: {
      dlqHigh: 10,
      successRateLow: 80,
      overduePayments: 5,
      contractsExpiring: 3
    },
    templates: { ...defaultTemplates }
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const data = await settingsRepo.getSettings<TelegramConfig>('telegram_config');
      if (data) {
         setConfig({
             ...config,
             ...data,
             templates: { ...defaultTemplates, ...(data.templates || {}) }
         });
      }
    } catch (error) {
      console.error(error);
      notify.error('Không thể tải cấu hình Telegram');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      await settingsRepo.setSettings('telegram_config', {
        ...config,
        updatedAt: new Date().toISOString()
      }, true);
      notify.success('Đã lưu cấu hình Telegram.');
    } catch (error) {
       console.error(error);
       notify.error('Không thể lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
     if (!config.botToken) {
        notify.error('Vui lòng nhập Bot Token trước.');
        return;
     }
     try {
       setTesting(true);
       const res = await fetch('/api/telegram/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: config.botToken })
       });
       const data = await res.json();
       if (data.success) {
          notify.success('Bot token hợp lệ.');
          setConfig((prev) => ({ ...prev, enabled: true }));
       } else {
          notify.error(data.error);
       }
     } catch (err: any) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        notify.error(errorMsg);
     } finally {
        setTesting(false);
     }
  };

  const handleSendTest = async (chatId: string) => {
     try {
        const res = await fetch('/api/telegram/test-send', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ chatId })
        });
        const data = await res.json();
        if (data.success) {
           notify.success('Đã gửi tin nhắn test đến Chat ID.');
        } else {
           notify.error(data.error);
        }
     } catch (err: any) {
         const errorMsg = err instanceof Error ? err.message : 'Unknown error';
         notify.error(errorMsg);
     }
  };

  if (loading && !config.botToken && config.chats.length === 0) {
     return <div className="p-8 text-slate-600 font-mono text-sm animate-pulse">Đang tải...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Tính năng Telegram Bot</h2>
        <p className="text-sm text-slate-500">
          Cấu hình bot để nhận báo cáo và cảnh báo tự động qua Telegram.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4 text-slate-900 tracking-tight">
           <MessageCircle className="h-5 w-5 text-blue-600" /> Kết nối Bot
        </h3>
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-1.5 focus-within:relative">
            <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Bot Token</label>
            <input aria-label="Nhập Bot Token" 
               type="password" 
               placeholder="1234567890:AAH_XYZ..." 
               value={config.botToken} 
               onChange={e => setConfig({...config, botToken: e.target.value})}
               className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
            />
          </div>
          <Button aria-label="Test Connection" 
             type="button" 
             onClick={handleTestConnection} 
             disabled={testing}
             className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 shadow-sm font-medium h-8 px-4 rounded-lg hover:bg-slate-50 transition-colors shrink-0 cursor-pointer disabled:opacity-50 text-sm focus:outline-none"
           variant="secondary" size="sm">
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
        <div className="flex items-center pt-2">
          <span className="text-sm font-medium flex items-center gap-2 text-slate-700">Trạng thái: 
             {config.enabled ? 
               <span className="px-2 py-0.5 rounded-md text-2xs font-semibold tracking-wide uppercase bg-emerald-100 text-emerald-700">Đã kết nối</span> : 
               <span className="px-2 py-0.5 rounded-md text-2xs font-semibold tracking-wide uppercase bg-slate-100 text-slate-600">Chưa kết nối</span>
             }
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
           <div>
              <h3 className="text-sm font-semibold text-slate-900">Danh sách Chat IDs</h3>
              <p className="text-xs text-slate-500 mt-0.5">Danh sách các group hoặc user sẽ nhận báo cáo.</p>
           </div>
           <Button aria-label="Thêm Group/User" 
             type="button" 
             variant="subtle"
             className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 h-8 rounded-lg text-sm font-medium transition-colors cursor-pointer border border-blue-200/50"
             onClick={() => setConfig({...config, chats: [...(config.chats || []), { chatId: '', label: 'Chat mới', enabled: true, receiveDigest: true, receiveAlerts: false, receiveManualReports: true }]})}
           >
             <Plus className="h-4 w-4" /> Thêm Chat
           </Button>
        </div>
        
        <div className="p-5 space-y-4">
           {(!config.chats || config.chats.length === 0) && (
              <p className="text-sm text-slate-500 text-center py-4">{t('empty.noChatId')}</p>
           )}
           {config.chats?.map((chat: TelegramChat, index: number) => (
              <div key={index} className="flex flex-col gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50/50 hover:border-slate-300 transition-colors">
                 <div className="flex gap-4 items-start">
                    <div className="w-1/3 space-y-1.5 focus-within:relative">
                       <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide block">Label</label>
                       <input aria-label="Nhập Label" 
                         type="text" 
                         value={chat.label} 
                         onChange={(e) => {
                          const newChats = [...config.chats];
                          newChats[index].label = e.target.value;
                          setConfig({...config, chats: newChats});
                         }} 
                         className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
                       />
                    </div>
                    <div className="w-1/3 space-y-1.5 focus-within:relative">
                       <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide block">Chat ID</label>
                       <input aria-label="Nhập Chat ID" 
                         type="text" 
                         value={chat.chatId} 
                         onChange={(e) => {
                          const newChats = [...config.chats];
                          newChats[index].chatId = e.target.value;
                          setConfig({...config, chats: newChats});
                         }} 
                         className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow tabular-nums" 
                       />
                    </div>
                    <div className="flex items-end gap-2 pt-[22px]">
                       <Button aria-label="Gửi test đến chat này" 
                         type="button" 
                         variant="secondary"
                         size="sm"
                         iconOnly
                         onClick={() => handleSendTest(chat.chatId)} 
                         title="Gửi test đến chat này"
                         className="w-8 h-8 p-0 border border-slate-200 rounded-lg text-slate-600 hover:text-blue-700 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer bg-white"
                       >
                         <Send className="h-4 w-4" />
                       </Button>
                       <Button 
                         type="button" 
                         variant="danger"
                         size="sm"
                         iconOnly
                         aria-label="Xóa chat"
                         title="Xóa chat này"
                         onClick={() => {
                          const newChats = [...config.chats];
                          newChats.splice(index, 1);
                          setConfig({...config, chats: newChats});
                         }}
                         className="w-8 h-8 p-0 border border-slate-200 rounded-lg text-slate-600 hover:text-red-700 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer bg-white"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                  </div>
                 
                 <div className="flex flex-wrap gap-6 mt-1 pt-3 border-t border-slate-200/60">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input aria-label="Tùy chọn" type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" checked={chat.enabled} onChange={(e) => { const c = [...config.chats]; c[index].enabled = e.target.checked; setConfig({...config, chats: c}); }} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Kích hoạt</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input aria-label="Tùy chọn" type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" checked={chat.receiveDigest} onChange={(e) => { const c = [...config.chats]; c[index].receiveDigest = e.target.checked; setConfig({...config, chats: c}); }} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Digest tự động</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input aria-label="Tùy chọn" type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" checked={chat.receiveAlerts} onChange={(e) => { const c = [...config.chats]; c[index].receiveAlerts = e.target.checked; setConfig({...config, chats: c}); }} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Cảnh báo hệ thống</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input aria-label="Tùy chọn" type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" checked={chat.receiveManualReports} onChange={(e) => { const c = [...config.chats]; c[index].receiveManualReports = e.target.checked; setConfig({...config, chats: c}); }} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Báo cáo thủ công</span>
                    </label>
                 </div>
              </div>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-2xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-2">Báo cáo Hàng ngày (Digest)</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
               <input aria-label="Tùy chọn" type="checkbox" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" 
                  checked={config.digestSchedule.enabled} 
                  onChange={e => setConfig({...config, digestSchedule: {...config.digestSchedule, enabled: e.target.checked}})} 
               />
               <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Bật gửi báo cáo tự động lúc 08:00 AM</span>
            </label>
            <div className="space-y-1.5 opacity-50 pointer-events-none pt-2">
               <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Cron Expression (Mặc định: 0 8 * * *)</label>
               <input aria-label="Nhập thông tin" 
                  type="text"
                  value={config.digestSchedule.cronExpression} 
                  readOnly
                  className="w-full border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono bg-slate-50 text-slate-500 outline-none" 
               />
            </div>
         </div>
         
         <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-2xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-2">Ngưỡng cảnh báo (Alerts)</h3>
            <div className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-slate-200">
               <span className="text-sm font-medium text-slate-700">DLQ Hàng giờ {'>='}</span>
               <div className="flex items-center gap-2">
                  <input aria-label="Nhập thông tin" type="number" className="w-20 text-right border border-slate-200 rounded px-2 h-7 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tabular-nums" 
                     value={config.alertThresholds.dlqHigh} 
                     onChange={e => setConfig({...config, alertThresholds: {...config.alertThresholds, dlqHigh: parseInt(e.target.value, 10)}})} 
                  />
                  <span className="text-xs text-slate-500 font-medium w-8">tin</span>
               </div>
            </div>
            <div className="flex justify-between items-center bg-white p-2 px-3 rounded-lg border border-slate-200">
               <span className="text-sm font-medium text-slate-700">HĐ Sắp hết hạn {'<='}</span>
               <div className="flex items-center gap-2">
                  <input aria-label="Nhập thông tin" type="number" className="w-20 text-right border border-slate-200 rounded px-2 h-7 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tabular-nums" 
                     value={config.alertThresholds.contractsExpiring} 
                     onChange={e => setConfig({...config, alertThresholds: {...config.alertThresholds, contractsExpiring: parseInt(e.target.value, 10)}})} 
                  />
                  <span className="text-xs text-slate-500 font-medium w-8">ngày</span>
               </div>
            </div>
         </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 border-t border-slate-200 bg-white/95 backdrop-blur flex justify-end gap-3 z-10">
        <Button 
           variant="primary"
           aria-label="Lưu cấu hình" 
           onClick={() => handleSave()} 
           disabled={loading} 
           className="bg-blue-600 text-white font-medium h-8 px-4 border-0 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 text-sm"
        >
          <Save size={14} />
          {loading ? 'Đang lưu...' : 'Lưu cấu hình Telegram'}
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl relative -z-0">
         <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Hướng dẫn setup Telegram Bot
         </h3>
         <ol className="list-decimal pl-5 space-y-2 text-sm text-blue-800/90 leading-relaxed">
            <li>Mở Telegram, tìm kiếm <b className="text-blue-900 font-semibold">@BotFather</b> và gửi lệnh <code className="bg-blue-100 text-blue-900 px-1 py-0.5 rounded">/newbot</code>.</li>
            <li>Làm theo hướng dẫn để tạo bot và lấy <b className="text-blue-900 font-semibold">HTTP API Token</b>.</li>
            <li>Dán Token vào ô bên trên và click <b className="text-blue-900 font-semibold">Test Connection</b>.</li>
            <li>Tạo một group Telegram (hoặc chọn 1 group có sẵn), thêm bot vừa tạo vào group.</li>
            <li>Đồng thời gửi một tin nhắn bất kỳ (VD: "Hello") vào group đó. Tìm lấy <b className="text-blue-900 font-semibold">Chat ID</b> (Có thể forward tin nhắn vào @RawDataBot để lấy group ID, thường bắt đầu bằng dấu trừ <code>-100...</code>).</li>
            <li>Thêm Chat ID vào danh sách cấu hình, chọn loại tin muốn nhận.</li>
            <li>Lưu cấu hình và click icon Send (Gửi Test) để kiểm tra kết nối tới group.</li>
         </ol>
      </div>
    </div>
  );
}
