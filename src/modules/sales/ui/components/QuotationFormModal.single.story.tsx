import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { QuotationFormModal } from './QuotationFormModal';

const meta: Meta<typeof QuotationFormModal> = {
  title: 'Features/Quotations/QuotationFormModal.single',
  component: QuotationFormModal,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    quotation: null,
    customers: [
      { id: 'c-1', maKh: 'KH0123', tenKhachHang: 'CÔNG TY TNHH BÁCH KHÓA', sdt: '0901234567', loaiKh: 'DOANH NGHIỆP', contacts: [] } as unknown as any
    ],
    nguoiPhuTrachList: ['Đỗ Hoà', 'Phạm Minh', 'Lê Khánh'],
    loaiBaoGiaList: ['BG Máy', 'BG Vật tư', 'BG Dịch vụ'],
    loaiKhachHangList: ['ĐẠI LÝ', 'DOANH NGHIỆP', 'CÁ NHÂN'],
    onClose: () => console.log('Quotation edit closed'),
    onSave: async (data) => console.log('Saved Quotation:', data),
  }
};

export default meta;
type Story = StoryObj<typeof QuotationFormModal>;

export const DefaultNewForm: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <QuotationFormModal {...args} />
    </div>
  )
};

export const EditingWithProducts: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <QuotationFormModal 
        {...args} 
        quotation={{
          id: 'quo-555',
          soPhieuBaoGia: 'BG-2026-051',
          customerId: 'c-1',
          tenKhachHang: 'CÔNG TY CỔ PHẦN THIẾT BỊ HOÀNG ANH',
          maKh: 'KH-HA-092',
          sdt: '0912345678',
          nguoiDaiDien: 'HOÀNG QUỐC ANH',
          ngayBaoGia: '2026-05-26',
          ngayHetHan: '2026-06-02',
          hieuLuc: 7,
          nguoiPhuTrach: 'Đỗ Hoà',
          tinhTrangBaoGia: 'MỚI',
          loai: 'BG Máy',
          vatRate: 10,
          discountRate: 5,
          subTotal: 154000000,
          vatAmount: 15400000,
          discountAmount: 7700000,
          totalAmount: 161700000,
          noiDungGhiChu: 'Thanh toán chuyển khoản đợt 1 ngay sau khi ký duyệt.',
          products: [
            { productName: 'Máy lọc dầu ly tâm công nghiệp SGM-600', quantity: 2, price: 77000000, unit: 'Máy', productId: 'SGM-OIL-600' }
          ]
        } as unknown as any}
      />
    </div>
  )
};

export const ValidationWarningState: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <QuotationFormModal 
        {...args} 
        quotation={{
          id: 'quo-err',
          soPhieuBaoGia: '',
          customerId: '',
          tenKhachHang: '',
          ngayBaoGia: '2026-05-26',
          hieuLuc: 7,
          tinhTrangBaoGia: 'BẢN NHÁP',
          loai: 'BG Vật tư',
          products: []
        } as unknown as any}
      />
    </div>
  )
};
