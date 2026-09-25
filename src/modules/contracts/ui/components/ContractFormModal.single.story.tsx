import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ContractFormModal } from './ContractFormModal';

const meta: Meta<typeof ContractFormModal> = {
  title: 'Features/Contracts/ContractFormModal.single',
  component: ContractFormModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    contract: null,
    contracts: [],
    quotations: [
      { id: 'quo-1', soPhieuBaoGia: 'BG-2026-001', customerId: 'c-1', tenKhachHang: 'CÔNG TY TNHH BÁCH KHÓA', sdt: '0901234567', products: [{ productName: 'Thiết bị SGM 1', quantity: 1, price: 10000000, unit: 'Máy' }] } as any
    ],
    nguoiPhuTrachList: ['Đỗ Hoà', 'Phạm Minh', 'Lê Khánh'],
    onClose: () => console.log('Contract edit closed'),
    onSave: async (data) => console.log('Saved Contract:', data),
  }
};

export default meta;
type Story = StoryObj<typeof ContractFormModal>;

export const DefaultNewContract: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <ContractFormModal {...args} />
    </div>
  )
};

export const EditingWithMachineCodes: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <ContractFormModal 
        {...args} 
        contract={{
          id: 'con-123',
          soHopDong: 'HD-2026-042/SGM',
          soDonHang: 'PO-9922',
          ngayKy: '2026-05-26',
          soNgayDuKienHoanThanh: 15,
          nguoiDaiDien: 'VŨ HOÀNG GIANG',
          nguoiPhuTrach: 'Phạm Minh',
          quotationId: 'quo-1',
          tenKhachHang: 'CÔNG TY TNHH BÁCH KHÓA',
          maKh: 'KH-BK-001',
          sdt: '0901234567',
          vatRate: 10,
          discountRate: 0,
          subTotal: 10000000,
          vatAmount: 1000000,
          discountAmount: 0,
          totalAmount: 11000000,
          slMay: 1,
          dvt: 'Máy',
          loai: 'Chế tạo công nghiệp',
          logTomTat: 'Thanh toán đợt 1 ngay sau khi xác nhận Smart Search.',
          danhSachMaMay: ['SGM-M2-0045', 'SGM-M2-0046'],
          products: [
            { productName: 'Thiết bị SGM 1', quantity: 1, price: 10000000, unit: 'Máy', productId: 'SGM-EQ-1' }
          ]
        } as any}
      />
    </div>
  )
};

export const DraftPreserveWarningState: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <ContractFormModal 
        {...args} 
        contract={{
          id: 'con-empty',
          soHopDong: '',
          ngayKy: '2026-05-26',
          soNgayDuKienHoanThanh: 30,
          products: []
        } as any}
      />
    </div>
  )
};
