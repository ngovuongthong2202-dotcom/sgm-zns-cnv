import React, { useState } from 'react';
import { CodeSquare } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';

interface Props {
  onClose: () => void;
  sandboxPayload: string;
  setSandboxPayload: (val: string) => void;
}

export default function ZnsHubSandboxModal({
  onClose,
  sandboxPayload,
  setSandboxPayload
}: Props) {
  const [submitting, setSubmitting] = useState(false);

  const handleFireSandbox = async () => {
    setSubmitting(true);
    try {
      const parsed = JSON.parse(sandboxPayload);
      const res = await fetch('/api/zns/vendor-webhook/zns-result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (res.ok) {
        notify.success('Phản hồi từ Server: OK (Gửi sandbox thành công)');
        onClose();
      } else {
        notify.error('Server từ chối payload cấu hình Sandbox');
      }
    } catch (e) {
      notify.error('Cú pháp JSON không hợp lệ, vui lòng kiểm tra lại');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden flex flex-col border border-slate-200 animate-in fade-in duration-150 zoom-in-95">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 font-sans">
            <CodeSquare className="text-slate-500" size={16} /> Webhook Local Simulator Sandbox
          </h3>
          <Button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 cursor-pointer flex items-center justify-center"
            title="Đóng sandbox"
            aria-label="Đóng"
           variant="ghost">
            &times;
          </Button>
        </div>
        <div className="p-5 overflow-y-auto">
          <p className="text-sm text-slate-600 mb-4 font-sans leading-relaxed">
            Gửi một request giả lập (POST) trực tiếp đến endpoint <code className="bg-slate-100 text-slate-800 font-mono px-1 rounded border border-slate-200 text-xs">/api/zns/vendor-webhook/zns-result</code> để rà soát hành vi tích hợp đối tác.
          </p>
          <div className="space-y-1">
            <label className="text-2xs font-medium text-slate-500 uppercase tracking-wide">RAW JSON PAYLOAD</label>
            <textarea
              aria-label="Cấu trúc raw JSON payload"
              value={sandboxPayload}
              onChange={e => setSandboxPayload(e.target.value)}
              placeholder='{"event_name": "...", "target": "..."}'
              className="w-full h-44 bg-slate-50 text-slate-800 font-mono text-2xs p-3 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 border border-slate-200"
            />
          </div>
        </div>
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-2 shrink-0">
          <Button
            aria-label="Huỷ bỏ Sandbox"
            onClick={onClose}
            className="px-4 h-8 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium"
          >
            Huỷ bỏ
          </Button>
          <Button
            aria-label="Kích hoạt Sandbox"
            onClick={handleFireSandbox}
            disabled={submitting}
            className="px-4 h-8 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium border-0"
          >
            {submitting ? 'Đang gửi...' : 'Bắn tín hiệu (Inject API)'}
          </Button>
        </div>
      </div>
    </div>
  );
}
