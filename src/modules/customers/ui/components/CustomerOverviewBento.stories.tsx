import React from 'react';
import { CustomerOverviewBento } from './CustomerOverviewBento';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

export default {
  title: 'Features/Customers/Components/CustomerOverviewBento',
  component: CustomerOverviewBento,
};

const mockCustomer = {
  id: '1',
  stt: 1,
  maKh: 'KH00123',
  loaiKh: 'Doanh nghiệp',
  tenKhachHang: 'Công ty Cổ phần Mộc Tích (Motic)',
  loaiHinhDoanhNghiep: 'Sản xuất Ván sàn',
  maSoThue: '0102030405',
  nguoiDaiDien: 'Bùi Đức Trung',
  sdt: '0901234567',
  tinhThanh: 'Hà Nội',
  xaPhuong: 'Phường Láng Hạ, Quận Đống Đa',
  diaChi: 'Tầng 12, Tòa nhà Motic Building, Số 123 Thái Hà',
  nguoiPhuTrach: 'Vannam Tran',
  trangThaiGuiTinQuangCao: EntityZnsStatus.CHUA_GUI,
  contacts: [
    { nguoiDaiDien: 'Bùi Đức Trung', sdt: '0901234567' },
    { nguoiDaiDien: 'Nguyễn Văn A', sdt: '0911111111' },
    { nguoiDaiDien: 'Hồ Lê B', sdt: '0922222222' }
  ]
};

export const Default = () => (
  <div className="p-10 bg-slate-50 min-h-screen">
    <div className="max-w-4xl mx-auto">
      <CustomerOverviewBento 
        customer={mockCustomer as any} 
        onEdit={() => console.log('edit')} 
        quotationCount={12} 
      />
    </div>
  </div>
);
