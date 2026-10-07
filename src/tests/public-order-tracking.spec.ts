import { describe, it, expect } from 'vitest';
import { maskName, maskPhone } from '@/src/features/tracking/PublicOrderTrackingPage';

describe('Phase 4: Public Order Tracking Portal & Phone-Gate Security', () => {
  it('correctly masks customer names for privacy with Enterprise Legal Entity Preservation', () => {
    // Cá nhân: Giữ họ và tên chính, che phần đệm
    expect(maskName('Nguyễn Văn An')).toBe('Nguyễn *** An');
    expect(maskName('Trần Thị Bích Ngọc')).toBe('Trần *** Ngọc');

    // Doanh nghiệp: Bảo toàn tiền tố pháp nhân (Công Ty TNHH, Cổ Phần, DNTN...), che phần tên thương mại trang nhã
    expect(maskName('Công Ty Cổ Phần Tập Đoàn Hoa Sen')).toBe('Công Ty Cổ Phần Tập *** Sen');
    expect(maskName('Công Ty TNHH Cơ Khí Sài Gòn')).toBe('Công Ty TNHH Cơ *** Gòn');
    expect(maskName('Công Ty TNHH Cơ Khí Công Nghiệp Sài Gòn')).toBe('Công Ty TNHH Cơ *** Gòn');

    // Fallback rỗng
    expect(maskName('')).toBe('Quý Khách Hàng');
  });

  it('correctly masks phone numbers', () => {
    expect(maskPhone('0938384265')).toBe('093****265');
    expect(maskPhone('0903123456')).toBe('090****456');
    expect(maskPhone('')).toBe('09********');
  });
});
