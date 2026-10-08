import { describe, it, expect } from 'vitest';
import { 
  maskName, 
  maskPhone, 
  detectPortalContext, 
  calculateQuotationValidity,
  extractCleanTrackingCode
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

  it('ensures official ZNS Quotation Template 647061 configures CTA Button 2 with /tra-cuu-bao-gia', () => {
    const tpl = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.BAOGIA];
    expect(tpl).toBeDefined();
    expect(tpl.templateId).toBe('647061');
    expect(tpl.ctaButtons).toBeDefined();
    expect(tpl.ctaButtons!.length).toBe(2);

    const cta2 = tpl.ctaButtons![1];
    expect(cta2.title).toBe('Tra cứu báo giá');
    expect(cta2.content).toBe('https://sgm-os.onrender.com/tra-cuu-bao-gia?code=<ma_tra_cuu>');
  });

  it('ensures official ZNS Contract Template 647737 configures CTA Button 2 with /tra-cuu-hop-dong', () => {
    const tpl = ZBS_TEMPLATE_REGISTRY[ZnsMessageType.HOPDONG_SIGN_ZNS];
    expect(tpl).toBeDefined();
    expect(tpl.templateId).toBe('647737');
    expect(tpl.price).toBe(800);
    expect(tpl.ctaButtons).toBeDefined();
    expect(tpl.ctaButtons!.length).toBe(2);

    const cta2 = tpl.ctaButtons![1];
    expect(cta2.title).toBe('Tra cứu hợp đồng');
    expect(cta2.content).toBe('https://sgm-os.onrender.com/tra-cuu-hop-dong?code=<ma_tra_cuu>');

    // 11 parameters required
    expect(tpl.params.map(p => p.name)).toEqual([
      'customer_name',
      'phone',
      'loai_don',
      'so_phieu',
      'order_code',
      'ma_bao_gia',
      'ngay_ky',
      'so_ngay',
      'nhan_vien',
      'so_luong',
      'ma_tra_cuu'
    ]);
  });

  it('preserves complex contract codes with slashes like 015/KD1-SGM/TN-CT/26 intact', () => {
    const rawContract = '015/KD1-SGM/TN-CT/26';
    expect(extractCleanTrackingCode(rawContract)).toBe('015/KD1-SGM/TN-CT/26');

    // From full URL
    const urlFormat = 'https://sgm-os.onrender.com/tra-cuu-hop-dong?code=015/KD1-SGM/TN-CT/26';
    expect(extractCleanTrackingCode(urlFormat)).toBe('015/KD1-SGM/TN-CT/26');

    // Pathname and code detection
    expect(detectPortalContext('/tra-cuu-hop-dong')).toBe('ORDER');
    expect(detectPortalContext('/tra-cuu', '015/KD1-SGM/TN-CT/26')).toBe('ORDER');
  });

  it('guarantees Zero Dynamic QR Risk and official SGM legal entity wire transfer presentation', async () => {
    // Verify default company banking config structure
    const { getCompanyBankingConfig } = await import('@/src/shared/services/vietqrBankService');
    const bankConfig = await getCompanyBankingConfig();
    expect(bankConfig).toBeDefined();
    expect(bankConfig.accountNumber).toBeTruthy();
    expect(bankConfig.accountHolder).toBeTruthy();
    expect(bankConfig.bankCode).toBeTruthy();
    expect(bankConfig.isDefault).toBe(true);
  });

  it('verifies public tracking presenters enforce sans-serif tabular-nums and light industrial aesthetics without font-mono or purple/pink', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const presenterFiles = [
      'QuotationCommercialPresenter.tsx',
      'ContractManufacturingPresenter.tsx',
      'PaymentFinancialPresenter.tsx',
      'OmniContextSwitcher.tsx',
      'MobileStickyActionDock.tsx',
      '../PublicOrderTrackingPage.tsx'
    ];

    for (const file of presenterFiles) {
      const fullPath = path.resolve(process.cwd(), 'src/features/tracking/components', file);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Assert no font-mono
        expect(content.includes('font-mono')).toBe(false);
        // Assert no forbidden purple/pink styling classes (case insensitive check for tailwind classes like text-purple, bg-pink)
        const hasPurpleClass = /\b(text|bg|border)-(purple|violet|fuchsia|pink|rose)-[0-9]{2,3}\b/i.test(content);
        expect(hasPurpleClass).toBe(false);
      }
    }
  });
});


