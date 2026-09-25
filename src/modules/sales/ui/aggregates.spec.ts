import { describe, it, expect } from 'vitest';
import { quotationAggregates } from './aggregates.config';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

describe('quotationAggregates', () => {
  it('totalPipelineValue calculates value for non-won/non-lost', () => {
    const qs = [
      { tinhTrangBaoGia: 'MỚI', products: [{ price: 100, quantity: 2 }] },
      { tinhTrangBaoGia: 'ĐÃ CHỐT', products: [{ price: 500, quantity: 1 }] }
    ] as Quotation[];
 
    // Only MỚI counts -> 200 => "200 ₫"
    expect(quotationAggregates.totalPipelineValue(qs)).toContain('200');
  });

  it('winRate calculates percentage of won quotations over total', () => {
    const qs = [{ tinhTrangBaoGia: 'ĐÃ CHỐT' }, { tinhTrangBaoGia: 'MỚI' }, { tinhTrangBaoGia: 'ĐÃ CHỐT' }, { tinhTrangBaoGia: 'HỦY' }] as any as Quotation[]; 
    const cs = [] as Contract[];
    expect(quotationAggregates.winRate(qs, cs)).toBe('50%');
  });

  it('snapshot test for all aggregates', () => {
    const qs = [
      { id: 'Q1', customerId: 'C1', trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG, tinhTrangBaoGia: 'MỚI', products: [{price: 100, quantity: 1}] },
      { id: 'Q2', customerId: 'C2', trangThaiGuiTinBaoGia: EntityZnsStatus.THAT_BAI, tinhTrangBaoGia: 'ĐÃ CHỐT', products: [{price: 200, quantity: 1}] },
    ] as any as Quotation[]; 
    const cs = [] as Contract[];
    const aggregates = {
      totalPipelineValue: quotationAggregates.totalPipelineValue(qs).replace(/\s/g, ' '),
      totalWonValue: quotationAggregates.totalWonValue(qs).replace(/\s/g, ' '),
      winRate: quotationAggregates.winRate(qs, cs),
      znsSent: quotationAggregates.totalZnsSent(qs),
    };
    expect(aggregates).toEqual({
      "totalPipelineValue": "100 ₫",
      "totalWonValue": "200 ₫",
      "winRate": "50%",
      "znsSent": 1,
    });
  });
});

