import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { DeliveryFormModal } from './DeliveryFormModal';

const meta: Meta<typeof DeliveryFormModal> = {
  title: 'Features/Deliveries/DeliveryFormModal.single',
  component: DeliveryFormModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    payments: [
      { id: 'pay-1', paymentId: 'TT-TT-001', customerId: 'c-1', tenKhachHang: 'CÔNG TY TNHH BÁCH KHÓA', tinhTrangThanhToan: 'Tất toán', totalAmount: 11000000, products: [{ productName: 'Thiết bị SGM 1', quantity: 1, price: 10000000, unit: 'Máy', soNgayBaoHanh: 365 }] }
    ],
    contracts: [],
    quotations: [],
    nguoiPhuTrachList: ['Đỗ Hoà', 'Phạm Minh', 'Trần Thắng'],
    onClose: () => console.log('Delivery form closed'),
    onSave: async (dataItem: any) => console.log('Saved Delivery details:', dataItem),
  }
};

export default meta;
type Story = StoryObj<typeof DeliveryFormModal>;

export const RegisterNewDelivery: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-[95vh] flex items-center justify-center">
      <DeliveryFormModal {...args} />
    </div>
  )
};

export const EditOngoingDeliveryShipmentItem: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-[95vh] flex items-center justify-center">
      <DeliveryFormModal 
        {...args} 
        delivery={{
          id: 'del-12',
          deliveryId: 'DEL-2026-004',
          paymentId: 'pay-1',
          soPhieuXuat: 'PXK-2026-081',
          ngayGiaoMay: '2026-05-26',
          donViVanChuyen: 'GIAO HÀNG TIẾT KIỆM',
          loaiXe: 'Xe tải 1.4T nhãn hiệu Isuzu',
          tenLaiXe: 'Tạ Văn Thành',
          sdtLaiXe: '0944001122',
          tinhTrangThanhToan: 'Tất toán',
          subTotal: 10000000,
          totalAmount: 11000000,
          products: [
            { productName: 'Thiết bị SGM 1', quantity: 1, price: 10000000, unit: 'Máy', soNgayBaoHanh: 365 }
          ]
        } as any}
      />
    </div>
  )
};

export const ValidationPendingWarningState: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-[95vh] flex items-center justify-center">
      <DeliveryFormModal 
        {...args} 
        delivery={{
          id: 'del-pending',
          products: []
        } as any}
      />
    </div>
  )
};
