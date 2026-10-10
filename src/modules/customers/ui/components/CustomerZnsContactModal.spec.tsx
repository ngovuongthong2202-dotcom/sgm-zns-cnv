/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { sendZnsAndToastMock, subscribeMock } = vi.hoisted(() => ({
  sendZnsAndToastMock: vi.fn().mockResolvedValue({ success: true, status: 'SENT_WAITING' }),
  subscribeMock: vi.fn(),
}));

vi.mock('@/src/domain/zns-client', () => ({
  sendZnsAndToast: sendZnsAndToastMock,
  nextAttempt: () => 1,
}));
vi.mock('@/src/modules/iam', () => ({
  useAuth: () => ({ user: { uid: 'u1' }, userData: { role: 'Administrator' } }),
}));
vi.mock('@/src/data/repositories/system.repo', () => ({
  znsMessagesRepo: { subscribe: subscribeMock },
}));
vi.mock('@/src/platform/ui/zns/UniversalZnsPreviewModal', () => ({
  UniversalZnsPreviewModal: () => null,
}));
vi.mock('@/src/shared/utils/notify', () => ({
  notify: { success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
}));

import { CustomerZnsContactModal } from './CustomerZnsContactModal';

const customer: any = {
  id: 'c1',
  maKh: 'KH0001',
  tenKhachHang: 'Công Ty TNHH Thép Việt',
  tenZns: 'Thép Việt',
  diaChi: '12 Lê Lợi, Quận 1, TP.HCM',
  contacts: [
    { nguoiDaiDien: 'Nguyễn Văn A', sdt: '0901234567', chucVu: 'Giám đốc' },
    { nguoiDaiDien: 'Trần Thị B', sdt: '0912345678', chucVu: 'Kế toán' },
  ],
};

function renderModal(extraProps: Record<string, unknown> = {}, messages: any[] = []) {
  subscribeMock.mockImplementation((_opts: unknown, cb: (rows: any[]) => void) => { cb(messages); return () => {}; });
  const onRefresh = vi.fn().mockResolvedValue(undefined);
  // extraProps được rải dưới dạng any để mô phỏng prop cũ `onUpdateCustomer` mà thành phần mới phải bỏ qua
  render(<CustomerZnsContactModal isOpen onClose={vi.fn()} customer={customer} onRefresh={onRefresh} {...(extraProps as any)} />);
  return { onRefresh };
}

describe('CustomerZnsContactModal – gửi ZNS theo đầu mối (Đợt 0A)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('"Gửi ngay" gửi đúng 1 tin cho đầu mối đó và KHÔNG ghi ngược hồ sơ khách', async () => {
    const onUpdateCustomer = vi.fn();
    renderModal({ onUpdateCustomer });
    const buttons = screen.getAllByRole('button', { name: /Gửi ngay/i });
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(sendZnsAndToastMock).toHaveBeenCalledTimes(1));
    expect(sendZnsAndToastMock.mock.calls[0][0]).toMatchObject({
      entityType: 'CUSTOMER',
      entityId: 'c1',
      phone: '0901234567',
      forceResend: true,
    });
    expect(onUpdateCustomer).not.toHaveBeenCalled();
  });

  it('"Gửi ZNS (N đầu mối)" gửi từng đầu mối đã chọn và KHÔNG ghi ngược hồ sơ khách', async () => {
    const onUpdateCustomer = vi.fn();
    renderModal({ onUpdateCustomer });
    fireEvent.click(screen.getByRole('button', { name: /Gửi ZNS \(2 đầu mối\)/i }));
    await waitFor(() => expect(sendZnsAndToastMock).toHaveBeenCalledTimes(2));
    const phones = sendZnsAndToastMock.mock.calls.map((call: any[]) => call[0].phone).sort();
    expect(phones).toEqual(['0901234567', '0912345678']);
    expect(onUpdateCustomer).not.toHaveBeenCalled();
  });

  it('đầu mối có tin đang chờ Zalo trả kết quả (SENT_WAITING) không được chọn sẵn, tránh gửi đúp', () => {
    renderModal({}, [{ id: 'm1', phone: '0901234567', status: 'SENT_WAITING', createdAt: '2026-10-09T01:00:00.000Z' }]);
    const footer = screen.getByText(/Đã chọn:/).textContent?.replace(/\s+/g, ' ') || '';
    expect(footer).toContain('1 / 2');
  });
});
