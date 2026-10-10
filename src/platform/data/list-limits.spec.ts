import { describe, it, expect } from 'vitest';
import {
  POSTGREST_MAX_ROWS, CORE_PAGE_SIZE, CORE_HARD_CAP, CORE_ABSOLUTE_CEILING, DEFAULT_WINDOW_LIMIT, CORE_COLLECTIONS, isCoreCollection
} from './list-limits';

const hasOverride = Boolean(process.env.VITE_CORE_PAGE_SIZE || process.env.VITE_CORE_HARD_CAP || process.env.VITE_CORE_ABSOLUTE_CEILING);

describe('list-limits (Đợt 0A – lô 2)', () => {
  it('mỗi trang không vượt giới hạn 1000 dòng của PostgREST', () => {
    expect(POSTGREST_MAX_ROWS).toBe(1000);
    expect(CORE_PAGE_SIZE).toBeGreaterThan(0);
    expect(CORE_PAGE_SIZE).toBeLessThanOrEqual(POSTGREST_MAX_ROWS);
  });

  it('trần là bội số của cỡ trang và không vượt trần tuyệt đối', () => {
    expect(CORE_HARD_CAP % CORE_PAGE_SIZE).toBe(0);
    expect(CORE_HARD_CAP).toBeGreaterThanOrEqual(CORE_PAGE_SIZE);
    expect(CORE_ABSOLUTE_CEILING).toBeGreaterThanOrEqual(CORE_HARD_CAP);
    expect(DEFAULT_WINDOW_LIMIT).toBe(500);
  });

  it.skipIf(hasOverride)('giá trị mặc định (không ghi đè bằng biến môi trường) là 1000 / 2000 / 5000', () => {
    expect(CORE_PAGE_SIZE).toBe(1000);
    expect(CORE_HARD_CAP).toBe(2000);
    expect(CORE_ABSOLUTE_CEILING).toBe(5000);
  });

  it('chỉ 5 bộ sưu tập lõi được phân trang', () => {
    expect([...CORE_COLLECTIONS]).toEqual(['customers', 'quotations', 'contracts', 'payments', 'deliveries']);
    expect(isCoreCollection('payments')).toBe(true);
    expect(isCoreCollection('zns_messages')).toBe(false);
    expect(isCoreCollection('znsMessages')).toBe(false);
    expect(isCoreCollection('notifications')).toBe(false);
  });
});
