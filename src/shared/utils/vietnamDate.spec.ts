import { describe, it, expect } from 'vitest';
import { getVietnamDateKey, shiftVietnamDateKey, isAfterVietnamToday } from './vietnamDate';

describe('vietnamDate – Đợt 0A (GH15): ngày theo giờ Việt Nam, không theo UTC', () => {
  it('18:30Z ngày 11/10 là 12/10 ở Việt Nam; 16:59:59Z vẫn là 11/10', () => {
    expect(getVietnamDateKey(new Date('2026-10-11T18:30:00Z'))).toBe('2026-10-12');
    expect(getVietnamDateKey(new Date('2026-10-11T16:59:59Z'))).toBe('2026-10-11');
    expect(getVietnamDateKey(new Date('2026-10-11T17:00:00Z'))).toBe('2026-10-12');
  });

  it('shiftVietnamDateKey lùi qua tháng và năm đúng', () => {
    expect(shiftVietnamDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(shiftVietnamDateKey('2026-01-01', -1)).toBe('2025-12-31');
    expect(shiftVietnamDateKey('2026-10-11', 1)).toBe('2026-10-12');
  });

  it('isAfterVietnamToday: ngày mai (VN) → true; hôm nay → false; chuỗi sai → false, không ném', () => {
    const now = new Date('2026-10-11T18:30:00Z'); // = 12/10 VN
    expect(isAfterVietnamToday('2026-10-13', now)).toBe(true);
    expect(isAfterVietnamToday('2026-10-12', now)).toBe(false);
    expect(isAfterVietnamToday('2026-10-11', now)).toBe(false);
    expect(isAfterVietnamToday('khong-phai-ngay', now)).toBe(false);
    expect(isAfterVietnamToday(undefined, now)).toBe(false);
  });
});
