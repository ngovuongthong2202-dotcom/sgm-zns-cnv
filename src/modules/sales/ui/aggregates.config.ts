import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { EntityZnsStatus, normalizeLegacyStatus } from '@/src/domain/enums/zns-status';

export const getQuotationValue = (q: Quotation): number => {
  if (!q.products || !Array.isArray(q.products)) return 0;
  return q.products.reduce((acc, p) => acc + ((p.price || 0) * (p.quantity || 1)), 0);
};

export const quotationAggregates = {
  totalPipelineValue: (quotations: Quotation[]) => {
    const val = quotations
      .filter(q => q.tinhTrangBaoGia !== 'HỦY' && q.tinhTrangBaoGia !== 'ĐÃ CHỐT')
      .reduce((acc, q) => acc + getQuotationValue(q), 0);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(val);
  },
  totalWonValue: (quotations: Quotation[]) => {
    const val = quotations
      .filter(q => q.tinhTrangBaoGia === 'ĐÃ CHỐT')
      .reduce((acc, q) => acc + getQuotationValue(q), 0);
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', notation: 'compact' }).format(val);
  },
  winRate: (quotations: Quotation[], _contracts: Contract[]) => {
    if (!quotations || quotations.length === 0) return '0%';
    const wonCount = quotations.filter(q => q.tinhTrangBaoGia === 'ĐÃ CHỐT').length;
    return `${Math.round((wonCount / quotations.length) * 100)}%`;
  },
  totalZnsSent: (quotations: Quotation[]) => {
    return quotations.filter(q => normalizeLegacyStatus(q.trangThaiGuiTinBaoGia) === EntityZnsStatus.THANH_CONG).length;
  }
};
