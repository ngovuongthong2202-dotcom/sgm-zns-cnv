import React, { useState } from 'react';
import { ZnsTemplate } from '@/src/domain/schema/zns-template.schema';
import { Button } from '@/src/design-system/Button';
import { Send, X } from 'lucide-react';
import { notify } from '@/src/shared/utils/notify';

interface Props {
  template: ZnsTemplate;
  isOpen: boolean;
  onClose: () => void;
  mockDataMap: Record<string, string>;
}

export function TestSendModal({ template, isOpen, onClose, mockDataMap }: Props) {
  const [phone, setPhone] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!phone) {
      notify.error('Vui lòng nhập số điện thoại');
      return;
    }
    setIsSending(true);
    const toastId = notify.loading(`Đang gửi test đến ${phone}...`);
    try {
      // Gọi API gửi ZNS với mockDataMap
      const res = await fetch('/api/zns/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: template.templateKey,
          phone,
          mockData: mockDataMap,
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      
      notify.dismiss(toastId);
      notify.success('Gửi test ZNS thành công. Vui lòng kiểm tra Zalo.');
      onClose();
    } catch (err: unknown) {
      notify.dismiss(toastId);
      notify.error('Lỗi khi gửi test: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
       <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
          <div className="flex justify-between items-center mb-4">
             <h2 className="text-lg font-bold text-slate-800">Gửi Thử ZNS</h2>
             <Button aria-label="Đóng" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                <X size={20} />
             </Button>
          </div>

          <div className="space-y-4 mb-6">
             <p className="text-sm text-slate-600">
                Bạn đang gửi mẫu <strong>{template.label}</strong> với dữ liệu giả lập.
             </p>
             <div>
                <label htmlFor="phoneInput" className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại Zalo nhận tin</label>
                <input 
                  id="phoneInput"
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-primary"
                  placeholder="Ví dụ: 0912345678"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
             </div>
          </div>

          <div className="flex justify-end gap-3">
             <Button variant="secondary" onClick={onClose}>Hủy</Button>
             <Button onClick={handleSend} isLoading={isSending} leftIcon={<Send size={16} />}>Gửi Ngay</Button>
          </div>
       </div>
    </div>
  );
}
