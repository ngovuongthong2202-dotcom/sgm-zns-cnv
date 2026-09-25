import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Layers, 
  FileSpreadsheet, 
  Package, 
  Server
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { settingsRepo } from '@/src/data/repositories';
import { notify } from '@/src/shared/utils/notify';

export interface ErpApiConfig {
  baseUrl: string;
  itemsUrl: string;
  exportSaleUrl: string;
  quotationUrl: string;
  timeoutSeconds: number;
  apiKey?: string;
  updatedAt?: string;
}

const DEFAULT_CONFIG: ErpApiConfig = {
  baseUrl: 'https://sgm.vnaisoft.com',
  itemsUrl: 'https://sgm.vnaisoft.com/api/public/items',
  exportSaleUrl: 'https://sgm.vnaisoft.com/api/public/export-sale',
  quotationUrl: 'https://sgm.vnaisoft.com/api/public/bao-gia',
  timeoutSeconds: 20,
  apiKey: '',
};

export default function IntegrationsPage() {
  const [config, setConfig] = useState<ErpApiConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      try {
        const doc = await settingsRepo.getSettings<ErpApiConfig>('erp_config');
        if (mounted && doc) {
          setConfig({
            baseUrl: doc.baseUrl || DEFAULT_CONFIG.baseUrl,
            itemsUrl: doc.itemsUrl || DEFAULT_CONFIG.itemsUrl,
            exportSaleUrl: doc.exportSaleUrl || DEFAULT_CONFIG.exportSaleUrl,
            quotationUrl: doc.quotationUrl || DEFAULT_CONFIG.quotationUrl,
            timeoutSeconds: Number(doc.timeoutSeconds) || DEFAULT_CONFIG.timeoutSeconds,
            apiKey: doc.apiKey || '',
            updatedAt: doc.updatedAt,
          });
        }
      } catch (err) {
        console.error('Failed to load erp_config:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadSettings();

    const unsub = settingsRepo.subscribeSettings<ErpApiConfig>('erp_config', (doc) => {
      if (mounted && doc) {
        setConfig(prev => ({ ...prev, ...doc }));
      }
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSaving(true);
      const payload: ErpApiConfig = {
        ...config,
        baseUrl: config.baseUrl.trim(),
        itemsUrl: config.itemsUrl.trim(),
        exportSaleUrl: config.exportSaleUrl.trim(),
        quotationUrl: config.quotationUrl.trim(),
        timeoutSeconds: Number(config.timeoutSeconds) || 20,
        apiKey: config.apiKey?.trim() || '',
        updatedAt: new Date().toISOString(),
      };

      await settingsRepo.setSettings('erp_config', payload, true);
      setConfig(payload);
      notify.success('Đã lưu cấu hình kết nối API & ERP thành công');
    } catch (err: any) {
      console.error(err);
      notify.error('Không thể lưu cấu hình API: ' + (err.message || 'Lỗi không xác định'));
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Khôi phục toàn bộ các đường link API về mặc định của hệ thống SGM?')) {
      setConfig({
        ...DEFAULT_CONFIG,
        updatedAt: new Date().toISOString(),
      });
      notify.info('Đã hoàn tác về liên kết API mặc định');
    }
  };

  const testEndpoint = async (key: string, url: string) => {
    if (!url) return;
    setTestingKey(key);
    setTestResults(prev => ({ ...prev, [key]: { success: false, message: 'Đang kiểm tra kết nối...' } }));
    
    const startTime = Date.now();
    try {
      // Use internal proxy if items or export-sale
      let targetUrl = url;
      if (key === 'items') {
        targetUrl = '/api/items?q=test';
      } else if (key === 'quotation') {
        targetUrl = '/api/quotation/erp-lookup/test';
      }

      const res = await fetch(targetUrl, { method: 'GET', signal: AbortSignal.timeout(10000) });
      const elapsed = Date.now() - startTime;

      if (res.ok || res.status === 404) {
        // 404 is also a valid ping that the endpoint server is responding
        setTestResults(prev => ({
          ...prev,
          [key]: { success: true, message: `Kết nối phản hồi tốt (${elapsed}ms, HTTP ${res.status})` }
        }));
        notify.success(`Kiểm tra API [${key}] thành công (${elapsed}ms)`);
      } else {
        setTestResults(prev => ({
          ...prev,
          [key]: { success: false, message: `Máy chủ trả về mã HTTP ${res.status} (${elapsed}ms)` }
        }));
        notify.warning(`API phản hồi mã ${res.status}`);
      }
    } catch (err: any) {
      const elapsed = Date.now() - startTime;
      setTestResults(prev => ({
        ...prev,
        [key]: { success: false, message: `Lỗi kết nối: ${err.message || 'Không thể liên lạc máy chủ'}` }
      }));
      notify.error(`Kiểm tra API thất bại: ${err.message || 'Timeout'}`);
    } finally {
      setTestingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-500 gap-3">
        <RefreshCw className="animate-spin text-blue-600" size={20} />
        <span>Đang nạp cấu hình tích hợp API...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Intro Box */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold">
              <Globe size={13} className="text-cyan-400" />
              <span>Cổng Dữ Liệu Ngoại Vi (ERP / CRM API)</span>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Cấu hình liên kết API Máy Chủ SGM</h3>
            <p className="text-xs text-blue-200/90 max-w-2xl leading-relaxed">
              Quản lý và cập nhật tập trung các đường dẫn API kết nối hệ thống ERP phục vụ việc tra cứu mã vật tư, phiếu xuất bán hàng và chi tiết báo giá.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetDefaults}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
            >
              <RotateCcw size={14} className="mr-1.5" />
              Khôi phục mặc định
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={saving}
              className="bg-blue-500 hover:bg-blue-600 text-white shadow-md shadow-blue-900/30"
            >
              {saving ? <RefreshCw size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
              Lưu cấu hình
            </Button>
          </div>
        </div>
      </div>

      {/* Main Endpoints Section */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs divide-y divide-slate-100">
        <div className="p-5 bg-slate-50/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Server size={18} className="text-blue-600" />
            <h4 className="text-sm font-bold text-slate-900">Danh Sách Endpoint Tích Hợp Hệ Thống</h4>
          </div>
          <span className="text-2xs text-slate-500 font-mono">
            {config.updatedAt ? `Cập nhật lần cuối: ${new Date(config.updatedAt).toLocaleString('vi-VN')}` : 'Chưa tùy chỉnh'}
          </span>
        </div>

        {/* 1. Tra cứu hàng hóa / vật tư */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package size={16} className="text-amber-500" />
              <label className="text-xs font-bold text-slate-800">
                1. API Tra cứu danh mục hàng hóa / vật tư (Items ERP)
              </label>
              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase">
                GET
              </span>
            </div>
            <button
              type="button"
              onClick={() => testEndpoint('items', config.itemsUrl)}
              disabled={testingKey === 'items'}
              className="text-2xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {testingKey === 'items' ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />}
              Kiểm tra kết nối
            </button>
          </div>
          <p className="text-2xs text-slate-500">
            Endpoint cung cấp cơ sở dữ liệu hàng chục nghìn danh mục vật tư, đơn vị tính và mã hàng đồng bộ tự động vào form.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={config.itemsUrl}
              onChange={(e) => setConfig({ ...config, itemsUrl: e.target.value })}
              placeholder="https://sgm.vnaisoft.com/api/public/items"
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
            />
          </div>
          {testResults['items'] && (
            <div className={`text-2xs px-3 py-1.5 rounded-md flex items-center gap-2 ${
              testResults['items'].success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResults['items'].success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{testResults['items'].message}</span>
            </div>
          )}
        </div>

        {/* 2. Tra cứu phiếu xuất bán hàng */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-emerald-500" />
              <label className="text-xs font-bold text-slate-800">
                2. API Tra cứu phiếu xuất kho bán hàng (Export Sale ERP)
              </label>
              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                GET
              </span>
            </div>
            <button
              type="button"
              onClick={() => testEndpoint('exportSale', config.exportSaleUrl)}
              disabled={testingKey === 'exportSale'}
              className="text-2xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {testingKey === 'exportSale' ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />}
              Kiểm tra kết nối
            </button>
          </div>
          <p className="text-2xs text-slate-500">
            Dùng trong phân hệ Lập Phiếu Giao Hàng để lấy thông tin từ Số Phiếu Xuất (ERP) như ngày tạo, thủ kho, ghi chú, đơn vị vận tải.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={config.exportSaleUrl}
              onChange={(e) => setConfig({ ...config, exportSaleUrl: e.target.value })}
              placeholder="https://sgm.vnaisoft.com/api/public/export-sale"
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
            />
          </div>
          {testResults['exportSale'] && (
            <div className={`text-2xs px-3 py-1.5 rounded-md flex items-center gap-2 ${
              testResults['exportSale'].success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResults['exportSale'].success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{testResults['exportSale'].message}</span>
            </div>
          )}
        </div>

        {/* 3. Tra cứu báo giá ERP */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-500" />
              <label className="text-xs font-bold text-slate-800">
                3. API Tra cứu chi tiết Báo giá ERP (Quotation ERP)
              </label>
              <span className="px-1.5 py-0.5 rounded text-3xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                GET
              </span>
            </div>
            <button
              type="button"
              onClick={() => testEndpoint('quotation', config.quotationUrl)}
              disabled={testingKey === 'quotation'}
              className="text-2xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              {testingKey === 'quotation' ? <RefreshCw size={12} className="animate-spin" /> : <ExternalLink size={12} />}
              Kiểm tra kết nối
            </button>
          </div>
          <p className="text-2xs text-slate-500">
            Dùng để tra cứu dữ liệu gốc của báo giá từ số hiệu (ERP lookup) khi đồng bộ vào hệ thống quản lý giao hàng và hợp đồng.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="url"
              value={config.quotationUrl}
              onChange={(e) => setConfig({ ...config, quotationUrl: e.target.value })}
              placeholder="https://sgm.vnaisoft.com/api/public/bao-gia"
              className="w-full text-xs font-mono px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-slate-50/50"
            />
          </div>
          {testResults['quotation'] && (
            <div className={`text-2xs px-3 py-1.5 rounded-md flex items-center gap-2 ${
              testResults['quotation'].success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {testResults['quotation'].success ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              <span>{testResults['quotation'].message}</span>
            </div>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          Tham số kết nối máy chủ ngoại vi
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Base URL máy chủ ERP
            </label>
            <input
              type="url"
              value={config.baseUrl}
              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
              placeholder="https://sgm.vnaisoft.com"
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 font-mono"
            />
          </div>

          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Thời gian chờ phản hồi tối đa (Timeout giây)
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={config.timeoutSeconds}
              onChange={(e) => setConfig({ ...config, timeoutSeconds: Number(e.target.value) || 20 })}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Mã xác thực API / Bearer Token (Tùy chọn)
            </label>
            <input
              type="password"
              value={config.apiKey || ''}
              onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
              placeholder="Nhập API Token nếu máy chủ ERP yêu cầu xác thực..."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50/50 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={handleResetDefaults}
        >
          <RotateCcw size={14} className="mr-1.5" />
          Khôi phục mặc định
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving ? <RefreshCw size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
          Lưu cấu hình API ERP
        </Button>
      </div>
    </form>
  );
}
