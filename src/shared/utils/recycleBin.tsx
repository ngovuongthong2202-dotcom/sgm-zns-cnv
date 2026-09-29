import React from 'react';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { notify } from '@/src/shared/utils/notify';
import { toast as hotToast } from 'react-hot-toast';

export interface SoftDeleteOptions {
  collection: string;
  id: string;
  label?: string;
  onRestore?: () => void | Promise<void>;
}

/**
 * Restores a soft-deleted entity by clearing its `deletedAt` timestamp.
 */
export async function restoreSoftDeletedEntity(collection: string, id: string): Promise<boolean> {
  try {
    const repo = repositoryFactory.get<any>(collection);
    if (!repo) return false;

    await repo.update(id, {
      deletedAt: null,
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (err) {
    console.error(`[RecycleBin] Failed to restore entity ${id} in ${collection}:`, err);
    return false;
  }
}

/**
 * Triggers an interactive Soft-Delete Notification with an instant [Hoàn tác] (Undo) action button.
 */
export function notifySoftDeleteWithUndo({
  collection,
  id,
  label = 'Bản ghi',
  onRestore
}: SoftDeleteOptions): void {
  hotToast.custom(
    (t) => (
      <div
        className={`${
          t.visible ? 'animate-enter' : 'animate-leave'
        } max-w-md w-full bg-slate-900 text-white shadow-xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-3.5 items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-base">🗑️</span>
          <div className="text-xs">
            <p className="font-bold text-white leading-tight">
              {label} đã xóa
            </p>
            <p className="text-3xs text-slate-300 mt-0.5">
              Đã lưu trữ an toàn trong Thùng rác
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={async () => {
              hotToast.dismiss(t.id);
              const success = await restoreSoftDeletedEntity(collection, id);
              if (success) {
                notify.success(`Đã khôi phục ${label} thành công!`);
                if (onRestore) {
                  await onRestore();
                }
              } else {
                notify.error(`Không thể khôi phục ${label}. Vui lòng thử lại.`);
              }
            }}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-3xs font-bold rounded-md shadow-xs transition-colors cursor-pointer"
          >
            Hoàn tác ↩
          </button>
          <button
            type="button"
            onClick={() => hotToast.dismiss(t.id)}
            className="p-1 text-slate-400 hover:text-white text-xs transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    ),
    { duration: 6000 }
  );
}
