import { describe, it, expect } from 'vitest';
import { sequenceGeneratorService } from './sequence-generator.service';

describe('SequenceGeneratorService (Universal Sequence Engine)', () => {
  it('generates sequential codes for quotations with different types', async () => {
    const codeMachine = await sequenceGeneratorService.getNextCode('quotation', { loai: 'BG Máy', year: 2026 });
    expect(codeMachine).toMatch(/^BGM-2026-\d{4}$/);

    const codeMaterial = await sequenceGeneratorService.getNextCode('quotation', { loai: 'BG Vật tư', year: 2026 });
    expect(codeMaterial).toMatch(/^BGVT-2026-\d{4}$/);

    const codeService = await sequenceGeneratorService.getNextCode('quotation', { loai: 'BG Dịch vụ', year: 2026 });
    expect(codeService).toMatch(/^BGDV-2026-\d{4}$/);
  });

  it('generates sequential codes for contracts, payments and deliveries', async () => {
    const contractCode = await sequenceGeneratorService.getNextCode('contract', { year: 2026 });
    expect(contractCode).toMatch(/^HD-2026-\d{4}$/);

    const paymentCode = await sequenceGeneratorService.getNextCode('payment', { year: 2026 });
    expect(paymentCode).toMatch(/^PT-2026-\d{4}$/);

    const deliveryCode = await sequenceGeneratorService.getNextCode('delivery', { year: 2026 });
    expect(deliveryCode).toMatch(/^PGH-2026-\d{4}$/);
  });

  it('generates global sequential customer codes with KH prefix', async () => {
    const customerCode = await sequenceGeneratorService.getNextCode('customer');
    expect(customerCode).toMatch(/^KH\d{4}$/);
  });
});
