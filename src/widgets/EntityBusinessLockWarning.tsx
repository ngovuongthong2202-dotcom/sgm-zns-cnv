import React from 'react';
import { Lock } from 'lucide-react';

interface EntityBusinessLockWarningProps {
  locked: boolean;
  reason?: string;
  blockingDocuments?: string[];
}

export function EntityBusinessLockWarning({ locked, reason, blockingDocuments }: EntityBusinessLockWarningProps) {
  if (!locked) return null;

  return (
    <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex flex-col gap-2 text-sm border border-amber-200 animate-in fade-in slide-in-from-top-2 mb-4">
      <div className="flex items-start gap-3">
        <Lock size={16} className="text-amber-700 shrink-0 mt-0.5" />
        <div>
          <strong>Cảnh báo ràng buộc:</strong> {reason}
          {blockingDocuments && blockingDocuments.length > 0 && (
            <ul className="mt-2 pl-4 list-disc space-y-1 text-xs">
              {blockingDocuments.map((doc, idx) => (
                <li key={idx}><strong>{doc.split(': ')[0]}:</strong> {doc.split(': ')[1] || doc}</li>
              ))}
            </ul>
          )}
          <div className="mt-2 text-xs italic text-amber-600/80">Bạn chỉ có thể xem hoặc cập nhật một số trường phụ, không thể sửa khoá nghiệp vụ.</div>
        </div>
      </div>
    </div>
  );
}
