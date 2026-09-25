import { describe, it, expect } from 'vitest';
import { ZnsStatusVO } from './ZnsStatusVO';
import { EntityZnsStatus } from '../enums/zns-status';

describe('ZnsStatusVO', () => {
  it('correctly identifies success status across various formats', () => {
    expect(ZnsStatusVO.fromString('THANH_CONG')).toBe(EntityZnsStatus.THANH_CONG);
    expect(ZnsStatusVO.fromString('thanh_cong')).toBe(EntityZnsStatus.THANH_CONG);
    expect(ZnsStatusVO.fromString('Thành công')).toBe(EntityZnsStatus.THANH_CONG);
    expect(ZnsStatusVO.fromString('THÀNH CÔNG')).toBe(EntityZnsStatus.THANH_CONG);
    expect(ZnsStatusVO.fromString('SUCCESS')).toBe(EntityZnsStatus.THANH_CONG);
    expect(ZnsStatusVO.fromString('sent')).toBe(EntityZnsStatus.THANH_CONG);
    expect(ZnsStatusVO.isSuccess('THANH_CONG')).toBe(true);
    expect(ZnsStatusVO.isSuccess('Thành công')).toBe(true);
  });

  it('correctly identifies failure and limit exceeded statuses', () => {
    expect(ZnsStatusVO.fromString('THAT_BAI')).toBe(EntityZnsStatus.THAT_BAI);
    expect(ZnsStatusVO.fromString('that_bai')).toBe(EntityZnsStatus.THAT_BAI);
    expect(ZnsStatusVO.fromString('Thất bại')).toBe(EntityZnsStatus.THAT_BAI);
    expect(ZnsStatusVO.fromString('VUOT_HAN_MUC')).toBe(EntityZnsStatus.VUOT_HAN_MUC);
    expect(ZnsStatusVO.fromString('limit_exceeded')).toBe(EntityZnsStatus.VUOT_HAN_MUC);
    expect(ZnsStatusVO.isSuccess('THAT_BAI')).toBe(false);
  });

  it('correctly handles pending, waiting and retry statuses', () => {
    expect(ZnsStatusVO.fromString('DANG_DAY')).toBe(EntityZnsStatus.DANG_DAY);
    expect(ZnsStatusVO.fromString('DA_DAY_CHO_KQ')).toBe(EntityZnsStatus.DA_DAY_CHO_KQ);
    expect(ZnsStatusVO.fromString('CAN_GUI_LAI')).toBe(EntityZnsStatus.CAN_GUI_LAI);
    expect(ZnsStatusVO.fromString(null)).toBe(EntityZnsStatus.CHUA_GUI);
    expect(ZnsStatusVO.fromString(undefined)).toBe(EntityZnsStatus.CHUA_GUI);
  });
});
