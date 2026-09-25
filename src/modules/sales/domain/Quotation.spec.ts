import { describe, it, expect } from 'vitest';
import { Quotation, QuotationType, QuotationStatus } from './Quotation';

describe('Quotation Aggregate (NEXUS-OS Precision Calculation)', () => {
  it('calculates totalAmount correctly with discount and VAT', () => {
    const result = Quotation.create({
      customerId: 'CUST-100',
      type: QuotationType.MATERIAL,
      items: [
        { productId: 'PROD-1', quantity: 2, unitPrice: 5000000 }, // 10,000,000
        { productId: 'PROD-2', quantity: 1, unitPrice: 2000000 }  // 2,000,000
      ],
      discount: 2000000, // subtotal = 12,000,000 - 2,000,000 = 10,000,000
      vatRate: 10 // 10% of 10,000,000 = 1,000,000 -> total = 11,000,000
    }, 'QUOTE-TEST-001');

    expect(result.isSuccess).toBe(true);
    const q = result.getValue();
    expect(q.props.subtotal).toBe(12000000);
    expect(q.props.discount).toBe(2000000);
    expect(q.props.vatAmount).toBe(1000000);
    expect(q.props.totalAmount).toBe(11000000);
    expect(q.props.status).toBe(QuotationStatus.DRAFT);
  });

  it('rejects invalid quantities or negative unit prices', () => {
    const invalidQty = Quotation.create({
      customerId: 'CUST-100',
      type: QuotationType.SERVICE,
      items: [{ productId: 'PROD-1', quantity: 0, unitPrice: 100000 }]
    }, 'QUOTE-INVALID-1');
    expect(invalidQty.isFailure).toBe(true);

    const negativePrice = Quotation.create({
      customerId: 'CUST-100',
      type: QuotationType.SERVICE,
      items: [{ productId: 'PROD-1', quantity: 1, unitPrice: -500 }]
    }, 'QUOTE-INVALID-2');
    expect(negativePrice.isFailure).toBe(true);
  });

  it('correctly determines next step based on type', () => {
    const machineQ = Quotation.create({
      customerId: 'CUST-100',
      type: QuotationType.MACHINE,
      items: [{ productId: 'PROD-1', quantity: 1, unitPrice: 10000000 }]
    }, 'QUOTE-MACHINE').getValue();
    expect(machineQ.getNextStep()).toBe('Requires_Contract');

    const materialQ = Quotation.create({
      customerId: 'CUST-100',
      type: QuotationType.MATERIAL,
      items: [{ productId: 'PROD-1', quantity: 1, unitPrice: 500000 }]
    }, 'QUOTE-MATERIAL').getValue();
    expect(materialQ.getNextStep()).toBe('Requires_Payment');
  });
});
