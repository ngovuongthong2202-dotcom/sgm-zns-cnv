import { notify } from '@/src/shared/utils/notify';

/**
 * Validates a workflow gate with the server and handles the UX (BLOCK, WARN, ASK_REASON).
 * Prompts the user if BYPASS is required. Returns true if the operation should proceed.
 */
export async function checkWorkflowGate(targetEntity: 'CONTRACT' | 'PAYMENT' | 'DELIVERY', parentId: string, parentDocType?: string, userEmail?: string): Promise<boolean> {
  const res = await fetch('/api/workflow/check-gate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetEntity, parentId, parentDocType })
  });
  
  const checkResult = await res.json().catch(() => ({ action: 'ALLOW' }));

  if (checkResult && checkResult.action !== 'ALLOW') {
    if (checkResult.action === 'BLOCK') {
      notify.error("Chặn Workflow: " + checkResult.reason);
      return false;
    } else if (checkResult.action === 'WARN') {
      notify.error("Cảnh báo Workflow: " + checkResult.reason);
      return true;
    } else if (checkResult.action === 'ASK_REASON') {
      const reason = window.prompt(`Workflow Bypass Cần Thiết: ${checkResult.reason}\n\nNhập lý do bypass bắt buộc để tiếp tục:`);
      if (!reason) {
        notify.error("Hủy bỏ thao tác tạo.");
        return false;
      }
      try {
        await fetch('/api/workflow/log-bypass', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetEntity, parentId, reason, userEmail: userEmail || 'admin-ui' }) // Inject actual userEmail
        });
      } catch (e) {
        console.error('Failed to log bypass', e);
      }
      return true;
    }
  }

  return true;
}
