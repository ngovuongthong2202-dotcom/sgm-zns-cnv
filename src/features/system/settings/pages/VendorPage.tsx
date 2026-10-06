import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { Save, ShieldAlert, Check, Copy, Zap, Globe, Key, RefreshCw, HelpCircle, Send } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { Button } from '@/src/design-system/Button';
import { settingsRepo } from '@/src/data/repositories';

export default function VendorPage() {
  const [znsConfigDoc, setZnsConfigDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedZaloCallback, setCopiedZaloCallback] = useState(false);
  const [testingCnv, setTestingCnv] = useState(false);
  const [testingZalo, setTestingZalo] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<'HYBRID' | 'ZALO_OFFICIAL' | 'CNV'>('HYBRID');

  const copiedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cnvWebhookUrl = `${window.location.origin.replace('ais-dev', 'ais-pre')}/api/zns/vendor-webhook/zns-result`;
  const zaloCallbackUrl = `${window.location.origin.replace('ais-dev', 'ais-pre')}/api/zns/webhook/zalo-official`;

  useEffect(() => {
    let mounted = true;
    const unsub = settingsRepo.subscribeSettings<any>('zns_config', (data) => {
      if (mounted) {
        setZnsConfigDoc(data || {});
        if (data?.znsProvider) {
          setSelectedProvider(data.znsProvider);
        }
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleCopy = (text: string, type: 'cnv' | 'zalo') => {
    navigator.clipboard.writeText(text);
    if (type === 'cnv') setCopiedWebhook(true);
    if (type === 'zalo') setCopiedZaloCallback(true);

    if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    copiedTimeoutRef.current = setTimeout(() => {
      setCopiedWebhook(false);
      setCopiedZaloCallback(false);
    }, 2000);
    notify.info('Đã sao chép URL vào clipboard!');
  };

  React.useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
    };
  }, []);

  const handleTestCnvWebhook = async () => {
    setTestingCnv(true);
    try {
      const warmUpInput = document.getElementById('vendorUrl_CUSTOMER_PRE_QUOTE') as HTMLInputElement | null;
      const quoteInput = document.getElementById('vendorUrl_BAOGIA') as HTMLInputElement | null;
      const testUrl = warmUpInput?.value?.trim() || quoteInput?.value?.trim() || znsConfigDoc?.vendorUrl_CUSTOMER_PRE_QUOTE || znsConfigDoc?.vendorUrl_BAOGIA || '';

      const res = await fetch('/api/zns/test-webhook-dryrun', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testUrl })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Lỗi HTTP ${res.status}`);
      }
      notify.success(data?.message || 'Kết nối thành công tới Webhook CNV');
    } catch (err: any) { 
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTestingCnv(false);
    }
  };

  const handleTestZaloDirect = async () => {
    setTestingZalo(true);
    try {
      const appId = (document.getElementById('zaloAppId') as HTMLInputElement)?.value?.trim() || znsConfigDoc?.zaloAppId;
      const secretKey = (document.getElementById('zaloSecretKey') as HTMLInputElement)?.value?.trim() || znsConfigDoc?.zaloSecretKey;
      const oaId = (document.getElementById('zaloOaId') as HTMLInputElement)?.value?.trim() || znsConfigDoc?.zaloOaId;

      const res = await fetch('/api/zns/test-zalo-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId, secretKey, oaId })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Lỗi HTTP ${res.status}`);
      }
      notify.success(data?.message || 'Kết nối thành công tới Zalo Cloud OpenAPI!');
    } catch (err: any) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTestingZalo(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const formData = new FormData(e.currentTarget);
    
    const newConfig = {
      znsProvider: selectedProvider,
      zaloAppId: formData.get('zaloAppId')?.toString()?.trim() || '',
      zaloSecretKey: formData.get('zaloSecretKey')?.toString()?.trim() || '',
      zaloOaId: formData.get('zaloOaId')?.toString()?.trim() || '',
      zaloRefreshToken: formData.get('zaloRefreshToken')?.toString()?.trim() || '',
      zaloAccessToken: formData.get('zaloAccessToken')?.toString()?.trim() || '',

      vendorUrl_CUSTOMER_PRE_QUOTE: formData.get('vendorUrl_CUSTOMER_PRE_QUOTE')?.toString()?.trim() || '',
      vendorUrl_BAOGIA: formData.get('vendorUrl_BAOGIA')?.toString()?.trim() || '',
      vendorUrl_HOPDONG_SIGN_ZNS: formData.get('vendorUrl_HOPDONG_SIGN_ZNS')?.toString()?.trim() || '',
      vendorUrl_THANH_TOAN_TAT_TOAN: formData.get('vendorUrl_THANH_TOAN_TAT_TOAN')?.toString()?.trim() || '',
      vendorUrl_THANH_TOAN_CONG_NO: formData.get('vendorUrl_THANH_TOAN_CONG_NO')?.toString()?.trim() || '',
      vendorUrl_GIAOHANG_ZNS: formData.get('vendorUrl_GIAOHANG_ZNS')?.toString()?.trim() || '',
      vendorUrl_GIAOHANG_HOANTAT: formData.get('vendorUrl_GIAOHANG_HOANTAT')?.toString()?.trim() || '',
      vendorWebhookSecret: formData.get('vendorWebhookSecret')?.toString()?.trim() || '',
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
        updatedBy: user?.uid || 'admin'
      });
      notify.success('Đã lưu cấu hình kênh gửi ZNS thành công');
    } catch (err: any) { 
      notify.error('Lỗi lưu cấu hình: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-slate-600 font-mono text-sm animate-pulse">Đang tải cấu hình ZNS...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-1">Cấu hình ZNS Gateway & Nhà cung cấp</h2>
        <p className="text-sm text-slate-500">
          Linh hoạt chuyển đổi giữa gửi trực tiếp qua <strong>Zalo Cloud OpenAPI</strong> (trừ số dư OA SGM) hoặc qua <strong>Webhook CNV</strong>.
        </p>
      </div>

      {/* Mode Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div 
          onClick={() => setSelectedProvider('HYBRID')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedProvider === 'HYBRID' 
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={18} className="text-blue-600" />
            <h4 className="font-semibold text-sm text-slate-900">Đa Kênh (Hybrid - Khuyên dùng)</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ưu tiên gửi trực tiếp Zalo OpenAPI (nhanh & rõ mã lỗi). Tự động Fallback sang Webhook CNV nếu gặp sự cố.
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 text-3xs font-semibold rounded bg-blue-100 text-blue-700">Tối ưu nhất</span>
        </div>

        <div 
          onClick={() => setSelectedProvider('ZALO_OFFICIAL')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedProvider === 'ZALO_OFFICIAL' 
              ? 'border-emerald-600 bg-emerald-50/50 shadow-sm ring-1 ring-emerald-600' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Globe size={18} className="text-emerald-600" />
            <h4 className="font-semibold text-sm text-slate-900">Zalo OpenAPI Trực Tiếp</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Bỏ qua CNV. Gửi thẳng tới Zalo Business API, trừ trực tiếp số dư tài khoản OA SGM (1.132.835 đ).
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 text-3xs font-semibold rounded bg-emerald-100 text-emerald-700">Trực tiếp 100%</span>
        </div>

        <div 
          onClick={() => setSelectedProvider('CNV')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            selectedProvider === 'CNV' 
              ? 'border-amber-600 bg-amber-50/50 shadow-sm ring-1 ring-amber-600' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Send size={18} className="text-amber-600" />
            <h4 className="font-semibold text-sm text-slate-900">Webhook Trung Gian CNV</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Chế độ cũ: Đẩy payload qua webhook trung gian CNV CDP / Make và chờ tín hiệu callback trả về.
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 text-3xs font-semibold rounded bg-amber-100 text-amber-700">Tương thích cũ</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="p-6 space-y-8 pb-24">
          
          {/* Section 1: Cấu hình Zalo OpenAPI Trực Tiếp */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-emerald-600" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Cấu hình Zalo Cloud OpenAPI Trực Tiếp (ZBS OA)
                </h3>
              </div>
              <Button 
                aria-label="Kiểm tra kết nối Zalo" 
                type="button" 
                onClick={handleTestZaloDirect} 
                disabled={testingZalo} 
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                variant="ghost"
              >
                {testingZalo ? 'Đang kiểm tra kết nối...' : '⚡ Kiểm tra kết nối Zalo OpenAPI'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="zaloAppId" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">
                  Zalo App ID
                </label>
                <input 
                  id="zaloAppId" 
                  name="zaloAppId" 
                  type="text" 
                  defaultValue={znsConfigDoc?.zaloAppId || ''} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="VD: 31828392019283..." 
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="zaloSecretKey" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">
                  Zalo App Secret Key
                </label>
                <input 
                  id="zaloSecretKey" 
                  name="zaloSecretKey" 
                  type="password" 
                  defaultValue={znsConfigDoc?.zaloSecretKey || ''} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="Khóa bí mật ứng dụng Zalo" 
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="zaloOaId" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">
                  Zalo Official Account ID (OA ID)
                </label>
                <input 
                  id="zaloOaId" 
                  name="zaloOaId" 
                  type="text" 
                  defaultValue={znsConfigDoc?.zaloOaId || ''} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="VD: 4423859201..." 
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="zaloRefreshToken" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">
                  Refresh Token (Hiệu lực 90 ngày)
                </label>
                <input 
                  id="zaloRefreshToken" 
                  name="zaloRefreshToken" 
                  type="password" 
                  defaultValue={znsConfigDoc?.zaloRefreshToken || ''} 
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="Mã Refresh Token để hệ thống tự cấp mới Access Token" 
                />
              </div>
            </div>

            {/* Token Expiry Status */}
            {znsConfigDoc?.zaloTokenExpiresAt && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  Access Token đang hoạt động. Hạn tự động làm mới: <strong>{new Date(znsConfigDoc.zaloTokenExpiresAt).toLocaleString('vi-VN')}</strong>
                </span>
                <span className="text-3xs bg-emerald-200 px-2 py-0.5 rounded font-mono">Tự động gia hạn PKCE</span>
              </div>
            )}

            {/* Zalo Callback Webhook URL */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">URL Nhận Báo Cáo Phát Tin Từ Zalo (Webhook Callback)</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono text-emerald-700 break-all flex-1">{zaloCallbackUrl}</code>
                <Button 
                  type="button"
                  aria-label="Sao chép URL Zalo Callback"
                  onClick={() => handleCopy(zaloCallbackUrl, 'zalo')}
                  className="p-1 hover:bg-white text-slate-400 hover:text-emerald-600 rounded border border-transparent hover:border-slate-200 transition-colors"
                  variant="secondary"
                >
                  {copiedZaloCallback ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>
          </div>

          {/* Section 2: Ánh xạ giao thức Webhook CNV */}
          <div className="space-y-4 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Send size={16} className="text-blue-600" />
                <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  Ánh xạ Webhook CNV / Make (Chế độ Trung Gian & Fallback)
                </h3>
              </div>
              <Button 
                aria-label="Test Webhook CNV" 
                type="button" 
                onClick={handleTestCnvWebhook} 
                disabled={testingCnv} 
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline" 
                variant="ghost"
              >
                {testingCnv ? 'Đang ping CNV...' : 'Ping Thử Nghiệm Webhook CNV'}
              </Button>
            </div>

            {/* CNV System Endpoint */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <span className="text-2xs font-medium text-slate-500 uppercase tracking-wide">CNV Webhook URL (Hệ thống tiếp nhận kết quả)</span>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono text-blue-600 break-all flex-1">{cnvWebhookUrl}</code>
                <Button 
                  type="button"
                  aria-label="Sao chép Webhook URL"
                  onClick={() => handleCopy(cnvWebhookUrl, 'cnv')}
                  className="p-1 hover:bg-white text-slate-400 hover:text-blue-600 rounded border border-transparent hover:border-slate-200 transition-colors"
                  variant="secondary"
                >
                  {copiedWebhook ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
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
                  <input 
                    id={item.key} 
                    name={item.key} 
                    type="url" 
                    defaultValue={znsConfigDoc?.[item.key] || ''} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-shadow" 
                    placeholder="https://your-cnv-webhook-handler.com/path" 
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* Section 3: Xác thực & Thử lại */}
          <div className="space-y-6 pt-6 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Bảo mật & Tùy chọn gửi</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5 col-span-2">
                <label htmlFor="vendorWebhookSecret" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Handshake Secret (Xác thực Webhook)</label>
                <input 
                  id="vendorWebhookSecret" 
                  name="vendorWebhookSecret" 
                  type="password"
                  defaultValue={znsConfigDoc?.vendorWebhookSecret || ''}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="maxRetries" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Số lần thử lại tối đa</label>
                <input id="maxRetries" name="maxRetries" type="number" defaultValue={znsConfigDoc?.maxRetries || 3} className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm outline-none tabular-nums" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="retryBackoffMs" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Khoảng cách thử lại (ms)</label>
                <input id="retryBackoffMs" name="retryBackoffMs" type="number" defaultValue={znsConfigDoc?.retryBackoffMs || 5000} className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm outline-none tabular-nums" />
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
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white/95 backdrop-blur flex justify-between items-center rounded-b-xl z-10">
          <div className="text-xs text-slate-500">
            Chế độ đang chọn: <strong className="text-blue-600 font-semibold">{selectedProvider}</strong>
          </div>
          <Button 
            aria-label="Lưu cấu hình" 
            type="submit" 
            disabled={saving} 
            className="bg-blue-600 text-white font-medium h-9 px-5 border-0 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm text-sm"
          >
            <Save size={15} className={saving ? 'animate-pulse' : ''} />
            {saving ? 'Đang lưu cấu hình...' : 'Lưu toàn bộ cấu hình'}
          </Button>
        </div>
      </form>
    </div>
  );
}
