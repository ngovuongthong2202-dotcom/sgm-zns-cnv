import { describe, it, expect } from 'vitest';
import { normalizeLoai, QUOTATION_LOAI } from './quotation-loai';

describe('normalizeLoai', () => {
  it('normalizes to BG Máy', () => {
    expect(normalizeLoai('bg máy')).toBe(QUOTATION_LOAI.MAY);
    expect(normalizeLoai('BG MAY')).toBe(QUOTATION_LOAI.MAY);
    expect(normalizeLoai(' Máy ')).toBe(QUOTATION_LOAI.MAY);
    expect(normalizeLoai('Báo giá Máy mới')).toBe(QUOTATION_LOAI.MAY);
  });

  it('normalizes to BG Vật tư', () => {
    expect(normalizeLoai('bg vật tư')).toBe(QUOTATION_LOAI.VAT_TU);
    expect(normalizeLoai('BG VAT TU')).toBe(QUOTATION_LOAI.VAT_TU);
    expect(normalizeLoai(' vật tư ')).toBe(QUOTATION_LOAI.VAT_TU);
    expect(normalizeLoai('Báo giá Vật tư hao mòn')).toBe(QUOTATION_LOAI.VAT_TU);
  });

  it('normalizes to BG Dịch vụ', () => {
    expect(normalizeLoai('bg dịch vụ')).toBe(QUOTATION_LOAI.DICH_VU);
    expect(normalizeLoai('BG DICH VU')).toBe(QUOTATION_LOAI.DICH_VU);
    expect(normalizeLoai(' dịch vụ ')).toBe(QUOTATION_LOAI.DICH_VU);
    expect(normalizeLoai('Dịch vụ bảo trì')).toBe(QUOTATION_LOAI.DICH_VU);
  });

  it('handles empty and undefined', () => {
    expect(normalizeLoai(undefined)).toBeUndefined();
    expect(normalizeLoai(null)).toBeUndefined();
    expect(normalizeLoai('')).toBeUndefined();
  });

  it('returns original if unmatched', () => {
    expect(normalizeLoai('Khác')).toBe('Khác');
  });
});
