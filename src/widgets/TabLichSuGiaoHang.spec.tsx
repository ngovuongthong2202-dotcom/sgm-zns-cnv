/** @vitest-environment jsdom */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/src/modules/fulfillment/ui/components/ExportHandoverPdf', () => ({ ExportHandoverPdf: () => <span data-testid="pdf" /> }));

import { TabLichSuGiaoHang } from './TabLichSuGiaoHang';
import type { Delivery, DeliveryShipment } from '@/src/domain/schema/delivery.schema';

const product = { productName: 'Máy dán cạnh', productId: 'M1', quantity: 1, price: 1_000_000, unit: 'Máy' };
const ship = (n: number, over: Partial<DeliveryShipment> = {}): DeliveryShipment => ({
  id: `DOT-${n}`, dotGiaoHang: n, soPhieuXuat: `PXK-${n}`, products: [product], danhSachMaMay: [`SN-${n}`], dvt: 'Máy',
  tinhTrangGiaoHang: 'CHO_GIAO', ngayGiaoThucTe: null, kyNhan: '', tinhTrangNghiemThu: 'DONG_Y', dacCachGiaoTruoc: false, isDotCuoiCung: false, ...over,
} as DeliveryShipment);
const done = (n: number, over: Partial<DeliveryShipment> = {}) => ship(n, { tinhTrangGiaoHang: 'HOAN_TAT', ngayGiaoThucTe: `2026-10-0${n}`, kyNhan: `Người ký ${n}`, ...over });
const delivery = (shipments: DeliveryShipment[]): Delivery => ({
  id: 'd1', deliveryId: 'PGH-2026-0001', customerId: 'kh1', tenKhachHang: 'Công ty A', products: [{ ...product, quantity: 2 }],
  tinhTrangGiaoHang: 'Đang giao', cacDotGiao: shipments,
} as unknown as Delivery);

describe('TabLichSuGiaoHang – Đợt 0A (GH01): "Sửa" thành "Hủy xác nhận đợt n"', () => {
  it('đợt đã giao, canEdit, có onRevertShipment → nút "Hủy xác nhận đợt 1" kiểu amber; không còn nút "Sửa"; bấm gọi đúng một lần với đợt đó', () => {
    const onRevert = vi.fn();
    const onConfirm = vi.fn();
    render(<TabLichSuGiaoHang delivery={delivery([done(1), ship(2)])} onRevertShipment={onRevert} onConfirmShipment={onConfirm} canEdit />);
    const btn = screen.getByRole('button', { name: 'Hủy xác nhận đợt 1' });
    expect(btn.className).toMatch(/amber/);
    expect(screen.queryByRole('button', { name: 'Sửa' })).toBeNull();
    expect(screen.queryByText(/^Sửa$/)).toBeNull();
    fireEvent.click(btn);
    expect(onRevert).toHaveBeenCalledTimes(1);
    expect(onRevert.mock.calls[0][0]).toMatchObject({ id: 'DOT-1', dotGiaoHang: 1 });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('canEdit=false hoặc không có onRevertShipment → không có nút hủy xác nhận', () => {
    const { unmount } = render(<TabLichSuGiaoHang delivery={delivery([done(1)])} onRevertShipment={vi.fn()} canEdit={false} />);
    expect(screen.queryByRole('button', { name: /Hủy xác nhận đợt/ })).toBeNull();
    unmount();
    render(<TabLichSuGiaoHang delivery={delivery([done(1)])} canEdit />);
    expect(screen.queryByRole('button', { name: /Hủy xác nhận đợt/ })).toBeNull();
  });

  it('đợt chưa giao → nút "Xác nhận giao Đợt 2", không có nút hủy xác nhận cho đợt đó', () => {
    render(<TabLichSuGiaoHang delivery={delivery([done(1), ship(2)])} onRevertShipment={vi.fn()} onConfirmShipment={vi.fn()} canEdit />);
    expect(screen.getByRole('button', { name: /Xác nhận giao Đợt 2/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Hủy xác nhận đợt 2' })).toBeNull();
  });

  it('đợt có lichSuHuyXacNhan → hiện dòng lịch sử mới nhất với ngày cũ, người ký cũ và lý do', () => {
    const history = [{ thoiDiem: '2026-10-11T08:00:00.000Z', nguoiThucHien: 'Quản trị', lyDo: 'Giao nhầm địa chỉ', ngayGiaoThucTeCu: '2026-10-01', kyNhanCu: 'Người ký 1' }];
    render(<TabLichSuGiaoHang delivery={delivery([ship(1, { lichSuHuyXacNhan: history })])} canEdit />);
    const line = screen.getByText(/Đã hủy xác nhận/);
    expect(line.textContent).toContain('Quản trị');
    expect(line.textContent).toContain('Giao nhầm địa chỉ');
    expect(line.textContent).toContain('01/10/2026');
    expect(line.textContent).toContain('Người ký 1');
  });
});
