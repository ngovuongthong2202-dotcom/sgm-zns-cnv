import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { Customer } from '@/src/domain/schema/customer.schema';

interface DedupeModalProps {
  show: boolean;
  onClose: () => void;
  duplicates: Customer[];
  pendingData: any;
  clearDraft: () => Promise<void>;
  onSave: (data: any) => Promise<void>;
  onCloseParent: () => void;
}

export function CustomerDedupeModal({
  show,
  onClose,
  duplicates,
  pendingData,
  clearDraft,
  onSave,
  onCloseParent
}: DedupeModalProps) {
  if (!show || duplicates.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-warning-200 bg-amber-50 text-amber-900 flex items-start gap-3">
            <AlertTriangle className="text-amber-600 mt-1" size={24} />
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wide">Phát hiện dữ liệu trùng lặp</h3>
              <p className="text-xs mt-1 text-amber-800">
                Hệ thống tìm thấy {duplicates.length} khách hàng có MST hoặc SĐT tương tự lưu trong danh bạ. Nên kiểm tra để gộp dữ liệu.
              </p>
            </div>
        </div>
        <div className="p-5 max-h-[300px] overflow-y-auto">
            <div className="space-y-3">
              {duplicates.map((dup: any) => (
                <div key={dup.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                  <div className="font-bold text-slate-800 flex items-center gap-2">
                    {dup.tenKhachHang}
                    <span className="text-2xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase tracking-wider">{dup.maKh}</span>
                  </div>
                  <div className="mt-1.5 text-xs text-slate-600 grid grid-cols-2 gap-2">
                    {dup.maSoThue && <div>MST: <span className="font-mono text-slate-800 font-medium">{dup.maSoThue}</span></div>}
                    {dup.sdt && <div>SĐT: <span className="font-mono text-slate-800 font-medium">{dup.sdt}</span></div>}
                  </div>
                </div>
              ))}
            </div>
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 rounded-b-xl">
            <Button
              onClick={onClose}
              variant="ghost"
              className="text-sm font-medium hover:bg-slate-200"
            >
              Hủy bỏ
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={async () => {
                  onClose();
                  if (pendingData) {
                    await clearDraft();
                    await onSave(pendingData);
                  }
                }}
                className="text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-sm"
              >
                Tạo bản trùng
              </Button>
              {duplicates.length > 0 && (
                <Button
                  onClick={() => {
                    onClose();
                    onCloseParent();
                    window.location.href = `/customers?id=${duplicates[0].id}`;
                  }}
                  className="text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                >
                  Xem hồ sơ gốc đã có
                </Button>
              )}
            </div>
        </div>
      </div>
    </div>
  );
}
