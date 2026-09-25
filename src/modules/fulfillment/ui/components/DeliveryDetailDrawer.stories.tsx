import React from 'react';
import { DeliveryDetailDrawer } from './DeliveryDetailDrawer';
import { Delivery } from '@/src/domain/schema/delivery.schema';
import { EntityZnsStatus } from '@/src/domain/enums/zns-status';

export default {
  title: 'Features/Deliveries/DeliveryDetailDrawer',
  component: DeliveryDetailDrawer,
};

const mockDeliveryBase: Delivery = {
  id: '1',
  deliveryId: 'DEL-2026-001',
  soPhieuXuat: 'PX-001',
  paymentId: 'PAY-1',
  contractId: 'C-001',
  customerId: 'CUST-1',
  maKh: 'KH01',
  tenKhachHang: 'Công ty TNHH Vận Tải Toàn Cầu',
  sdt: '0901234567',
  soDonHang: 'DH-2026-005',
  ngayKy: '2026-05-01',
  tinhTrangThanhToan: 'Đã thanh toán',
  ngayGiaoMay: '2026-05-15',
  donViVanChuyen: 'Giao Hàng Nhanh',
  vatRate: 10,
  vatAmount: 0,
  discountRate: 0,
  discountAmount: 0,
  soDienThoaiDonViVanChuyen: '19001234',
  nguoiPhuTrach: 'Nguyễn Văn A',
  ghiChu: 'Giao trong giờ hành chính, gọi trước 30p.',
  products: [
    { productName: 'Máy in 3D công nghiệp v2', quantity: 1, unit: 'Chiếc' },
    { productName: 'Cuộn nhựa in ABS', quantity: 5, unit: 'Cuộn' }
  ],
  trangThaiGuiTinGiaoHang: EntityZnsStatus.THANH_CONG,
  danhSachMaMay: [],
};

export const PendingDelivery = () => (
  <DeliveryDetailDrawer
    drawerDelivery={mockDeliveryBase}
    onClose={() => console.log('close')}
    onEdit={() => console.log('edit')}
    onMarkDelivered={() => console.log('mark delivered')}
    onSendZns={() => console.log('send zns')}
    onCancelDelivery={async () => {}}
    drawerContract={null}
    drawerQuotation={null}
  />
);

export const CompletedDelivery = () => (
  <DeliveryDetailDrawer
    drawerDelivery={{
      ...mockDeliveryBase,
      ngayGiaoThucTe: '2026-05-12',
      kyNhan: 'A. Bình bảo vệ'
    }}
    onClose={() => console.log('close')}
    onEdit={() => console.log('edit')}
    onMarkDelivered={() => console.log('mark delivered')}
    onSendZns={() => console.log('send zns')}
    onCancelDelivery={async () => {}}
    drawerContract={null}
    drawerQuotation={null}
  />
);

