import { useState } from 'react';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';
import { repositoryFactory } from '@/src/data/repositories/factory';
import { useAuth } from '@/src/modules/iam';

export function useManualZnsBypass() {
  const [bypassingId, setBypassingId] = useState<string | null>(null);
  const { user } = useAuth();

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

      // Đợt 0A: nhật ký đi đường cố định của máy chủ (bảng auditLogs, action cố định),
      // thay cho POST /create/auditLogs (đường chung) đã bị rào 5 bảng.
      const res = await fetch('/api/workflow/zns-manual-bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, docId, previousStatus: currentStatus, userId: user?.uid || '' })
      });
      if (!res.ok) {
        console.warn('Không ghi được nhật ký xác nhận ZNS thủ công, mã:', res.status);
      }
    } catch (e) {
      console.error('Failed to bypass ZNS manually:', e);
    } finally {
      setBypassingId(null);
    }
  };

  return { bypassZns, bypassingId };
}
