import React, { useEffect } from 'react';
import { Lock, Unlock, BellRing } from 'lucide-react';
import { useEntityLock } from '@/src/hooks/useEntityLock';
import { useAuth } from '@/src/modules/iam';
import { can } from '@/src/modules/iam';
import { notify } from '@/src/shared/utils/notify';
import { Button } from '../design-system';
import { notificationsRepo } from '@/src/data/repositories/system.repo';

interface EntityLockWarningProps {
  entityType: string;
  entityId: string | null | undefined;
  onLockStateChange?: (isLockedByOther: boolean) => void;
}

export function EntityLockWarning({ entityType, entityId, onLockStateChange }: EntityLockWarningProps) {
  const { isLockedByOther, lockInfo, acquireLock, releaseLock } = useEntityLock(entityType, entityId);
  const { userData, user } = useAuth();
  const canForceUnlock = can('force_unlock', 'settings', userData?.role);

  useEffect(() => {
    if (entityId) {
      if (!isLockedByOther) {
        acquireLock();
      }
    }
  }, [entityId, isLockedByOther, acquireLock]);

  useEffect(() => {
    onLockStateChange?.(isLockedByOther);
  }, [isLockedByOther, onLockStateChange]);

  if (!isLockedByOther || !lockInfo) return null;

  const handleForceUnlock = async () => {
    await releaseLock(true);
    notify.success('Đã mở khóa bắt buộc');
  };

  const handleRequestUnlock = async () => {
    if (!user || !lockInfo.userId) return;
    try {
      await notificationsRepo.set(Date.now().toString(), {
        userId: lockInfo.userId, // Send to the lock holder
        title: 'Yêu cầu mở khóa',
        body: `Nhân viên ${user.email} yêu cầu bạn hoàn tất chỉnh sửa và đóng Form để họ có thể cập nhật.`,
        read: false,
        createdAt: new Date().toISOString()
      } as any);
      notify.success('Đã gửi thông báo yêu cầu mở khóa đến ' + lockInfo.userEmail);
    // eslint-disable-next-line unused-imports/no-unused-vars
    } catch (_e) {
      notify.error('Không gửi được thông báo');
    }
  };

  const lockAgeMs = lockInfo ? Date.now() - lockInfo.lockedAt : 0;

  return (
    <div className="bg-amber-50 text-amber-800 p-3 rounded-md flex flex-col gap-3 text-sm border border-amber-200 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-3">
        <Lock size={16} className="text-amber-700 shrink-0" />
        <div>
          <strong>Phát hiện tương tranh:</strong> Nhân viên <strong>{lockInfo.userEmail || 'Khác'}</strong> đang chỉnh sửa dữ liệu này. 
          Vui lòng đợi hoặc yêu cầu họ mở khóa để không làm mất dữ liệu.
        </div>
      </div>
      <div className="flex gap-2 ml-7 mt-1 items-center">
        <Button variant="ghost" onClick={handleRequestUnlock}
          className="bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs transition-colors"
        >
          <BellRing size={14} /> Yêu cầu mở khóa
        </Button>
        {canForceUnlock && (
          <Button variant="ghost" onClick={handleForceUnlock}
            className="bg-amber-600 text-white hover:bg-amber-700 flex items-center gap-2 px-3 py-1.5 rounded-md font-medium text-xs transition-colors"
          >
            <Unlock size={14} /> Force unlock
          </Button>
        )}
        {isLockedByOther && lockAgeMs > 5 * 60 * 1000 && (
          <Button variant="ghost" onClick={handleForceUnlock} className="text-amber-700 underline text-2xs ml-2">
            Lock đã cũ — Force unlock
          </Button>
        )}
      </div>
    </div>
  );
}
