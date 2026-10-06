import React, { useState, useEffect } from 'react';
import { notify } from '@/src/shared/utils/notify';
import { Save, ShieldAlert, Check, Copy, Zap, Globe, Key, RefreshCw, HelpCircle, Send } from 'lucide-react';
import { useAuth } from '@/src/modules/iam';
import { Button } from '@/src/design-system/Button';

export default function VendorPage() {
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  
  const [saving, setSaving] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedZaloCallback, setCopiedZaloCallback] = useState(false);
  const [testingCnv, setTestingCnv] = useState(false);
  const [testingZalo, setTestingZalo] = useState(false);

  // Controlled Form State (Zero Data Loss)
  const [formState, setFormState] = useState({
    znsProvider: 'HYBRID',
    zaloAppId: '',
    zaloSecretKey: '',
    zaloOaId: '',
    zaloRefreshToken: '',
    zaloAccessToken: '',
    zaloTokenExpiresAt: 0,

    vendorUrl_CUSTOMER_PRE_QUOTE: 'https://hub.cnvcdp.com/webhook/e2c1c68e-8075-424b-9bf0-c9061c51ce18-7409-678568754e04-a6dee0cb4',
    vendorUrl_BAOGIA: 'https://hub.cnvcdp.com/webhook/5bf3fd76-9e8f-4008-b825-c4639fd43116-73ff-88325a7b35ed-e30f03fad',
    vendorUrl_HOPDONG_SIGN_ZNS: 'https://hub.cnvcdp.com/webhook/70742289-f67f-4892-a3b9-b4eb28167d35-7bb9-b0be94c9a782-218e51587',
    vendorUrl_THANH_TOAN_TAT_TOAN: 'https://hub.cnvcdp.com/webhook/d7e6345c-d732-4104-92d8-0e1930a12b6f-7cb1-6118d544b450-fc775af3d',
    vendorUrl_THANH_TOAN_CONG_NO: 'https://hub.cnvcdp.com/webhook/d7e6345c-d732-4104-92d8-0e1930a12b6f-7cb1-6118d544b450-fc775af3d',
    vendorUrl_GIAOHANG_ZNS: 'https://hub.cnvcdp.com/webhook/f795ffef-5d21-425d-8af9-b2361116961f-7362-d99b4e61a2a4-c5074e61b',
    vendorUrl_GIAOHANG_HOANTAT: 'https://hub.cnvcdp.com/webhook/f795ffef-5d21-425d-8af9-b2361116961f-7362-d99b4e61a2a4-c5074e61b',
    vendorWebhookSecret: '',
    maxRetries: 3,
    retryBackoffMs: 5000,
    requireSecret: true,
    isAsyncVendor: true,
    templateStrictMode: true
  });

  const copiedTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const cnvWebhookUrl = `${window.location.origin.replace('ais-dev', 'ais-pre')}/api/zns/vendor-webhook/zns-result`;
  const zaloCallbackUrl = `${window.location.origin.replace('ais-dev', 'ais-pre')}/api/zns/webhook/zalo-official`;

  useEffect(() => {
    let mounted = true;
    const fetchConfig = async () => {
      try {
        const res = await fetch('/api/zns/config');
        const data = await res.json();
        if (mounted && data?.success && data?.config) {
          setFormState(prev => ({
            ...prev,
            ...data.config,
            znsProvider: data.config.znsProvider || prev.znsProvider
          }));
        }
      } catch (err) {
        console.error('[VendorPage] Lỗi đọc cấu hình ZNS từ Vault:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchConfig();
    return () => {
      mounted = false;
      if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
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

  const handleTestCnvWebhook = async () => {
    setTestingCnv(true);
    try {
      const testUrl = formState.vendorUrl_CUSTOMER_PRE_QUOTE || formState.vendorUrl_BAOGIA || '';

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
      const res = await fetch('/api/zns/test-zalo-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appId: formState.zaloAppId,
          secretKey: formState.zaloSecretKey,
          oaId: formState.zaloOaId,
          refreshToken: formState.zaloRefreshToken
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Lỗi HTTP ${res.status}`);
      }
      notify.success(data?.message || 'Kết nối thành công tới Zalo Cloud OpenAPI!');
      if (data?.tokenExpiresAt) {
        setFormState(prev => ({ ...prev, zaloTokenExpiresAt: data.tokenExpiresAt }));
      }
    } catch (err: any) {
      notify.error(err instanceof Error ? err.message : String(err));
    } finally {
      setTestingZalo(false);
    }
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/zns/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formState,
          updatedBy: user?.uid || 'admin'
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || `Lỗi HTTP ${res.status}`);
      }
      notify.success('Đã lưu cấu hình kênh gửi ZNS thành công vào Vault!');
    } catch (err: any) { 
      notify.error('Lỗi lưu cấu hình: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="p-8 text-slate-600 font-mono text-sm animate-pulse">Đang tải cấu hình ZNS từ Vault...</div>;

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
          onClick={() => updateField('znsProvider', 'HYBRID')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            formState.znsProvider === 'HYBRID' 
              ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <Zap size={18} className="text-blue-600" />
            <h4 className="font-semibold text-sm text-slate-900">Đa Kênh (Hybrid - Khuyên dùng)</h4>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Ưu tiên gửi trực tiếp Zalo OpenAPI (nhanh & rõ mã lỗi). Tự động Fallback sang Webhook CNV nếu gặp sự cố mạng.
          </p>
          <span className="inline-block mt-2 px-2 py-0.5 text-3xs font-semibold rounded bg-blue-100 text-blue-700">Tối ưu nhất</span>
        </div>

        <div 
          onClick={() => updateField('znsProvider', 'ZALO_OFFICIAL')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            formState.znsProvider === 'ZALO_OFFICIAL' 
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
          onClick={() => updateField('znsProvider', 'CNV')}
          className={`cursor-pointer rounded-xl border p-4 transition-all ${
            formState.znsProvider === 'CNV' 
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
                  value={formState.zaloAppId} 
                  onChange={e => updateField('zaloAppId', e.target.value)}
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
                  value={formState.zaloSecretKey} 
                  onChange={e => updateField('zaloSecretKey', e.target.value)}
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
                  value={formState.zaloOaId} 
                  onChange={e => updateField('zaloOaId', e.target.value)}
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
                  value={formState.zaloRefreshToken} 
                  onChange={e => updateField('zaloRefreshToken', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="Mã Refresh Token để hệ thống tự cấp mới Access Token" 
                />
              </div>
            </div>

            {/* Token Expiry Status */}
            {formState.zaloTokenExpiresAt > 0 && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between text-xs text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <Check size={14} className="text-emerald-600" />
                  Access Token đang hoạt động. Hạn tự động làm mới: <strong>{new Date(formState.zaloTokenExpiresAt).toLocaleString('vi-VN')}</strong>
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
                    value={(formState as any)[item.key] || ''} 
                    onChange={e => updateField(item.key, e.target.value)}
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
                  value={formState.vendorWebhookSecret}
                  onChange={e => updateField('vendorWebhookSecret', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="maxRetries" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Số lần thử lại tối đa</label>
                <input 
                  id="maxRetries" 
                  name="maxRetries" 
                  type="number" 
                  value={formState.maxRetries} 
                  onChange={e => updateField('maxRetries', parseInt(e.target.value || '0', 10))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm outline-none tabular-nums" 
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="retryBackoffMs" className="text-2xs font-medium text-slate-500 uppercase tracking-wide">Khoảng cách thử lại (ms)</label>
                <input 
                  id="retryBackoffMs" 
                  name="retryBackoffMs" 
                  type="number" 
                  value={formState.retryBackoffMs} 
                  onChange={e => updateField('retryBackoffMs', parseInt(e.target.value || '0', 10))}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 h-8 text-sm outline-none tabular-nums" 
                />
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  aria-label="Tùy chọn" 
                  type="checkbox" 
                  name="templateStrictMode" 
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" 
                  checked={formState.templateStrictMode} 
                  onChange={e => updateField('templateStrictMode', e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Strict Mode (Chặn gửi nếu thiếu biến Template)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  aria-label="Tùy chọn" 
                  type="checkbox" 
                  name="requireSecret" 
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" 
                  checked={formState.requireSecret} 
                  onChange={e => updateField('requireSecret', e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Xác thực chéo Header (Bắt buộc khớp Secret)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  aria-label="Tùy chọn" 
                  type="checkbox" 
                  name="isAsyncVendor" 
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 focus:ring-2" 
                  checked={formState.isAsyncVendor} 
                  onChange={e => updateField('isAsyncVendor', e.target.checked)}
                />
                <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">Async Pulse Mode (Xử lý bất đồng bộ - Make/CNV)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sticky Action Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white/95 backdrop-blur flex justify-between items-center rounded-b-xl z-10">
          <div className="text-xs text-slate-500">
            Chế độ đang chọn: <strong className="text-blue-600 font-semibold">{formState.znsProvider}</strong>
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
