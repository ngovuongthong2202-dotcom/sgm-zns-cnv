import { adminDb } from '../../config/supabase.admin';
import { QUOTATION_LOAI, normalizeLoai } from '../../../domain/enums/quotation-loai';

export interface NextCodeOptions {
  loai?: string;
  year?: number;
  prefix?: string;
}

export class SequenceGeneratorService {
  /**
   * Sinh mã kế toán nguyên tử (Atomic sequence generation) với Transaction trên bảng counters.
   * Chống trùng lặp tuyệt đối (Zero race-condition) khi nhiều người dùng cùng thao tác đồng thời.
   */
  public async getNextCode(entityType: string, options: NextCodeOptions = {}): Promise<string> {
    const year = options.year || new Date().getFullYear();
    const normEntityType = entityType.toLowerCase().trim();

    let prefix = options.prefix || '';
    let counterKey = '';

    if (normEntityType === 'quotation' || normEntityType === 'quotations') {
      const normLoai = normalizeLoai(options.loai);
      if (normLoai === QUOTATION_LOAI.MAY) prefix = 'BGM-';
      else if (normLoai === QUOTATION_LOAI.VAT_TU) prefix = 'BGVT-';
      else if (normLoai === QUOTATION_LOAI.DICH_VU) prefix = 'BGDV-';
      else prefix = 'BG-';

      counterKey = `quotation_${prefix.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}_${year}`;
    } else if (normEntityType === 'contract' || normEntityType === 'contracts') {
      prefix = 'HD-';
      counterKey = `contract_${year}`;
    } else if (normEntityType === 'payment' || normEntityType === 'payments') {
      prefix = 'PT-';
      counterKey = `payment_${year}`;
    } else if (normEntityType === 'delivery' || normEntityType === 'deliveries') {
      prefix = 'PGH-';
      counterKey = `delivery_${year}`;
    } else if (normEntityType === 'customer' || normEntityType === 'customers') {
      prefix = 'KH';
      counterKey = 'customer_global';
    } else {
      prefix = `${normEntityType.toUpperCase()}-`;
      counterKey = `${normEntityType}_${year}`;
    }

    const nextSeq = await adminDb.runTransaction(async (t) => {
      const counterRef = adminDb.collection('counters').doc(counterKey);
      const counterDoc = await t.get(counterRef);

      let seq: number;
      if (counterDoc.exists) {
        const data = counterDoc.data();
        seq = (Number(data?.seq) || 0) + 1;
      } else {
        // Fallback: Tìm số lớn nhất hiện hữu trong DB để tiếp tục chuỗi mà không bị nhảy lùi
        seq = await this.findMaxExistingSeq(normEntityType, prefix, year);
      }

      await t.set(counterRef, {
        seq,
        entityType: normEntityType,
        prefix,
        year,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return seq;
    });

    if (normEntityType === 'customer' || normEntityType === 'customers') {
      return `${prefix}${String(nextSeq).padStart(4, '0')}`;
    }

    // Các chứng từ nghiệp vụ khác có cấu trúc dạng: PREFIX-YYYY-XXX (hoặc PREFIX-XXX)
    return `${prefix}${year}-${String(nextSeq).padStart(4, '0')}`;
  }

  private async findMaxExistingSeq(entityType: string, prefix: string, _year: number): Promise<number> {
    try {
      const collectionName = entityType.endsWith('s') ? entityType : `${entityType}s`;
      const snap = await adminDb.collection(collectionName).get();
      let max = 0;

      snap.forEach((doc) => {
        const d = doc.data();
        const code = d?.soPhieuBaoGia || d?.soHopDong || d?.paymentId || d?.deliveryId || d?.maKh || d?.maBaoGia || d?.maHopDong || '';
        if (typeof code === 'string' && code.startsWith(prefix)) {
          // Trích xuất cụm số ở cuối chuỗi
          const match = code.match(/(\d+)$/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > max) {
              max = num;
            }
          }
        }
      });

      return max + 1;
    } catch {
      return 1;
    }
  }
}

export const sequenceGeneratorService = new SequenceGeneratorService();
