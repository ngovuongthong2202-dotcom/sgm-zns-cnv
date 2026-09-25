import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QuotationFormModal } from './QuotationFormModal';

const meta: Meta<typeof QuotationFormModal> = {
  title: 'Features/Quotations/QuotationFormModal',
  component: QuotationFormModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    quotation: null,
    customers: [
      { id: 'c-1', maKh: 'KH001', tenKhachHang: 'Công ty Cổ phần Mường Thanh', sdt: '0901234567', loaiKh: 'Doanh nghiệp', contacts: [] } as unknown as any
    ],
    nguoiPhuTrachList: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C'],
    loaiBaoGiaList: ['BG Máy', 'BG Vật tư', 'BG Dịch vụ'],
    loaiKhachHangList: ['Khách lẻ', 'Khách VIP', 'Đại lý'],
  }
};

export default meta;
type Story = StoryObj<typeof QuotationFormModal>;

export const DefaultNew: Story = {
  render: (args) => {
    return (
      <div className="p-10 w-full h-screen bg-slate-100 flex items-center justify-center">
        <QuotationFormModal {...args} />
      </div>
    );
  }
};

export const EditingExisting: Story = {
  render: (args) => {
    return (
       <div className="p-10 w-full h-screen bg-slate-100 flex items-center justify-center">
        <QuotationFormModal {...args} quotation={{
            id: 'q-1',
            soPhieuBaoGia: 'BG-2026-009',
            customerId: 'c-1',
            tenKhachHang: 'Công ty Cổ phần Mường Thanh',
            ngayBaoGia: '2026-05-11',
            ngayHetHan: '2026-05-18',
            hieuLuc: '7',
            nguoiPhuTrach: 'Nguyễn Văn A',
            tinhTrangBaoGia: 'MỚI',
            loai: 'BG Dịch vụ',
            ghiChu: 'Báo giá đã kèm VAT.',
            products: [{ productName: 'Gói bảo trì năm', quantity: 1, price: 5000000, unit: 'Gói' }]
        } as unknown as any} />
      </div>
    );
  }
};
