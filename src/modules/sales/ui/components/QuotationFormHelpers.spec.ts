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
});
