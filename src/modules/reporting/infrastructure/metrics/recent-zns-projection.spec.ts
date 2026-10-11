import { describe, it, expect } from 'vitest';
import { projectRecentZns } from './recent-zns-projection';

const full = (i: number, createdAt: string) => ({
  id: `m${i}`, status: i % 2 ? 'SUCCESS' : 'FAILED', messageType: 'BAOGIA', entityType: 'QUOTATION', entityId: `q${i}`, createdAt,
  phone: '0912345678', sdt: '0912345678', payload: { tenKhachHang: 'Công ty A', noiDung: 'Báo giá 1 tỷ' }, customerName: 'Công ty A', retryCount: 0
});

describe('projectRecentZns – Đợt 0A (BM01)', () => {
  it('10 bản ghi đầy đủ → 10 bản tối giản đúng 6 khóa, sắp theo createdAt giảm dần', () => {
    const items = Array.from({ length: 10 }, (_, i) => full(i, `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`));
    const out = projectRecentZns(items);
    expect(out).toHaveLength(10);
    expect(out[0].id).toBe('m9');
    expect(out[9].id).toBe('m0');
    for (const row of out) {
      expect(Object.keys(row).sort()).toEqual(['createdAt', 'entityId', 'entityType', 'id', 'messageType', 'status']);
    }
    expect(JSON.stringify(out)).not.toContain('0912345678');
    expect(JSON.stringify(out)).not.toContain('Công ty A');
  });

  it('bản ghi thiếu createdAt xếp cuối, không làm hỏng sắp xếp; giới hạn 10', () => {
    const items = [full(1, '2026-10-02T00:00:00.000Z'), { ...full(2, ''), createdAt: undefined }, full(3, '2026-10-03T00:00:00.000Z'), ...Array.from({ length: 12 }, (_, i) => full(10 + i, '2026-09-01T00:00:00.000Z'))];
    const out = projectRecentZns(items);
    expect(out).toHaveLength(10);
    expect(out[0].id).toBe('m3');
    expect(out[1].id).toBe('m1');
    expect(out.find(r => r.id === 'm2')).toBeUndefined();
  });

  it('không phải mảng hoặc phần tử không phải object → bỏ qua an toàn', () => {
    expect(projectRecentZns(undefined)).toEqual([]);
    expect(projectRecentZns('x')).toEqual([]);
    expect(projectRecentZns([null, 5, full(1, '2026-10-01T00:00:00.000Z')])).toHaveLength(1);
  });
});
