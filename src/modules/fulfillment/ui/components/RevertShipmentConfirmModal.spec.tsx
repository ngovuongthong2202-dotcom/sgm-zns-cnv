/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RevertShipmentConfirmModal } from './RevertShipmentConfirmModal';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';

beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
});

const product = { productName: 'Máy dán cạnh', productId: 'M1', quantity: 1, price: 1, unit: 'Máy' };
const ship = (n: number, over: Partial<DeliveryShipment> = {}): DeliveryShipment => ({
  id: `DOT-${n}`, dotGiaoHang: n, soPhieuXuat: `PXK-${n}`, products: [product], danhSachMaMay: [`SN-${n}`], dvt: 'Máy',
  tinhTrangGiaoHang: 'HOAN_TAT', ngayGiaoThucTe: `2026-10-0${n}`, kyNhan: `Người ký ${n}`, tinhTrangNghiemThu: 'DONG_Y',
  dacCachGiaoTruoc: false, isDotCuoiCung: false, ...over,
} as DeliveryShipment);
const delivery = (shipments: DeliveryShipment[], over: Partial<Delivery> = {}): Delivery => ({
  id: 'd1', deliveryId: 'PGH-2026-0001', customerId: 'kh1', products: [{ ...product, quantity: 2 }], tinhTrangGiaoHang: 'Hoàn tất', ngayGiaoThucTe: '2026-10-02',
  kyNhan: 'Người ký 2', cacDotGiao: shipments, ...over,
} as unknown as Delivery);

describe('RevertShipmentConfirmModal – Đợt 0A (GH01)', () => {
  it('liệt kê những gì sẽ xóa, trạng thái phiếu sẽ chuyển (không bao giờ "Chưa giao"), và những gì giữ nguyên', () => {
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1)} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText(/Hủy xác nhận Đợt 1 – PXK-1/)).toBeTruthy();
    expect(screen.getByText(/01\/10\/2026/)).toBeTruthy();
    expect(screen.getByText(/Người ký 1/)).toBeTruthy();
    expect(screen.getByText(/Đã giao → Chờ giao/)).toBeTruthy();
    expect(screen.getByText(/Hoàn tất → Đang giao \(còn 1 đợt đã giao\)/)).toBeTruthy();
    expect(screen.queryByText(/Chưa giao/)).toBeNull();
    expect(screen.getByText(/tin Zalo đã gửi/i)).toBeTruthy();
  });

  it('không còn đợt nào đã giao sau khi hủy → phiếu vẫn chuyển "Đang giao" (không "Chưa giao")', () => {
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2, { tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '' })], { tinhTrangGiaoHang: 'Đang giao' })} shipment={ship(1)} onCancel={() => {}} onConfirm={() => {}} />);
    expect(screen.getByText(/Đang giao → Đang giao \(còn 0 đợt đã giao\)/)).toBeTruthy();
  });

  it('ô lý do trống, nút xác nhận vô hiệu; gõ khoảng trắng vẫn vô hiệu; gõ ≥ 5 ký tự thì bật', () => {
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1)} onCancel={() => {}} onConfirm={() => {}} />);
    const reason = screen.getByLabelText(/Lý do hủy xác nhận/) as HTMLTextAreaElement;
    const confirmBtn = screen.getByRole('button', { name: 'Hủy xác nhận đợt 1' }) as HTMLButtonElement;
    expect(reason.value).toBe('');
    expect(reason.placeholder).not.toMatch(/Đặc cách|Khách/);
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(reason, { target: { value: '      ' } });
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(reason, { target: { value: 'Giao nhầm' } });
    expect(confirmBtn.disabled).toBe(false);
  });

  it('Quay lại → onCancel, không onConfirm', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1)} onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('xác nhận → onConfirm một lần với lý do đã cắt khoảng trắng; bấm lần hai khi đang chờ không gọi thêm', async () => {
    let release: () => void = () => {};
    const onConfirm = vi.fn(() => new Promise<void>(resolve => { release = resolve; }));
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1)} onCancel={() => {}} onConfirm={onConfirm} />);
    fireEvent.change(screen.getByLabelText(/Lý do hủy xác nhận/), { target: { value: '  Khách chưa nhận hàng  ' } });
    const confirmBtn = screen.getByRole('button', { name: 'Hủy xác nhận đợt 1' }) as HTMLButtonElement;
    fireEvent.click(confirmBtn);
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith('Khách chưa nhận hàng');
    expect(confirmBtn.disabled).toBe(true);
    release();
    await waitFor(() => expect(confirmBtn.disabled).toBe(false));
  });

  it('phím Escape → onCancel', () => {
    const onCancel = vi.fn();
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1)} onCancel={onCancel} onConfirm={() => {}} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalled();
  });

  it('đợt đích không thuộc phiếu (khác số phiếu xuất) → báo lỗi trong ô amber, không có khối "Sẽ xóa" lẫn ô lý do, nút xác nhận vô hiệu; vẫn Quay lại được', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1, { soPhieuXuat: 'PXK-KHAC' })} onCancel={onCancel} onConfirm={onConfirm} />);
    const error = screen.getByText(/Không tìm thấy đợt giao cần hủy xác nhận/);
    expect(error.className).toMatch(/amber/);
    expect(error.className).not.toMatch(/-red-/);
    expect(screen.queryByText(/Sẽ xóa khỏi đợt này/)).toBeNull();
    expect(screen.queryByLabelText(/Lý do hủy xác nhận/)).toBeNull();
    const confirmBtn = screen.getByRole('button', { name: 'Hủy xác nhận đợt 1' }) as HTMLButtonElement;
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.click(confirmBtn);
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('độ dài tối thiểu tính sau khi cắt khoảng trắng: 4 ký tự (dù đệm khoảng trắng) vẫn vô hiệu, đúng 5 ký tự thì bật', () => {
    render(<RevertShipmentConfirmModal delivery={delivery([ship(1), ship(2)])} shipment={ship(1)} onCancel={() => {}} onConfirm={() => {}} />);
    const reason = screen.getByLabelText(/Lý do hủy xác nhận/);
    const confirmBtn = screen.getByRole('button', { name: 'Hủy xác nhận đợt 1' }) as HTMLButtonElement;
    fireEvent.change(reason, { target: { value: '  abcd  ' } });
    expect(confirmBtn.disabled).toBe(true);
    fireEvent.change(reason, { target: { value: '  abcde  ' } });
    expect(confirmBtn.disabled).toBe(false);
  });
});
