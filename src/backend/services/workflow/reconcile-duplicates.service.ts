import { adminDb } from '../../config/supabase.admin';
import { sequenceGeneratorService } from './sequence-generator.service';

export interface ReconcileResult {
  totalProcessed: number;
  duplicateGroupsFound: number;
  healedQuotations: Array<{
    id: string;
    oldCode: string;
    newCode: string;
    customerName?: string;
  }>;
}

export interface ReconcilePlanItem {
  id: string;
  oldCode: string;
  customerName?: string;
  loai?: string;
  year: number;
}

/**
 * Thuật toán hòa giải thuần túy (Pure Functional Core):
 * Nhóm theo soPhieuBaoGia, giữ nguyên bản ghi tạo trước, lập danh sách các bản ghi tạo sau cần cấp mã mới.
 */
export function planDuplicateReconciliation(activeDocs: Array<{ id: string; [key: string]: any }>): {
  duplicateGroupsFound: number;
  itemsToHeal: ReconcilePlanItem[];
} {
  const groups = new Map<string, Array<{ id: string; [key: string]: any }>>();
  for (const doc of activeDocs) {
    const code = (doc.soPhieuBaoGia || '').trim();
    if (!code || code === 'N/A' || code === '---') continue;
    const existing = groups.get(code) || [];
    existing.push(doc);
    groups.set(code, existing);
  }

  let duplicateGroupsFound = 0;
  const itemsToHeal: ReconcilePlanItem[] = [];

  for (const [code, docs] of groups.entries()) {
    if (docs.length <= 1) continue;
    duplicateGroupsFound += 1;

    // Sắp xếp tăng dần theo thời gian tạo
    docs.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.ngayBaoGia || 0).getTime();
      const timeB = new Date(b.createdAt || b.ngayBaoGia || 0).getTime();
      return timeA - timeB;
    });

    // Bản ghi 0 giữ mã gốc. Bản ghi 1..N lập kế hoạch cấp mã mới
    for (let i = 1; i < docs.length; i++) {
      const duplicateDoc = docs[i];
      const year = duplicateDoc.ngayBaoGia ? new Date(duplicateDoc.ngayBaoGia).getFullYear() : new Date().getFullYear();
      itemsToHeal.push({
        id: duplicateDoc.id,
        oldCode: code,
        customerName: duplicateDoc.tenKhachHang,
        loai: duplicateDoc.loai || duplicateDoc.phanLoai,
        year: isNaN(year) ? new Date().getFullYear() : year
      });
    }
  }

  return { duplicateGroupsFound, itemsToHeal };
}

/**
 * Service tự động rà soát và hòa giải các chứng từ bị trùng mã kế toán lịch sử (như BGVT-2026-0171).
 * Giữ nguyên chứng từ được tạo trước, tự động cấp mã kế toán mới kế tiếp cho chứng từ tạo sau
 * và cập nhật mọi liên kết phả hệ (Hợp đồng, Thanh toán).
 */
export async function reconcileHistoricalDuplicateQuotations(): Promise<ReconcileResult> {
  const result: ReconcileResult = {
    totalProcessed: 0,
    duplicateGroupsFound: 0,
    healedQuotations: []
  };

  try {
    const snap = await adminDb.collection('quotations').get();
    const activeDocs: Array<{ id: string; [key: string]: any }> = [];

    snap.forEach((doc) => {
      const data = doc.data();
      if (!data?.deletedAt) {
        activeDocs.push({ id: doc.id, ...data });
      }
    });

    result.totalProcessed = activeDocs.length;

    const plan = planDuplicateReconciliation(activeDocs);
    result.duplicateGroupsFound = plan.duplicateGroupsFound;

    for (const item of plan.itemsToHeal) {
      const newCode = await sequenceGeneratorService.getNextCode('quotation', {
        loai: item.loai,
        year: item.year
      });

      // Cập nhật lại bản ghi Báo giá
      await adminDb.collection('quotations').doc(item.id).update({
        soPhieuBaoGia: newCode,
        updatedAt: new Date().toISOString(),
        reconciledFromDuplicate: item.oldCode
      });

      // Cập nhật lại các Hợp Đồng tham chiếu đến Báo giá này
      const contractSnap = await adminDb.collection('contracts')
        .where('quotationId', '==', item.id)
        .get();
      for (const cDoc of contractSnap.docs) {
        await adminDb.collection('contracts').doc(cDoc.id).update({
          soPhieuBaoGia: newCode,
          updatedAt: new Date().toISOString()
        });
      }

      // Cập nhật lại các Phiếu Thanh Toán tham chiếu đến Báo giá này
      const paymentSnap = await adminDb.collection('payments')
        .where('quotationId', '==', item.id)
        .get();
      for (const pDoc of paymentSnap.docs) {
        await adminDb.collection('payments').doc(pDoc.id).update({
          soPhieuBaoGia: newCode,
          updatedAt: new Date().toISOString()
        });
      }

      result.healedQuotations.push({
        id: item.id,
        oldCode: item.oldCode,
        newCode,
        customerName: item.customerName
      });

      console.info(`[Reconciliation] Successfully healed duplicate quotation ${item.id}: ${item.oldCode} -> ${newCode} (${item.customerName})`);
    }

    return result;
  } catch (error) {
    console.error('[Reconciliation Error]:', error);
    return result;
  }
}
