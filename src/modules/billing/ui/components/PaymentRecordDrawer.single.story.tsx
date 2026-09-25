import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { PaymentRecordDrawer } from './PaymentRecordDrawer';

const meta: Meta<typeof PaymentRecordDrawer> = {
  title: 'Features/Payments/PaymentRecordDrawer.single',
  component: PaymentRecordDrawer,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    isOpen: true,
    payments: [],
    contracts: [
      { id: 'con-1', soHopDong: 'HD-2026-001/SGM', customerId: 'c-1', tenKhachHang: 'CÔNG TY TNHH BÁCH KHÓA', totalAmount: 11000000, products: [] } as any
    ],
    quotations: [],
    onClose: () => console.log('Payment drawer closed'),
    onSave: async (data) => console.log('Saved Payment Giai Doan:', data),
  }
};

export default meta;
type Story = StoryObj<typeof PaymentRecordDrawer>;

export const DefaultNewTransaction: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <PaymentRecordDrawer {...args} />
    </div>
  )
};

export const ViewingSettledPayment: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <PaymentRecordDrawer 
        {...args} 
        payment={{
          id: 'pay-424',
          paymentId: 'TT-TT-015',
          customerId: 'c-1',
          tenKhachHang: 'CÔNG TY TNHH BÁCH KHÓA',
          maKh: 'KH-BK-11',
          sdt: '0901234567',
          soHopDong: 'HD-2026-001/SGM',
          contractId: 'con-1',
          soTien: 11000000,
          ngayThanhToan: '2026-05-26',
          tinhTrangThanhToan: 'Tất toán',
          phuongThucThanhToan: 'Chuyển khoản',
          hinhThucChungTu: 'UNC',
          soChungTu: 'UNC-00824',
          products: [
            { productName: 'Thiết bị SGM 1', quantity: 1, price: 10000000, unit: 'Máy' }
          ]
        } as unknown as any}
      />
    </div>
  )
};

export const ErrorOrOverpaidState: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <PaymentRecordDrawer 
        {...args} 
        payment={{
          id: 'pay-over',
          paymentId: 'TT-CN-092',
          contractId: 'con-1',
          soTien: 151000000,
          tinhTrangThanhToan: 'Chưa TT',
          products: []
        } as unknown as any}
      />
    </div>
  )
};
