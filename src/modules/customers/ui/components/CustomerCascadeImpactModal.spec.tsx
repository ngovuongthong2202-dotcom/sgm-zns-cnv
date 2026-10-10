/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerCascadeImpactModal } from './CustomerCascadeImpactModal';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';

describe('CustomerCascadeImpactModal (Đợt 0A – chỉ-đọc, một hành động)', () => {
  const mockOriginalCustomer: Customer = {
    id: 'CUST-001',
    maKh: 'KH-001',
    tenKhachHang: 'Công ty Cổ phần Thép Hoa Sen',
    sdt: '0902993093',
    nguoiDaiDien: 'Nguyễn Văn Hoa',
    diaChi: '123 Quốc lộ 1A',
    tinhThanh: 'Bình Dương',
    maSoThue: '0301234567',
    loaiKh: 'Doanh nghiệp',
    nguoiPhuTrach: 'Ngô Vương Thông'
  } as unknown as Customer;

  const mockUpdatedData: Partial<Customer> = {
    tenKhachHang: 'Tập đoàn Hoa Sen Group',
    sdt: '0988112233',
    diaChi: '456 Đại lộ Bình Dương'
  };

  const linkedDocs = {
    quotations: [
      { id: 'QUOTE-001', soPhieuBaoGia: 'BG-2026-001', customerId: 'CUST-001', lifecycleStatus: 'DRAFT', totalAmount: 150000000, ngayBaoGia: '2026-09-01' },
      { id: 'QUOTE-002', soPhieuBaoGia: 'BG-2026-002', customerId: 'CUST-001', lifecycleStatus: 'WON', totalAmount: 300000000, ngayBaoGia: '2026-08-15' }
    ] as unknown as Quotation[],
    contracts: [
      { id: 'CONT-001', soHopDong: 'HD-2026-001', customerId: 'CUST-001', totalAmount: 300000000, ngayKy: '2026-08-20' }
    ] as unknown as Contract[],
    payments: [
      { id: 'PAY-001', paymentId: 'PT-2026-001', customerId: 'CUST-001', totalAmount: 100000000, ngayThanhToan: '2026-08-22' }
    ] as unknown as Payment[],
    deliveries: [
      { id: 'DEL-001', deliveryId: 'GH-2026-001', customerId: 'CUST-001', tinhTrangGiaoHang: 'CHO_GIAO', donViVanChuyen: 'Viettel Post', ngayGiaoMay: '2026-10-05' }
    ] as unknown as Delivery[]
  };

  const renderModal = () => {
    const onClose = vi.fn();
    const onConfirmSaveMasterOnly = vi.fn().mockResolvedValue(undefined);
    render(
      <CustomerCascadeImpactModal
        show={true}
        onClose={onClose}
        originalCustomer={mockOriginalCustomer}
        updatedData={mockUpdatedData}
        linkedDocs={linkedDocs}
        onConfirmSaveMasterOnly={onConfirmSaveMasterOnly}
      />
    );
    return { onClose, onConfirmSaveMasterOnly };
  };

  it('hiển thị bảng so sánh cũ/mới của các trường đã đổi', () => {
    renderModal();
    expect(screen.getByText(/Phân tích Tác động Thay đổi Khách Hàng/i)).toBeTruthy();
    expect(screen.getAllByText('Công ty Cổ phần Thép Hoa Sen').length).toBeGreaterThan(0);
    expect(screen.getByText('Tập đoàn Hoa Sen Group')).toBeTruthy();
    expect(screen.getByText('0902993093')).toBeTruthy();
    expect(screen.getByText('0988112233')).toBeTruthy();
  });

  it('"Chỉ lưu Khách Hàng" gọi onConfirmSaveMasterOnly đúng 1 lần', () => {
    const { onConfirmSaveMasterOnly } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Chỉ lưu Khách Hàng/i }));
    expect(onConfirmSaveMasterOnly).toHaveBeenCalledTimes(1);
  });

  it('không còn nút "1-Click Đồng bộ an toàn", ô chọn phạm vi hay nhãn "Sẵn sàng đồng bộ"; chứng từ được ghi rõ "Giữ nguyên"', () => {
    renderModal();
    expect(screen.queryByRole('button', { name: /1-Click Đồng bộ an toàn/i })).toBeNull();
    expect(screen.queryByText(/Sẵn sàng đồng bộ/i)).toBeNull();
    expect(screen.queryByText(/Cập nhật theo KH mới/i)).toBeNull();
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
    expect(screen.getAllByText(/Giữ nguyên/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Quay lại chỉnh sửa/i })).toBeTruthy();
  });

  it('"Quay lại chỉnh sửa" gọi onClose', () => {
    const { onClose } = renderModal();
    fireEvent.click(screen.getByRole('button', { name: /Quay lại chỉnh sửa/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
