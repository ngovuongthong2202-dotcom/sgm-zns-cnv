import { describe, it, expect } from 'vitest';
import { maskName, maskPhone } from '@/src/features/tracking/PublicOrderTrackingPage';

describe('Phase 4: Public Order Tracking Portal & Phone-Gate Security', () => {
  it('correctly masks customer names for privacy', () => {
    expect(maskName('Nguyễn Văn An')).toBe('N****n V*n An');
    expect(maskName('Công Ty Cổ Phần Tập Đoàn Hoa Sen')).toBe('C**g Ty Cổ P**n T*p Đ**n H*a S*n');
    expect(maskName('')).toBe('Quý Khách Hàng');
  });

  it('correctly masks phone numbers', () => {
    expect(maskPhone('0938384265')).toBe('093****265');
    expect(maskPhone('0903123456')).toBe('090****456');
    expect(maskPhone('')).toBe('09********');
  });
});
