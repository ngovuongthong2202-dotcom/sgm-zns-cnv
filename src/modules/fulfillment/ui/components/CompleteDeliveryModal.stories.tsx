import React from 'react';
import { CompleteDeliveryModal } from './CompleteDeliveryModal';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

export default {
  title: 'Features/Deliveries/CompleteDeliveryModal',
  component: CompleteDeliveryModal,
};

const mockDelivery: Delivery = {
  id: 'del-123',
  deliveryId: 'GH-2026-042',
  soPhieuXuat: 'PX-900',
  contractId: 'C-001',
  paymentId: 'PM-001',
  customerId: 'CUST-001',
  maKh: 'KH-001',
  tenKhachHang: 'Công ty Nhựa Sài Gòn',
  sdt: '0901234567',
  soDonHang: 'DH-2023-001',
  ngayKy: '2026-05-01',
  tinhTrangThanhToan: 'Đã thanh toán',
  ngayGiaoMay: '2026-05-15',
  donViVanChuyen: 'Giao Hàng Nhanh',
  vatRate: 10,
  vatAmount: 0,
  discountRate: 0,
  discountAmount: 0,
  trangThaiGuiTinGiaoHang: EntityZnsStatus.CHUA_GUI,
  products: [],
  danhSachMaMay: []
};

export const Default = () => (
   <div className="p-10 transform scale-100 min-h-[500px] relative bg-slate-100">
      <CompleteDeliveryModal
         delivery={mockDelivery}
         onClose={() => console.log('Hủy')}
         onSave={async (data) => console.log('Đã lưu', data)}
      />
   </div>
);
