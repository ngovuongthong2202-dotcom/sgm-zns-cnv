import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QuotationDetailDrawer } from './QuotationDetailDrawer';

import { Button } from '@/src/design-system/Button';

const mockQuotation = {
  id: 'q-1',
  soPhieuBaoGia: 'BG-2024-001',
  customerId: 'c-1',
  tenKhachHang: 'Công ty Cổ phần Mường Thanh',
  ngayBaoGia: '2024-01-15',
  ngayHetHan: '2024-02-15',
  hieuLuc: 30,
  nguoiPhuTrach: 'Nguyễn Văn A',
  tinhTrangBaoGia: 'MỚI',
  noiDungGhiChu: 'Báo giá dự án triển khai 3 máy giặt công nghiệp 50kg.',
  products: [
    { productName: 'Máy giặt công nghiệp 50kg Hwasung', quantity: 3, price: 150000000, unit: 'Máy' },
    { productName: 'Máy sấy công nghiệp 50kg', quantity: 3, price: 120000000, unit: 'Máy' },
    { productName: 'Bàn cầu là hơi', quantity: 1, price: 15000000, unit: 'Cái' },
    { productName: 'Hóa chất giặt tẩy sơ bộ', quantity: 10, price: 500000, unit: 'Can' },
  ],
  slMay: 6,
  loai: 'Máy'
} as any;

const meta: Meta<typeof QuotationDetailDrawer> = {
  title: 'Features/Quotations/QuotationDetailDrawer',
  component: QuotationDetailDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    quotation: mockQuotation,
    customers: [
      { id: 'c-1', maKh: 'KH001', tenKhachHang: 'Công ty Cổ phần Mường Thanh', sdt: '0901234567', email: '', linhVuc: '' }
    ] as any[],
    owners: ['Nguyễn Văn A', 'Trần Thị B', 'Lê Văn C'],
    statuses: ['MỚI', 'ĐANG CHỜ', 'ĐÃ CHỐT', 'HỦY'],
  }
};

export default meta;
type Story = StoryObj<typeof QuotationDetailDrawer>;

export const Default: Story = {
  render: (args) => {
    return (
      <div className="p-10 w-full h-screen bg-slate-100 flex items-center justify-center">
        <div className="absolute inset-x-0 bottom-0 top-0 pointer-events-none" />
        <Button aria-label="Nút bấm" 
          onClick={() => {}} 
          className="fixed left-4 top-4 bg-white border border-slate-200 px-4 py-2 rounded shadow-sm text-sm"
        >
          Trang web nền giả lập... (Drawer đang mở)
        </Button>
        <QuotationDetailDrawer {...args} />
      </div>
    );
  }
};
