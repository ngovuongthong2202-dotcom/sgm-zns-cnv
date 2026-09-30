import { describe, it, expect } from 'vitest';
import { extractVietnamesePhones } from './vietnameseTelecomExtractor';

describe('vietnameseTelecomExtractor', () => {
  it('giải mã chính xác chuỗi dính chùm 20 số di động từ ERP (09478896300925017071)', () => {
    const res = extractVietnamesePhones('09478896300925017071');
    expect(res.phones.length).toBe(2);
    expect(res.phones.map(p => p.cleaned)).toContain('0947889630');
    expect(res.phones.map(p => p.cleaned)).toContain('0925017071');
    expect(res.isZaloEligible).toBe(true);
    expect(res.primaryPhone).toBe('0947889630');
  });

  it('giải mã chuỗi phân cách dấu gạch chéo (0983916267/ 0919389089)', () => {
    const res = extractVietnamesePhones('0983916267/ 0919389089');
    expect(res.phones.length).toBe(2);
    expect(res.phones[0].cleaned).toBe('0983916267');
    expect(res.phones[0].carrier).toBe('Viettel');
    expect(res.phones[1].cleaned).toBe('0919389089');
    expect(res.phones[1].carrier).toBe('Vinaphone');
  });

  it('giải mã chuỗi 32 số kết hợp di động và 2 số bàn TP.HCM (09839080070283989698302866569696)', () => {
    const res = extractVietnamesePhones('09839080070283989698302866569696');
    expect(res.phones.length).toBe(3);
    expect(res.phones.map(p => p.cleaned)).toEqual(
      expect.arrayContaining(['0983908007', '02839896983', '02866569696'])
    );
    // Số di động được ưu tiên lên đầu làm SĐT chính để gửi ZNS
    expect(res.primaryPhone).toBe('0983908007');
    expect(res.isZaloEligible).toBe(true);
  });

  it('giải mã chuỗi 28 số có số bàn 8 số cục bộ và tự suy luận mã vùng 028 theo địa chỉ TP.HCM (0838643583376071730903814168)', () => {
    const res = extractVietnamesePhones('0838643583376071730903814168', 'C4/27 A Quốc Lộ 1A, Xã Tân Nhựt, TP. Hồ Chí Minh');
    expect(res.phones.length).toBeGreaterThanOrEqual(2);
    expect(res.phones.map(p => p.cleaned)).toContain('0838643583');
    expect(res.phones.map(p => p.cleaned)).toContain('0903814168');
    expect(res.isZaloEligible).toBe(true);
  });

  it('xử lý chuỗi rỗng hoặc undefined một cách an toàn', () => {
    const res = extractVietnamesePhones('');
    expect(res.primaryPhone).toBe('');
    expect(res.phones).toEqual([]);
    expect(res.isZaloEligible).toBe(false);
  });
});
