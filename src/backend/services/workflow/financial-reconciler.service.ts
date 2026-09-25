import { adminDb } from '../../config/supabase.admin';
import { logger } from '../../lib/logger';
import { telegramService } from '../telegram/telegram.service';

export interface ReconcileResult {
  contractId: string;
  healed: boolean;
  drift?: number;
  oldPaid?: number;
  newPaid?: number;
}

/**
 * Enterprise Autonomous Financial Reconciler Daemon
 * Automatically detects and heals financial drifts between active payments and contract rollups.
 */
export class FinancialReconcilerService {
  /**
   * Reconciles a single contract against all its non-deleted payments.
   */
  static async reconcileContract(contractId: string): Promise<ReconcileResult> {
    try {
      const contractDoc = await adminDb.collection('contracts').doc(contractId).get();
      if (!contractDoc.exists) {
        return { contractId, healed: false };
      }

      const paymentsSnap = await adminDb.collection('payments')
        .where('contractId', '==', contractId)
        .get();

      const realTotalPaid = paymentsSnap.docs
        .filter(d => !d.data()?.deletedAt)
        .reduce((sum, d) => sum + (Number(d.data()?.soTien) || Number(d.data()?.amount) || 0), 0);

      const contractData = contractDoc.data() || {};
      const currentRecordedPaid = Number(contractData.daThanhToan) || 0;
      const drift = realTotalPaid - currentRecordedPaid;

      if (drift !== 0) {
        const contractValue = Number(contractData.giaTriHopDong) || 0;
        const newBalance = Math.max(0, contractValue - realTotalPaid);
        const newPaymentStatus = newBalance === 0 && contractValue > 0
          ? 'TAT_TOAN'
          : (realTotalPaid > 0 ? 'CONG_NO' : 'CHUA_THANH_TOAN');

        await adminDb.collection('contracts').doc(contractId).update({
          daThanhToan: realTotalPaid,
          conLai: newBalance,
          tinhTrangThanhToan: newPaymentStatus,
          autoHealedAt: new Date().toISOString()
        });

        logger.warn(
          { contractId, oldPaid: currentRecordedPaid, newPaid: realTotalPaid, drift },
          '[Financial Reconciler] Auto-healed financial drift'
        );

        // Alert via Telegram if enabled
        try {
          await telegramService.sendToAllEnabled(
            `🛡️ *[Auto-Heal Tài Chính]*\nĐã tự động hiệu chỉnh độ lệch công nợ Hợp đồng \`${contractId}\`:\n- Trước: ${new Intl.NumberFormat('vi-VN').format(currentRecordedPaid)} ₫\n- Thực tế: ${new Intl.NumberFormat('vi-VN').format(realTotalPaid)} ₫\n- Chênh lệch: ${new Intl.NumberFormat('vi-VN').format(drift)} ₫`,
            'alert'
          );
        } catch {
          // Ignore telegram alert failure in background
        }

        return {
          contractId,
          healed: true,
          drift,
          oldPaid: currentRecordedPaid,
          newPaid: realTotalPaid
        };
      }

      return { contractId, healed: false };
    } catch (err: unknown) {
      logger.error({ contractId, err }, '[Financial Reconciler] Error reconciling contract');
      return { contractId, healed: false };
    }
  }

  /**
   * Sweeps through all active contracts to reconcile financial balances.
   */
  static async sweepAllContracts(): Promise<ReconcileResult[]> {
    try {
      const snap = await adminDb.collection('contracts').get();
      const results: ReconcileResult[] = [];
      for (const doc of snap.docs) {
        if (!doc.data()?.deletedAt) {
          const res = await this.reconcileContract(doc.id);
          if (res.healed) results.push(res);
        }
      }
      return results;
    } catch (err) {
      logger.error({ err }, '[Financial Reconciler] Error in sweepAllContracts');
      return [];
    }
  }
}
