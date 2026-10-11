import { describe, it, expect, vi, beforeEach } from 'vitest';

const { notifyMock, gateMock } = vi.hoisted(() => ({ notifyMock: { info: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() }, gateMock: vi.fn() }));
vi.mock('@/src/shared/utils/notify', () => ({ notify: notifyMock }));
vi.mock('@/src/domain/workflow-ui', () => ({ checkWorkflowGate: gateMock }));

import { gateCreatePaymentForContract } from './payment-gate';
import type { Payment } from '@/src/domain/schema/payment.schema';

const contract = { id: 'c1', soHopDong: 'HD-2026-0002' };
const linked = [{ id: 'p1', paymentId: 'PT-2026-0001', contractId: 'c1' }] as unknown as Payment[];

describe('gateCreatePaymentForContract – Đợt 0A (TT04): một đường cho ngăn chi tiết và nút trên dòng', () => {
  beforeEach(() => { vi.clearAllMocks(); gateMock.mockResolvedValue(true); });

  it('hợp đồng đã có phiếu thu liên kết → false, báo "Mỗi hợp đồng chỉ tạo 1 phiếu thu", không gọi chốt', async () => {
    const ok = await gateCreatePaymentForContract(contract, linked, 'a@sgm.vn');
    expect(ok).toBe(false);
    expect(notifyMock.info).toHaveBeenCalledWith('Hợp đồng HD-2026-0002 đã có phiếu thanh toán (PT-2026-0001). Mỗi hợp đồng chỉ tạo 1 phiếu thu duy nhất!');
    expect(gateMock).not.toHaveBeenCalled();
  });

  it('chưa có phiếu → gọi checkWorkflowGate("PAYMENT", id, "contracts", email) và trả kết quả của chốt', async () => {
    expect(await gateCreatePaymentForContract(contract, [], 'a@sgm.vn')).toBe(true);
    expect(gateMock).toHaveBeenCalledWith('PAYMENT', 'c1', 'contracts', 'a@sgm.vn');
    gateMock.mockResolvedValue(false);
    expect(await gateCreatePaymentForContract(contract, [], undefined)).toBe(false);
  });
});
