import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomerCascadeImpactModal } from './CustomerCascadeImpactModal';
import { Customer } from '@/src/domain/schema/customer.schema';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { Contract } from '@/src/domain/schema/contract.schema';
import { Payment } from '@/src/domain/schema/payment.schema';
import { Delivery } from '@/src/domain/schema/delivery.schema';

describe('CustomerCascadeImpactModal Component', () => {
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
  };

  const mockUpdatedData: Partial<Customer> = {
    tenKhachHang: 'Tập đoàn Hoa Sen Group',
    sdt: '0988112233',
    diaChi: '456 Đại lộ Bình Dương'
  };

  const mockQuotations: Quotation[] = [
    {
      id: 'QUOTE-001',
      soPhieuBaoGia: 'BG-2026-001',
      customerId: 'CUST-001',
      loai: 'Tự động',
      lifecycleStatus: 'DRAFT',
      totalAmount: 150000000,
      ngayBaoGia: '2026-09-01'
    },
    {
      id: 'QUOTE-002',
      soPhieuBaoGia: 'BG-2026-002',
      customerId: 'CUST-001',
      loai: 'Tự động',
      lifecycleStatus: 'WON',
      totalAmount: 300000000,
      ngayBaoGia: '2026-08-15'
    }
  ];

  const mockContracts: Contract[] = [
    {
      id: 'CONT-001',
      soHopDong: 'HD-2026-001',
      soDonHang: 'DH-001',
      customerId: 'CUST-001',
      quotationId: 'QUOTE-002',
      totalAmount: 300000000,
      ngayKy: '2026-08-20'
    }
  ];

  const mockPayments: Payment[] = [
    {
      id: 'PAY-001',
      paymentId: 'PT-2026-001',
      customerId: 'CUST-001',
      totalAmount: 100000000,
      ngayThanhToan: '2026-08-22'
    }
  ];

  const mockDeliveries: Delivery[] = [
    {
      id: 'DEL-001',
      deliveryId: 'GH-2026-001',
      customerId: 'CUST-001',
      tinhTrangGiaoHang: 'CHO_GIAO',
      donViVanChuyen: 'Viettel Post',
      ngayGiaoMay: '2026-10-05'
    }
  ];

  it('renders visual diff accurately with changed fields and old/new values', () => {
    const handleClose = vi.fn();
    const handleSaveMasterOnly = vi.fn();
    const handleSafeSync = vi.fn();

    render(
      <CustomerCascadeImpactModal
        show={true}
        onClose={handleClose}
        originalCustomer={mockOriginalCustomer}
        updatedData={mockUpdatedData}
        linkedDocs={{
          quotations: mockQuotations,
          contracts: mockContracts,
          payments: mockPayments,
          deliveries: mockDeliveries
        }}
        onConfirmSaveMasterOnly={handleSaveMasterOnly}
        onConfirmSafeSync={handleSafeSync}
      />
    );

    expect(screen.getByText(/Phân tích Tác động Thay đổi Khách Hàng/i)).toBeInTheDocument();
    expect(screen.getByText('Công ty Cổ phần Thép Hoa Sen')).toBeInTheDocument();
    expect(screen.getByText('Tập đoàn Hoa Sen Group')).toBeInTheDocument();
    expect(screen.getByText('0902993093')).toBeInTheDocument();
    expect(screen.getByText('0988112233')).toBeInTheDocument();
  });

  it('triggers onConfirmSaveMasterOnly when user chooses to update only customer', () => {
    const handleClose = vi.fn();
    const handleSaveMasterOnly = vi.fn();
    const handleSafeSync = vi.fn();

    render(
      <CustomerCascadeImpactModal
        show={true}
        onClose={handleClose}
        originalCustomer={mockOriginalCustomer}
        updatedData={mockUpdatedData}
        linkedDocs={{
          quotations: mockQuotations,
          contracts: mockContracts,
          payments: mockPayments,
          deliveries: mockDeliveries
        }}
        onConfirmSaveMasterOnly={handleSaveMasterOnly}
        onConfirmSafeSync={handleSafeSync}
      />
    );

    const masterOnlyBtn = screen.getByText(/Chỉ lưu Khách Hàng/i);
    fireEvent.click(masterOnlyBtn);
    expect(handleSaveMasterOnly).toHaveBeenCalledTimes(1);
    expect(handleSafeSync).not.toHaveBeenCalled();
  });

  it('triggers onConfirmSafeSync when user clicks 1-Click safe sync button', () => {
    const handleClose = vi.fn();
    const handleSaveMasterOnly = vi.fn();
    const handleSafeSync = vi.fn();

    render(
      <CustomerCascadeImpactModal
        show={true}
        onClose={handleClose}
        originalCustomer={mockOriginalCustomer}
        updatedData={mockUpdatedData}
        linkedDocs={{
          quotations: mockQuotations,
          contracts: mockContracts,
          payments: mockPayments,
          deliveries: mockDeliveries
        }}
        onConfirmSaveMasterOnly={handleSaveMasterOnly}
        onConfirmSafeSync={handleSafeSync}
      />
    );

    const safeSyncBtn = screen.getByText(/1-Click Đồng bộ an toàn/i);
    fireEvent.click(safeSyncBtn);
    expect(handleSafeSync).toHaveBeenCalledTimes(1);
    expect(handleSaveMasterOnly).not.toHaveBeenCalled();
  });
});
