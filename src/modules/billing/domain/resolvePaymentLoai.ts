import { Payment } from '@/src/domain/schema/payment.schema';
import { QUOTATION_LOAI, normalizeLoai } from '@/src/domain/enums/quotation-loai';
import { entityCachePool } from '@/src/platform/data/entity-cache-pool';

export function resolvePaymentLoai(p: Payment): QUOTATION_LOAI {
  const pRecord = p as unknown as Record<string, unknown>;
  if (pRecord.phanLoai && typeof pRecord.phanLoai === 'string') {
    const norm = normalizeLoai(pRecord.phanLoai);
    if (norm) return norm;
  }
  if (pRecord.loai && typeof pRecord.loai === 'string') {
    const norm = normalizeLoai(pRecord.loai);
    if (norm) return norm;
  }
  if (p.contractId || p.soHopDong) {
    return QUOTATION_LOAI.MAY;
  }
  if (p.quotationId) {
    const q = entityCachePool.get('quotations', p.quotationId) as Record<string, unknown> | undefined;
    if (q) {
      const qLoai = (q.loai || q.phanLoai || q.loaiBaoGia) as string | undefined;
      const norm = normalizeLoai(qLoai);
      if (norm) return norm;
    }
  }
  const refCode = `${p.paymentId || ''} ${p.soHopDong || ''} ${p.soDonHang || ''} ${p.soPhieuBaoGia || ''} ${String(pRecord.sourceValue || '')}`.toUpperCase();
  if (refCode.includes('BGVT') || refCode.includes('VẬT TƯ') || refCode.includes('VAT TU') || refCode.includes('PT-VT')) {
    return QUOTATION_LOAI.VAT_TU;
  }
  if (refCode.includes('BGDV') || refCode.includes('DỊCH VỤ') || refCode.includes('DICH VU') || refCode.includes('PT-DV')) {
    return QUOTATION_LOAI.DICH_VU;
  }
  if (refCode.includes('BGM') || refCode.includes('HD-') || refCode.includes('HĐ') || refCode.includes('MÁY') || refCode.includes('MAY') || refCode.includes('PT-MAY')) {
    return QUOTATION_LOAI.MAY;
  }
  if (p.quotationId) return QUOTATION_LOAI.VAT_TU;
  return QUOTATION_LOAI.MAY;
}
