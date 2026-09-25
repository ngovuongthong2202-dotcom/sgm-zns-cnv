import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';

import { Save, ShieldAlert, Check, Copy } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';

import { Button } from '@/src/design-system/Button';
import { settingsRepo } from '@/src/data/repositories';

export default function VendorPage() {
  const [znsConfigDoc, setZnsConfigDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const copiedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const webhookUrl = `${window.location.origin.replace('ais-dev', 'ais-pre')}/api/zns/vendor-webhook/zns-result`;

  useEffect(() => {
    let mounted = true;
    const unsub = settingsRepo.subscribeSettings<any>('zns_config', (data) => {
      if (mounted) {
        setZnsConfigDoc(data || {});
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, 2000);
    notify.info('Đã copy!');
  };

  React.useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleTestWebhook = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/zns/test-webhook-dryrun', { method: 'POST' });
      if(!res.ok) throw new Error('Test webhook thất bại');
      notify.success('Ping webhook thành công');
    } catch (err: any) { 
      notify.error('Lỗi khi test webhook: ' + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const newConfig = {
      vendorUrl_CUSTOMER_PRE_QUOTE: formData.get('vendorUrl_CUSTOMER_PRE_QUOTE')?.toString() || '',
      vendorUrl_BAOGIA: formData.get('vendorUrl_BAOGIA')?.toString() || '',
      vendorUrl_HOPDONG_SIGN_ZNS: formData.get('vendorUrl_HOPDONG_SIGN_ZNS')?.toString() || '',
      vendorUrl_THANH_TOAN_TAT_TOAN: formData.get('vendorUrl_THANH_TOAN_TAT_TOAN')?.toString() || '',
      vendorUrl_THANH_TOAN_CONG_NO: formData.get('vendorUrl_THANH_TOAN_CONG_NO')?.toString() || '',
      vendorUrl_GIAOHANG_ZNS: formData.get('vendorUrl_GIAOHANG_ZNS')?.toString() || '',
      vendorUrl_GIAOHANG_HOANTAT: formData.get('vendorUrl_GIAOHANG_HOANTAT')?.toString() || '',
      vendorWebhookSecret: formData.get('vendorWebhookSecret')?.toString() || '',
      maxRetries: parseInt(formData.get('maxRetries')?.toString() || '3', 10),
      retryBackoffMs: parseInt(formData.get('retryBackoffMs')?.toString() || '5000', 10),
      requireSecret: formData.get('requireSecret') === 'on',
      isAsyncVendor: formData.get('isAsyncVendor') === 'on',
      templateStrictMode: formData.get('templateStrictMode') === 'on',
    };

    try {
      await settingsRepo.setSettings('zns_config', {
        ...newConfig,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.uid || 'any'
      });
      notify.success('Đã lưu cấu hình ZNS');
    } catch (err: any) { 
      notify.error('Lỗi lưu cấu hình: ' + (err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-600 font-mono text-sm animate-pulse">Đang tải...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Vendor & Webhook</h2>
        <p className="text-sm text-slate-500">
          Cấu hình đường dẫn kết nối với nhà cung cấp dịch vụ ZNS (OA/Make/CNV).
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
           <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Webhook URL (System Endpoint)</span>
           <p className="text-xs text-slate-500 mb-2 mt-1">Sử dụng URL này để nhận tín hiệu kết quả gửi tin từ vendor.</p>
           <div className="flex items-center gap-2 bg-slate-50 px-3 h-9 rounded-lg border border-slate-200 group">
              <code className="text-xs font-mono text-blue-600 break-all flex-1">{webhookUrl}</code>
              <Button 
                type="button"
                aria-label="Sao chép Webhook URL"
                onClick={handleCopy}
                className="p-1.5 hover:bg-white text-slate-400 hover:text-blue-600 rounded-md border border-transparent hover:border-slate-200 transition-colors"
                title="Sao chép"
               variant="secondary">
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </Button>
           </div>
        </div>
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <ShieldAlert size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 leading-relaxed">
              <span className="font-medium">Bảo mật:</span> Đảm bảo payload từ vendor trả về khớp với Secret được cấu hình bên dưới nếu chế độ Strict Mode được bật.
            </p>
        </div>
        <div>
           <Button aria-label="Test Webhook" type="button" onClick={handleTestWebhook} disabled={testing} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline underline-offset-4 focus:outline-none" variant="ghost">
              {testing ? 'Đang test...' : 'Test Webhook (Ping Outbound DryRun)'}
           </Button>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="p-6 space-y-8 pb-24">
           {/* Form content copied/adapted from old SettingsPage */}
           <div className="space-y-6">
              <h3 className="text-2xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-2">Ánh xạ giao thức</h3>
              {[
                  { key: 'vendorUrl_CUSTOMER_PRE_QUOTE', label: '1. GIAI ĐOẠN TRƯỚC BÁO GIÁ (Warm-up)' },
                  { key: 'vendorUrl_BAOGIA', label: '2. PHÁT HÀNH BÁO GIÁ (Quotation)' },
                  { key: 'vendorUrl_HOPDONG_SIGN_ZNS', label: '3. KÝ KẾT HỢP ĐỒNG (Contracting)' },
                  { key: 'vendorUrl_THANH_TOAN_TAT_TOAN', label: '4. THANH TOÁN (TẤT TOÁN)' },
                  { key: 'vendorUrl_THANH_TOAN_CONG_NO', label: '5. THANH TOÁN (CÔNG NỢ)' },
                  { key: 'vendorUrl_GIAOHANG_ZNS', label: '6. CẬP NHẬT GIAO HÀNG (Delivery)' },
                  { key: 'vendorUrl_GIAOHANG_HOANTAT', label: '7. GIAO HÀNG (HOÀN TẤT)' },
              ].map((item) => (
                  <div key={item.key} className="space-y-1.5 focus-within:relative">
                    <label htmlFor={item.key} className="text-2xs font-medium text-slate-500 uppercase tracking-wide">{item.label}</label>
                    <input id={item.key} name={item.key} 
                      type="url" 
                      defaultValue={znsConfigDoc?.[item.key] || ''} 
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
                      placeholder="https://your-webhook-handler.com/path" 
                    />
                  </div>
              ))}
           </div>
           
           <div className="space-y-6 pt-6 border-t border-slate-200">
              <h3 className="text-2xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-200 pb-2">Xác thực & Thử lại</h3>
              <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5 col-span-2">
                    <label htmlFor="vendorWebhookSecret" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Handshake Secret</label>
                    <input id="vendorWebhookSecret" name="vendorWebhookSecret" 
                      type="password"
                      defaultValue={znsConfigDoc?.vendorWebhookSecret || ''}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="maxRetries" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Max Retries</label>
                    <input id="maxRetries" name="maxRetries" type="number" defaultValue={znsConfigDoc?.maxRetries || 3} className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm outline-none tabular-nums" />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="retryBackoffMs" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Interval (ms)</label>
                    <input id="retryBackoffMs" name="retryBackoffMs" type="number" defaultValue={znsConfigDoc?.retryBackoffMs || 5000} className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm outline-none tabular-nums" />
                  </div>
              </div>
           </div>

           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input aria-label="Tùy chọn" type="checkbox" name="templateStrictMode" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" defaultChecked={znsConfigDoc?.templateStrictMode === true} />
                 <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Strict Mode (Chặn gửi nếu thiếu biến Template)</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input aria-label="Tùy chọn" type="checkbox" name="requireSecret" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" defaultChecked={znsConfigDoc?.requireSecret !== false} />
                 <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Xác thực chéo Header (Bắt buộc khớp Secret)</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer group">
                 <input aria-label="Tùy chọn" type="checkbox" name="isAsyncVendor" className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" defaultChecked={znsConfigDoc?.isAsyncVendor !== false} />
                 <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Async Pulse Mode (Xử lý bất đồng bộ - Make/CNV)</span>
               </label>
           </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white/95 backdrop-blur flex justify-end gap-3 rounded-b-xl z-10">
           <Button aria-label="Lưu cấu hình" type="submit" disabled={saving} className="bg-blue-600 text-white font-medium h-8 px-4 border-0 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm">
              <Save size={14} className={saving ? 'animate-pulse' : ''} />
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
           </Button>
        </div>
      </form>
    </div>
  );
}
