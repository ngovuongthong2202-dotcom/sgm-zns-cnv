import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { CustomerForm } from './CustomerFormModal';

const meta: Meta<typeof CustomerForm> = {
  title: 'Features/Customers/CustomerForm.single',
  component: CustomerForm,
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    customer: null,
    // generateMaKh: () => 'CRM-C-10255',
    nguoiPhuTrachList: ['Đỗ Hoà', 'Phạm Minh', 'Trần Thuỷ'],
    loaiKhachHangList: ['ĐẠI LÝ', 'CÁ NHÂN', 'DOANH NGHIỆP', 'CÔNG TRÌNH'],
    onClose: () => console.log('Close clicked'),
    onSave: async (data: any) => console.log('Saved:', data),
  }
};

export default meta;
type Story = StoryObj<typeof CustomerForm>;

export const RegisterNew: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <div className="w-[720px] h-[85vh] border rounded-2xl shadow-xl overflow-hidden bg-white">
        <CustomerForm {...args} />
      </div>
    </div>
  )
};

export const EditExisting: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <div className="w-[720px] h-[85vh] border rounded-2xl shadow-xl overflow-hidden bg-white">
        <CustomerForm 
          {...args} 
          customer={{
            id: 'cust-99',
            maKh: 'CRM-C-09923',
            tenKhachHang: 'CÔNG TY TNHH CÔNG NGHỆ CAO SGM',
            loaiHinhDoanhNghiep: 'CÔNG TY TNHH',
            maSoThue: '0109923455',
            tinhThanh: 'HÀ NỘI',
            diaChi: 'Tầng 12, Sông Đà Tower, Mễ Trì',
            loaiKh: 'DOANH NGHIỆP',
            nguoiPhuTrach: 'Phạm Minh',
            nhuCauKhachHang: 'Hợp tác đại lý phân phối vận hành tem kiểm duyệt dòng máy mới.',
            contacts: [
              { nguoiDaiDien: 'NGUYỄN MINH KHANG', sdt: '0981234567', chucVu: 'Giám đốc mua hàng', chiNhanh: 'Văn phòng chính' }
            ]
          } as any}
        />
      </div>
    </div>
  )
};

export const RestoredDraftWarning: Story = {
  render: (args) => (
    <div className="bg-slate-100 p-8 w-full h-screen flex items-center justify-center">
      <div className="w-[720px] h-[85vh] border rounded-2xl shadow-xl overflow-hidden bg-white">
        <CustomerForm 
          {...args} 
          customer={{
            id: 'cust-tmp',
            maKh: 'CRM-C-DRAFT',
            tenKhachHang: 'HỘ KINH DOANH TRẦN VĂN SƠN',
            loaiHinhDoanhNghiep: 'HỘ KINH DOANH',
            tinhThanh: 'HÀ NỘI',
            diaChi: 'Xã Phú Cát, Huyện Quốc Oai',
            loaiKh: 'CÁ NHÂN',
            contacts: []
          } as any}
        />
      </div>
    </div>
  )
};
