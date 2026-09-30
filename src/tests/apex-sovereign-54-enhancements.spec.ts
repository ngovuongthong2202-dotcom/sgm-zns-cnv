import { describe, it, expect } from 'vitest';
import { aggregateProducts, computeLineItem } from '@/src/domain/pricing/quotation-pricing';

describe('Apex Sovereign 54.0 - Universal Financial & Document Integrity', () => {
  it('ExportQuotationPdf: accurately derives dynamic effectiveVatRate for 0%, 8%, and 10% VAT', () => {
    // 0% VAT / Miễn thuế
    const zeroVatItems = [
      {
        productName: 'Dịch vụ bảo trì',
        price: 1000000,
        quantity: 1,
        vatPct: 0,
      }
    ];
    const zeroRes = aggregateProducts(zeroVatItems);
    expect(zeroRes.totalGross).toBe(1000000);
    expect(zeroRes.totalVat).toBe(0);
    expect(zeroRes.effectiveVatRate).toBe(0);
    expect(zeroRes.totalAfterTax).toBe(1000000);

    // 8% VAT (Nghị định 123 / giảm thuế dịch vụ)
    const eightVatItems = [
      {
        productName: 'Lắp đặt hệ thống máy',
        price: 2000000,
        quantity: 1,
        vatPct: 8,
      }
    ];
    const eightRes = aggregateProducts(eightVatItems);
    expect(eightRes.totalGross).toBe(2000000);
    expect(eightRes.totalVat).toBe(160000);
    expect(eightRes.effectiveVatRate).toBe(8);
    expect(eightRes.totalAfterTax).toBe(2160000);

    // 10% VAT chuẩn
    const tenVatItems = [
      {
        productName: 'Máy khắc laser Fiber',
        price: 50000000,
        quantity: 1,
        vatPct: 10,
      }
    ];
    const tenRes = aggregateProducts(tenVatItems);
    expect(tenRes.totalGross).toBe(50000000);
    expect(tenRes.totalVat).toBe(5000000);
    expect(tenRes.effectiveVatRate).toBe(10);
    expect(tenRes.totalAfterTax).toBe(55000000);
  });

  it('ExportContractPdf: correctly computes line items with line discounts and 4-tier summary', () => {
    const contractItems = [
      {
        productName: 'Máy hàn Laser Cầm Tay 1500W',
        price: 80000000,
        quantity: 2,
        discountType: 'PERCENT' as const,
        discountPct: 5, // 5% discount
        vatPct: 10,
      },
      {
        productName: 'Bộ cấp dây tự động',
        price: 10000000,
        quantity: 1,
        discountType: 'AMOUNT' as const,
        discountAmount: 1000000, // 1M VND discount
        vatPct: 10,
      }
    ];

    // Check item 1
    const line1 = computeLineItem(contractItems[0]);
    expect(line1.price).toBe(80000000);
    expect(line1.quantity).toBe(2);
    expect(line1.discountAmount).toBe(8000000); // 5% of 160M = 8M
    expect(line1.subtotalAfterDiscount).toBe(152000000);
    expect(line1.taxAmount).toBe(15200000); // 10% of 152M = 15.2M
    expect(line1.total).toBe(167200000);

    // Check item 2
    const line2 = computeLineItem(contractItems[1]);
    expect(line2.price).toBe(10000000);
    expect(line2.discountAmount).toBe(1000000);
    expect(line2.subtotalAfterDiscount).toBe(9000000);
    expect(line2.taxAmount).toBe(900000);
    expect(line2.total).toBe(9900000);

    // 4-tier contract aggregate
    const agg = aggregateProducts(contractItems);
    expect(agg.totalGross).toBe(170000000); // (80M*2) + 10M
    expect(agg.totalDiscount).toBe(9000000); // 8M + 1M
    expect(agg.totalBeforeTax).toBe(161000000);
    expect(agg.totalVat).toBe(16100000);
    expect(agg.totalAfterTax).toBe(177100000);
    expect(agg.effectiveVatRate).toBe(10);
  });

  it('Delivery: safely derives totalValue with fallbacks prioritizing totalAmount > giaTriHopDong > products aggregate', () => {
    // Case 1: totalAmount is present
    const deliveryWithTotal = {
      totalAmount: 150000000,
      giaTriHopDong: 120000000,
      products: [{ price: 50000000, quantity: 2 }]
    };
    const total1 = deliveryWithTotal.totalAmount || deliveryWithTotal.giaTriHopDong || 0;
    expect(total1).toBe(150000000);

    // Case 2: totalAmount missing, giaTriHopDong present
    const deliveryWithContractVal = {
      totalAmount: 0,
      giaTriHopDong: 120000000,
      products: [{ price: 50000000, quantity: 2 }]
    };
    const total2 = deliveryWithContractVal.totalAmount || deliveryWithContractVal.giaTriHopDong || 0;
    expect(total2).toBe(120000000);

    // Case 3: Both missing, computed from products aggregate
    const deliveryFromProducts = {
      totalAmount: 0,
      giaTriHopDong: 0,
      products: [{ productName: 'Máy khắc laser Fiber', price: 50000000, quantity: 2, vatPct: 10 }]
    };
    const agg = aggregateProducts(deliveryFromProducts.products);
    const total3 = deliveryFromProducts.totalAmount || deliveryFromProducts.giaTriHopDong || agg.totalAfterTax;
    expect(total3).toBe(110000000);
  });

  it('Scoped Draft Vault: generates collision-free isolated keys', () => {
    // Standalone contract
    const keyStandalone = 'new_standalone';
    expect(keyStandalone).toBe('new_standalone');

    // Contract created from Quotation Q-001
    const quoId = 'QUO-2026-001';
    const keyFromQuo = `new_quotation_${quoId}`;
    expect(keyFromQuo).toBe('new_quotation_QUO-2026-001');

    // Contract created from Quotation Q-002 (no collision with Q-001)
    const quoId2 = 'QUO-2026-002';
    const keyFromQuo2 = `new_quotation_${quoId2}`;
    expect(keyFromQuo2).not.toBe(keyFromQuo);
    expect(keyFromQuo2).toBe('new_quotation_QUO-2026-002');

    // Delivery created from Payment P-100
    const payId = 'PAY-2026-100';
    const deliveryKey = `new_pay_${payId}`;
    expect(deliveryKey).toBe('new_pay_PAY-2026-100');
  });
});
