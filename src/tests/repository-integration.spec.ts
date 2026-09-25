import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerRepoSupabase } from '@/src/modules/customers';
import { QuotationRepoSupabase } from '../modules/sales/infrastructure/QuotationRepoSupabase';
import { ContractRepoSupabase } from '../modules/contracts/infrastructure/ContractRepoSupabase';
import { PaymentRepoSupabase } from '../modules/billing/infrastructure/PaymentRepoSupabase';
import { DeliveryRepoSupabase as DeliveryRepository } from '../modules/fulfillment/infrastructure/DeliveryRepoSupabase';
import { QUOTATION_LOAI } from '../domain/enums/quotation-loai';

vi.mock('@/src/shared/config/supabase.client', () => ({
  isSupabaseConfigured: false,
  supabase: {}
}));

describe('Repository Integration: KH → BG → HĐ → TT → GH', () => {
  let customerRepo: CustomerRepoSupabase;
  let quotationRepo: QuotationRepoSupabase;
  let contractRepo: ContractRepoSupabase;
  let paymentRepo: PaymentRepoSupabase;
  let deliveryRepo: DeliveryRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    customerRepo = new CustomerRepoSupabase();
    quotationRepo = new QuotationRepoSupabase();
    contractRepo = new ContractRepoSupabase();
    paymentRepo = new PaymentRepoSupabase();
    deliveryRepo = new DeliveryRepository();
  });

  it('should complete the full lifecycle KH → BG → HĐ → TT → GH', async () => {
    // 1. Tạo KH
    const cId = await customerRepo.create({ maKh: 'KH-100', fullName: 'Nguyen Van A' } as any);
    expect(cId).toBeDefined();

    // 2. Tạo Báo Giá
    const qRes = (await import('../modules/sales/domain/Quotation')).Quotation.create({ 
      customerId: cId, 
      loai: QUOTATION_LOAI.MAY, 
      totalAmount: 1000,
      items: []
    } as any, 'q123');
    await quotationRepo.save(qRes.getValue());
    
    const qs = await quotationRepo.list({ fkField: 'customerId', fkId: cId });
    expect(qs.length).toBe(1);
    expect(qs[0].id).toBe('q123');

    // 3. Tạo Hợp Đồng
    const ctId = 'CT_TEST_1';
    await contractRepo.save({ id: ctId, props: { quotationId: 'q123', customerId: cId, contractValue: 1000 } } as any);
    
    const updatedContract = await contractRepo.getById(ctId);
    expect(updatedContract).toBeDefined();
    expect(updatedContract?.props.quotationId).toBe('q123');

    // 4. Tạo Thanh Toán
    const pRes = (await import('../modules/billing/domain/Payment')).Payment.create({
      contractId: ctId,
      amount: 500
    } as any, 'p123');
    await paymentRepo.save(pRes.getValue());

    const payments = await paymentRepo.list({ fkField: 'contractId', fkId: ctId });
    expect(payments.length).toBe(1);

    // 5. Tạo Giao Hàng
    const dId = 'test-del-123';
    const delRes = (await import('../modules/fulfillment/domain/Delivery')).Delivery.create({
      deliveryId: 'D001',
      paymentId: 'p123',
      customerId: 'c-123',
    } as any, dId);
    await deliveryRepo.save(delRes.getValue());

    const delivery = await deliveryRepo.getById(dId);
    expect(delivery?.snapshot.paymentId).toBe('p123');
  });

  it('không record cũ bị ẩn và summary count khớp raw', async () => {
    // Tạo 3 KH
    const c1 = await customerRepo.create({ name: 'Active' } as any);
    const c2 = await customerRepo.create({ name: 'Soft Deleted' } as any);
    const c3 = await customerRepo.create({ name: 'Active 2' } as any);

    const c2Id = (c2 as any).id || c2;
    // Soft delete C2
    await customerRepo.softDelete(c2Id);

    const allActive = await customerRepo.list({});
    
    const isC2Found = allActive.find(c => c.id === c2Id);
    expect(isC2Found).toBeUndefined(); // should not be listed
    
    const withDeleted = await customerRepo.list({ ignoreDeletedAt: true });
    // This should include c2
    expect(withDeleted.find(c => c.id === c2Id)).toBeDefined();

    // The counts must match conceptually
    expect(allActive.length).toBeLessThan(withDeleted.length);
  });
});
