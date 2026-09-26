import { describe, it, expect } from 'vitest';
import { normalizeQuotationFormValues } from './QuotationFormHelpers';
import { QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

describe('QuotationFormHelpers', () => {
  it('should normalize quotation fields and preserve existing ones (không mất field)', () => {
    const rawData: any = {
      id: 'bg-123',
      soPhieuBaoGia: ' bG-m-123  ',
      tenKhachHang: 'công ty  TNHH   abc ',
      nguoiDaiDien: 'nguyễn văn  a ',
      sdt: ' 090 123 4567 ',
      slMay: ' 3 ',
      // Additional properties that should be preserved!
      loai: QUOTATION_LOAI.MAY,
      tinhTrangBaoGia: 'MỚI',
      trangThaiGuiTinBaoGia: EntityZnsStatus.CHUA_GUI,
      hiddenFieldTest: 'preserved'
    };

    const result = normalizeQuotationFormValues(rawData);

    // Assertions on changed fields
    expect(result.soPhieuBaoGia).toBe('BG-M-123'); // normalizeCode
    expect(result.tenKhachHang).toBe('Công Ty TNHH Abc'); // normalizeBusinessName
    expect(result.nguoiDaiDien).toBe('Nguyễn Văn A'); // normalizePersonName
    expect(result.sdt).toBe('0901234567'); // normalizePhoneVN
    expect(result.slMay).toBe(3); // Cast to Number
    
    // Assertions on preserved fields
    expect(result.id).toBe('bg-123');
    expect(result.loai).toBe(QUOTATION_LOAI.MAY);
    expect(result.tinhTrangBaoGia).toBe('MỚI');
    expect((result as any).hiddenFieldTest).toBe('preserved');
  });

  it('should auto-heal financial calculations and VAT from products', () => {
    const rawData: any = {
      soPhieuBaoGia: 'BG-001',
      products: [
        {
          productId: 'M-1',
          productName: 'Máy 1',
          quantity: 1,
          price: 1010000000,
          vatPct: 8,
          subtotalBeforeTax: 0, // stale 0
          taxAmount: 0,         // stale 0
          subtotalAfterTax: 0   // stale 0
        },
        {
          productId: 'M-2',
          productName: 'Máy 2',
          quantity: 1,
          price: 1040000000,
          vatPct: 8
        },
        {
          productId: 'M-3',
          productName: 'Máy 3',
          quantity: 1,
          price: 1110000000,
          vatPct: 8
        }
      ]
    };

    const result = normalizeQuotationFormValues(rawData);

    // Long Phat Scenario
    expect(result.subTotal).toBe(3160000000);
    expect(result.vatAmount).toBe(252800000);
    expect(result.totalAmount).toBe(3412800000);
    expect(result.vatRate).toBe(8);
    expect(result.slMay).toBe(3);

    // Row-level healed assertions
    expect(result.products![0].subtotalBeforeTax).toBe(1010000000);
    expect(result.products![0].taxAmount).toBe(80800000);
    expect(result.products![0].subtotalAfterTax).toBe(1090800000);
  });
});
