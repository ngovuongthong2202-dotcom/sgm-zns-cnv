import { describe, it, expect } from 'vitest';
import { 
  maskName, 
  maskPhone, 
  detectPortalContext, 
  calculateQuotationValidity 
} from '@/src/features/tracking/PublicOrderTrackingPage';
import { ZBS_TEMPLATE_REGISTRY } from '@/src/domain/constants/zbs-template.registry';
import { ZnsMessageType } from '@/src/domain/enums/zns-status';

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

  it('correctly detects portal context based on URL pathname, query code, and entity heuristic', () => {
    // 1. Explicit path routing
    expect(detectPortalContext('/tra-cuu-bao-gia?code=XYZ')).toBe('QUOTATION');
    expect(detectPortalContext('/tra-cuu-thanh-toan?code=XYZ')).toBe('PAYMENT');
    expect(detectPortalContext('/tra-cuu-don-hang?code=HD-2026-0001')).toBe('ORDER');

    // 2. Code prefix heuristics on generic routes
    expect(detectPortalContext('/tra-cuu', 'BG-2026-0012')).toBe('QUOTATION');
    expect(detectPortalContext('/tra-cuu', 'BGM-2026-1149')).toBe('QUOTATION');
    expect(detectPortalContext('/tracking', 'PT-2026-9999')).toBe('PAYMENT');
    expect(detectPortalContext('/tra-cuu-don-hang', 'HD-2026-0002')).toBe('ORDER');

    // 3. Fallback to entity type
    expect(detectPortalContext('/tra-cuu', '', { soPhieuBaoGia: 'BG-CUSTOM' })).toBe('QUOTATION');
    expect(detectPortalContext('/tra-cuu', '', { soHopDong: 'HD-CUSTOM' })).toBe('ORDER');
    expect(detectPortalContext('/tra-cuu', '', { paymentId: 'PAY-CUSTOM' })).toBe('PAYMENT');
  });

  it('calculates quotation validity and remaining days accurately', () => {
    const referenceDate = new Date(2026, 9, 8, 12, 0, 0); // 08/10/2026

    // Case 1: Expiry date in the future (15/10/2026 -> 7 days left)
    const validResult = calculateQuotationValidity(
      '08/10/2026',
      '15/10/2026',
      7,
      referenceDate
    );
    expect(validResult.isValid).toBe(true);
    expect(validResult.isExpired).toBe(false);
    expect(validResult.daysLeft).toBeGreaterThanOrEqual(7);

    // Case 2: Expiry date in the past (01/10/2026 -> expired)
    const expiredResult = calculateQuotationValidity(
      '20/09/2026',
      '01/10/2026',
      7,
      referenceDate
    );
    expect(expiredResult.isValid).toBe(false);
    expect(expiredResult.isExpired).toBe(true);
    expect(expiredResult.daysLeft).toBeLessThan(0);

    // Case 3: Auto-calculated expiry from ngayBaoGia + hieuLuc (08/10/2026 + 10 days)
    const autoCalcResult = calculateQuotationValidity(
      '08/10/2026',
      undefined,
      10,
      referenceDate
    );
    expect(autoCalcResult.isValid).toBe(true);
    expect(autoCalcResult.daysLeft).toBe(10);
  });

  it('ensures official ZNS Quotation Template 533064 configures CTA Button 2 with /tra-cuu-bao-gia', () => {
    const tpl = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.BAOGIA];
    expect(tpl).toBeDefined();
    expect(tpl.templateId).toBe('533064');
    expect(tpl.ctaButtons).toBeDefined();
    expect(tpl.ctaButtons!.length).toBe(2);

    const cta2 = tpl.ctaButtons![1];
    expect(cta2.title).toBe('Tra cứu báo giá');
    expect(cta2.content).toBe('https://sgm-os.onrender.com/tra-cuu-bao-gia?code=<ma_tra_cuu>');
  });
});

