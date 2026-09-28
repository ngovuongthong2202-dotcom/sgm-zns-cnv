import { describe, it, expect } from 'vitest';
import { parseFinancialInput } from './useSmartFormInput';

describe('useSmartFormInput - Financial Shortcut & In-Place Math Engine', () => {
  it('correctly parses plain numeric values and formatted currency strings', () => {
    expect(parseFinancialInput(15000000)).toBe(15000000);
    expect(parseFinancialInput('15000000')).toBe(15000000);
    expect(parseFinancialInput('15.000.000')).toBe(15000000);
    expect(parseFinancialInput(' 25,000,000 ')).toBe(25000000);
    expect(parseFinancialInput('100.000')).toBe(100000);
    expect(parseFinancialInput('100.000đ')).toBe(100000);
    expect(parseFinancialInput('100.000 VND')).toBe(100000);
    expect(parseFinancialInput('50.000')).toBe(50000);
    expect(parseFinancialInput('1.000')).toBe(1000);
    expect(parseFinancialInput('100,000')).toBe(100000);
    expect(parseFinancialInput('0')).toBe(0);
    expect(parseFinancialInput('')).toBe(0);
  });

  it('correctly parses shortcuts (k, m, ty/b)', () => {
    expect(parseFinancialInput('100k')).toBe(100000);
    expect(parseFinancialInput('250K')).toBe(250000);
    expect(parseFinancialInput('15m')).toBe(15000000);
    expect(parseFinancialInput('15tr')).toBe(15000000);
    expect(parseFinancialInput('2.5m')).toBe(2500000);
    expect(parseFinancialInput('1.5ty')).toBe(1500000000);
    expect(parseFinancialInput('1.5b')).toBe(1500000000);
    expect(parseFinancialInput('3tỷ')).toBe(3000000000);
  });

  it('correctly evaluates in-place math expressions', () => {
    expect(parseFinancialInput('15m*3')).toBe(45000000);
    expect(parseFinancialInput('500k + 250k')).toBe(750000);
    expect(parseFinancialInput('10m / 2')).toBe(5000000);
    expect(parseFinancialInput('100k - 20k')).toBe(80000);
    expect(parseFinancialInput('1000000 * 5')).toBe(5000000);
    expect(parseFinancialInput('100.000 * 2')).toBe(200000);
    expect(parseFinancialInput('100.000 + 50.000')).toBe(150000);
  });

  it('handles dirty strings gracefully without throwing exceptions', () => {
    expect(parseFinancialInput('abc')).toBe(0);
    expect(parseFinancialInput(null as any)).toBe(0);
    expect(parseFinancialInput(undefined as any)).toBe(0);
  });
});
