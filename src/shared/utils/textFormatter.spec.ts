import { describe, it, expect } from 'vitest';
import {
  normalizeBusinessName,
  normalizePersonName,
  normalizeCode,
  cleanCode,
  squeezeSpaces,
  cleanProperVietnameseText,
  parseCurrencyToNumber
} from './textFormatter';

describe('Text Formatter Utility', () => {
  it('cleans hidden characters and non-breaking spaces with cleanCode', () => {
    // \u200B is zero-width space, \xA0 is non-breaking space
    const dirty = '\u200BBG\xA0123\uFEFF - 456\u200D';
    expect(cleanCode(dirty)).toBe('BG 123 - 456');
    expect(cleanCode(null)).toBe('');
  });

  it('squeezes spaces and trims strings correctly', () => {
    expect(squeezeSpaces('  CÔNG TY   TNHH   MTV  ')).toBe('CÔNG TY TNHH MTV');
    expect(squeezeSpaces(null)).toBe('');
    expect(squeezeSpaces('')).toBe('');
  });

  it('normalizes alphanumeric identifiers/codes to uppercase without spaces', () => {
    expect(normalizeCode('kh019')).toBe('KH019');
    expect(normalizeCode('  q t - 1 2 3 ')).toBe('QT-123');
    expect(normalizeCode(null)).toBe('');
  });

  it('normalizes person names into Title/Proper Case with single spaces', () => {
    expect(normalizePersonName('nguyỄN văn a')).toBe('Nguyễn Văn A');
    expect(normalizePersonName('  lÊ  hoÀNg   pHúC ')).toBe('Lê Hoàng Phúc');
    expect(normalizePersonName(null)).toBe('');
  });

  it('normalizes enterprise/business names while preserving specified upper-case abbreviations', () => {
    // Abbreviation KEEP_UPPER list tests
    expect(normalizeBusinessName('CÔNG TY tnhh thương mại a')).toBe('Công Ty TNHH Thương Mại A');
    expect(normalizeBusinessName('doanh nghiệp tư nhân mtv sgm')).toBe('Doanh Nghiệp Tư Nhân MTV SGM');
    expect(normalizeBusinessName('cổ phần b2b zns việt nam')).toBe('Cổ Phần B2B ZNS Việt Nam');
    expect(normalizeBusinessName(null)).toBe('');
  });

  it('handles custom complex Vietnamese proper names and bracket structures', () => {
    expect(cleanProperVietnameseText('Chị Hoa ( Hùng Hoa)')).toBe('Chị Hoa (Hùng Hoa)');
    expect(cleanProperVietnameseText('Công Ty TNHH  Thương Mại    SGM , Quận 1')).toBe('Công Ty TNHH Thương Mại SGM, Quận 1');
  });

  it('safely parses currency strings with different standards and boundary conditions', () => {
    // Basic numbers
    expect(parseCurrencyToNumber(1500000)).toBe(1500000);
    expect(parseCurrencyToNumber(0)).toBe(0);
    expect(parseCurrencyToNumber(null)).toBe(0);
    expect(parseCurrencyToNumber(undefined)).toBe(0);
    expect(parseCurrencyToNumber('0')).toBe(0);

    // Empty/invalid strings
    expect(parseCurrencyToNumber('')).toBe(0);
    expect(parseCurrencyToNumber('   ')).toBe(0);
    expect(parseCurrencyToNumber('invalid_not_a_number')).toBe(0);

    // Standard Vietnamese format
    expect(parseCurrencyToNumber('1.500.000 đ')).toBe(1500000);
    expect(parseCurrencyToNumber('1.500.000 ₫')).toBe(1500000);
    expect(parseCurrencyToNumber('1.500.000 VND')).toBe(1500000);
    expect(parseCurrencyToNumber('-1.500.000 đ')).toBe(-1500000);

    // Vietnamese format with decimal (decimals represented by comma)
    expect(parseCurrencyToNumber('1.500.000,50 ₫')).toBe(1500000.50);
    expect(parseCurrencyToNumber('1500000,5')).toBe(1500000.5);

    // Standard English format
    expect(parseCurrencyToNumber('1,500,000.50')).toBe(1500000.50);
    expect(parseCurrencyToNumber('1500000.5')).toBe(1500000.5);

    // Clean number with trailing units
    expect(parseCurrencyToNumber('1500000')).toBe(1500000);
    expect(parseCurrencyToNumber('3500.50$')).toBe(3500.5);
  });
});
