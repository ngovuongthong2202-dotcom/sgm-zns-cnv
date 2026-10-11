/** @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const { notifyMock, sendZnsAndToastMock } = vi.hoisted(() => ({
  notifyMock: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), loading: vi.fn(), dismiss: vi.fn() },
  sendZnsAndToastMock: vi.fn().mockResolvedValue({ success: true, status: 'SENT_WAITING' }),
}));
vi.mock('@/src/shared/utils/notify', () => ({ notify: notifyMock }));
vi.mock('@/src/domain/zns-client', () => ({ sendZnsAndToast: sendZnsAndToastMock, nextAttempt: () => 1, checkZnsResendAllowed: () => ({ allowed: true }) }));
vi.mock('@/src/modules/iam', () => ({ useAuth: () => ({ user: { uid: 'u1' }, userData: { role: 'Administrator', displayName: 'Ngô Vương Thông' } }) }));
vi.mock('@/src/platform/ui/zns/components/ZnsOfficialPhonePreview', () => ({ ZnsOfficialPhonePreview: () => null }));

import { UniversalZnsPreviewModal } from './UniversalZnsPreviewModal';
vi.stubGlobal('localStorage', (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window.localStorage);

const basePayload = { soHopDong: 'HD-2026-0002', soPhieuThu: 'PT-2026-0001', soTien: 30_000_000, ngayThanhToan: '2026-10-01', loai_don: 'Cung cấp Vật Tư' };

function renderModal(payload: Record<string, unknown>) {
  return render(
    <UniversalZnsPreviewModal
      isOpen
      onClose={vi.fn()}
      messageType="THANH_TOAN_XAC_NHAN"
      entityType="PAYMENT"
      entityId="p1"
      documentCode="PT-2026-0001"
      customerName="Công ty A"
      phone="0912345678"
      payload={payload}
    />
  );
}
const noteInput = () => screen.getByPlaceholderText('Nhập Ghi chú...') as HTMLInputElement; // placeholder = `Nhập ${param.label}...`, label của ghi_chu là "Ghi chú" (registry :168)
const sendButton = () => screen.getByRole('button', { name: /Xác nhận gửi ZNS/ });

describe('UniversalZnsPreviewModal – Đợt 0A (TT01): ô Ghi chú của mẫu 646935', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('payload chỉ có ghiChu nội bộ (không ghi_chu) → ô Ghi chú rỗng; ghi chú nội bộ và câu mặc định cũ không xuất hiện', () => {
    const { container } = renderModal({ ...basePayload, ghiChu: 'FT123 nội bộ - khách khó tính' });
    expect(noteInput().value).toBe('');
    expect(container.textContent).not.toContain('FT123 nội bộ');
    expect(container.textContent).not.toContain('Thanh toán đợt hợp đồng');
  });

  it('payload có ghi_chu "Thanh toán đợt 1" → ô Ghi chú hiện đúng câu đó (bản xem trước = tin gửi)', () => {
    renderModal({ ...basePayload, ghi_chu: 'Thanh toán đợt 1' });
    expect(noteInput().value).toBe('Thanh toán đợt 1');
  });

  it('gõ 31 ký tự vào ô Ghi chú rồi "Xác nhận gửi" → notify.error nêu "tối đa 30", không gọi sendZnsAndToast', async () => {
    renderModal({ ...basePayload, ghi_chu: 'Thanh toán đợt 1' });
    fireEvent.change(noteInput(), { target: { value: 'Thanh toan dot 1 - con lai 70tr' } }); // 31 ký tự ASCII (đếm chắc)
    expect(noteInput().value.length).toBe(31);
    fireEvent.click(sendButton());
    await waitFor(() => expect(notifyMock.error).toHaveBeenCalledWith(expect.stringContaining('tối đa 30')));
    expect(sendZnsAndToastMock).not.toHaveBeenCalled();
  });

  it('ô Ghi chú rỗng rồi "Xác nhận gửi" → notify.error "Thiếu nội dung", không gửi', async () => {
    renderModal({ ...basePayload });
    expect(noteInput().value).toBe('');
    fireEvent.click(sendButton());
    await waitFor(() => expect(notifyMock.error).toHaveBeenCalledWith(expect.stringContaining('Thiếu nội dung')));
    expect(sendZnsAndToastMock).not.toHaveBeenCalled();
  });
});
