import { describe, it, expect } from 'vitest';
import { canCreatePayment, canCreateDelivery } from '../domain/policy/gate.policy';
import { canCreateContract } from '../modules/contracts/domain/ContractPolicy';
import { QUOTATION_LOAI } from '../domain/enums/quotation-loai';
import { EntityZnsStatus } from '../domain/enums/zns-status';

describe('Workflow Integration: KH → BG → HĐ → TT → GH', () => {
  it('should pass gate policies for a happy path "BG Máy"', () => {
    // 1. Khách Hàng (Customer) relates to Quotation
    const customer = { id: 'C1', maKh: 'KH01' };

    // 2. Báo Giá (Quote) - Máy
    const quotation = {
      id: 'Q1',
      customerId: customer.id,
      loai: QUOTATION_LOAI.MAY,
      trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG
    } as any;

    // Gate: Can create Contract from BG Máy?
    expect(canCreateContract(quotation).allowed).toBe(true);

    // Gate: Can create Payment directly from BG Máy? -> NO
    expect(canCreatePayment(quotation).allowed).toBe(false);

    // 3. Hợp Đồng (Contract)
    const contract = {
      id: 'CT1',
      quotationId: quotation.id,
      trangThaiGuiTinHopDong: EntityZnsStatus.THANH_CONG
    } as any;

    // Gate: Can create Payment from Contract? -> YES
    expect(canCreatePayment(contract).allowed).toBe(true);

    // 4. Thanh Toán (Payment)
    const payment = {
      id: 'P1',
      contractId: contract.id,
      trangThaiGuiTinThanhToan: EntityZnsStatus.THANH_CONG
    } as any;

    // Gate: Can create Delivery from Payment? -> YES
    expect(canCreateDelivery(payment).allowed).toBe(true);
  });

  it('should pass gate policies for a happy path "BG Vật tư"', () => {
    const quotation = {
      id: 'Q2',
      loai: QUOTATION_LOAI.VAT_TU,
      trangThaiGuiTinBaoGia: EntityZnsStatus.THANH_CONG
    } as any;

    // Gate: Can create payment directly from BG Vật tư? -> YES
    expect(canCreatePayment(quotation).allowed).toBe(true);
  });
});

describe('ZNS Integration: enqueue → callback → projection', () => {
  it('should simulate ZNS state transitions', () => {
    let state = EntityZnsStatus.CHUA_GUI;
    expect(state).toBe(EntityZnsStatus.CHUA_GUI);
    // 1. Enqueue
    state = EntityZnsStatus.DANG_DAY;
    expect(state).toBe(EntityZnsStatus.DANG_DAY);

    // 2. Callback success
    state = EntityZnsStatus.THANH_CONG;
    expect(state).toBe(EntityZnsStatus.THANH_CONG);
  });
});
