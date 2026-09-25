import { useState } from 'react';
import { apiCreateEntity } from '@/src/shared/utils/apiCreateEntity';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { repositoryFactory } from '@/src/data/repositories/factory';

export function useManualZnsBypass() {
  const [bypassingId, setBypassingId] = useState<string | null>(null);

  const bypassZns = async (entityType: 'quotation' | 'contract' | 'payment' | 'delivery', docId: string, currentStatus: string) => {
    if (!docId) return;
    setBypassingId(docId);
    
    try {
      const collectionName = entityType + 's';
      const statusField = entityType === 'quotation' ? 'trangThaiGuiTinBaoGia'
        : entityType === 'contract' ? 'trangThaiGuiTinHopDong'
        : entityType === 'payment' ? 'trangThaiGuiTinThanhToan'
        : 'trangThaiGuiTinGiaoHang';

      // Update via Repo
      await repositoryFactory.get(collectionName).update(docId, {
        [statusField]: EntityZnsStatus.THANH_CONG, // Bypass
        logTomTat: 'Xác nhận ZNS thành công (Thủ công)',
        updatedAt: new Date().toISOString()
      });

      // Write Audit Log
      await apiCreateEntity('auditLogs', {
        action: 'ZNS_MANUAL_BYPASS',
        entityId: docId,
        entityType: entityType,
        message: `Người dùng xác nhận ZNS thành công thủ công do webhook trễ. Trạng thái cũ: ${currentStatus}`,
        timestamp: Date.now(),
        user: 'Hệ thống',
        details: {
          previousStatus: currentStatus,
          newStatus: EntityZnsStatus.THANH_CONG
        }
      });
      
    } catch (e) {
      console.error('Failed to bypass ZNS manually:', e);
    } finally {
      setBypassingId(null);
    }
  };

  return { bypassZns, bypassingId };
}
