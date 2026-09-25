import { describe, it, expect } from 'vitest';
import { validateDocumentUpdate } from './document-integrity.policy';

describe('Document Integrity Policy', () => {
  it('allows all changes when entity has no linked children', () => {
    const before = { totalAmount: 1000, customerId: 'c1', noiDungGhiChu: 'old note' };
    const after = { totalAmount: 2000, customerId: 'c2', noiDungGhiChu: 'new note' };

    const result = validateDocumentUpdate('quotation', before, after, false);
    expect(result.canUpdate).toBe(true);
  });

  it('allows administrative updates (notes, PIC) even when entity has linked children', () => {
    const before = { totalAmount: 1000, customerId: 'c1', noiDungGhiChu: 'old note', nguoiPhuTrach: 'NV1' };
    const after = { totalAmount: 1000, customerId: 'c1', noiDungGhiChu: 'new note', nguoiPhuTrach: 'NV2' };

    const result = validateDocumentUpdate('quotation', before, after, true);
    expect(result.canUpdate).toBe(true);
  });

  it('blocks changes to core financial and customer fields when entity has linked children', () => {
    const before = { totalAmount: 1000, customerId: 'c1', noiDungGhiChu: 'note' };
    const after = { totalAmount: 2000, customerId: 'c1', noiDungGhiChu: 'note' };

    const result = validateDocumentUpdate('quotation', before, after, true);
    expect(result.canUpdate).toBe(false);
    expect(result.forbiddenFieldsChanged).toContain('totalAmount');
  });

  it('blocks changes to customerId on contracts when payments exist', () => {
    const before = { customerId: 'c1', nguoiPhuTrach: 'NV1' };
    const after = { customerId: 'c2', nguoiPhuTrach: 'NV1' };

    const result = validateDocumentUpdate('contract', before, after, true);
    expect(result.canUpdate).toBe(false);
    expect(result.forbiddenFieldsChanged).toContain('customerId');
  });
});
